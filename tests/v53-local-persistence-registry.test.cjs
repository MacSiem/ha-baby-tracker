const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {JSDOM}=require('jsdom');
const source=readFileSync(join(__dirname,'../custom_components/ha_baby_tracker/www/ha-baby-tracker.js'),'utf8');
const categories=['feeding','lactation','diapers','sleep','growth'];
function fixture(){
 const dom=new JSDOM('',{runScripts:'dangerously',url:'http://synthetic.invalid/'});dom.window.eval(source);
 const card=dom.window.document.createElement('ha-baby-tracker');card.renderCard=()=>{};card.updateAllDisplays=()=>{};
 card.setDefaultTimes=()=>{};card._backendAvailable=false;card._backendChecked=true;
 return {dom,card,close(){dom.window.close()}};
}
for(const name of ['__proto__','constructor','toString']) {
 test(`local saved categories survive persist and reload for legal child name ${name}`,()=>{
  const f=fixture();try{
   const {card}=f;card.babies=[{name}];card.selectedBaby=0;card._saveChildren();card.initializeDataStructures();
   for(const category of categories)card[category+'Data'].set(name,[{id:'saved-'+category,notes:'retained '+category,timestamp:1791806400000}]);
   assert.equal(card._saveData(),true);
   const saved=JSON.parse(f.dom.window.localStorage.getItem(card._storageKey()));
   for(const category of categories){assert.equal(Object.hasOwn(saved[category],name),true,category+' must own the real name');assert.equal(saved[category][name][0].id,'saved-'+category)}
   const restored=f.dom.window.document.createElement('ha-baby-tracker');restored._backendAvailable=false;restored.selectedBaby=0;restored.babies=[{name}];restored.initializeDataStructures();
   for(const category of categories)assert.deepEqual(JSON.parse(JSON.stringify(restored[category+'Data'].get(name))),saved[category][name]);
   assert.equal(Object.prototype.retained,undefined);
  }finally{f.close()}
 });
}
test('normal diaper entry for a literal reserved name is durable after the form reports success',async()=>{
 const f=fixture();try{
  const {card}=f;card.shadowRoot.innerHTML='<input class="child-name-input" data-child-idx="0" value="__proto__">';card._saveChildNames();card.initializeDataStructures();
  const messages=[];card._showToast=(...args)=>messages.push(args);
  card.shadowRoot.innerHTML='<select id="diapersType"><option value="wet">Wet</option></select><input id="diapersTime" value="12:00"><textarea id="diapersNotes">literal child</textarea>';
  await card.addDiapers();
  assert.equal(messages.length,0);const saved=JSON.parse(f.dom.window.localStorage.getItem(card._storageKey()));
  assert.equal(Object.hasOwn(saved.diapers,'__proto__'),true);assert.equal(saved.diapers['__proto__'].length,1);assert.equal(saved.diapers['__proto__'][0].notes,'literal child');
  assert.equal(card.shadowRoot.getElementById('diapersNotes').value,'');
 }finally{f.close()}
});
test('reloading the script preserves one own picker registration and every foreign entry',()=>{
 const f=fixture();try{
  const foreign={type:'foreign-card',name:'Keep this',custom:{literal:true}};f.dom.window.customCards.unshift(foreign);
  const registered=f.dom.window.customCards.find(item=>item.type==='ha-baby-tracker');const ctor=f.dom.window.customElements.get('ha-baby-tracker');
  f.dom.window.eval(source);f.dom.window.eval(source);
  assert.equal(f.dom.window.customCards.filter(item=>item.type==='ha-baby-tracker').length,1);
  assert.equal(f.dom.window.customCards.find(item=>item.type==='ha-baby-tracker'),registered);assert.equal(f.dom.window.customCards[0],foreign);
  assert.equal(f.dom.window.customElements.get('ha-baby-tracker'),ctor);assert.equal(f.card instanceof ctor,true);
 }finally{f.close()}
});
