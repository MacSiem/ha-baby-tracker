const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture(lang) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const storage = dom.window.localStorage;
  storage.setItem('ha-tools-baby-tracker-children', '[{"name":"Demo"}]');
  storage.setItem('ha-tools-baby-tracker-0', '{"feeding":{"Demo":[{"timestamp":1000},{"timestamp":2000}]}}');
  const original = storage.getItem('ha-tools-baby-tracker-0');
  const card = dom.window.document.createElement('ha-baby-tracker');
  card._lang = lang;
  card.config = {};
  card._backendAvailable = true;
  card._loadBackendData = async () => {};
  const alerts = [], confirmations = [], requests = [];
  dom.window.alert = text => alerts.push(text);
  dom.window.confirm = text => { confirmations.push(text); return true; };
  const preview = { entries: 2, timers: 0, targets: 1, unmigrated: [], ambiguous: [], skipped_non_empty: {} };
  const complete = { migrated: { entry_1: { migrated: { feeding: 2 }, migrated_timers: [], skipped_non_empty: [], running_timers: { sleep: null, bf: null } } },
    unmigrated: [], ambiguous: [], skipped_non_empty: {}, preview: structuredClone(preview) };
  const respond = (result, dry = preview) => {
    card._hass = { states: {}, user: { is_admin: true }, callWS: async request => {
      requests.push(request);
      if (request.dry_run) return { preview: dry };
      if (typeof result === 'function') return result();
      return result;
    } };
  };
  const marker = () => JSON.parse(storage.getItem('ha-baby-tracker-v5-migration-prompted') || 'null');
  const preserved = () => assert.equal(storage.getItem('ha-tools-baby-tracker-0'), original);
  return { dom, card, alerts, confirmations, requests, preview, complete, respond, marker, preserved };
}

