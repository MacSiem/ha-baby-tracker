"use strict";
const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const fs=require('node:fs');
const source=fs.readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8');
function fixture(t,{date='system',zone='local',language='pl-PL'}={}) {
 const dom=new JSDOM('',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const Original=w.Intl.DateTimeFormat;
 const regional=f=>{const old=f.resolvedOptions.bind(f);f.resolvedOptions=()=>({...old(),locale:'en-US',timeZone:'America/New_York'});return f;};
 w.Intl.DateTimeFormat=new Proxy(Original,{construct(Target,args){const f=Reflect.construct(Target,args);return args.length?f:regional(f);},apply(Target,self,args){const f=Reflect.apply(Target,self,args);return args.length?f:regional(f);}});
 w.HTMLCanvasElement.prototype.getContext=()=>null;w.eval(source);const card=w.document.createElement('ha-baby-tracker');
 card.config={show_help:false,show_support:false};card._lang='pl';card._backendChecked=true;card._backendAvailable=true;card.babies=[{entry_id:'a',name:'Alex',date_of_birth:'2026-10-20'}];
 card._hass={states:{},user:{id:'parent',is_admin:false,is_active:true},connection:{connected:true},config:{time_zone:'Europe/Warsaw'},locale:{language,date_format:date,time_zone:zone,time_format:'24'}};
 w.document.body.append(card);card.selectedTab='history';card.renderCard();t.after(()=>{card.remove();w.close();});return {w,card};
}
const change=(f,input,value)=>{input.value=value;input.dispatchEvent(new f.w.Event('change',{bubbles:true}));};
test('date fields visibly follow the chosen device region and retain literal calendar filters',t=>{
 const f=fixture(t);const input=f.card.shadowRoot.getElementById('historyFrom');assert.equal(input.type,'text');assert.match(input.placeholder,/11\/23\/2026/);
 change(f,input,'10/20/2026');assert.equal(f.card._getHistoryState().from,'2026-10-20');assert.equal(input.value,'10/20/2026');assert.equal(input.getAttribute('aria-invalid'),'false');
 assert.match(f.card.shadowRoot.textContent,/America\/New_York/);assert.match(f.card.shadowRoot.textContent,/Europe\/Warsaw/);
});
test('language date preference displays Polish order and rejects impossible dates without widening the filter',t=>{
 const f=fixture(t,{date:'language'}),input=f.card.shadowRoot.getElementById('historyFrom');assert.match(input.placeholder,/23\.11\.2026/);
 change(f,input,'20.10.2026');assert.equal(f.card._getHistoryState().from,'2026-10-20');change(f,input,'30.02.2026');assert.equal(input.getAttribute('aria-invalid'),'true');assert.equal(input.checkValidity(),false);assert.equal(f.card._getHistoryState().from,'2026-10-20');assert.match(f.card.shadowRoot.textContent,/dat|format/i);
});
test('native calendar remains available and updates the localized field and canonical date together',t=>{
 const f=fixture(t,{date:'language'}),root=f.card.shadowRoot;const picker=root.getElementById('historyFromPicker');assert.ok(picker);assert.equal(picker.type,'date');assert.ok(picker.getAttribute('aria-label'));
 change(f,picker,'2026-10-20');assert.equal(root.getElementById('historyFrom').value,'20.10.2026');assert.equal(f.card._getHistoryState().from,'2026-10-20');
 root.getElementById('historyReset').click();assert.equal(picker.value,'');assert.equal(root.getElementById('historyFrom').value,'');
});
test('display timezone changes clocks while day grouping and stored records keep the HA calendar',t=>{
 const f=fixture(t),entry={timestamp:Date.parse('2026-10-20T08:15:09Z'),type:'bottle',amount:120};f.card.feedingData.set('a',[entry]);f.card.renderCard();f.card.updateAllDisplays();const before=JSON.stringify(entry);
 let row=f.card.shadowRoot.querySelector('[data-history-row]');assert.equal(row.querySelector('[data-history-clock]').textContent,'04:15');assert.match(row.querySelector('[data-history-exact]').textContent,/04:15:09/);assert.equal(f.card.shadowRoot.querySelector('[data-history-day]').dataset.historyDay,'2026-10-20');
 f.card._hass.locale.time_zone='server';f.card.renderCard();row=f.card.shadowRoot.querySelector('[data-history-row]');assert.equal(row.querySelector('[data-history-clock]').textContent,'10:15');assert.equal(f.card.shadowRoot.querySelector('[data-history-day]').dataset.historyDay,'2026-10-20');assert.equal(JSON.stringify(entry),before);
});
test('literal calendar labels obey the date locale without timezone shifting birthdays',t=>{
 const f=fixture(t);const system=f.card._historyDayLabelV53('2026-10-20');f.card._hass.locale.date_format='language';const language=f.card._historyDayLabelV53('2026-10-20');assert.notEqual(system,language);assert.match(system,/Oct/);assert.match(language,/paź/);
 f.card.babies.push({entry_id:'b',name:'Alex',date_of_birth:'2026-10-21'});assert.match(f.card._childOptionLabel(0),/20/);assert.doesNotMatch(f.card._childOptionLabel(0),/19/);
});
test('measurement date input saves its literal ISO date independently of display region',async t=>{
 const f=fixture(t),root=f.card.shadowRoot;let saved;f.card._saveEntries=async entries=>{saved=entries;return true;};change(f,root.getElementById('growthDate'),'10/20/2026');root.getElementById('growthValue').value='5.1';await f.card.addGrowth();assert.equal(saved[0].entry.date,'2026-10-20');assert.equal(saved[0].entry.value,5.1);
});
test('editing a date keeps the exact input and caret through ordinary state updates',t=>{
 const f=fixture(t),input=f.card.shadowRoot.getElementById('historyFrom');input.value='10/2';input.focus();input.setSelectionRange(2,4);const original=f.card._hass;f.card.hass={...original,states:{'sensor.changed':{state:'2'}}};assert.equal(f.card.shadowRoot.getElementById('historyFrom'),input);assert.equal(input.value,'10/2');assert.equal(input.selectionStart,2);assert.equal(input.selectionEnd,4);
});

test('calendar parser requires the displayed separators rather than wildcard characters',t=>{
 const f=fixture(t,{date:'language'}),input=f.card.shadowRoot.getElementById('historyFrom');change(f,input,'23x11x2026');assert.equal(input.getAttribute('aria-invalid'),'true');assert.equal(f.card._getHistoryState().from,'');
});

test('recent feeding and diaper journals sort imported event time and honor HA clock preferences', t=>{
 const f=fixture(t,{date:'language',zone:'server',language:'en-US'});f.card._lang='en';f.card._hass.locale.time_format='12';
 const latest={timestamp:Date.parse('2026-10-20T08:15:00Z'),time:'10:15',type:'bottle',amount:148};
 const backfill={timestamp:Date.parse('2026-10-19T07:12:00Z'),time:'09:12',type:'bottle',amount:116};
 const feeding=[latest,backfill],diapers=[{...latest,type:'wet',notes:'NEW'},{...backfill,type:'dirty',notes:'OLD'}];
 const before=JSON.stringify([feeding,diapers]);f.card.feedingData.set('a',feeding);f.card.diapersData.set('a',diapers);f.card.updateAllDisplays();
 const root=f.card.shadowRoot;
 assert.match(root.querySelector('#feedingList .list-item').textContent,/148/);
 assert.match(root.querySelector('#feedingList .list-item-time').textContent,/10:15\s*AM/i);
 assert.match(root.querySelector('#diapersLis .list-item').textContent,/NEW/);
 assert.match(root.querySelector('#diapersLis .list-item-time').textContent,/10:15\s*AM/i);
 assert.equal(JSON.stringify([feeding,diapers]),before);
});
for(const [language,dayLabel] of [['en-US',/Oct 20/],['pl-PL',/20 paź/]]) test(`recent growth uses measurement day and localized labels (${language})`,t=>{
 const f=fixture(t,{date:'language',zone:'server',language});f.card._lang=language.startsWith('pl')?'pl':'en';
 const entries=[{date:'2026-10-20',type:'weight',value:6,timestamp:Date.parse('2026-10-20T10:00Z')},{date:'2026-10-19',type:'weight',value:5.1,timestamp:Date.parse('2026-10-21T10:00Z')}];
 const before=JSON.stringify(entries);f.card.growthData.set('a',entries);f.card.updateGrowthChart();const first=f.card.shadowRoot.querySelector('#growthList .list-item');
 assert.match(first.querySelector('.list-item-time').textContent,dayLabel);assert.doesNotMatch(first.textContent,/2026-10-/);assert.match(first.querySelector('.list-item-subtitle').textContent,/^6 kg$/);assert.equal(JSON.stringify(entries),before);
});
test('Sleep tab daily total shares midnight splitting and overlap union with the canonical summary',t=>{
 const f=fixture(t,{date:'language',zone:'server',language:'en-US'});f.card._lang='en';
 const NativeDate=f.w.Date;f.w.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:['2026-10-21T10:00:00Z']));}static now(){return NativeDate.parse('2026-10-21T10:00:00Z');}};
 const entries=[{startTime:Date.parse('2026-10-20T23:30:00+02:00'),endTime:Date.parse('2026-10-21T00:30:00+02:00'),date:'2026-10-20',duration:60},{startTime:Date.parse('2026-10-21T00:15:00+02:00'),endTime:Date.parse('2026-10-21T00:45:00+02:00'),date:'2026-10-21',duration:30}];
 const before=JSON.stringify(entries);f.card.sleepData.set('a',entries);f.card.updateSleepList();
 assert.equal(f.card.shadowRoot.getElementById('totalSleep').textContent,'0h 45m');assert.equal(JSON.stringify(entries),before);
});
test('recent lactation orders event time and localizes the clock without changing records',t=>{
 const f=fixture(t,{date:'language',zone:'server',language:'en-US'});f.card._lang='en';f.card._hass.locale.time_format='12';
 const entries=[{ts:Date.parse('2026-10-19T07:12:00Z'),time:'09:12',date:'2026-10-19',type:'pump',notes:'OLD'},{ts:Date.parse('2026-10-20T08:15:00Z'),time:'10:15',date:'2026-10-20',type:'pump',notes:'NEW'}];
 const before=JSON.stringify(entries);f.card.lactationData.set('a',entries);f.card.updateLactationDisplay();const first=f.card.shadowRoot.getElementById('lactationList').firstElementChild;
 assert.match(first.textContent,/NEW/);assert.match(first.textContent,/10:15\s*AM/i);assert.match(first.textContent,/Oct 20/);assert.equal(JSON.stringify(entries),before);
});

