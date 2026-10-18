/* One battle specialization per run. Numeric values are survivor adaptations. */
G.Battle = (() => {
  const GMAX={143:{id:'gmax-snorlax',name:'Gigantamax Snorlax',type:'normal',move:'G-Max Replenish'}};
  const TYPES = Object.keys(G.Types.CHART);
  const ownerDex = p => p.evolvedDex || p.dex;
  const originalTypes = p => (G.DEX_BY[ownerDex(p)] || p.mon).types;
  const validType = t => TYPES.includes(t);
  function commit(p, kind) {
    if (!p || p.dead || (p.specialization && p.specialization !== kind)) return false;
    p.specialization = kind; return true;
  }
  function multiplier(p, m) {
    if (!p || !m) return 1;
    const native = originalTypes(p).includes(m.type);
    // Explicit modest STAB baseline; Adaptability replaces it, never multiplies it twice.
    let k = native ? (p.megaId === 'mega-lucario' ? 1.30 : 1.15) : 1;
    if (p.teraType) k = m.type === p.teraType ? (native ? 1.35 : 1.25) : k;
    if (p.maxTime > 0) k *= 1.15;
    return k;
  }
  function reference(p, m) {
    return G.Status.source(p,m).reference;
  }
  function burst(p, m, seconds, radius, label) {
    const targets=G.EnemyMgr.queryCircle(p.x,p.y,radius).filter(e=>!e.dead && G.Types.mult(m.type,e.types)>0);
    if(!targets.length)return false;
    // A fixed total budget is shared across targets, with no crit/status/on-hit recursion.
    const budget=reference(p,m)*seconds/targets.length;
    for(const e of targets){
      const k=G.Types.mult(m.type,e.types)*G.Weather.mult(m.type)*(G.Expeditions?G.Expeditions.damageMultiplier(m.type,e):1);
      const n=e.hurt(budget*k,G.U.TYPE_COLOR[m.type],0,0,0,G.Types.label(k));
      G.Status.record(p,label+':'+m.id,'direct',n);
      if(label==='Max Strike')e.applySlow(.20,2);
    }
    G.FX.ring(p.x,p.y,8,radius,G.U.TYPE_COLOR[m.type],.65,5);
    G.Spawner.say(label,2,true);return true;
  }
  function activateZ(p) {
    const m=p&&p.activeMove();
    if(!p || p.dead || p.specialUnlock!=='z' || p.zUsed || p.item!=='z-crystal' || !m || m.kind==='buff' || m.type!==p.zType || (p.specialization&&p.specialization!=='z'))return false;
    if(!burst(p,m,6,340,'Z-Move'))return false;
    commit(p,'z');p.zUsed=true;return true;
  }
  function activateTera(p) {
    if(!p || p.specialUnlock!=='tera' || p.teraUsed || !validType(p.teraChoice) || !commit(p,'tera'))return false;
    p.teraUsed=true;p.teraType=p.teraChoice;G.Projectiles.clearOrbs(p);return true;
  }
  function endMax(p) {
    if(!p.maxHpBefore)return;
    const ratio=Math.max(0,Math.min(1,p.hp/p.maxHp));
    p.maxHp=p.maxHpBefore;p.hp=ratio*p.maxHp;delete p.maxHpBefore;p.maxTime=0;
    if(p.maxForm){const dir=p.anim.dir;p.maxForm=null;p.anim=new G.Sprites.Animator(ownerDex(p),1,p.shiny);p.anim.dir=dir;}
    p.anim.scale=1;G.Projectiles.clearOrbs(p);
  }
  function gmaxAvailable(p) {
    const f=p&&GMAX[ownerDex(p)],m=f&&G.SPRITE_META[f.id];
    return f&&m&&m.a&&['Idle','Walk','Attack'].every(a=>m.a[a])?f:null;
  }
  function activateMax(p) {
    if(!p || p.specialUnlock!=='dynamax' || p.maxUsed || [888,889,890].includes(ownerDex(p)) || G.Rift.inArena || G.Judgment.active)return false;
    if(p.gmaxChoice && (!gmaxAvailable(p)||gmaxAvailable(p).id!==p.gmaxChoice))return false;
    if(!commit(p,'dynamax'))return false;
    // Collision stays at the original footprint; enlargement is visual only.
    p.maxUsed=true;p.maxTime=18;p.maxPulse=0;p.maxHpBefore=p.maxHp;
    p.maxHp*=1.5;p.hp*=1.5;
    if(p.gmaxChoice){p.maxForm=p.gmaxChoice;const dir=p.anim.dir;p.anim=new G.Sprites.Animator(p.maxForm,1.5,p.shiny);p.anim.dir=dir;G.Sprites.preload([p.maxForm],8000,p.shiny);}
    p.anim.scale=1.5;G.Projectiles.clearOrbs(p);return true;
  }
  function update(dt,p) {
    if(!p)return;
    if(p.teraType&&p.dead)p.teraType=null;
    if(p.maxTime>0){
      if(p.dead||G.Rift.inArena||G.Judgment.active){endMax(p);return;}
      const active=Math.min(dt,p.maxTime),remaining=Math.max(0,p.maxTime-dt);p.maxPulse-=active;
      while(p.maxPulse<=0 && (p.maxPulses||0)<3){
        p.maxPulse+=6;p.maxPulses=(p.maxPulses||0)+1;const m=p.activeMove();
        if(m&&m.kind!=='buff'){
          const g=p.maxForm&&GMAX[ownerDex(p)];
          const label=g&&m.type===g.type?g.move:m.type==='normal'?'Max Strike':m.type==='water'?'Max Geyser':m.type==='fire'?'Max Flare':'Max Move';
          const landed=burst(p,m,1,240,label);
          if(landed&&label==='G-Max Replenish'&&!p.replenished&&p.lumSpent){p.replenished=true;p.cleanseReady=true;p.lumSpent=false;}
          if((m.type==='fire'||m.type==='water')&&(!G.Coop.active||G.Coop.isHost))G.Weather.debugStart(m.type==='fire'?'sun':'rain',12);
        }
      }
      p.maxTime=remaining<1e-8?0:remaining;
      if(p.maxTime<=0)endMax(p);
    }
    if(p.cleanseReady && p.slowT>0){p.slowT=0;p.cleanseReady=false;p.lumSpent=true;G.Spawner.say('Lum Berry cleared the slowdown!',2,true);}
  }
  function hostWeather(dt,players) {
    if(!G.Coop.active||!G.Coop.isHost)return;
    for(const p of players){
      if(!p.net)continue;
      if(!(p.maxTime>0)||p.dead){p.remoteMaxPulses=0;p.remoteMaxWeather=0;continue;}
      p.remoteMaxWeather=(p.remoteMaxWeather||0)-dt;
      if(p.remoteMaxWeather<=0&&(p.remoteMaxPulses||0)<3){
        p.remoteMaxWeather+=6;p.remoteMaxPulses=(p.remoteMaxPulses||0)+1;
        const m=G.Moves.BY_ID[p.net.mv];
        if(m&&(m.type==='fire'||m.type==='water')&&!G.Rift.inArena&&!G.Judgment.active)G.Weather.debugStart(m.type==='fire'?'sun':'rain',12);
      }
    }
  }
  function unlock(p,kind,type) {
    if(p.specialization || p.specialUnlock || p.dead)return false;
    if(!['z','tera','dynamax'].includes(kind) || ((kind==='z'||kind==='tera')&&!validType(type)))return false;
    p.specialUnlock=kind;
    if(kind==='z'){p.zType=type;G.Game.offerItem('z-crystal');}
    if(kind==='tera')p.teraChoice=type;
    return true;
  }
  function rewardChoices(p) {
    if(p.specialization||p.specialUnlock)return [];
    const out=[],forms=G.Mega.available(p);
    if(forms.length)out.push({type:'up',icon:'mega',color:'#e7a4ff',tag:'Specialization',title:'Mega Evolution',desc:'Key Stone and compatible held Mega Stone. Press M. Locks other specializations on activation.',apply:q=>{q.keyStone=true;if(forms.length===1)G.Game.offerItem(forms[0][1].stone);else G.Game.offerReward(forms.map(([id,f])=>({type:'up',icon:'mega',color:'#e7a4ff',tag:'Mega Stone',title:f.name,desc:f.description,apply:r=>G.Game.offerItem(f.stone)})));}});
    const types=[...new Set([...originalTypes(p),...p.moves.filter(m=>m.kind!=='buff').map(m=>m.type)])];
    for(const t of types)out.push({type:'up',icon:p.moves.some(m=>m.type===t)?'move:'+p.moves.find(m=>m.type===t).id:'mega',color:G.U.TYPE_COLOR[t],tag:'Tera Orb',title:'Terastallize: '+t,desc:'Press T: defend as '+t+'; keep original offensive STAB. One specialization per run.',apply:q=>unlock(q,'tera',t)});
    const m=p.activeMove();if(m&&m.kind!=='buff')out.push({type:'up',icon:'move:'+m.id,color:G.U.TYPE_COLOR[m.type],tag:'Z-Crystal',title:'Z-Move: '+m.type,desc:'Hold the matching crystal; press Z once. Six seconds of source DPS shared across nearby targets.',apply:q=>unlock(q,'z',m.type)});
    if(![888,889,890].includes(ownerDex(p)))out.push({type:'up',icon:'heart',color:'#ff6b9d',tag:'Dynamax Band',title:'Dynamax',desc:'Press X once: 18 seconds, +50% HP, +15% move damage and three Max pulses. Original collision footprint.',apply:q=>unlock(q,'dynamax')});
    const g=gmaxAvailable(p);if(g)out.push({type:'up',icon:'heart',color:'#ff6b9d',tag:'Gigantamax Factor',title:g.name,desc:'Press X once: Dynamax with G-Max Replenish. Restores a previously consumed Lum Berry once.',apply:q=>{if(unlock(q,'dynamax'))q.gmaxChoice=g.id;}});
    return out;
  }
  function snapshot(p){return {kind:p.specialization||null,tera:p.teraType||null,max:p.maxTime>0?1:0,gmax:p.maxForm||null};}
  function sync(p,s){
    if(!s||!['mega','z','tera','dynamax',null].includes(s.kind))return;
    p.specialization=s.kind;p.teraType=s.kind==='tera'&&validType(s.tera)?s.tera:null;
    p.maxTime=s.kind==='dynamax'&&s.max?1:0;
    const g=gmaxAvailable(p),next=p.maxTime&&g&&s.gmax===g.id?g.id:null;
    if((p.maxForm||null)!==next){p.maxForm=next;const dir=p.anim.dir;p.anim=new G.Sprites.Animator(next||ownerDex(p),p.maxTime?1.5:1,p.shiny);p.anim.dir=dir;G.Sprites.preload([next||ownerDex(p)],8000,p.shiny);}
    p.anim.scale=p.maxTime?1.5:1;
  }
  function drawForm(ctx,p){
    if(p.dead)return;
    if(p.maxTime>0){ctx.save();ctx.strokeStyle='#ff6b9d';ctx.lineWidth=3;ctx.globalAlpha=.7;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*2.4,p.r*.9,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(p.teraType){
      const x=p.x,y=p.y-p.bodyH-18;ctx.save();ctx.fillStyle=G.U.TYPE_COLOR[p.teraType]||'#8eeaff';ctx.strokeStyle='#eaffff';ctx.lineWidth=1.5;ctx.globalAlpha=.9;
      ctx.beginPath();ctx.moveTo(x,y-9);ctx.lineTo(x+8,y-1);ctx.lineTo(x,y+9);ctx.lineTo(x-8,y-1);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-8,y-1);ctx.lineTo(x+8,y-1);ctx.moveTo(x,y-9);ctx.lineTo(x,y+9);ctx.stroke();ctx.restore();
    }
  }
  function drawHud(ctx,w,h,p,F){
    const text=p.teraType?'Tera: '+p.teraType:p.maxTime>0?(p.maxForm?'Gigantamax':'Dynamax')+' · '+Math.ceil(p.maxTime)+' s':p.specialUnlock==='tera'&&!p.teraUsed?'Tera Orb ready · T':p.specialUnlock==='dynamax'&&!p.maxUsed?'Dynamax ready · X':p.specialUnlock==='z'&&!p.zUsed?'Z-Move ready · Z':p.specialization==='z'?'Z-Move spent':'';
    if(!text)return;ctx.save();ctx.font=F(800,12);ctx.fillStyle='#8eeaff';ctx.strokeStyle='#000';ctx.lineWidth=4;ctx.strokeText(text,18,164);ctx.fillText(text,18,164);ctx.restore();
  }
  G.Items.BY['z-crystal']={id:'z-crystal',name:'Z-Crystal',desc:'Run-specific crystal. Use a matching active move and press Z once. Occupies the held-item slot.',on(){},off(){}};
  return {GMAX,gmaxAvailable,ownerDex,originalTypes,multiplier,reference,activateZ,activateTera,activateMax,endMax,update,hostWeather,unlock,rewardChoices,snapshot,sync,drawForm,drawHud};
})();
