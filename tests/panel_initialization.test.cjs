const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

test('sidebar panel initializes the card without Lovelace setConfig', () => {
  const dom = new JSDOM('', { runScripts: 'dangerously', url: 'http://localhost/' });
  try {
    dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components', 'ha_baby_tracker', 'www', 'ha-baby-tracker.js'), 'utf8'));
    const card = dom.window.document.createElement('ha-baby-tracker');
    card.panel = { config: {} };
    card._ensureBackend = () => {};
    let renders = 0;
    card.renderCard = () => { if (card.config) renders++; };
    card.hass = { language: 'en', themes: { darkMode: false } };
    assert.deepEqual(card.config, {});
    assert.equal(renders, 1);
  } finally {
    dom.window.close();
  }
});
