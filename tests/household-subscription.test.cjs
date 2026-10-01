const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('household child update reloads only the selected child through scoped subscription',async()=>{
 const dom=new JSDOM('<html></html>',{runScripts:'dangerously',url:'http://localhost/'});
 try{
  dom.window.eval(fs.readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8'));
  const card=dom.window.document.createElement('ha-baby-tracker');
  let listener,busAttempts=0,reloads=0;
  card.hass={user:{is_admin:false},states:{},connection:{
   subscribeEvents:async()=>{busAttempts++;throw {code:'unauthorized'};},
   subscribeMessage:async(callback,message)=>{assert.equal(message.type,'ha_baby_tracker/subscribe');listener=callback;return ()=>{};}
  }};
  card._currentBackendEntryId=()=> 'qa-child';card._loadBackendData=async()=>{reloads++;};
  await card._subscribeBackendEvents();
  assert.equal(typeof listener,'function','household update listener must be registered');
  listener({data:{entry_id:'qa-child',category:'feeding'}});assert.equal(reloads,1);
  listener({data:{entry_id:'other-child',category:'feeding'}});assert.equal(reloads,1);
  assert.equal(busAttempts,0);
 }finally{dom.window.close();}
});
