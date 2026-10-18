const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('English remains selected with a Spanish browser, old saved Spanish preference and a non-English path',()=>{
 const ctx={G:{},localStorage:{getItem:()=> 'es'},location:{pathname:'/'},navigator:{languages:['es-ES'],language:'es-ES'},document:{documentElement:{}},CanvasRenderingContext2D:class {},window:{confirm(){},alert(){}}};
 for(const name of ['fillText','strokeText','measureText'])ctx.CanvasRenderingContext2D.prototype[name]=()=>{};
 vm.createContext(ctx);for(const file of ['js/core/i18n.js','js/data/lang-en.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
 assert.equal(ctx.G.I18n.lang,'en');assert.equal(ctx.document.documentElement.lang,'en');assert.equal(ctx.G.T('Volver'),'Back');
 assert.equal(ctx.G.T('Damage breakdown · HP removed'),'Damage breakdown · HP removed');
});
