/* Explicit starter evolution routes; run forms never change collection or ranking identity. */
G.Evolution = (() => {
  const ROUTES={1:[2,16],2:[3,32],4:[5,16],5:[6,36],7:[8,16],8:[9,36],152:[153,16],153:[154,32],155:[156,14],156:[157,36],158:[159,18],159:[160,30],252:[253,16],253:[254,36],255:[256,16],256:[257,36],258:[259,16],259:[260,36]};
  function next(p){const r=ROUTES[p.evolvedDex||p.dex];return r&&p.level>=r[1]&&G.DEX_BY[r[0]]&&G.SPRITE_META[r[0]]?r[0]:null;}
  function available(p){return p&&!p.dead&&!p.megaId&&!p.teraType&&!(p.maxTime>0)&&next(p);}
  function activate(p){
    const dex=available(p);if(!dex)return false;
    if(!G.World.isFree(p.x,p.y,G.Sprites.bodyRadius(dex))){G.Spawner.say('Move to open ground before evolving.',2,true);return false;}
    const old=G.DEX_BY[p.evolvedDex||p.dex]||p.mon,mon=G.DEX_BY[dex];
    // Preserve permanent perks, previous stat cards and current health fraction.
    const ratio=p.hp/p.maxHp,delta=Math.max(0,mon.hp-old.hp);
    p.maxHp+=delta;p.hp=p.maxHp*ratio;p.baseAtk+=mon.atk-old.atk;p.baseSpd+=mon.spd-old.spd;
    p.evolvedDex=dex;refresh(p);G.Projectiles.clearOrbs(p);
    G.Spawner.say(mon.name+' evolved! Collection identity is unchanged.',3,true);return true;
  }
  function refresh(p){const d=p.evolvedDex||p.dex,dir=p.anim?p.anim.dir:0;p.anim=new G.Sprites.Animator(d,1,p.shiny);p.anim.dir=dir;p.bodyH=G.Sprites.bodyHeight(d);p.r=G.Sprites.bodyRadius(d);G.Sprites.preload([d],8000,p.shiny);}
  function sync(p,dex){
    let d=p.dex;const seen=new Set();while(ROUTES[d]&&!seen.has(d)){seen.add(d);d=ROUTES[d][0];if(d===dex&&G.SPRITE_META[d]){if(p.evolvedDex!==d){p.evolvedDex=d;refresh(p);}return true;}}
    return false;
  }
  function drawHud(ctx,w,h,p,F){const d=available(p);if(!d)return;ctx.save();ctx.font=F(800,12);ctx.fillStyle='#9dffb6';ctx.fillText('Evolve: '+G.DEX_BY[d].name+' · V',18,182);ctx.restore();}
  return {ROUTES,next,available,activate,sync,drawHud};
})();
