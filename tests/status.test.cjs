const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
function load(files, G = {}) {
 const ctx = {G, console, performance}; vm.createContext(ctx);
 for (const file of files) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
 return ctx.G;
}
function setup() {
 const G=load(['js/systems/status.js']);
 const owner={atk:3,cdMul:1,level:40,dmgDealt:0};
 const source={owner,moveId:'sludge',reference:300,level:40};
 const e={hp:10000,maxHp:10000,types:['normal'],dead:false,hurt(n){const before=this.hp;this.hp-=Math.min(this.hp,n);this.dead=this.hp<=0;return before-this.hp;}};
 return {G,e,source,owner};
}
function run(G,e,seconds,fps) {for(let i=0;i<Math.round(seconds*fps);i++)G.Status.update(e,1/fps);}

test('Poison caps damage by source rather than continuing to grow with boss HP',()=>{
 for(const hp of [10000,54000,1000000]){
  const {G,e,source,owner}=setup();e.hp=e.maxHp=hp;
  G.Status.apply(e,'poison',8,source);run(G,e,3,60);
  assert.equal(hp-e.hp,315);assert.equal(owner.dotDamage,315);assert.equal(e.poison,8);
 }
});
test('small HP percentage branch preserves fractional damage instead of rounding every tick to one',()=>{
 const {G,e,source}=setup(); e.hp=e.maxHp=10;
 G.Status.apply(e,'poison',8,source);run(G,e,3,60);assert.equal(e.hp,10);
});
test('30/60/144 FPS, a long frame, and split dt produce exactly the same tick damage and expiry',()=>{
 const outcomes=[];
 for(const fps of [30,60,144]){
  const {G,e,source}=setup();G.Status.apply(e,'poison',8,source);G.Status.apply(e,'burn',8,source);
  run(G,e,5,fps);outcomes.push([e.hp,e.poison,e.burn]);
 }
 const {G,e,source}=setup();G.Status.apply(e,'poison',8,source);G.Status.apply(e,'burn',8,source);G.Status.update(e,5);
 for(const result of outcomes)assert.deepEqual(result,[e.hp,e.poison,e.burn]);
 assert.equal(e.hp,9361);assert.equal(e.poison,0);assert.equal(e.burn,0);
});
test('refresh spam does not create extra ticks; stacks expire independently',()=>{
 const {G,e,source}=setup();G.Status.apply(e,'poison',7,source);G.Status.update(e,3);
 G.Status.apply(e,'poison',1,source);G.Status.update(e,1.1);assert.equal(e.poison,1);
 G.Status.update(e,3);assert.equal(e.poison,0);
 const b=setup(); for(let i=0;i<30;i++){b.G.Status.apply(b.e,'poison',8,b.source);b.G.Status.update(b.e,0.01);}
 assert.equal(b.e.hp,10000);
});
test('expired stacks cannot be revived by an unrelated weak player; pool remains shared',()=>{
 const {G,e,source}=setup();G.Status.apply(e,'poison',8,source);G.Status.update(e,3);
 const weak={...source,owner:{},reference:1};G.Status.apply(e,'poison',8,weak);
 assert.equal(e.poison,8);G.Status.update(e,1.1);assert.equal(e.poison,0);
});
test('a player can refresh only their own stacks; a stronger player can replace weak stacks',()=>{
 const {G,e,source}=setup();G.Status.apply(e,'poison',8,{...source,reference:1});
 G.Status.apply(e,'poison',4,{...source,owner:{},reference:300});assert.equal(e.poison,8);
 assert.equal(e.statusState.poison.stacks.filter(s=>s.reference===300).length,4);
});
test('status immunity and dead enemies reject applications',()=>{
 for(const [kind,types] of [['poison',['poison']],['poison',['steel','flying']],['burn',['fire']]]){
  const {G,e,source}=setup();e.types=types;assert.equal(G.Status.apply(e,kind,8,source),false);G.Status.update(e,10);assert.equal(e.hp,10000);
 }
 const {G,e,source}=setup();e.dead=true;assert.equal(G.Status.apply(e,'poison',8,source),false);
});
test('bad network-like data cannot poison the state with NaN or infinite loops',()=>{
 const {G,e,source}=setup();
 for(const count of [NaN,Infinity,-1])assert.equal(G.Status.apply(e,'poison',count,source),false);
 for(const reference of [NaN,Infinity,-1,0])assert.equal(G.Status.apply(e,'poison',8,{...source,reference}),false);
 G.Status.update(e,Infinity);assert.equal(e.hp,10000);
});
test('damage attribution excludes overkill and shield absorption and never calls onDealt',()=>{
 const {G,e,source,owner}=setup();owner.onDealt=()=>{throw Error('DOT must not proc life steal')};
 e.hp=10;G.Status.apply(e,'poison',8,source);G.Status.update(e,1);assert.equal(owner.dotDamage,10);assert.equal(owner.damageByMove.sludge.poison,10);
 const shielded=setup();shielded.e.hurt=()=>0;shielded.G.Status.apply(shielded.e,'poison',8,shielded.source);shielded.G.Status.update(shielded.e,1);assert.equal(shielded.owner.dmgDealt,0);
});
test('mixed owners receive their share, including a dead owner, without multiplying total damage',()=>{
 const {G,e,source,owner}=setup(),other={dead:true};
 G.Status.apply(e,'poison',4,source);G.Status.apply(e,'poison',4,{...source,owner:other});G.Status.update(e,.6);
 assert.equal(owner.dotDamage,31.5);assert.equal(other.dotDamage,31.5);assert.equal(e.hp,9937);
});
test('remote enemies send source metadata but never simulate DOT on the client',()=>{
 const {G,e,source}=setup(),sent=[];G.Coop={status(...args){sent.push(args)}};e.remote=true;
 G.Status.apply(e,'poison',8,source);G.Status.update(e,10);assert.equal(e.hp,10000);assert.equal(sent.length,1);assert.equal(sent[0][3],source);
});
test('reference DPS ignores projectile count and uses actual trail/orbit/turret hit intervals',()=>{
 const {G,owner}=setup();
 for(const [kind,interval] of [['projectile',.5],['trail',.5],['orbit',.5],['turret',.25]]){
  const src=G.Status.source(owner,{id:'test',kind,dmg:10,cd:.5,rate:.25,count:999});assert.equal(src.reference,30/interval);
 }
});
test('every canonical type immunity is zero even on dual types; softened strengths stay intact',()=>{
 const G=load(['js/data/types.js'],{U:{clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}});
 for(const [atk,row] of Object.entries(G.Types.CHART))for(const [def,m] of Object.entries(row))if(m===0){assert.equal(G.Types.mult(atk,[def]),0);assert.equal(G.Types.mult(atk,[def,'grass']),0);}
 assert.equal(G.Types.mult('water',['fire']),1.6);assert.equal(G.Types.mult('fire',['water']),.6);
});
test('enemy hurt ignores zero/non-finite damage and returns effective damage through shields',()=>{
 const G=load(['js/entities/enemy.js'],{Judgment:{noteDmg(){}},Coop:{isHost:false},U:{norm:()=>[0,0]},FX:{dmgText(){}}});
 const e={hp:10,shield:4,dead:false,showHurt(){},die(){this.dead=true}};
 assert.equal(G.Enemy.prototype.hurt.call(e,0),0);assert.equal(G.Enemy.prototype.hurt.call(e,NaN),0);
 assert.equal(G.Enemy.prototype.hurt.call(e,3),0);assert.equal(e.hp,10);
 assert.equal(G.Enemy.prototype.hurt.call(e,6),5);assert.equal(e.hp,5);
 assert.equal(G.Enemy.prototype.hurt.call(e,999),5);assert.equal(e.dead,true);
});
