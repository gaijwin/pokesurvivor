const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(dex=1){
 const noop=()=>{},enemies=[],items=[],rewards=[],banners=[],weather=[];
 const G={Items:{BY:{},roll:()=> 'leftovers'},Sprites:{Animator:class{constructor(d,s,sh){this.dex=d;this.scale=s;this.shiny=sh;this.dir=0}},hasShiny:()=>true,bodyHeight:()=>40,bodyRadius:()=>10,preload:noop},Projectiles:{clearOrbs:noop},
 FX:new Proxy({},{get:()=>noop}),Audio:{sfx:noop},Spawner:{say:s=>banners.push(s)},Coop:{active:false,isHost:false,scaleHp:n=>1+.3*(n-1),broadcast:noop,toHost:noop},
 U:{TYPE_COLOR:{},clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},Weather:{mult:()=>1,speedFor:()=>1,debugStart:(...a)=>weather.push(a)},World:{isFree:()=>true},Rift:{inArena:false,rift:null},Events:{current:null},Judgment:{active:false},T:s=>s};
 const ctx={G,performance,console};vm.createContext(ctx);
 for(const f of ['js/data/pokedex.js','js/data/types.js','js/data/moves.js','js/systems/status.js','js/systems/evolution.js','js/systems/battle.js','js/systems/mega.js','js/entities/player.js','js/systems/expeditions.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 G.SPRITE_META={};for(const d of [1,2,3,4,5,6,7,8,9,19,23,52,53,63,92,94,109,147,448])G.SPRITE_META[d]={};
 for(const id of ['mega-venusaur','mega-charizard-x','mega-gengar','mega-lucario'])G.SPRITE_META[id]={};
 const p=new G.Player(G.DEX_BY[dex]);p.addMove('tackle');
 G.Game={player:p,everyone:()=>[p],st:{time:480},offerItem:id=>items.push(id),offerReward:cards=>rewards.push(cards)};
 G.Enemy=class{constructor(def,x,y,s,boss){Object.assign(this,{id:enemies.length+1,def,x,y,boss,hp:def.hp,maxHp:def.hp,types:G.DEX_BY[def.dex].types,dead:false,shield:0});}hurt(n){const block=Math.min(n,this.shield);this.shield-=block;const taken=Math.min(this.hp,Math.max(0,n-block));this.hp-=taken;if(this.hp<=0)this.dead=true;return taken;}applySlow(n,t){this.slow=n;this.slowT=t;}};
 G.EnemyMgr={all:()=>enemies,get:id=>enemies.find(e=>e.id===id),add:e=>enemies.push(e),bossAlive:()=>false,queryCircle:(x,y,r)=>enemies.filter(e=>(e.x-x)**2+(e.y-y)**2<=r*r)};
 G.Expeditions.reset(123);
 function target(types=['normal'],hp=1e6,x=0){const e=new G.Enemy({dex:19,hp},x,0,{},false);e.types=types;enemies.push(e);return e;}
 function begin(kind){assert(G.Expeditions.debugOffer(kind));const c=G.Expeditions.current;p.x=c.x;p.y=c.y;assert(G.Expeditions.request());}
 return {G,p,enemies,items,rewards,banners,weather,target,begin};
}
test('STAB and Adaptability replace one another, and Mega Launcher has an explicit pulse list',()=>{
 const {G,p}=setup(448);assert.equal(G.Battle.multiplier(p,{type:'fighting'}),1.15);assert.equal(G.Battle.multiplier(p,{type:'fire'}),1);
 p.megaId='mega-lucario';assert.equal(G.Battle.multiplier(p,{type:'fighting'}),1.3);
 p.megaId='mega-blastoise';assert.equal(G.Mega.moveMultiplier(p,{id:'dark-pulse',type:'dark'}),1.25);assert.equal(G.Mega.moveMultiplier(p,{id:'water-gun',type:'water'}),1);
});
test('Tera uses one defensive type, keeps original STAB, and locks Mega and Dynamax',()=>{
 const {G,p}=setup(6);assert(G.Battle.unlock(p,'tera','water'));assert(G.Battle.activateTera(p));assert.equal(p.types.join('/'),'water');
 assert.equal(G.Battle.multiplier(p,{type:'fire'}),1.15);assert.equal(G.Battle.multiplier(p,{type:'water'}),1.25);assert.equal(G.Battle.multiplier(p,{type:'normal'}),1);
 p.keyStone=true;p.item='charizardite-x';assert.equal(G.Mega.activate(p),false);p.specialUnlock='dynamax';assert.equal(G.Battle.activateMax(p),false);
 p.dead=true;G.Battle.update(.1,p);assert.equal(p.teraType,null);p.dead=false;assert.equal(G.Battle.activateTera(p),false);
});
test('matching Tera replaces STAB instead of multiplying it; invalid types are rejected',()=>{
 const {G,p}=setup(6);assert.equal(G.Battle.unlock(p,'tera','stellar'),false);G.Battle.unlock(p,'tera','fire');G.Battle.activateTera(p);assert.equal(G.Battle.multiplier(p,{type:'fire'}),1.35);
});
test('Z-Move shares exactly six reference seconds across targets, once, without proc damage',()=>{
 const {G,p,target}=setup();const a=target(),b=target();G.Battle.unlock(p,'z','normal');p.item='z-crystal';const m=p.activeMove();const expected=G.Status.source(p,m).reference*6;
 assert(G.Battle.activateZ(p));assert(Math.abs((a.maxHp-a.hp+b.maxHp-b.hp)-expected)<1e-7);assert.equal(p.dotDamage,0);assert.equal(G.Battle.activateZ(p),false);
});
test('Z-Move cannot consume a charge without targets or bypass immunity or held-crystal requirements',()=>{
 const {G,p,target}=setup();G.Battle.unlock(p,'z','normal');p.item='z-crystal';assert.equal(G.Battle.activateZ(p),false);const e=target(['ghost']);assert.equal(G.Battle.activateZ(p),false);assert.equal(e.hp,e.maxHp);e.types=['normal'];p.item=null;assert.equal(G.Battle.activateZ(p),false);assert(!p.zUsed);
});
test('Dynamax restores the health fraction and original footprint, including arena interruption',()=>{
 const {G,p}=setup();const hp=p.maxHp,r=p.r;p.hp=hp*.5;G.Battle.unlock(p,'dynamax');assert(G.Battle.activateMax(p));assert.equal(p.maxHp,hp*1.5);assert.equal(p.r,r);assert.equal(p.anim.scale,1.5);
 p.hp=p.maxHp*.25;G.Rift.inArena=true;G.Battle.update(.1,p);assert.equal(p.maxHp,hp);assert.equal(p.hp,hp*.25);assert.equal(p.anim.scale,1);assert.equal(G.Battle.activateMax(p),false);
});
test('Dynamax pulses and end HP are invariant under a long frame versus short frames',()=>{
 function simulate(steps){const {G,p,target}=setup();const e=target();G.Battle.unlock(p,'dynamax');G.Battle.activateMax(p);for(const dt of steps)G.Battle.update(dt,p);return {damage:e.maxHp-e.hp,hp:p.hp,max:p.maxHp,pulses:p.maxPulses,time:p.maxTime};}
 const a=simulate([18]),b=simulate(Array(180).fill(.1));assert.equal(a.pulses,3);assert.equal(b.pulses,3);assert(Math.abs(a.damage-b.damage)<1e-7);assert.equal(a.max,b.max);assert.equal(a.time,0);
});
test('evolution preserves save identity, health ratio and held item, and supports evolved Mega compatibility',()=>{
 const {G,p}=setup();const dex=p.dex;p.level=16;p.hp=p.maxHp*.4;p.item='leftovers';assert(G.Evolution.activate(p));assert.equal(p.evolvedDex,2);assert.equal(p.dex,dex);assert(Math.abs(p.hp/p.maxHp-.4)<1e-9);assert.equal(p.item,'leftovers');assert.equal(G.Evolution.activate(p),false);
 p.level=32;assert(G.Evolution.activate(p));p.keyStone=true;p.item='venusaurite';assert(G.Mega.activate(p));assert.equal(p.dex,1);assert.equal(p.visualDex,'mega-venusaur');G.Items.BY.venusaurite.off(p);assert.equal(p.visualDex,3);assert.equal(p.anim.dex,3);
});
test('remote evolution validates the chain and battle state rejects unknown Tera types',()=>{
 const {G,p}=setup();assert.equal(G.Evolution.sync(p,6),false);assert(G.Evolution.sync(p,3));G.Battle.sync(p,{kind:'tera',tera:'garbage',max:1});assert.equal(p.teraType,null);assert.equal(p.maxTime,0);G.Battle.sync(p,{kind:'dynamax',max:1});assert.equal(p.anim.scale,1.5);
});
test('Drought is host-owned, defers in arenas and has a deterministic sixty-second cooldown',()=>{
 const {G,p,weather}=setup(6);p.megaId='mega-charizard-y';G.Mega.update(.1,[p]);assert.deepEqual(weather,[['sun',30]]);G.Mega.update(30,[p]);assert.equal(weather.length,1);G.Mega.update(30,[p]);assert.equal(weather.length,2);G.Coop.active=true;G.Coop.isHost=false;G.Mega.update(90,[p]);assert.equal(weather.length,2);
});
test('unavailable Mega assets remain locked and new specialization rewards are explicit choices',()=>{
 const {G,p}=setup(6);assert.equal(G.Mega.available(p).some(([id])=>id==='mega-charizard-y'),false);const choices=G.Battle.rewardChoices(p);assert(choices.some(c=>c.title==='Dynamax'));assert(choices.some(c=>c.title==='Mega Evolution'));G.Battle.unlock(p,'tera','fire');assert.equal(G.Battle.rewardChoices(p).length,0);
});
test('Distortion rotates telegraphed resonance, never amplifies unrelated enemies, and grants one TM',()=>{
 const s=setup();s.begin('distortion');const {G,p}=s;G.Expeditions.update(1.5,[p],482);const e=s.enemies[0];assert.equal(G.Expeditions.damageMultiplier('psychic',e),1.25);assert.equal(G.Expeditions.damageMultiplier('normal',e),.8);assert.equal(G.Expeditions.damageMultiplier('psychic',{}),1);
 G.Expeditions.update(14,[p],496);assert.equal(G.Expeditions.current.resonance,1);G.Expeditions.update(75,[p],571);assert.equal(G.Expeditions.current,null);assert.equal(s.rewards.length,1);assert.equal(s.items.length,0);
});
test('Grove targets its tree; intact and destroyed trees grant different harvests without permanent losses',()=>{
 for(const destroyed of [false,true]){const s=setup();s.begin('grove');s.G.Expeditions.update(1.5,[s.p],482);const e=s.enemies[0],tree=s.G.Expeditions.targetFor(e);assert(tree);assert.equal(s.G.Expeditions.targetFor({}),null);
 if(destroyed){e.x=tree.x;e.y=tree.y;for(let i=0;i<10;i++)s.G.Expeditions.update(1.5,[s.p],500+i);}else s.G.Expeditions.update(44,[s.p],526);
 assert.equal(s.G.Expeditions.current,null);assert.equal(s.rewards.length,1);assert.equal(s.rewards[0][0].desc,destroyed?'Restore 9% maximum HP.':'Restore 45% maximum HP.');}
});
test('Lum Berry clears one slowdown only; a defeated party earns no Grove reward',()=>{
 const s=setup();s.begin('grove');s.G.Expeditions.update(45,[s.p],525);s.rewards[0][1].apply(s.p);s.p.slowT=2;s.G.Battle.update(.1,s.p);assert.equal(s.p.slowT,0);assert.equal(s.p.cleanseReady,false);s.p.slowT=2;s.G.Battle.update(.1,s.p);assert.equal(s.p.slowT,2);
 const t=setup();t.begin('grove');t.p.dead=true;t.G.Expeditions.update(1,[t.p],481);assert.equal(t.rewards.length,0);
});
test('status summaries expose independent expiry range and disappear when expired',()=>{
 const {G,p,target}=setup();const e=target();const m=G.Moves.instance('sludge');G.Status.apply(e,'poison',1,G.Status.source(p,m));G.Status.update(e,1);G.Status.apply(e,'poison',1,G.Status.source(p,m));const row=G.Status.summary(e)[0];assert.equal(row.count,2);assert.equal(row.next,3);assert.equal(row.last,4);G.Status.update(e,5);assert.equal(G.Status.summary(e).length,0);
});

test('guest status previews age host expiry snapshots without simulating damage',()=>{
 const {G,target}=setup();const e=target();e.remote=true;e.net={status:[['poison',4,1,3]],age:.5};const s=G.Status.summary(e)[0];assert.equal(s.next,.5);assert.equal(s.last,2.5);G.Status.update(e,5);assert.equal(e.hp,e.maxHp);e.net.age=4;assert.equal(G.Status.summary(e).length,0);
});
test('Distortion guests resolve challenge membership by synchronized enemy IDs',()=>{
 const s=setup();s.begin('distortion');s.G.Expeditions.update(2,[s.p],482);const e=s.enemies[0];delete e.expedition;assert.equal(s.G.Expeditions.damageMultiplier('psychic',e),1.25);
});
test('guest Max weather is resolved by the host once per pulse and never inside an arena',()=>{
 const {G,p,weather}=setup();G.Coop.active=true;G.Coop.isHost=true;p.net={mv:'water-gun'};p.maxTime=1;
 G.Battle.hostWeather(.1,[p]);assert.deepEqual(weather,[['rain',12]]);G.Battle.hostWeather(.1,[p]);assert.equal(weather.length,1);G.Rift.inArena=true;G.Battle.hostWeather(6,[p]);assert.equal(weather.length,1);
});

test('HP upgrades earned during Dynamax persist after its temporary HP multiplier ends',()=>{
 const {G,p}=setup();const base=p.maxHp;G.Battle.unlock(p,'dynamax');G.Battle.activateMax(p);p.addMaxHp(20);assert.equal(p.maxHp,(base+20)*1.5);G.Battle.endMax(p);assert.equal(p.maxHp,base+20);assert.equal(p.hp,base+20);
});

test('Gigantamax requires its own atlas and Replenish restores only one consumed Lum Berry',()=>{
 const {G,p,target}=setup(143);assert.equal(G.Battle.gmaxAvailable(p),null);G.SPRITE_META['gmax-snorlax']={a:{Idle:{},Walk:{},Attack:{}}};assert(G.Battle.gmaxAvailable(p));
 G.Battle.unlock(p,'dynamax');p.gmaxChoice='gmax-snorlax';p.lumSpent=true;target();assert(G.Battle.activateMax(p));assert.equal(p.visualDex,'gmax-snorlax');G.Battle.update(.1,p);assert.equal(p.cleanseReady,true);assert.equal(p.replenished,true);
 p.slowT=2;G.Battle.update(.1,p);assert.equal(p.cleanseReady,false);G.Battle.update(6,p);assert.equal(p.cleanseReady,false);G.Battle.endMax(p);assert.equal(p.visualDex,143);assert.equal(p.anim.dex,143);
});
test('remote Gigantamax visual state accepts only a compatible installed form',()=>{
 const {G,p}=setup(143);G.SPRITE_META['gmax-snorlax']={a:{Idle:{},Walk:{},Attack:{}}};G.Battle.sync(p,{kind:'dynamax',max:1,gmax:'gmax-snorlax'});assert.equal(p.visualDex,'gmax-snorlax');G.Battle.sync(p,{kind:'dynamax',max:1,gmax:'mega-gengar'});assert.equal(p.visualDex,143);
});

test('shipped Gigantamax normal/shiny animation sheets match engine geometry',()=>{
 const G={SPRITE_META:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/data/generated-gmax-sprites.js'),'utf8'),{G});const m=G.SPRITE_META['gmax-snorlax'];assert(m.sh);
 for(const shiny of [false,true])for(const [anim,a] of Object.entries(m.a)){const png=fs.readFileSync(path.join(root,'assets/pokemon/gmax-snorlax',shiny?'s':'',anim+'.png'));assert.equal(png.readUInt32BE(16),a.w*a.n);assert.equal(png.readUInt32BE(20),a.h*a.r);}
 assert(fs.readFileSync(path.join(root,'assets/pokemon/gmax-snorlax/credits.txt'),'utf8').includes('generated'));
});

test('evolution waits for a collision-free footprint and interrupted Groves grant no harvest',()=>{
 const s=setup();s.p.level=16;s.G.World.isFree=()=>false;const hp=s.p.maxHp;assert.equal(s.G.Evolution.activate(s.p),false);assert.equal(s.p.evolvedDex,undefined);assert.equal(s.p.maxHp,hp);
 const t=setup();t.begin('grove');t.G.Judgment.active=true;t.G.Expeditions.update(1,[t.p],481);assert.equal(t.G.Expeditions.current,null);assert.equal(t.rewards.length,0);
});
