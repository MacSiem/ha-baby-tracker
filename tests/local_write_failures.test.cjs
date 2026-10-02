const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card.babies = [{ name: 'Demo' }];
  card.initializeDataStructures();
  card.renderCard = () => {};
  card.updateAllDisplays = () => {};
  card.updateLactationDisplay = () => {};
  const messages = [];
  card._showToast = (message, kind) => messages.push({ message, kind });
  card._saveData();
  const storage = dom.window.localStorage;
  const original = dom.window.Storage.prototype.setItem;
  const rejectWrites = (name = 'QuotaExceededError') => {
    dom.window.Storage.prototype.setItem = () => { throw new dom.window.DOMException('Synthetic storage failure', name); };
  };
  const allowWrites = () => { dom.window.Storage.prototype.setItem = original; };
  return { dom, card, storage, messages, rejectWrites, allowWrites };
}

for (const [method, fields, retained, categories] of [
  ['addFeeding', { feedingType: 'breast', feedingTime: '12:00', feedingAmount: '15 min', feedingNotes: 'keep me' }, 'feedingAmount', ['feeding', 'lactation']],
  ['addDiapers', { diapersType: 'wet', diapersTime: '12:00', diapersNotes: 'keep me' }, 'diapersNotes', ['diapers']],
  ['addManualSleep', { sleepFromTime: '2026-10-02T10:00', sleepToTime: '2026-10-02T11:00' }, 'sleepFromTime', ['sleep']],
  ['addGrowth', { growthType: 'weight', growthValue: '6.5', growthDate: '2026-10-02' }, 'growthValue', ['growth']],
  ['addLactation', { lactationType: 'breastfeed', lactationTime: '12:00', lactationDuration: '15', lactationAmount: '0', lactationNotes: 'keep me' }, 'lactationNotes', ['lactation', 'feeding']],
]) {
  test(`${method}: rejected local write preserves form and history; retry persists exactly once`, async () => {
    const f = fixture();
    try {
      const { card, storage } = f;
      card.shadowRoot.innerHTML = Object.entries(fields).map(([id, value]) => `<input id="${id}" value="${value}">`).join('');
      for (const category of categories) card[category + 'Data'].set('Demo', [{ id: 'old-' + category, notes: 'existing' }]);
      card._saveData();
      const before = storage.getItem(card._storageKey());
      f.rejectWrites(method === 'addGrowth' ? 'SecurityError' : 'QuotaExceededError');
      await card[method]();
      assert.equal(card.shadowRoot.getElementById(retained).value, fields[retained]);
      assert.equal(storage.getItem(card._storageKey()), before);
      for (const category of categories) assert.equal(card[category + 'Data'].get('Demo').length, 1, category + ' must retain only existing history');
      assert.equal(f.messages.length, 1);
      assert.equal(f.messages[0].kind, 'error');
      f.allowWrites();
      await card[method]();
      const persisted = JSON.parse(storage.getItem(card._storageKey()));
      for (const category of categories) {
        assert.equal(card[category + 'Data'].get('Demo').length, 2);
        assert.equal(persisted[category].Demo.length, 2);
        assert.ok(persisted[category].Demo.some(entry => entry.id === 'old-' + category));
      }
      if (categories.length === 2) assert.equal(persisted.feeding.Demo.find(entry => entry.linkedId).linkedId, persisted.lactation.Demo.find(entry => entry.linkedId).linkedId);
      assert.equal(f.messages.length, 1, 'successful retry must not report another failure');
    } finally { f.dom.window.close(); }
  });
}

for (const kind of ['sleep', 'bf']) {
  const start = kind === 'sleep' ? 'startSleepTimer' : '_startBreastfeedingTimer';
  const stop = kind === 'sleep' ? 'stopSleepTimer' : '_stopBreastfeedingTimer';
  const timer = kind === 'sleep' ? 'sleepTimer' : '_bfTimer';
  const started = kind === 'sleep' ? 'sleepStartTime' : '_bfStartTime';
  test(`local ${kind} start does not display a timer after storage rejects it`, async () => {
    const f = fixture();
    try {
      const before = f.storage.getItem(f.card._storageKey());
      f.rejectWrites();
      await f.card[start]('left');
      assert.equal(f.card[timer], null);
      assert.equal(f.card[started], null);
      assert.equal(f.storage.getItem(f.card._storageKey()), before);
      assert.equal(f.messages.length, 1);
    } finally { f.dom.window.close(); }
  });
  test(`local ${kind} stop keeps the running timer on write failure and retry records it once`, async () => {
    const f = fixture();
    try {
      await f.card[start]('left');
      f.card[started] = Date.now() - 120000;
      f.card._saveData();
      const before = f.storage.getItem(f.card._storageKey());
      const running = f.card[timer];
      f.rejectWrites();
      assert.equal(await f.card[stop](), false);
      assert.equal(f.card[timer], running);
      assert.equal(f.storage.getItem(f.card._storageKey()), before);
      assert.equal(kind === 'sleep' ? f.card.sleepData.get('Demo').length : f.card._bfSessions.length, 0);
      assert.equal(f.messages.length, 1);
      f.allowWrites();
      await f.card[stop]();
      assert.equal(f.card[timer], null);
      const saved = JSON.parse(f.storage.getItem(f.card._storageKey()));
      assert.equal(kind === 'sleep' ? saved.sleep.Demo.length : saved.breastfeeding.length, 1);
      assert.equal(saved._runningTimers[kind], null);
    } finally { f.dom.window.close(); }
  });
}
