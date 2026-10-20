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

test('child buttons remain outside collapsible navigation and record controls have native labels',()=>{
 const f=fixture();try{f.resize(250);const nav=f.card.shadowRoot.querySelector('.tabs');assert.equal([...f.card.shadowRoot.querySelectorAll('.baby-btn')].every(b=>!nav.contains(b)),true);
  for(const id of ['feedingType','feedingTime','feedingAmount','feedingNotes','lactationSide','lactationDuration','diapersType','diapersTime','sleepFromTime','sleepToTime','growthType','growthValue','growthDate'])assert.equal(f.card.shadowRoot.getElementById(id).labels.length,1,id);
 }finally{f.close()}
});
test('identity changes invalidate the DOM cache even when language and generated text stay identical',()=>{
 const f=fixture();try{const root=f.card.shadowRoot;root.getElementById('feedingNotes').value='private draft';f.card._hass.user.id='another-user';f.card.renderCard();assert.equal(root.getElementById('feedingNotes').value,'');
  root.getElementById('feedingNotes').value='draft in old zone';f.card._hass.config.time_zone='Asia/Kathmandu';f.card.renderCard();assert.equal(root.getElementById('feedingNotes').value,'');
 }finally{f.close()}
});
test('a cleared form and reset history filters stay cleared through a same-context rerender',()=>{
 const f=fixture();try{f.card.shadowRoot.getElementById('feedingNotes').value='draft';f.card.shadowRoot.getElementById('clearFeedingBtn').click();f.choose('history');const from=f.card.shadowRoot.getElementById('historyFrom');from.value='2026-01-01';from.dispatchEvent(new f.dom.window.Event('change'));f.card.shadowRoot.getElementById('historyReset').click();f.card._lang='pl';f.card.renderCard();assert.equal(f.card.shadowRoot.getElementById('feedingNotes').value,'');assert.equal(f.card.shadowRoot.getElementById('historyFrom').value,'');assert.equal(f.card._getHistoryState().from,'');assert.equal(f.calls.length,0);}finally{f.close()}
});

test('sleep records distinguish missing duration from a recorded zero without mutating stored rows',()=>{
 const f=fixture();try{const day=f.card._localDateTimeInput(new f.dom.window.Date()).slice(0,10),durations=[undefined,null,'',false,'bad',-1,0,'20'];const rows=durations.map(duration=>({date:day,duration}));f.card.sleepData.set('Synthetic A',rows);const before=JSON.stringify(rows);f.card.updateSleepList();const root=f.card.shadowRoot;assert.doesNotMatch(root.getElementById('sleepList').textContent,/NaN/);assert.match(root.getElementById('sleepList').textContent,/Missing duration/);assert.match(root.getElementById('sleepList').textContent,/0h 0m/);assert.equal(root.getElementById('totalSleep').textContent,'0h 20m · Missing duration: 6');assert.equal(JSON.stringify(rows),before);
  f.card.sleepData.set('Synthetic A',[{date:day,duration:null}]);f.card.updateSleepList();assert.equal(root.getElementById('totalSleep').textContent,'— · Missing duration: 1');f.card._lang='pl';f.card.updateSleepList();assert.equal(root.getElementById('totalSleep').textContent,'— · Brak czasu snu: 1');
 }finally{f.close()}
});

test('native child chooser preserves focus without transferring the previous child draft',()=>{
 const f=fixture();try{
  f.card.shadowRoot.getElementById('feedingNotes').value='unsubmitted A only';
  let chooser=f.card.shadowRoot.getElementById('babySelect');chooser.focus();chooser.value=chooser.options[1].value;chooser.dispatchEvent(new f.dom.window.Event('change',{bubbles:true}));
  assert.equal(f.card.selectedBaby,1);assert.equal(f.card.shadowRoot.activeElement,f.card.shadowRoot.getElementById('babySelect'));
  assert.equal(f.card.shadowRoot.getElementById('feedingNotes').value,'');assert.equal(f.calls.length,0);
  f.card._lang='pl';f.card.renderCard();assert.equal(f.card.shadowRoot.activeElement,f.card.shadowRoot.getElementById('babySelect'));
  const outside=f.dom.window.document.getElementById('outside');outside.focus();f.card._lang='en';f.card.renderCard();assert.equal(f.dom.window.document.activeElement,outside);
 }finally{f.close()}
});
test('native child chooser refresh preserves focus, selection and every available child',()=>{
 const f=fixture();try{
  f.card.shadowRoot.getElementById('babySelect').focus();
  f.card.babies.splice(1,0,{name:'Inserted child'});f.card._lang='pl';f.card.renderCard();
  const chooser=f.card.shadowRoot.getElementById('babySelect');assert.equal(f.card.shadowRoot.activeElement,chooser);
  assert.equal(chooser.selectedOptions[0].textContent,'Synthetic A');
  assert.deepEqual([...chooser.options].map(x=>x.textContent),['Synthetic A','Inserted child','Synthetic B']);
 }finally{f.close()}
});
test('programmatic child changes do not steal external focus or transfer typed drafts',()=>{
 const f=fixture();try{const outside=f.dom.window.document.getElementById('outside');f.card.shadowRoot.getElementById('feedingNotes').value='A draft';outside.focus();f.card._selectBaby(1);assert.equal(f.dom.window.document.activeElement,outside);assert.equal(f.card.shadowRoot.getElementById('feedingNotes').value,'');}finally{f.close()}
});
