const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture(backend = false) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card._backendAvailable = backend;
  card.babies = [{ name: 'QA child', entry_id: 'qa-one' }];
  card.lactationData.set('QA child', [{ amount: '120 ml', timestamp: 1000 }]);
  card._bfSessions = [{ side: 'left', duration: 10, timestamp: 2000 }];
  card.sleepStartTime = 111; card._bfStartTime = 222; card._bfCurrentSide = 'right';
  dom.window.confirm = () => true;
  dom.window.Blob = Blob;
  const downloads = [];
  dom.window.URL.createObjectURL = blob => { downloads.push(blob); return 'blob:http://localhost/qa-export'; };
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = () => {};
  return { card, dom, downloads };
}

test('JSON download preserves lactation, breastfeeding sessions and both running timers', async () => {
  const { card, dom, downloads } = fixture();
  try {
    await card.exportData();
    const data = JSON.parse(await downloads[0].text());
    assert.deepEqual(data.lactation, { 'QA child': [{ amount: '120 ml', timestamp: 1000 }] });
    assert.deepEqual(data.breastfeeding, [{ side: 'left', duration: 10, timestamp: 2000 }]);
    assert.equal(data._runningTimers.sleep.startTime, 111);
    assert.equal(data._runningTimers.bf.startTime, 222);
    assert.equal(data._runningTimers.bf.side, 'right');
  } finally { dom.window.close(); }
});

test('server backup fetches unvisited children and preserves their IDs, categories and timers', async () => {
  const { card, dom, downloads } = fixture(true);
  try {
    card._hass = { callWS: async request => {
      if (request.type === 'ha_baby_tracker/list_children') return { children: [
        { entry_id: 'qa-one', name: 'Same name', device_id: 'device-one', date_of_birth: null },
        { entry_id: 'qa-two', name: 'Same name', device_id: 'device-two', date_of_birth: null },
      ] };
      assert.equal(request.type, 'ha_baby_tracker/get_data');
      assert.ok(['qa-one', 'qa-two'].includes(request.entry_id));
      return { entry_id: request.entry_id, category: request.category,
        data: [{ timestamp: request.entry_id === 'qa-one' ? 10 : 20 }],
        running_timers: { sleep: { startTime: request.entry_id === 'qa-one' ? 100 : 200 }, bf: null } };
    } };
    await card.exportData();
    const data = JSON.parse(await downloads[0].text());
    assert.deepEqual(data.children.map(child => child.entry_id), ['qa-one', 'qa-two']);
    assert.deepEqual(data.children[1].data.lactation, [{ timestamp: 20 }]);
    assert.deepEqual(data.children[1].data.bf_sessions, [{ timestamp: 20 }]);
    assert.equal(data.children[1].running_timers.sleep.startTime, 200);
  } finally { dom.window.close(); }
});

test('failed server read does not download a misleading partial backup', async () => {
  const { card, dom, downloads } = fixture(true);
  try {
    card._hass = { callWS: async () => { throw new Error('QA unavailable'); } };
    await card.exportData();
    assert.equal(downloads.length, 0);
  } finally { dom.window.close(); }
});
