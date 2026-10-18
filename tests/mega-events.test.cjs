const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function load(G,files){const c={G,performance,console};vm.createContext(c);for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});return G;}
function setup(dex=6){
 const no=()=>{},enemies=new Map(),packets=[],items=[],rewards=[];let id=0;
 const G={Items:{BY:{},roll:()=> 'leftovers'},DEX_BY:{3:{name:'Venusaur'},6:{name:'Charizard'},94:{name:'Gengar'},448:{name:'Lucario'},23:{name:'Ekans'},109:{name:'Koffing'},52:{name:'Meowth'},53:{name:'Persian'}},SPRITE_META:{448:{},23:{},109:{},52:{},53:{}},
 Sprites:{Animator:class{constructor(d,s,sh){this.dex=d;this.shiny=sh;this.dir=0}},bodyHeight:()=>44,preload:no},Projectiles:{clearOrbs:no},FX:{ring:no},Audio:{sfx:no},Spawner:{say:no},
 Coop:{active:false,isHost:false,scaleHp:n=>1+.3*(n-1),broadcast:p=>packets.push(p),toHost:p=>packets.push(p)},U:{TYPE_COLOR:{fire:'#f00',normal:'#fff'},dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
 World:{isFree:()=>true},Rift:{inArena:false,rift:null},Events:{current:null},Judgment:{active:false},T:s=>s};
 const p={dex,mon:{dex,types:dex===3?['grass','poison']:dex===6?['fire','flying']:['ghost','poison']},x:0,y:0,dead:false,shiny:true,moves:[],slots:[],maxMoves:4,hasMove:()=>false,heal:no,anim:{dir:3}};
 G.Game={player:p,everyone:()=>[p],st:{time:480},offerItem:id=>items.push(id),offerReward:cards=>rewards.push(cards)};
 G.Enemy=class{constructor(def,x,y,sc,boss){Object.assign(this,{id:++id,def,x,y,boss,hp:def.hp,dead:false});}applySlow(f,d){this.slow=f;this.slowT=d;}};
 G.EnemyMgr={get:id=>enemies.get(id),add:e=>enemies.set(e.id,e),bossAlive:()=>[...enemies.values()].some(e=>e.boss&&!e.dead),queryCircle:()=>[...enemies.values()]};
 G.Moves={BY_ID:{tackle:{kind:'melee',name:'Tackle',type:'normal'}},poolFor:()=>['tackle'],levelUp:m=>m.lvl++};
 load(G,['js/data/mega-sprites.js','js/data/generated-mega-sprites.js','js/systems/mega.js','js/systems/expeditions.js']);G.Expeditions.reset(123);
 return {G,p,enemies,packets,items,rewards};
}
function begin(s,kind){assert(s.G.Expeditions.debugOffer(kind));const c=s.G.Expeditions.current;s.p.x=c.x;s.p.y=c.y;assert(s.G.Expeditions.request());}
function completeSanctuary(s){begin(s,'sanctuary');for(const n of s.G.Expeditions.current.nodes){s.p.x=n.x;s.p.y=n.y;s.G.Expeditions.update(2,[s.p],480);}assert.equal(s.G.Expeditions.current.phase,'guardian');for(const e of s.enemies.values())e.dead=true;s.G.Expeditions.update(.01,[s.p],490);}

test('Mega requires compatible species, a Key Stone, held stone and a live partner',()=>{
 const {G,p}=setup();p.item='charizardite-x';assert.equal(G.Mega.activate(p),false);p.keyStone=true;p.dead=true;assert.equal(G.Mega.activate(p),false);p.dead=false;p.item='gengarite';assert.equal(G.Mega.activate(p),false);p.item='charizardite-x';assert(G.Mega.activate(p));assert.equal(p.dex,6);assert.equal(p.anim.dex,'mega-charizard-x');assert.equal(p.anim.shiny,true);assert.equal(p.anim.dir,3);assert.equal(G.Mega.form(p).types.join('/'),'fire/dragon');assert.equal(G.Mega.activate(p),false);
});
test('removing the stone restores the base form without allowing another transformation',()=>{
 const {G,p}=setup();p.item='charizardite-x';p.keyStone=true;G.Mega.activate(p);G.Items.BY[p.item].off(p);assert.equal(p.megaId,null);assert.equal(p.anim.dex,6);assert.equal(G.Mega.activate(p),false);
});
test('Mega stones are event-only; Tough Claws does not boost non-contact moves',()=>{
 const {G,p}=setup();p.megaId='mega-charizard-x';assert.equal(G.Mega.moveMultiplier(p,{id:'tackle'}),1.15);assert.equal(G.Mega.moveMultiplier(p,{id:'ember'}),1);assert.equal(G.Items.LIST,undefined);
});
test('remote Mega identity is species-checked; Shadow Tag is host-only and weaker on bosses',()=>{
 const {G,p,enemies}=setup(94);G.Mega.sync(p,'mega-charizard-x');assert.equal(p.megaId,undefined);G.Mega.sync(p,'mega-gengar');assert.equal(p.megaId,'mega-gengar');
 enemies.set(1,new G.Enemy({hp:10},0,0,{},false));enemies.set(2,new G.Enemy({hp:10},0,0,{},true));G.Mega.update(.2,[p]);assert.equal(enemies.get(1).slow,.25);assert.equal(enemies.get(2).slow,.08);
 enemies.get(1).slow=0;G.Coop.active=true;G.Coop.isHost=false;G.Mega.update(1,[p]);assert.equal(enemies.get(1).slow,0);
});
test('Sanctuary grants one compatible stone after all obelisks and the guardian, never a move bond',()=>{
 const s=setup();completeSanctuary(s);assert.equal(s.p.keyStone,true);assert.deepEqual(s.items,['charizardite-x']);assert.equal(s.p.bonds,undefined);assert.equal(s.G.Expeditions.current,null);assert.equal(s.G.Expeditions.claim({id:'123:1',kind:'sanctuary'}),false);assert.equal(s.items.length,1);
});
test('an ineligible species receives an alternative held item',()=>{
 const s=setup(25);completeSanctuary(s);assert.deepEqual(s.items,['leftovers']);assert.equal(s.p.keyStone,true);
});
test('field challenges never teleport players; entry requires proximity',()=>{
 const s=setup();assert(s.G.Expeditions.debugOffer('rocket'));assert.equal(s.G.Expeditions.request(),false);assert.equal(s.p.x,0);const c=s.G.Expeditions.current;s.p.x=c.x;s.p.y=c.y;assert(s.G.Expeditions.request());assert.equal(s.p.x,c.x);assert.equal(s.p.y,c.y);
});
test('Rocket requires all three waves and the commander before one TM selection',()=>{
 const s=setup();begin(s,'rocket');for(let wave=1;wave<=3;wave++){
  s.G.Expeditions.update(1.5,[s.p],480);assert.equal(s.G.Expeditions.current.wave,wave);assert.equal([...s.enemies.values()].filter(e=>!e.dead).length,6);for(const e of s.enemies.values())e.dead=true;
 }
 s.G.Expeditions.update(1.5,[s.p],480);assert.equal(s.G.Expeditions.current.phase,'commander');assert.equal(s.rewards.length,0);for(const e of s.enemies.values())e.dead=true;s.G.Expeditions.update(.01,[s.p],490);assert.equal(s.rewards.length,1);assert(s.rewards[0].length>=2);assert.equal(s.rewards[0][0].tag,'TM');
});
test('timeout dismisses remaining enemies without granting a reward or kill credit',()=>{
 const s=setup();begin(s,'rocket');s.G.Expeditions.update(2,[s.p],480);s.G.Expeditions.update(61,[s.p],541);assert.equal(s.G.Expeditions.current,null);assert.equal(s.rewards.length,0);for(const e of s.enemies.values())assert.equal(e.expeditionDismissed,true);
});
test('new events defer for bosses, legacy events, rifts and Judgment; no offers after minute 28',()=>{
 for(const block of [s=>s.G.Rift.rift={},s=>s.G.Rift.inArena=true,s=>s.G.Events.current='lost',s=>s.G.Judgment.active=true,s=>s.G.EnemyMgr.bossAlive=()=>true]){const s=setup();block(s);assert.equal(s.G.Expeditions.debugOffer('rocket'),false);}
 const s=setup();s.G.Game.st.time=1680;assert.equal(s.G.Expeditions.debugOffer('rocket'),false);
});
test('expired offers cannot be replayed into new client events; state revisions cannot regress',()=>{
 const s=setup();s.G.Coop.active=true;s.G.Coop.isHost=false;
 const c={id:'123:1',kind:'rocket',phase:'offer',left:40,enemies:[],nodes:[],revision:2};s.G.Expeditions.onNet(['exp','state',c]);s.G.Expeditions.onNet(['exp','state',{...c,left:45,revision:1}]);assert.equal(s.G.Expeditions.current.left,40);
 s.G.Expeditions.onNet(['exp','end',{id:'123:1',kind:'rocket'},false]);s.G.Expeditions.onNet(['exp','state',{...c,revision:3}]);assert.equal(s.G.Expeditions.current,null);s.G.Expeditions.onNet(['exp','state',{...c,id:'oldrun:1'}]);assert.equal(s.G.Expeditions.current,null);
});
test('client entry requests cannot spawn enemies or resolve a challenge locally',()=>{
 const s=setup();s.G.Coop.active=true;s.G.Coop.isHost=false;s.G.Expeditions.onNet(['exp','state',{id:'123:1',kind:'rocket',phase:'offer',x:0,y:0,left:45,enemies:[],nodes:[],revision:1}]);s.G.Expeditions.request();s.G.Expeditions.update(61,[s.p],541);assert.equal(s.enemies.size,0);assert.equal(s.packets[0][0],'exp-enter');assert.equal(s.rewards.length,0);
});
test('all shipped normal and shiny animations have valid geometry and source credit files',()=>{
 const {G}=setup();for(const id of Object.keys(G.Mega.FORMS)){
  const meta=G.SPRITE_META[id];if(!meta){assert.equal(G.Mega.available({dex:G.Mega.FORMS[id].dex}).some(([key])=>key===id),false);continue;}assert(meta.sh);for(const shiny of [false,true])for(const [anim,a] of Object.entries(shiny?(meta.sa||meta.a):meta.a)){
   const file=path.join(root,'assets/pokemon',id,shiny?'s':'',anim+'.png');const png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),a.w*a.n);assert.equal(png.readUInt32BE(20),a.h*a.r);assert(a.ax>=0&&a.ay>=0);
  }assert(fs.readFileSync(path.join(root,'assets/pokemon',id,'credits.txt'),'utf8').length>0);
 }
});
test('Mega stat getters apply exactly once and restore the base attack and typing',()=>{
 for(const [dex,id,stone,mult] of [[3,'mega-venusaur','venusaurite',1.1],[6,'mega-charizard-x','charizardite-x',1.1],[94,'mega-gengar','gengarite',1.2]]){
  const {G,p}=setup(dex);load(G,['js/entities/player.js']);Object.setPrototypeOf(p,G.Player.prototype);
  Object.assign(p,{baseAtk:2,atkMul:1,buffs:{atk:{n:0,amount:0}},keyStone:true});
  p.equip(stone);assert(G.Mega.activate(p));assert.equal(p.atk,2*mult);assert.equal(p.dex,dex);assert.equal(p.visualDex,id);
  p.equip(null);assert.equal(p.atk,2);assert.equal(p.types,p.mon.types);assert.equal(p.visualDex,dex);
 }
});
test('a successful reward for a downed co-op player is deferred until revival and delivered once',()=>{
 const s=setup();s.G.Coop.active=true;s.G.Coop.isHost=false;
 const c={id:'123:1',kind:'sanctuary',phase:'guardian',enemies:[],nodes:[],revision:1};
 s.G.Expeditions.onNet(['exp','state',c]);s.p.dead=true;s.G.Expeditions.onNet(['exp','end',{id:c.id,kind:c.kind},true]);assert.equal(s.items.length,0);
 s.p.dead=false;s.G.Expeditions.update(.1,[s.p],500);assert.equal(s.items.length,1);s.G.Expeditions.onNet(['exp','end',{id:c.id,kind:c.kind},true]);assert.equal(s.items.length,1);
});
test('full move slots offer upgrades instead of illegally appending another slot',()=>{
 const {G,p}=setup();p.slots=[[],[],[],[]];p.moves=[{id:'tackle',name:'Tackle',type:'normal',lvl:2,def:{maxLvl:5}}];p.hasMove=()=>true;
 const cards=G.Expeditions.tmChoices(p);cards[0].apply(p);assert.equal(p.moves[0].lvl,3);assert.equal(p.slots.length,4);
});

