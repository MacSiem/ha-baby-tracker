const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [process.cwd()] }));
const installDialogHarness = require('./helpers/native-dialog.cjs');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  installDialogHarness(dom.window);
  dom.window.eval(readFileSync(join(process.cwd(), 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  dom.window.confirm = () => false;
  const card = dom.window.document.createElement('ha-baby-tracker');
  card.config = {};
  card.selectedTab = 'feeding';
  card._lang = 'en';
  card._hass = { states: {}, user: { is_admin: true }, config: { state: 'RUNNING', components: [] } };
  // Core readiness is an independent HA command, including when this custom
  // integration's discovery command is missing during startup.
  let backendWS;
  Object.defineProperty(card._hass, 'callWS', {
    configurable: true, enumerable: true,
    get: () => backendWS && (request => request.type === 'get_config'
      ? Promise.resolve(card._hass.config) : backendWS(request)),
    set: value => { backendWS = value; },
  });
  dom.window.document.body.append(card);
  card.renderCard();
  return { dom, card };
}

test('initial transport failure retries without a page reload and resumes shared data', async () => {
  const { dom, card } = fixture();
  try {
    let now = 10000, attempts = 0;
    dom.window.Date.now = () => now;
    card._hass.callWS = async request => {
      if (request.type === 'ha_baby_tracker/list_children') {
        if (++attempts === 1) throw { code: 'connection_lost' };
        return { children: [{ name: 'QA', entry_id: 'qa-child' }] };
      }
      assert.equal(request.type, 'ha_baby_tracker/get_data');
      return { entry_id: 'qa-child', category: request.category,
        data: request.category === 'feeding' ? [{ id: 'record-1', amount: 150 }] : [],
        running_timers: { sleep: null, bf: null } };
    };
    await card._ensureBackend();
    await card._ensureBackend();
    assert.equal(attempts, 1, 'retries must be bounded');
    now += 6000;
    await card._ensureBackend();
    assert.equal(attempts, 2, 'a failed probe must not be remembered permanently');
    assert.equal(card._backendAvailable, true);
    assert.equal(card.feedingData.get('qa-child')[0].amount, 150);
  } finally { dom.window.close(); }
});

test('failed detection preserves local data and refuses a browser-only save', async () => {
  const { dom, card } = fixture();
  try {
    const baseline = '{"feeding":{"Baby 1":[{"amount":90}]}}';
    dom.window.localStorage.setItem('ha-tools-baby-tracker-0', baseline);
    card._hass.callWS = async () => { throw { code: 'unauthorized' }; };
    await card._ensureBackend();
    const baby = card.getCurrentBaby();
    assert.equal(await card._saveEntries([{ category: 'feeding', entry: { amount: 150 } }]), false);
    assert.equal(card.feedingData.get(baby).length, 0);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), baseline);
    assert.match(card.shadowRoot.textContent, /connect|connection|retry|try again/i);
  } finally { dom.window.close(); }
});

test('failed detection cannot remove, add or rename local migration profiles', async () => {
  const { dom, card } = fixture();
  try {
    card.babies = [{ name: 'First' }, { name: 'Second' }];
    dom.window.localStorage.setItem('ha-tools-baby-tracker-1', 'kept');
    card._hass.callWS = async () => { throw { code: 'connection_lost' }; };
    await card._ensureBackend();
    card._removeChild(1);
    card._addChild();
    const input = dom.window.document.createElement('input');
    input.className = 'child-name-input'; input.dataset.childIdx = '0'; input.value = 'Wrong';
    card.shadowRoot.append(input);
    card._saveChildNames();
    assert.deepEqual(Array.from(card.babies, baby => baby.name), ['First', 'Second']);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-1'), 'kept');
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-children'), null);
  } finally { dom.window.close(); }
});

test('failed detection does not download a local-only file as a complete backup', async () => {
  const { dom, card } = fixture();
  try {
    card._hass.callWS = async () => { throw { code: 'connection_lost' }; };
    await card._ensureBackend();
    dom.window.confirm = () => true;
    let downloads = 0;
    dom.window.URL.createObjectURL = () => { downloads++; return 'blob:qa'; };
    dom.window.URL.revokeObjectURL = () => {};
    dom.window.HTMLAnchorElement.prototype.click = () => {};
    await card.exportData();
    assert.equal(downloads, 0);
  } finally { dom.window.close(); }
});

