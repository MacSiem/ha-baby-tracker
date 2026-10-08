const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function cardWithLocalData() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components', 'ha_baby_tracker', 'www', 'ha-baby-tracker.js'), 'utf8'));
  dom.window.localStorage.setItem('ha-tools-baby-tracker-children', '[{"name":"Ala"}]');
  dom.window.localStorage.setItem('ha-tools-baby-tracker-0', JSON.stringify({ feeding: { Ala: [{ timestamp: 1000 }, { timestamp: 2000 }] } }));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card._backendAvailable = true;
  card._lang = 'en';
  card._loadBackendData = async () => {};
  return { card, dom };
}

test('migration confirms exact backend preview before writing local records', async () => {
  const { card, dom } = cardWithLocalData();
  try {
    const requests = [];
    const messages = [];
    card._hass = { user: { is_admin: true }, callWS: async (request) => {
      requests.push(request);
      return request.dry_run
        ? { preview: { entries: 2, timers: 0, targets: 1, unmigrated: [], ambiguous: [], skipped_non_empty: {} } }
        : { migrated: { entry_1: {} }, unmigrated: [], ambiguous: [], skipped_non_empty: {} };
    } };
    dom.window.confirm = message => { messages.push(message); return true; };
    dom.window.alert = () => {};

    await card._promptLocalMigration();

    assert.equal(requests.length, 2);
    assert.equal(requests[0].dry_run, true);
    assert.ok(messages[0].includes('2'));
    assert.equal(requests[1].dry_run, undefined);
    assert.equal(JSON.parse(dom.window.localStorage.getItem('ha-baby-tracker-v5-migration-prompted')).status, 'done');
  } finally { dom.window.close(); }
});

test('ambiguous child mapping performs no migration and preserves local records for retry', async () => {
  const { card, dom } = cardWithLocalData();
  try {
    const requests = [];
    card._hass = { user: { is_admin: true }, callWS: async (request) => {
      requests.push(request);
      return { preview: { entries: 0, timers: 0, targets: 0, unmigrated: [], ambiguous: [{ name: 'Ala', reason: 'duplicate_target_name' }], skipped_non_empty: {} } };
    } };
    dom.window.alert = () => {};
    dom.window.confirm = () => true;

    await card._promptLocalMigration();

    assert.equal(requests.length, 1);
    assert.equal(requests[0].dry_run, true);
    assert.equal(dom.window.localStorage.getItem('ha-baby-tracker-v5-migration-prompted'), null);
    assert.ok(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'));
  } finally { dom.window.close(); }
});

test('record added after preview keeps migration retryable', async () => {
  const { card, dom } = cardWithLocalData();
  try {
    card._hass = { user: { is_admin: true }, callWS: async request => request.dry_run
      ? { preview: { entries: 2, timers: 0, targets: 1, unmigrated: [], ambiguous: [], skipped_non_empty: {} } }
      : { migrated: { entry_1: { migrated: {}, skipped_non_empty: ['feeding'] } }, unmigrated: [], ambiguous: [], skipped_non_empty: {} } };
    dom.window.confirm = () => true;
    dom.window.alert = () => {};
    await card._promptLocalMigration();
    assert.equal(JSON.parse(dom.window.localStorage.getItem('ha-baby-tracker-v5-migration-prompted')).status, 'partial');
    assert.ok(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'));
  } finally { dom.window.close(); }
});


test('cancelled migration can be retried from ordinary Config UI after reopening the card', async () => {
  const { card, dom } = cardWithLocalData();
  try {
    const raw = dom.window.localStorage.getItem('ha-tools-baby-tracker-0');
    const requests = [];
    const hass = { states: {}, user: { is_admin: true }, callWS: async request => {
      requests.push(request);
      return request.dry_run
        ? { preview: { entries: 2, timers: 0, targets: 1, unmigrated: [], ambiguous: [], skipped_non_empty: {} } }
        : { migrated: { entry_1: {} }, unmigrated: [], ambiguous: [], skipped_non_empty: {} };
    } };
    card._hass = hass;
    dom.window.confirm = () => false;
    dom.window.alert = () => {};
    await card._promptLocalMigration();
    assert.equal(JSON.parse(dom.window.localStorage.getItem('ha-baby-tracker-v5-migration-prompted')).status, 'declined');
    const reopened = dom.window.document.createElement('ha-baby-tracker');
    reopened.config = {};
    reopened._hass = hass;
    reopened._backendAvailable = true;
    reopened._backendChecked = true;
    reopened._lang = 'en';
    reopened._loadBackendData = async () => {};
    reopened.selectedTab = 'config';
    await reopened._promptLocalMigration();
    assert.equal(requests.length, 1, 'cancel does not cause automatic reprompt');
    reopened.renderCard();
    const button = reopened.shadowRoot.getElementById('retryLocalMigrationBtn');
    assert.ok(button, 'Config offers a normal user action without editing storage markers');
    assert.equal(button.disabled, false);
    dom.window.confirm = () => true;
    button.click();
    for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.length, 3);
    assert.equal(requests[1].dry_run, true, 'retry obtains a new backend preview');
    assert.equal(requests[2].dry_run, undefined);
    assert.equal(JSON.parse(dom.window.localStorage.getItem('ha-baby-tracker-v5-migration-prompted')).status, 'done');
    assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), raw);
    reopened.renderCard();
    assert.equal(reopened.shadowRoot.getElementById('retryLocalMigrationBtn'), null, 'completed migration is not offered twice');
    await reopened._promptLocalMigration(true);
    assert.equal(requests.length, 3);
  } finally { dom.window.close(); }
});
