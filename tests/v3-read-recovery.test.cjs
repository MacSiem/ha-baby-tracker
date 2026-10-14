const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const installDialogHarness = require('./helpers/native-dialog.cjs');

function fixture() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  installDialogHarness(dom.window);
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  const connection = new dom.window.EventTarget();
  connection.connected = true;
  connection.socket = { readyState: 1 };
  connection.subscribeMessage = async () => () => {};
  card._hass = { user: { id: 'qa', is_admin: true }, connection, states: {}, themes: {}, config: { time_zone: 'Europe/Warsaw' } };
  card.config = {}; card._backendChecked = true;
  card.babies = [{ name: 'QA', entry_id: 'qa' }];
  card.initializeDataStructures();
  dom.window.document.body.append(card);
  card._backendAvailable = true;
  card.selectedTab = 'growth'; card.renderCard();
  return { dom, card, connection };
}
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };

test('completed breastfeeding timer sessions count in the week; linked records still count once', () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('qa', [{ type: 'breast', date: '2026-10-13', linkedId: 'paired' }]);
    card.lactationData.set('qa', [{ type: 'breastfeed', date: '2026-10-13', linkedId: 'paired' }]);
    card._bfSessions = [{ timestamp: Date.parse('2026-10-14T10:00:00Z'), duration: 61, side: 'left' }];
    card._bfStartTime = Date.parse('2026-10-14T11:00:00Z');
    const result = card._weeklySummary(0, new dom.window.Date(2026, 9, 14, 12));
    assert.equal(result.feeding.count, 2);
    assert.equal(result.feeding.unknownVolume, 2);
    assert.equal(result.feeding.volumeMl, null);
  } finally { dom.window.close(); }
});

test('failed data reads never present empty or retained weekly/growth data as confirmed', async () => {
  for (const retained of [false, true]) {
    const { dom, card } = fixture();
    try {
      if (retained) {
        card.feedingData.set('qa', [{ type: 'bottle', amount: 83, timestamp: Date.now() }]);
        card.growthData.set('qa', [{ type: 'weight', date: '2026-10-14', value: 5 }]);
      }
      card._hass.callWS = async () => { throw new Error('synthetic read failure'); };
      await card._loadBackendData(); card.renderCard();
      const weekly = card.shadowRoot.getElementById('weeklyStats');
      const growth = card.shadowRoot.getElementById('growthCharts');
      assert.match(weekly.textContent, /Unconfirmed|Niepotwierdzon/i);
      assert.equal(weekly.querySelectorAll('.stat-card').length, 0);
      assert.match(growth.textContent, /Unconfirmed|Niepotwierdzon/i);
      assert.equal(growth.querySelectorAll('svg,table').length, 0);
      if (retained) assert.equal(card.feedingData.get('qa')[0].amount, 83);
    } finally { dom.window.close(); }
  }
});

test('ready/online replace an invalidated read once and reject its late records and timers', async () => {
  const { dom, card, connection } = fixture();
  try {
    const pending = [];
    card._hass.callWS = request => new Promise(resolve => pending.push({ request, resolve }));
    const old = card._loadBackendData();
    assert.equal(pending.length, 6);
    connection.connected = false;
    connection.dispatchEvent(new dom.window.Event('disconnected'));
    connection.connected = true;
    connection.dispatchEvent(new dom.window.Event('ready'));
    dom.window.dispatchEvent(new dom.window.Event('online'));
    await settle();
    assert.equal(pending.length, 12, 'one replacement read of all six categories');
    for (const { request, resolve } of pending.slice(6)) resolve({ entry_id: 'qa', category: request.category,
      data: request.category === 'feeding' ? [{ type: 'bottle', amount: 91, timestamp: Date.now() }] : [],
      running_timers: { sleep: { startTime: 2000 }, bf: null } });
    await settle();
    assert.equal(card.feedingData.get('qa')[0].amount, 91);
    assert.equal(card.sleepStartTime, 2000);
    for (const { request, resolve } of pending.slice(0, 6)) resolve({ entry_id: 'qa', category: request.category,
      data: request.category === 'feeding' ? [{ amount: 12 }] : [],
      running_timers: { sleep: { startTime: 1000 }, bf: null } });
    await old; await settle();
    assert.equal(card.feedingData.get('qa')[0].amount, 91);
    assert.equal(card.sleepStartTime, 2000);
    assert.equal(card._backendLoading, false);
    assert.equal(pending.length, 12, 'no automatic repeated retry');
  } finally { dom.window.close(); }
});
