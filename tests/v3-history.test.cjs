const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

function fixture(lang = 'en') {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return { canvas: this, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillRect() {} };
  };
  dom.window.eval(readFileSync(join(__dirname, '..', 'custom_components/ha_baby_tracker/www/ha-baby-tracker.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-baby-tracker');
  card.config = {}; card._lang = lang;
  card._hass = { states: {}, user: { is_admin: true }, themes: {}, config: { time_zone: 'Europe/Warsaw' } };
  card._backendAvailable = true; card._backendChecked = true;
  card.babies = [{ name: 'Same', entry_id: 'a' }, { name: 'Same', entry_id: 'b' }];
  dom.window.document.body.append(card); // Native focus requires a connected host.
  card.initializeDataStructures(); card.selectedTab = 'history';
  return { dom, card };
}
const change = (dom, element, value) => { element.value = value; element.dispatchEvent(new dom.window.Event('change')); };

for (const lang of ['en', 'pl']) {
  test(`recent breastfeeding sessions retain unknown sides as escaped text (${lang})`, () => {
    const { dom, card } = fixture(lang);
    try {
      card.selectedTab = 'feeding'; card.renderCard();
      for (const side of ['constructor', '__proto__', 'toString', '<img src=x onerror=alert(1)>']) {
        card._bfSessions = [{ side, duration: 18 }];
        const stored = JSON.stringify(card._bfSessions);
        card.updateBreastfeedingSessionsList();
        const list = card.shadowRoot.querySelector('#bfSessionsList');
        assert.equal(list.querySelector('strong').textContent, side);
        assert.match(list.textContent, /0m 18s/);
        assert.equal(list.querySelectorAll('img,script').length, 0);
        assert.equal(JSON.stringify(card._bfSessions), stored);
      }
    } finally { dom.window.close(); }
  });
  test(`recent breastfeeding sessions distinguish both sides and preserve known zero (${lang})`, () => {
    const { dom, card } = fixture(lang);
    try {
      card.selectedTab = 'feeding'; card.renderCard();
      const cases = lang === 'pl'
        ? [['left', '61', 'Lewa', '1m 1s'], ['right', 0, 'Prawa', '0m 0s'], ['both', 18.5, 'Obie', '0m 18,5s']]
        : [['left', '61', 'Left', '1m 1s'], ['right', 0, 'Right', '0m 0s'], ['both', 18.5, 'Both', '0m 18.5s']];
      for (const [side, duration, label, elapsed] of cases) {
        card._bfSessions = [{ side, duration }];
        card.updateBreastfeedingSessionsList();
        const list = card.shadowRoot.querySelector('#bfSessionsList');
        assert.equal(list.querySelector('strong').textContent, label);
        assert.ok(list.textContent.includes(elapsed), list.textContent);
      }
    } finally { dom.window.close(); }
  });
  test(`recent breastfeeding sessions never turn missing duration into zero or NaN (${lang})`, () => {
    const { dom, card } = fixture(lang);
    try {
      card.selectedTab = 'feeding'; card.renderCard();
      for (const duration of [undefined, null, '', 'bad', false, -1]) {
        card._bfSessions = [{ side: 'left', duration }];
        const stored = JSON.stringify(card._bfSessions);
        card.updateBreastfeedingSessionsList();
        const text = card.shadowRoot.querySelector('#bfSessionsList').textContent;
        assert.match(text, lang === 'pl' ? /Brak|Nieznan|niedost/ : /Missing|Unknown|unavailable/i);
        assert.doesNotMatch(text, /0m 0s|NaN/);
        assert.equal(JSON.stringify(card._bfSessions), stored);
      }
    } finally { dom.window.close(); }
  });
}

// Backend payloads accept arbitrary JSON scalars for type/side. Reading and
// rendering them must not mistake Object.prototype members for known enums.
for (const lang of ['en', 'pl']) {
  for (const value of ['constructor', '__proto__', 'toString', '<img src=x onerror=alert(1)>']) {
    test(`backend enum ${value} uses raw labels and bullet icons in ${lang}`, async () => {
      const { dom, card } = fixture(lang);
      const entry = { type: value, side: value, date: '2026-10-12', time: '12:00', amount: 0, duration: 0, value: 0 };
      const stored = JSON.stringify({ feeding: [entry], diapers: [entry], growth: [entry], lactation: [entry], bf_sessions: [entry], sleep: [] });
      try {
        card._hass.callWS = async request => {
          assert.equal(request.type, 'ha_baby_tracker/get_data');
          assert.equal(request.entry_id, 'a');
          return { entry_id: 'a', category: request.category, data: JSON.parse(stored)[request.category], running_timers: { sleep: null, bf: null } };
        };
        await card._loadBackendData();
        const root = card.shadowRoot;
        for (const id of ['feedingList', 'diapersLis', 'growthList']) {
          const list = root.getElementById(id);
          assert.match(list.querySelector('.list-item-title').textContent, /^• /, id);
          assert.doesNotMatch(list.textContent, /native code|\[object Object\]/, id);
          assert.equal(list.querySelectorAll('img,script').length, 0);
        }
        assert.equal(root.querySelector('#lactationList strong').textContent, value);
        assert.ok(root.querySelector('#lactationList').textContent.includes(`— ${value}`));
        const history = [...root.querySelectorAll('[data-history-row]')];
        assert.equal(history.length, 5);
        for (const row of history) {
          assert.ok(row.textContent.includes(value), row.textContent);
          assert.match(row.textContent, /0 min|0 s/);
          assert.doesNotMatch(row.textContent, /native code|\[object Object\]/);
        }
        assert.match(root.querySelector('#feedingList .list-item-subtitle').textContent, /^0$/);
        assert.match(root.querySelector('#growthList .list-item-subtitle').textContent, /^0$/);
        assert.equal(root.querySelectorAll('#historyResults img,#lactationList img').length, 0);
        for (const [category, records] of [['feeding', card.feedingData], ['diapers', card.diapersData], ['growth', card.growthData], ['lactation', card.lactationData]]) {
          assert.equal(JSON.stringify(records.get('a')), JSON.stringify(JSON.parse(stored)[category]));
        }
      } finally { dom.window.close(); }
    });
  }
  test(`known backend enums keep localized labels and icons in ${lang}`, async () => {
    const { dom, card } = fixture(lang);
    try {
      const data = { feeding: [{ type: 'bottle', amount: 0 }], diapers: [{ type: 'wet' }], growth: [{ type: 'weight', value: 0 }],
        lactation: [{ type: 'pump', side: 'left', amount: 0, duration: 0 }], bf_sessions: [], sleep: [] };
      card._hass.callWS = async request => ({ entry_id: 'a', category: request.category, data: data[request.category], running_timers: { sleep: null, bf: null } });
      await card._loadBackendData();
      for (const [id, label] of [['feedingList', lang === 'pl' ? '🍼 Butelka' : '🍼 Bottle'], ['diapersLis', lang === 'pl' ? '💧 Mokra' : '💧 Wet'], ['growthList', lang === 'pl' ? '⚖️ Masa' : '⚖️ Weight']]) {
        assert.equal(card.shadowRoot.querySelector(`#${id} .list-item-title`).textContent.trim(), label);
      }
      const lactation = card.shadowRoot.querySelector('#lactationList').textContent;
      assert.match(lactation, lang === 'pl' ? /Odciąganie — Lewa/ : /Pumping — Left/);
      assert.match(card.shadowRoot.querySelector('#historyResults').textContent, lang === 'pl' ? /Lewa · 0 min · 0 ml/ : /Left · 0 min · 0 ml/);
    } finally { dom.window.close(); }
  });
}

// No dependency on wall-clock "today": only saved event/measurement dates.
test('history includes every category and deduplicates only explicitly linked breastfeed pairs', () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('a', [{ type: 'breast', date: '2026-10-12', linkedId: 'pair', amount: '15 min', notes: 'feed detail' },
      { type: 'bottle', date: '2000-01-01', amount: 0 }, { type: 'solid', date: '2000-01-02', amount: '10 g' }]);
    card.lactationData.set('a', [{ type: 'breastfeed', date: '2026-10-12', linkedId: 'pair', side: 'left', duration: 15, notes: 'lactation detail' },
      ...['breastfeed', 'pump', 'manual', 'supplement'].map(type => ({ type, date: '2000-01-01', amount: 10 }))]);
    card.diapersData.set('a', ['wet', 'dirty', 'both'].map(type => ({ type, date: '2000-01-01' })));
    card.sleepData.set('a', [{ date: '2000-01-01', duration: 0 }]);
    card.growthData.set('a', ['weight', 'height', 'headCirc'].map(type => ({ type, date: '2000-01-01', value: 0 })));
    card._bfSessions = [{ timestamp: Date.parse('2000-01-01T10:00:00Z'), side: 'right', duration: 61 }];
    const before = JSON.stringify([...card.feedingData, ...card.lactationData]);
    const rows = card._historyRows();
    assert.equal(rows.length, 15);
    assert.equal(rows.filter(row => row.sources.length === 2).length, 1);
    assert.equal(rows.find(row => row.sources.length === 2).sources[1].entry.notes, 'lactation detail');
    assert.equal(JSON.stringify([...card.feedingData, ...card.lactationData]), before);
    card.renderCard();
    assert.match(card.shadowRoot.querySelector('#historyResults').textContent, /feed detail.*lactation detail/s);
    change(dom, card.shadowRoot.querySelector('#historyType'), 'lactation:breastfeed');
    assert.equal(card._historyPage().total, 2);
    change(dom, card.shadowRoot.querySelector('#historyType'), 'bf_sessions:breastfeed');
    assert.equal(card._historyPage().total, 1);
    assert.match(card.shadowRoot.querySelector('#historyResults').textContent, /61 s/);
  } finally { dom.window.close(); }
});

