"use strict";
const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const fs=require('node:fs');
const source=fs.readFileSync('custom_components/ha_baby_tracker/www/ha-baby-tracker.js','utf8');
function fixture(t,{date='system',zone='local',language='pl-PL'}={}) {
 const dom=new JSDOM('',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const Original=w.Intl.DateTimeFormat;
 w.Intl.DateTimeFormat=new Proxy(Original,{construct(Target,args){const f=Reflect.construct(Target,args);if(!args.length){const old=f.resolvedOptions.bind(f);f.resolvedOptions=()=>({...old(),locale:'en-US',timeZone:'America/New_York'});}return f;}});
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
 const f=fixture(t),entry={timestamp:Date.parse('2026-10-20T08:15:09Z'),type:'bottle',amount:120};f.card.feedingData.set('a',[entry]);f.card.renderCard();const before=JSON.stringify(entry);
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
