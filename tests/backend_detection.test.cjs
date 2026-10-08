const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [process.cwd()] }));

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(process.cwd(), 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  dom.window.confirm = () => false;
  const card = dom.window.document.createElement('ha-baby-tracker');
  card.config = {};
  card.selectedTab = 'feeding';
  card._lang = 'en';
  card._hass = { states: {}, user: { is_admin: true } };
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
