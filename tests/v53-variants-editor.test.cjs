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
test('existing absent variant remains full; legacy compact and new compact stub are explicit',t=>{
 const f=fixture(t);assert.ok(f.card.shadowRoot.getElementById('feeding-tab'));assert.equal(f.card._variantV53(),'full');
 f.card.setConfig({compact:true});assert.equal(f.card._variantV53(),'compact');assert.equal(f.card.shadowRoot.querySelector('.tabs'),null);
 const stub=f.w.customElements.get('ha-baby-tracker').getStubConfig();assert.equal(stub.variant,'compact');assert.equal(stub.babies,undefined);
});
test('tile binds the configured stable entry even for duplicate names and uses one-row grid hints',t=>{
 const f=fixture(t,{variant:'tile',child:'b'});assert.equal(f.card.getCurrentBaby(),'b');assert.equal(f.card.shadowRoot.querySelector('ha-card').dataset.babyVariant,'tile');
 assert.equal(f.card.getGridOptions().columns,6);assert.equal(f.card.getGridOptions().rows,1);assert.equal(f.card.getGridOptions().min_columns,6);
 const opener=f.card.shadowRoot.querySelector('[data-baby-open]');assert.equal(opener.tagName,'BUTTON');assert.match(opener.getAttribute('aria-label'),/Alex/);assert.equal(f.card.shadowRoot.querySelector('.tabs'),null);
});
test('an unavailable configured child cannot fall back to another child or an enabled record action',t=>{
 const f=fixture(t,{variant:'compact',child:'missing'});assert.equal(f.card._currentBackendEntryId(),null);assert.match(f.card.shadowRoot.textContent,/unavailable|not available/i);assert.equal(f.card.shadowRoot.querySelector('[data-baby-quick]'),null);assert.equal(f.calls.length,0);
});
test('compact has one child, permitted canonical facts, three actions and no hidden full forms',t=>{
 const f=fixture(t,{variant:'compact',child:'a'});f.card.feedingData.set('a',[{timestamp:Date.now()-600000,type:'bottle',amount:120}]);f.card._lastSmallStructureV53=null;f.card.renderCard();
 const root=f.card.shadowRoot;assert.equal(root.querySelector('[data-baby-variant]').dataset.babyVariant,'compact');assert.equal(root.querySelectorAll('[data-baby-quick]').length,3);assert.equal(root.querySelectorAll('[data-baby-quick].btn-primary').length,1);
 assert.match(root.textContent,/120/);for(const selector of ['.tabs','#tip-banner','#config-tab','#feeding-tab','#children-list'])assert.equal(root.querySelector(selector),null);
 assert.equal(f.card.getGridOptions().rows,4);assert.equal(f.card.getGridOptions().columns,6);
});
test('compact quick entry opens the existing full diary and writes nothing until the user saves',async t=>{
 const f=fixture(t,{variant:'compact',child:'b'}),button=f.card.shadowRoot.querySelector('[data-baby-quick="feeding"]');assert.ok(button);button.focus();button.click();await tick();
 const dialog=f.w.document.querySelector('dialog[data-baby-diary]');assert.ok(dialog);assert.equal(dialog.matches(':modal'),true);const full=dialog.querySelector('ha-baby-tracker');assert.ok(full);assert.equal(full.config.variant,'full');assert.equal(full.config.child,'b');assert.equal(full.selectedTab,'feeding');assert.equal(full.getCurrentBaby(),'b');assert.equal(f.calls.some(r=>/add_|timer_|save|set_/.test(r.type)),false);
 dialog.querySelector('[data-baby-close]').click();assert.equal(f.w.document.querySelector('dialog[data-baby-diary]'),null);assert.equal(f.card.shadowRoot.activeElement,button);
});
test('small variants respect independent visibility, read and execute permissions',t=>{
 const f=fixture(t,{variant:'compact',child:'a'});Object.assign(f.card.babies[0].capabilities.features.feeding,{read:false,execute:false});f.card.babies[0].capabilities.features.diapers.visible=false;f.card.feedingData.set('a',[{timestamp:Date.now(),type:'bottle',amount:987654321}]);f.card.renderCard();
 assert.doesNotMatch(f.card.shadowRoot.textContent,/987654321/);assert.match(f.card.shadowRoot.textContent,/permission|access/i);assert.equal(f.card.shadowRoot.querySelector('[data-baby-quick="feeding"]').disabled,true);assert.equal(f.card.shadowRoot.querySelector('[data-baby-quick="diapers"]'),null);
});
test('configured full tabs/default and help visibility apply without removing retained functionality',t=>{
 const f=fixture(t,{variant:'full',default_tab:'history',tabs:['history','growth','config'],show_help:false});assert.equal(f.card.selectedTab,'history');assert.equal(f.card.shadowRoot.querySelector('[data-tab="feeding"]'),null);assert.ok(f.card.shadowRoot.querySelector('[data-tab="growth"]'));assert.equal(f.card.shadowRoot.querySelector('#tip-banner'),null);assert.ok(f.card.shadowRoot.querySelector('#exportBtn'));
});
test('editor exposes visual options, preserves future config and keeps exact title input/caret on hass updates',t=>{
 const f=fixture(t),editor=f.w.document.createElement('ha-baby-tracker-editor');f.w.document.body.append(editor);editor.setConfig({type:'custom:ha-baby-tracker',title:'Long title',variant:'compact',future_key:{keep:true},child:'b'});editor.hass=f.card._hass;
 const root=editor.shadowRoot,title=root.getElementById('cf_title');title.focus();title.setSelectionRange(2,5);const changes=[];editor.addEventListener('config-changed',e=>changes.push(e.detail.config));
 for(const id of ['cf_variant','cf_child','cf_default_tab','cf_show_help','cf_show_support','cf_tap_target'])assert.ok(root.getElementById(id),id);
 editor.hass={...f.card._hass,language:'pl',locale:{...f.card._hass.locale,language:'pl'}};assert.equal(root.getElementById('cf_title'),title);assert.equal(root.activeElement,title);assert.equal(title.selectionStart,2);assert.equal(title.selectionEnd,5);
 const variant=root.getElementById('cf_variant');variant.value='tile';variant.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.deepEqual(JSON.parse(JSON.stringify(changes.at(-1).future_key)),{keep:true});assert.equal(changes.at(-1).child,'b');assert.equal(changes.at(-1).variant,'tile');editor.remove();
});
test('changing the selected configured child fences an already pending record response',async t=>{
 const f=fixture(t,{variant:'compact',child:'a'});const epoch=f.card._timerAuthorityEpochV3;f.card.setConfig({...f.card.config,child:'b'});assert.equal(f.card.getCurrentBaby(),'b');assert.ok(f.card._timerAuthorityEpochV3>epoch);assert.equal(f.card.shadowRoot.querySelector('[data-baby-variant]').dataset.babyVariant,'compact');
});
