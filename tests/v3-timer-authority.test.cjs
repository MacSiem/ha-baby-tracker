const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
function setup(t){
 const dom=new JSDOM('',{url:'http://qa.invalid',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 dom.window.eval(fs.readFileSync(path.join(__dirname,'../custom_components/ha_baby_tracker/www/ha-baby-tracker.js'),'utf8'));
 const card=dom.window.document.createElement('ha-baby-tracker');
 card.renderCard=()=>{};card.updateAllDisplays=()=>{};card.updateSleepTimerDisplay=()=>{};card.updateBreastfeedingDisplay=()=>{};
 card._ensureBackend=()=>{};card._loadData=()=>{};const messages=[];card._showToast=(...args)=>messages.push(args);
 card._backendAvailable=true;card._backendChecked=true;card.babies=[{name:'Same',entry_id:'a'},{name:'Same',entry_id:'b'}];card.initializeDataStructures();
 const connection=new dom.window.EventTarget();connection.connected=true;
 card.hass={user:{id:'admin',is_admin:true},connection,states:{},language:'en',callWS:async()=>{throw Error('unconfigured')}};
 dom.window.document.body.append(card);t.after(()=>{card.remove();dom.window.close()});return {card,dom,messages};
}
const timerKey=kind=>kind==='sleep'?'sleepTimer':'_bfTimer';
const startKey=kind=>kind==='sleep'?'sleepStartTime':'_bfStartTime';
const start=(card,kind)=>kind==='sleep'?card.startSleepTimer():card._startBreastfeedingTimer('left');
const stop=(card,kind)=>kind==='sleep'?card.stopSleepTimer():card._stopBreastfeedingTimer();
const ack=(kind,action)=>action==='start'?{entry_id:'a',timer:{startTime:1000,...(kind==='bf'?{side:'left'}:{})}}:{entry_id:'a',category:kind==='sleep'?'sleep':'bf_sessions',entry:{id:'saved',duration:0,startTime:1000,endTime:1001,timestamp:1001,side:'left'}};
for(const kind of ['sleep','bf']){
 for(const response of [{},{entry_id:'b',timer:{startTime:1000}},{entry_id:'a',timer:{startTime:'bad'}}])test(kind+' rejects malformed or wrong-child start '+JSON.stringify(response),async t=>{
  const f=setup(t);f.card._hass.callWS=async()=>response;assert.equal(await start(f.card,kind),false);assert.equal(f.card[timerKey(kind)],null);assert.equal(f.messages.length,1);
 });
 for(const response of [{},{...ack(kind,'stop'),entry_id:'b'},{...ack(kind,'stop'),category:'growth'},{...ack(kind,'stop'),entry:{}}])test(kind+' retains timer for unconfirmed stop '+JSON.stringify(response),async t=>{
  const f=setup(t);f.card._applyBackendTimers({[kind]:{startTime:1000,side:'left'}});const running=f.card[timerKey(kind)];f.card._hass.callWS=async()=>response;
  assert.equal(await stop(f.card,kind),false);assert.equal(f.card[timerKey(kind)],running);assert.equal(f.card[startKey(kind)],1000);assert.equal(f.messages.length,1);assert.equal(kind==='sleep'?f.card.sleepData.get('a').length:f.card._bfSessions.length,0);
 });
 for(const fence of ['user','connection','child-roundtrip','detach','offline-roundtrip'])test(kind+' discards late start after '+fence,async t=>{
  const f=setup(t);let finish;f.card._hass.callWS=()=>new Promise(resolve=>finish=resolve);const pending=start(f.card,kind);
  if(fence==='user')f.card.hass={...f.card._hass,user:{id:'household',is_admin:false}};
  if(fence==='connection')f.card.hass={...f.card._hass,connection:{connected:true}};
  if(fence==='child-roundtrip'){f.card._selectBaby(1);f.card._selectBaby(0)}
  if(fence==='detach')f.card.remove();
  if(fence==='offline-roundtrip'){f.dom.window.dispatchEvent(new f.dom.window.Event('offline'));f.dom.window.dispatchEvent(new f.dom.window.Event('online'))}
  finish(ack(kind,'start'));assert.equal(await pending,false);assert.equal(f.card[timerKey(kind)],null);assert.equal(f.messages.length,0,'stale authority must not display another users result');
 });
 test(kind+' repeated stop coalesces and valid zero-duration acknowledgement persists once',async t=>{
  const f=setup(t);f.card._applyBackendTimers({[kind]:{startTime:1000,side:'left'}});let finish,calls=0;f.card._hass.callWS=()=>{calls++;return new Promise(r=>finish=r)};
  const pending=stop(f.card,kind);await stop(f.card,kind);assert.equal(calls,1);finish(ack(kind,'stop'));assert.equal(await pending,true);assert.equal(f.card[timerKey(kind)],null);const rows=kind==='sleep'?f.card.sleepData.get('a'):f.card._bfSessions;assert.equal(rows.length,1);assert.equal(rows[0].duration,0);
 });
}
test('breastfeeding side change never sends a new start after authority changes while stopping',async t=>{
 const f=setup(t);f.card._applyBackendTimers({bf:{startTime:1000,side:'left'}});let finish;const calls=[];f.card._hass.callWS=req=>{calls.push(req);return req.type.endsWith('timer_start')?Promise.resolve({...ack('bf','start'),timer:{startTime:2000,side:'right'}}):new Promise(r=>finish=r)};
 const pending=f.card.toggleBreastfeedingTimer('right');f.card.hass={...f.card._hass,user:{id:'other',is_admin:false}};finish(ack('bf','stop'));await pending;assert.equal(calls.length,1);assert.equal(f.card._bfCurrentSide,'left');
});
