const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(host=true){
 let receive;const noop=()=>{};
 const G={Net:{uid:host?'host':'guest',on(fn){receive=fn},onPeer:noop},Player:class {constructor(){this.dmgDealt=0;}},Sprites:{preload:noop},DEX_BY:{25:{}},startMoveOf:()=> 'sludge',Moves:{BY_ID:{sludge:{}}},EnemyMgr:{get:()=>null}};
 const ctx={G,performance,console,document:{addEventListener:noop}};vm.createContext(ctx);for(const f of ['js/systems/status.js','js/net/coop.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
 G.Coop.begin({host:'host',members:[{uid:'host',dex:25},{uid:'guest',dex:25}]},{dmgDealt:0},{syncTeam:noop});
 return {G,receive};
}
test('host receives source metadata and uses sender identity; replayed application is ignored',()=>{
 const {G,receive}=setup();let applied=[];G.EnemyMgr.get=()=>({applyPoison:(n,s)=>applied.push([n,s])});
 const ev=['s',1,'p',1,{moveId:'sludge',reference:300,level:40,owner:'forged'},1];
 receive('guest',{k:'f',ev:[ev,ev]});assert.equal(applied.length,1);assert.equal(applied[0][1].owner.uid,'guest');
 assert.equal(applied[0][1].reference,300);
});
test('invalid remote source is rejected by the status system, and finite values are bounded',()=>{
 const {G,receive}=setup();let applied=[];G.EnemyMgr.get=()=>({applyPoison:(n,s)=>applied.push(s)});
 receive('guest',{k:'f',ev:[['s',1,'p',8,{moveId:'sludge',reference:Infinity,level:40},1],['s',1,'p',8,{moveId:'sludge',reference:1e10,level:2000},2]]});
 assert.equal(applied[0],null);assert.equal(applied[1].reference,100000);assert.equal(applied[1].level,1000);
});
test('host damage reports credit only the intended local player',()=>{
 const {G,receive}=setup(false);
 receive('host',{k:'f',ev:[['dot','guest','sludge','poison',20],['dot','guest','sludge','poison',20],['dot','guest','sludge','poison',15],['dot','host','sludge','poison',999]]});
 assert.equal(G.Coop.local.dotDamage,20);assert.equal(G.Coop.local.damageByMove.sludge.poison,20);
});
test('player frames carry evolution and specialization after the existing Mega field',()=>{
 const {G,receive}=setup(),calls=[];
 G.Evolution={sync:(p,d)=>calls.push(['evolution',d])};G.Mega={sync:(p,d)=>calls.push(['mega',d])};G.Battle={sync:(p,s)=>calls.push(['battle',s.kind,s.tera])};
 const frame=[10,20,0,1,80,100,0,'sludge',3,78,0,1,0,0,0,null,3,{kind:'tera',tera:'water',max:0,gmax:null}];
 receive('guest',{k:'f',p:frame});const n=G.Coop.mate('guest').pl.net;assert.equal(n.evolved,3);assert.equal(n.battle.tera,'water');assert.equal(n.hp,80);assert.deepEqual(calls,[['evolution',3],['mega',null],['battle','tera','water']]);
});
