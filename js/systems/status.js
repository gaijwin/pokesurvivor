/* Host-authoritative damage over time. All rates are per second, not per frame. */
G.Status = (() => {
  const RULES = {
    poison: { interval: 0.6, duration: 4, color: '#d47cf0', immune: ['poison', 'steel'] },
    burn: { interval: 0.5, duration: 3, color: '#ff9a4d', immune: ['fire'] }
  };
  const EPS = 1e-8;

  // One projectile per volley: extra projectiles and overlapping fields cannot inflate the cap.
  function source(owner, move) {
    const interval = move.kind === 'trail' ? 0.5 : move.kind === 'turret' ? (move.rate || 0.6)
      : move.kind === 'orbit' ? Math.max(0.12, move.cd) : Math.max(0.05, move.cd * (owner.cdMul || 1));
    return { owner, moveId: move.id, reference: move.dmg * owner.atk * (G.Mega ? G.Mega.moveMultiplier(owner, move) : 1) / interval, level: owner.level || 1 };
  }

  function state(e) {
    if (!e.statusState) e.statusState = { time: 0, poison: null, burn: null };
    return e.statusState;
  }

  function sync(e, kind, st, now) {
    e[kind] = st ? st.stacks.length : 0;
    e[kind + 'T'] = st && st.stacks.length ? Math.max(...st.stacks.map(s => s.expires)) - now : 0;
  }

  function apply(e, kind, count = 1, src) {
    const rule = RULES[kind];
    if (!rule || e.dead || e.types.some(t => rule.immune.includes(t))) return false;
    if (!src || !Number.isFinite(src.reference) || src.reference <= 0 || !Number.isFinite(src.level)) return false;
    if (!Number.isFinite(count) || count <= 0) return false;
    if (e.remote) { G.Coop.status(e, kind === 'poison' ? 'p' : 'b', count, src); return true; }
    const all = state(e), now = all.time;
    let st = all[kind];
    if (st) st.stacks = st.stacks.filter(s => s.expires > now + EPS);
    if (!st || !st.stacks.length) st = all[kind] = { stacks: [], next: now + rule.interval, carry: 0 };
    const touched = new Set();
    for (let i = 0; i < Math.min(8, Math.floor(count)); i++) {
      const stack = { ...src, expires: now + rule.duration };
      if (st.stacks.length < 8) { st.stacks.push(stack); touched.add(stack); continue; }
      // Refresh only this owner's oldest stack; a weak application cannot refresh someone else's damage.
      let candidates = st.stacks.filter(s => s.owner === src.owner && !touched.has(s));
      if (candidates.length) {
        candidates.sort((a, b) => a.expires - b.expires);
        st.stacks[st.stacks.indexOf(candidates[0])] = stack;
        touched.add(stack);
      } else {
        const remaining = st.stacks.filter(s => !touched.has(s));
        if (!remaining.length) break;
        const weakest = remaining.reduce((a, b) => a.reference < b.reference ? a : b);
        if (stack.reference > weakest.reference) { st.stacks[st.stacks.indexOf(weakest)] = stack; touched.add(stack); }
      }
    }
    sync(e, kind, st, now);
    return true;
  }

  function record(owner, moveId, kind, amount) {
    if (!owner || !['direct', 'poison', 'burn'].includes(kind) || !Number.isFinite(amount) || amount <= 0) return;
    owner.dmgDealt = (owner.dmgDealt || 0) + amount;
    if (kind !== 'direct') owner.dotDamage = (owner.dotDamage || 0) + amount;
    if (!owner.damageByMove) owner.damageByMove = Object.create(null);
    const key = moveId || 'environment';
    const row = Object.prototype.hasOwnProperty.call(owner.damageByMove, key) ? owner.damageByMove[key]
      : (owner.damageByMove[key] = { direct: 0, poison: 0, burn: 0 });
    row[kind] += amount;
  }

  function tick(e, kind, st) {
    const rule = RULES[kind], stacks = st.stacks;
    const strongest = Math.max(...stacks.map(s => s.reference));
    const dps = kind === 'poison'
      ? stacks.length / 8 * Math.min(e.maxHp * 0.025, strongest * 0.35)
      : stacks.reduce((n, s) => n + 3.2 * (1 + 0.06 * s.level), 0);
    st.carry += dps * rule.interval;
    const damage = Math.floor(st.carry + EPS);
    st.carry -= damage;
    if (damage <= 0) return;
    const before = e.hp;
    e.hurt(damage, rule.color);
    const effective = Math.max(0, before - Math.max(0, e.hp));
    const weight = s => kind === 'poison' ? s.reference : 3.2 * (1 + 0.06 * s.level);
    const total = stacks.reduce((n, s) => n + weight(s), 0);
    const credited = new Map();
    for (const s of stacks) {
      const amount = effective * weight(s) / total;
      record(s.owner, s.moveId, kind, amount);
      if (s.owner && s.owner.remote && G.Coop.isHost) {
        if (!credited.has(s.owner)) credited.set(s.owner, new Set());
        credited.get(s.owner).add(s.moveId);
      }
    }
    for (const [owner, ids] of credited) for (const id of ids) G.Coop.statusDamage(owner, id, kind);
  }

  function update(e, dt) {
    if (e.remote || e.dead || !Number.isFinite(dt) || dt <= 0) return;
    const all = state(e), end = all.time + dt;
    // Process both status clocks in chronological order, including every tick during a long frame.
    while (!e.dead) {
      let chosen = null, time = Infinity;
      for (const kind of Object.keys(RULES)) {
        const st = all[kind];
        if (st && st.next < time && st.next <= end + EPS) { chosen = kind; time = st.next; }
      }
      if (!chosen) break;
      const st = all[chosen];
      // A tick exactly at expiry is included, consistently at every frame rate.
      st.stacks = st.stacks.filter(s => s.expires + EPS >= time);
      if (!st.stacks.length) { all[chosen] = null; continue; }
      tick(e, chosen, st);
      st.next += RULES[chosen].interval;
    }
    all.time = end;
    for (const kind of Object.keys(RULES)) {
      const st = all[kind];
      if (st) {
        st.stacks = st.stacks.filter(s => s.expires > end + EPS);
        if (!st.stacks.length) all[kind] = null;
      }
      sync(e, kind, all[kind], end);
    }
  }

  return { source, apply, update, record };
})();