test('legacy today panels group by HA day even when the display device is across midnight',t=>{
 const f=fixture(t,{date:'language',zone:'local',language:'en-US'});f.card._lang='en';
 const NativeDate=f.w.Date;f.w.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:['2026-10-20T22:30:00Z']));}static now(){return NativeDate.parse('2026-10-20T22:30:00Z');}};
 const today={timestamp:Date.parse('2026-10-20T22:15:00Z'),type:'wet',amount:10},prior={timestamp:Date.parse('2026-10-20T20:00:00Z'),type:'wet',amount:100};
 const rows=[today,prior],before=JSON.stringify(rows);f.card.diapersData.set('a',rows);f.card.lactationData.set('a',rows);f.card.updateDiapersList();f.card.updateLactationDisplay();
 assert.equal(f.card.shadowRoot.getElementById('wetCount').textContent,'1');assert.equal(f.card.shadowRoot.getElementById('lactationSessionCount').textContent,'1');assert.equal(f.card.shadowRoot.getElementById('lactationTotalMl').textContent,'10');assert.equal(JSON.stringify(rows),before);
});
test('recent breastfeeding keeps the newest dated session after importing older sessions',t=>{
 const f=fixture(t,{zone:'server',language:'en-US'});f.card._lang='en';const rows=[{side:'left',duration:1,timestamp:Date.parse('2026-10-21T08:00Z')},...Array.from({length:4},(_,i)=>({side:'right',duration:20+i,timestamp:Date.parse('2026-10-19T08:00Z')+i*60000}))];
 const before=JSON.stringify(rows);f.card._bfSessions=rows;f.card.updateBreastfeedingSessionsList();assert.equal(f.card.shadowRoot.querySelector('#bfSessionsList strong').textContent,'Left');assert.equal(JSON.stringify(rows),before);
});
