const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture(lang = 'en') {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  // The previous card uses Canvas. Supply its drawing surface so baseline RED
  // reflects absent weekly/dated height features rather than jsdom's missing Canvas.
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return { canvas: this, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillRect() {} };
  };
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card.config = {}; card._lang = lang;
  card._hass = { states: {}, user: { is_admin: true }, themes: {} };
  card._backendAvailable = true; card._backendChecked = true;
  card.babies = [{ name: 'Same', entry_id: 'a' }, { name: 'Same', entry_id: 'b' }];
  card.initializeDataStructures();
  return { dom, card };
}

// Local calendar constructors keep these checks meaningful in any host TZ.
test('weekly summary uses Monday/Sunday dates, previous week, saved records and child identity', () => {
  const { dom, card } = fixture();
  try {
    const instant = new dom.window.Date(2026, 9, 14, 12);
    card.feedingData.set('a', [
      { date: '2026-10-12', type: 'bottle', amount: '120 ml' },
      { date: '2026-10-13', type: 'breast', amount: '15 min', linkedId: 'link1' },
      { date: '2026-10-14', type: 'solid', amount: '20 g' },
      { date: '2026-10-11', type: 'bottle', amount: 90 },
      { type: 'bottle', amount: 200 },
    ]);
    card.lactationData.set('a', [
      { date: '2026-10-13', type: 'breastfeed', amount: 0, linkedId: 'link1' },
      { date: '2026-10-14', type: 'breastfeed', amount: 0 },
      { date: '2026-10-14', type: 'pump', amount: 999 },
    ]);
    card.diapersData.set('a', [{ date: '2026-10-12', type: 'both' }, { type: 'wet' }]);
    card.sleepData.set('a', [{ date: '2026-10-12', duration: 35 }, { date: '2026-10-13' }]);
    card.sleepStartTime = instant.getTime(); // Running timers must not invent saved duration.
    const raw = JSON.stringify(Array.from(card.feedingData));
    const current = card._weeklySummary(0, instant);
    assert.equal(current.start, '2026-10-12'); assert.equal(current.end, '2026-10-18');
    assert.equal(current.feeding.count, 4); assert.equal(current.feeding.volumeMl, 120);
    assert.equal(current.feeding.unknownVolume, 3); assert.equal(current.diapers.wet, 1);
    assert.equal(current.diapers.dirty, 1); assert.equal(current.sleep.minutes, 35);
    assert.equal(current.sleep.unknownDuration, 1); assert.equal(current.undated, 2);
    assert.equal(card._weeklySummary(-1, instant).feeding.volumeMl, 90);
    assert.equal(JSON.stringify(Array.from(card.feedingData)), raw);
    card.selectedBaby = 1;
    assert.equal(card._weeklySummary(0, instant).feeding.count, 0);
    assert.equal(card._weeklySummary(0, instant).sleep.minutes, null);
  } finally { dom.window.close(); }
});

test('local instants win over legacy UTC labels, and invalid dates/amounts stay unknown', () => {
  const { dom, card } = fixture();
  try {
    const start = new dom.window.Date(2026, 9, 12, 0, 15);
    card.feedingData.set('a', [
      { timestamp: start.getTime() / 1000, date: '2026-10-11', type: 'bottle', amount: '80 ml' },
      { date: '2026-10-12', type: 'bottle', amount: '' },
      { date: '2026-10-12', type: 'bottle', amount: false },
      { date: '2026-10-12', type: 'bottle', amount: '-1 ml' },
      { date: '2026-10-99', type: 'bottle', amount: '12 ml' },
    ]);
    card.sleepData.set('a', [{ startTime: start.getTime(), duration: '' }, { date: '2026-10-12', duration: 0 }]);
    const s = card._weeklySummary(0, start);
    assert.equal(s.feeding.count, 4); assert.equal(s.feeding.volumeMl, 80);
    assert.equal(s.feeding.unknownVolume, 3); assert.equal(s.undated, 1);
    assert.equal(s.sleep.minutes, 0); assert.equal(s.sleep.unknownDuration, 1);
  } finally { dom.window.close(); }
});

