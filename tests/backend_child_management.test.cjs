const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture(backend = true) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card.config = {};
  card._hass = { states: {}, user: { is_admin: true }, themes: {} };
  card._backendAvailable = backend;
  card._backendChecked = true;
  card._lang = 'en';
  card.babies = [{ name: 'QA child', entry_id: 'qa-entry' }];
  card.initializeDataStructures();
  dom.window.localStorage.setItem('ha-tools-baby-tracker-children', '[{"name":"QA legacy"}]');
  dom.window.localStorage.setItem('ha-tools-baby-tracker-0', '{"feeding":{"QA legacy":[{"amount":120}]}}');
  card.renderCard();
  return { dom, card };
}

test('server-backed Add child cannot create a browser-only child or replace migration names', () => {
  const { dom, card } = fixture();
  try {
    card._addChild();
    assert.equal(card.babies.length, 1);
    assert.equal(card.babies[0].entry_id, 'qa-entry');
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-children'), '[{"name":"QA legacy"}]');
  } finally { dom.window.close(); }
});

test('server-backed remove cannot delete a local migration record or hide a configured child', () => {
  const { dom, card } = fixture();
  try {
    card.babies.push({ name: 'QA second', entry_id: 'qa-second' });
    dom.window.localStorage.setItem('ha-tools-baby-tracker-1', '{"sleep":[{"duration":20}]}');
    card._removeChild(1);
    assert.equal(card.babies.length, 2);
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-1'), '{"sleep":[{"duration":20}]}');
  } finally { dom.window.close(); }
});

test('cached name editor cannot rename a server child only in the browser', () => {
  const { dom, card } = fixture();
  try {
    const input = dom.window.document.createElement('input');
    input.className = 'child-name-input'; input.dataset.childIdx = '0'; input.value = 'QA wrong name';
    card.shadowRoot.append(input);
    card._saveChildNames();
    assert.equal(card.babies[0].name, 'QA child');
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-children'), '[{"name":"QA legacy"}]');
  } finally { dom.window.close(); }
});

test('server-backed child management offers HA settings instead of ineffective local editors', () => {
  const { dom, card } = fixture();
  try {
    assert.equal(card.shadowRoot.querySelectorAll('.child-name-input').length, 0);
    assert.ok(card.shadowRoot.querySelector('a[href="/config/integrations/dashboard"]'));
  } finally { dom.window.close(); }
});

test('legacy-only Add child still persists a new child in this browser', () => {
  const { dom, card } = fixture(false);
  try {
    card._addChild();
    assert.equal(card.babies.length, 2);
    assert.equal(JSON.parse(dom.window.localStorage.getItem('ha-tools-baby-tracker-children')).length, 2);
  } finally { dom.window.close(); }
});


test('restored server sleep timer keeps End Sleep available after a full card render', () => {
  const { dom, card } = fixture();
  try {
    card._applyBackendTimers({ sleep: { startTime: Date.now() - 30000 }, bf: null });
    card.renderCard();
    card.updateSleepTimerDisplay();
    assert.equal(card.shadowRoot.getElementById('startSleepBtn').style.display, 'none');
    assert.notEqual(card.shadowRoot.getElementById('stopSleepBtn').style.display, 'none');
    assert.match(card.shadowRoot.getElementById('sleepTimerStatus').textContent, /progress/);
    card._applyBackendTimers({ sleep: null, bf: null });
    card.renderCard();
    card.updateSleepTimerDisplay();
    assert.notEqual(card.shadowRoot.getElementById('startSleepBtn').style.display, 'none');
    assert.equal(card.shadowRoot.getElementById('stopSleepBtn').style.display, 'none');
  } finally { dom.window.close(); }
});


test('tab focus survives activation and the resulting server data render', async () => {
  const { dom, card } = fixture();
  try {
    dom.window.document.body.append(card);
    card._hass.callWS = async ({ type, entry_id, category }) => {
      assert.equal(type, 'ha_baby_tracker/get_data');
      assert.equal(entry_id, 'qa-entry');
      return { entry_id, category, data: [], running_timers: { sleep: null, bf: null } };
    };
    const lactation = card.shadowRoot.querySelector('[data-tab="lactation"]');
    lactation.focus();
    lactation.click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(card.selectedTab, 'lactation');
    assert.equal(card.shadowRoot.activeElement?.dataset.tab, 'lactation');
    card.config.title = 'Updated QA label';
    card.renderCard();
    assert.equal(card.shadowRoot.activeElement?.dataset.tab, 'lactation');
  } finally { dom.window.close(); }
});