test('Venusaur Sanctuary grants Venusaurite and supports normal and shiny Mega sprites',()=>{
 for(const shiny of [false,true]){const s=setup(3);s.p.shiny=shiny;completeSanctuary(s);assert.deepEqual(s.items,['venusaurite']);s.p.item='venusaurite';assert(s.G.Mega.activate(s.p));assert.equal(s.p.anim.dex,'mega-venusaur');assert.equal(s.p.anim.shiny,shiny);}
});
test('Thick Fat halves Fire and Ice after typing, preserves other hits and pure damage',()=>{
 const {G,p}=setup(3);load(G,['js/data/types.js','js/entities/player.js']);Object.setPrototypeOf(p,G.Player.prototype);
 G.U.clamp=(n,min,max)=>Math.max(min,Math.min(max,n));G.Weather={mult:()=>1};G.Camera={kick:()=>{}};G.FX.dmgText=G.FX.burst=()=>{};
 Object.assign(p,{megaId:'mega-venusaur',dmgReduce:0,buffs:{def:{n:0,amount:0}},activeGroup:()=>[],hasItem:()=>false});
 const hit=(type,pure=false)=>{p.hp=1000;p.dead=false;p.invuln=0;p.hurt(100,type,pure);return 1000-p.hp;};
 assert.equal(hit('fire'),80);assert.equal(hit('ice'),80);assert.equal(hit('water'),60);assert.equal(hit('psychic'),160);assert.equal(hit('fire',true),160);
 p.megaId=null;assert.equal(hit('fire'),160);assert.equal(hit('ice'),160);
});