for (const lang of ['pl', 'en']) {
  const partial = lang === 'pl' ? '½ Częściowo' : '½ Partial';
  const success = lang === 'pl' ? '✓ Sukces' : '✓ Success';
  const unknown = lang === 'pl' ? '? Niepotwierdzony' : '? Unconfirmed';

  test(`${lang}: confirmed nonzero producer reply alone marks migration done`, async () => {
    const f = fixture(lang);
    try {
      f.respond(f.complete);
      await f.card._promptLocalMigration();
      assert.equal(f.marker().status, 'done');
      assert.ok(f.alerts[0].startsWith(success));
      assert.equal(f.confirmations.length, 1);
      assert.equal(f.requests.length, 2);
      f.preserved();
    } finally { f.dom.window.close(); }
  });

  for (const level of ['plan', 'commit']) {
    test(`${lang}: ${level} omissions render category and reason and keep retry`, async () => {
      const f = fixture(lang);
      try {
        const result = f.complete;
        if (level === 'commit') {
          result.migrated.entry_1 = { migrated: {}, migrated_timers: [], skipped_non_empty: ['feeding', 'running_timers.sleep'], running_timers: { sleep: { startTime: 3000 }, bf: null } };
          result.preview.timers = 1;
        } else {
          result.skipped_non_empty = { entry_2: ['diapers', 'running_timers.bf'] };
          result.preview.skipped_non_empty = result.skipped_non_empty;
        }
        result.unmigrated = ['Unmatched demo'];
        result.ambiguous = [{ name: 'Ambiguous demo', reason: 'duplicate_target_name' }];
        result.preview.unmigrated = result.unmigrated;
        result.preview.ambiguous = result.ambiguous;
        f.respond(result);
        await f.card._promptLocalMigration();
        assert.equal(f.marker().status, 'partial');
        const text = f.alerts[0];
        assert.ok(text.startsWith(partial));
        assert.match(text, lang === 'pl' ? /już zawiera dane/ : /already contains data/);
        assert.match(text, lang === 'pl' ? /Niedopasowane/ : /Unmatched/);
        assert.match(text, lang === 'pl' ? /Niejednoznaczne/ : /Ambiguous/);
        assert.match(text, /Unmatched demo/);
        assert.match(text, /Ambiguous demo/);
        assert.match(text, level === 'commit' ? (lang === 'pl' ? /Karmienie.*Timer snu/s : /Feeding.*Sleep timer/s)
          : (lang === 'pl' ? /Pieluchy.*Timer karmienia piersią/s : /Diapers.*Breastfeeding timer/s));
        assert.ok(!text.includes(success));
        assert.equal(f.card._canRetryLocalMigration(), true);
        f.preserved();
      } finally { f.dom.window.close(); }
    });
  }

  test(`${lang}: zero safe subset explains skips without commit or done`, async () => {
    const f = fixture(lang);
    try {
      f.respond(f.complete, { entries: 0, timers: 0, targets: 0, unmigrated: ['Demo'],
        ambiguous: [{ name: 'Other', reason: 'duplicate_local_name' }], skipped_non_empty: { entry_1: ['feeding'] } });
      await f.card._promptLocalMigration();
      assert.ok(f.alerts[0].startsWith(lang === 'pl' ? '∅ Brak danych' : '∅ No data'));
      assert.match(f.alerts[0], lang === 'pl' ? /Karmienie/ : /Feeding/);
      assert.match(f.alerts[0], lang === 'pl' ? /Niedopasowane/ : /Unmatched/);
      assert.equal(f.requests.length, 1);
      assert.equal(f.confirmations.length, 0);
      assert.equal(f.marker(), null);
      f.preserved();
    } finally { f.dom.window.close(); }
  });

  for (const [label, make] of [
    ['missing', () => undefined], ['null', () => null], ['empty', () => ({})],
    ['empty slice', f => ({ ...f.complete, migrated: { entry_1: {} } })],
    ['unacknowledged target', f => {
      f.complete.preview.targets = 2;
      f.complete.migrated.entry_2 = { migrated: {}, migrated_timers: [], skipped_non_empty: [], running_timers: { sleep: null, bf: null } };
      return f.complete;
    }],
    ['missing timers', f => { delete f.complete.migrated.entry_1.migrated_timers; return f.complete; }],
    ['wrong counts', f => { f.complete.migrated.entry_1.migrated.feeding = 1; return f.complete; }],
    ['zero with nonzero preview', f => { f.complete.migrated.entry_1.migrated = {}; return f.complete; }],
    ['negative count', f => { f.complete.migrated.entry_1.migrated.feeding = -1; return f.complete; }],
    ['unknown category', f => { f.complete.skipped_non_empty = { entry_1: ['PRIVATE_ERROR'] }; return f.complete; }],
    ['transport', () => () => { throw new Error('PRIVATE_ERROR'); }],
  ]) {
    test(`${lang}: ${label} migration reply never becomes success and can retry`, async () => {
      const f = fixture(lang);
      try {
        f.respond(make(f));
        await f.card._promptLocalMigration();
        assert.notEqual(f.marker()?.status, 'done');
        const visible = f.alerts.join('\n') + f.card.shadowRoot.textContent;
        assert.ok(visible.includes(unknown));
        assert.ok(!visible.includes(success));
        assert.ok(!visible.includes('PRIVATE_ERROR'));
        assert.equal(f.card._canRetryLocalMigration(), true);
        f.preserved();
        f.respond({ migrated: { entry_1: { migrated: { feeding: 2 }, migrated_timers: [], skipped_non_empty: [], running_timers: { sleep: null, bf: null } } },
          unmigrated: [], ambiguous: [], skipped_non_empty: {}, preview: f.preview });
        await f.card._promptLocalMigration();
        assert.equal(f.marker().status, 'done');
      } finally { f.dom.window.close(); }
    });
  }

  test(`${lang}: timer-only confirmation counts as success but a zero commit stays retryable`, async () => {
    const f = fixture(lang);
    try {
      const timerPreview = { ...f.preview, entries: 0, timers: 1 };
      f.respond({ ...f.complete, preview: timerPreview, migrated: { entry_1: {
        migrated: {}, migrated_timers: ['sleep'], skipped_non_empty: [],
        running_timers: { sleep: { startTime: 1000 }, bf: null },
      } } }, timerPreview);
      await f.card._promptLocalMigration();
      assert.equal(f.marker().status, 'done');
      assert.ok(f.alerts[0].startsWith(success));
      f.dom.window.localStorage.removeItem('ha-baby-tracker-v5-migration-prompted');
      f.respond({ ...f.complete, migrated: {}, preview: { ...f.preview, entries: 0, targets: 0 } });
      await f.card._promptLocalMigration();
      assert.notEqual(f.marker()?.status, 'done');
      assert.ok(f.alerts[1].startsWith(lang === 'pl' ? '∅ Brak danych' : '∅ No data'));
      assert.equal(f.card._canRetryLocalMigration(), true);
      f.preserved();
    } finally { f.dom.window.close(); }
  });

  test(`${lang}: malformed preview never reaches confirmation or commit`, async () => {
    const f = fixture(lang);
    try {
      f.respond(f.complete, { entries: -1, timers: 0, targets: 0 });
      await f.card._promptLocalMigration();
      assert.equal(f.requests.length, 1);
      assert.equal(f.confirmations.length, 0);
      assert.equal(f.marker(), null);
      assert.ok(f.alerts[0].startsWith(unknown));
      f.preserved();
    } finally { f.dom.window.close(); }
  });
}
