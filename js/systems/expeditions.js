/* Optional field challenges. The host owns progress, enemy spawns and reward decisions. */
G.Expeditions = (() => {
  const FIRST = 480, GAP = 300, LAST = 28 * 60, LIMIT = 4;
  const authority = () => !G.Coop.active || G.Coop.isHost;
  let current = null, nextAt = FIRST, count = 0, serial = 0, token = '', netT = 0;
  const claimed = new Set(), seen = new Set(), closed = new Set();
  const pendingRewards = [];
  function reset(seed) { current=null;nextAt=FIRST;count=serial=netT=0;token=String(seed || 'solo');claimed.clear();seen.clear();closed.clear();pendingRewards.length=0; }
  function blocked() { return G.Judgment.active || G.Rift.inArena || !!G.Rift.rift || !!G.Events.current || G.EnemyMgr.bossAlive(); }
  function freeNear(p, radius) {
    for (let i=0;i<24;i++) {
      const a=i*Math.PI*2/24, d=radius+(i%3)*18;
      const pos={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d*.8};
      if (G.World.isFree(pos.x,pos.y,24)) return pos;
    }
    return null;
  }
  function send() { if(G.Coop.isHost && current) { current.revision=(current.revision||0)+1; G.Coop.broadcast(['exp','state',snapshot()]); } }
  function snapshot() { return current && {...current, enemies:current.enemies.slice(),nodes:current.nodes.map(n=>({...n}))}; }
  function offer(kind, players, time) {
    if (!authority() || current || blocked() || time>=LAST || count>=LIMIT) return false;
    const p=players.find(p=>!p.dead);if(!p)return false;
    const at=freeNear(p,180);if(!at)return false;
    const nodes=[];
    if(kind==='sanctuary')for(let i=0;i<3;i++){
      const pos=freeNear({x:at.x+Math.cos(i*2.094)*140,y:at.y+Math.sin(i*2.094)*110},30);
      if(!pos)return false;nodes.push({...pos,charge:0});
    }
    current={id:token+':'+(++serial),kind,phase:'offer',x:at.x,y:at.y,left:45,elapsed:0,nodes,enemies:[],wave:0,warning:0};
    seen.add(current.id);count++;send();
    G.Spawner.say(`${kind==='sanctuary'?'Mega Sanctuary':'Rocket Ambush'} nearby · approach the beacon and press F`,4,true);
    return true;
  }
  function request(p=G.Game.player) {
    if(!current || current.phase!=='offer' || !p || p.dead)return false;
    if(!authority()){G.Coop.toHost(['exp-enter',current.id]);return true;}
    if(G.Game.st.time>=LAST || blocked() || G.U.dist2(p.x,p.y,current.x,current.y)>80*80)return false;
    current.phase=current.kind==='sanctuary'?'obelisks':'waves';
    current.left=current.kind==='sanctuary'?75:60;current.warning=1.5;send();
    G.Spawner.say(current.kind==='sanctuary'?'Charge three obelisks, then defeat the guardian!':'Team Rocket incoming · defeat three waves and their commander!',4,true);
    return true;
  }
  function spawn(dex,hp,boss=false,offset=0) {
    const c=current, mon=G.DEX_BY[dex];if(!mon || !G.SPRITE_META[dex])return null;
    const pos=freeNear({x:c.x+Math.cos(offset)*95,y:c.y+Math.sin(offset)*75},40);if(!pos)return null;
    const time=G.Game.st.time;
    const def={dex,name:mon.name,hp:Math.round(hp*G.Coop.scaleHp(G.Game.everyone().length)),spd:boss?65:70,
      dmg:Math.round(12+time/90),xp:0,behavior:boss?'charger':'chaser'};
    const e=new G.Enemy(def,pos.x,pos.y,{hp:1,spd:1,dmg:1},boss);
    // Challenge rewards come only from the event result, never from repeatedly farmed wave loot.
    e.expedition=c.id;G.Sprites.preload([dex]);G.EnemyMgr.add(e);c.enemies.push(e.id);return e;
  }
  function living() { return current.enemies.some(id=>{const e=G.EnemyMgr.get(id);return e&&!e.dead;}); }
  function finish(success) {
    if(!current || !authority())return;
    const c=current;
    for(const id of c.enemies){const e=G.EnemyMgr.get(id);if(e&&!e.dead){e.expeditionDismissed=true;e.dead=true;e.fade=.2;}}
    const reward={id:c.id,kind:c.kind};
    if(G.Coop.isHost)G.Coop.broadcast(['exp','end',reward,!!success]);
    closed.add(c.id);current=null;nextAt=Math.max(nextAt,G.Game.st.time+GAP);
    if(success)claim(reward);else G.Spawner.say('The challenge has ended. No reward was claimed.',3,true);
  }
  function tmChoices(p) {
    const pool=G.Moves.poolFor(p.mon).filter(id=>G.Moves.BY_ID[id].kind!=='buff' && !(p.banned&&p.banned.has(id)));
    const ids=pool.filter(id=>!p.hasMove(id)).slice(0,3);
    const options=[];
    if(p.slots.length<p.maxMoves)for(const id of ids){const m=G.Moves.BY_ID[id];options.push({type:'up',icon:'move:'+id,color:G.U.TYPE_COLOR[m.type],tag:'TM',title:G.T(m.name),desc:'Learn this move in a free move slot.',apply:q=>{if(!q.addMove(id))q.heal(q.maxHp*.45);}});}
    for(const m of p.moves.filter(m=>m.lvl<m.def.maxLvl)){
      if(options.length>=3)break;
      options.push({type:'up',icon:'move:'+m.id,color:G.U.TYPE_COLOR[m.type],tag:'TM',title:G.T(m.name),desc:'Upgrade this learned move by one level.',apply:q=>{if(!G.Moves.levelUp(m))q.heal(q.maxHp*.45);}});
    }
    options.push({type:'up',icon:'heart',color:'#7dffb0',tag:'Recovery',title:'Sitrus Berry',desc:'Restore 45% of your maximum HP.',apply:q=>q.heal(q.maxHp*.45)});
    return options.slice(0,3);
  }
  function claim(reward) {
    if(!reward || claimed.has(reward.id) || !seen.has(reward.id))return false;
    claimed.add(reward.id);
    const p=G.Game.player;if(!p)return false;
    if(p.dead) { pendingRewards.push(reward); return true; }
    grant(reward,p);return true;
  }
  function grant(reward,p) {
    // Rewards remain available after a co-op revival; no permanent save/collection fields are changed.
    if(reward.kind==='sanctuary'){
      p.keyStone=true;
      const forms=p.megaUsed?[]:G.Mega.available(p);
      for(const [id] of forms)G.Sprites.preload([id],8000,p.shiny);
      G.Game.offerItem(forms.length?forms[0][1].stone:G.Items.roll(p.item));
      G.Spawner.say(forms.length?'Key Stone found! Equip the Mega Stone, then press M.':'Key Stone found! Your partner receives an alternative held item.',4,true);
    }else { if(authority())p.coins=(p.coins||0)+60; G.Game.offerReward(tmChoices(p)); }
    return true;
  }
  function update(dt,players,time) {
    const local=G.Game.player;
    if(local&&!local.dead&&pendingRewards.length)grant(pendingRewards.shift(),local);
    if(!authority())return;
    if(current){
      const c=current;
      // No challenge may carry into the final Judgment or another arena.
      if(G.Judgment.active || G.Rift.inArena || (c.phase==='offer' && time>=LAST)){finish(false);return;}
      c.left-=dt;c.elapsed+=dt;
      if(c.left<=0 || players.every(p=>p.dead)){finish(false);return;}
      if(c.phase==='obelisks'){
        for(const n of c.nodes)if(n.charge<2 && players.some(p=>!p.dead&&G.U.dist2(p.x,p.y,n.x,n.y)<44*44))n.charge=Math.min(2,n.charge+dt);
        if(c.nodes.every(n=>n.charge>=2)){
          if(!spawn(448,4800+time*3,true)){finish(false);return;}
          c.phase='guardian';G.Spawner.say('The sanctuary guardian has awakened!',3,true);
        }
      }else if(c.phase==='waves'){
        if(!living()){
          c.warning-=dt;
          if(c.warning<=0){
            if(c.wave<3){for(let i=0;i<6;i++)if(!spawn([23,109,52][c.wave],55+time*.25,false,i*Math.PI/3)){finish(false);return;}c.wave++;c.warning=1.5;}
            else{if(!spawn(53,3200+time*2,true)){finish(false);return;}c.phase='commander';}
          }
        }
      }else if((c.phase==='guardian'||c.phase==='commander')&&!living()){finish(true);return;}
      if((netT-=dt)<=0){netT=.2;send();}
      return;
    }
    if(time>=nextAt && time<LAST && count<LIMIT)offer(count%2===0?'sanctuary':'rocket',players,time);
  }
  function onNet(ev) {
    if(ev[1]==='state'){
      const c=ev[2];if(!c || typeof c.id!=='string' || !['sanctuary','rocket'].includes(c.kind) || closed.has(c.id) || !c.id.startsWith(token+':') || (current&&current.id===c.id&&(c.revision||0)<=(current.revision||0)))return;
      seen.add(c.id);current=c;
    }else if(ev[1]==='end'){
      const r=ev[2];if(!r || !seen.has(r.id) || closed.has(r.id))return;
      closed.add(r.id);
      if(current&&current.id===r.id)current=null;
      if(ev[3])claim(r);
    }
  }
  function drawables() {
    if(!current)return[];const c=current;
    const marks=c.phase==='obelisks'?c.nodes:[{x:c.x,y:c.y,charge:c.phase==='offer'?0:2}];
    return marks.map(n=>({y:n.y-1000,draw(ctx){
      const color=c.kind==='sanctuary'?'#e7a4ff':'#ff5f6d';ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.fillStyle=color;ctx.globalAlpha=.18;
      ctx.beginPath();ctx.ellipse(n.x,n.y,42,30,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.stroke();
      ctx.font='700 16px Pixelify, monospace';ctx.textAlign='center';ctx.fillText(c.phase==='offer'?'F':c.phase==='obelisks'?Math.round(n.charge/2*100)+'%':c.kind==='rocket'?'R':'◆',n.x,n.y-16);ctx.restore();
    }}));
  }
  function drawHud(ctx,w,h,p,F){
    if(!current)return;const c=current;
    const goal=c.phase==='offer'?'Approach beacon · F':c.phase==='obelisks'?`Obelisks ${c.nodes.filter(n=>n.charge>=2).length}/3`:c.phase==='waves'?`Wave ${c.wave}/3${!living()?' · incoming':''}`:c.phase==='guardian'?'Defeat the guardian':'Defeat the commander';
    ctx.save();ctx.font=F(800,12);ctx.textAlign='center';ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.fillStyle=c.kind==='sanctuary'?'#e7a4ff':'#ff8a9a';
    const text=`${c.kind==='sanctuary'?'Mega Sanctuary':'Rocket Ambush'} · ${goal} · ${Math.ceil(c.left)} s`;
    ctx.strokeText(text,w/2,112);ctx.fillText(text,w/2,112);
    if(c.phase==='offer'||c.phase==='obelisks'){
      const n=c.phase==='offer'?c:c.nodes.find(n=>n.charge<2)||c;
      const dx=n.x-p.x,dy=n.y-p.y;const a=Math.atan2(dy,dx);const x=w/2+Math.cos(a)*110,y=162+Math.sin(a)*18;
      ctx.fillText('◆ '+Math.round(Math.hypot(dx,dy)/32)+' m',x,y);
    }
    ctx.restore();
  }
  return {reset,update,request,onNet,drawables,drawHud,claim,tmChoices,
    get busy(){return !!current;},get active(){return !!current&&current.phase!=='offer';},get current(){return snapshot();},
    debugOffer(kind){return offer(kind,G.Game.everyone(),G.Game.st.time);}};
})();
