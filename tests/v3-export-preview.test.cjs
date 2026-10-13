const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync}=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const source=readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8');
const turn=()=>new Promise(r=>setImmediate(r));
async function fixture(t,backend=false){
 const dom=new JSDOM('',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',virtualConsole:new VirtualConsole()});
 const w=dom.window;w.confirm=()=>true;w.Blob=Blob;const blobs=new Map(),downloads=[],calls=[];
 w.URL.createObjectURL=b=>{const k='blob:fixture-'+blobs.size;blobs.set(k,b);return k};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){downloads.push({filename:this.download,blob:blobs.get(this.href)})};
 w.eval(source);const card=w.document.createElement('ha-baby-tracker');
 card.config={show_support:false};card._lang='en';card._backendChecked=true;card._backendAvailable=backend;
 card.babies=[{name:'PRIVATE_CHILD',entry_id:'child-a'}];card.initializeDataStructures();
 card._hass={language:'en',states:{},themes:{},user:{id:'test-user',is_admin:true},connection:{connected:true,socket:{readyState:1}},callWS:async request=>{
  calls.push(request);if(request.type==='ha_baby_tracker/list_children')return {children:[{entry_id:'child-a',name:'PRIVATE_CHILD',date_of_birth:'2026-01-01'},{entry_id:'child-b',name:'UNVISITED_CHILD',date_of_birth:'2026-02-01'}]};
  return {entry_id:request.entry_id,category:request.category,data:[{id:'record-a',timestamp:1000,date:'2026-10-13',type:'bottle',amount:120,notes:'PRIVATE_NOTE',token:'PRIVATE_TOKEN',user_id:'PRIVATE_USER',address:'PRIVATE_ADDRESS'}],running_timers:{sleep:{startTime:111},bf:{startTime:222,side:'right',sessions:[{side:'left',duration:10,timestamp:1000}]}}};}};
 w.document.body.append(card);card.renderCard();await turn();
 t.after(()=>{card.remove();w.close()});return {dom,w,card,calls,downloads};
}
const root=f=>f.card.shadowRoot.querySelector('[data-ha-tools-export]')?.shadowRoot;
const field=(f,n)=>root(f)?.querySelector('[data-export="'+n+'"]');
async function ready(f){await f.card.exportData();for(let i=0;i<25&&!field(f,'preview')?.textContent;i++)await turn();assert.ok(root(f),'export must open a review');}
const refresh=async f=>{field(f,'refresh').click();for(let i=0;i<25&&!field(f,'preview').textContent;i++)await turn();};
test('preview is explicit, anonymous by default and includes all server children/categories/timers',async t=>{
 const f=await fixture(t,true);await ready(f);assert.equal(f.downloads.length,0);assert.equal(field(f,'private').checked,false);
 const text=field(f,'preview').textContent,p=JSON.parse(text);assert.equal(p.children.length,2);assert.equal(p.children[1].data.lactation[0].amount,120);assert.equal(p.children[1].data.bf_sessions.length,1);assert.equal(p.children[1].running_timers.sleep.startTime,111);assert.equal(p.children[1].running_timers.bf.side,'right');assert.equal(f.calls.length,13);assert.doesNotMatch(text,/PRIVATE_|UNVISITED_CHILD|child-a|child-b/);assert.ok(field(f,'included').textContent);assert.ok(field(f,'excluded').textContent);
});
test('private opt-in includes reviewed identity only, Save uses exact bytes without another read',async t=>{
 const f=await fixture(t,true);await ready(f);field(f,'private').click();assert.equal(field(f,'save').disabled,true);await refresh(f);
 const before=f.calls.length,bytes=field(f,'preview').textContent,p=JSON.parse(bytes);assert.equal(p.children[0].name,'PRIVATE_CHILD');assert.equal(p.children[0].date_of_birth,'2026-01-01');assert.doesNotMatch(bytes,/PRIVATE_NOTE|PRIVATE_TOKEN|PRIVATE_USER|PRIVATE_ADDRESS/);
 field(f,'save').click();await turn();field(f,'save').click();assert.equal(f.downloads.length,1);assert.equal(await f.downloads[0].blob.text(),bytes);assert.equal(f.calls.length,before);
});
test('legacy local categories and unvisited readable storage survive projection without mutation',async t=>{
 const f=await fixture(t);f.card.lactationData.set('PRIVATE_CHILD',[{amount:'120 ml',timestamp:1000}]);f.card._bfSessions=[{side:'left',duration:10,timestamp:2000}];f.card.sleepStartTime=111;f.card._bfStartTime=222;f.card._bfCurrentSide='right';
 const raw=JSON.stringify({feeding:{UNVISITED_CHILD:[{amount:90,type:'bottle',timestamp:3000,notes:'PRIVATE_NOTE'}]},breastfeeding:[{side:'right',duration:12,timestamp:3000}],_runningTimers:{bf:{startTime:333,side:'left'}}});
 f.w.localStorage.setItem('ha-tools-baby-tracker-1',raw);await ready(f);const p=JSON.parse(field(f,'preview').textContent);
 assert.equal(Object.values(p.local.lactation).flat()[0].amount,'120 ml');assert.equal(p.local.breastfeeding[0].duration,10);assert.equal(p.local._runningTimers.sleep.startTime,111);assert.equal(p.legacy_storage[0].data.breastfeeding[0].duration,12);assert.equal(p.legacy_storage[0].data._runningTimers.bf.startTime,333);assert.equal(f.w.localStorage.getItem('ha-tools-baby-tracker-1'),raw);assert.doesNotMatch(field(f,'preview').textContent,/PRIVATE_|UNVISITED_CHILD/);
});
test('unreadable legacy bytes stay local and make omission explicit in both file and review',async t=>{
 const f=await fixture(t);f.w.localStorage.setItem('ha-tools-baby-tracker-9','{broken PRIVATE_TOKEN');await ready(f);const p=JSON.parse(field(f,'preview').textContent);assert.equal(p.status,'partial');assert.equal(p.omitted_legacy.length,1);assert.equal(f.w.localStorage.getItem('ha-tools-baby-tracker-9'),'{broken PRIVATE_TOKEN');assert.doesNotMatch(field(f,'preview').textContent,/PRIVATE_TOKEN/);assert.match(field(f,'source-limit').textContent,/unreadable|incomplete/i);
});
test('failed server read cannot enable a misleading partial backup',async t=>{
 const f=await fixture(t,true);f.card._hass.callWS=async()=>{throw Error('PRIVATE_ERROR')};await ready(f);assert.equal(field(f,'preview').textContent,'');assert.equal(field(f,'save').disabled,true);assert.equal(f.downloads.length,0);assert.doesNotMatch(root(f).textContent,/PRIVATE_ERROR/);
});
test('identity change during pending preview discards late data and private consent',async t=>{
 const f=await fixture(t,true);let release;f.card._hass.callWS=()=>new Promise(r=>release=r);f.card.exportData();await turn();assert.ok(root(f));f.card.hass={...f.card.hass,user:{id:'different',is_admin:false}};release({children:[]});await turn();assert.equal(field(f,'preview').textContent,'');assert.equal(field(f,'private').checked,false);assert.equal(f.downloads.length,0);
});
test('ordinary repaint preserves filename and caret; source or offline changes invalidate bytes',async t=>{
 const f=await fixture(t);await ready(f);const n=field(f,'filename');n.focus();n.setSelectionRange(2,6);f.card._lastHtml='';f.card.renderCard();assert.equal(field(f,'filename'),n);assert.equal(root(f).activeElement,n);assert.equal(n.selectionStart,2);assert.equal(n.selectionEnd,6);assert.ok(field(f,'preview').textContent);
 f.w.dispatchEvent(new f.w.Event('offline'));assert.equal(field(f,'preview').textContent,'');assert.equal(field(f,'save').disabled,true);
});
test('selected child and record changes cannot save stale reviewed content',async t=>{
 const f=await fixture(t);await ready(f);f.card.lactationData.set('PRIVATE_CHILD',[{amount:50,timestamp:1}]);field(f,'save').click();await turn();assert.equal(f.downloads.length,0);assert.equal(field(f,'preview').textContent,'');
});

