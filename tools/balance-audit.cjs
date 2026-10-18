// Design audit, not a full gameplay simulator. Run: node tools/balance-audit.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const enemy = fs.readFileSync(path.join(root, 'js/entities/enemy.js'), 'utf8');
assert(enemy.includes('this.maxHp * 0.012 * this.poison + 1'));
assert(enemy.includes('1.6 * this.burn * (1 + pl.level * 0.06)'));
const ctx = {G: {}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/data/moves.js'),'utf8'),ctx);
const fmt = x => Number(x.toFixed(3));
const rows = [100,1000,10000,24800,54000].map(hp => ({hp,
 poison8Dps:fmt((hp*.012*8+1)/.6), burn8Level40Dps:fmt(1.6*8*(1+40*.06)/.5),
 poisonOnlySteadyTtk:fmt(hp/((hp*.012*8+1)/.6)),
 proposedPoison8DpsAtB300:fmt(Math.min(.025*hp,.35*300))}));
// Execute the actual status update blocks with a mock hurt function, at three frame rates.
const block = enemy.slice(enemy.indexOf('      if (this.burn > 0) {'), enemy.indexOf('      if (this.dead) return;',enemy.indexOf('      if (this.burn > 0) {')));
const update = new Function('dt','pl',block);
const frames = [30,60,144].map(fps=>{
 const e={maxHp:24800,burn:0,poison:8,poisonT:4,poisonTick:0,total:0,hurt(n){this.total+=Math.max(1,Math.round(n));}};
 for(let i=0;i<fps*10;i++){e.poisonT=4;update.call(e,1/fps,{level:40});}
 return {fps,seconds:10,damage:e.total,observedDps:e.total/10};
});
const moves = ['ember','sludge','poison-sting','water-gun','thunder-shock'].map(id=>{
 const m=ctx.G.Moves.instance(id); while(m.lvl<m.def.maxLvl)ctx.G.Moves.levelUp(m);
 ctx.G.Moves.evolve(m);
 return {id,level:m.lvl,evolved:!!m.evolved,damage:fmt(m.dmg),cooldown:fmt(m.cd),projectiles:m.count,
 singleProjectileDpsAtAtk1:fmt(m.dmg/m.cd), allProjectilesUpperBound:fmt(m.dmg/m.cd*m.count)};
});
assert.equal(rows[3].proposedPoison8DpsAtB300,105);
assert(rows[3].poison8Dps>rows[3].burn8Level40Dps*40);
const report={commit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),assumptions:'Neutral type/weather; steady 8 stacks; no shield; continuous refresh; no ramp/overkill. B=300 is a design scenario, not measured build DPS. Projectile bounds exclude status, accuracy, crit, player multipliers.',rows,frames,moves};
fs.writeFileSync(path.join(root,'docs/design/balance-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