test('history uses HA local day and true growth measurement date; missing dates are explicit', () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('a', [{ type: 'bottle', timestamp: Date.parse('2026-10-11T22:15:00Z') / 1000, date: '2026-10-11' },
      { type: 'bottle', time: '12:00' }, { type: 'bottle', date: '2026-02-30' }]);
    card.sleepData.set('a', [{ startTime: Date.parse('2026-10-11T23:00:00Z'), timestamp: Date.parse('2026-10-13T12:00:00Z'), duration: 20 }]);
    card.growthData.set('a', [{ type: 'height', date: '2000-01-01', timestamp: Date.parse('2026-10-12T12:00:00Z'), value: 60 }]);
    card.renderCard();
    assert.equal(card._historyRows().find(r => r.category === 'growth').day, '2000-01-01');
    assert.equal(card._historyRows().filter(r => r.day === null).length, 2);
    assert.match(card.shadowRoot.querySelector('#historyResults').textContent, /Unknown date/);
    change(dom, card.shadowRoot.querySelector('#historyFrom'), '2026-10-12');
    change(dom, card.shadowRoot.querySelector('#historyTo'), '2026-10-12');
    assert.equal(card._historyPage().total, 2);
    assert.match(card.shadowRoot.querySelector('#historyStatus').textContent, /2.*Unknown date/i);
    change(dom, card.shadowRoot.querySelector('#historyTo'), '2026-10-11');
    assert.match(card.shadowRoot.querySelector('#historyStatus').textContent, /after/i);
    assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length, 0);
  } finally { dom.window.close(); }
});

