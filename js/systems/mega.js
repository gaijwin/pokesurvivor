/* Run-scoped Mega Evolution. Species identity and collection/save keys never change. */
G.Mega = (() => {
  const FORMS = {
    'mega-lucario': { dex: 448, name: 'Mega Lucario', stone: 'lucarionite', stoneName: 'Lucarionite',
      types: ['fighting', 'steel'], attack: 1.05, ability: 'Adaptability', description: '+5% attack. Matching-type moves receive 30% STAB instead of 15%.' },
    'mega-charizard-y': { dex: 6, name: 'Mega Charizard Y', stone: 'charizardite-y', stoneName: 'Charizardite Y',
      types: ['fire', 'flying'], attack: 1, ability: 'Drought', description: 'Summons 30 seconds of sun, at most once every 60 seconds. Requires a complete sprite atlas.' },
    'mega-blastoise': { dex: 9, name: 'Mega Blastoise', stone: 'blastoisinite', stoneName: 'Blastoisinite',
      types: ['water'], attack: 1, ability: 'Mega Launcher', description: 'Aura Sphere and Dark Pulse deal 25% more damage. Requires a complete sprite atlas.' },
    'mega-venusaur': { dex: 3, name: 'Mega Venusaur', stone: 'venusaurite', stoneName: 'Venusaurite',
      types: ['grass', 'poison'], attack: 1.10, ability: 'Thick Fat',
      description: '+10% attack. Fire and Ice attacks deal 50% less damage.' },
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
  const available = p => Object.entries(FORMS).filter(([id,f]) => p && f.dex === (p.evolvedDex || p.dex) && G.SPRITE_META[id]);

  function setForm(p, id) {
    const f = FORMS[id];
    if (id && (!f || f.dex !== (p.evolvedDex || p.dex) || !G.SPRITE_META[id])) return false;
    const direction = p.anim ? p.anim.dir : 0;
    p.megaId = id || null;
    p.anim = new G.Sprites.Animator(id || p.evolvedDex || p.dex, 1, p.shiny);
    p.anim.dir = direction;
    p.bodyH = G.Sprites.bodyHeight(id || p.evolvedDex || p.dex);
    G.Sprites.preload([id || p.evolvedDex || p.dex], 8000, p.shiny);
    return true;
  }
  function activate(p) {
    if (!p || p.dead || p.megaUsed || !p.keyStone || (p.specialUnlock && p.specialUnlock !== 'mega') || (p.specialization && p.specialization !== 'mega')) return false;
    const match = available(p).find(([,f]) => f.stone === p.item);
    if (!match || !setForm(p, match[0])) return false;
    p.megaUsed = true; p.specialization = 'mega';
    G.Projectiles.clearOrbs(p);
    G.FX.ring(p.x, p.y, 8, 100, '#e7a4ff', .8, 6);
    G.Audio.sfx('legend');
    G.Spawner.say(`${match[1].name} · ${match[1].ability}`, 3, true);
    return true;
  }
  function sync(p, id) {
    const next = FORMS[id] && FORMS[id].dex === (p.evolvedDex || p.dex) ? id : null;
    if ((p.megaId || null) !== next) setForm(p, next);
  }
  function moveMultiplier(p, move) {
    const ability = p && p.megaId === 'mega-charizard-x' && CONTACT.has(move.id) ? 1.15
      : p && p.megaId === 'mega-blastoise' && ['aura-sphere','dark-pulse'].includes(move.id) ? 1.25 : 1;
    return ability * (G.Battle ? G.Battle.multiplier(p, move) : 1);
  }
  function incomingMultiplier(p, type) {
    return p && p.megaId === 'mega-venusaur' && (type === 'fire' || type === 'ice') ? .5 : 1;
  }
  function update(dt, players) {
    if (G.Coop.active && !G.Coop.isHost) return;
    for (const p of players) {
      if (!p.dead && p.megaId === 'mega-charizard-y') {
        p.droughtT = (p.droughtT || 0) - dt;
        if (p.droughtT <= 0 && !G.Rift.inArena && !G.Judgment.active) {p.droughtT=60;G.Weather.debugStart('sun',30);}
      }
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
  return { FORMS, form, available, activate, sync, moveMultiplier, incomingMultiplier, update, drawHud };
})();
