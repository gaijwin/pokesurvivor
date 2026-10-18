// Deterministic single-target model, not a geometry or survival simulation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const base='5bbc3b29288d6af4596f21188fb8b54e0e9b739f';
const original=cp.execFileSync('git',['show',base+':js/entities/enemy.js'],{cwd:root,encoding:'utf8'});
const a=original.indexOf('      if (this.burn > 0) {'),b=original.indexOf('      if (this.dead) return;',a);
const oldUpdate=new Function('dt','pl',original.slice(a,b));
const G={};const ctx={G};vm.createContext(ctx);
for(const f of ['js/data/moves.js','js/systems/status.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
function simulate(id,hp,baseline){
 const pl={atk:3,cdMul:.7,level:40,dmgDealt:0},m=G.Moves.instance(id);
 while(m.lvl<m.def.maxLvl)G.Moves.levelUp(m);G.Moves.evolve(m);
 const e={hp,maxHp:hp,types:['normal'],burn:0,burnT:0,burnTick:0,poison:0,poisonT:0,poisonTick:0,dead:false,
  hurt(n){this.hp-=Math.max(1,Math.round(n));if(this.hp<=0)this.dead=true;}};
 let cast=0,now=0,direct=0;
 while(!e.dead&&now<600){
  if(now+1e-8>=cast){
   const before=e.hp;e.hurt(m.dmg*pl.atk);direct+=before-Math.max(0,e.hp);
   if(!e.dead){
    if(baseline){if(m.poison){e.poison=Math.min(8,e.poison+m.poison);e.poisonT=4;}if(m.burn){e.burn=Math.min(8,e.burn+m.burn);e.burnT=3;}}
    else {const src=G.Status.source(pl,m);if(m.poison)G.Status.apply(e,'poison',m.poison,src);if(m.burn)G.Status.apply(e,'burn',m.burn,src);}
   }
   cast+=Math.max(.05,m.cd*pl.cdMul);
  }
  if(!e.dead){if(baseline)oldUpdate.call(e,.01,pl);else G.Status.update(e,.01);}
  now+=.01;
 }
 return {ttk:Number(now.toFixed(2)),directDamage:direct,dotDamage:baseline?hp-direct:Number((pl.dotDamage||0).toFixed(2))};
}
const rows=[];
for(const hp of [5000,14000,54000])for(const move of ['ember','sludge','poison-sting','water-gun','thunder-shock'])rows.push({hp,move,baseline:simulate(move,hp,true),current:simulate(move,hp,false)});
const report={baseline:base,assumptions:'Level 5 + evolution; atk=3; cdMul=0.7; player level 40; one guaranteed projectile hit per volley; neutral types/weather; no crit/shield/geometry/overlap; step=0.01 s; continuous attacks. Not a claim of complete game balance.',rows};
fs.writeFileSync(path.join(root,'docs/design/combat-benchmark.json'),JSON.stringify(report,null,2)+'\n');
console.log('HP\tMove\tOriginal TTK\tCurrent TTK\tCurrent DOT share');
for(const r of rows)console.log([r.hp,r.move,r.baseline.ttk,r.current.ttk,(100*r.current.dotDamage/r.hp).toFixed(1)+'%'].join('\t'));
