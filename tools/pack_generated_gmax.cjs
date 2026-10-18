// Technical atlas import only: preserve the artwork, split cells and downsample with nearest-neighbor.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const root=path.resolve(__dirname,'..');
const sources=process.argv.slice(2);if(sources.length<1||sources.length>2)throw Error('Usage: node tools/pack_generated_gmax.cjs normal-atlas.png [shiny-atlas.png]');
const poses={Idle:[0],Walk:[1,2],Attack:[3],Shoot:[4],Charge:[5],Hurt:[6],Faint:[7]};
const times={Idle:[30],Walk:[10,10],Attack:[12],Shoot:[12],Charge:[16],Hurt:[10],Faint:[30]};
(async()=>{
 const metadata={s:2,sh:sources.length===2?1:0,a:{}};
 for(let variant=0;variant<sources.length;variant++){
  const src=sources[variant];const info=await sharp(src).metadata();if(!info.hasAlpha)throw Error('Atlas must retain transparency');
  const grid=await sharp(src).resize(1280,1280,{kernel:'nearest',fit:'fill'}).png().toBuffer();
  const destination=path.join(root,'assets/pokemon/gmax-snorlax',variant?'s':'');
  fs.mkdirSync(destination,{recursive:true});
  for(const [name,cols] of Object.entries(poses)){
   const cells=[];
   for(let row=0;row<8;row++)for(let i=0;i<cols.length;i++){
    const buffer=await sharp(grid).extract({left:cols[i]*160,top:row*160,width:160,height:160}).resize(40,40,{kernel:'nearest'}).png().toBuffer();
    cells.push({input:buffer,left:i*40,top:row*40});
   }
   await sharp({create:{width:cols.length*40,height:320,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).png({palette:true,colours:64,dither:0}).toFile(path.join(destination,name+'.png'));
   metadata.a[name]={w:40,h:40,n:cols.length,r:8,d:times[name],ax:20,ay:35};
  }
 }
 fs.writeFileSync(path.join(root,'js/data/generated-gmax-sprites.js'),'/* Generated Gigantamax Snorlax artwork; frame geometry from tools/pack_generated_gmax.cjs. */\nG.SPRITE_META["gmax-snorlax"] = '+JSON.stringify(metadata)+';\n');
 console.log('Packed normal/shiny Gigantamax Snorlax: 8 directions, 7 states, 2 walking frames, alpha preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
