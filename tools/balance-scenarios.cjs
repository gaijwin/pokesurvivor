// Seeded stationary-target geometry harness using actual combat/status modules.
// This measures damage throughput and target deaths; it does not simulate enemy AI or player survival.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sources=['js/data/types.js','js/data/moves.js','js/systems/status.js','js/entities/projectile.js','js/entities/enemy.js','js/systems/combat.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8'));
const noop=()=>{};
function simulate({minute,party,count,build,seed,weather='neutral',shield=0,shiny=false,targetType='normal',layout='ring'}){
 let rng=seed>>>0;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const M=Object.create(Math);M.random=random;
 const G={U:{TYPE_COLOR:{},clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),rand:(a,b)=>a+random()*(b-a),dist:(x,y,a,b)=>Math.hypot(x-a,y-b),dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2,norm:(x,y)=>{const h=Math.hypot(x,y)||1;return[x/h,y/h];},damp:(a,b,k,dt)=>b+(a-b)*Math.exp(-k*dt),shuffle:a=>a.sort(()=>random()-.5)},Weather:{mult:t=>weather==='sun'?(t==='fire'?1.5:t==='water'?.5:1):weather==='rain'?(t==='water'?1.5:t==='fire'?.5:1):1},
 FX:new Proxy({},{get:()=>noop}),VFX:{forMove:()=>({pal:'normal',proj:'ball'}),forType:()=>({}),spins:()=>false},World:{propsInCircle:()=>[],damageProp:noop,projectileBlock:()=>null,isFree:()=>true,isWall:()=>false,collide:()=>false},Audio:{sfx:noop},Judgment:{noteDmg:noop},Coop:{active:false,isHost:false},Camera:{kick:noop,sees:()=>true},LIFT:20};
 const ctx={G,Math:M,performance,console};vm.createContext(ctx);for(const s of sources)vm.runInContext(s,ctx);
 const level=minute<8?2:minute<15?3:5,atk=1.2+minute*.06,cdMul=.95-minute*.01,playerLevel=8+minute*1.5;
 const hp=(count===1?500+minute*90:90+minute*10)*(1+.3*(party-1))*(shiny?2:1),kills=[];
 const enemies=Array.from({length:count},(_,i)=>{
  const a=i/count*Math.PI*2,r=layout==='close'?(count===1?24:16+(i%4)*10):count===1?75:30+(i%4)*30;
  return Object.assign(Object.create(G.Enemy.prototype),{id:i+1,x:Math.cos(a)*r,y:Math.sin(a)*r,r:10,hp,maxHp:hp,shield:hp*shield,types:targetType==='typeless'?[]:[targetType],dead:false,touchCd:1e9,showHurt:noop,die(){this.dead=true;kills.push(now);}});
 });
 G.EnemyMgr={all:()=>enemies,queryCircle:(x,y,r)=>enemies.filter(e=>!e.dead&&(e.x-x)**2+(e.y-y)**2<=(r+e.r)**2)};
 const players=Array.from({length:party},(_,i)=>{
  let active;const p={x:0,y:0,r:8,aim:0,atk,cdMul,level:playerLevel,dmgDealt:0,critChance:minute*.005,cast:noop,onDealt:noop,hasItem:()=>false,hurt:noop,activeGroup:()=>active,activeMove:()=>active[0],buffs:{},aimAt:noop};
  active=build.split('+').map(id=>{const m=G.Moves.instance(id);while(m.lvl<level)G.Moves.levelUp(m);if(minute>=15)G.Moves.evolve(m);return m;});
  return p;
 });
 let now=0;const dt=1/30;
 for(;now<12&&!enemies.every(e=>e.dead);now+=dt){
  for(const p of players){p.target=enemies.find(e=>!e.dead);if(p.target)p.aim=Math.atan2(p.target.y-p.y,p.target.x-p.x);G.Combat.tick(dt,p,now);}
  G.Projectiles.update(dt,players[0],enemies);
  for(const p of players)G.Combat.resolve(dt,p,now);
  G.Combat.updateFields(dt);
  for(const e of enemies)if(!e.dead)G.Status.update(e,dt);
 }
 const damage=enemies.reduce((s,e)=>s+hp-Math.max(0,e.hp),0),dot=players.reduce((s,p)=>s+(p.dotDamage||0),0);
 return {damage:+damage.toFixed(2),dps:+(damage/now).toFixed(2),dot:+dot.toFixed(2),kills:kills.length,firstKill:kills.length?+kills[0].toFixed(3):null,lastKill:kills.length===count?+kills.at(-1).toFixed(3):null,censored:kills.length<count};
}
if(require.main===module){
 const quick=process.argv.includes('--quick'),supplement=process.argv.includes('--supplement'),previous=supplement?JSON.parse(fs.readFileSync(path.join(root,'docs/design/expansion-benchmark.json'),'utf8')):null,rows=previous?previous.rows:[];
 const builds=['sludge','ember','water-gun','toxic','spikes','fire-spin','shadow-ball','hex','sludge+hex','sludge+ember','sludge+ember+water-gun+shadow-ball'];
 for(const minute of supplement?[]:quick?[15]:[2,8,15,25,30])for(const party of quick?[1]:[1,2,4])for(const count of quick?[1,32]:[1,8,32,64])for(const build of builds){
  const samples=[1,7,42].map(seed=>simulate({minute,party,count,build,seed}));
  const dps=samples.map(s=>s.dps).sort((a,b)=>a-b),ttk=samples.map(s=>s.lastKill).filter(t=>t!==null).sort((a,b)=>a-b);
  rows.push({minute,party,count,build,medianDps:dps[1],p90Dps:dps[2],medianTtk:ttk.length?ttk[Math.floor(ttk.length/2)]:null,p90Ttk:ttk.length?ttk.at(-1):null,censored:samples.filter(s=>s.censored).length,samples});
 }
 const sensitivity=[];for(const weather of ['neutral','sun','rain'])for(const shield of [0,.3])for(const shiny of [false,true])for(const build of ['sludge','ember','water-gun'])sensitivity.push({weather,shield,shiny,build,...simulate({minute:25,party:4,count:32,build,seed:42,weather,shield,shiny})});
 const closeNeutral=[];for(const count of [1,32])for(const build of builds)for(const seed of [1,7,42])closeNeutral.push({count,build,seed,...simulate({minute:25,party:1,count,build,seed,targetType:'typeless',layout:'close'})});
 const report={closeNeutral,assumptions:'Actual combat collision/field/status code; seeded stationary rings, 12 seconds at 30 FPS; main matrix uses Normal-type targets, so Ghost moves correctly do zero damage; closeNeutral uses synthetic typeless targets at close range to isolate fields and Hex; no movement/AI, progression acquisition or survival model. Synthetic investment tiers, not proven legal build progression. Linked groups of two/four are stress fixtures; rift acquisition is not simulated. DPS is effective HP removed; censored TTK is null. Per-player cooldown and enemy HP party scaling included. Baseline STAB is excluded to isolate equally neutral build geometry; native STAB is separately tested.',rows,sensitivity};
 fs.writeFileSync(path.join(root,'docs/design/expansion-benchmark.json'),JSON.stringify(report,null,2)+'\n');
 const boss=rows.filter(r=>r.minute===25&&r.party===1&&r.count===1);console.log(JSON.stringify({scenarios:rows.length*3+sensitivity.length+closeNeutral.length,minute25Solo:boss.map(({build,medianDps,censored})=>({build,medianDps,censored}))},null,2));
}
module.exports={simulate};
