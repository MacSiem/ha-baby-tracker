const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
function fixture(lang='en') {
 const dom = new JSDOM('', {runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/'});
 dom.window.HTMLCanvasElement.prototype.getContext = () => ({clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){}});
 dom.window.eval(readFileSync(join(__dirname,'../custom_components/ha_baby_tracker/www/ha-baby-tracker.js'),'utf8'));
 const card=dom.window.document.createElement('ha-baby-tracker'); card.config={};card._lang=lang;
 card._hass={states:{},user:{id:'parent',is_admin:true},themes:{},config:{time_zone:'Europe/Warsaw'},locale:{time_format:'24'}};
 card._backendAvailable=true;card._backendChecked=true;card.babies=[{name:'Same',entry_id:'a'}];
 dom.window.document.body.append(card);card.initializeDataStructures();card.selectedTab='history';
 return {dom,card};
}
for(const lang of ['en','pl']) test(`history groups days and keeps exact clocks in details (${lang})`,()=>{
 const {dom,card}=fixture(lang);
 try {
  const entries=[{timestamp:Date.parse('2026-10-20T10:15:09+02:00'),type:'bottle',amount:100},
   {timestamp:Date.parse('2026-10-20T09:00:23+02:00'),type:'breast',amount:'15 min'},
   {timestamp:Date.parse('2026-10-19T08:00:11+02:00'),type:'bottle',amount:80}];
  card.feedingData.set('a',entries);card.sleepData.set('a',[{date:'2026-10-20',duration:60}]);
  const before=JSON.stringify(entries);card.renderCard();
  const root=card.shadowRoot;
  assert.equal(root.querySelectorAll('[data-history-day]').length,2);
  assert.equal(root.querySelectorAll('[data-history-row]').length,4);
  assert.deepEqual([...root.querySelectorAll('[data-history-day]')].map(el=>el.dataset.historyDay),['2026-10-20','2026-10-19']);
  const first=root.querySelector('[data-history-row]');
  assert.equal(first.querySelector('[data-history-clock]').textContent,'10:15');
  assert.doesNotMatch(first.querySelector('[data-history-primary]').textContent,/10:15:09|2026-10-20/);
  assert.match(first.querySelector('[data-history-exact]').textContent,/10:15:09/);
  assert.doesNotMatch(root.querySelector('#historyResults').textContent,/Sleep — Sleep|Sen — Sen/);
  assert.equal(JSON.stringify(entries),before);
 } finally {dom.window.close();}
});
test('repeated DST wall clocks are distinguishable while ordinary clocks stay short',()=>{
 const {dom,card}=fixture();
 try {
  card.feedingData.set('a',[{timestamp:Date.parse('2026-10-25T02:30:00+02:00'),type:'bottle'},
   {timestamp:Date.parse('2026-10-25T02:30:00+01:00'),type:'bottle'}]);card.renderCard();
  const clocks=[...card.shadowRoot.querySelectorAll('[data-history-clock]')].map(el=>el.textContent);
  assert.equal(clocks.length,2);assert.notEqual(clocks[0],clocks[1]);
  assert.ok(clocks.every(clock=>clock.startsWith('02:30')));
 } finally {dom.window.close();}
});
for(const lang of ['en','pl']) test(`weight and height values keep a stable series precision (${lang})`,()=>{
 const {dom,card}=fixture(lang);
 try {
  card.growthData.set('a',[{type:'weight',date:'2026-10-19',value:5},{type:'weight',date:'2026-10-20',value:5.1},
   {type:'height',date:'2026-10-19',value:60},{type:'height',date:'2026-10-20',value:60.2}]);
  card._growthPeriod='all';card._growthView='data';card.selectedTab='growth';card.renderCard();
  const values=[...card.shadowRoot.querySelectorAll('[data-growth-row] td:last-child')].map(el=>el.textContent);
  const sep=lang==='pl'?',':'.';
  assert.deepEqual(values,[`5${sep}00 kg`,`5${sep}10 kg`,`60${sep}00 cm`,`60${sep}20 cm`]);
 } finally {dom.window.close();}
});
