const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const TABS=['feeding','lactation','diapers','sleep','growth','history','config'];
function fixture(){
 const dom=new JSDOM('<body><button id="outside">Outside</button></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://synthetic.invalid/',virtualConsole:new VirtualConsole()});
 dom.window.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},fillText(){},measureText(){return {width:8}}};};
 const observers=[];dom.window.ResizeObserver=class{constructor(callback){this.callback=callback;this.targets=new Set();observers.push(this);}observe(target){this.targets.add(target)}disconnect(){this.targets.clear()}};
 dom.window.eval(fs.readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8'));
 const card=dom.window.document.createElement('ha-baby-tracker'),calls=[];
 card.config={show_support:false};card._lang='en';card._backendAvailable=false;card._backendChecked=true;
 card._hass={language:'en',user:{id:'synthetic-admin',is_admin:true,is_active:true},config:{time_zone:'Europe/Warsaw'},themes:{},states:{},callWS:async m=>{calls.push(m);return {}}};
 card.babies=[{name:'Synthetic A'},{name:'Synthetic B'}];card.selectedBaby=0;card.selectedTab='feeding';card.initializeDataStructures();dom.window.document.body.append(card);card.renderCard();
 const picker=()=>card.shadowRoot.querySelector('[data-baby-family-picker]');
 const resize=width=>{const nav=card.shadowRoot.querySelector('.tabs'),target=nav.parentElement,observer=observers.find(o=>o.targets.has(target));assert.ok(observer,'actual nav parent observed');observer.callback([{target,contentRect:{width}}]);};
 const choose=value=>{const p=picker();p.value=value;p.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 return {dom,card,calls,observers,picker,resize,choose,close(){card.remove();dom.window.close()}};
}
test('complete seven-tab picker invokes original handlers, panes, URL and local data paths',()=>{
 const f=fixture();try{
  assert.ok(f.picker());assert.equal(f.picker().labels.length,1);assert.deepEqual([...f.picker().options].map(o=>o.value),TABS);
  const dataBefore=JSON.stringify([...f.card.feedingData]);
  for(const value of TABS){f.choose(value);assert.equal(f.card.selectedTab,value);assert.equal(f.picker().value,value);assert.equal(f.card.shadowRoot.getElementById(value+'-tab').style.display,'block');assert.ok(f.dom.window.location.hash.endsWith('/'+value));}
  assert.equal(JSON.stringify([...f.card.feedingData]),dataBefore);assert.equal(f.calls.length,0);
 }finally{f.close()}
});
test('native tabs and picker exchange keyboard focus without losing manual input or its caret',()=>{
 const f=fixture();try{
  f.card.shadowRoot.querySelector('[data-tab=feeding]').focus();f.resize(250);assert.equal(f.card.shadowRoot.activeElement,f.picker());assert.equal(f.card.shadowRoot.querySelector('.tabs').hidden,true);
  f.resize(900);assert.equal(f.card.shadowRoot.activeElement.dataset.tab,'feeding');
  const field=f.card.shadowRoot.getElementById('feedingNotes');field.value='unsubmitted feeding note';field.focus();field.setSelectionRange(2,9,'backward');
  f.resize(250);f.resize(900);assert.equal(f.card.shadowRoot.getElementById('feedingNotes'),field);assert.equal(field.selectionStart,2);
  f.card._lang='pl';f.card._hass.language='pl';f.card.renderCard();const next=f.card.shadowRoot.getElementById('feedingNotes');assert.equal(next.value,'unsubmitted feeding note');assert.equal(f.card.shadowRoot.activeElement,next);assert.equal(next.selectionStart,2);assert.equal(next.selectionEnd,9);assert.equal(next.selectionDirection,'backward');
  assert.equal(f.calls.length,0);assert.equal(f.picker().labels[0].textContent,'Zakładka');
 }finally{f.close()}
});
test('manual dates stay literal on same-child locale rerender and drafts never cross into another child',()=>{
 const f=fixture();try{
  f.card.shadowRoot.getElementById('sleepFromTime').value='2026-01-02T03:04';f.card.shadowRoot.getElementById('sleepToTime').value='2026-01-02T05:06';
  f.card.shadowRoot.getElementById('feedingNotes').value='private draft for A';f.card._lang='pl';f.card.renderCard();
  assert.equal(f.card.shadowRoot.getElementById('sleepFromTime').value,'2026-01-02T03:04');assert.equal(f.card.shadowRoot.getElementById('sleepToTime').value,'2026-01-02T05:06');
  f.card._selectBaby(1);assert.equal(f.card.selectedBaby,1);assert.equal(f.card.shadowRoot.getElementById('feedingNotes').value,'');assert.equal(f.calls.length,0);
 }finally{f.close()}
});
test('different user cannot inherit a typed form draft during an ordinary card rerender',()=>{
 const f=fixture();try{f.card.shadowRoot.getElementById('feedingNotes').value='private unsubmitted note';f.card._hass.user.id='different-user';f.card._lang='pl';f.card.renderCard();assert.equal(f.card.shadowRoot.getElementById('feedingNotes').value,'');}finally{f.close()}
});
test('picker options and observers remain current after locale rerender and actual detach',()=>{
 const f=fixture();try{f.resize(250);f.picker().focus();f.card._lang='pl';f.card.renderCard();assert.equal(f.card.shadowRoot.activeElement,f.picker());assert.deepEqual([...f.picker().options].map(o=>o.textContent),[...f.card.shadowRoot.querySelectorAll('.tab-button[data-tab]')].map(b=>b.textContent.trim()));
  f.dom.window.document.getElementById('outside').focus();f.card._lang='en';f.card.renderCard();assert.equal(f.dom.window.document.activeElement.id,'outside');
 }finally{f.card.remove();assert.equal(f.observers.some(o=>o.targets.size),false);f.dom.window.close()}
});
