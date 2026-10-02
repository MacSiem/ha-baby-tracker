const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card._backendAvailable = true;
  card._backendChecked = true;
  card.babies = [{ name: 'Alex', entry_id: 'child-a' }, { name: 'Alex', entry_id: 'child-b' }];
  card._hass = { states: {}, user: { is_admin: true } };
  card.renderCard = () => {};
  card.updateAllDisplays = () => {};
  card._showToast = () => {};
  card.initializeDataStructures();
  return { card, dom };
}

function reply(request, amount, timers = { sleep: null, bf: null }) {
  return { entry_id: request.entry_id, category: request.category,
    data: request.category === 'feeding' ? [{ id: request.entry_id, amount }] : [], running_timers: timers };
}

test('server children with equal display names retain separate cached records', async () => {
  const { card, dom } = fixture();
  try {
    card._hass.callWS = async request => reply(request, request.entry_id === 'child-a' ? 100 : 200);
    await card._loadBackendData();
    const firstKey = card.getCurrentBaby();
    card.selectedBaby = 1;
    await card._loadBackendData();
    assert.notEqual(card.getCurrentBaby(), firstKey);
    assert.equal(card.feedingData.get(firstKey)[0].amount, 100);
    assert.equal(card.feedingData.get(card.getCurrentBaby())[0].amount, 200);
  } finally { dom.window.close(); }
});

test('changing child during an in-flight read loads the selected child and ignores old timers', async () => {
  const { card, dom } = fixture();
  try {
    const oldRequests = [];
    const applied = [];
    card._applyBackendTimers = timers => applied.push(timers);
    card._hass.callWS = request => request.entry_id === 'child-a'
      ? new Promise(resolve => oldRequests.push(() => resolve(reply(request, 100, { sleep: { startTime: 1000 }, bf: null }))))
      : Promise.resolve(reply(request, 200));
    const oldRead = card._loadBackendData();
    card.selectedBaby = 1;
    await card._loadBackendData();
    oldRequests.forEach(resolve => resolve());
    await oldRead;
    assert.equal(card.feedingData.get(card.getCurrentBaby())[0].amount, 200);
    assert.ok(applied.length > 0);
    assert.ok(applied.every(timers => timers.sleep === null));
  } finally { dom.window.close(); }
});

test('an update while a read is pending cannot leave the older response displayed', async () => {
  const { card, dom } = fixture();
  try {
    const oldRequests = [];
    card._hass.callWS = request => new Promise(resolve => oldRequests.push(() => resolve(reply(request, 100))));
    const oldRead = card._loadBackendData();
    card._hass.callWS = async request => reply(request, 200);
    await card._loadBackendData();
    oldRequests.forEach(resolve => resolve());
    await oldRead;
    assert.equal(card.feedingData.get(card.getCurrentBaby())[0].amount, 200);
  } finally { dom.window.close(); }
});

test('stopping a server sleep timer before 30 seconds still stops it on the server', async () => {
  const { card, dom } = fixture();
  try {
    const calls = [];
    card._hass.callWS = async request => { calls.push(request); return {}; };
    card.sleepStartTime = Date.now() - 1000;
    card.sleepTimer = dom.window.setInterval(() => {}, 100);
    await card.stopSleepTimer();
    assert.equal(calls.filter(x => x.type === 'ha_baby_tracker/timer_stop').length, 1);
    assert.equal(calls[0].entry_id, 'child-a');
    assert.equal(card.sleepTimer, null);
  } finally { dom.window.close(); }
});

test('an immediate server breastfeeding stop is not discarded by rounded duration', async () => {
  const { card, dom } = fixture();
  try {
    const calls = [];
    card._hass.callWS = async request => { calls.push(request); return {}; };
    card._bfStartTime = Date.now();
    card._bfCurrentSide = 'left';
    card._bfTimer = dom.window.setInterval(() => {}, 100);
    await card._stopBreastfeedingTimer();
    assert.equal(calls.filter(x => x.type === 'ha_baby_tracker/timer_stop').length, 1);
    assert.equal(card._bfTimer, null);
  } finally { dom.window.close(); }
});

for (const [method, category, fields, retained] of [
  ['addFeeding', 'feeding', { feedingType: 'bottle', feedingTime: '12:00', feedingAmount: '150', feedingNotes: 'keep me' }, 'feedingAmount'],
  ['addDiapers', 'diapers', { diapersType: 'wet', diapersTime: '12:00', diapersNotes: 'keep me' }, 'diapersNotes'],
  ['addManualSleep', 'sleep', { sleepFromTime: '2026-10-02T10:00', sleepToTime: '2026-10-02T11:00' }, 'sleepFromTime'],
  ['addGrowth', 'growth', { growthType: 'weight', growthValue: '6.5', growthDate: '2026-10-02' }, 'growthValue'],
  ['addLactation', 'lactation', { lactationType: 'pump', lactationTime: '12:00', lactationAmount: '150', lactationNotes: 'keep me' }, 'lactationAmount'],
]) {
  test(`${method} retains the form and does not show an unsaved server record`, async () => {
    const { card, dom } = fixture();
    try {
      card.shadowRoot.innerHTML = Object.entries(fields).map(([id, value]) => `<input id="${id}" value="${value}">`).join('');
      const messages = [];
      card._showToast = message => messages.push(message);
      card._hass.callWS = async () => { throw new Error('storage unavailable'); };
      await card[method]();
      await Promise.resolve();
      assert.equal(card.shadowRoot.getElementById(retained).value, fields[retained]);
      assert.equal(card[`${category}Data`].get(card.getCurrentBaby()).length, 0);
      assert.equal(messages.length, 1);
      assert.doesNotMatch(messages[0], /saved locally|zapisane lokalnie/i);
    } finally { dom.window.close(); }
  });
}

for (const kind of ['sleep', 'bf']) {
  test(`failed ${kind} stop preserves the running timer and does not invent history`, async () => {
    const { card, dom } = fixture();
    try {
      card._hass.callWS = async () => { throw new Error('storage unavailable'); };
      card._applyBackendTimers({ [kind]: { startTime: Date.now() - 120000, side: 'left' } });
      await card[kind === 'sleep' ? 'stopSleepTimer' : '_stopBreastfeedingTimer']();
      assert.ok(kind === 'sleep' ? card.sleepTimer : card._bfTimer);
      assert.equal(kind === 'sleep' ? card.sleepData.get(card.getCurrentBaby()).length : card._bfSessions.length, 0);
    } finally { dom.window.close(); }
  });
  test(`failed ${kind} start does not display an unpersisted timer`, async () => {
    const { card, dom } = fixture();
    try {
      card._hass.callWS = async () => { throw new Error('storage unavailable'); };
      await card[kind === 'sleep' ? 'startSleepTimer' : '_startBreastfeedingTimer']('left');
      assert.ok(!(kind === 'sleep' ? card.sleepTimer : card._bfTimer));
    } finally { dom.window.close(); }
  });
}

test('browser-only writes stay local without reporting a server synchronization error', async () => {
  const { card, dom } = fixture();
  try {
    card._backendAvailable = false;
    card.initializeDataStructures();
    card.shadowRoot.innerHTML = '<input id="growthType" value="weight"><input id="growthValue" value="6.5"><input id="growthDate" value="2026-10-02">';
    const messages = [];
    card._showToast = message => messages.push(message);
    await card.addGrowth();
    await Promise.resolve();
    assert.equal(card.growthData.get('Alex').length, 1);
    assert.equal(messages.length, 0);
  } finally { dom.window.close(); }
});
