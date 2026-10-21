"use strict";
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');const installDialog=require('./helpers/native-dialog.cjs');
const source=fs.readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8');const tick=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
function fixture(t,config={}) {
 const dom=new JSDOM('',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;installDialog(w);w.HTMLCanvasElement.prototype.getContext=()=>null;w.eval(source);
 const card=w.document.createElement('ha-baby-tracker'),features=Object.fromEntries(['feeding','lactation','diapers','sleep','growth','history','export','panel'].map(k=>[k,{visible:true,read:true,execute:true}]));
 const children=[{entry_id:'a',name:'Alex',date_of_birth:'2025-01-01',capabilities:{revision:0,can_manage:false,features}},{entry_id:'b',name:'Alex',date_of_birth:'2026-02-02',capabilities:{revision:0,can_manage:false,features:structuredClone(features)}}];
 const calls=[];card._hass={states:{},config:{time_zone:'UTC'},locale:{language:'en',time_zone:'server',time_format:'24'},user:{id:'parent',is_admin:false,is_active:true},connection:Object.assign(new w.EventTarget(),{connected:true,subscribeMessage:async()=>()=>{}}),callWS:async r=>{
  calls.push(r);if(r.type==='get_config')return {state:'RUNNING',components:['ha_baby_tracker']};if(r.type==='ha_baby_tracker/list_children')return {children};if(r.type==='ha_baby_tracker/get_data')return {entry_id:r.entry_id,category:r.category,data:[],running_timers:{sleep:null,bf:null}};throw Error('Unexpected '+r.type);
 }};
 card._lang='en';card._backendAvailable=true;card._backendChecked=true;card.babies=structuredClone(children);card.config={show_help:false,show_support:false};w.document.body.append(card);card.setConfig({...card.config,...config});
 t.after(()=>{card.remove();w.close();});return {w,card,calls,children};
}

function native(t){
 const f=fixture(t,{variant:'full',child:'b'}),ha=f.w.document.createElement('home-assistant');ha.attachShadow({mode:'open'});f.w.document.body.append(ha);ha.shadowRoot.append(f.card);
 let owner,stored={foreign:{keep:true},views:[{type:'sections',sections:[{type:'grid',cards:[]}]}]},hook;
 const original=f.card._hass.callWS;f.card._hass={...f.card._hass,user:{id:'admin',is_admin:true,is_active:true},panels:{lovelace:{config:{mode:'storage'}}},callWS:async r=>{
  if(!r.type.startsWith('lovelace/'))return original(r);f.calls.push(r);if(hook){const value=hook(r);if(value!==undefined)return value;}
  if(r.type==='lovelace/dashboards/list')return [];if(r.type==='lovelace/config')return structuredClone(stored);if(r.type==='lovelace/config/save'){stored=structuredClone(r.config);return null;}throw Error('Unexpected '+r.type);
 }};ha.provideHass=()=>{};ha.addEventListener('show-dialog',e=>{const d=e.detail;owner ||= f.w.document.createElement(d.dialogTag);owner.hass=f.card._hass;owner.showDialog(d.dialogParams);if(!owner.isConnected)ha.shadowRoot.append(owner);});f.card.renderCard();
 const q=s=>owner?.querySelector(s),saves=()=>f.calls.filter(r=>r.type==='lovelace/config/save');
 const open=async()=>{f.card.shadowRoot.querySelector('[data-baby-dashboard-add]').click();await tick();assert.ok(q('[data-dashboard]'));q('[data-dashboard]').value='0';q('[data-dashboard]').dispatchEvent(new f.w.Event('change'));await tick();assert.equal(q('[data-add]').disabled,false);};
 t.after(()=>{owner?.closeDialog();ha.remove();});return {...f,q,open,saves,get owner(){return owner;},get stored(){return stored;},set stored(v){stored=v;},set hook(v){hook=v;}};
}
test('actual Baby native placement survives own save remount and preserves exact Undo',async t=>{
 const f=native(t),before=structuredClone(f.stored);await f.open();let done;const ack=new Promise(r=>done=r);t.after(()=>done(null));f.hook=r=>{if(r.type==='lovelace/config/save'){f.stored=structuredClone(r.config);f.card.remove();return ack;}};
 f.q('[data-add]').click();await tick();assert.equal(f.saves().length,1);assert.ok(f.q('dialog[open]'),'native owner retains the live transaction');done(null);await tick();assert.equal(f.q('[data-undo]').disabled,false);f.hook=null;f.q('[data-undo]').click();await tick();assert.equal(f.saves().length,2);assert.deepEqual(f.stored,before);
});
test('native placement shares no custom-element controller with previously loaded Energy',async t=>{
 const f=native(t);f.w.customElements.define('ha-tools-dashboard-placement-dialog-v53',class extends f.w.HTMLElement{showDialog(){throw Error('Foreign Energy controller used');}});await f.open();assert.equal(f.owner.localName,'ha-tools-baby-dashboard-placement-dialog-v53');assert.equal(f.q('[data-preview]').firstElementChild.tagName,'HA-BABY-TRACKER');assert.equal(f.q('[data-preview]').firstElementChild.preview,true);assert.equal(f.saves().length,0);
});
test('actual native lost ACK reconciles once and refuses Undo over a foreign edit',async t=>{
 const f=native(t);await f.open();f.hook=r=>{if(r.type==='lovelace/config/save'){f.stored=structuredClone(r.config);f.card.remove();return Promise.reject(Error('lost ACK'));}};f.q('[data-add]').click();await tick();assert.equal(f.saves().length,1);assert.equal(f.q('[data-undo]').disabled,false);f.stored={...f.stored,foreignEdit:true};f.hook=null;f.q('[data-undo]').click();await tick();assert.equal(f.saves().length,1);assert.equal(f.stored.foreignEdit,true);assert.match(f.q('[role=status]').textContent,/changed/i);
});
test('preview detach without a sent transaction closes the native dialog',async t=>{const f=native(t);await f.open();f.card.remove();await tick();assert.equal(f.q('dialog[open]'),null);assert.equal(f.saves().length,0);});
for(const edge of ['role','user','connection','offline','route'])test('native Baby placement purges transient backup after '+edge,async t=>{
 const f=native(t);await f.open();f.hook=r=>{if(r.type==='lovelace/config/save'){f.stored=structuredClone(r.config);f.card.remove();return Promise.resolve(null);}};f.q('[data-add]').click();await tick();assert.equal(f.q('[data-undo]').disabled,false);const count=f.calls.length;
 if(edge==='offline')f.card._hass.connection.dispatchEvent(new f.w.Event('disconnected'));
 else if(edge==='route'){f.w.history.pushState(null,'','/other');f.w.dispatchEvent(new f.w.Event('location-changed'));}
 else{const h={...f.card._hass,user:{...f.card._hass.user}};if(edge==='role')h.user.is_admin=false;if(edge==='user')h.user.id='replacement';if(edge==='connection')h.connection={connected:true};f.owner.hass=h;}
 await tick();assert.equal(f.q('dialog[open]'),null);assert.equal(f.calls.length,count);
});