test('local export retains child ownership of timers and rejects impossible literal dates',async t=>{
 const f=await fixture(t);f.card.babies=[{name:'PRIVATE_A'},{name:'PRIVATE_B'}];f.card.selectedBaby=1;f.card.sleepStartTime=123;
 f.card.growthData.set('PRIVATE_B',[{type:'weight',value:0,date:'2026-02-30'},{type:'height',value:null,date:'2026-02-28'}]);
 await ready(f);const p=JSON.parse(field(f,'preview').textContent);assert.equal(p.local_children.length,2);assert.equal(p.local_current_child,p.local_children[1].alias);assert.equal(p.local._runningTimers.sleep.baby,1);
 const rows=Object.values(p.local.growth).flat();assert.equal(rows[0].date,null);assert.equal(rows[0].value,0);assert.equal(rows[1].date,'2026-02-28');assert.equal(rows[1].value,null);
});
test('authenticated household reader can export and inconsistent timer snapshots cannot',async t=>{
 const f=await fixture(t,true);f.card._hass.user={id:'household',is_admin:false};await ready(f);assert.ok(field(f,'preview').textContent);
 field(f,'cancel').click();const original=f.card._hass.callWS;f.card._hass.callWS=async request=>{const reply=await original(request);if(request.category==='growth')reply.running_timers.sleep.startTime=999;return reply};
 await ready(f);assert.equal(field(f,'preview').textContent,'');assert.equal(field(f,'save').disabled,true);
});
