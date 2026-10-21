"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8');
const tick=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
function fixture(t,{admin=false,overrides={}}={}) {
 const dom=new JSDOM('',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>null;w.eval(source);
 const card=w.document.createElement('ha-baby-tracker');card.config={show_help:false,show_support:false};card._lang='en';card.selectedTab='config';
 const features=Object.fromEntries(['feeding','lactation','diapers','sleep','growth','history','export'].map(k=>[k,{visible:true,read:true,execute:true,...overrides[k]}]));
 const child={entry_id:'child-a',name:'Alex',capabilities:{revision:3,can_manage:admin,features}};
 card.babies=[child];card._backendAvailable=true;card._backendChecked=true;
 let stored={status:'ready',revision:3,policy:{schema:1,features:{}}},reply;
 const calls=[];card._hass={states:{},config:{time_zone:'UTC'},user:{id:'parent',is_admin:admin,is_active:true},connection:Object.assign(new w.EventTarget(),{connected:true}),callWS:async r=>{
  calls.push(structuredClone(r));if(reply)return reply(r);
  if(r.type==='ha_baby_tracker/get_feature_access')return structuredClone(stored);
  if(r.type==='config/auth/list')return [{id:'parent',name:'Anna <img src=x>',is_active:true},{id:'other',name:'Bartek',is_active:true}];
  if(r.type==='ha_baby_tracker/set_feature_access'){assert.equal(r.expected_revision,stored.revision);stored={status:'ready',revision:stored.revision+1,policy:structuredClone(r.policy)};return structuredClone(stored);}
  throw Error('Unexpected '+r.type);
 }};
 w.document.body.append(card);card.renderCard();
 t.after(()=>{card.remove();w.close();});
 return {w,card,calls,child,set reply(r){reply=r;},details:()=>card.shadowRoot.querySelector('[data-feature-access-v53]'),
  async open(){const d=this.details();assert.ok(d,'actual admin access disclosure');d.open=true;d.dispatchEvent(new w.Event('toggle'));await tick();},
  rule(feature,op){const el=card.shadowRoot.querySelector('[data-access-feature="'+feature+'"][data-access-operation="'+op+'"] select');assert.ok(el);return el;},
  change(feature,op,mode){const n=this.rule(feature,op);n.value=mode;n.dispatchEvent(new w.Event('change',{bubbles:true}));},
  node(action){const n=card.shadowRoot.querySelector('[data-feature-access="'+action+'"]');assert.ok(n);return n;}};
}
test('hidden features leave no tab, form, record or quick action; selection chooses an allowed tab',t=>{
 const f=fixture(t,{overrides:{feeding:{visible:false},sleep:{visible:false}}});f.card.selectedTab='feeding';f.card.renderCard();
 for(const feature of ['feeding','sleep']){assert.equal(f.card.shadowRoot.querySelector('[data-tab="'+feature+'"]'),null);assert.equal(f.card.shadowRoot.getElementById(feature+'-tab'),null);assert.equal(f.card.shadowRoot.querySelector('[data-quick-tab="'+feature+'"]'),null);}
 assert.notEqual(f.card.selectedTab,'feeding');
});
test('read-only actions stay visibly disabled and a quick action cannot dispatch a write',t=>{
 const f=fixture(t,{overrides:{feeding:{execute:false},diapers:{execute:false},sleep:{execute:false}}});
 for(const id of ['addFeedingBtn','addDiapersBtn','startSleepBtn','addSleepBtn'])assert.equal(f.card.shadowRoot.getElementById(id).disabled,true,id);
 assert.equal(f.card.shadowRoot.querySelector('[data-quick-tab="feeding"]').disabled,true);
 f.card.shadowRoot.getElementById('addFeedingBtn').click();assert.equal(f.calls.length,0);
});
test('execute-only UI has a form but no invented zero summaries or old history facts',t=>{
 const f=fixture(t,{overrides:{feeding:{read:false},sleep:{read:false}}});
 f.card.feedingData.set('child-a',[{id:'old',type:'bottle',amount:987654321,timestamp:Date.now()}]);f.card.renderCard();
 assert.equal(f.card.shadowRoot.getElementById('addFeedingBtn').disabled,false);
 assert.equal(f.card.shadowRoot.getElementById('feedingList'),null);assert.equal(f.card.shadowRoot.getElementById('sleepTimerDisplay'),null);
 assert.doesNotMatch(f.card.shadowRoot.textContent,/987654321/);assert.match(f.card.shadowRoot.textContent,/permission|access/i);
});
test('denied history and export cannot leave readable data or an enabled export action',t=>{
 const f=fixture(t,{overrides:{history:{read:false},export:{read:false}}});
 assert.equal(f.card.shadowRoot.getElementById('historyResults'),null);assert.equal(f.card.shadowRoot.getElementById('exportBtn').disabled,true);
 assert.match(f.card.shadowRoot.getElementById('history-tab').textContent,/permission|access/i);
});
test('admin policy is quiet while closed; open loads exact child then native named users and supported operations',async t=>{
 const f=fixture(t,{admin:true});assert.ok(f.details());assert.equal(f.details().open,false);assert.equal(f.calls.length,0);await f.open();
 assert.deepEqual(f.calls.map(r=>r.type),['ha_baby_tracker/get_feature_access','config/auth/list']);assert.equal(f.calls[0].entry_id,'child-a');
 assert.equal(f.card.shadowRoot.querySelectorAll('[data-access-feature] select').length,20);assert.equal(f.node('save').disabled,true);
});
test('nonadministrator has no policy/user IO or administrator policy disclosure',async t=>{
 const f=fixture(t);assert.equal(f.details(),null);assert.equal(f.calls.length,0);
});
test('policy Save uses native choices, exact entry/revision and independent operations without autosave',async t=>{
 const f=fixture(t,{admin:true});await f.open();f.change('feeding','read','selected_users');const row=f.rule('feeding','read').closest('[data-access-operation]');
 assert.match(row.textContent,/Anna <img/);assert.equal(row.querySelector('img'),null);assert.doesNotMatch(row.textContent,/parent|other/);
 const choice=row.querySelector('input');choice.checked=true;choice.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(f.calls.length,2);
 f.node('save').click();await tick();const writes=f.calls.filter(r=>r.type.endsWith('/set_feature_access'));assert.equal(writes.length,1);
 assert.deepEqual(writes[0],{type:'ha_baby_tracker/set_feature_access',entry_id:'child-a',expected_revision:3,policy:{schema:1,features:{feeding:{read:{mode:'selected_users',user_ids:['parent']}}}}});assert.match(f.node('status').textContent,/saved/i);
});
test('Baby revision conflict retains the draft and blocks another write until explicit reload',async t=>{
 const f=fixture(t,{admin:true});await f.open();f.change('export','read','admin');f.reply=async()=>{throw {code:'invalid_payload',message:'Policy revision conflict'};};
 f.node('save').click();await tick();assert.equal(f.node('save').disabled,true);assert.match(f.node('status').textContent,/changed|reload/i);
 f.node('save').click();await tick();assert.equal(f.calls.filter(r=>r.type.endsWith('/set_feature_access')).length,1);
 f.reply=null;f.node('reload').click();await tick();assert.equal(f.rule('export','read').value,'inherit');assert.equal(f.node('save').disabled,true);
});
test('policy draft survives ordinary repaint with its exact focused node',async t=>{
 const f=fixture(t,{admin:true});await f.open();f.change('sleep','execute','admin');const select=f.rule('sleep','execute');select.focus();const calls=f.calls.length;
 f.card.config={...f.card.config,title:'New title'};f.card.renderCard();assert.equal(f.rule('sleep','execute'),select);assert.equal(f.card.shadowRoot.activeElement,select);assert.equal(f.calls.length,calls);
});
for(const change of ['child','identity','offline'])test('late policy cannot revive after '+change,async t=>{
 const f=fixture(t,{admin:true});let release;f.reply=r=>r.type.endsWith('/get_feature_access')?new Promise(resolve=>release=resolve):[];
 const opened=f.open();await tick();assert.ok(release);
 if(change==='child'){f.card.babies.push({...f.child,entry_id:'child-b'});f.card.selectedBaby=1;f.card.renderCard();}
 if(change==='identity'){f.card._hass={...f.card._hass,user:{id:'other',is_admin:false,is_active:true}};f.card.renderCard();}
 if(change==='offline')f.w.dispatchEvent(new f.w.Event('offline'));
 release({status:'ready',revision:3,policy:{schema:1,features:{feeding:{read:{mode:'selected_users',user_ids:['private-old']}}}}});await opened;await tick();
 assert.equal(f.calls.filter(r=>r.type==='config/auth/list').length,0);assert.doesNotMatch(f.card.shadowRoot.textContent,/private-old/);assert.equal(f.card.shadowRoot.querySelectorAll('[data-access-feature] select').length,0);
});
