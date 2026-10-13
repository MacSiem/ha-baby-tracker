const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture(lang) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card._lang = lang;
  card.config = {};
  card.babies = [{ name: 'Demo', entry_id: 'entry_1' }];
  card.initializeDataStructures();
  return { dom, card };
}

for (const lang of ['pl', 'en']) {
  for (const reply of ['lost after save', 'missing ack']) {
    test(`${lang}: ${reply} preserves form and renders unconfirmed rather than error`, async () => {
      const { dom, card } = fixture(lang);
      try {
        card._backendAvailable = true;
        card.initializeDataStructures();
        card.shadowRoot.innerHTML = '<select id="diapersType"><option value="wet">Wet</option></select><input id="diapersTime" value="12:00"><input id="diapersNotes" value="keep draft">';
        const persisted = [];
        card._hass = { callWS: async request => {
          assert.equal(request.type, 'ha_baby_tracker/add_entries');
          persisted.push(...request.entries);
          if (reply === 'lost after save') throw new Error('PRIVATE_ERROR');
          return {};
        } };
        await card.addDiapers();
        assert.equal(persisted.length, 1);
        assert.equal(card.shadowRoot.getElementById('diapersNotes').value, 'keep draft');
        const toast = card.shadowRoot.querySelector('[role="alert"]');
        assert.ok(toast.querySelector('[data-result-state="unconfirmed"]'));
        assert.ok(toast.textContent.startsWith(lang === 'pl' ? '? Niepotwierdzony' : '? Unconfirmed'));
        assert.equal(toast.querySelector('[data-result-state="success"], [data-result-state="error"]'), null);
        assert.doesNotMatch(toast.textContent, /PRIVATE_ERROR/);
        assert.equal(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'), null);
      } finally { dom.window.close(); }
    });
  }

  test(`${lang}: discovery uncertainty is unconfirmed but rejected localStorage is error`, async () => {
    const { dom, card } = fixture(lang);
    try {
      card._backendDetectionFailed = true;
      assert.equal(await card._saveEntries([{ category: 'feeding', entry: { amount: 120 } }]), false);
      assert.ok(card.shadowRoot.querySelector('[data-result-state="unconfirmed"]'));
      card.shadowRoot.innerHTML = '';
      card._backendDetectionFailed = false;
      dom.window.Storage.prototype.setItem = () => { throw new dom.window.DOMException('PRIVATE_ERROR', 'QuotaExceededError'); };
      assert.equal(await card._saveEntries([{ category: 'feeding', entry: { amount: 120 } }]), false);
      const toast = card.shadowRoot.querySelector('[role="alert"]');
      assert.ok(toast.querySelector('[data-result-state="error"]'));
      assert.ok(toast.textContent.startsWith(lang === 'pl' ? '✕ Błąd' : '✕ Error'));
      assert.doesNotMatch(toast.textContent, /PRIVATE_ERROR/);
    } finally { dom.window.close(); }
  });

  test(`${lang}: child management notice is neutral information without a fabricated result`, () => {
    const { dom, card } = fixture(lang);
    try {
      card._backendChildManagementNotice();
      const toast = card.shadowRoot.querySelector('[role="status"]');
      assert.ok(toast);
      assert.equal(toast.querySelector('[data-result-state]'), null);
      assert.doesNotMatch(toast.getAttribute('style'), /success|10B981|16,\s*185,\s*129/i);
      assert.match(toast.textContent, lang === 'pl' ? /Ustawienia/ : /Settings/);
    } finally { dom.window.close(); }
  });

  for (const [code, icon, pl, en] of [
    ['success', '✓', 'Sukces', 'Success'], ['partial', '½', 'Częściowo', 'Partial'],
    ['unconfirmed', '?', 'Niepotwierdzony', 'Unconfirmed'], ['error', '✕', 'Błąd', 'Error'],
    ['not_checked', '–', 'Nie sprawdzono', 'Not checked'], ['no_data', '∅', 'Brak danych', 'No data'],
  ]) {
    test(`${lang}: actual toast renders ${code} using exact W4 icon and label`, () => {
      const { dom, card } = fixture(lang);
      try {
        card._showToast('Safe detail <img src=x>', code);
        const badge = card.shadowRoot.querySelector(`[data-result-state="${code}"]`);
        assert.ok(badge);
        assert.equal(badge.textContent, `${icon} ${lang === 'pl' ? pl : en}`);
        assert.equal(card.shadowRoot.querySelector('img'), null);
        if (code !== 'success') assert.equal(card.shadowRoot.querySelector('.ht-result-state--success'), null);
      } finally { dom.window.close(); }
    });
  }
}
