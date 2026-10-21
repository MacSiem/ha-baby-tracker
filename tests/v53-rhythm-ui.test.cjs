const assert=require('node:assert/strict');const{test}=require('node:test');
const{readFileSync}=require('node:fs');const{JSDOM}=require('jsdom');const{join}=require('node:path');
function fixture(lang='en'){
 const dom=new JSDOM('',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){}});
 dom.window.eval(readFileSync(join(__dirname,'../custom_components/ha_baby_tracker/www/ha-baby-tracker.js'),'utf8'));
 const card=dom.window.document.createElement('ha-baby-tracker');card.config={};card._lang=lang;
 card._hass={states:{},themes:{},user:{id:'p',is_admin:true},config:{time_zone:'Europe/Warsaw'},locale:{first_weekday:'monday',time_format:'24'}};
 card._backendAvailable=true;card._backendChecked=true;card.babies=[{entry_id:'a',name:'Same'},{entry_id:'b',name:'Same'}];
 dom.window.document.body.append(card);card.initializeDataStructures();card.selectedTab='history';
 return{dom,card};
}
const now=Date.parse('2026-10-20T12:00:00+02:00');
for(const lang of ['en','pl'])test(`rhythm chart, daily bars and data table share exact daily values (${lang})`,()=>{
 const{dom,card}=fixture(lang);try{
 card.feedingData.set('a',[{timestamp:now-3600000,type:'bottle',amount:100}]);
 card.sleepData.set('a',[{startTime:Date.parse('2026-10-19T23:00:00+02:00'),endTime:Date.parse('2026-10-20T02:00:00+02:00'),duration:999}]);
 card.renderCard();card.updateWeeklyStats(now);
 const root=card.shadowRoot,model=card._rhythmModelV53(now);
 assert.equal(root.querySelectorAll('[data-rhythm-day]').length,7);
 assert.equal(root.querySelectorAll('[data-rhythm-table-row]').length,7);
 for(const day of model.days){
 const row=root.querySelector(`[data-rhythm-table-row="${day.day}"]`);
 assert.equal(Number(row.dataset.feedingCount),day.feedingCount);
 assert.equal(Number(row.dataset.sleepMinutes),day.sleepMinutes);
 const bar=root.querySelector(`[data-rhythm-series="feeding"] [data-rhythm-bar="${day.day}"]`);
 assert.equal(Number(bar.dataset.value),day.feedingCount);
 }
 assert.ok(root.querySelector('[data-rhythm-legend="sleep"]'));
 assert.ok(root.querySelector('[data-rhythm-legend="feeding"]'));
 assert.match(root.querySelector('#babyRhythmV53').textContent,/Europe\/Warsaw/);
 assert.doesNotMatch(root.querySelector('[data-rhythm-comparison]').textContent,/%/);
 assert.match(root.querySelector('[data-rhythm-comparison]').textContent,lang==='pl'?/pokryci|kompletno/ :/coverage|completeness/);
 card.selectedBaby=1;card.renderCard();card.updateWeeklyStats(now);
 assert.equal(card._rhythmModelV53(now).totals.feedingCount,0);
 }finally{dom.window.close();}
});
test('a daily rhythm action opens the matching history without writing records',()=>{
 const{dom,card}=fixture();try{
 card.feedingData.set('a',[{timestamp:now-3600000,type:'bottle',amount:100}]);
 const before=JSON.stringify([...card.feedingData]);card.renderCard();card.updateWeeklyStats(now);
 card.shadowRoot.querySelector('[data-rhythm-history-day="2026-10-20"]').click();
 assert.equal(card.shadowRoot.getElementById('historyFrom').value,'10/20/2026');
 assert.equal(card.shadowRoot.getElementById('historyTo').value,'10/20/2026');
 assert.equal(card._getHistoryState().from,'2026-10-20');assert.equal(card._getHistoryState().to,'2026-10-20');
 assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length,1);
 assert.equal(JSON.stringify([...card.feedingData]),before);
 }finally{dom.window.close();}
});
test('failed read clears rhythm and comparison numbers instead of showing empty zeros',()=>{
 const{dom,card}=fixture();try{
 card.renderCard();card._historyLoadFailed=true;card.updateWeeklyStats(now);
 assert.equal(card.shadowRoot.querySelectorAll('[data-rhythm-day]').length,0);
 assert.equal(card.shadowRoot.querySelectorAll('[data-rhythm-table-row]').length,0);
 assert.match(card.shadowRoot.getElementById('weeklyStats').textContent,/Unconfirmed/);
 }finally{dom.window.close();}
});

test('elapsed feeding uses the same canonical linked record as daily counts',()=>{
 const{dom,card}=fixture();try{
 card.feedingData.set('a',[{timestamp:now-7200000,type:'breast',linkedId:'pair'}]);
 card.lactationData.set('a',[{ts:now,type:'breastfeed',linkedId:'pair'}]);
 card.renderCard();card.updateWeeklyStats(now);
 assert.equal(card._rhythmModelV53(now).totals.feedingCount,1);
 assert.equal(card.shadowRoot.querySelector('.rhythm-kpis .stat-value').textContent,'2 h 0 min');
 }finally{dom.window.close();}
});

test('day drilldown includes a sleep interval that began on the previous day',()=>{
 const{dom,card}=fixture();try{
 card.sleepData.set('a',[{startTime:Date.parse('2026-10-19T23:00:00+02:00'),endTime:Date.parse('2026-10-20T02:00:00+02:00'),duration:180}]);
 card.renderCard();card.updateWeeklyStats(now);
 card.shadowRoot.querySelector('[data-rhythm-history-day="2026-10-20"]').click();
 assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length,1);
 }finally{dom.window.close();}
});

test('aware ISO record keeps the same date and clock through rhythm and history',()=>{
 const{dom,card}=fixture();try{
 card.feedingData.set('a',[{time:'2026-10-20T10:00:12+02:00',type:'bottle',amount:100}]);
 card.renderCard();card.updateWeeklyStats(now);
 card.shadowRoot.querySelector('[data-rhythm-history-day="2026-10-20"]').click();
 assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length,1);
 assert.equal(card.shadowRoot.querySelector('[data-history-clock]').textContent,'10:00');
 }finally{dom.window.close();}
});