for (const lang of ['pl', 'en']) test(`older/newest pagination and reset/empty range work in ${lang} without disturbing timers or focus`, () => {
  const { dom, card } = fixture(lang);
  try {
    card.feedingData.set('a', Array.from({ length: 37 }, (_, index) => ({ type: 'bottle', timestamp: Date.parse('2026-10-12T00:00:00Z') + index * 60000, notes: `record-${index}` })));
    card.sleepStartTime = 123; card._bfStartTime = 456; // Viewing saved history must never write/start/stop a timer.
    let writes = 0; card._saveData = () => { writes++; };
    card.renderCard();
    const older = card.shadowRoot.querySelector('#historyOlder'); older.focus(); older.click();
    assert.equal(card._historyPage().page, 2); assert.equal(card._historyPage().total, 37);
    assert.equal(card.shadowRoot.activeElement, older);
    assert.match(card.shadowRoot.querySelector('#historyResults').textContent, /record-21/);
    older.click(); assert.match(card.shadowRoot.querySelector('#historyResults').textContent, /record-0/);
    assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length, 7);
    assert.equal(card.shadowRoot.activeElement.id, 'historyNewer');
    card.shadowRoot.querySelector('#historyNewest').click(); assert.equal(card._historyPage().page, 1);
    const select = card.shadowRoot.querySelector('#historyType'); select.focus();
    card._lang = lang === 'pl' ? 'en' : 'pl'; card.renderCard();
    assert.equal(card.shadowRoot.activeElement.id, 'historyType');
    change(dom, card.shadowRoot.querySelector('#historyFrom'), '2099-01-01');
    assert.match(card.shadowRoot.querySelector('#historyResults').textContent, /No entries|Brak wpisów/);
    card.shadowRoot.querySelector('#historyReset').click();
    assert.equal(card._historyPage().total, 37);
    assert.equal(card.shadowRoot.querySelector('#historyFrom').value, '');
    assert.equal(card.sleepStartTime, 123); assert.equal(card._bfStartTime, 456); assert.equal(writes, 0);
  } finally { dom.window.close(); }
});

