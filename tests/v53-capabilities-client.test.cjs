'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require('jsdom');
const installDialogHarness=require('./helpers/native-dialog.cjs');
const source=readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8');
function capabilities(overrides={}){
 const features=Object.fromEntries(['feeding','lactation','diapers','sleep','growth','history','export'].map(name=>[name,{visible:true,read:true,execute:true,...overrides[name]}]));
 return {revision:3,can_manage:false,features};
}
function fixture(children,handler){
 const dom=new JSDOM('',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
 installDialogHarness(dom.window);dom.window.HTMLCanvasElement.prototype.getContext=()=>null;dom.window.eval(source);
 const card=dom.window.document.createElement('ha-baby-tracker');card.config={};card._lang='en';
 const calls=[];let listener;const connection={connected:true,subscribeMessage:async(callback)=>{listener=callback;return ()=>{};}};
 card._hass={states:{},user:{id:'parent',is_admin:false,is_active:true},connection,config:{time_zone:'UTC'},callWS:async request=>{
  calls.push(request);
  if(request.type==='get_config')return {state:'RUNNING',components:['ha_baby_tracker']};
  if(request.type==='ha_baby_tracker/list_children')return {children:typeof children==='function'?await children():children};
  if(handler)return handler(request);
  return {entry_id:request.entry_id,category:request.category,data:[],running_timers:{sleep:null,bf:null}};
 }};
 return {dom,card,calls,event(data){listener({data});},close(){card.remove();dom.window.close();}};
}
const child=(entry_id,cap=capabilities())=>({entry_id,name:'Alex',capabilities:cap});

test('discovery retains per-child capability facts and the selected stable identity after duplicate-name reorder',async()=>{
 const rows=[child('b'),child('a')],f=fixture(rows);
 try{
  f.card.babies=[child('a'),child('b')];f.card.selectedBaby=0;
  await f.card._ensureBackend();
  assert.equal(f.card.getCurrentBaby(),'a');
  assert.equal(f.card.babies[1].capabilities.revision,3);
  assert.equal(f.card.babies[1].capabilities.can_manage,false);
  rows[1].capabilities.features.feeding.read=false;
  assert.equal(f.card.babies[1].capabilities.features.feeding.read,true,'retain a detached authorization snapshot');
 }finally{f.close();}
});

test('restricted reads skip denied categories, purge their old facts and retain independently allowed readings',async()=>{
 const cap=capabilities({feeding:{read:false},lactation:{read:false},sleep:{read:false},growth:{read:false}});
 const f=fixture([child('a',cap)],r=>{
  if(r.type==='ha_baby_tracker/get_data'&&r.category!=='diapers')throw {code:'unauthorized'};
  return {entry_id:'a',category:'diapers',data:[{id:'wet',type:'wet',timestamp:1}],running_timers:{sleep:null,bf:null}};
 });
 try{
  f.card.feedingData.set('a',[{id:'private-old',amount:150}]);
  await f.card._ensureBackend();
  assert.deepEqual(f.calls.filter(r=>r.type==='ha_baby_tracker/get_data').map(r=>r.category),['diapers']);
  assert.equal(f.card.feedingData.get('a')?.length||0,0);
  assert.equal(f.card.diapersData.get('a')[0].id,'wet');assert.equal(f.card._historyLoadFailed,false);
 }finally{f.close();}
});

test('a confirmed empty visible-child list cannot expose or save a fabricated local Baby 1',async()=>{
 const f=fixture([]);try{
  const before=f.dom.window.localStorage.getItem('ha-tools-baby-tracker-0');await f.card._ensureBackend();
  assert.equal(f.card.babies.length,0);assert.equal(f.card._backendAvailable,true);
  assert.match(f.card.shadowRoot.textContent,/no.*child|no.*access/i);assert.doesNotMatch(f.card.shadowRoot.textContent,/Baby 1/);
  assert.equal(await f.card._saveEntries([{category:'feeding',entry:{amount:100}}]),false);
  assert.equal(f.dom.window.localStorage.getItem('ha-tools-baby-tracker-0'),before);
  assert.equal(f.calls.filter(r=>r.type==='ha_baby_tracker/add_entries'||r.type==='ha_baby_tracker/get_data').length,0);
 }finally{f.close();}
});

test('policy invalidation refreshes discovery before any category read and removes revoked child facts',async()=>{
 let rows=[child('a')];const f=fixture(()=>rows);try{
  await f.card._ensureBackend();f.card.feedingData.set('a',[{id:'private-old',amount:150}]);f.calls.length=0;rows=[];
  f.event({category:'access_policy'});
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(f.card.babies.length,0);assert.equal(f.card.feedingData.get('a')?.length||0,0);
  assert.equal(f.calls.filter(r=>r.type==='ha_baby_tracker/list_children').length,1);
  assert.equal(f.calls.filter(r=>r.type==='ha_baby_tracker/get_data').length,0);
 }finally{f.close();}
});

test('an old discovery response cannot install children after the actual HA identity changed',async()=>{
 let release;const wait=new Promise(resolve=>release=resolve);const f=fixture(()=>wait);
 try{
  const pending=f.card._ensureBackend();await Promise.resolve();await Promise.resolve();
  f.card.hass={...f.card._hass,user:{id:'other',is_admin:false,is_active:true},callWS:async r=>r.type==='get_config'?{state:'RUNNING',components:['ha_baby_tracker']}:{children:[]}};
  release([child('private-old-child')]);await pending;for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(f.card.babies.some(c=>c.entry_id==='private-old-child'),false);
  assert.equal(f.card.feedingData.has('private-old-child'),false);
 }finally{f.close();}
});

test('execute-only command receipts confirm success without adding a redacted record to readable history',async()=>{
 const cap=capabilities({feeding:{read:false,execute:true}});const f=fixture([child('a',cap)],r=>{
  if(r.type==='ha_baby_tracker/add_entries')return {entry_id:'a',entries:[{category:'feeding',entry:{id:'new',redacted:true}}]};
  return {entry_id:'a',category:r.category,data:[],running_timers:{sleep:null,bf:null}};
 });try{
  await f.card._ensureBackend();assert.equal(await f.card._saveEntries([{category:'feeding',entry:{amount:100}}]),true);
  assert.equal(f.card.feedingData.get('a')?.length||0,0);
 }finally{f.close();}
});

test('a locally disabled execute capability blocks direct action dispatch as well as its control',async()=>{
 const f=fixture([child('a',capabilities({feeding:{execute:false}}))]);try{
  await f.card._ensureBackend();f.calls.length=0;
  assert.equal(await f.card._saveEntries([{category:'feeding',entry:{amount:100}}]),false);
  assert.equal(f.calls.filter(r=>r.type==='ha_baby_tracker/add_entries').length,0);
 }finally{f.close();}
});