test('growth uses measurement date, separate units and time spacing; missing values remain in data view', () => {
  const { dom, card } = fixture();
  try {
    card.growthData.set('a', [
      { type: 'weight', date: '2026-09-01', value: 5, timestamp: Date.now() },
      { type: 'weight', date: '2026-09-02', value: 5 },
      { type: 'weight', date: '2026-10-01', value: 6 },
      { type: 'height', date: '2026-09-01', value: 60 },
      { type: 'height', date: '2026-10-01', value: '' },
      { type: 'height', value: 64 },
      { type: 'headCirc', date: '2026-09-01', value: 40 },
    ]);
    card.selectedTab = 'growth'; card.renderCard();
    assert.equal(card.shadowRoot.querySelectorAll('svg.growth-svg').length, 2);
    const points = card._growthSeries('weight');
    const layout = card._growthGeometry(points);
    assert.ok(layout[1].x - layout[0].x < (layout[2].x - layout[1].x) / 20);
    assert.equal(points[0].day, '2026-09-01');
    const heightRows = card._growthSeries('height');
    assert.equal(heightRows[1].value, null); assert.equal(heightRows[2].day, null);
    card.shadowRoot.querySelector('[data-growth-view="data"]').click();
    assert.equal(card.shadowRoot.querySelectorAll('tr[data-growth-row="weight"]').length, points.length);
    assert.equal(card.shadowRoot.querySelectorAll('tr[data-growth-row="height"]').length, heightRows.length);
    assert.match(card.shadowRoot.textContent, /Missing|Unknown/);
    card.shadowRoot.querySelector('[data-growth-view="chart"]').click();
    const button = card.shadowRoot.querySelector('button[data-growth-point="weight:0"]');
    button.focus(); button.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.match(card.shadowRoot.querySelector('[data-growth-detail="weight"]').textContent, /2026-09-01.*5.*kg/);
    card.selectedBaby = 1; card.updateGrowthChart();
    assert.equal(card.shadowRoot.querySelectorAll('button[data-growth-point]').length, 0);
  } finally { dom.window.close(); }
});

for (const values of [[], [6], [6, 6]]) test(`growth edge geometry ${JSON.stringify(values)} remains finite`, () => {
  const { dom, card } = fixture('pl');
  try {
    card.growthData.set('a', values.map((value, i) => ({ type: 'weight', date: `2026-10-${12 + i}`, value })));
    card.selectedTab = 'growth'; card.renderCard();
    const geometry = card._growthGeometry(card._growthSeries('weight'));
    assert.ok(geometry.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
    assert.doesNotMatch(card.shadowRoot.querySelector('#growthCharts').innerHTML, /NaN|Infinity/);
    assert.match(card.shadowRoot.textContent, /Masa|Wzrost/);
  } finally { dom.window.close(); }
});

test('growth period filters chart/data together without discarding undated records', () => {
  const { dom, card } = fixture();
  try {
    card.growthData.set('a', [{ type: 'weight', date: '2000-01-01', value: 4 }, { type: 'weight', value: 5 }]);
    card.selectedTab = 'growth'; card.renderCard();
    const period = card.shadowRoot.querySelector('#growthPeriod'); period.value = '30';
    period.dispatchEvent(new dom.window.Event('change'));
    assert.equal(card._growthSeries('weight').length, 1);
    assert.equal(card._growthSeries('weight')[0].day, null);
    card.shadowRoot.querySelector('[data-growth-view="data"]').click();
    assert.equal(card.shadowRoot.querySelectorAll('tr[data-growth-row="weight"]').length, 1);
  } finally { dom.window.close(); }
});

test('each growth chart has readable numeric ticks in its own measurement unit', () => {
  const { dom, card } = fixture();
  try {
    card.growthData.set('a', [{ type: 'weight', date: '2026-09-01', value: 5 },
      { type: 'weight', date: '2026-10-01', value: 6 }, { type: 'height', date: '2026-09-01', value: 60 },
      { type: 'height', date: '2026-10-01', value: 64 }]);
    card.selectedTab = 'growth'; card.renderCard();
    for (const [type, unit, low, high] of [['weight', 'kg', 5, 6], ['height', 'cm', 60, 64]]) {
      const ticks = [...card.shadowRoot.querySelectorAll(`[data-growth-metric="${type}"] [data-growth-tick]`)];
      assert.ok(ticks.length >= 3);
      const values = ticks.map(tick => Number(tick.dataset.growthTick));
      assert.ok(values.every(Number.isFinite));
      assert.ok(Math.min(...values) <= low && Math.max(...values) >= high);
      assert.match(card.shadowRoot.querySelector(`[data-growth-metric="${type}"] svg`).textContent, new RegExp(unit));
    }
  } finally { dom.window.close(); }
});

test('an unconfirmed backend cannot present unloaded weekly records as measured zero', () => {
  const { dom, card } = fixture();
  try {
    card._backendDetectionFailed = true; card.renderCard();
    const summary = card.shadowRoot.querySelector('#weeklyStats');
    assert.match(summary.textContent, /Unconfirmed/);
    assert.equal(summary.querySelectorAll('.stat-card').length, 0);
  } finally { dom.window.close(); }
});