test('an absent integration still supports the documented legacy save', async () => {
  const { dom, card } = fixture();
  try {
    card._hass.callWS = async () => { throw { code: 'unknown_command' }; };
    await card._ensureBackend();
    assert.equal(await card._saveEntries([{ category: 'feeding', entry: { amount: 150 } }]), true);
    assert.equal(JSON.parse(dom.window.localStorage.getItem('ha-tools-baby-tracker-0')).feeding['Baby 1'][0].amount, 150);
  } finally { dom.window.close(); }
});

for (const answer of ['unknown_command', 'empty']) test(`startup ${answer} cannot prove that server storage is absent`, async () => {
  const { dom, card } = fixture();
  try {
    card._hass.config = { state: 'STARTING', components: [] };
    card._hass.callWS = async () => {
      if (answer === 'unknown_command') throw { code: 'unknown_command' };
      return { children: [] };
    };
    await card._ensureBackend();
    assert.equal(card._backendChecked, false, 'startup must not permanently select browser storage');
    assert.equal(card._backendDetectionFailed, true);
    assert.equal(card._saveData(), false);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), null);
  } finally { dom.window.close(); }
});

test('a loaded integration with a missing command is unconfirmed rather than browser-only', async () => {
  const { dom, card } = fixture();
  try {
    card._hass.config = { state: 'RUNNING', components: ['ha_baby_tracker'] };
    card._hass.callWS = async () => { throw { code: 'unknown_command' }; };
    await card._ensureBackend();
    assert.equal(card._backendChecked, false);
    assert.equal(card._backendDetectionFailed, true);
    assert.equal(card._saveData(), false);
  } finally { dom.window.close(); }
});

test('startup discovery retries without another hass update and restores saved records and timer', async () => {
  const { dom, card } = fixture();
  try {
    let now = 10000;
    dom.window.Date.now = () => now;
    const retries = [];
    const originalTimeout = dom.window.setTimeout.bind(dom.window);
    dom.window.setTimeout = (callback, delay, ...args) => {
      if (delay >= 4900) { retries.push(callback); return 12345; }
      return originalTimeout(callback, delay, ...args);
    };
    card._hass.config = { state: 'STARTING', components: [] };
    card._hass.callWS = async request => {
      if (request.type === 'ha_baby_tracker/list_children') {
        if (card._hass.config.state !== 'RUNNING') throw { code: 'unknown_command' };
        return { children: [{ name: 'QA', entry_id: 'qa-child' }] };
      }
      assert.equal(request.type, 'ha_baby_tracker/get_data');
      return { entry_id: 'qa-child', category: request.category,
        data: request.category === 'feeding' ? [{ amount: 91 }] : [],
        running_timers: { sleep: { startTime: 3000 }, bf: null } };
    };
    card._promptLocalMigration = async () => {};
    await card._ensureBackend(); await card._ensureBackend();
    assert.equal(retries.length, 1, 'one bounded discovery retry');
    now += 6000;
    card._hass.config = { state: 'RUNNING', components: ['ha_baby_tracker'] };
    retries.shift()();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(card._backendAvailable, true);
    assert.equal(card.feedingData.get('qa-child')[0].amount, 91);
    assert.equal(card.sleepStartTime, 3000);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), null);
  } finally { dom.window.close(); }
});

test('a discovery retry consumed offline is rearmed by online without a hass update', async () => {
  const { dom, card } = fixture();
  try {
    let now = 10000;
    dom.window.Date.now = () => now;
    const retries = [];
    const originalTimeout = dom.window.setTimeout.bind(dom.window);
    dom.window.setTimeout = (callback, delay, ...args) => {
      if (delay >= 4900 || delay === 0) { retries.push(callback); return 12345; }
      return originalTimeout(callback, delay, ...args);
    };
    card._hass.config = { state: 'STARTING', components: [] };
    card._hass.callWS = async request => request.type === 'ha_baby_tracker/list_children'
      ? { children: [{ name: 'Recovered', entry_id: 'recovered' }] }
      : { entry_id: 'recovered', category: request.category, data: [], running_timers: { sleep: null, bf: null } };
    card._promptLocalMigration = async () => {};
    await card._ensureBackend();
    assert.equal(retries.length, 1);
    dom.window.dispatchEvent(new dom.window.Event('offline'));
    now += 6000;
    retries.shift()();
    assert.equal(card._backendAvailable, false);
    card._hass.config = { state: 'RUNNING', components: ['ha_baby_tracker'] };
    dom.window.dispatchEvent(new dom.window.Event('online'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(retries.length, 1, 'online must rearm the consumed read retry');
    retries.shift()();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(card._backendAvailable, true);
    assert.equal(card._currentBackendEntryId(), 'recovered');
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), null);
  } finally { dom.window.close(); }
});

