/* Run-scoped Mega Evolution. Species identity and collection/save keys never change. */
G.Mega = (() => {
  const FORMS = {
    'mega-charizard-x': { dex: 6, name: 'Mega Charizard X', stone: 'charizardite-x', stoneName: 'Charizardite X',
      types: ['fire', 'dragon'], attack: 1.10, ability: 'Tough Claws',
      description: 'Fire/Dragon. +10% attack; contact moves deal 15% more damage.' },
    'mega-gengar': { dex: 94, name: 'Mega Gengar', stone: 'gengarite', stoneName: 'Gengarite',
      types: ['ghost', 'poison'], attack: 1.20, ability: 'Shadow Tag',
      description: '+20% attack. Nearby enemies are slowed; bosses resist Shadow Tag.' }
  };
  const CONTACT = new Set(['tackle', 'quick-attack', 'vine-whip', 'bug-bite', 'metal-claw',
    'karate-chop', 'bite', 'slash', 'shadow-claw', 'dragon-claw', 'aqua-tail', 'drain-punch']);
  for (const [id, f] of Object.entries(FORMS)) {
    G.Items.BY[f.stone] = { id: f.stone, name: f.stoneName,
      desc: `Requires a Key Stone and ${G.DEX_BY && G.DEX_BY[f.dex] ? G.DEX_BY[f.dex].name : 'a compatible partner'}. Press M to Mega Evolve. ${f.description}`,
      on() {}, off(p) { if (p.megaId === id) setForm(p, null); } };
  }
  const form = p => p && FORMS[p.megaId];
  const available = p => Object.entries(FORMS).filter(([id,f]) => p && f.dex === p.dex && G.SPRITE_META[id]);

  function setForm(p, id) {
    const f = FORMS[id];
    if (id && (!f || f.dex !== p.dex || !G.SPRITE_META[id])) return false;
    const direction = p.anim ? p.anim.dir : 0;
    p.megaId = id || null;
    p.anim = new G.Sprites.Animator(id || p.dex, 1, p.shiny);
    p.anim.dir = direction;
    p.bodyH = G.Sprites.bodyHeight(id || p.dex);
    G.Sprites.preload([id || p.dex], 8000, p.shiny);
    return true;
  }
  function activate(p) {
    if (!p || p.dead || p.megaUsed || !p.keyStone) return false;
    const match = available(p).find(([,f]) => f.stone === p.item);
    if (!match || !setForm(p, match[0])) return false;
    p.megaUsed = true;
    G.Projectiles.clearOrbs(p);
    G.FX.ring(p.x, p.y, 8, 100, '#e7a4ff', .8, 6);
    G.Audio.sfx('legend');
    G.Spawner.say(`${match[1].name} · ${match[1].ability}`, 3, true);
    return true;
  }
  function sync(p, id) {
    const next = FORMS[id] && FORMS[id].dex === p.dex ? id : null;
    if ((p.megaId || null) !== next) setForm(p, next);
  }
  function moveMultiplier(p, move) {
    return p && p.megaId === 'mega-charizard-x' && CONTACT.has(move.id) ? 1.15 : 1;
  }
  function update(dt, players) {
    if (G.Coop.active && !G.Coop.isHost) return;
    for (const p of players) {
      if (p.dead || p.megaId !== 'mega-gengar') continue;
      p.shadowTagT = (p.shadowTagT || 0) - dt;
      if (p.shadowTagT > 0) continue;
      p.shadowTagT = .2;
      for (const e of G.EnemyMgr.queryCircle(p.x, p.y, 160)) if (!e.dead && !e.remote) e.applySlow(e.boss ? .08 : .25, .35);
    }
  }
  function drawHud(ctx, w, h, p, F) {
    const f = form(p);
    const ready = !p.megaUsed && p.keyStone && available(p).some(([,v]) => v.stone === p.item);
    if (!f && !ready) return;
    ctx.save();ctx.font=F(800,12);ctx.textAlign='left';ctx.lineWidth=4;ctx.strokeStyle='#000';ctx.fillStyle='#e7a4ff';
    const text=f ? `${f.name} · ${f.ability}` : 'Mega Stone ready · M';
    ctx.strokeText(text,18,146);ctx.fillText(text,18,146);ctx.restore();
  }
  return { FORMS, form, available, activate, sync, moveMultiplier, update, drawHud };
})();
