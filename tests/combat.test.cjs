const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function setup(type='normal'){
 const noop=()=>{};
 const G={U:{TYPE_COLOR:{fire:'#f00',poison:'#f0f',water:'#00f'},clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),rand:(a,b)=>(a+b)/2,dist:(x,y,a,b)=>Math.hypot(x-a,y-b),dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2,norm:(x,y)=>[x/Math.hypot(x,y)||0,y/Math.hypot(x,y)||0]},Weather:{mult:()=>1},VFX:{forMove:()=>({pal:'normal',proj:'ball'}),spins:()=>false},FX:new Proxy({},{get:()=>noop}),World:{propsInCircle:()=>[],damageProp:noop,projectileBlock:()=>null},Judgment:{noteDmg:noop},Coop:{active:false,isHost:false},Camera:{kick:noop}};
 const ctx={G,performance,console};vm.createContext(ctx);for(const f of ['js/data/types.js','js/data/moves.js','js/systems/status.js','js/entities/projectile.js','js/entities/enemy.js','js/systems/combat.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
 const e=Object.assign(Object.create(G.Enemy.prototype),{id:1,x:100,y:0,r:10,hp:10000,maxHp:10000,types:[type],dead:false,shield:0,touchCd:0,showHurt:noop,die(){this.dead=true}});
 G.EnemyMgr={all:()=>[e],queryCircle:(x,y,r)=>Math.hypot(x-e.x,y-e.y)<=r+e.r&&!e.dead?[e]:[]};
 let active;const pl={x:0,y:0,r:8,aim:0,atk:3,cdMul:.7,level:40,dmgDealt:0,critChance:0,target:e,cast:noop,onDealt(n){this.procDamage=(this.procDamage||0)+(n||0)},activeGroup:()=>[active],hasItem:()=>false};
 return {G,e,pl,cast(id){active=G.Moves.instance(id);active.t=0;G.Combat.tick(.01,pl,0);return active}};
}
test('real projectile path consumes an immune hit without damage, status, or life-steal',()=>{
 const {G,e,pl,cast}=setup('steel');cast('sludge');for(const p of G.Projectiles.all()){p.x=e.x;p.y=e.y;}G.Combat.resolve(.01,pl,0);
 assert.equal(e.hp,10000);assert.equal(e.poison,undefined);assert.equal(pl.dmgDealt,0);assert.equal(G.Projectiles.all().length,0);
});
test('real projectile path attaches a source snapshot; DOT does not trigger direct-hit procs',()=>{
 const {G,e,pl,cast}=setup();cast('sludge');for(const p of G.Projectiles.all()){p.x=e.x;p.y=e.y;}G.Combat.resolve(.01,pl,0);
 assert.equal(e.poison,1);assert.equal(e.statusState.poison.stacks[0].owner,pl);const direct=pl.procDamage;
 G.Status.update(e,.6);assert(pl.dotDamage>0);assert.equal(pl.procDamage,direct);assert.equal(pl.damageByMove.sludge.direct,51);
});
test('trail fields use the status pipeline and respect type immunity',()=>{
 for(const type of ['normal','steel']){
  const {G,e,pl,cast}=setup(type);pl.x=100;cast('toxic');G.Combat.updateFields(.01);
  if(type==='steel'){assert.equal(e.hp,10000);assert.equal(e.poison,undefined)}else{assert.equal(e.poison,1);assert.equal(e.statusState.poison.stacks[0].reference,36)}
 }
});
test('burn and Poison immunity do not cancel non-immune direct hits',()=>{
 const {G,e,pl,cast}=setup('fire');cast('ember');for(const p of G.Projectiles.all()){p.x=e.x;p.y=e.y;}G.Combat.resolve(.01,pl,0);
 assert(e.hp<10000);assert.equal(e.burn,undefined);assert(pl.dmgDealt>0);
});
test('orbit sources follow their upgraded move and ghost attacks remain visual only',()=>{
 const {G,e,pl,cast}=setup();cast('fire-spin');const p=G.Projectiles.all()[0];assert(p.statusSource.reference>0);
 p.x=e.x;p.y=e.y;G.Combat.resolve(.01,pl,0);assert.equal(e.burn,1);
 const before=e.hp;G.Combat.ghostCast(pl,'sludge',1,0,false);for(const o of G.Projectiles.all()){o.x=e.x;o.y=e.y;o.ghost=true;}
 G.Combat.resolve(.01,pl,1);assert.equal(e.hp,before);
});
test('turret projectiles use the field owner as the status source',()=>{
 const {G,e,pl,cast}=setup();cast('will-o-wisp');G.Combat.updateFields(.31);
 const p=G.Projectiles.all()[0];assert(p);assert.equal(p.statusSource.owner,pl);assert.equal(p.statusSource.moveId,'will-o-wisp');
 p.x=e.x;p.y=e.y;G.Combat.resolve(.01,pl,0);assert.equal(e.burn,1);
});