test('child switch resets history and rejects delayed backend rows/timers', async () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('a', [{ type: 'bottle', date: '2026-10-12', notes: 'old-child' }]);
    card.renderCard(); change(dom, card.shadowRoot.querySelector('#historyFrom'), '2026-10-12');
    const pending = []; card._hass.callWS = payload => new Promise(resolve => pending.push({ payload, resolve }));
    const previous = card._loadBackendData();
    card._selectBaby(1);
    assert.equal(card.shadowRoot.querySelector('#historyFrom').value, '');
    assert.equal(card._historyPage().page, 1);
    for (const request of pending.slice(0, 6)) request.resolve({ category: request.payload.category, data: [{ date: '2026-10-12', notes: 'stale' }], running_timers: { sleep: { startTime: 123 } } });
    await previous;
    assert.equal(card.sleepStartTime, null); assert.equal(card._historyRows().length, 0);
    for (const request of pending.slice(6)) request.resolve({ category: request.payload.category, data: [], running_timers: {} });
    await Promise.resolve(); await Promise.resolve();
    assert.doesNotMatch(card.shadowRoot.querySelector('#historyResults').textContent, /stale|old-child/);
  } finally { dom.window.close(); }
});

test('local child switch restores saved sessions/timers by existing index storage and never leaks undated sessions', () => {
  const { dom, card } = fixture();
  try {
    card._backendAvailable = false; card.babies = [{ name: 'A' }, { name: 'B' }]; card.selectedBaby = 0;
    card._bfSessions = [{ duration: 20, side: 'left' }]; card._bfStartTime = Date.now();
    card._bfTimer = dom.window.setInterval(() => {}, 1000);
    card.renderCard();
    card._selectBaby(1);
    assert.equal(card._storageKey(), 'ha-tools-baby-tracker-1');
    assert.equal(card._historyRows().length, 0); assert.equal(card._bfStartTime, null);
    card._selectBaby(0);
    assert.equal(card._historyRows().length, 1); assert.ok(card._bfStartTime);
    assert.ok(dom.window.localStorage.getItem('ha-tools-baby-tracker-0'));
  } finally { dom.window.close(); }
});

test('history escapes imported details and exposes native labeled filters and buttons', () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('a', [{ type: '<img src=x onerror=alert(1)>', time: '<script>x</script>', notes: '<svg onload=alert(1)>', date: '2026-10-12' }]);
    card.renderCard();
    const panel = card.shadowRoot.querySelector('#history-tab');
    // The history tab now includes legitimate rhythm SVGs. Imported record
    // content must still stay text, including its original injection payloads.
    const imported = panel.querySelector('#historyResults');
    assert.equal(imported.querySelectorAll('script,img,svg').length, 0);
    assert.equal(panel.querySelectorAll('script,img,[onload],[onerror]').length, 0);
    assert.ok(imported.textContent.includes('<img src=x onerror=alert(1)>'));
    assert.ok(imported.textContent.includes('<svg onload=alert(1)>'));
    for (const id of ['historyFrom', 'historyTo', 'historyType']) assert.ok(panel.querySelector(`label[for="${id}"]`));
    assert.equal(panel.querySelector('#historyType').tagName, 'SELECT');
    assert.ok([...panel.querySelectorAll('button')].every(button => button.type === 'button'));
    assert.match(card.shadowRoot.textContent, /Europe\/Warsaw/);
  } finally { dom.window.close(); }
});