test('malformed discovery is a failed read rather than an empty integration', async () => {
  const { dom, card } = fixture();
  try {
    card._hass.callWS = async () => ({ unrelated: true });
    await card._ensureBackend();
    assert.equal(card._saveData(), false);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), null);
  } finally { dom.window.close(); }
});

test('pending discovery cannot commit local data or download a partial backup', async () => {
  const { dom, card } = fixture();
  try {
    let resolve;
    card._hass.callWS = () => new Promise(done => { resolve = done; });
    const pending = card._ensureBackend();
    assert.equal(card._saveData(), false);
    card._addChild();
    assert.equal(card.babies.length, 1);
    dom.window.confirm = () => { throw new Error('Export must stop before confirmation'); };
    await card.exportData();
    resolve({ children: [] });
    await pending;
    assert.equal(card._saveData(), true, 'a validated empty integration retains legacy mode');
  } finally { dom.window.close(); }
});

test('an initialization error after valid discovery does not switch backend writes to local storage', async () => {
  const { dom, card } = fixture();
  try {
    card._hass.callWS = async request => {
      if (request.type === 'ha_baby_tracker/list_children') return { children: [{ name: 'QA', entry_id: 'qa-child' }] };
      if (request.type === 'ha_baby_tracker/get_data') return { entry_id: 'qa-child', category: request.category,
        data: [], running_timers: { sleep: null, bf: null } };
      assert.equal(request.type, 'ha_baby_tracker/add_entries');
      throw { code: 'connection_lost' };
    };
    card._promptLocalMigration = async () => { throw new Error('Migration initialization failed'); };
    await card._ensureBackend();
    assert.equal(card._backendAvailable, true);
    assert.equal(await card._saveEntries([{ category: 'feeding', entry: { amount: 150 } }]), false);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), null);
  } finally { dom.window.close(); }
});


test('ordinary card config changes preserve selected backend identity, tab and shared writes', async () => {
  const { dom, card } = fixture();
  try {
    const requests = [];
    card._hass.callWS = async request => {
      requests.push(request);
      if (request.type === 'ha_baby_tracker/list_children') return { children: [
        { name: 'Same name', entry_id: 'child-first' }, { name: 'Same name', entry_id: 'child-second' }
      ] };
      if (request.type === 'ha_baby_tracker/get_data') return { entry_id: request.entry_id,
        category: request.category, data: request.category === 'feeding' ? [{ id: 'kept', amount: 120 }] : [],
        running_timers: { sleep: null, bf: null } };
      assert.equal(request.type, 'ha_baby_tracker/add_entries');
      assert.equal(request.entry_id, 'child-second');
      return { entries: request.entries.map(item => ({ category: item.category, entry: { ...item.entry, id: 'saved' } })) };
    };
    await card._ensureBackend();
    card.selectedBaby = 1;
    card.selectedTab = 'sleep';
    await card._loadBackendData();
    const sharedCache = card.feedingData.get('child-second');
    card.setConfig({ title: 'Changed by dashboard editor', babies: [{ name: 'Legacy config' }] });
    assert.equal(card._currentBackendEntryId(), 'child-second');
    assert.equal(card.selectedTab, 'sleep');
    assert.equal(card.feedingData.get('child-second'), sharedCache);
    assert.equal(card.babies.length, 2);
    assert.equal(await card._saveEntries([{ category: 'feeding', entry: { amount: 150 } }]), true);
    assert.equal(requests.filter(request => request.type === 'ha_baby_tracker/list_children').length, 1);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-children'), null);
  } finally { dom.window.close(); }
});
