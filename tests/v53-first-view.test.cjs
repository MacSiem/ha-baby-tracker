const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {JSDOM} = require('jsdom');
function fixture(lang='en') {
  const dom=new JSDOM('<button id="outside">Outside</button>',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
  dom.window.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){}}};
  dom.window.eval(readFileSync(join(__dirname,'../custom_components/ha_baby_tracker/www/ha-baby-tracker.js'),'utf8'));
  const card=dom.window.document.createElement('ha-baby-tracker');
  card.config={};card._lang=lang;card._hass={states:{},user:{id:'user-a',is_admin:true},themes:{}};
  card._backendAvailable=true;card._backendChecked=true;card._loadData=()=>{};
  card.babies=['Alex','Alex','Sam','Taylor','Robin','Casey'].map((name,i)=>({name,entry_id:'child-'+i,date_of_birth:i<2?`202${i}-04-12`:null}));
  card.initializeDataStructures();card.renderCard();dom.window.document.body.append(card);
  return {dom,card,close(){card.remove();dom.window.close()}};
}
for(const lang of ['en','pl']) {
  test(`one accessible child chooser distinguishes names and quick entries precede history (${lang})`,()=>{
    const f=fixture(lang);try{
      const root=f.card.shadowRoot;
      const selectors=root.querySelectorAll('.baby-selector select');assert.equal(selectors.length,1);
      const select=selectors[0];assert.ok(select.labels.length||select.getAttribute('aria-label'));
      assert.equal(select.options.length,6);assert.equal(new Set([...select.options].map(x=>x.textContent)).size,6);
      assert.equal(new Set([...select.options].map(x=>x.value)).size,6);
      assert.equal(root.querySelectorAll('.baby-button,.baby-btn').length,0);
      assert.ok(root.querySelector('#config-tab .manage-children-link'));
      assert.equal(root.querySelector('#feeding-tab .manage-children-link'),null);
      const nav=root.querySelector('.tabs'),summary=root.querySelector('.weekly-summary');
      assert.ok(summary.closest('#history-tab'));assert.ok(nav.compareDocumentPosition(summary)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
      const help=root.querySelector('details#tip-banner');assert.ok(help);assert.equal(help.open,false);assert.ok(help.querySelector('summary'));
      const shortcuts=root.querySelectorAll('[data-quick-tab]');assert.equal(shortcuts.length,3);
      for(const button of shortcuts)assert.ok(button.compareDocumentPosition(summary)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    }finally{f.close()}
  });
}
test('child chooser changes stable identity, clears the previous draft and retains focus',()=>{
 const f=fixture();try{
  let select=f.card.shadowRoot.querySelector('.baby-selector select');assert.ok(select);
  f.card.shadowRoot.getElementById('feedingNotes').value='private draft for first Alex';select.focus();select.value=select.options[1].value;select.dispatchEvent(new f.dom.window.Event('change',{bubbles:true}));
  assert.equal(f.card.getCurrentBaby(),'child-1');assert.equal(f.card.shadowRoot.getElementById('feedingNotes').value,'');
  select=f.card.shadowRoot.querySelector('.baby-selector select');assert.equal(f.card.shadowRoot.activeElement,select);
  f.card._lang='pl';f.card.renderCard();assert.equal(f.card.shadowRoot.activeElement,f.card.shadowRoot.querySelector('.baby-selector select'));
  const outside=f.dom.window.document.getElementById('outside');outside.focus();f.card.renderCard();assert.equal(f.dom.window.document.activeElement,outside);
 }finally{f.close()}
});
test('quick entries open existing forms for the selected child without saving',()=>{
 const f=fixture();try{
  const calls=[];f.card._hass.callWS=async request=>{calls.push(request);throw Error('unexpected IO')};
  f.card.selectedBaby=1;f.card.renderCard();
  for(const [tab,focus] of [['diapers','diapersType'],['feeding','feedingType'],['sleep','startSleepBtn']]){
   const button=f.card.shadowRoot.querySelector(`[data-quick-tab="${tab}"]`);assert.ok(button);button.click();
   assert.equal(f.card.selectedTab,tab);assert.equal(f.card.getCurrentBaby(),'child-1');assert.equal(f.card.shadowRoot.activeElement,f.card.shadowRoot.getElementById(focus));
  }
  assert.deepEqual(calls,[]);
 }finally{f.close()}
});
test('help expansion is scoped to the current HA user',()=>{
 const f=fixture();try{
  let help=f.card.shadowRoot.querySelector('details#tip-banner');assert.ok(help);help.open=true;help.dispatchEvent(new f.dom.window.Event('toggle'));
  f.card._hass={...f.card._hass,user:{...f.card._hass.user,id:'user-b'}};f.card.renderCard();help=f.card.shadowRoot.querySelector('details#tip-banner');assert.equal(help.open,false);
  f.card._hass={...f.card._hass,user:{...f.card._hass.user,id:'user-a'}};f.card.renderCard();assert.equal(f.card.shadowRoot.querySelector('details#tip-banner').open,true);
 }finally{f.close()}
});

test('sleep shortcut focuses the available end control when a timer is running',()=>{
 const f=fixture();try{
  f.card.sleepStartTime=Date.now()-60000;f.card.sleepTimer=f.dom.window.setInterval(()=>{},1000);f.card.updateSleepTimerDisplay();
  f.card.shadowRoot.querySelector('[data-quick-tab="sleep"]').click();
  assert.equal(f.card.selectedTab,'sleep');assert.equal(f.card.shadowRoot.getElementById('startSleepBtn').style.display,'none');
  assert.equal(f.card.shadowRoot.activeElement,f.card.shadowRoot.getElementById('stopSleepBtn'));
  assert.ok(f.card.sleepStartTime); // Opening the timer never stops it.
 }finally{f.close()}
});