test('ordinary HA updates keep the history filter and focus; failed refresh is unconfirmed', async () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('a', [{ type: 'bottle', date: '2026-10-12', amount: 80 }]);
    card.renderCard();
    const select = card.shadowRoot.querySelector('#historyType'); select.focus();
    change(dom, select, 'feeding:bottle');
    card._firstHassRender = true; card._lastRenderTime = 0;
    card.hass = { ...card.hass, language: 'pl', states: { synthetic: { state: 'ok' } } };
    assert.equal(card.shadowRoot.activeElement.id, 'historyType');
    assert.equal(card.shadowRoot.querySelector('#historyType').value, 'feeding:bottle');
    assert.match(card.shadowRoot.querySelector('#historyReset').textContent, /Wyczyść/);
    card._hass.callWS = async () => { throw new Error('synthetic offline'); };
    await card._loadBackendData();
    assert.match(card.shadowRoot.querySelector('#historyStatus').textContent, /Nie potwierdzono/);
    assert.equal(card.shadowRoot.querySelectorAll('[data-history-row]').length, 0);
    assert.equal(card.feedingData.get('a')[0].amount, 80);
  } finally { dom.window.close(); }
});

test('repeated DST hour keeps the actual event order and distinguishes timezone offsets', () => {
  const { dom, card } = fixture();
  try {
    card.feedingData.set('a', [
      { type: 'bottle', timestamp: Date.parse('2026-10-25T00:30:00Z'), notes: 'first-clock' },
      { type: 'bottle', timestamp: Date.parse('2026-10-25T01:30:00Z'), notes: 'second-clock' },
    ]);
    card.renderCard();
    const rows = [...card.shadowRoot.querySelectorAll('[data-history-row]')];
    assert.equal(rows.length, 2);
    assert.match(rows[0].textContent, /second-clock/);
    assert.match(rows[1].textContent, /first-clock/);
    assert.notEqual(rows[0].firstElementChild.textContent, rows[1].firstElementChild.textContent);
    assert.ok(card._historyRows().every(row => row.day === '2026-10-25'));
  } finally { dom.window.close(); }
});


for (const lang of ['en','pl']) test(`history keeps both active timers visible above filters in ${lang} without writing`, () => {
  const { dom, card } = fixture(lang);
  try {
    const now = Date.parse('2026-10-14T12:00:00Z');dom.window.Date.now = () => now;
    card.sleepStartTime = now - 65000;card.sleepTimer = 5001;
    card._bfStartTime = now - 125000;card._bfTimer = 5002;card._bfCurrentSide = 'right';
    let writes=0;card._saveData=()=>{writes++};card._hass.callWS=async()=>{writes++;throw Error('No reads or writes expected')};
    card.renderCard();const status=card.shadowRoot.querySelector('#historyActiveTimers');
    assert.ok(status,'History requires the active timer status shown in approved page22');
    assert.equal(status.hidden,false);assert.match(status.textContent,/00:01:05/);assert.match(status.textContent,/00:02:05/);
    assert.match(status.textContent,lang==='pl'?/Sen.*Prawa pierś/s:/Sleep.*Right breast/s);
    assert.ok(status.compareDocumentPosition(card.shadowRoot.querySelector('.history-controls')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    card.shadowRoot.querySelector('#historyOlder').click();card.updateSleepTimerDisplay();card.updateBreastfeedingDisplay();
    assert.equal(card.sleepStartTime,now-65000);assert.equal(card._bfStartTime,now-125000);assert.equal(writes,0);
    card._historyLoadFailed=true;card.updateAllDisplays();assert.match(status.textContent,/Unconfirmed|Niepotwierdzon/i);assert.doesNotMatch(status.textContent,/00:01:05/);
    card._historyLoadFailed=false;card.sleepStartTime=null;card.sleepTimer=null;card._bfStartTime=null;card._bfTimer=null;card.updateAllDisplays();assert.equal(status.hidden,true);
  } finally { dom.window.close(); }
});
