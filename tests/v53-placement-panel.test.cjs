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
test('full administrator has a persistent placement footer with a selected variant and stable child',async t=>{
 const f=fixture(t,{variant:'full',child:'b'});f.card._hass.user.is_admin=true;f.card.renderCard();
 const footer=f.card.shadowRoot.querySelector('[data-baby-dashboard-footer]');assert.ok(footer);assert.ok(footer.querySelector('[data-baby-dashboard-add]'));assert.equal(footer.querySelector('[data-baby-dashboard-variant]').value,'compact');
 const unknown={retained:true};f.card.config.future_key=unknown;assert.equal(f.card._placementConfigV53().child,'b');assert.equal(f.card._placementConfigV53().variant,'compact');assert.deepEqual(f.card._placementConfigV53().future_key,unknown);
 footer.querySelector('[data-baby-dashboard-variant]').value='tile';assert.equal(f.card._placementConfigV53().variant,'tile');
 f.card._lastHtml='';f.card.renderCard();assert.ok(f.card.shadowRoot.querySelector('[data-baby-dashboard-footer]'));
 f.card._hass.user.is_admin=false;f.card.renderCard();assert.equal(f.card.shadowRoot.querySelector('[data-baby-dashboard-footer]'),null);
});
test('placement preview is read only even against direct entry and migration handlers',async t=>{
 const f=fixture(t,{variant:'full',child:'a'});f.card.preview=true;f.card._hass.user.is_admin=true;f.card.renderCard();f.calls.length=0;
 assert.equal(f.card._featureAllowedV53('feeding','execute'),false);assert.equal(await f.card._saveEntries([{category:'feeding',entry:{amount:123}}]),false);
 await f.card._promptLocalMigration(true);assert.equal(f.calls.some(r=>/save|add_|migrate|set_/.test(r.type)),false);assert.equal(f.card.shadowRoot.querySelector('[data-baby-dashboard-footer]'),null);
});
test('native sidebar filters panel-hidden children before any category read, including an administrator',async t=>{
 const f=fixture(t);f.card.panel={config:{}};f.card._hass.user.is_admin=true;f.children[0].capabilities.features.panel.visible=false;f.children[0].capabilities.can_manage=true;f.children[1].capabilities.features.panel.visible=true;
 f.card._backendChecked=false;await f.card._ensureBackend();assert.deepEqual(Array.from(f.card.babies,c=>c.entry_id),['b']);
 assert.ok(f.calls.find(r=>r.type==='ha_baby_tracker/list_children'&&r.purpose==='panel'));assert.equal(f.calls.some(r=>r.type==='ha_baby_tracker/get_data'&&r.entry_id==='a'),false);
});
test('panel denial never falls back to browser data or a fictional child',async t=>{
 const f=fixture(t);f.card.panel={config:{}};for(const c of f.children)c.capabilities.features.panel.visible=false;
 f.card._backendChecked=false;await f.card._ensureBackend();assert.equal(f.card.babies.length,0);assert.match(f.card.shadowRoot.textContent,/No children available/);assert.doesNotMatch(f.card.shadowRoot.textContent,/Baby 1|Alex/);
 assert.equal(f.calls.filter(r=>r.type==='ha_baby_tracker/get_data').length,0);
});

test('native controls follow the HA theme instead of the operating system',t=>{
 const f=fixture(t),editor=f.w.document.createElement('ha-baby-tracker-editor');f.w.document.body.append(editor);t.after(()=>editor.remove());editor.setConfig({variant:'compact'});
 const dark={...f.card._hass,themes:{darkMode:true}};f.card.hass=dark;editor.hass=dark;assert.equal(f.card.style.colorScheme,'dark');assert.equal(editor.style.colorScheme,'dark');
 const light={...dark,themes:{darkMode:false}};f.card.hass=light;editor.hass=light;assert.equal(f.card.style.colorScheme,'light');assert.equal(editor.style.colorScheme,'light');
});
