const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
process.env.TZ = 'Europe/Warsaw';

function fixture(instant) {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  const NativeDate = dom.window.Date;
  dom.window.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new NativeDate(instant).getTime(); }
  };
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  const root = card.shadowRoot || card.attachShadow({ mode: 'open' });
  root.innerHTML = '<input type="date" id="growthDate"><input type="date" id="sleepDate"><input type="datetime-local" id="sleepFromTime"><input type="datetime-local" id="sleepToTime">';
  return { dom, card, root };
}

for (const [label, instant, date, start, end] of [
  ['summer midnight', '2026-09-30T22:30:00Z', '2026-10-01', '2026-10-01T00:30', '2026-10-01T01:30'],
  ['winter midnight', '2026-01-01T23:30:00Z', '2026-01-02', '2026-01-02T00:30', '2026-01-02T01:30'],
  ['autumn clock change', '2026-10-25T00:30:00Z', '2026-10-25', '2026-10-25T02:30', '2026-10-25T03:30'],
  ['spring clock change', '2026-03-29T00:30:00Z', '2026-03-29', '2026-03-29T01:30', '2026-03-29T03:30'],
]) {
  test(`manual sleep and growth defaults use local wall time: ${label}`, () => {
    const { dom, card, root } = fixture(instant);
    try {
      card.setDefaultTimes();
      assert.equal(root.getElementById('sleepFromTime').value, start);
      assert.equal(root.getElementById('sleepToTime').value, end);
      assert.equal(root.getElementById('growthDate').value, date);
      assert.equal(root.getElementById('sleepDate').value, date);
      assert.equal(new Date(start).getTime(), new Date(instant).getTime());
    } finally { dom.window.close(); }
  });
}

test('rerender preserves a manually entered sleep interval', () => {
  const { dom, card, root } = fixture('2026-10-01T12:00:00Z');
  try {
    root.getElementById('sleepFromTime').value = '2026-09-30T23:00';
    root.getElementById('sleepToTime').value = '2026-10-01T02:00';
    card.setDefaultTimes();
    assert.equal(root.getElementById('sleepFromTime').value, '2026-09-30T23:00');
    assert.equal(root.getElementById('sleepToTime').value, '2026-10-01T02:00');
  } finally { dom.window.close(); }
});
