// Load the actual game module with test-only access to its private state; no production debug hook is added.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
 const shown=[],open=new Set(),elements=new Map();let holds=0;
 const node=id=>{if(!elements.has(id))elements.set(id,{textContent:'',classList:{add(){}}});return elements.get(id)};
 const G={Coop:{active:true,holdStart(){holds++},holdEnd(){holds--},localPicked(){}},UI:{isOpen:id=>open.has(id),hide:id=>open.delete(id)},Audio:{sfx(){}},RunUI:{showLevelUp(level,cards,cb){open.add('scr-levelup');shown.push({cards,cb})},closeLevelUp(){open.delete('scr-levelup')}},LevelUp:{offer:()=>[{title:'level'}]}};
 const ctx={G,document:{getElementById:node},performance,console};vm.createContext(ctx);
 let code=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8');code=code.replace('    init, startRun, everyone, levelXp, flash, offerBond, offerItem, offerReward,', '    _set(p,s) { pl=p; state=s; }, _state() { return state; }, _resume: coopApi.resume, _level: coopApi.levelStart, _after: afterLevelUp, init, startRun, everyone, levelXp, flash, offerBond, offerItem, offerReward,');
 vm.runInContext(code,ctx);const p={level:12};G.Game._set(p,'playing');
 return {G,p,shown,node,open,get holds(){return holds}};
}
test('TM selection pauses co-op, applies one choice and releases its hold',()=>{
 const s=setup();let applied=0;s.G.Game.offerReward([{title:'TM',apply(){applied++}}]);assert.equal(s.G.Game._state(),'choice');assert.equal(s.holds,1);assert.equal(s.node('level-choice-title').textContent,'Choose a TM reward');s.open.delete('scr-levelup');s.shown[0].cb(s.shown[0].cards[0]);assert.equal(applied,1);assert.equal(s.G.Game._state(),'playing');assert.equal(s.holds,0);
});
test('a shared level-up interrupt restores the pending TM selection and balances holds',()=>{
 const s=setup();const cards=[{title:'TM',apply(){}}];s.G.Game.offerReward(cards);s.G.Game._level(13);assert.equal(s.holds,0);assert.equal(s.G.Game._state(),'levelup');s.G.Game._resume();assert.equal(s.G.Game._state(),'choice');assert.equal(s.holds,1);assert.equal(s.shown.at(-1).cards,cards);
});
test('rewards received during a level-up stay queued until it finishes',()=>{
 const s=setup();s.G.Game._set(s.p,'levelup');const cards=[{title:'TM',apply(){}}];s.G.Game.offerReward(cards);assert.equal(s.shown.length,0);s.G.Game._resume();assert.equal(s.shown.length,1);assert.equal(s.shown[0].cards,cards);
});
