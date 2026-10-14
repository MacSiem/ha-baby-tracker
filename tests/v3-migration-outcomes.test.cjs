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

// Owner regression: a delayed response belongs to the authority that requested it.
for (const phase of ['preview', 'commit']) for (const change of ['identity', 'role', 'inactive', 'connection', 'offline roundtrip', 'detach']) {
  test(`late ${phase} after ${change} cannot confirm, mark or refresh migration`, async () => {
    const f = fixture('en');
    try {
      f.respond(f.complete);
      f.card._ensureBackend = () => {};
      f.card.renderCard = () => {};
      f.card._hass.user.id = 'original';
      f.card._hass.user.is_active = true;
      f.card._hass.connection = new f.dom.window.EventTarget();
      f.card._hass.connection.connected = true;
      f.dom.window.document.body.append(f.card);
      let resolvePending, started;
      const waiting = new Promise(resolve => { started = resolve; });
      const originalWS = f.card._hass.callWS;
      f.card._hass.callWS = request => {
        if (Boolean(request.dry_run) === (phase === 'preview')) {
          f.requests.push(request);
          return new Promise(resolve => { resolvePending = resolve; started(); });
        }
        return originalWS(request);
      };
      let reloads = 0;
      f.card._loadBackendData = async () => { reloads++; };
      const pending = f.card._promptLocalMigration(true);
      await waiting;
      const h = f.card.hass;
      if (change === 'identity') f.card.hass = { ...h, user: { ...h.user, id: 'replacement' } };
      if (change === 'role') f.card.hass = { ...h, user: { ...h.user, is_admin: false } };
      if (change === 'inactive') f.card.hass = { ...h, user: { ...h.user, is_active: false } };
      if (change === 'connection') f.card.hass = { ...h, connection: new f.dom.window.EventTarget() };
      if (change === 'offline roundtrip') {
        f.dom.window.dispatchEvent(new f.dom.window.Event('offline'));
        f.dom.window.dispatchEvent(new f.dom.window.Event('online'));
      }
      if (change === 'detach') f.card.remove();
      // Reconnection itself now requests one fresh data read. The stale
      // migration response must still cause no additional read or write.
      await new Promise(resolve => setImmediate(resolve));
      const recoveryReads = change === 'offline roundtrip' ? 1 : 0;
      assert.equal(reloads, recoveryReads, 'only the reconnect may refresh the current authority');
      resolvePending(phase === 'preview' ? { preview: f.preview } : f.complete);
      await pending;
      assert.equal(f.marker(), null, 'old response must not write a completed/failed marker');
      assert.equal(f.alerts.length, 0, 'old response must not show private migration result');
      assert.equal(reloads, recoveryReads, 'old response must not reload data for the new authority');
      assert.equal(f.confirmations.length, phase === 'preview' ? 0 : 1);
      assert.equal(f.requests.length, phase === 'preview' ? 1 : 2, 'no automatic extra write');
      f.preserved();
    } finally { f.card.remove(); f.dom.window.close(); }
  });
}

test('changing authority during the post-commit reload suppresses its late result', async () => {
  const f = fixture('en');
  try {
    f.respond(f.complete);
    let resolveLoad, started;
    const waiting = new Promise(resolve => { started = resolve; });
    f.card._loadBackendData = () => new Promise(resolve => { resolveLoad = resolve; started(); });
    const pending = f.card._promptLocalMigration();
    await waiting;
    assert.equal(f.marker().status, 'done', 'the original authority received the confirmed write');
    f.card._hass = { ...f.card.hass, user: { id: 'another', is_admin: true } };
    resolveLoad(); await pending;
    assert.equal(f.alerts.length, 0);
    f.preserved();
  } finally { f.dom.window.close(); }
});

test('an already offline or inactive account sends no migration requests', async () => {
  for (const mode of ['offline', 'inactive']) {
    const f = fixture('en');
    try {
      f.respond(f.complete);
      if (mode === 'offline') f.card._hass.connection = { connected: false };
      else f.card._hass.user.is_active = false;
      await f.card._promptLocalMigration(true);
      assert.equal(f.requests.length, 0);
      assert.equal(f.marker(), null);
      f.preserved();
    } finally { f.dom.window.close(); }
  }
});

for (const mode of ['transport failure', 'no safe records', 'declined']) test(`${mode}: the real retry button is enabled after a cached render`, async () => {
  const f = fixture('en');
  try {
    f.respond(mode === 'transport failure' ? () => { throw Error('PRIVATE_ERROR'); } : f.complete,
      mode === 'no safe records' ? { ...f.preview, entries: 0, targets: 0 } : f.preview);
    f.card.selectedTab = 'config';
    if (mode === 'declined') f.dom.window.confirm = () => false;
    f.card.renderCard();
    const button = f.card.shadowRoot.getElementById('retryLocalMigrationBtn');
    assert.ok(button);
    await f.card._promptLocalMigration(true);
    assert.equal(f.card.shadowRoot.getElementById('retryLocalMigrationBtn').disabled, false,
      'manual disabled state must be cleared even when the generated HTML is unchanged');
    assert.equal(f.card._migrationInProgress, false);
    f.preserved();
  } finally { f.dom.window.close(); }
});
