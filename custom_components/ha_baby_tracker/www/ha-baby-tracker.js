/* HA Tools split — ha-baby-tracker v5.1.0 (2026-10-14) — integration-backed with legacy fallback */
(function() {
'use strict';

// BEGIN HA TOOLS UI V3 source-sha256=029c06206e55abad9aa09dfcf65bb13027ec24ce6a0bfacc45a938891b27254e
// HA Tools v3: vendored inside each consumer's own closure, never a window API.
function createUiV3({ language = 'en' } = {}) {
  const pl = String(language).startsWith('pl');
  const states = {
    success: ['Success', 'Sukces', '✓'],
    partial: ['Partial', 'Częściowo', '½'],
    unconfirmed: ['Unconfirmed', 'Niepotwierdzony', '?'],
    error: ['Error', 'Błąd', '✕'],
    not_checked: ['Not checked', 'Nie sprawdzono', '–'],
    no_data: ['No data', 'Brak danych', '∅'],
  };
  const status = (value) => {
    const code = typeof value === 'string' && Object.hasOwn(states, value) ? value : 'not_checked';
    const row = states[code];
    return { code, label: row[pl ? 1 : 0], icon: row[2], countsAsSuccess: code === 'success' };
  };
  const statusHtml = (value) => {
    const result = status(value);
    return `<span class="ht-result-state ht-result-state--${result.code}" data-result-state="${result.code}"><span aria-hidden="true">${result.icon}</span> ${result.label}</span>`;
  };
  const css = `
.ht-result-state { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid currentColor;border-radius:6px;font-size:12px;line-height:1.4;white-space:normal; }
.ht-result-state--success { color:#237b3d;background:rgba(35,123,61,.10); }
.ht-result-state--partial { color:#966400;background:rgba(150,100,0,.10); }
.ht-result-state--unconfirmed { color:#ad5200;background:rgba(173,82,0,.10); }
.ht-result-state--error { color:#c32b2b;background:rgba(195,43,43,.10); }
.ht-result-state--not_checked,.ht-result-state--no_data { color:var(--secondary-text-color,#666);background:transparent; }
.ht-result-state--no_data { border-style:dashed; }
:host(.bento-dark) .ht-result-state--success { color:#81cf99; }
:host(.bento-dark) .ht-result-state--partial { color:#efd080; }
:host(.bento-dark) .ht-result-state--unconfirmed { color:#ffb97b; }
:host(.bento-dark) .ht-result-state--error { color:#ff9999; }
`;
  return { status, statusHtml, css };
}
// END HA TOOLS UI V3
// BEGIN HA TOOLS EXPORT V3 source-sha256=bae4197cb254a7e24affbf90f029833127c5ba09b5b96f876a6fd8112f816a3d
/**
 * W6 export dialog. Pure ES module; vendor this factory INSIDE each consumer's
 * own IIFE (remove only the `export` keyword). Never attach it to window.
 * Construction is inert. open() appends only its own container to root.
 *
 * Required dependency injection:
 * root: Element/ShadowRoot; getLanguage(): 'pl'|'en'; createUiV3: existing W4 factory.
 * getContext(): {role,userId,connectionId,datasetId,revision,connected,canExport,
 *                sourceConfirmed}. Identities/revision are nonempty scalar values;
 * bump revision monotonically for source/filter/selection/identity changes,
 * including a restored source; never reuse an old revision. Never return tokens or data.
 * policy: {id,allowlistedFields:string[],neverInclude:[tokens,users,addresses,raw_config]}.
 * formats: explicit subset of ['json','csv','txt']; defaults must be explicit valid choices.
 * buildPayload({context,draft,policy,signal}): read-only, Promise or sync result:
 * {serialized:string,confirmed:true,sourceConfirmed:true,status:'success'|'partial',
 *  included:string[],excluded:string[],sourceLimit:string}.
 * Included/Excluded/sourceLimit describe the REVIEWED CONSUMER policy and actual
 * source limitations in the current language. The consumer MUST explicitly select
 * allowed fields, exclude tokens/users/addresses/raw configuration under EVERY
 * private opt-in, and sanitize CSV formula cells where applicable. A generic
 * recursive export/redactor of arbitrary raw state/config is NOT a valid consumer.
 * This factory cannot inspect or truthfully sanitize an unknown arbitrary schema.
 * For partial reports the consumer also encodes the partial status, inclusion
 * scope and source limitations IN its allowlisted file schema, not only UI text.
 * performDownload({serialized,blob,filename,format,context,signal}): explicit Save
 * only. Return {outcome:'initiated'|'saved'|'unknown'}; 'saved' requires actual
 * adapter confirmation, never infer disk persistence from an anchor click.
 * Optional clock(): monotonic milliseconds; setTimer(fn,ms), clearTimer(handle).
 *
 * Returned API: open({opener}), cancel(), contextChanged(), destroy(). Every open
 * resets private consent. contextChanged() discards bytes/consent immediately;
 * owner also calls cancel/destroy on disconnect. Save ALWAYS rechecks context.
 * One preview on open, explicit Refresh thereafter; bounded 10s, no automatic
 * retries/downloads/persistence. AbortSignal is advisory; late results are ignored.
 */
function createExportDialog(options) {
  const { root, getContext, getLanguage, createUiV3, buildPayload, performDownload,
    clock = () => globalThis.performance.now(), setTimer = (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimer = id => globalThis.clearTimeout(id), defaultFormat, defaultFilename } = options || {};
  const allowedFormats = ['json', 'csv', 'txt', 'yaml'];
  const excludedCategories = ['tokens', 'users', 'addresses', 'raw_config'];
  const strings = value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string' && v.trim());
  if (!root?.append || !root.ownerDocument || [getContext, getLanguage, createUiV3, buildPayload, performDownload, clock, setTimer, clearTimer].some(fn => typeof fn !== 'function')) {
    throw new TypeError('root and injected getContext/getLanguage/createUiV3/buildPayload/performDownload/clock/timers are required');
  }
  const suppliedPolicy = options.policy;
  if (!suppliedPolicy || typeof suppliedPolicy.id !== 'string' || !suppliedPolicy.id.trim() || !strings(suppliedPolicy.allowlistedFields) || !strings(suppliedPolicy.neverInclude) || excludedCategories.some(key => !suppliedPolicy.neverInclude.includes(key))) {
    throw new TypeError('Explicit reviewed consumer policy with allowlistedFields and neverInclude is required');
  }
  const policy = Object.freeze({ id: suppliedPolicy.id, allowlistedFields: Object.freeze([...suppliedPolicy.allowlistedFields]), neverInclude: Object.freeze([...suppliedPolicy.neverInclude]) });
  if (!strings(options.formats) || options.formats.some(f => !allowedFormats.includes(f)) || new Set(options.formats).size !== options.formats.length || !options.formats.includes(defaultFormat) || typeof defaultFilename !== 'string') {
    throw new TypeError('Explicit formats/defaultFormat/defaultFilename are required');
  }
  const formats = Object.freeze([...options.formats]);
  const doc = root.ownerDocument;
  const mime = { json: 'application/json;charset=utf-8', csv: 'text/csv;charset=utf-8', txt: 'text/plain;charset=utf-8', yaml: 'application/yaml;charset=utf-8' };
  const copy = {
    en: { title: 'Export', filename: 'Filename', format: 'Format', private: 'Include reviewed private fields (this export only)', included: 'Included in the file', excluded: 'Excluded from the file', source: 'Source and limits', preview: 'Exact file content', save: 'Save', refresh: 'Refresh preview', cancel: 'Cancel', busy: 'Building preview… Save waits for confirmed bytes.', changed: 'Choices changed. Refresh preview before Save.', context: 'Source or access changed. Review the source and refresh preview.', unavailable: 'Source unavailable or unconfirmed. Reconnect or confirm the source, then refresh.', invalidFormat: 'Choose an allowed format: JSON, CSV, TXT or YAML as offered.', invalidName: 'Use a basename of 1–128 characters: no paths, control characters, reserved names or leading/trailing spaces.', extension: 'Filename must end with the selected extension. Edit the filename, then refresh.', timeout: 'Preview exceeded 10 seconds. Check the source and explicitly refresh.', buildError: 'Could not build a confirmed preview. Check the source and refresh.', unconfirmed: 'Bytes or source metadata are unconfirmed. Confirm the source and refresh.', noData: 'No confirmed file content. Select available data and refresh.', saving: 'Handing off the confirmed preview… Wait for the adapter result.', initiated: 'Download initiated. Saving to the filesystem is not confirmed. Refresh only for a new export intent.', saved: 'Save confirmed by the download adapter.', unknown: 'Download result unconfirmed. Check the previous attempt before explicitly refreshing for a new export intent.' },
    pl: { title: 'Eksport', filename: 'Nazwa pliku', format: 'Format', private: 'Dołącz sprawdzone pola prywatne (tylko ten eksport)', included: 'W pliku jest', excluded: 'W pliku nie ma', source: 'Źródło i ograniczenia', preview: 'Dokładna zawartość pliku', save: 'Zapisz', refresh: 'Odśwież podgląd', cancel: 'Anuluj', busy: 'Przygotowywanie podglądu… Zapis wymaga potwierdzonej zawartości.', changed: 'Wybór zmieniony. Odśwież podgląd przed zapisem.', context: 'Źródło lub uprawnienia zmienione. Sprawdź źródło i odśwież podgląd.', unavailable: 'Źródło niedostępne lub niepotwierdzone. Połącz lub potwierdź źródło i odśwież.', invalidFormat: 'Wybierz dostępny format: JSON, CSV, TXT lub YAML z listy.', invalidName: 'Użyj nazwy pliku o długości 1–128 znaków: bez ścieżek, znaków sterujących, nazw zastrzeżonych i skrajnych spacji.', extension: 'Nazwa pliku musi mieć rozszerzenie wybranego formatu. Popraw nazwę i odśwież.', timeout: 'Podgląd przekroczył 10 sekund. Sprawdź źródło i jawnie odśwież.', buildError: 'Nie udało się przygotować potwierdzonego podglądu. Sprawdź źródło i odśwież.', unconfirmed: 'Zawartość lub opis źródła niepotwierdzony. Potwierdź źródło i odśwież.', noData: 'Brak potwierdzonej zawartości pliku. Wybierz dostępne dane i odśwież.', saving: 'Przekazywanie potwierdzonego podglądu… Poczekaj na wynik zapisu.', initiated: 'Pobieranie rozpoczęte. Zapis na dysku nie jest potwierdzony. Odśwież tylko dla nowej próby eksportu.', saved: 'Adapter pobierania potwierdził zapis.', unknown: 'Wynik pobierania niepotwierdzony. Sprawdź poprzednią próbę przed jawnym odświeżeniem dla nowego eksportu.' },
  };
  const css = `
[data-ha-tools-export] { min-width:0;max-width:100%;color:var(--primary-text-color,#1e293b);font:inherit; }
[data-ha-tools-export] * { box-sizing:border-box; }
[data-ha-tools-export] dialog { width:min(520px,calc(100vw - 32px));max-width:none;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);min-width:0;margin:auto;padding:0;border:1px solid var(--divider-color,#e2e8f0);border-radius:18px;background:var(--card-background-color,#fff);color:inherit;font:inherit;box-shadow:0 24px 64px #0f172a33;overflow:hidden; }
[data-ha-tools-export] dialog[open] { display:flex;flex-direction:column; }
[data-ha-tools-export] dialog::backdrop { background:#0f172a66; }
[data-ha-tools-export] .ht-export-body { min-height:0;overflow:auto;overscroll-behavior:contain;padding:24px; }
[data-ha-tools-export] h2,[data-ha-tools-export] h3,[data-ha-tools-export] p,[data-ha-tools-export] li { overflow-wrap:anywhere;white-space:normal; }
[data-ha-tools-export] h2 { margin:0 0 16px;font-size:1.25em;line-height:1.4; }
[data-ha-tools-export] h3 { margin:16px 0 6px;font-size:1em;line-height:1.5; }
[data-ha-tools-export] p { line-height:1.5; }
[data-ha-tools-export] .ht-export-fields { display:grid;grid-template-columns:minmax(0,1fr);gap:12px; }
[data-ha-tools-export] label { display:flex;flex-direction:column;gap:6px;min-width:0;overflow-wrap:anywhere; }
[data-ha-tools-export] .ht-export-format { margin-top:16px; }
[data-ha-tools-export] .ht-export-private { flex-direction:row;align-items:center;min-height:44px;margin-top:12px; }
[data-ha-tools-export] input:not([type=checkbox]),[data-ha-tools-export] select,[data-ha-tools-export] button { font:inherit;min-width:44px;min-height:44px;max-width:100%; }
[data-ha-tools-export] input:not([type=checkbox]),[data-ha-tools-export] select { width:100%;color:inherit;background:var(--ht-export-field-bg,#f8fafc);border:1px solid var(--divider-color,#cbd5e1);border-radius:8px;padding:8px 12px; }
[data-ha-tools-export] input[type=checkbox] { width:24px;height:24px;flex:none;margin:10px; }
[data-ha-tools-export] [data-export-scope] { padding:12px 14px;border-radius:10px;margin-top:14px; }
[data-ha-tools-export] [data-export-scope] h3 { margin:0 0 6px; }
[data-ha-tools-export] [data-export-scope=included] { background:var(--ht-export-included-bg,#ecfdf3);color:var(--ht-export-included-text,#166534); }
[data-ha-tools-export] [data-export-scope=excluded] { background:var(--ht-export-excluded-bg,#fff1f2);color:var(--ht-export-excluded-text,#9f1239); }
[data-ha-tools-export] ul { padding:0;margin:0;list-style:none; }
[data-ha-tools-export] li { display:flex;gap:6px;line-height:1.5; }
[data-ha-tools-export] li + li { margin-top:4px; }
[data-ha-tools-export] [data-export-scope=included] li::before { content:'✓';flex:none; }
[data-ha-tools-export] [data-export-scope=excluded] li::before { content:'×';flex:none; }
[data-ha-tools-export] button { padding:8px 12px;white-space:normal;overflow-wrap:anywhere;cursor:pointer;border:1px solid transparent;border-radius:8px;color:var(--ht-export-accent,#0369a1);background:transparent; }
[data-ha-tools-export] [data-export=save] { color:var(--ht-export-save-text,#fff);background:var(--ht-export-accent,#0369a1); }
[data-ha-tools-export] :focus-visible { outline:3px solid var(--ht-export-accent,#0369a1);outline-offset:2px; }
[data-ha-tools-export] button:disabled { cursor:default;opacity:.6; }
[data-ha-tools-export] .ht-export-actions { display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;flex:none;padding:12px 24px;border-top:1px solid var(--divider-color,#e2e8f0);background:var(--card-background-color,#fff); }
[data-ha-tools-export] pre { max-width:100%;min-width:0;max-height:260px;overflow:auto;white-space:pre;margin:0;padding:12px;border:1px solid var(--divider-color,#cbd5e1);border-radius:8px;background:var(--ht-export-field-bg,#f8fafc); }
:host(.bento-dark) { --ht-export-field-bg:#0f172a;--ht-export-included-bg:#103827;--ht-export-included-text:#bbf7d0;--ht-export-excluded-bg:#43212a;--ht-export-excluded-text:#fda4af;--ht-export-accent:#7dd3fc;--ht-export-save-text:#0f172a; }
@media (max-width:399px) { [data-ha-tools-export] .ht-export-body { padding:16px; } [data-ha-tools-export] .ht-export-actions { padding:12px 16px;gap:6px; } }
@media (max-width:319px) { [data-ha-tools-export] dialog { width:calc(100vw - 16px); } [data-ha-tools-export] .ht-export-actions button { flex:1 1 auto; } }
`;  let container, nodes, L, ui, opener, alive = false, destroyed = false, serial = 0;
  let pending = null, handoff = null, ready = null, observed = null;
  const listeners = [];
  const on = (target, event, handler, capture = false) => {
    target.addEventListener(event, handler, capture);
    listeners.push(() => target.removeEventListener(event, handler, capture));
  };
  const contextKeys = ['role', 'userId', 'connectionId', 'datasetId', 'revision'];
  function readContext() {
    try {
      const value = getContext();
      if (!value || contextKeys.some(k => !['string', 'number'].includes(typeof value[k]) || String(value[k]).trim() === '' || (typeof value[k] === 'number' && !Number.isFinite(value[k])))) return null;
      return Object.freeze(Object.fromEntries([...contextKeys, 'connected', 'canExport', 'sourceConfirmed'].map(k => [k, value[k]])));
    } catch { return null; }
  }
  const same = (a, b) => !!a && !!b && [...contextKeys, 'connected', 'canExport', 'sourceConfirmed'].every(k => a[k] === b[k]);
  const available = c => !!c && c.connected === true && c.canExport === true && c.sourceConfirmed === true;
  const draft = () => Object.freeze({ filename: nodes.filename.value, format: nodes.format.value, includePrivate: nodes.private.checked });
  const sameDraft = (a, b) => a.filename === b.filename && a.format === b.format && a.includePrivate === b.includePrivate;
  function validation(value) {
    if (!formats.includes(value.format)) return 'invalidFormat';
    const name = value.filename;
    if (!name || [...name].length > 128 || name !== name.trim() || /[\p{Cc}\p{Cf}/\\<>:"|?*]/u.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(name)) return 'invalidName';
    if (!name.endsWith(`.${value.format}`) || name.length <= value.format.length + 1) return 'extension';
    return null;
  }
  function status(code, message) {
    if (!alive) return;
    const result = ui.status(code); // exact existing W4 labels/icons/codes
    nodes.status.className = `ht-result-state ht-result-state--${result.code}`;
    nodes.status.dataset.resultState = result.code;
    nodes.status.replaceChildren();
    const icon = doc.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = result.icon;
    nodes.status.append(icon, doc.createTextNode(` ${result.label}`));
    nodes.message.textContent = ` ${L[message]}`;
    nodes.save.disabled = !ready || !!pending || !!handoff;
    nodes.refresh.disabled = !!pending || !!handoff;
  }
  function stop(job) {
    if (!job) return;
    if (job.timer !== null) clearTimer(job.timer);
    job.timer = null; job.controller.abort();
  }
  function discard(resetPrivate = false) {
    serial++; stop(pending); pending = null; ready = null;
    if (alive) {
      nodes.preview.textContent = ''; nodes.included.replaceChildren(); nodes.excluded.replaceChildren(); nodes['source-limit'].textContent = '';
      if (resetPrivate) nodes.private.checked = false;
    }
  }
  function contextChanged() {
    if (!alive) return;
    observed = readContext(); discard(true);
    // Once a handoff began we cannot retract a browser download. Ignore its late
    // callback and retain the prohibition on a second write until it settles.
    if (handoff) handoff.controller.abort();
    status(root.isConnected && available(observed) ? 'unconfirmed' : 'no_data', 'context');
  }
  function validContext(original) {
    const current = readContext();
    if (!root.isConnected || !same(original, current) || !available(current)) { contextChanged(); return false; }
    return true;
  }
  function changeDraft() {
    if (!alive) return;
    if (!same(observed, readContext())) { contextChanged(); return; }
    discard();
    const error = validation(draft()); status(error ? 'error' : 'not_checked', error || 'changed');
  }
  function fillList(node, items) {
    node.replaceChildren(...items.map(text => { const li = doc.createElement('li'); li.textContent = text; return li; }));
  }
  async function refresh() {
    if (!alive || pending || handoff) return;
    const current = readContext();
    if (!same(observed, current)) { observed = current; discard(true); }
    const value = draft(), error = validation(value);
    discard();
    if (error) { status('error', error); return; }
    if (!root.isConnected || !available(current)) { status(!root.isConnected || current?.connected === false ? 'no_data' : 'unconfirmed', 'unavailable'); return; }
    observed = current;
    const job = { id: serial, context: current, draft: value, started: clock(), controller: new globalThis.AbortController(), timer: null };
    pending = job; status('not_checked', 'busy');
    const timeout = () => {
      if (!alive || pending !== job) return;
      discard(); status('unconfirmed', 'timeout');
    };
    job.timer = setTimer(timeout, 10000);
    try {
      const payload = await buildPayload(Object.freeze({ context: current, draft: value, policy, signal: job.controller.signal }));
      if (!alive || pending !== job || job.id !== serial) return;
      if (clock() - job.started >= 10000) { timeout(); return; }
      if (!validContext(current)) return;
      clearTimer(job.timer); job.timer = null;
      if (!sameDraft(value, draft())) { changeDraft(); return; }
      const { serialized, confirmed, sourceConfirmed, status: resultState, included, excluded, sourceLimit } = payload || {};
      if (resultState === 'no_data' || serialized === '') { pending = null; status('no_data', 'noData'); return; }
      if (confirmed !== true || sourceConfirmed !== true || !['success', 'partial'].includes(resultState) || typeof serialized !== 'string' || !strings(included) || !strings(excluded) || typeof sourceLimit !== 'string' || !sourceLimit.trim()) {
        pending = null; status('unconfirmed', 'unconfirmed'); return;
      }
      // Freeze the only serialized bytes and build the only Blob NOW; Save never
      // re-runs serialization or builds a second payload from potentially newer data.
      ready = Object.freeze({ serialized, blob: new globalThis.Blob([serialized], { type: mime[value.format] }), context: current, draft: value });
      nodes.preview.textContent = ready.serialized;
      fillList(nodes.included, [...included]); fillList(nodes.excluded, [...excluded]);
      nodes['source-limit'].textContent = sourceLimit;
      pending = null; status(resultState, 'changed'); nodes.message.textContent = '';
    } catch {
      if (!alive || pending !== job || job.id !== serial) return;
      if (clock() - job.started >= 10000) { timeout(); return; }
      if (!validContext(current)) return;
      discard(); status('error', 'buildError');
    }
  }
  async function save() {
    if (!alive || !ready || pending || handoff) return;
    if (!validContext(ready.context)) return;
    const value = draft(), error = validation(value);
    if (error || !sameDraft(value, ready.draft) || nodes.preview.textContent !== ready.serialized) {
      discard(); status(error ? 'error' : 'unconfirmed', error || 'changed'); return;
    }
    const snapshot = ready; ready = null; // consume intent BEFORE invoking adapter
    const job = { id: serial, context: snapshot.context, controller: new globalThis.AbortController() };
    handoff = job; status('unconfirmed', 'saving');
    // choices cannot initiate another preview while the adapter result is unknown
    for (const key of ['filename', 'format', 'private']) nodes[key].disabled = true;
    try {
      const result = await performDownload(Object.freeze({ serialized: snapshot.serialized, blob: snapshot.blob, filename: snapshot.draft.filename, format: snapshot.draft.format, context: snapshot.context, signal: job.controller.signal }));
      if (!alive || handoff !== job || job.id !== serial || !validContext(job.context)) return;
      status(result?.outcome === 'saved' ? 'success' : 'unconfirmed', result?.outcome === 'saved' ? 'saved' : result?.outcome === 'initiated' ? 'initiated' : 'unknown');
    } catch {
      if (alive && handoff === job && job.id === serial && validContext(job.context)) status('unconfirmed', 'unknown');
    } finally {
      if (handoff === job) {
        handoff = null;
        if (alive) {
          for (const key of ['filename', 'format', 'private']) nodes[key].disabled = false;
          nodes.refresh.disabled = false; nodes.save.disabled = true;
          if (job.id !== serial) status('unconfirmed', 'unknown');
        }
      }
    }
  }
  function focusable() {
    return Array.from(nodes.dialog.querySelectorAll('input,select,button,[tabindex="0"]')).filter(el => !el.disabled);
  }
  function keydown(event) {
    if (!alive) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
    if (event.key === 'Tab') {
      const items = focusable(), first = items[0], last = items.at(-1);
      const active = nodes.dialog.getRootNode().activeElement || root.activeElement || doc.activeElement;
      if (event.shiftKey && (active === first || !nodes.dialog.contains(active))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || !nodes.dialog.contains(active))) { event.preventDefault(); first?.focus(); }
    }
  }
  function cancel() {
    if (!alive) return;
    discard(true); if (handoff) handoff.controller.abort();
    alive = false; listeners.splice(0).forEach(off => off());
    if (nodes.dialog.open) nodes.dialog.close();
    container.remove();
    container = null; nodes = null; observed = null;
    // A pending handoff remains latched until settled: reopening never repeats it.
    if (opener?.isConnected && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }
  function open({ opener: target } = {}) {
    if (destroyed) throw new Error('Export dialog destroyed');
    if (alive) return;
    const language = String(getLanguage());
    L = copy[language.startsWith('pl') ? 'pl' : 'en'];
    ui = createUiV3({ language });
    opener = target || root.activeElement || doc.activeElement;
    container = doc.createElement('div'); container.setAttribute('data-ha-tools-export', '');
    // The own shadow boundary contains CSS and local IDs; adjacent W4 status
    // elements retain their existing styling. Consumers can query this open root.
    const shadow = container.attachShadow({ mode: 'open' });
    if (root.host?.classList.contains('bento-dark')) container.classList.add('bento-dark');
    const style = doc.createElement('style'); style.textContent = ':host{display:block;min-width:0;max-width:100%;}' + css + '\n' + ui.css;
    shadow.append(style);
    const shell = doc.createElement('div'); shell.setAttribute('data-ha-tools-export', ''); shadow.append(shell);
    nodes = {};
    const make = (tag, key, parent, text) => { const node = doc.createElement(tag); if (key) { node.dataset.export = key; nodes[key] = node; } if (text) node.textContent = text; parent.append(node); return node; };
    const dialog = make('dialog', 'dialog', shell); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    const body = make('div', null, dialog); body.className = 'ht-export-body';
    const title = make('h2', 'title', body, L.title);
    // Locally unique IDs, no random or global counters/persistent state.
    const prefix = `ht-export-${String(clock()).replace(/\W/g, '')}`;
    title.id = prefix + '-title'; dialog.setAttribute('aria-labelledby', title.id);
    const fields = make('div', null, body); fields.className = 'ht-export-fields';
    const filenameLabel = make('label', null, fields); make('span', null, filenameLabel, L.filename);
    const filename = make('input', 'filename', filenameLabel); filename.type = 'text'; filename.value = defaultFilename; filename.autocomplete = 'off';
    for (const key of ['included', 'excluded']) {
      const scope = make('section', null, body); scope.dataset.exportScope = key;
      make('h3', null, scope, L[key]); make('ul', key, scope);
    }
    const formatLabel = make('label', null, body); formatLabel.className = 'ht-export-format'; make('span', null, formatLabel, L.format);
    const format = make('select', 'format', formatLabel);
    formats.forEach(value => { const option = make('option', null, format, value.toUpperCase()); option.value = value; }); format.value = defaultFormat;
    const privateLabel = make('label', null, body); privateLabel.className = 'ht-export-private';
    const privateInput = make('input', 'private', privateLabel); privateInput.type = 'checkbox'; privateInput.checked = false; make('span', null, privateLabel, L.private);
    const statusLine = make('p', null, body); statusLine.setAttribute('role', 'status'); statusLine.setAttribute('aria-live', 'polite');
    make('span', 'status', statusLine); make('span', 'message', statusLine);
    make('h3', null, body, L.source); make('p', 'source-limit', body);
    const previewHeading = make('h3', null, body, L.preview); previewHeading.id = prefix + '-preview';
    const preview = make('pre', 'preview', body); preview.tabIndex = 0; preview.setAttribute('aria-labelledby', previewHeading.id);
    const actions = make('div', null, dialog); actions.className = 'ht-export-actions';
    for (const key of ['refresh', 'save', 'cancel']) { const button = make('button', key, actions, L[key]); button.type = 'button'; }
    root.append(container); alive = true; observed = readContext();
    for (const [key, event] of [['filename', 'input'], ['format', 'change'], ['private', 'change']]) on(nodes[key], event, changeDraft);
    on(nodes.refresh, 'click', refresh); on(nodes.save, 'click', save); on(nodes.cancel, 'click', cancel);
    on(dialog, 'keydown', keydown);
    on(dialog, 'cancel', event => { event.preventDefault(); cancel(); });
    on(dialog, 'close', () => { if (alive && nodes?.dialog === dialog) cancel(); });
    try {
      if (typeof dialog.showModal !== 'function') throw new Error('Native export dialog is unavailable');
      dialog.showModal();
    } catch (error) {
      cancel();
      throw error;
    }
    // The consumer supplies exact opener even when its shadow DOM hides activeElement.
    filename.focus();
    if (handoff) {
      for (const key of ['filename', 'format', 'private']) nodes[key].disabled = true;
      preview.focus();
      status('unconfirmed', 'saving');
    } else { status('not_checked', 'changed'); void refresh(); }
  }
  function destroy() { cancel(); destroyed = true; }
  return Object.freeze({ open, cancel, contextChanged, destroy });
}
// END HA TOOLS EXPORT V3

// XSS protection helper (reuse global from panel, fallback for standalone)
const _asText = (s) => String(s ?? '');
const _escBase = (s) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const _esc = (s) => _escBase(_asText(s));
const SUPPORT_DISMISSED_KEY = 'ha-baby-tracker-support-dismissed';
const supportDismissed = () => { try { return localStorage.getItem(SUPPORT_DISMISSED_KEY) === '1'; } catch (_) { return false; } };
const ownDonateFooter = () => `<section class="donate-section" data-source="own-card" style="margin:8px 0 0;padding:4px 0;background:none;border:0;box-shadow:none;min-height:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-direction:row;justify-content:flex-start;text-align:left"><a href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--secondary-text-color,#64748b);font-weight:400;text-decoration:underline">Optional support for HA Tools</a><button type="button" class="support-dismiss" aria-label="Dismiss support link" style="margin-left:auto;padding:2px 6px;min-height:0;line-height:1;border:0;background:none;color:var(--secondary-text-color,#64748b);cursor:pointer">×</button></section>`;
const _titleCase = (s) => {
  const text = _asText(s);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Component-local persistence retains this card's existing localStorage keys.
const haToolsPersistence = { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-baby-tracker-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-baby-tracker] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-baby-tracker-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-baby-tracker-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };


/* ===== HA Tools split — inline shared infrastructure ===== */
// Bento Design System CSS (inline copy — keeps tool standalone)
const HA_BABY_TRACKER_BENTO_CSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */


/* keyboard a11y */
:focus-visible { outline: 2px solid var(--bento-primary, #6366f1); outline-offset: 2px; border-radius: 3px; }
:host {
  /* Brand palette — diamond top, gradient-friendly */
  --bento-primary: #6366f1;
  --bento-primary-2: #8b5cf6;
  --bento-primary-3: #ec4899;
  --bento-primary-hover: #4f46e5;
  --bento-primary-light: rgba(99, 102, 241, 0.08);
  --bento-primary-glow: rgba(99, 102, 241, 0.35);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.10);
  --bento-success-border: rgba(16, 185, 129, 0.25);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.10);
  --bento-error-border: rgba(239, 68, 68, 0.25);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.10);
  --bento-warning-border: rgba(245, 158, 11, 0.25);
  --bento-info: #06b6d4;
  --bento-info-light: rgba(6, 182, 212, 0.10);
  --bento-info-border: rgba(6, 182, 212, 0.25);

  /* Theme */
  --bento-bg:     var(--primary-background-color, #fafaf9);
  --bento-bg-2:   var(--card-background-color, #f5f5f4);
  --bento-card:   var(--card-background-color, #ffffff);
  --bento-glass:  rgba(255, 255, 255, 0.7);
  --bento-border: var(--divider-color, #e7e5e4);
  --bento-border-strong: rgba(0, 0, 0, 0.08);
  --bento-text:           var(--primary-text-color,   #0c0a09);
  --bento-text-secondary: var(--secondary-text-color, #57534e);
  --bento-text-muted:     var(--disabled-text-color,  #a8a29e);

  /* Radii */
  --bento-radius-xs: 8px;
  --bento-radius-sm: 12px;
  --bento-radius-md: 18px;
  --bento-radius-lg: 24px;
  --bento-radius-pill: 999px;

  /* Shadows — modern, layered */
  --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03);
  --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.10), 0 12px 24px -8px rgba(0,0,0,0.05);
  --bento-shadow-glow: 0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px -8px rgba(99,102,241,0.25);

  /* Gradients */
  --bento-grad-primary: linear-gradient(135deg, #6366f1, #8b5cf6);
  --bento-grad-rainbow: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bento-grad-success: linear-gradient(135deg, #10b981, #34d399);
  --bento-grad-error:   linear-gradient(135deg, #ef4444, #f87171);
  --bento-grad-warning: linear-gradient(135deg, #f59e0b, #fbbf24);

  /* Motion */
  --bento-trans-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans:      0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1;
  letter-spacing: -0.01em;
  display: block;
  color: var(--bento-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ───────────────────────────────── */
:host(.bento-dark) {
    --bento-bg:     var(--primary-background-color, #0a0a0f);
    --bento-bg-2:   var(--card-background-color,    #111119);
    --bento-card:   var(--card-background-color,    #16161f);
    --bento-glass:  rgba(22, 22, 31, 0.7);
    --bento-border: var(--divider-color,            #27272f);
    --bento-border-strong: rgba(255, 255, 255, 0.08);
    --bento-text:           var(--primary-text-color,   #fafaf9);
    --bento-text-secondary: var(--secondary-text-color, #d6d3d1);
    --bento-text-muted:     var(--disabled-text-color,  #78716c);
    --bento-primary:        #818cf8;
    --bento-primary-2:      #a78bfa;
    --bento-primary-3:      #f472b6;
    --bento-primary-light:  rgba(129, 140, 248, 0.12);
    --bento-primary-glow:   rgba(129, 140, 248, 0.45);
    --bento-success: #34d399;
    --bento-success-light:  rgba(52, 211, 153, 0.12);
    --bento-success-border: rgba(52, 211, 153, 0.30);
    --bento-error:   #f87171;
    --bento-error-light:    rgba(248, 113, 113, 0.12);
    --bento-error-border:   rgba(248, 113, 113, 0.30);
    --bento-warning: #fbbf24;
    --bento-warning-light:  rgba(251, 191, 36, 0.12);
    --bento-warning-border: rgba(251, 191, 36, 0.30);
    --bento-info:    #22d3ee;
    --bento-info-light:     rgba(34, 211, 238, 0.12);
    --bento-info-border:    rgba(34, 211, 238, 0.30);
    --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2);
    --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.3);
    --bento-shadow-glow: 0 0 0 1px rgba(129,140,248,0.2), 0 8px 32px -8px rgba(129,140,248,0.5);
    --bento-grad-primary: linear-gradient(135deg, #818cf8, #a78bfa);
    --bento-grad-rainbow: linear-gradient(135deg, #818cf8, #a78bfa 50%, #f472b6);
    color-scheme: dark !important;
  }
:host(.bento-dark) .card, :host(.bento-dark) .card-container, :host(.bento-dark) .main-card, :host(.bento-dark) .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
:host(.bento-dark) input, :host(.bento-dark) select, :host(.bento-dark) textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
:host(.bento-dark) table td { color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) pre, :host(.bento-dark) code { background: #1e1e2e !important; color: #e2e8f0 !important; }

/* ── Reset & motion preferences ──────────────── */
* { box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-md);
  color: var(--bento-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  transition: box-shadow var(--bento-trans), border-color var(--bento-trans);
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 20px 24px 0;
  display: flex; align-items: center; gap: 12px;
}
.header-icon { font-size: 24px; }
.header-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-grad-primary); color: #fff;
  font-size: 11px; padding: 4px 10px; border-radius: var(--bento-radius-pill);
  font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.content { padding: 20px 24px 24px; }

/* ── Tabs (modern pill style) ────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important; gap: 4px !important;
  padding: 4px !important;
  background: var(--bento-bg-2) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: wrap !important; border-bottom: 0 !important;
  width: 100%; max-width: 100%; box-sizing: border-box;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 8px 16px !important;
  border: none !important; background: transparent !important; cursor: pointer !important;
  font-size: 13px !important; font-weight: 600 !important;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif !important;
  color: var(--bento-text-secondary) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 0 !important;
  transition: all var(--bento-trans) !important;
  white-space: nowrap !important; flex: 1 1 auto !important; text-align: center !important; min-height: 40px !important;
  letter-spacing: -0.005em !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-text) !important;
  background: var(--bento-card) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  background: var(--bento-card) !important;
  color: var(--bento-primary) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-weight: 700 !important;
}
.tab-content { display: block; }
.tab-content.active { animation: bentoFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards (premium) ──────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-bg-2) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-sm) !important;
  padding: 18px !important;
  text-align: left !important;
  transition: transform var(--bento-trans), box-shadow var(--bento-trans), border-color var(--bento-trans);
  position: relative; overflow: hidden;
}
.stat-card::before, .metric-card::before, .kpi-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bento-grad-primary);
  opacity: 0; transition: opacity var(--bento-trans);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  transform: translateY(-2px); box-shadow: var(--bento-shadow-lg); border-color: var(--bento-primary-light);
}
.stat-card:hover::before, .metric-card:hover::before, .kpi-card:hover::before { opacity: 1; }
.stat-icon { font-size: 22px; margin-bottom: 6px; opacity: 0.85; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 26px; font-weight: 800; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--bento-text);
  font-feature-settings: "tnum" 1;
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px; color: var(--bento-text-secondary);
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.stat-num {
  font-size: 24px; font-weight: 800; color: var(--bento-primary);
  font-feature-settings: "tnum" 1; letter-spacing: -0.02em;
}
.stat-sub { font-size: 12px; color: var(--bento-text-muted); font-weight: 500; }

/* ── Overview grid ───────────────────────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 20px;
}

/* ── Section headers ─────────────────────────── */
.section-header, .section-title {
  display: flex; align-items: center; justify-content: space-between;
  position: relative; padding-left: 12px;
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  position: absolute; left: 0; top: 50%; transform: translateY(-50%); flex-shrink: 0;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px; border-radius: var(--bento-radius-pill);
  background: linear-gradient(90deg, var(--bento-primary), var(--bento-primary-2), transparent);
  background-size: 200% 100%;
  animation: bentoLoad 1.5s linear infinite; margin-bottom: 12px;
}
@keyframes bentoLoad { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state, .no-data, .no-results {
  text-align: center; color: var(--bento-text-secondary);
  padding: 40px 20px; font-size: 14px;
  background: var(--bento-bg-2); border-radius: var(--bento-radius-md);
  border: 1px dashed var(--bento-border);
}
.info-note, .tip-box {
  font-size: 13px; color: var(--bento-text-secondary);
  background: var(--bento-primary-light);
  border-radius: var(--bento-radius-sm); padding: 12px 14px;
  border-left: 3px solid var(--bento-primary); margin-top: 12px;
  line-height: 1.55;
}
.last-updated {
  font-size: 11px; color: var(--bento-text-muted);
  text-align: right; margin-top: 12px; font-feature-settings: "tnum" 1;
}

/* ── Buttons (premium) ───────────────────────── */
.refresh-btn {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-pill); padding: 6px 14px;
  font-size: 12px; color: var(--bento-text-secondary);
  cursor: pointer; font-weight: 600; transition: all var(--bento-trans);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
}
.refresh-btn:hover {
  background: var(--bento-card); color: var(--bento-primary);
  border-color: var(--bento-primary); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-sm);
}
.toggle-btn, .action-btn {
  background: var(--bento-grad-primary); border: none;
  border-radius: var(--bento-radius-xs); padding: 8px 16px;
  font-size: 13px; color: #fff; cursor: pointer; font-weight: 600;
  transition: all var(--bento-trans); font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px -2px var(--bento-primary-glow);
}
.toggle-btn:hover, .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px var(--bento-primary-glow);
}
.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-grad-primary); color: #fff;
  border: none; border-radius: var(--bento-radius-sm);
  padding: 12px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.01em;
  transition: all var(--bento-trans);
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.send-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px var(--bento-primary-glow);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
}

/* ── Badges / Status (modern pill) ───────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 12px; border-radius: var(--bento-radius-pill);
  font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.04em; text-transform: uppercase;
  border: 1px solid;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); border-color: var(--bento-warning-border); }
.badge-info { background: var(--bento-info-light); color: var(--bento-info); border-color: var(--bento-info-border); }

.count-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--bento-radius-pill); display: inline-flex; align-items: center;
  font-feature-settings: "tnum" 1;
}
.error-badge { background: var(--bento-error-light); color: var(--bento-error); border: 1px solid var(--bento-error-border); }
.warn-badge  { background: var(--bento-warning-light); color: var(--bento-warning); border: 1px solid var(--bento-warning-border); }
.info-badge  { background: var(--bento-primary-light); color: var(--bento-primary); border: 1px solid var(--bento-border); }
.ok-badge    { background: var(--bento-success-light); color: var(--bento-success); border: 1px solid var(--bento-success-border); }

/* ── Tables (modern) ─────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg-2); color: var(--bento-text-secondary);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--bento-border);
}
th:first-child { border-top-left-radius: var(--bento-radius-sm); }
th:last-child  { border-top-right-radius: var(--bento-radius-sm); }
td {
  padding: 14px 16px; border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text); font-size: 13px;
}
tr { transition: background var(--bento-trans-fast); }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: 0; }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 10px 14px; border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card); color: var(--bento-text);
  font-size: 14px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  transition: all var(--bento-trans); outline: none;
  letter-spacing: -0.005em;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 4px var(--bento-primary-light);
}
input::placeholder, textarea::placeholder { color: var(--bento-text-muted); }

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-bg-2); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  border: 1px solid var(--bento-border);
}
pre {
  background: #1e1e2e; color: #e2e8f0;
  padding: 16px; border-radius: var(--bento-radius-sm);
  font-size: 12.5px; overflow-x: auto; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  box-shadow: var(--bento-shadow-md);
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm); padding: 16px;
  transition: all var(--bento-trans);
}
.schedule-card:hover, .send-card:hover, .info-card:hover {
  border-color: var(--bento-primary-light); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-md);
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex; flex-wrap: wrap; align-items: flex-start;
  gap: 4px 8px; padding: 10px 12px;
  border-radius: var(--bento-radius-sm); margin-bottom: 6px;
  font-size: 12.5px; min-width: 0; overflow: hidden;
  border: 1px solid transparent; transition: all var(--bento-trans-fast);
}
.error-entry { background: var(--bento-error-light); border-color: var(--bento-error-border); }
.warn-entry  { background: var(--bento-warning-light); border-color: var(--bento-warning-border); }
.log-time { color: var(--bento-text-muted); font-feature-settings: "tnum" 1; flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.log-domain {
  font-weight: 700; flex-shrink: 1; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary); flex-basis: 100%;
  word-break: break-word; overflow-wrap: anywhere;
  white-space: pre-wrap; min-width: 0; line-height: 1.55;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 12px 16px; border-radius: var(--bento-radius-sm);
  margin-top: 14px; font-size: 13px; font-weight: 600;
  text-align: center; letter-spacing: -0.005em;
  border: 1px solid;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); border-color: var(--bento-border); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: var(--bento-radius-pill); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); background-clip: content-box; }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin  { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes bentoSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bentoStaggerIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Apply stagger to grids of stat-cards */
.stats-grid > *, .overview-grid > *, .summary-grid > * {
  animation: bentoStaggerIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.stats-grid > *:nth-child(1)  { animation-delay: 0.02s; }
.stats-grid > *:nth-child(2)  { animation-delay: 0.06s; }
.stats-grid > *:nth-child(3)  { animation-delay: 0.10s; }
.stats-grid > *:nth-child(4)  { animation-delay: 0.14s; }
.stats-grid > *:nth-child(5)  { animation-delay: 0.18s; }
.stats-grid > *:nth-child(6)  { animation-delay: 0.22s; }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 16px; }
  .header { padding: 16px 16px 0; }
  .tabs { gap: 2px !important; padding: 3px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 12px !important; font-size: 12px !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 22px; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; padding: 8px 10px; }
  .log-domain { max-width: 60%; font-size: 11.5px; }
  .log-msg { flex-basis: 100%; max-width: 100%; font-size: 11.5px; }
  pre { padding: 12px; font-size: 11.5px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  table { font-size: 12.5px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 480px) {
  .tabs { gap: 1px !important; padding: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 10px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 18px; }
}
`;
/* ============================================================ */

const FAMILY_NAV='.tabs',FAMILY_ATTR='data-tab',FAMILY_ACTIVE='active';

// Adapted from Config/YAML family15: options come only from current native buttons.
// Observe the actual navigation parent's content box, not the global viewport.
function _rememberFamilyFocus(card) {
  const active = card.shadowRoot?.activeElement;
  const nav = card.shadowRoot?.querySelector(FAMILY_NAV);
  if (active?.matches('.baby-button[data-baby-key],.baby-btn[data-baby-key]')) {
    const attribute = active.matches('.baby-button') ? 'data-index' : 'data-baby';
    return { child:true, attribute, index:Number(active.getAttribute(attribute)), key:active.getAttribute('data-baby-key') };
  }
  if (active?.id === 'ha-tools-tab-picker') return { picker:true };
  if (nav?.contains(active)) return { tab:active.getAttribute(FAMILY_ATTR) };
  return null;
}
function _disconnectFamilyNavigation(card) {
  card._familyNavObserver?.disconnect();card._familyNavObserver=null;card._familyNavTarget=null;
}
function _bindFamilyNavigation(card, restoreFocus=null) {
  const root=card.shadowRoot, nav=root?.querySelector(FAMILY_NAV);
  if (!nav) { _disconnectFamilyNavigation(card);return; }
  let label=root.querySelector('.ht-tab-picker');
  if (!label) {
    label=card.ownerDocument.createElement('div');label.className='ht-tab-picker';
    const text=card.ownerDocument.createElement('label');text.htmlFor='ha-tools-tab-picker';label.append(text);
    const select=card.ownerDocument.createElement('select');select.id='ha-tools-tab-picker';select.setAttribute('data-baby-family-picker','');label.append(select);nav.before(label);
    select.addEventListener('change',()=>{
      const button=Array.from(root.querySelectorAll(FAMILY_NAV+' button['+FAMILY_ATTR+']')).find(item=>item.getAttribute(FAMILY_ATTR)===select.value&&!item.disabled&&!item.hidden);
      if(button)button.click(); // The original handler owns navigation, history and guards.
      _bindFamilyNavigation(card);
    });
  }
  label.firstElementChild.textContent=card._lang==='pl'?'Zakładka':'Tab';
  const select=label.querySelector('select');
  const buttons=Array.from(nav.querySelectorAll('button['+FAMILY_ATTR+']')).filter(button=>!button.hidden&&!button.disabled);
  const options=Array.from(select.options);
  if(options.length!==buttons.length||buttons.some((button,index)=>options[index]?.value!==button.getAttribute(FAMILY_ATTR))) {
    select.replaceChildren(...buttons.map(button=>{const option=card.ownerDocument.createElement('option');option.value=button.getAttribute(FAMILY_ATTR);return option;}));
  }
  buttons.forEach((button,index)=>{select.options[index].textContent=button.getAttribute('aria-label')||button.textContent.trim();});
  const selected=buttons.find(button=>button.classList.contains(FAMILY_ACTIVE));select.value=selected?.getAttribute(FAMILY_ATTR)||'';
  const target=nav.parentElement;
  const applyWidth=width=>{
    const currentNav=root.querySelector(FAMILY_NAV),currentLabel=root.querySelector('.ht-tab-picker');if(!currentNav||!currentLabel)return;
    const input=currentLabel.querySelector('select'),active=root.activeElement;
    const style=getComputedStyle(currentNav);
    const available=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
    const narrow=available>0&&available<280,fromTab=currentNav.contains(active),fromPicker=active===input;
    currentNav.hidden=narrow;currentLabel.hidden=!narrow;
    if(narrow&&fromTab)input.focus({preventScroll:true});
    else if(!narrow&&fromPicker)currentNav.querySelector('button.'+FAMILY_ACTIVE)?.focus({preventScroll:true});
  };
  if(card._familyNavTarget!==target) {
    _disconnectFamilyNavigation(card);
    const style=getComputedStyle(target);
    const measured=target.getBoundingClientRect().width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)-(parseFloat(style.borderLeftWidth)||0)-(parseFloat(style.borderRightWidth)||0);
    if(measured>0)card._familyNavWidth=measured;
    if(typeof ResizeObserver==='function'&&card.isConnected) {
      card._familyNavTarget=target;
      card._familyNavObserver=new ResizeObserver(entries=>{
        if(!card.isConnected||card._familyNavTarget!==target)return;
        const entry=entries.find(item=>item.target===target);if(!entry)return;
        card._familyNavWidth=entry.contentRect.width;applyWidth(card._familyNavWidth);
      });
      card._familyNavObserver.observe(target);
    }
  }
  applyWidth(card._familyNavWidth||900);
  // If ResizeObserver is unavailable, all native tabs and the complete picker stay usable.
  if(typeof ResizeObserver!=='function') { nav.hidden=false;label.hidden=false; }
  if(restoreFocus?.child) {
    const children = Array.from(root.querySelectorAll(`button[${restoreFocus.attribute}][data-baby-key]`));
    const button = children.find(item => item.getAttribute('data-baby-key') === restoreFocus.key)
      || children.find(item => Number(item.getAttribute(restoreFocus.attribute)) === card.selectedBaby);
    button?.focus({preventScroll:true});
  } else if(restoreFocus) {
    const button=buttons.find(item=>item.getAttribute(FAMILY_ATTR)===restoreFocus.tab)||selected;
    if(nav.hidden)select.focus({preventScroll:true});else button?.focus({preventScroll:true});
  }
}


// Preserve only manual record forms, not model-owned history filters or settings.
const BABY_MANUAL_FIELDS = ['feedingType','feedingTime','feedingAmount','feedingNotes',
  'lactationType','lactationTime','lactationSide','lactationDuration','lactationAmount','lactationNotes',
  'diapersType','diapersTime','diapersNotes','sleepFromTime','sleepToTime','sleepDate',
  'growthType','growthValue','growthDate'];
function _babyFamilyContext(card) {
  const baby=card.babies?.[card.selectedBaby], user=card._hass?.user;
  return JSON.stringify([!!card._backendAvailable,card.selectedBaby,baby?.entry_id||baby?.name,
    user?.id,!!user?.is_admin,user?.is_active,card._hass?.config?.time_zone]);
}
function _rememberBabyManualFields(card) {
  const root=card.shadowRoot,active=root.activeElement;
  return BABY_MANUAL_FIELDS.flatMap(id=>{
    const field=root.getElementById(id);if(!field)return [];
    return [{id,value:field.value,focused:field===active,start:field.selectionStart,
      end:field.selectionEnd,direction:field.selectionDirection,scrollTop:field.scrollTop}];
  });
}
function _restoreBabyManualFields(card,fields) {
  for(const saved of fields) {
    const field=card.shadowRoot.getElementById(saved.id);if(!field||field.disabled)continue;
    field.value=saved.value;field.scrollTop=saved.scrollTop;
    if(saved.focused) {
      field.focus({preventScroll:true});
      if(typeof saved.start==='number'&&typeof field.setSelectionRange==='function')
        field.setSelectionRange(saved.start,saved.end,saved.direction||'none');
    }
  }
}
const BABY_FAMILY_CSS = `
/* Native targets and complete navigation, measured against this card's content. */
*, *::before, *::after { box-sizing:border-box; }
button, input:not([type=checkbox]):not([type=radio]), select, textarea, summary { min-height:44px !important; min-width:44px; max-width:100%; }
button, select, input, textarea { font:inherit; }
button { white-space:normal; overflow-wrap:anywhere; }
label:has(input[type=checkbox]), label:has(input[type=radio]) { display:flex !important; align-items:center; gap:8px; min-height:44px; }
input[type=checkbox], input[type=radio] { flex:0 0 auto; width:16px !important; height:16px; min-width:16px; }
code { overflow-wrap:anywhere; }
#sentencesOutput > div { flex-wrap:wrap; gap:8px; }
.tabs { display:flex; flex-wrap:wrap; overflow:visible; gap:8px; }
.tabs .tab-button { flex:1 1 auto; min-width:44px; min-height:44px !important; white-space:normal !important; }
.tabs[hidden], .ht-tab-picker[hidden] { display:none !important; }
.ht-tab-picker { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; min-width:0; }
.ht-tab-picker select { width:100%; }
.baby-family-children { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px; padding:0 4px; }
.card-header { flex-wrap:wrap; gap:12px; }
.card-header .card-title { flex:1 1 100%; min-width:0; }
.card-header .baby-selector { flex:1 1 100%; min-width:0; flex-wrap:wrap; margin-bottom:0; }
.card-header .baby-button { flex:0 0 auto; max-width:100%; }
.manage-children-link { display:inline-flex; align-items:center; min-height:44px; min-width:44px; max-width:100%; }
.support-dismiss, #tip-dismiss { min-width:44px !important; min-height:44px !important; }
.donate-section a, .donate-section button { display:inline-flex; align-items:center; justify-content:center; min-width:44px; min-height:44px; }
.form-row, .form-group, .section-block, .tab-pane { min-width:0; }
.card { container-type:inline-size; container-name:baby-family; }
.button-group { flex-wrap:wrap; }
@container baby-family (max-width:500px) {
  .form-row { flex-direction:column; grid-template-columns:minmax(0,1fr); }
  .form-row > .form-group { width:100%; flex-basis:100%; }
  #sentencesCheckboxes { grid-template-columns:minmax(0,1fr) !important; }
}
`;

class HaBabyTracker extends HTMLElement {

  get _t() {
    const T = {
      pl: {
        title: 'Dziennik Niemowlęcia i Laktacji',
        loading: 'Wczytywanie...',
        noData: 'Brak danych',
        error: 'Błąd',
        refresh: 'Odśwież',
        save: 'Zapisz',
        cancel: 'Anuluj',
        remove: 'Usu\u0144',
        locale: 'pl-PL',
        breastfeeding: 'Karmienie piersi\u0105',
        leftBreast: 'Lewa pierś',
        rightBreast: 'Prawa pierś',
        startTimer: 'Start',
        stopTimer: 'Stop',
        switchBreast: 'Zmień pierś',
        duration: 'Czas trwania',
        sleepFrom: 'Sen od',
        sleepTo: 'Sen do',
        startSleep: 'Zacznij sen',
        endSleep: 'Koniec snu',
        sleepDuration: 'Czas snu',
        addChild: 'Dodaj dziecko',
        saveNames: 'Zapisz nazwy',
        sideLeft: 'Lewa',
        sideRight: 'Prawa',
        sideBoth: 'Obie',
        typeBreastfeed: 'Karmienie piersi\u0105',
        typePump: 'Odci\u0105ganie',
        typeManual: 'R\u0119czne',
        typeSupplement: 'Suplement',
      },
      en: {
        title: 'Baby and Lactation Journal',
        loading: 'Loading...',
        noData: 'No data',
        error: 'Error',
        refresh: 'Refresh',
        save: 'Save',
        cancel: 'Cancel',
        remove: 'Remove',
        locale: 'en-US',
        breastfeeding: 'Breastfeeding',
        leftBreast: 'Left Breast',
        rightBreast: 'Right Breast',
        startTimer: 'Start',
        stopTimer: 'Stop',
        switchBreast: 'Switch Breast',
        duration: 'Duration',
        sleepFrom: 'Sleep From',
        sleepTo: 'Sleep To',
        startSleep: 'Start Sleep',
        endSleep: 'End Sleep',
        sleepDuration: 'Sleep Duration',
        addChild: 'Add Child',
        saveNames: 'Save Names',
        sideLeft: 'Left',
        sideRight: 'Right',
        sideBoth: 'Both',
        typeBreastfeed: 'Breastfeeding',
        typePump: 'Pumping',
        typeManual: 'Hand Expr.',
        typeSupplement: 'Supplement',
      },
    };
    return T[this._lang] || T.en;
  }

  setConfig(config) {
    this.config = config;
    // Dashboard edits keep the discovered HA identities and current selection.
    if (!this._backendAvailable) {
      this.babies = this._loadChildren();
      if (this.babies.length === 0) this.babies = config.babies || [{ name: 'Baby 1' }];
      this.selectedBaby = 0;
      this.selectedTab = 'feeding';
    }
    this.renderCard();
    this._ensureBackend();
  }

  _sanitize(str) {
    if (!str) return str;
    try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
  }
  set hass(hass) {
    if (this._hass?.user?.id !== hass?.user?.id || this._hass?.user?.is_admin !== hass?.user?.is_admin
      || this._hass?.user?.is_active !== hass?.user?.is_active
      || this._hass?.connection !== hass?.connection) this._timerAuthorityEpochV3++;
    try {
      var _bg = (getComputedStyle(this).getPropertyValue('--card-background-color') || getComputedStyle(this).getPropertyValue('--primary-background-color') || '').trim();
      var _d = false;
      if (_bg) {
        var _h, _r, _g, _b, _m;
        if (_bg.charAt(0) === '#') { _h = _bg.slice(1); if (_h.length === 3) _h = _h.replace(/(.)/g, '$1$1'); _r = parseInt(_h.slice(0,2),16); _g = parseInt(_h.slice(2,4),16); _b = parseInt(_h.slice(4,6),16); }
        else { _m = _bg.match(/[\d.]+/g); if (_m) { _r = +_m[0]; _g = +_m[1]; _b = +_m[2]; } }
        if (_r != null) _d = (0.2126*_r + 0.7152*_g + 0.0722*_b) / 255 < 0.5;
      } else if (hass && hass.themes) { _d = !!hass.themes.darkMode; }
      this.classList.toggle('bento-dark', _d);
    } catch (e) {}

    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';
    this._hass = hass;
    this._listenBackupConnectionV3(hass?.connection);
    this._syncBackupContextV3();
    if (!hass) return;
    // HA panel_custom provides panel.config, while Lovelace calls setConfig().
    // Without this, the sidebar instance remains blank after its first hass update.
    if (!this.config && this.panel) this.config = this.panel.config || {};
    this._ensureBackend();
    const now = Date.now();
    if (!this._firstHassRender) {
      this._firstHassRender = true;
      this.renderCard();
      this._lastRenderTime = now;
      return;
    }
    if (now - (this._lastRenderTime || 0) < 5000) {
      if (!this._renderScheduled) {
        this._renderScheduled = true;
        setTimeout(() => {
          this._renderScheduled = false;
          if (!this._bentoEditing()) this.renderCard();
          this._lastRenderTime = Date.now();
        }, 5000 - (now - (this._lastRenderTime || 0)));
      }
      return;
    }
    if (!this._bentoEditing()) this.renderCard();
    this._lastRenderTime = now;
  }

  get hass() {
    return this._hass;
  }

  _bentoEditing() {
    // Skip hass-update full re-renders while the user is typing in a field,
    // so external state changes don't steal focus/caret mid-entry.
    const a = this.shadowRoot && this.shadowRoot.activeElement;
    return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
  }

  constructor() {
    super();
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this.attachShadow({ mode: 'open' });
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
    // --- Throttle fields ---
    this._lastRenderTime = 0;
    this._renderScheduled = false;
    this._firstHassRender = false;
    this._lastHtml = '';
    // --- Pagination ---
    this._currentPage = {};
    this._pageSize = 15;
    this.feedingData = new Map();
    this.lactationData = new Map();
    this.diapersData = new Map();
    this.sleepData = new Map();
    this.growthData = new Map();
    this.sleepTimer = null;
    this.sleepStartTime = null;
    // Breastfeeding timer state
    this._bfTimer = null;
    this._bfCurrentSide = null;
    this._bfStartTime = null;
    this._bfSessions = [];
    this._backendAvailable = false;
    this._backendChecked = false;
    this._backendDetecting = false;
    this._backendDetectionFailed = false;
    this._backendRetryAt = 0;
    this._backendLoading = false;
    this._backendChildren = [];
    this._backendUnsubEvents = null;
    this._timerAuthorityEpochV3 = 0;
    this._backupRevisionV3 = 0;
    this._backupPartsV3 = null;
    this._backupDialogV3 = null;
    this._backupBrowserOnlineV3 = navigator.onLine !== false;
    this._backupTransportOnlineV3 = true;
    this._backupConnectionV3 = null;
    this._backupHandlersV3 = Object.fromEntries(['offline', 'online', 'ready', 'disconnected', 'storage'].map(type => [type, () => {
      if (type !== 'storage') this._timerAuthorityEpochV3++;
      if (type === 'offline' || type === 'online') this._backupBrowserOnlineV3 = type === 'online';
      if (type === 'ready' || type === 'disconnected') this._backupTransportOnlineV3 = type === 'ready';
      this._backupRevisionV3++; this._backupDialogV3?.contextChanged();
      if (this._backendAvailable && (type === 'offline' || type === 'disconnected')) {
        this._historyLoadFailed = true;
        this.updateAllDisplays();
      }
      if (type === 'online' || type === 'ready') this._queueBackendReadRecoveryV3();
    }]));
    this.babies = this._loadChildren();
    this.selectedBaby = 0;
    this.initializeDataStructures();
  }

  // --- localStorage persistence ---
  _storageKey() { return 'ha-tools-baby-tracker-' + this.selectedBaby; }

  _startAutoSave() {
    if (this._autoSaveTimer) return;
    this._autoSaveTimer = setInterval(() => {
      if (this.sleepTimer || this._bfTimer) {
        this._saveData();
      } else {
        this._stopAutoSave();
      }
    }, 30000); // Auto-save every 30s while any timer runs
  }

  _stopAutoSave() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  }

  _saveData() {
    if (this._backendAvailable) return true;
    if (this._backendDetectionFailed || this._backendDetecting) return false;
    try {
      const data = {
        feeding: {},
        lactation: {},
        diapers: {},
        sleep: {},
        growth: {},
        breastfeeding: this._bfSessions || [],
        // Persist running timers so they survive browser close
        _runningTimers: {
          sleep: this.sleepStartTime ? { startTime: this.sleepStartTime, baby: this.selectedBaby } : null,
          bf: this._bfStartTime ? { startTime: this._bfStartTime, side: this._bfCurrentSide, sessions: this._bfSessions || [] } : null
        }
      };
      this.feedingData.forEach((v, k) => { data.feeding[k] = v; });
      this.lactationData.forEach((v, k) => { data.lactation[k] = v; });
      this.diapersData.forEach((v, k) => { data.diapers[k] = v; });
      this.sleepData.forEach((v, k) => { data.sleep[k] = v; });
      this.growthData.forEach((v, k) => { data.growth[k] = v; });
      localStorage.setItem(this._storageKey(), JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Baby and Lactation Tracker: save failed', e);
      return false;
    }
  }

  _loadData() {
    if (this._backendAvailable) {
      this._loadBackendData();
      return;
    }
    try {
      const raw = localStorage.getItem(this._storageKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.feeding) Object.entries(data.feeding).forEach(([k, v]) => { this.feedingData.set(k, v); });
      if (data.lactation) Object.entries(data.lactation).forEach(([k, v]) => { this.lactationData.set(k, v); });
      if (data.diapers) Object.entries(data.diapers).forEach(([k, v]) => { this.diapersData.set(k, v); });
      if (data.sleep) Object.entries(data.sleep).forEach(([k, v]) => { this.sleepData.set(k, v); });
      if (data.growth) Object.entries(data.growth).forEach(([k, v]) => { this.growthData.set(k, v); });
      if (data.breastfeeding) this._bfSessions = data.breastfeeding;
      // Recover running timers after browser restart
      if (data._runningTimers) {
        const rt = data._runningTimers;
        if (rt.sleep && rt.sleep.startTime && !this.sleepTimer) {
          // Sleep was running — resume timer
          this.sleepStartTime = rt.sleep.startTime;
          this.sleepTimer = setInterval(() => this.updateSleepTimerDisplay(), 100);
          console.info('[Baby Tracker] Recovered sleep timer started at ' + new Date(rt.sleep.startTime).toLocaleTimeString());
        }
        if (rt.bf && rt.bf.startTime && !this._bfTimer) {
          // Breastfeeding was running — resume timer
          this._bfStartTime = rt.bf.startTime;
          this._bfCurrentSide = rt.bf.side;
          this._bfTimer = setInterval(() => this.updateBreastfeedingDisplay(), 100);
          console.info('[Baby Tracker] Recovered BF timer (' + rt.bf.side + ') started at ' + new Date(rt.bf.startTime).toLocaleTimeString());
        }
      }
    } catch (e) { console.warn('Baby and Lactation Tracker: load failed', e); }
  }

  async _ensureBackend() {
    const hass = this.hass;
    if (!hass?.callWS || this._backendDetecting || this._backendChecked || Date.now() < this._backendRetryAt) return;
    this._backendDetecting = true;
    try {
      const result = await hass.callWS({ type: 'ha_baby_tracker/list_children' });
      if (!Array.isArray(result?.children)) throw new Error('Invalid children response');
      const children = result.children;
      this._backendChecked = true;
      this._backendDetectionFailed = false;
      this._backendRetryAt = 0;
      if (!children.length) {
        this._backendAvailable = false;
        return;
      }

      const previousName = this.babies?.[this.selectedBaby]?.name;
      this._backendChildren = children;
      this.babies = children.map((child) => ({
        name: child.name,
        entry_id: child.entry_id,
        device_id: child.device_id,
        date_of_birth: child.date_of_birth,
      }));
      const previousIndex = this.babies.findIndex((child) => child.name === previousName);
      this.selectedBaby = previousIndex >= 0 ? previousIndex : 0;
      this._backendAvailable = true;
      this.initializeDataStructures();
      await this._subscribeBackendEvents();
      await this._loadBackendData();
      await this._promptLocalMigration();
      this.renderCard();
    } catch (e) {
      // Only an absent command proves that legacy browser storage is appropriate.
      // Errors after successful discovery must not demote an established backend.
      if (!this._backendChecked) {
        this._backendAvailable = false;
        this._backendChecked = e?.code === 'unknown_command';
        this._backendDetectionFailed = !this._backendChecked;
        this._backendRetryAt = this._backendDetectionFailed ? Date.now() + 5000 : 0;
      }
      console.debug('[ha-baby-tracker] backend discovery or initialization failed', e);
    } finally {
      this._backendDetecting = false;
      if (this._backendDetectionFailed) this.renderCard();
    }
  }

  async _subscribeBackendEvents() {
    const hass = this.hass;
    if (this._backendUnsubEvents || !hass?.connection?.subscribeMessage) return;
    try {
      this._backendUnsubEvents = await hass.connection.subscribeMessage((event) => {
        this._backupRevisionV3++; this._backupDialogV3?.contextChanged();
        const entryId = event?.data?.entry_id;
        if (!entryId || entryId === this._currentBackendEntryId()) {
          this._loadBackendData();
        }
      }, { type: 'ha_baby_tracker/subscribe' });
    } catch (e) {
      console.debug('[ha-baby-tracker] event subscription failed', e);
    }
  }

  _currentBackendEntryId() {
    return this.babies?.[this.selectedBaby]?.entry_id || null;
  }

  _queueBackendReadRecoveryV3() {
    if (this._backendReadRecoveryQueuedV3) return;
    this._backendReadRecoveryQueuedV3 = true;
    Promise.resolve().then(async () => {
      this._backendReadRecoveryQueuedV3 = false;
      if (!this.isConnected || !this._backendAvailable || !this._hass?.callWS
        || navigator.onLine === false || !this._backupBrowserOnlineV3
        || !this._backupTransportOnlineV3 || this._hass.connection?.connected === false) return;
      await this._subscribeBackendEvents();
      await this._loadBackendData();
    }).catch(error => console.warn('Baby Tracker: connection recovery read failed', error));
  }

  async _loadBackendData() {
    const hass = this.hass;
    const entryId = this._currentBackendEntryId();
    if (!this._backendAvailable || !hass?.callWS || !entryId) return;
    const context = this._timerAuthorityV3();
    const request = this._backendLoadSequence = (this._backendLoadSequence || 0) + 1;
    this._backendLoading = true;
    this._historyLoadFailed = false;
    this._syncBackupContextV3();
    this.updateAllDisplays();
    try {
      const baby = this.getCurrentBaby();
      const categories = ['feeding', 'lactation', 'diapers', 'sleep', 'growth', 'bf_sessions'];
      const results = await Promise.all(categories.map((category) => hass.callWS({
        type: 'ha_baby_tracker/get_data',
        entry_id: entryId,
        category,
      })));
      // Another child selection or update may have started a newer read.
      // Never apply a previous child's sessions/timers to the selected child.
      if (request !== this._backendLoadSequence || !this._timerAuthorityMatchesV3(context)) return;
      let runningTimers = null;
      results.forEach((result) => {
        const category = result.category;
        const data = Array.isArray(result.data) ? result.data : [];
        if (category === 'feeding') this.feedingData.set(baby, data);
        if (category === 'lactation') this.lactationData.set(baby, data);
        if (category === 'diapers') this.diapersData.set(baby, data);
        if (category === 'sleep') this.sleepData.set(baby, data);
        if (category === 'growth') this.growthData.set(baby, data);
        if (category === 'bf_sessions') this._bfSessions = data;
        if (result.running_timers) runningTimers = result.running_timers;
      });
      this._historyLoadFailed = false;
      this._backendLoading = false;
      if (runningTimers) this._applyBackendTimers(runningTimers);
      this.updateAllDisplays();
      this.renderCard();
    } catch (e) {
      if (request === this._backendLoadSequence && this._timerAuthorityMatchesV3(context)) {
        this._historyLoadFailed = true;
        this._backendLoading = false;
        this.updateAllDisplays();
      }
      console.warn('Baby and Lactation Tracker: backend load failed', e);
    } finally {
      if (request === this._backendLoadSequence) this._backendLoading = false;
    }
  }

  _applyBackendTimers(timers) {
    const sleep = timers?.sleep;
    if (sleep?.startTime) {
      this.sleepStartTime = sleep.startTime;
      if (!this.sleepTimer) this.sleepTimer = setInterval(() => this.updateSleepTimerDisplay(), 100);
    } else if (this.sleepTimer) {
      clearInterval(this.sleepTimer);
      this.sleepTimer = null;
      this.sleepStartTime = null;
    }

    const bf = timers?.bf;
    if (bf?.startTime) {
      this._bfStartTime = bf.startTime;
      this._bfCurrentSide = bf.side || 'left';
      if (!this._bfTimer) this._bfTimer = setInterval(() => this.updateBreastfeedingDisplay(), 100);
    } else if (this._bfTimer) {
      clearInterval(this._bfTimer);
      this._bfTimer = null;
      this._bfStartTime = null;
      this._bfCurrentSide = null;
    }
  }

  _backendConnectionNotice() {
    this._showToast(this._lang === 'pl'
      ? 'Nie potwierdzono połączenia z Home Assistant. Sprawdź połączenie i spróbuj ponownie.'
      : 'The connection to Home Assistant was not confirmed. Check the connection and try again.', 'unconfirmed');
  }

  _showSaveError() {
    if (this._backendDetectionFailed || this._backendDetecting) return this._backendConnectionNotice();
    if (!this._backendAvailable) {
      this._showToast(this._lang === 'pl'
        ? 'Nie zapisano danych w przeglądarce. Sprawdź dostępne miejsce i ustawienia pamięci, a następnie spróbuj ponownie.'
        : 'Could not save in this browser. Check available storage and storage settings, then try again.', 'error');
      return;
    }
    this._showToast(this._lang === 'pl'
      ? 'Nie potwierdzono zapisu. Sprawdź połączenie i spróbuj ponownie.'
      : 'Save was not confirmed. Check the connection and try again.', 'unconfirmed');
  }

  async _saveEntries(entries) {
    const baby = this.getCurrentBaby();
    if (this._entryWritePending) return false;
    this._entryWritePending = true;
    const previous = new Map();
    try {
      let saved = entries;
      if (this._backendAvailable) {
        const result = await this.hass.callWS({
          type: 'ha_baby_tracker/add_entries',
          entry_id: this._currentBackendEntryId(),
          entries,
        });
        saved = result.entries;
        if (!Array.isArray(saved) || saved.length !== entries.length) throw new Error('Missing save acknowledgement');
      }
      for (const { category, entry } of saved) {
        const map = this[category + 'Data'];
        if (!previous.has(map)) previous.set(map, { existed: map.has(baby), records: map.get(baby) });
        const existing = map.get(baby) || [];
        // The subscription may have delivered the persisted record before this reply.
        const records = existing.filter(item => !entry.id || item.id !== entry.id);
        if (category === 'lactation') records.unshift(entry);
        else records.push(entry);
        map.set(baby, records);
      }
      if (!this._saveData()) throw new Error('Local save was not confirmed');
      return true;
    } catch (e) {
      if (!this._backendAvailable) {
        for (const [map, before] of previous) {
          if (before.existed) map.set(baby, before.records);
          else map.delete(baby);
        }
      }
      this._showSaveError();
      return false;
    } finally {
      this._entryWritePending = false;
    }
  }

  _timerAuthorityV3() {
    const h = this._hass;
    return [this._timerAuthorityEpochV3, this._currentBackendEntryId(), this._backendAvailable,
      h?.user?.id, h?.user?.is_admin, h?.user?.is_active, h?.connection, h?.connection?.connected,
      h?.connection?.socket?.readyState, this.isConnected, navigator.onLine,
      this._backupBrowserOnlineV3, this._backupTransportOnlineV3];
  }

  _timerAuthorityMatchesV3(context) {
    return this._timerAuthorityV3().every((value, index) => value === context[index]);
  }

  async _changeBackendTimer(kind, action, side) {
    const entryId = this._currentBackendEntryId();
    const context = this._timerAuthorityV3();
    const hass = this.hass;
    if (!entryId || !hass?.callWS || navigator.onLine === false || !this._backupBrowserOnlineV3
      || !this._backupTransportOnlineV3 || hass.connection?.connected === false
      || hass.connection?.socket?.readyState === 3) {
      this._backendConnectionNotice(); return false;
    }
    const pendingKey = entryId + ':' + kind;
    this._timerWrites ??= new Set();
    if (this._timerWrites.has(pendingKey)) return false;
    this._timerWrites.add(pendingKey);
    try {
      const result = await hass.callWS({
        type: 'ha_baby_tracker/timer_' + action, entry_id: entryId, kind,
        ...(side ? { side } : {}),
      });
      // A successful old write must not change another child's/current account's UI
      // or continue an automatic stop-then-start side switch in that new context.
      if (!this._timerAuthorityMatchesV3(context)) return false;
      if (!result || result.entry_id !== entryId) throw new Error('Missing timer acknowledgement');
      if (action === 'start') {
        const timer = result.timer;
        if (!timer || typeof timer.startTime !== 'number' || !Number.isFinite(timer.startTime)
          || timer.startTime <= 0 || !Number.isFinite(new Date(timer.startTime).getTime())
          || (kind === 'bf' && !['left', 'right'].includes(timer.side))) throw new Error('Invalid timer acknowledgement');
      } else if (result.category !== (kind === 'sleep' ? 'sleep' : 'bf_sessions')
        || !result.entry || typeof result.entry.id !== 'string' || !result.entry.id
        || typeof result.entry.duration !== 'number' || !Number.isFinite(result.entry.duration)
        || result.entry.duration < 0) throw new Error('Missing saved timer entry');
      const timers = {
        sleep: this.sleepTimer ? { startTime: this.sleepStartTime } : null,
        bf: this._bfTimer ? { startTime: this._bfStartTime, side: this._bfCurrentSide } : null,
      };
      timers[kind] = action === 'start' ? result.timer : null;
      this._applyBackendTimers(timers);
      if (action === 'stop') {
        const records = kind === 'sleep' ? (this.sleepData.get(entryId) || []) : this._bfSessions;
        if (!records.some(entry => entry.id === result.entry.id)) records.push(result.entry);
        if (kind === 'sleep') this.sleepData.set(entryId, records);
      }
      this.updateAllDisplays(); this.updateSleepTimerDisplay(); this.updateBreastfeedingDisplay();
      return true;
    } catch (e) {
      if (this._timerAuthorityMatchesV3(context)) this._showSaveError();
      return false;
    } finally {
      this._timerWrites.delete(pendingKey);
    }
  }

  _buildLocalMigrationPayload() {
    const children = this._loadChildren().map((child) => child.name);
    const dataByIndex = {};
    let hasData = false;
    children.forEach((_name, index) => {
      try {
        const raw = localStorage.getItem('ha-tools-baby-tracker-' + index);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        dataByIndex[String(index)] = parsed;
        if (['feeding', 'lactation', 'diapers', 'sleep', 'growth', 'breastfeeding', 'bf_sessions'].some((key) => {
          const value = parsed[key];
          if (Array.isArray(value)) return value.length > 0;
          if (value && typeof value === 'object') return Object.values(value).some((items) => Array.isArray(items) && items.length > 0);
          return false;
        }) || parsed._runningTimers?.sleep || parsed._runningTimers?.bf) {
          hasData = true;
        }
      } catch (e) {
        console.warn('Baby and Lactation Tracker: migration payload read failed', e);
      }
    });
    return hasData ? { children, data_by_index: dataByIndex } : null;
  }

  _canRetryLocalMigration() {
    if (!this._backendAvailable || !this.hass?.user?.is_admin || !this.hass?.callWS) return false;
    try {
      if (JSON.parse(localStorage.getItem('ha-baby-tracker-v5-migration-prompted') || 'null')?.status === 'done') return false;
    } catch (_) { /* a malformed marker can be retried */ }
    return !!this._buildLocalMigrationPayload();
  }

  _migrationFeedbackV3(value, committed = false) {
    const PL = this._lang === 'pl';
    const ui = createUiV3({ language: this._lang });
    const labels = {
      feeding: PL ? 'Karmienie' : 'Feeding', lactation: PL ? 'Laktacja' : 'Lactation',
      diapers: PL ? 'Pieluchy' : 'Diapers', sleep: PL ? 'Sen' : 'Sleep',
      growth: PL ? 'Wzrost' : 'Growth', bf_sessions: PL ? 'Karmienie piersią' : 'Breastfeeding',
      'running_timers.sleep': PL ? 'Timer snu' : 'Sleep timer',
      'running_timers.bf': PL ? 'Timer karmienia piersią' : 'Breastfeeding timer',
    };
    const object = item => !!item && typeof item === 'object' && !Array.isArray(item);
    const count = item => Number.isSafeInteger(item) && item >= 0;
    const skips = item => Array.isArray(item) && item.every(key => Object.hasOwn(labels, key));
    const issuesValid = item => object(item) && Array.isArray(item.unmigrated) &&
      item.unmigrated.every(name => typeof name === 'string') && Array.isArray(item.ambiguous) &&
      item.ambiguous.every(issue => object(issue) && typeof issue.name === 'string' &&
        ['duplicate_local_name', 'duplicate_target_name'].includes(issue.reason)) &&
      object(item.skipped_non_empty) && Object.values(item.skipped_non_empty).every(skips);
    const feedback = (code, detail) => {
      const state = ui.status(code);
      return { code, text: `${state.icon} ${state.label}\n${detail}` };
    };
    const unknown = () => feedback('unconfirmed', PL
      ? 'Nie potwierdzono wyniku migracji. Lokalne dane zachowano. Sprawdź dane w integracji przed ponowieniem.'
      : 'The migration result was not confirmed. Local data was kept. Check integration data before retrying.');
    const preview = committed ? value?.preview : value;
    if (!issuesValid(preview) || !count(preview.entries) || !count(preview.timers) || !count(preview.targets)) return unknown();
    if (!count(preview.entries + preview.timers) || (preview.entries + preview.timers > 0 && preview.targets === 0)) return unknown();
    const omitted = new Set(Object.values(preview.skipped_non_empty).flat());
    let entries = 0, timers = 0;
    if (committed) {
      if (!issuesValid(value) || !object(value.migrated)) return unknown();
      for (const key of Object.values(value.skipped_non_empty).flat()) omitted.add(key);
      const slices = Object.values(value.migrated);
      if (slices.length !== preview.targets) return unknown();
      for (const slice of slices) {
        if (!object(slice) || !object(slice.migrated) || !skips(slice.skipped_non_empty) ||
            !Array.isArray(slice.migrated_timers) ||
            !slice.migrated_timers.every(kind => ['sleep', 'bf'].includes(kind)) ||
            new Set(slice.migrated_timers).size !== slice.migrated_timers.length) return unknown();
        if (!Object.keys(slice.migrated).length && !slice.migrated_timers.length && !slice.skipped_non_empty.length) return unknown();
        for (const [category, total] of Object.entries(slice.migrated)) {
          if (!Object.hasOwn(labels, category) || category.startsWith('running_timers.') || !count(total) || total === 0) return unknown();
          if (slice.skipped_non_empty.includes(category)) return unknown();
          entries += total;
        }
        if (slice.migrated_timers.some(kind => slice.skipped_non_empty.includes(`running_timers.${kind}`))) return unknown();
        timers += slice.migrated_timers.length;
        for (const key of slice.skipped_non_empty) omitted.add(key);
      }
      if (entries > preview.entries || timers > preview.timers) return unknown();
      // A deficit without a commit-time skip is not a positive acknowledgement.
      const commitSkips = slices.flatMap(slice => slice.skipped_non_empty);
      if (entries < preview.entries && !commitSkips.some(key => !key.startsWith('running_timers.'))) return unknown();
      if (timers < preview.timers && !commitSkips.some(key => key.startsWith('running_timers.'))) return unknown();
    }
    const source = committed ? value : preview;
    // Names stay in the local plain-text dialog; no raw entry ids, records or errors.
    const unmatchedNames = [...new Set([...source.unmigrated, ...preview.unmigrated])];
    const unmatched = unmatchedNames.length;
    const ambiguous = [...source.ambiguous, ...(committed ? preview.ambiguous : [])];
    const ambiguousNames = [...new Set(ambiguous.map(issue => issue.name))];
    const ambiguousCount = ambiguousNames.length;
    const details = [];
    if (omitted.size) details.push((PL ? 'Pominięte kategorie — cel już zawiera dane: ' : 'Skipped categories — target already contains data: ') +
      [...omitted].map(key => labels[key]).join(', '));
    if (unmatched) details.push(PL ? `Niedopasowane profile: ${unmatchedNames.join(', ')} — brak dziecka o tej samej nazwie.`
      : `Unmatched profiles: ${unmatchedNames.join(', ')} — no child with the same name.`);
    if (ambiguousCount) {
      const reasons = [];
      if (ambiguous.some(issue => issue.reason === 'duplicate_local_name')) reasons.push(PL ? 'powtórzona nazwa lokalna' : 'duplicate local name');
      if (ambiguous.some(issue => issue.reason === 'duplicate_target_name')) reasons.push(PL ? 'powtórzona nazwa w integracji' : 'duplicate integration name');
      details.push(`${PL ? 'Niejednoznaczne profile' : 'Ambiguous profiles'}: ${ambiguousNames.join(', ')} — ${reasons.join(', ')}`);
    }
    const partial = !!(omitted.size || unmatched || ambiguousCount);
    if (!committed) {
      const code = preview.entries + preview.timers === 0 ? 'no_data' : partial ? 'partial' : 'not_checked';
      const summary = code === 'no_data'
        ? (PL ? 'Brak rekordów do bezpiecznej migracji. Lokalne dane zachowano.' : 'No records can be migrated safely. Local data was kept.')
        : (PL ? 'Lokalne dane pozostaną w przeglądarce.' : 'Local data will remain in this browser.');
      return feedback(code, [summary, ...details].join('\n'));
    }
    const code = partial ? 'partial' : entries + timers > 0 ? 'success' : 'no_data';
    return feedback(code, [PL ? `Potwierdzone rekordy: ${entries}; timery: ${timers}. Lokalne dane zachowano.`
      : `Confirmed records: ${entries}; timers: ${timers}. Local data was kept.`, ...details].join('\n'));
  }

  async _promptLocalMigration(userRequested = false) {
    const hass = this.hass;
    const marker = 'ha-baby-tracker-v5-migration-prompted';
    let previousStatus;
    try { previousStatus = JSON.parse(localStorage.getItem(marker) || 'null')?.status; } catch (_) { /* retry a malformed marker */ }
    if (this._migrationInProgress || !this._backendAvailable || !hass?.callWS ||
        previousStatus === 'done' || (previousStatus === 'declined' && !userRequested) ||
        hass.user?.is_active === false || navigator.onLine === false || !this._backupBrowserOnlineV3 ||
        !this._backupTransportOnlineV3 || hass.connection?.connected === false ||
        hass.connection?.socket?.readyState === 3) return;
    const payload = this._buildLocalMigrationPayload();
    if (!payload) return;
    const PL = this._lang === 'pl';
    if (!hass.user?.is_admin) {
      // migrate_local_data is @require_admin server-side — don't offer a prompt that can only fail.
      // No marker is written, so the prompt still fires when an admin opens the card in this browser.
      console.debug('Baby and Lactation Tracker: local data found but migration requires an admin user; skipping prompt');
      if (!this._migrationAdminNoticeShown) {
        this._migrationAdminNoticeShown = true;
        this._showToast(PL
          ? 'Wykryto lokalne dane Baby Tracker — administrator Home Assistant może je przenieść do integracji.'
          : 'Local Baby Tracker data found — a Home Assistant admin can migrate it into the integration.', 'info');
      }
      return;
    }
    const context = this._timerAuthorityV3();
    const current = () => this._timerAuthorityMatchesV3(context);
    this._migrationInProgress = true;
    const retryButton = this.shadowRoot?.getElementById('retryLocalMigrationBtn');
    if (retryButton) retryButton.disabled = true;
    try {
      const dryRun = await hass.callWS({ type: 'ha_baby_tracker/migrate_local_data', ...payload, dry_run: true });
      if (!current()) return;
      const preview = dryRun?.preview;
      const previewFeedback = this._migrationFeedbackV3(preview);
      if (previewFeedback.code === 'unconfirmed' || previewFeedback.code === 'no_data') {
        alert(previewFeedback.text);
        return;
      }
      const message = PL
        ? `Podgląd migracji: ${preview.entries} rekordów i ${preview.timers} aktywnych timerów dla ${preview.targets} dzieci.\n${previewFeedback.text}\n\nPrzenieść dane?`
        : `Migration preview: ${preview.entries} records and ${preview.timers} active timers for ${preview.targets} children.\n${previewFeedback.text}\n\nMigrate now?`;
      const accepted = confirm(message);
      if (!current()) return;
      if (!accepted) {
        localStorage.setItem(marker, JSON.stringify({ status: 'declined', at: new Date().toISOString() }));
        return;
      }
      const result = await hass.callWS({ type: 'ha_baby_tracker/migrate_local_data', ...payload });
      if (!current()) return;
      const outcome = this._migrationFeedbackV3(result, true);
      localStorage.setItem(marker, JSON.stringify({ status: outcome.code === 'success' ? 'done' : outcome.code === 'partial' ? 'partial' : 'failed', at: new Date().toISOString(),
        ...(outcome.code === 'success' || outcome.code === 'partial' ? { result } : {}) }));
      await this._loadBackendData();
      if (current()) alert(outcome.text);
    } catch (e) {
      if (!current()) return;
      try { localStorage.setItem(marker, JSON.stringify({ status: 'failed', at: new Date().toISOString() })); } catch (_) { /* original local records remain available */ }
      console.warn('Baby and Lactation Tracker: migration result not confirmed');
      alert(this._migrationFeedbackV3(null, true).text);
    } finally {
      this._migrationInProgress = false;
      if (userRequested && current()) this.renderCard();
      // A cached render may keep the same button that was disabled before awaiting.
      const liveRetry = this.shadowRoot?.getElementById('retryLocalMigrationBtn');
      if (liveRetry) liveRetry.disabled = !this._canRetryLocalMigration();
    }
  }

  _childrenKey() { return 'ha-tools-baby-tracker-children'; }

  _loadChildren() {
    try {
      const stored = localStorage.getItem(this._childrenKey());
      return stored ? JSON.parse(stored) : [{name: 'Baby 1'}];
    } catch { return [{name: 'Baby 1'}]; }
  }

  _saveChildren() {
    localStorage.setItem(this._childrenKey(), JSON.stringify(this.babies));
  }

  _addChild() {
    if (this._backendDetectionFailed || this._backendDetecting) return this._backendConnectionNotice();
    if (this._backendAvailable) return this._backendChildManagementNotice();
    this.babies.push({name: 'Baby ' + (this.babies.length + 1)});
    this._saveChildren();
    this.renderCard();
  }

  _removeChild(idx) {
    if (this._backendDetectionFailed || this._backendDetecting) return this._backendConnectionNotice();
    if (this._backendAvailable) return this._backendChildManagementNotice();
    if (this.babies.length <= 1) return;
    this.babies.splice(idx, 1);
    localStorage.removeItem('ha-tools-baby-tracker-' + idx);
    if (this.selectedBaby >= this.babies.length) this.selectedBaby = this.babies.length - 1;
    this._saveChildren();
    this._loadData();
    this.renderCard();
  }

  _saveChildNames() {
    if (this._backendDetectionFailed || this._backendDetecting) return this._backendConnectionNotice();
    if (this._backendAvailable) return this._backendChildManagementNotice();
    const inputs = this.shadowRoot.querySelectorAll('.child-name-input');
    inputs.forEach(input => {
      const idx = parseInt(input.dataset.childIdx);
      if (this.babies[idx]) this.babies[idx].name = input.value.trim() || ('Baby ' + (idx + 1));
    });
    this._saveChildren();
    this.renderCard();
  }

  _backendChildManagementNotice() {
    this._showToast(this._lang === 'pl'
      ? 'Dzieci integracji dodajesz, zmieniasz i usuwasz w Ustawienia → Urządzenia i usługi → Baby Tracker.'
      : 'Add, rename or remove configured children in Settings → Devices & services → Baby Tracker.', 'info');
  }

  initializeDataStructures() {
    if (!this.babies || !this.babies.length) return;
    this.babies.forEach(baby => {
      const babyName = this._backendAvailable ? baby.entry_id : baby.name;
      if (!this.feedingData.has(babyName)) {
        this.feedingData.set(babyName, []);
      }
      if (!this.lactationData.has(babyName)) {
        this.lactationData.set(babyName, []);
      }
      if (!this.diapersData.has(babyName)) {
        this.diapersData.set(babyName, []);
      }
      if (!this.sleepData.has(babyName)) {
        this.sleepData.set(babyName, []);
      }
      if (!this.growthData.has(babyName)) {
        this.growthData.set(babyName, []);
      }
    });
    this._loadData();
    if (!this._bfSessions) this._bfSessions = [];
  }

  _selectBaby(index) {
    if (!Number.isInteger(index) || !this.babies[index] || index === this.selectedBaby) return;
    const focus = _rememberFamilyFocus(this);
    const childFocus = focus?.child && focus.index === index ? focus : null;
    // Persist the current local child's timer before detaching its intervals.
    // Existing index-based storage keys remain unchanged.
    if (!this._backendAvailable && !this._saveData()) { this._showSaveError(); return; }
    this._timerAuthorityEpochV3++;
    this._applyBackendTimers({ sleep: null, bf: null });
    this.sleepStartTime = null;
    this._bfStartTime = null;
    this._bfCurrentSide = null;
    this._stopAutoSave();
    this._bfSessions = [];
    this._backendLoadSequence = (this._backendLoadSequence || 0) + 1;
    this._historyLoadFailed = false;
    this.selectedBaby = index;
    this._historyState = null;
    this._loadData();
    this.renderCard();
    if (childFocus) _bindFamilyNavigation(this, childFocus);
  }

  renderCard() {
    this._syncBackupContextV3();
    if (!this._hass) return;
    if (!this.config) return;
    if (!this.selectedTab) this.selectedTab = 'feeding';
    if (!this.babies || this.babies.length === 0) {
      this.babies = [{ name: 'Baby 1' }];
    }
    if (this.selectedBaby >= this.babies.length) this.selectedBaby = 0;
    if (!this.selectedTab) this.selectedTab = 'feeding';
    const title = (this.config.title && this.config.title !== 'ha-baby-tracker') ? this.config.title : this._t.title;
    const currentBaby = this.babies[this.selectedBaby].name;
    const familyContext = _babyFamilyContext(this);
    const sameFamilyContext = this._babyFamilyRenderedContext === familyContext;
    const familyDrafts = sameFamilyContext ? _rememberBabyManualFields(this) : [];
    const familyFocus = sameFamilyContext ? _rememberFamilyFocus(this) : null;

    const historyState = this._getHistoryState();
    const html = `
      <style>${HA_BABY_TRACKER_BENTO_CSS}
.tab-button[data-tab="history"] { min-width:44px; min-height:44px !important; }
.history-controls { display:flex; flex-wrap:wrap; gap:12px; align-items:end; }
.history-controls label { display:flex; flex-direction:column; gap:6px; min-width:0; flex:1 1 140px; }
.history-controls input, .history-controls select { box-sizing:border-box; width:100%; min-width:0; max-width:100%; min-height:44px; }
.history-controls button, .history-pagination button { min-width:44px; min-height:44px; white-space:normal; }
.history-pagination { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:12px 0; }
.history-record { border-bottom:1px solid var(--bento-border); padding:12px 0; min-width:0; overflow-wrap:anywhere; }
.history-record p { margin:6px 0; white-space:pre-wrap; }
#history-tab { min-width:0; max-width:100%; }

/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section:not([data-source="own-card"])::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.donate-section .donate-text { flex: 1; min-width: 240px; }
.donate-section h3 {  margin: 0 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;}
.donate-section p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bento-text-secondary, #57534e); letter-spacing: -0.005em; }
.donate-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.donate-btn {  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;  border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: -0.005em;  text-decoration: none; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, filter 0.2s;  border: 1px solid transparent;}
.donate-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.donate-btn.coffee {  background: linear-gradient(135deg, #FFDD00, #FFC700); color: #000;  box-shadow: 0 4px 14px -2px rgba(255, 221, 0, 0.4);}
.donate-btn.coffee:hover { box-shadow: 0 8px 24px -4px rgba(255, 221, 0, 0.55); }
.donate-btn.paypal {  background: linear-gradient(135deg, #0070ba, #005ea6); color: #fff;  box-shadow: 0 4px 14px -2px rgba(0, 112, 186, 0.45);}
.donate-btn.paypal:hover { box-shadow: 0 8px 24px -4px rgba(0, 112, 186, 0.6); }
:host(.bento-dark) .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }
:host(.bento-dark) .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .donate-section p { color: #d6d3d1; }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 18px; }  .donate-buttons { justify-content: center; width: 100%; } }

/* Prereq banner — premium */
.prereq-banner {  display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px;  border-radius: var(--bento-radius-sm, 12px); margin: 0 0 16px;  font-size: 13px; line-height: 1.55; border: 1px solid;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  position: relative; overflow: hidden;}
.prereq-banner::before {  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;}
.prereq-banner.prereq-error { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); color: #991b1b; }
.prereq-banner.prereq-error::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.prereq-banner.prereq-info  { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.25); color: #4338ca; }
.prereq-banner.prereq-info::before  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.prereq-banner .prereq-icon { font-size: 22px; line-height: 1; padding-top: 2px; flex-shrink: 0; }
.prereq-banner .prereq-text { flex: 1; min-width: 0; }
.prereq-banner .prereq-text strong { font-weight: 700; letter-spacing: -0.01em; }
.prereq-banner code {  background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px;  font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace;  border: 1px solid rgba(0,0,0,0.08);}
.prereq-banner .prereq-cta {  display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 10px;  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important;  text-decoration: none; font-weight: 700; font-size: 12.5px; flex-shrink: 0;  letter-spacing: -0.005em;  box-shadow: 0 4px 14px -2px rgba(99,102,241,0.45);  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);}
.prereq-banner .prereq-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6); }
:host(.bento-dark) .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }
:host(.bento-dark) .prereq-banner.prereq-info { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }
:host(.bento-dark) .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); }
@media (max-width: 600px) {  .prereq-banner { flex-direction: column; align-items: stretch; padding-left: 20px; }  .prereq-banner .prereq-cta { align-self: flex-start; } }

/* First-run intro banner — premium */
.intro-banner {  position: relative; padding: 18px 52px 18px 22px; margin: 0 0 18px;  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.20);  border-radius: var(--bento-radius-sm, 12px);  font-size: 13px; line-height: 1.55; overflow: hidden;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  animation: bentoSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);}
.intro-banner::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.intro-banner .intro-headline {  font-weight: 700; font-size: 14.5px; margin-bottom: 10px; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;  display: flex; align-items: center; gap: 8px;}
.intro-banner .intro-steps {  margin: 8px 0 0; padding: 0; list-style: none; counter-reset: introstep;}
.intro-banner .intro-steps li {  margin-bottom: 8px; line-height: 1.55; color: var(--bento-text, #0c0a09);  padding-left: 32px; position: relative; counter-increment: introstep;  font-size: 12.5px;}
.intro-banner .intro-steps li::before {  content: counter(introstep); position: absolute; left: 0; top: -1px;  width: 22px; height: 22px; border-radius: 50%;  background: var(--bento-card, #fff); border: 1px solid rgba(99,102,241,0.25);  display: flex; align-items: center; justify-content: center;  font-size: 11px; font-weight: 800; color: #6366f1;  font-family: 'JetBrains Mono', ui-monospace, monospace;  font-feature-settings: 'tnum' 1;}
.intro-banner .intro-dismiss {  position: absolute; top: 12px; right: 14px;  background: var(--bento-card, transparent); border: 1px solid var(--bento-border, transparent);  cursor: pointer; font-size: 14px; line-height: 1;  color: var(--bento-text-secondary, #64748B);  padding: 4px 8px; border-radius: 999px;  transition: all 0.15s ease;}
.intro-banner .intro-dismiss:hover {  background: var(--bento-bg-2, #e7e5e4); color: var(--bento-text, #0c0a09);  transform: rotate(90deg);}
:host(.bento-dark) .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }
:host(.bento-dark) .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .intro-banner .intro-steps li { color: #fafaf9; }
:host(.bento-dark) .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }
:host(.bento-dark) .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }
:host(.bento-dark) .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; }


/* ===== BENTO LIGHT MODE DESIGN SYSTEM ===== */

:host {
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Card */
.card, .ha-card, ha-card, .main-card, .exporter-card, .security-card, .reports-card, .storage-card, .chore-card, .cry-card, .backup-card, .network-card, .sentence-card, .energy-card, .panel-card {
  background: var(--bento-card) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-md) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-family: 'Inter', sans-serif !important;
  color: var(--bento-text) !important;
  overflow: visible;
  padding: 20px;
}

/* Headers */
.card-header, .header, .card-title, h1, h2, h3 {
  color: var(--bento-text) !important;
  font-family: 'Inter', sans-serif !important;
}
.card-header, .header {
  border-bottom: 1px solid var(--bento-border) !important;
  padding-bottom: 12px !important;
  margin-bottom: 16px !important;
}

/* Tabs */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--bento-border);
  padding: 0 4px;
  margin-bottom: 20px;
  overflow-x: auto;
}
.tab, .tab-btn, .tab-btn {
  padding: 10px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  color: var(--bento-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: var(--bento-transition);
  white-space: nowrap;
  border-radius: 0;
}
.tab:hover, .tab-btn:hover, .tab-btn:hover {
  color: var(--bento-primary);
  background: var(--bento-primary-light);
}
.tab.active, .tab-btn.active, .tab-btn.active {
  color: var(--bento-primary);
  border-bottom-color: var(--bento-primary);
  background: rgba(59, 130, 246, 0.04);
  font-weight: 600;
}

/* Tab content */
.tab-content { display: none; }
.tab-content.active { display: block; animation: bentoFadeIn 0.3s ease-out; }
@keyframes bentoFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* Buttons */
button, .btn, .action-btn {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--bento-radius-xs);
  transition: var(--bento-transition);
  cursor: pointer;
}
button.active, .btn.active, .btn-primary, .action-btn.active {
  background: var(--bento-primary) !important;
  color: white !important;
  border-color: var(--bento-primary) !important;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

/* Status badges */
.badge, .status-badge, .tag, .chip {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.badge-success, .status-ok, .status-good { background: var(--bento-success-light); color: var(--bento-success); }
.badge-error, .status-error, .status-critical { background: var(--bento-error-light); color: var(--bento-error); }
.badge-warning, .status-warning { background: var(--bento-warning-light); color: var(--bento-warning); }
.badge-info, .status-info { background: var(--bento-primary-light); color: var(--bento-primary); }

/* Tables */
table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: 'Inter', sans-serif; }
th { background: var(--bento-bg); color: var(--bento-text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; border-bottom: 2px solid var(--bento-border); }
td { padding: 12px 14px; border-bottom: 1px solid var(--bento-border); color: var(--bento-text); font-size: 13px; }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: none; }

/* Inputs & selects */
input, select, textarea {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 8px 12px;
  border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card);
  color: var(--bento-text);
  transition: var(--bento-transition);
  outline: none;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Stat cards */
.stat-card, .stat, .metric-card, .stat-box, .overview-stat, .kpi-card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm);
  padding: 16px;
  transition: var(--bento-transition);
}
.stat-card:hover, .stat:hover, .metric-card:hover { box-shadow: var(--bento-shadow-md); transform: translateY(-1px); }
.stat-value, .metric-value, .stat-number { font-size: 28px; font-weight: 700; color: var(--bento-text); font-family: 'Inter', sans-serif; }
.stat-label, .metric-label, .stat-title { font-size: 12px; font-weight: 500; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

/* Canvas override (prevent Bento CSS from distorting charts) */
canvas {
  max-width: 100% !important;
  height: auto !important;
  width: auto !important;
  border: none !important;
}

/* Pagination */
.pagination, .pag {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 16px 0;
  border-top: 1px solid var(--bento-border);
}
.pagination-btn, .pag-btn {
  padding: 8px 14px;
  border: 1.5px solid var(--bento-border);
  background: var(--bento-card);
  color: var(--bento-text);
  border-radius: var(--bento-radius-xs);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  transition: var(--bento-transition);
}
.pagination-btn:hover:not(:disabled), .pag-btn:hover:not(:disabled) { background: var(--bento-primary); color: white; border-color: var(--bento-primary); }
.pagination-btn:disabled, .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info, .pag-info { font-size: 13px; color: var(--bento-text-secondary); font-weight: 500; padding: 0 8px; }
.page-size-select { padding: 6px 10px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-xs); font-size: 12px; font-family: 'Inter', sans-serif; }

/* Empty state */
.empty-state, .no-data, .no-results {
  text-align: center;
  padding: 48px 24px;
  color: var(--bento-text-secondary);
  font-size: 14px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); }

/* ===== END BENTO LIGHT MODE ===== */

        :host {
          --primary-text: var(--primary-text-color, #212121);
          --secondary-text: var(--secondary-text-color, #727272);
          --card-bg: var(--card-background-color, #ffffff);
          --primary: var(--primary-color, #1976d2);
          --divider: var(--divider-color, #e0e0e0);
          --surface: var(--ha-card-background, #ffffff);
        }

        .card {
          background: var(--bento-card);
          border-radius: var(--bento-radius-md) !important;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--bento-text);
          overflow: hidden;
          position: relative;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--bento-border);
          padding-bottom: 12px;
        }

        .card-title {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        .baby-selector {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .baby-button {
          padding: 8px 12px;
          border: 2px solid var(--bento-border);
          background: transparent;
          color: var(--bento-text);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .baby-button:hover {
          border-color: var(--bento-primary);
          background: rgba(25, 118, 210, 0.05);
        }

        .baby-button.active {
          background: var(--bento-primary);
          color: white;
          border-color: var(--bento-primary);
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid var(--bento-border);
          overflow-x: auto;
        }

        .tab-btn {
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--bento-text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: var(--bento-text);
        }

        .tab-btn.active {
          color: var(--bento-primary);
          border-bottom-color: var(--bento-primary);
        }

        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--bento-text);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-row > * {
          min-width: 0;
        }

        .form-row.full {
          grid-template-columns: 1fr;
        }

        input, select, textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--bento-border);
          border-radius: 6px;
          background: var(--bento-card);
          color: var(--bento-text);
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--bento-primary);
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        .button-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .button-group > * {
          min-width: 0;
        }

        .button-group.full {
          grid-template-columns: 1fr;
        }

        button {
          padding: 12px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: var(--bento-primary);
          color: white;
        }

        .btn-primary:hover {
          opacity: 0.9;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        }

        .btn-secondary {
          background: transparent;
          color: var(--bento-primary);
          border: 1px solid var(--bento-primary);
        }

        .btn-secondary:hover {
          background: rgba(25, 118, 210, 0.05);
        }

        .btn-danger {
          background: var(--bento-error, #ef4444);
          color: #fff;
        }

        .btn-danger:hover {
          opacity: 0.9;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
        }

        .list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--bento-border);
          border-radius: 6px;
          margin-bottom: 8px;
          background: rgba(0, 0, 0, 0.02);
        }

        .list-item-content {
          flex: 1;
        }

        .list-item-time {
          font-size: 12px;
          color: var(--bento-text-secondary);
          margin-bottom: 4px;
        }

        .list-item-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--bento-text);
        }

        .list-item-subtitle {
          font-size: 12px;
          color: var(--bento-text-secondary);
          margin-top: 4px;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          background: var(--bento-primary);
          color: white;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .timer-display {
          text-align: center;
          padding: 20px;
          background: rgba(25, 118, 210, 0.08);
          border-radius: 8px;
          margin-bottom: 16px;
          border: 2px dashed var(--bento-primary);
        }

        .timer-value {
          font-size: 48px;
          font-weight: 700;
          color: var(--bento-primary);
          font-variant-numeric: tabular-nums;
        }

        .timer-label {
          font-size: 12px;
          color: var(--bento-text-secondary);
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: rgba(25, 118, 210, 0.08);
          border: 1px solid var(--bento-border);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--bento-primary);
        }

        .stat-label {
          font-size: 12px;
          color: var(--bento-text-secondary);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .growth-chart {
          width: 100%;
          max-width: 100%;
          margin: 20px 0;
          border: 1px solid var(--bento-border);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.02);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--bento-text-secondary);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .empty-state-text {
          font-size: 14px;
        }

        .export-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--bento-border);
        }
      
/* === Modern Bento Light Mode === */

:host {
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-success: #10B981;
  --bento-warning: #F59E0B;
  --bento-error: #EF4444;
  --bento-radius-sm: 10px;
  --bento-radius-xs: 6px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  color-scheme: light dark;
}
* { box-sizing: border-box; }

.card, .card-container, .reports-card, .export-card {
  background: var(--bento-card); border-radius: var(--bento-radius-sm); box-shadow: var(--bento-shadow-sm);
  padding: 28px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--bento-text); border: 1px solid var(--bento-border); animation: fadeSlideIn 0.4s ease-out;
}
.card-header { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--bento-text); letter-spacing: -0.01em; display: flex; justify-content: space-between; align-items: center; }
.card-header h2 { font-size: 20px; font-weight: 700; color: var(--bento-text); margin: 0; letter-spacing: -0.01em; }
.card-title, .title, .header-title, .pan-title { font-size: 20px; font-weight: 700; color: var(--bento-text); letter-spacing: -0.01em; }
.header, .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--bento-border); margin-bottom: 24px; overflow-x: auto; padding-bottom: 0; }
.tab, .tab-btn, .tab-btn { padding: 10px 20px; border: none; background: transparent; color: var(--bento-text-secondary); cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: var(--bento-transition); white-space: nowrap; margin-bottom: -2px; border-radius: 8px 8px 0 0; font-family: 'Inter', sans-serif; }
.tab.active, .tab-btn.active, .tab-btn.active { color: var(--bento-primary); border-bottom-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.tab:hover, .tab-btn:hover, .tab-btn:hover { color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.tab-icon { margin-right: 6px; }
.tab-content { display: none; }
.tab-content.active { display: block; animation: fadeSlideIn 0.3s ease-out; }

button, .btn, .btn-s { padding: 9px 16px; border: 1.5px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
button:hover, .btn:hover, .btn-s:hover { background: var(--bento-bg); border-color: var(--bento-primary); color: var(--bento-primary); }
button.active, .btn.active, .btn-act { background: var(--bento-primary); color: white; border-color: var(--bento-primary); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25); }
.btn-primary { padding: 9px 16px; background: var(--bento-primary); color: white; border: 1.5px solid var(--bento-primary); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; transition: var(--bento-transition); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25); }
.btn-primary:hover { background: var(--bento-primary-hover); border-color: var(--bento-primary-hover); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); transform: translateY(-1px); }
.btn-secondary { padding: 9px 16px; background: var(--bento-card); color: var(--bento-text); border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.btn-secondary:hover { border-color: var(--bento-primary); color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.btn-danger { padding: 9px 16px; background: var(--bento-card); color: var(--bento-error); border: 1.5px solid var(--bento-error); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.btn-danger:hover { background: var(--bento-error); color: white; }
.btn-small { padding: 5px 12px; font-size: 12px; border: 1px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text-secondary); border-radius: var(--bento-radius-xs); cursor: pointer; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.btn-small:hover { border-color: var(--bento-primary); color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }

input[type="text"], input[type="number"], input[type="date"], input[type="time"], input[type="email"], input[type="search"], select, textarea, .search-input, .sinput, .sinput-sm, .alert-search-box, .period-select { padding: 9px 14px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-sm); font-size: 13px; background: var(--bento-card); color: var(--bento-text); font-family: 'Inter', sans-serif; transition: var(--bento-transition); outline: none; }
input[type="text"]:focus, input[type="number"]:focus, input[type="date"]:focus, input[type="time"]:focus, select:focus, textarea:focus, .search-input:focus, .sinput:focus, .sinput-sm:focus, .alert-search-box:focus, .period-select:focus { border-color: var(--bento-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
input::placeholder, .search-input::placeholder, .sinput::placeholder, .sinput-sm::placeholder { color: var(--bento-text-secondary); opacity: 0.7; }
.form-group { margin-bottom: 16px; }
.form-group.full { grid-column: 1 / -1; }
.form-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
label, .cg label, .clbl { display: block; font-size: 12px; font-weight: 600; color: var(--bento-text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.add-form { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 20px; margin-bottom: 20px; }
textarea { min-height: 80px; resize: vertical; }

.stats, .stats-grid, .stats-container, .summary-grid, .network-stats, .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat, .stat-card, .summary-card, .network-stat, .metric-card, .kpi-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); transition: var(--bento-transition); text-align: center; }
.stat:hover, .stat-card:hover, .summary-card:hover, .network-stat:hover, .metric-card:hover { border-color: var(--bento-primary); box-shadow: var(--bento-shadow-md); transform: translateY(-1px); }
.stat-card.online { border-left: 3px solid var(--bento-success); }
.stat-card.offline { border-left: 3px solid var(--bento-error); }
.sv, .stat-value, .summary-value, .network-stat-value, .metric-value { font-size: 24px; font-weight: 700; color: var(--bento-primary); line-height: 1.2; }
.stat.ok .sv { color: var(--bento-success); }
.stat.err .sv { color: var(--bento-error); }
.sl, .stat-label, .summary-label, .network-stat-label, .metric-label { font-size: 12px; color: var(--bento-text-secondary); font-weight: 500; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.stat-trend { font-size: 12px; font-weight: 600; margin-top: 4px; }
.stat-trend.positive, .trend-up { color: var(--bento-success); }
.stat-trend.negative, .trend-down { color: var(--bento-error); }

.device-table, .entity-table, .table, .alert-table, .data-table, .backup-table, .history-table, .log-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; }
.device-table th, .entity-table th, .table th, .alert-table th, .data-table th, .backup-table th, table th { text-align: left; padding: 12px 16px; border-bottom: 2px solid var(--bento-border); font-weight: 600; color: var(--bento-text-secondary); background: var(--bento-bg); cursor: pointer; user-select: none; white-space: nowrap; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.device-table th:first-child, .entity-table th:first-child, .table th:first-child, table th:first-child { border-radius: var(--bento-radius-xs) 0 0 0; }
.device-table th:last-child, .entity-table th:last-child, .table th:last-child, table th:last-child { border-radius: 0 var(--bento-radius-xs) 0 0; }
.device-table th:hover, .entity-table th:hover, .table th:hover, table th:hover { background: rgba(59, 130, 246, 0.06); color: var(--bento-primary); }
.device-table th.sorted, .entity-table th.sorted, .table th.sorted, table th.sorted { background: rgba(59, 130, 246, 0.08); color: var(--bento-primary); }
.device-table td, .entity-table td, .table td, .alert-table td, .data-table td, .backup-table td, table td { padding: 12px 16px; border-bottom: 1px solid var(--bento-border); color: var(--bento-text); font-size: 13px; font-family: 'Inter', sans-serif; }
.device-table tr:hover, .entity-table tr:hover, .table tbody tr:hover, .alert-table tr:hover, table tr:hover { background: rgba(59, 130, 246, 0.03); }
.table-container { overflow-x: auto; border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); }
.sort-indicator { font-size: 10px; margin-left: 4px; color: var(--bento-primary); }

.status-badge, .severity-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.status-online, .status-home, .status-active, .status-ok, .status-healthy, .status-running, .status-complete, .status-completed, .status-success, .badge-success { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-offline, .status-error, .status-failed, .status-critical, .severity-critical, .badge-error, .badge-danger { background: rgba(239, 68, 68, 0.1); color: #DC2626; }
.status-away, .status-warning, .severity-warning, .badge-warning { background: rgba(245, 158, 11, 0.1); color: #B45309; }
.status-unavailable, .status-unknown, .status-idle, .status-inactive, .status-stopped, .badge-neutral { background: rgba(100, 116, 139, 0.1); color: var(--bento-text-secondary); }
.status-zone, .severity-info, .badge-info { background: rgba(59, 130, 246, 0.1); color: var(--bento-primary); }

.alert-item { padding: 14px 18px; border-left: 4px solid var(--bento-border); border-radius: 0 var(--bento-radius-sm) var(--bento-radius-sm) 0; margin-bottom: 10px; background: var(--bento-bg); display: flex; justify-content: space-between; align-items: center; transition: var(--bento-transition); }
.alert-item:hover { box-shadow: var(--bento-shadow-sm); }
.alert-critical { border-color: var(--bento-error); background: rgba(239, 68, 68, 0.04); }
.alert-warning { border-color: var(--bento-warning); background: rgba(245, 158, 11, 0.04); }
.alert-info { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.alert-text { flex: 1; }
.alert-type { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: var(--bento-text); }
.alert-time { font-size: 12px; color: var(--bento-text-secondary); }
.alert-actions { display: flex; gap: 8px; }
.alert-dismiss { padding: 6px 12px; font-size: 12px; background: var(--bento-card); color: var(--bento-text-secondary); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-xs); cursor: pointer; font-weight: 500; transition: var(--bento-transition); }
.alert-dismiss:hover { background: var(--bento-error); color: white; border-color: var(--bento-error); }

.section { margin-bottom: 24px; }
.section h3, .section-title, .pan-head { font-size: 16px; font-weight: 600; color: var(--bento-text); margin-bottom: 12px; letter-spacing: -0.01em; }

.battery-grid, .grid, .items-grid, .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.battery-card, .item-card, .chore-card, .entry-card, .backup-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); transition: var(--bento-transition); }
.battery-card:hover, .item-card:hover, .chore-card:hover, .entry-card:hover, .backup-card:hover { box-shadow: var(--bento-shadow-md); border-color: var(--bento-primary); transform: translateY(-1px); }
.chore-card.priority-high { border-left: 3px solid var(--bento-error); }
.chore-card.priority-medium { border-left: 3px solid var(--bento-warning); }
.chore-card.priority-low { border-left: 3px solid var(--bento-success); }
.chore-title, .entry-title, .item-title { font-weight: 600; font-size: 14px; color: var(--bento-text); margin-bottom: 6px; }
.chore-meta, .entry-meta, .item-meta { font-size: 12px; color: var(--bento-text-secondary); }
.chore-assignee { font-size: 12px; color: var(--bento-primary); font-weight: 500; }
.chore-actions, .item-actions, .entry-actions { display: flex; gap: 6px; margin-top: 10px; }

.battery-bar, .progress-bar, .bandwidth-bar-bg { width: 100%; height: 8px; background: var(--bento-border); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.battery-fill, .progress-fill, .bandwidth-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); background: var(--bento-success); }
.battery-fill.battery_critical { background: var(--bento-error) !important; }
.battery-fill.battery_warning { background: var(--bento-warning) !important; }
.battery-label, .bandwidth-label { font-size: 13px; color: var(--bento-text); font-weight: 500; display: flex; justify-content: space-between; align-items: center; }

.pagination, .pag { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; padding: 16px 0; border-top: 1px solid var(--bento-border); }
.pagination-btn, .pag-btn { padding: 8px 14px; border: 1.5px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text); border-radius: var(--bento-radius-xs); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.pagination-btn:hover:not(:disabled), .pag-btn:hover:not(:disabled) { background: var(--bento-primary); color: white; border-color: var(--bento-primary); }
.pagination-btn:disabled, .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info, .pag-info { font-size: 13px; color: var(--bento-text-secondary); font-weight: 500; padding: 0 8px; }
.page-size-selector, .pag-size { padding: 6px 10px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-xs); background: var(--bento-card); color: var(--bento-text); font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }

.col-main { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--bento-text); }
.topbar-r { display: flex; gap: 8px; align-items: center; }
.panels { display: flex; gap: 12px; }
.pan-left, .pan-center, .pan-right { background: var(--bento-card); border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); overflow: hidden; }
.cbar { display: flex; gap: 8px; align-items: center; padding: 12px; background: var(--bento-bg); border-bottom: 1px solid var(--bento-border); }
.cg { display: flex; gap: 8px; align-items: center; }
.cg-r { margin-left: auto; }

.dd { position: relative; }
.dd-menu { position: absolute; top: 100%; left: 0; background: var(--bento-card); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); box-shadow: var(--bento-shadow-md); min-width: 180px; z-index: 100; display: none; overflow: hidden; }
.dd.open .dd-menu { display: block; }
.dd-i { padding: 10px 16px; cursor: pointer; font-size: 13px; color: var(--bento-text); transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.dd-i:hover { background: rgba(59, 130, 246, 0.06); color: var(--bento-primary); }
.dd-div { border-top: 1px solid var(--bento-border); margin: 4px 0; }

.auto-item, .tr-item, .list-item, .automation-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--bento-border); display: flex; align-items: center; gap: 10px; transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.auto-item:hover, .tr-item:hover, .list-item:hover, .automation-item:hover { background: rgba(59, 130, 246, 0.04); }
.auto-item.sel, .tr-item.sel, .list-item.selected, .automation-item.selected { background: rgba(59, 130, 246, 0.08); border-left: 3px solid var(--bento-primary); }
.auto-item.error-item, .automation-item.error-item { border-left: 3px solid var(--bento-error); }
.auto-name { font-weight: 500; font-size: 13px; color: var(--bento-text); }
.auto-meta { font-size: 12px; color: var(--bento-text-secondary); }
.auto-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bento-text-secondary); }
.auto-dot.s-running { background: var(--bento-success); }
.auto-dot.s-stopped { background: var(--bento-text-secondary); }
.auto-dot.s-error { background: var(--bento-error); }
.auto-count { font-size: 11px; color: var(--bento-text-secondary); margin-left: auto; }

.tgroup { border: 1px solid var(--bento-border); border-radius: var(--bento-radius-xs); margin-bottom: 8px; overflow: hidden; }
.tgroup-h { padding: 10px 14px; background: var(--bento-bg); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.tgroup-h:hover { background: rgba(59, 130, 246, 0.06); }
.tg-tog { transition: transform 0.2s; font-size: 12px; color: var(--bento-text-secondary); }
.tgroup.collapsed .tg-tog { transform: rotate(-90deg); }
.tgroup.collapsed .tgroup-items { display: none; }
.tg-name { font-weight: 600; font-size: 13px; color: var(--bento-text); }
.tg-cnt { font-size: 11px; color: var(--bento-text-secondary); margin-left: auto; background: var(--bento-border); padding: 2px 8px; border-radius: 10px; }

.device-detail, .detail-panel, .details { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); }
.detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bento-border); font-size: 13px; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--bento-text-secondary); font-weight: 500; }
.detail-value { color: var(--bento-text); font-weight: 600; }

.board { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.column { min-width: 260px; background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 12px; border: 1px solid var(--bento-border); }
.column-header { font-weight: 600; font-size: 14px; color: var(--bento-text); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.column-count { background: var(--bento-border); color: var(--bento-text-secondary); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

.schedule, .calendar { margin-top: 16px; }
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 16px; }
.week-header { padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; border-radius: var(--bento-radius-xs); }
.week-cell { padding: 8px; text-align: center; font-size: 12px; background: var(--bento-bg); border: 1px solid var(--bento-border); cursor: pointer; transition: var(--bento-transition); border-radius: var(--bento-radius-xs); }
.week-cell:hover { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.chore-item { padding: 8px 12px; border-bottom: 1px solid var(--bento-border); font-size: 13px; }

.leaderboard { background: var(--bento-bg); border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); overflow: hidden; }
.leaderboard-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--bento-border); gap: 12px; font-size: 13px; transition: var(--bento-transition); }
.leaderboard-row:last-child { border-bottom: none; }
.leaderboard-row:hover { background: rgba(59, 130, 246, 0.04); }
.rank { font-weight: 700; color: var(--bento-primary); font-size: 14px; min-width: 28px; }
.name { font-weight: 500; color: var(--bento-text); flex: 1; }
.streak { color: var(--bento-warning); font-weight: 600; }
.completion { color: var(--bento-success); font-weight: 600; }

.baby-selector { display: flex; gap: 8px; margin-bottom: 16px; }
.quick-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.quick-btn, .action-btn { padding: 10px 16px; border: 1.5px solid var(--bento-border); background: var(--bento-card); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); display: flex; align-items: center; gap: 6px; color: var(--bento-text); }
.quick-btn:hover, .action-btn:hover { border-color: var(--bento-primary); color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.quick-btn.active, .action-btn.active { background: var(--bento-primary); color: white; border-color: var(--bento-primary); }
.timeline { position: relative; padding-left: 24px; }
.timeline-item { padding: 12px 0; border-bottom: 1px solid var(--bento-border); position: relative; }
.timeline-time { font-size: 12px; color: var(--bento-text-secondary); font-weight: 500; }
.timeline-content { font-size: 13px; color: var(--bento-text); margin-top: 4px; }

canvas, .canvas-container canvas { width: 100%; height: 200px; border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); margin-bottom: 16px; }
.canvas-container { position: relative; margin-bottom: 16px; }
.chart-container { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); margin-bottom: 16px; }

.empty, .empty-state { text-align: center; padding: 48px 24px; color: var(--bento-text-secondary); font-size: 14px; font-family: 'Inter', sans-serif; }
.empty-ico, .empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--bento-border); border-top: 3px solid var(--bento-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 24px auto; }

.search-box, .search-bar, .controls, .ctrls, .filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.control-group { display: flex; gap: 8px; align-items: center; }

.domain-group-header { margin-top: 20px; padding: 10px 16px; background: var(--bento-bg); border-radius: var(--bento-radius-xs); font-weight: 600; font-size: 14px; color: var(--bento-text); border: 1px solid var(--bento-border); }
.domain-group-header:first-child { margin-top: 0; }
.domain-group-count { font-weight: 500; color: var(--bento-text-secondary); font-size: 12px; margin-left: 8px; }

.automation-list, .list, .item-list { border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); overflow: hidden; }
.automation-name, .entity-name { font-weight: 500; font-size: 13px; color: var(--bento-text); }
.automation-id, .entity-id { font-size: 11px; color: var(--bento-text-secondary); }
.error-badge, .count-badge { background: var(--bento-error); color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }
.tab .error-badge { background: var(--bento-error); color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }

.health-score, .score { font-size: 48px; font-weight: 700; color: var(--bento-primary); text-align: center; margin: 16px 0; }
.emoji { font-size: 20px; line-height: 1; }
.device-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.08); border-radius: var(--bento-radius-xs); font-size: 16px; }

.recommendation-card, .tip-card, .suggestion-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); margin-bottom: 12px; transition: var(--bento-transition); }
.recommendation-card:hover, .tip-card:hover, .suggestion-card:hover { border-color: var(--bento-primary); box-shadow: var(--bento-shadow-md); }

.export-options, .options-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
.export-option, .option-card { background: var(--bento-bg); border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 16px; cursor: pointer; transition: var(--bento-transition); text-align: center; }
.export-option:hover, .option-card:hover { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.export-option.selected, .option-card.selected { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.08); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.storage-bar, .usage-bar { width: 100%; height: 24px; background: var(--bento-border); border-radius: var(--bento-radius-xs); overflow: hidden; margin-bottom: 12px; }
.storage-fill, .usage-fill { height: 100%; border-radius: var(--bento-radius-xs); transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); background: var(--bento-primary); }

.check-item, .security-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--bento-border); transition: var(--bento-transition); }
.check-item:hover, .security-item:hover { background: rgba(59, 130, 246, 0.03); }
.check-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 16px; }
.check-icon.pass { background: rgba(16, 185, 129, 0.1); }
.check-icon.fail { background: rgba(239, 68, 68, 0.1); }
.check-icon.warn { background: rgba(245, 158, 11, 0.1); }
.check-text, .security-text { flex: 1; }
.check-title { font-weight: 600; font-size: 13px; color: var(--bento-text); }
.check-desc { font-size: 12px; color: var(--bento-text-secondary); margin-top: 2px; }

.waveform { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 16px; margin-bottom: 16px; }
.analysis-result, .result-card { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 20px; text-align: center; margin-bottom: 16px; }
.confidence-bar { height: 8px; background: var(--bento-border); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.confidence-fill { height: 100%; border-radius: 4px; background: var(--bento-primary); transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

.sentence-item, .intent-item { padding: 12px 16px; border-bottom: 1px solid var(--bento-border); display: flex; justify-content: space-between; align-items: center; transition: var(--bento-transition); }
.sentence-item:hover, .intent-item:hover { background: rgba(59, 130, 246, 0.03); }
.sentence-text { font-size: 13px; color: var(--bento-text); font-family: 'Inter', sans-serif; }
.intent-badge { display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(59, 130, 246, 0.1); color: var(--bento-primary); }

.backup-item, .backup-entry { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--bento-border); transition: var(--bento-transition); }
.backup-item:hover, .backup-entry:hover { background: rgba(59, 130, 246, 0.03); }
.backup-name { font-weight: 500; font-size: 14px; color: var(--bento-text); }
.backup-date, .backup-size { font-size: 12px; color: var(--bento-text-secondary); }

.report-section { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 20px; border: 1px solid var(--bento-border); margin-bottom: 16px; }
.insight-card { padding: 14px; border-left: 3px solid var(--bento-primary); background: rgba(59, 130, 246, 0.04); border-radius: 0 var(--bento-radius-xs) var(--bento-radius-xs) 0; margin-bottom: 10px; }

.config-section { padding: 16px; background: var(--bento-bg, #f8fafc); border: 1px solid var(--bento-border, #e2e8f0); border-radius: 10px; }
.config-section h3 { color: var(--bento-text, #1e293b); }
.config-section code { background: rgba(59, 130, 246, 0.08); color: var(--bento-primary, #3B82F6); padding: 1px 5px; border-radius: 4px; font-size: 11px; }

@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-secondary); }

@media (max-width: 768px) {
  .card, .card-container, .reports-card, .export-card { padding: 16px; }
  .stats, .stats-grid, .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .panels { flex-direction: column; }
  .board { flex-direction: column; }
  .column { min-width: unset; }
}

/* Tips banner */
.tip-banner {
  background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.03));
  border: 1.5px solid rgba(59,130,246,0.2);
  border-radius: var(--bento-radius-md) !important;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
  position: relative;
}
.tip-banner-title { font-weight: 700; font-size: 14px; margin-bottom: 6px; color: #3B82F6; }
.tip-banner ul { margin: 6px 0 0 16px; padding: 0; }
.tip-banner li { margin-bottom: 3px; }
.tip-banner .tip-dismiss {
  position: absolute; top: 8px; right: 10px;
  background: none; border: none; cursor: pointer;
  font-size: 16px; color: var(--secondary-text-color, #888); opacity: 0.6;
}
.tip-banner .tip-dismiss:hover { opacity: 1; }
.tip-banner.hidden { display: none; }


:host(.bento-dark) {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  }
/* === DARK MODE ADDED - old comment below === */

        /* === MOBILE FIX === */
        @media (max-width: 768px) {
          .tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
          .tab, .tab-btn, .tab-btn { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
          .card, .card-container { padding: 14px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-val, .kpi-val, .metric-val { font-size: 18px; }
          .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
          .panels, .board { flex-direction: column; }
          .column { min-width: unset; }
          h2 { font-size: 18px; }
          h3 { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .tabs { gap: 1px; }
          .tab, .tab-btn, .tab-btn { padding: 5px 8px; font-size: 11px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: 1fr 1fr; }
          .stat-val, .kpi-val, .metric-val { font-size: 16px; }
        }


        .weekly-summary { margin: 16px 0; padding: 16px; border: 1px solid var(--bento-border); border-radius: 12px; }
        .growth-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0; }
        .growth-controls label { flex: 1 1 100%; font-weight: 600; }
        .growth-controls select, .growth-controls button, .growth-point-button { min-height: 44px; min-width: 44px; max-width: 100%; font: inherit; }
        .weekly-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 10px; }
        .weekly-grid .stat-card { min-width: 0; padding: 12px; overflow-wrap: anywhere; }
        .weekly-grid .stat-value { font-size: 1.35rem; }
        .weekly-grid .stat-label { font-size: .85rem; text-transform: none; }
        .summary-note { font-size: .875rem; color: var(--bento-text-secondary); overflow-wrap: anywhere; line-height: 1.5; }
        .growth-metric { min-width: 0; border: 1px solid var(--bento-border); border-radius: 12px; padding: 12px; margin-top: 16px; }
        .growth-svg { display: block; width: 100%; height: auto; color: var(--bento-primary, #3b82f6); }
        .growth-svg .axis { stroke: var(--bento-border); stroke-width:.75; shape-rendering:crispEdges; vector-effect:non-scaling-stroke; }
        .growth-svg .series { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
        .growth-svg .point { fill: var(--bento-bg, var(--card-background-color, #fff)); stroke: currentColor; stroke-width: 2; }
        .growth-points { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .growth-point-button { border: 1px solid var(--bento-border); border-radius: 8px; color: var(--bento-text); background: var(--bento-surface, var(--card-background-color)); padding: 8px; white-space: normal; overflow-wrap: anywhere; }
        .growth-controls :focus-visible, .growth-point-button:focus-visible { outline: 3px solid var(--bento-primary, #3b82f6); outline-offset: 2px; }
        .growth-point-button[aria-pressed="true"] { border-color: var(--bento-primary, #3b82f6); }
        .growth-detail { min-height: 1.5em; margin: 8px 0; overflow-wrap: anywhere; }
        .growth-axis-labels { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: .875rem; color: var(--bento-text-secondary); }
        .growth-data { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: .9rem; }
        .growth-data caption { text-align: left; margin-bottom: 8px; }
        .growth-data th, .growth-data td { padding: 10px 4px; border-bottom: 1px solid var(--bento-border); text-align: left; overflow-wrap: anywhere; }

${BABY_FAMILY_CSS}
      </style>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">${_esc(title)}</h2>
          <div class="baby-selector">
            ${this.babies.map((baby, idx) => `
              <button class="baby-button ${idx === this.selectedBaby ? 'active' : ''}"
                      data-index="${idx}" data-baby-key="${_esc(baby.entry_id ? `entry:${baby.entry_id}` : `local:${baby.name}`)}" aria-pressed="${idx === this.selectedBaby}">${_esc(baby.name)}</button>
            `).join('')}
          </div>
        </div>

        <div class="tip-banner" id="tip-banner">
          <button class="tip-dismiss" id="tip-dismiss" aria-label="Dismiss">\u2715</button>
          <div class="tip-banner-title">\u{1F4A1} ${this._lang === 'pl' ? 'Jak zacz\u0105\u0107?' : 'Getting started'}</div>
          <ul>
            ${this._lang === 'pl' ? `
            <li><strong>Zapis danych:</strong> ${this._backendDetectionFailed ? 'Nie potwierdzono połączenia z Home Assistant. Zapis i eksport są wstrzymane; sprawdź połączenie i spróbuj ponownie.' : this._backendAvailable ? 'dane zapisywane s\u0105 po stronie Home Assistant dla skonfigurowanego dziecka.' : 'dane zapisywane s\u0105 lokalnie w przegl\u0105darce (browser-scoped storage). Dane nie synchronizuj\u0105 si\u0119 mi\u0119dzy urz\u0105dzeniami.'}</li>
            <li><strong>Zak\u0142adki:</strong> Feeding (karmienie), Diapers (pieluchy), Sleep (sen), Growth (wzrost/waga).</li>
            <li><strong>Multi-baby:</strong> dodaj wiele dzieci \u2014 ka\u017Cde ma osobne wpisy i statystyki.</li>
            <li><strong>Wykresy:</strong> tygodniowe podsumowanie zapisanych karmień, pieluch i snu oraz osobne wykresy masy (kg) i wzrostu (cm). Wybierz okres i przełącz Wykres/Dane.</li>
            <li><strong>Eksport:</strong> u\u017Cyj przycisku <em>Export Data (JSON)</em> aby zachowa\u0107 kopi\u0119 swoich danych.</li>
            ` : `
            <li><strong>Storage:</strong> ${this._backendDetectionFailed ? 'The connection to Home Assistant was not confirmed. Saving and export are paused; check the connection and try again.' : this._backendAvailable ? 'data is stored server-side in Home Assistant for the configured child.' : 'data is stored locally in your browser (browser-scoped storage). Data does not sync between devices.'}</li>
            <li><strong>Tabs:</strong> Feeding, Diapers, Sleep, Growth (weight/height).</li>
            <li><strong>Multi-baby:</strong> add multiple children \u2014 each has separate records and statistics.</li>
            <li><strong>Charts:</strong> weekly summaries of saved feedings, diapers and sleep, plus separate weight (kg) and height (cm) charts. Choose a period and switch Chart/Data.</li>
            <li><strong>Export:</strong> use the <em>Export Data (JSON)</em> button to keep a copy of your data.</li>
            `}
          </ul>
        </div>

        <section class="weekly-summary" aria-label="${this._lang === 'pl' ? 'Podsumowanie tygodnia' : 'Weekly summary'}">
          <div class="growth-controls">
            <label for="weeklyPeriod">${this._lang === 'pl' ? 'Podsumowanie tygodnia' : 'Weekly summary'}</label>
            <select id="weeklyPeriod">
              <option value="0" ${this._weeklyOffset !== -1 ? 'selected' : ''}>${this._lang === 'pl' ? 'Bieżący tydzień' : 'Current week'}</option>
              <option value="-1" ${this._weeklyOffset === -1 ? 'selected' : ''}>${this._lang === 'pl' ? 'Poprzedni tydzień' : 'Previous week'}</option>
            </select>
          </div>
          <div id="weeklyStats"></div>
        </section>
        ${this.babies.length > 1 ? `
          <div class="baby-family-children">
            ${this.babies.map((b, i) => `
              <button class="baby-btn" data-baby="${i}" data-baby-key="${_esc(b.entry_id ? `entry:${b.entry_id}` : `local:${b.name}`)}" role="button" aria-pressed="${this.selectedBaby === i}"
                style="padding:6px 14px;border:1.5px solid ${this.selectedBaby === i ? 'var(--bento-primary,#3B82F6)' : 'var(--bento-border,#e2e8f0)'};border-radius:20px;background:${this.selectedBaby === i ? 'rgba(59,130,246,0.1)' : 'transparent'};color:${this.selectedBaby === i ? 'var(--bento-primary,#3B82F6)' : 'var(--bento-text-secondary,#64748B)'};font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">
                👶 ${_esc(b.name)}
              </button>
            `).join('')}
          </div>` : ``}
        <div class="tabs" role="tablist">
          <button class="tab-button ${this.selectedTab === 'feeding' ? 'active' : ''}" data-tab="feeding" role="tab" aria-selected="${!!(this.selectedTab === 'feeding' )}">
            🍼 ${this._lang === 'pl' ? 'Karmienie' : 'Feeding'}
          </button>
          <button class="tab-button ${this.selectedTab === 'lactation' ? 'active' : ''}" data-tab="lactation" role="tab" aria-selected="${!!(this.selectedTab === 'lactation' )}">
            🤱 ${this._lang === 'pl' ? 'Laktacja' : 'Lactation'}
          </button>
          <button class="tab-button ${this.selectedTab === 'diapers' ? 'active' : ''}" data-tab="diapers" role="tab" aria-selected="${!!(this.selectedTab === 'diapers' )}">
            🩷 ${this._lang === 'pl' ? 'Pieluchy' : 'Diapers'}
          </button>
          <button class="tab-button ${this.selectedTab === 'sleep' ? 'active' : ''}" data-tab="sleep" role="tab" aria-selected="${!!(this.selectedTab === 'sleep' )}">
            😴 ${this._lang === 'pl' ? 'Sen' : 'Sleep'}
          </button>
          <button class="tab-button ${this.selectedTab === 'growth' ? 'active' : ''}" data-tab="growth" role="tab" aria-selected="${!!(this.selectedTab === 'growth' )}">
            📏 ${this._lang === 'pl' ? 'Pomiary' : 'Growth'}
          </button>
          <button class="tab-button ${this.selectedTab === 'history' ? 'active' : ''}" data-tab="history" role="tab" aria-selected="${this.selectedTab === 'history'}">
            📚 ${this._lang === 'pl' ? 'Historia' : 'History'}
          </button>
          <button class="tab-button ${this.selectedTab === 'config' ? 'active' : ''}" data-tab="config" role="tab" aria-selected="${!!(this.selectedTab === 'config' )}">
            ⚙️ ${this._lang === 'pl' ? 'Ustawienia' : 'Config'}
          </button>
        </div>

        <!-- Feeding Tab -->
        <div class="tab-pane" id="feeding-tab" style="display:${this.selectedTab === 'feeding' ? 'block' : 'none'}">
        <div class="section-block" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px;font-size:15px">👶 ${this._lang === 'pl' ? 'Dzieci' : 'Children'}</h3>
        ${this._backendAvailable ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          ${this.babies.map(b => `<div>${_esc(b.name)}</div>`).join('')}
        </div>
        ${this.hass?.user?.is_admin ? `<a class="manage-children-link" href="/config/integrations/dashboard" style="color:var(--bento-primary,#3B82F6)">${this._lang === 'pl' ? 'Zarządzaj dziećmi w Home Assistant' : 'Manage children in Home Assistant'}</a>` : `<p>${this._lang === 'pl' ? 'Administrator może zarządzać dziećmi w ustawieniach Home Assistant.' : 'An administrator can manage children in Home Assistant settings.'}</p>`}
        ` : `
        <div id="children-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          ${this.babies.map((b, i) => `
            <div style="display:flex;align-items:center;gap:8px">
              <input type="text" value="${_esc(b.name)}" data-child-idx="${i}" class="child-name-input"
                style="flex:1;padding:8px 12px;border:1.5px solid var(--bento-border,#e2e8f0);border-radius:6px;font-size:13px;font-family:Inter,sans-serif;background:var(--bento-card,#fff);color:var(--bento-text,#333)">
              ${this.babies.length > 1 ? `<button onclick="this.getRootNode().host._removeChild(${i})" style="padding:6px 10px;border:1px solid var(--bento-border);border-radius:6px;background:none;cursor:pointer;color:var(--bento-text-secondary);font-size:14px" title="${_esc(this._t.remove)}">🗑</button>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="this.getRootNode().host._addChild()" style="padding:8px 16px;border:none;border-radius:8px;background:var(--bento-primary,#3B82F6);color:white;font-weight:600;font-size:12px;cursor:pointer">➕ ${this._lang === 'pl' ? 'Dodaj dziecko' : 'Add child'}</button>
          <button onclick="this.getRootNode().host._saveChildNames()" style="padding:8px 16px;border:1px solid var(--bento-border);border-radius:8px;background:var(--bento-card);color:var(--bento-text);font-weight:500;font-size:12px;cursor:pointer">💾 ${this._lang === 'pl' ? 'Zapisz nazwy' : 'Save names'}</button>
        </div>
        `}
      </div>

      <!-- Breastfeeding Timer Section -->
      <div class="section-block" style="margin-bottom:16px;background:var(--bento-bg);border:1px solid var(--bento-border);border-radius:8px;padding:16px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">\u{1F4CA} ${this._lang === 'pl' ? 'Karmienie piersi\u0105' : 'Breastfeeding'}</h3>

        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button class="bf-breast-btn" data-side="left" style="flex:1;padding:12px 16px;border:2px solid var(--bento-border);background:var(--bento-card);border-radius:8px;font-weight:600;cursor:pointer;font-size:14px" title="${_esc(this._t.leftBreast)}">
            \u{1F452} ${this._lang === 'pl' ? 'Lewa' : 'Left'}
          </button>
          <button class="bf-breast-btn" data-side="right" style="flex:1;padding:12px 16px;border:2px solid var(--bento-border);background:var(--bento-card);border-radius:8px;font-weight:600;cursor:pointer;font-size:14px" title="${_esc(this._t.rightBreast)}">
            \u{1F452} ${this._lang === 'pl' ? 'Prawa' : 'Right'}
          </button>
        </div>

        <div class="bf-timer-display" style="background:var(--bento-bg);border:2px solid var(--bento-border);border-radius:8px;padding:16px;text-align:center;margin-bottom:16px">
          <div style="font-size:32px;font-weight:700;font-family:monospace;letter-spacing:2px;color:var(--bento-primary);margin-bottom:8px" id="bfTimerDisplay">00:00</div>
          <div style="font-size:12px;color:var(--bento-text-secondary);font-weight:600;text-transform:uppercase" id="bfTimerLabel">${this._lang === 'pl' ? 'Gotowe' : 'Ready'}</div>
        </div>

        <div id="bfSessionsList" style="margin-top:12px;font-size:12px"></div>
      </div>

      <div class="tab-content active">
          <div class="form-group">
            <label class="form-label" for="feedingType">${this._lang === 'pl' ? 'Typ' : 'Type'}</label>
            <select id="feedingType">
              <option value="breast">${this._lang === 'pl' ? 'Karmienie piersią' : 'Breast Feeding'}</option>
              <option value="bottle">${this._lang === 'pl' ? 'Karmienie butelką' : 'Bottle Feeding'}</option>
              <option value="solid">${this._lang === 'pl' ? 'Pokarm stały' : 'Solid Food'}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="feedingTime">${this._lang === 'pl' ? 'Godzina' : 'Time'}</label>
              <input type="time" id="feedingTime">
            </div>
            <div class="form-group">
              <label class="form-label" for="feedingAmount">${this._lang === 'pl' ? 'Czas trwania / ilość' : 'Duration/Amount'}</label>
              <input type="text" id="feedingAmount" placeholder="${this._lang === 'pl' ? 'np. 15 min lub 120 ml' : 'e.g., 15 min or 120 ml'}">
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label" for="feedingNotes">${this._lang === 'pl' ? 'Notatki' : 'Notes'}</label>
            <textarea id="feedingNotes" placeholder="${this._lang === 'pl' ? 'Opcjonalne notatki...' : 'Optional notes...'}"></textarea>
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addFeedingBtn">${this._lang === 'pl' ? 'Dodaj karmienie' : 'Add Feeding'}</button>
            <button class="btn-secondary" id="clearFeedingBtn">${this._lang === 'pl' ? 'Wyczyść' : 'Clear'}</button>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">${this._lang === 'pl' ? 'Ostatnie karmienia' : 'Recent Feedings'}</h3>
            <div id="feedingList"></div>
          </div>
        </div>
        </div>
        

        <!-- Lactation Tab -->
        <div class="tab-pane" id="lactation-tab" style="display:${this.selectedTab === 'lactation' ? 'block' : 'none'}">
        <div class="tab-content active">
          <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">🤱 ${this._lang === 'pl' ? 'Śledzenie laktacji' : 'Lactation Tracking'}</h3>

          <div class="form-group">
            <label class="form-label" for="lactationType">${this._lang === 'pl' ? 'Typ' : 'Type'}</label>
            <select id="lactationType">
              <option value="breastfeed">${this._lang === 'pl' ? 'Karmienie piersi\u0105' : 'Breastfeeding'}</option>
              <option value="pump">${this._lang === 'pl' ? 'Odciąganie' : 'Pumping'}</option>
              <option value="manual">${this._lang === 'pl' ? 'Ręczne odciąganie' : 'Hand Expression'}</option>
              <option value="supplement">${this._lang === 'pl' ? 'Suplementacja' : 'Supplementation'}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="lactationTime">${this._lang === 'pl' ? 'Czas' : 'Time'}</label>
              <input type="time" id="lactationTime">
            </div>
            <div class="form-group">
              <label class="form-label" for="lactationSide">${this._lang === 'pl' ? 'Strona' : 'Side'}</label>
              <select id="lactationSide">
                <option value="left">${this._lang === 'pl' ? 'Lewa' : 'Left'}</option>
                <option value="right">${this._lang === 'pl' ? 'Prawa' : 'Right'}</option>
                <option value="both">${this._lang === 'pl' ? 'Obie' : 'Both'}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="lactationDuration">${this._lang === 'pl' ? 'Czas trwania (min)' : 'Duration (min)'}</label>
              <input type="number" id="lactationDuration" placeholder="${this._lang === 'pl' ? 'np. 15' : 'e.g., 15'}" min="1">
            </div>
            <div class="form-group">
              <label class="form-label" for="lactationAmount">${this._lang === 'pl' ? 'Ilość (ml)' : 'Amount (ml)'}</label>
              <input type="number" id="lactationAmount" placeholder="${this._lang === 'pl' ? 'np. 80' : 'e.g., 80'}" min="0">
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label" for="lactationNotes">${this._lang === 'pl' ? 'Notatki' : 'Notes'}</label>
            <textarea id="lactationNotes" placeholder="${this._lang === 'pl' ? 'Opcjonalne notatki...' : 'Optional notes...'}"></textarea>
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addLactationBtn">${this._lang === 'pl' ? 'Dodaj wpis' : 'Add Entry'}</button>
            <button class="btn-secondary" id="clearLactationBtn">${this._lang === 'pl' ? 'Wyczyść' : 'Clear'}</button>
          </div>

          <div style="margin-top:20px">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value" id="lactationTotalMl">0</div>
                <div class="stat-label">${this._lang === 'pl' ? 'ml dziś' : 'ml today'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="lactationSessionCount">0</div>
                <div class="stat-label">${this._lang === 'pl' ? 'Sesje dziś' : 'Sessions today'}</div>
              </div>
            </div>
            <h3 style="margin:20px 0 12px;font-size:16px;font-weight:600">${this._lang === 'pl' ? 'Ostatnie wpisy' : 'Recent Entries'}</h3>
            <div id="lactationList"></div>
          </div>
        </div>
        </div>
        

        <!-- Diapers Tab -->
        <div class="tab-pane" id="diapers-tab" style="display:${this.selectedTab === 'diapers' ? 'block' : 'none'}">
        <div class="tab-content active">
          <div class="form-group">
            <label class="form-label" for="diapersType">${this._lang === 'pl' ? 'Typ' : 'Type'}</label>
            <select id="diapersType">
              <option value="wet">${this._lang === 'pl' ? 'Mokra' : 'Wet'}</option>
              <option value="dirty">${this._lang === 'pl' ? 'Brudna' : 'Dirty'}</option>
              <option value="both">${this._lang === 'pl' ? 'Mokra i brudna' : 'Both'}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="diapersTime">${this._lang === 'pl' ? 'Godzina' : 'Time'}</label>
            <input type="time" id="diapersTime">
          </div>

          <div class="form-group full">
            <label class="form-label" for="diapersNotes">${this._lang === 'pl' ? 'Notatki' : 'Notes'}</label>
            <textarea id="diapersNotes" placeholder="${this._lang === 'pl' ? 'Opcjonalne notatki...' : 'Optional notes...'}"></textarea>
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addDiapersBtn">${this._lang === 'pl' ? 'Dodaj pieluchę' : 'Log Diaper'}</button>
            <button class="btn-secondary" id="clearDiapersBtn">${this._lang === 'pl' ? 'Wyczyść' : 'Clear'}</button>
          </div>

          <div style="margin-top: 20px;">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value" id="wetCount">0</div>
                <div class="stat-label">${this._lang === 'pl' ? 'Mokre dzisiaj' : 'Wet Today'}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="dirtyCount">0</div>
                <div class="stat-label">${this._lang === 'pl' ? 'Brudne dzisiaj' : 'Dirty Today'}</div>
              </div>
            </div>
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">${this._lang === 'pl' ? 'Ostatnie zmiany' : 'Recent Changes'}</h3>
            <div id="diapersLis"></div>
          </div>
        </div>
        </div>
        

        <!-- Sleep Tab -->
        <div class="tab-pane" id="sleep-tab" style="display:${this.selectedTab === 'sleep' ? 'block' : 'none'}">
        <div class="tab-content active">
          <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">\ud83d\ude34 ${this._lang === 'pl' ? 'Sen niemowlęcia' : 'Baby Sleep'}</h3>

          <!-- Sleep Timer Section -->
          <div class="section-block" style="margin-bottom:16px;background:var(--bento-bg);border:1px solid var(--bento-border);border-radius:8px;padding:16px">
            <h4 style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;color:var(--bento-text-secondary)">${this._lang === 'pl' ? 'Aktywny sen' : 'Active Sleep'}</h4>
            <div class="sleep-timer-display" style="background:var(--bento-bg);border:2px solid var(--bento-primary);border-radius:8px;padding:16px;text-align:center;margin-bottom:16px">
              <div style="font-size:36px;font-weight:700;font-family:monospace;letter-spacing:2px;color:var(--bento-primary);margin-bottom:8px" id="sleepTimerDisplay">00:00:00</div>
              <div style="font-size:12px;color:var(--bento-text-secondary);font-weight:600" id="sleepTimerStatus">${this._lang === 'pl' ? 'Sen nie jest aktywny' : 'Sleep not active'}</div>
            </div>

            <div style="display:flex;gap:8px;margin-bottom:12px">
              <button class="btn-primary" id="startSleepBtn" style="flex:1">${this._lang === 'pl' ? '\u2705 Zacznij sen' : '\u2705 Start Sleep'}</button>
              <button class="btn-danger" id="stopSleepBtn" style="flex:1;display:none">${this._lang === 'pl' ? '\u274c Koniec snu' : '\u274c End Sleep'}</button>
            </div>
            <div id="sleepTimerLastSession" style="font-size:12px;color:var(--bento-text-secondary);text-align:center"></div>
          </div>

          <!-- Manual Entry Section -->
          <div style="margin-bottom:16px">
            <h4 style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;color:var(--bento-text-secondary)">${this._lang === 'pl' ? 'Wpis ręczny' : 'Manual Entry'}</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="sleepFromTime">${this._lang === 'pl' ? 'Sen od' : 'Sleep From'}</label>
                <input type="datetime-local" id="sleepFromTime">
              </div>
              <div class="form-group">
                <label class="form-label" for="sleepToTime">${this._lang === 'pl' ? 'Sen do' : 'Sleep To'}</label>
                <input type="datetime-local" id="sleepToTime">
              </div>
            </div>
            <button class="btn-primary" id="addSleepBtn" style="width:100%">${this._lang === 'pl' ? 'Dodaj sen' : 'Log Sleep'}</button>
          </div>

          <!-- Sleep Summary -->
          <div style="margin-top:20px">
            <div class="stat-card" style="grid-column:1/-1;margin-bottom:16px">
              <div class="stat-value" id="totalSleep">0h 0m</div>
              <div class="stat-label">${this._lang === 'pl' ? 'Całkowity sen dzisiaj' : 'Total Sleep Today'}</div>
            </div>
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:600">${this._lang === 'pl' ? 'Historia snu' : 'Sleep Log'}</h3>
            <div id="sleepList"></div>
          </div>
        </div>
        </div>
        

        <!-- Growth Tab -->
        <div class="tab-pane" id="growth-tab" style="display:${this.selectedTab === 'growth' ? 'block' : 'none'}">
        <div class="tab-content active">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="growthType">${this._lang === 'pl' ? 'Pomiar' : 'Measurement'}</label>
              <select id="growthType">
                <option value="weight">${this._lang === 'pl' ? 'Masa (kg)' : 'Weight (kg)'}</option>
                <option value="height">${this._lang === 'pl' ? 'Wzrost (cm)' : 'Height (cm)'}</option>
                <option value="headCirc">${this._lang === 'pl' ? 'Obwód głowy (cm)' : 'Head Circumference (cm)'}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="growthValue">${this._lang === 'pl' ? 'Wartość' : 'Value'}</label>
              <input type="number" id="growthValue" placeholder="${this._lang === 'pl' ? 'Wpisz wartość' : 'Enter value'}" step="0.1">
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label" for="growthDate">${this._lang === 'pl' ? 'Data' : 'Date'}</label>
            <input type="date" id="growthDate">
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addGrowthBtn">${this._lang === 'pl' ? 'Dodaj pomiar' : 'Add Measurement'}</button>
            <button class="btn-secondary" id="clearGrowthBtn">${this._lang === 'pl' ? 'Wyczyść' : 'Clear'}</button>
          </div>

          <div class="growth-controls">
            <label for="growthPeriod">${this._lang === 'pl' ? 'Okres pomiarów' : 'Measurement period'}</label>
            <select id="growthPeriod">
              <option value="all" ${!this._growthPeriod || this._growthPeriod === 'all' ? 'selected' : ''}>${this._lang === 'pl' ? 'Wszystkie' : 'All records'}</option>
              ${[30, 90, 365].map(days => `<option value="${days}" ${this._growthPeriod === String(days) ? 'selected' : ''}>${days} ${this._lang === 'pl' ? 'dni' : 'days'}</option>`).join('')}
            </select>
            <button class="btn-secondary" data-growth-view="chart" aria-pressed="${this._growthView !== 'data'}">${this._lang === 'pl' ? 'Wykres' : 'Chart'}</button>
            <button class="btn-secondary" data-growth-view="data" aria-pressed="${this._growthView === 'data'}">${this._lang === 'pl' ? 'Dane' : 'Data'}</button>
          </div>
          <div id="growthCharts"></div>

          <h3 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600;">${this._lang === 'pl' ? 'Pomiary' : 'Measurements'}</h3>
          <div id="growthList"></div>
        </div>
        </div>
        

        <!-- Config Tab -->
        <div class="tab-pane" id="history-tab" style="display:${this.selectedTab === 'history' ? 'block' : 'none'}">
          <h3>${this._lang === 'pl' ? 'Pełna historia zapisanych wpisów' : 'Complete saved history'}</h3>
          <p class="summary-note">${this._lang === 'pl' ? 'Źródło: zapisane wpisy wybranego dziecka. Aktywne timery nie są zakończonymi wpisami. Dni w strefie' : 'Source: saved records for the selected child. Active timers are not completed entries. Days in time zone'}: ${_esc(this._historyZone())}.</p>
          <div class="history-controls">
            <label for="historyFrom">${this._lang === 'pl' ? 'Od dnia' : 'From day'}<input id="historyFrom" type="date" value="${_esc(historyState.from)}"></label>
            <label for="historyTo">${this._lang === 'pl' ? 'Do dnia' : 'To day'}<input id="historyTo" type="date" value="${_esc(historyState.to)}"></label>
            <label for="historyType">${this._lang === 'pl' ? 'Typ wpisu' : 'Entry type'}<select id="historyType" aria-label="${this._lang === 'pl' ? 'Typ wpisu' : 'Entry type'}"></select></label>
            <button type="button" class="btn-secondary" id="historyReset">${this._lang === 'pl' ? 'Wyczyść filtry' : 'Reset filters'}</button>
          </div>
          <p id="historyStatus" role="status" aria-live="polite"></p>
          <div class="history-pagination">
            <button type="button" class="btn-secondary" id="historyNewest">${this._lang === 'pl' ? 'Najnowsze' : 'Newest'}</button>
            <button type="button" class="btn-secondary" id="historyNewer">${this._lang === 'pl' ? 'Nowsze' : 'Newer'}</button>
            <span id="historyPageInfo"></span>
            <button type="button" class="btn-secondary" id="historyOlder">${this._lang === 'pl' ? 'Starsze' : 'Older'}</button>
          </div>
          <div id="historyResults"></div>
        </div>

        <div class="tab-pane" id="config-tab" style="display:${this.selectedTab === 'config' ? 'block' : 'none'}">
        <div class="tab-content active">
          ${this._canRetryLocalMigration() ? `
          <div class="config-section">
            <h3>${this._lang === 'pl' ? 'Lokalne dane' : 'Local data'}</h3>
            <p>${this._lang === 'pl'
              ? 'Sprawdź podgląd i zdecyduj o przeniesieniu danych z tej przeglądarki. Oryginały pozostaną lokalnie.'
              : 'Review a fresh preview before migrating data from this browser. The local originals will be kept.'}</p>
            <button class="btn-secondary" id="retryLocalMigrationBtn" ${this._migrationInProgress ? 'disabled' : ''}>${this._lang === 'pl' ? 'Przenieś lokalne dane' : 'Migrate local data'}</button>
          </div>` : ''}
          <div class="config-section">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:600">${this._lang === 'pl' ? 'Komendy głosowe' : 'Custom Sentences'}</h3>
            <p style="font-size:13px;color:var(--bento-text-secondary,#64748B);margin:0 0 16px">
              ${this._lang === 'pl'
                ? 'Wygeneruj plik YAML z komendami g\u0142osowymi do sterowania Baby and Lactation Trackerem przez Assist. Skopiuj wygenerowany YAML i wklej do <code>custom_sentences/</code> w folderze konfiguracji HA.'
                : 'Generate a YAML file with voice commands to control Baby and Lactation Tracker via Assist. Copy the generated YAML and paste into <code>custom_sentences/</code> in your HA config folder.'}
            </p>

            <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
              <label for="sentenceLangSelect" style="font-size:13px;font-weight:600;color:var(--bento-text,#1e293b)">
                ${this._lang === 'pl' ? 'J\u0119zyk sentences:' : 'Sentences language:'}
              </label>
              <select id="sentenceLangSelect" style="padding:6px 12px;border-radius:8px;border:1px solid var(--bento-border,#e2e8f0);font-size:13px;background:var(--bento-card,#fff);color:var(--bento-text,#1e293b)">
                ${this._renderLangOptions()}
              </select>
              <button class="btn-primary" id="generateSentencesBtn" style="font-size:13px;padding:6px 16px">
                ${this._lang === 'pl' ? 'Generuj YAML' : 'Generate YAML'}
              </button>
            </div>

            <div id="sentencesCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px">
              ${this._renderSentenceCheckboxes()}
            </div>

            <div id="sentencesOutput" style="position:relative;margin-bottom:16px;display:${this._generatedYaml ? 'block' : 'none'}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-size:12px;font-weight:600;color:var(--bento-text-secondary,#64748B)">
                  ${this._lang === 'pl' ? 'Wygenerowany YAML' : 'Generated YAML'}
                  ${this._generatedYaml ? ' \u2014 <code>custom_sentences/' + _esc(this._sentenceLang || this._lang || 'en') + '/baby.yaml</code>' : ''}
                </span>
                <button class="btn-secondary" id="copySentencesBtn" style="font-size:11px;padding:4px 10px">
                  ${this._lang === 'pl' ? 'Kopiuj' : 'Copy'}
                </button>
              </div>
              <pre id="sentencesYaml" style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-size:11px;line-height:1.6;overflow-x:auto;max-height:400px;overflow-y:auto;margin:0;white-space:pre">${_esc(this._generatedYaml || '')}</pre>
            </div>

            <div style="margin-top:20px;padding:12px;background:var(--bento-bg,#f8fafc);border:1px solid var(--bento-border,#e2e8f0);border-radius:8px">
              <div style="font-size:12px;font-weight:600;color:var(--bento-text,#1e293b);margin-bottom:8px">
                ${this._lang === 'pl' ? 'Jak u\u017Cy\u0107:' : 'How to use:'}
              </div>
              <ol style="margin:0;padding-left:20px;font-size:12px;color:var(--bento-text-secondary,#64748B);line-height:1.8">
                <li>${this._lang === 'pl'
                    ? 'Wybierz j\u0119zyk i kategorie komend powy\u017Cej'
                    : 'Select language and command categories above'}</li>
                <li>${this._lang === 'pl'
                    ? 'Kliknij <strong>Generuj YAML</strong>'
                    : 'Click <strong>Generate YAML</strong>'}</li>
                <li>${this._lang === 'pl'
                    ? 'Skopiuj YAML i utw\u00F3rz plik <code>/config/custom_sentences/{lang}/baby.yaml</code>'
                    : 'Copy YAML and create file <code>/config/custom_sentences/{lang}/baby.yaml</code>'}</li>
                <li>${this._lang === 'pl'
                    ? 'Zrestartuj HA lub prze\u0142aduj custom sentences'
                    : 'Restart HA or reload custom sentences'}</li>
                <li>${this._lang === 'pl'
                    ? 'Testuj w <strong>Developer Tools > Assist</strong>'
                    : 'Test in <strong>Developer Tools > Assist</strong>'}</li>
              </ol>
            </div>
          </div>

          <div class="config-section" style="margin-top:20px">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:600">
              ${this._lang === 'pl' ? 'Integracja z HA' : 'HA Integration'}
            </h3>
            <div style="font-size:12px;line-height:1.8;color:var(--bento-text-secondary,#64748B)">
              <div><strong>${this._lang === 'pl' ? 'Karta Lovelace:' : 'Lovelace Card:'}</strong>
                ${this._lang === 'pl'
                  ? 'Baby and Lactation Tracker jest \u0142adowany automatycznie przez ha-tools-panel. Mo\u017Cesz te\u017C doda\u0107 go jako osobn\u0105 kart\u0119:'
                  : 'Baby and Lactation Tracker is loaded automatically by ha-tools-panel. You can also add it as a standalone card:'}
              </div>
              <pre style="background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;font-size:11px;margin:4px 0">type: custom:ha-baby-tracker</pre>
              <div><strong>${this._lang === 'pl' ? 'Zapis danych:' : 'Storage:'}</strong>
                ${this._lang === 'pl'
                  ? (this._backendDetectionFailed ? 'Nie potwierdzono połączenia z Home Assistant. Zapis i eksport są wstrzymane; sprawdź połączenie i spróbuj ponownie.' : this._backendAvailable ? 'Dane zapisywane s\u0105 po stronie Home Assistant. Tryb lokalny pozostaje jako fallback bez integracji.' : 'Dane zapisywane s\u0105 lokalnie w przegl\u0105darce. Skorzystaj z przycisku <em>Export Data (JSON)</em> aby zrobi\u0107 kopi\u0119.')
                  : (this._backendDetectionFailed ? 'The connection to Home Assistant was not confirmed. Saving and export are paused; check the connection and try again.' : this._backendAvailable ? 'Data is stored server-side in Home Assistant. Local browser storage remains as the no-backend fallback.' : 'Data is stored locally in your browser. Use the <em>Export Data (JSON)</em> button to keep a backup.')}
              </div>
            </div>
          </div>
        </div>
        </div>
        

        <div class="export-section">
          <button class="btn-secondary" id="exportBtn">📥 ${this._lang === 'pl' ? 'Eksport danych (JSON)' : 'Export Data (JSON)'}</button>
        </div>
      
        </div>
    `;

    const support = this._hass?.user?.is_admin && this.config?.show_support !== false && !supportDismissed() ? ownDonateFooter() : '';
    if (this._lastHtml === html + support && sameFamilyContext) {
      _bindFamilyNavigation(this);
      return;
    }
    this._lastHtml = html + support;
    const focusedHistory = sameFamilyContext && this.shadowRoot.activeElement?.closest('#history-tab') ? this.shadowRoot.activeElement.id : null;
    const tabsEl = this.shadowRoot.querySelector('.tabs');
    const tabsScrollLeft = tabsEl ? tabsEl.scrollLeft : 0;
    const exportContainer = this.shadowRoot.querySelector('[data-ha-tools-export]');
    const exportFocus = exportContainer?.shadowRoot?.activeElement;
    const exportSelection = exportFocus?.tagName === 'INPUT' && exportFocus.type === 'text'
      ? [exportFocus.selectionStart, exportFocus.selectionEnd, exportFocus.selectionDirection] : null;
    // A live native modal must remain connected and in the browser top layer.
    if (exportContainer) {
      const template = this.ownerDocument.createElement('template');
      template.innerHTML = html + support;
      for (const child of [...this.shadowRoot.childNodes]) {
        if (child !== exportContainer) child.remove();
      }
      this.shadowRoot.insertBefore(template.content, exportContainer);
    } else {
      this.shadowRoot.innerHTML = html + support;
    }
    this._babyFamilyRenderedContext = familyContext;
    requestAnimationFrame(() => {
      const newTabsEl = this.shadowRoot.querySelector('.tabs');
      if (newTabsEl) newTabsEl.scrollLeft = tabsScrollLeft;
    });

    this.attachEventListeners();
    this.setDefaultTimes();
    this.updateAllDisplays();
    if (focusedHistory) this.shadowRoot.getElementById(focusedHistory)?.focus({ preventScroll: true });
    _restoreBabyManualFields(this, familyDrafts);
    _bindFamilyNavigation(this, familyFocus);
    if (exportContainer) {
      exportFocus?.focus({ preventScroll: true });
      if (exportSelection) exportFocus.setSelectionRange(...exportSelection);
    }
  }

  attachEventListeners() {
    this.shadowRoot.getElementById('retryLocalMigrationBtn')?.addEventListener('click', () => this._promptLocalMigration(true));
    this.shadowRoot.querySelector('.support-dismiss')?.addEventListener('click', () => {
      try { localStorage.setItem(SUPPORT_DISMISSED_KEY, '1'); } catch (_) {}
      this.renderCard();
    });
    // Tip banner dismiss
    const _tipB = this.shadowRoot.querySelector('#tip-banner');
    if (_tipB) {
      const _tipV = 'ha-tools-baby-tracker-tips-v3.0.0';
      if (localStorage.getItem(_tipV) === 'dismissed') {
        _tipB.classList.add('hidden');
      }
      const _tipDismiss = this.shadowRoot.querySelector('#tip-dismiss');
      if (_tipDismiss) {
        _tipDismiss.addEventListener('click', (e) => {
          e.stopPropagation();
          _tipB.classList.add('hidden');
          localStorage.setItem(_tipV, 'dismissed');
        });
      }
    }
    const shadowRoot = this.shadowRoot;

    shadowRoot.querySelectorAll('.baby-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._selectBaby(parseInt(e.target.closest('[data-index]').dataset.index));
      });
    });

    shadowRoot.querySelectorAll('.baby-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._selectBaby(parseInt(e.target.closest('[data-baby]').dataset.baby));
      });
    });

    shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedTab = e.target.closest('[data-tab]').dataset.tab;
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this.selectedTab);
        if (this.selectedTab === 'history') this.updateHistoryDisplay();
        // Toggle button active states
        shadowRoot.querySelectorAll('.tab-button').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === this.selectedTab);
          b.setAttribute('aria-selected', String(b.dataset.tab === this.selectedTab));
        });
        // Toggle tab pane visibility
        ['feeding', 'lactation', 'diapers', 'sleep', 'growth', 'history', 'config'].forEach(t => {
          const el = shadowRoot.getElementById(t + '-tab');
          if (el) el.style.display = t === this.selectedTab ? 'block' : 'none';
        });
        // Refresh data for visible tab (fallback to full reload if per-tab loader not defined)
        if (typeof this._updateTabData === 'function') {
          this._updateTabData(this.selectedTab);
        } else if (typeof this._loadData === 'function') {
          this._loadData();
        }
      });
    });

    this._attachHistoryListeners();

    shadowRoot.getElementById('addFeedingBtn')?.addEventListener('click', () => this.addFeeding());
    shadowRoot.getElementById('clearFeedingBtn')?.addEventListener('click', () => this.clearFeedingForm());

    // Breastfeeding timers
    shadowRoot.querySelectorAll('.bf-breast-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.toggleBreastfeedingTimer(e.target.closest('[data-side]').dataset.side));
    });

    shadowRoot.getElementById('addLactationBtn')?.addEventListener('click', () => this.addLactation());
    shadowRoot.getElementById('clearLactationBtn')?.addEventListener('click', () => this.clearLactationForm());
    shadowRoot.getElementById('addDiapersBtn')?.addEventListener('click', () => this.addDiapers());
    shadowRoot.getElementById('clearDiapersBtn')?.addEventListener('click', () => this.clearDiapersForm());
    shadowRoot.getElementById('startSleepBtn')?.addEventListener('click', () => this.startSleepTimer());
    shadowRoot.getElementById('stopSleepBtn')?.addEventListener('click', () => this.stopSleepTimer());
    shadowRoot.getElementById('addSleepBtn')?.addEventListener('click', () => this.addManualSleep());
    shadowRoot.getElementById('weeklyPeriod')?.addEventListener('change', event => {
      this._weeklyOffset = Number(event.target.value);
      this.updateWeeklyStats();
    });
    shadowRoot.getElementById('growthPeriod')?.addEventListener('change', event => {
      this._growthPeriod = event.target.value;
      this.updateGrowthChart();
    });
    shadowRoot.querySelectorAll('[data-growth-view]').forEach(button => button.addEventListener('click', () => {
      this._growthView = button.dataset.growthView;
      shadowRoot.querySelectorAll('[data-growth-view]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.growthView === this._growthView)));
      this.updateGrowthChart();
    }));
    shadowRoot.getElementById('addGrowthBtn')?.addEventListener('click', () => this.addGrowth());
    shadowRoot.getElementById('clearGrowthBtn')?.addEventListener('click', () => this.clearGrowthForm());
    shadowRoot.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());

    // Config tab listeners
    shadowRoot.getElementById('generateSentencesBtn')?.addEventListener('click', () => {
      const langSel = shadowRoot.getElementById('sentenceLangSelect');
      const sentenceLang = langSel ? langSel.value : (this._lang || 'en');
      this._sentenceLang = sentenceLang;
      const checkboxes = shadowRoot.querySelectorAll('.sentence-group-cb:checked');
      const groups = Array.from(checkboxes).map(cb => cb.value);
      this._selectedSentenceGroups = groups;
      if (groups.length === 0) {
        alert(this._lang === 'pl' ? 'Wybierz przynajmniej jedn\u0105 kategori\u0119' : 'Select at least one category');
        return;
      }
      this._generatedYaml = this._generateSentencesYaml(sentenceLang, groups);
      this.renderCard();
    });
    shadowRoot.getElementById('copySentencesBtn')?.addEventListener('click', () => {
      const yamlEl = shadowRoot.getElementById('sentencesYaml');
      if (yamlEl && this._generatedYaml) {
        navigator.clipboard.writeText(this._generatedYaml).then(() => {
          const btn = shadowRoot.getElementById('copySentencesBtn');
          if (btn) {
            const orig = btn.textContent;
            btn.textContent = this._lang === 'pl' ? 'Skopiowano!' : 'Copied!';
            btn.style.background = '#22c55e';
            btn.style.color = '#fff';
            setTimeout(() => { btn.textContent = orig; btn.style.background = ''; btn.style.color = ''; }, 1500);
          }
        }).catch(() => {
          // Fallback: select text
          const range = document.createRange();
          range.selectNodeContents(yamlEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
      }
    });
    shadowRoot.getElementById('sentenceLangSelect')?.addEventListener('change', (e) => {
      this._sentenceLang = e.target.value;
    });
    shadowRoot.querySelectorAll('.sentence-group-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(shadowRoot.querySelectorAll('.sentence-group-cb:checked')).map(c => c.value);
        this._selectedSentenceGroups = checked;
      });
    });
  }


  // Complete history is a read view over the existing loaded child records.
  // No new persistence, requests, retention or timer records are introduced.
  _historyZone() {
    const zone = this.hass?.config?.time_zone;
    if (typeof zone === 'string') {
      try { new Intl.DateTimeFormat('en', { timeZone: zone }); return zone; } catch (_) {}
    }
    return this._localZoneLabel();
  }

  _getHistoryState() {
    const child = this._backendAvailable ? this._currentBackendEntryId() : this._storageKey();
    if (!this._historyState || this._historyState.child !== child) {
      this._historyState = { child, from: '', to: '', type: 'all', page: 1 };
    }
    return this._historyState;
  }

  _historyCategoryLabel(category) {
    const labels = { feeding: ['Karmienie', 'Feeding'], lactation: ['Laktacja', 'Lactation'],
      diapers: ['Pieluchy', 'Diapers'], sleep: ['Sen', 'Sleep'], growth: ['Pomiary', 'Growth'],
      bf_sessions: ['Karmienie piersią — timer', 'Breastfeeding — timer'] };
    return labels[category]?.[this._lang === 'pl' ? 0 : 1] || category;
  }

  _historyTypeLabel(category, type) {
    if (category === 'bf_sessions') return this._t.typeBreastfeed;
    if (category === 'sleep') return this._historyCategoryLabel('sleep');
    if (category === 'lactation') {
      const label = { breastfeed: this._t.typeBreastfeed, pump: this._t.typePump,
        manual: this._t.typeManual, supplement: this._t.typeSupplement };
      if (Object.hasOwn(label, type)) return label[type];
    }
    return type ? this._recordTypeLabel(type) : (this._lang === 'pl' ? 'Nieznany typ' : 'Unknown type');
  }

  _historyInstant(entry) {
    for (const value of [entry.startTime, entry.timestamp, entry.ts]) {
      if (value === '' || value === null || value === undefined || !['number', 'string'].includes(typeof value)) continue;
      const epoch = typeof value === 'number' ? Math.trunc(value) : value;
      const ms = new Date(typeof epoch === 'number' && epoch < 10_000_000_000 ? epoch * 1000 : epoch).getTime();
      if (Number.isFinite(ms)) return ms;
    }
    return null;
  }

  _historyRows() {
    const baby = this.getCurrentBaby();
    const rows = [];
    const pairs = new Map();
    const categories = [['feeding', this.feedingData.get(baby)], ['lactation', this.lactationData.get(baby)],
      ['diapers', this.diapersData.get(baby)], ['sleep', this.sleepData.get(baby)],
      ['growth', this.growthData.get(baby)], ['bf_sessions', this._bfSessions]];
    categories.forEach(([category, entries]) => {
      (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        const type = category === 'bf_sessions' ? 'breastfeed' : category === 'sleep' ? 'sleep' : _asText(entry.type);
        const source = { category, type, entry };
        // Deduplicate only the cross-category mirror created by existing save
        // commands. Unlinked events and repeated same-category records survive.
        const isBreastPair = (category === 'feeding' && type === 'breast') || (category === 'lactation' && type === 'breastfeed');
        const link = isBreastPair && typeof entry.linkedId === 'string' && entry.linkedId ? entry.linkedId : null;
        const paired = link && pairs.get(link);
        if (paired && !paired.sources.some(item => item.category === category)) {
          paired.sources.push(source);
          if (!paired.day) paired.day = this._validCalendarDay(this._entryLocalDay(entry, this._historyZone()));
          return;
        }
        // A growth timestamp is save time; its measurement date is authoritative.
        const day = this._validCalendarDay(category === 'growth' ? entry.date : this._entryLocalDay(entry, this._historyZone()));
        const instant = category === 'growth' ? null : this._historyInstant(entry);
        const row = { key: `${category}:${index}`, category, type, day, instant, sources: [source], index: rows.length };
        rows.push(row);
        if (link && !pairs.has(link)) pairs.set(link, row);
      });
    });
    return rows.sort((a, b) => {
      if (a.day !== b.day) return a.day === null ? 1 : b.day === null ? -1 : b.day.localeCompare(a.day);
      const aTime = a.instant === null ? _asText(a.sources[0].entry.time) : new Intl.DateTimeFormat('en-GB', { timeZone: this._historyZone(), hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(a.instant));
      const bTime = b.instant === null ? _asText(b.sources[0].entry.time) : new Intl.DateTimeFormat('en-GB', { timeZone: this._historyZone(), hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(b.instant));
      if (a.instant !== null && b.instant !== null) return b.instant - a.instant || b.index - a.index;
      return bTime.localeCompare(aTime) || b.index - a.index;
    });
  }

  _historyPage() {
    const state = this._getHistoryState();
    const all = this._historyRows();
    const typed = all.filter(row => state.type === 'all' || row.sources.some(source => `${source.category}:${source.type}` === state.type));
    const undated = typed.filter(row => !row.day).length;
    const invalid = !!((state.from && !this._validCalendarDay(state.from)) || (state.to && !this._validCalendarDay(state.to)) || (state.from && state.to && state.from > state.to));
    const rows = invalid ? [] : typed.filter(row => (!state.from && !state.to) || (row.day && (!state.from || row.day >= state.from) && (!state.to || row.day <= state.to)));
    const pages = Math.max(1, Math.ceil(rows.length / 15));
    state.page = Math.min(pages, Math.max(1, state.page));
    return { rows: rows.slice((state.page - 1) * 15, state.page * 15), total: rows.length, pages, page: state.page, undated, invalid, all };
  }

  _historyDetails(source) {
    const { category, entry } = source;
    const pl = this._lang === 'pl';
    const parts = [];
    if (entry.side) parts.push(({ left: this._t.sideLeft, right: this._t.sideRight, both: this._t.sideBoth })[_asText(entry.side)] || _asText(entry.side));
    if (Object.hasOwn(entry, 'duration')) parts.push(`${this._knownNumber(entry.duration) === null ? (pl ? 'Brak czasu' : 'Missing duration') : this._displayNumber(this._knownNumber(entry.duration))} ${category === 'bf_sessions' ? 's' : 'min'}`);
    if (Object.hasOwn(entry, 'amount')) {
      const amount = _asText(entry.amount);
      parts.push(amount === '' ? (pl ? 'Brak ilości' : 'Missing amount') : amount + (category === 'lactation' || (category === 'feeding' && source.type === 'bottle' && this._knownNumber(entry.amount) !== null) ? ' ml' : ''));
    }
    if (category === 'growth') parts.push(`${this._knownNumber(entry.value) === null ? (pl ? 'Brak wartości' : 'Missing value') : this._displayNumber(this._knownNumber(entry.value))} ${source.type === 'weight' ? 'kg' : ['height', 'headCirc'].includes(source.type) ? 'cm' : ''}`);
    if (category === 'sleep' && Object.hasOwn(entry, 'endTime')) {
      const end = this._historyInstant({ timestamp: entry.endTime });
      parts.push(`${pl ? 'Koniec' : 'End'}: ${end === null ? (pl ? 'Brak czasu' : 'Missing time') : new Intl.DateTimeFormat(this._t.locale, { timeZone: this._historyZone(), dateStyle: 'short', timeStyle: 'short' }).format(new Date(end))}`);
    }
    if (entry.notes) parts.push(_asText(entry.notes));
    return parts.join(' · ');
  }

  updateHistoryDisplay() {
    const results = this.shadowRoot.getElementById('historyResults');
    if (!results) return;
    const pl = this._lang === 'pl';
    const state = this._getHistoryState();
    const page = this._historyPage();
    const unavailable = this._backendDetectionFailed || this._backendDetecting || this._historyLoadFailed || this._backendLoading;
    const typeSelect = this.shadowRoot.getElementById('historyType');
    const types = new Map();
    page.all.forEach(row => row.sources.forEach(source => types.set(`${source.category}:${source.type}`, `${this._historyCategoryLabel(source.category)} — ${this._historyTypeLabel(source.category, source.type)}`)));
    // Keep a selected type visible after an empty response instead of silently
    // widening the user's filter. Stable options also keep the native popup.
    if (state.type !== 'all' && !types.has(state.type)) types.set(state.type, state.type);
    const options = `<option value="all">${pl ? 'Wszystkie typy' : 'All types'}</option>` + Array.from(types, ([value, label]) => `<option value="${_esc(value)}" ${value === state.type ? 'selected' : ''}>${_esc(label)}</option>`).join('');
    if (typeSelect._historyOptions !== options) { typeSelect.innerHTML = options; typeSelect._historyOptions = options; }
    typeSelect.value = state.type;
    const status = this.shadowRoot.getElementById('historyStatus');
    status.textContent = unavailable ? (this._backendLoading ? (pl ? 'Wczytywanie zapisanych wpisów…' : 'Loading saved records…') : (pl ? 'Nie potwierdzono odczytu historii.' : 'History read is unconfirmed.'))
      : page.invalid ? (pl ? 'Dzień od nie może być po dniu do. Sprawdź zakres dat.' : 'From day cannot be after to day. Check the date range.')
      : `${pl ? 'Wpisy' : 'Entries'}: ${page.total}. ${pl ? 'Nieznana data' : 'Unknown date'}: ${page.undated}${state.from || state.to ? (pl ? ' — poza filtrem dat.' : ' — excluded by date filter.') : '.'}`;
    this.shadowRoot.getElementById('historyPageInfo').textContent = unavailable ? '—' : `${page.page} / ${page.pages}`;
    for (const [id, disabled] of [['historyNewest', page.page === 1], ['historyNewer', page.page === 1], ['historyOlder', page.page === page.pages]]) {
      const button = this.shadowRoot.getElementById(id);
      button.disabled = !!(unavailable || page.invalid || disabled);
      // When a page boundary disables the clicked control, move focus to its
      // enabled counterpart; never leave it lost on the shadow root/body.
      if (button.disabled && this.shadowRoot.activeElement === button && !unavailable && !page.invalid && page.pages > 1) {
        const fallback = this.shadowRoot.getElementById(id === 'historyOlder' ? 'historyNewer' : 'historyOlder');
        fallback.disabled = false; fallback.focus({ preventScroll: true });
      }
    }
    results.innerHTML = unavailable ? '' : page.rows.length ? page.rows.map(row => {
      const time = row.instant === null ? _asText(row.sources[0].entry.time) : new Intl.DateTimeFormat(this._t.locale, { timeZone: this._historyZone(), hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(new Date(row.instant));
      return `<article class="history-record" data-history-row="${_esc(row.key)}"><div>${_esc(row.day || (pl ? 'Nieznana data' : 'Unknown date'))}${time ? ` · ${_esc(time)}` : ''}</div>${row.sources.map(source => `<p><strong>${_esc(this._historyCategoryLabel(source.category))} — ${_esc(this._historyTypeLabel(source.category, source.type))}</strong><br>${_esc(this._historyDetails(source))}</p>`).join('')}</article>`;
    }).join('') : `<p>${pl ? 'Brak wpisów w wybranym zakresie.' : 'No entries in the selected range.'}</p>`;
  }

  _attachHistoryListeners() {
    for (const [id, field] of [['historyFrom', 'from'], ['historyTo', 'to'], ['historyType', 'type']]) {
      this.shadowRoot.getElementById(id)?.addEventListener('change', event => {
        const state = this._getHistoryState(); state[field] = event.target.value; state.page = 1;
        this.updateHistoryDisplay();
      });
    }
    for (const [id, delta] of [['historyOlder', 1], ['historyNewer', -1], ['historyNewest', 0]]) {
      this.shadowRoot.getElementById(id)?.addEventListener('click', () => {
        const state = this._getHistoryState(); state.page = delta ? state.page + delta : 1;
        this.updateHistoryDisplay();
      });
    }
    this.shadowRoot.getElementById('historyReset')?.addEventListener('click', () => {
      const state = this._getHistoryState(); Object.assign(state, { from: '', to: '', type: 'all', page: 1 });
      this.shadowRoot.getElementById('historyFrom').value = '';
      this.shadowRoot.getElementById('historyTo').value = '';
      this.updateHistoryDisplay();
    });
  }

  _localDateTimeInput(date) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  _entryLocalDay(entry, timeZone = null) {
    // Prefer the actual event instant over legacy UTC date labels. A clock
    // value alone has no known day and must not count as today's record.
    for (const value of [entry.startTime, entry.timestamp, entry.ts]) {
      if (value === null || value === undefined || value === '') continue;
      if (typeof value !== 'number' && typeof value !== 'string') continue;
      // Match model._normalize_epoch_ms for older/imported epoch seconds.
      // Normalize only the read view; preserve the original stored record.
      const epoch = typeof value === 'number' ? Math.trunc(value) : value;
      const instant = new Date(typeof epoch === 'number' && epoch < 10_000_000_000 ? epoch * 1000 : epoch);
      if (Number.isFinite(instant.getTime())) {
        if (timeZone) {
          try {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
            const part = type => parts.find(item => item.type === type)?.value;
            return `${part('year')}-${part('month')}-${part('day')}`;
          } catch (_) { /* An invalid HA zone falls back to the existing browser day. */ }
        }
        return this._localDateTimeInput(instant).slice(0, 10);
      }
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '') ? entry.date : null;
  }

  setDefaultTimes() {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateTimeString = this._localDateTimeInput(now);
    const dateString = dateTimeString.slice(0, 10);

    const ft = this.shadowRoot.getElementById('feedingTime');
    const dt = this.shadowRoot.getElementById('diapersTime');
    const sd = this.shadowRoot.getElementById('sleepDate');
    const gd = this.shadowRoot.getElementById('growthDate');
    const sft = this.shadowRoot.getElementById('sleepFromTime');
    const stt = this.shadowRoot.getElementById('sleepToTime');

    if (ft) ft.value = timeString;
    if (dt) dt.value = timeString;
    if (sd) sd.value = dateString;
    if (gd) gd.value = dateString;
    if (sft && !sft.value) sft.value = dateTimeString;
    if (stt && !stt.value) {
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      let endInput = this._localDateTimeInput(oneHourLater);
      // datetime-local cannot encode the repeated-hour offset: choose a later wall time.
      if (endInput <= dateTimeString) {
        oneHourLater.setHours(now.getHours() + 1);
        endInput = this._localDateTimeInput(oneHourLater);
      }
      stt.value = endInput;
    }
  }

  getCurrentBaby() {
    const baby = this.babies[this.selectedBaby];
    return this._backendAvailable ? baby.entry_id : baby.name;
  }

  async addFeeding() {
    const type = this.shadowRoot.getElementById('feedingType').value;
    const time = this.shadowRoot.getElementById('feedingTime').value;
    const amount = this.shadowRoot.getElementById('feedingAmount').value;
    const notes = this.shadowRoot.getElementById('feedingNotes').value;

    if (!time || !amount) {
      alert(this._lang === 'pl' ? 'Wypełnij czas i ilość/czas trwania' : 'Please fill in time and duration/amount');
      return;
    }

    const baby = this.getCurrentBaby();
    const ts = Date.now();
    const feeding = { type, time, amount, notes, timestamp: ts };

    const entries = [{ category: 'feeding', entry: feeding }];

    // Auto-link breast feeding to lactation
    if (type === 'breast') {
      const linkId = 'link_' + ts;
      feeding.linkedId = linkId;
      // Parse duration from amount field (e.g. "15 min" -> 15)
      const durMatch = amount.match(/(\d+)\s*min/i);
      const duration = durMatch ? parseInt(durMatch[1]) : parseInt(amount) || 0;
      const lactEntry = {
        type: 'breastfeed',
        time,
        side: 'both',
        duration,
        amount: 0,
        notes: (this._lang === 'pl' ? 'Auto z karmienia' : 'Auto from feeding') + (notes ? ' — ' + notes : ''),
        date: new Date().toISOString().slice(0,10),
        ts,
        linkedId: linkId
      };
      entries.push({ category: 'lactation', entry: lactEntry });
    }

    if (!await this._saveEntries(entries) || baby !== this.getCurrentBaby()) return;

    this.clearFeedingForm();
    this.updateAllDisplays();
  }

  clearFeedingForm() {
    const _ft = this.shadowRoot.getElementById('feedingType');
    const _fa = this.shadowRoot.getElementById('feedingAmount');
    const _fn = this.shadowRoot.getElementById('feedingNotes');
    if (_ft) _ft.value = 'breast';
    if (_fa) _fa.value = '';
    if (_fn) _fn.value = '';
    this.setDefaultTimes();
  }

  async addDiapers() {
    const type = this.shadowRoot.getElementById('diapersType').value;
    const time = this.shadowRoot.getElementById('diapersTime').value;
    const notes = this.shadowRoot.getElementById('diapersNotes').value;

    if (!time) {
      alert(this._lang === 'pl' ? 'Wybierz czas' : 'Please select a time');
      return;
    }

    const baby = this.getCurrentBaby();
    const diaper = { type, time, notes, timestamp: Date.now() };
    if (!await this._saveEntries([{ category: 'diapers', entry: diaper }]) || baby !== this.getCurrentBaby()) return;

    this.clearDiapersForm();
    this.updateAllDisplays();
  }

  clearDiapersForm() {
    const _dty = this.shadowRoot.getElementById('diapersType');
    const _dn = this.shadowRoot.getElementById('diapersNotes');
    if (_dty) _dty.value = 'wet';
    if (_dn) _dn.value = '';
    this.setDefaultTimes();
  }

  async startSleepTimer() {
    if (this.sleepTimer) return;
    if (this._backendAvailable) return this._changeBackendTimer('sleep', 'start');
    this.sleepStartTime = Date.now();
    if (!this._saveData()) {
      this.sleepStartTime = null;
      this._showSaveError();
      return false;
    }
    this.sleepTimer = setInterval(() => this.updateSleepTimerDisplay(), 100);
    this._startAutoSave();
    const _ssb = this.shadowRoot.getElementById('startSleepBtn');
    const _stb = this.shadowRoot.getElementById('stopSleepBtn');
    if (_ssb) _ssb.style.display = 'none';
    if (_stb) _stb.style.display = 'block';
    this.updateSleepTimerDisplay();
  }

  async stopSleepTimer() {
    if (!this.sleepTimer) return;
    if (this._backendAvailable) return this._changeBackendTimer('sleep', 'stop');
    const baby = this.getCurrentBaby();
    const previous = this.sleepData.get(baby);
    const startTime = this.sleepStartTime;
    const sleepEndTime = Date.now();
    const durationMinutes = Math.round((sleepEndTime - this.sleepStartTime) / 60000);

    if (durationMinutes > 0) {
      const now = new Date();
      const sleep = {
        startTime: this.sleepStartTime,
        endTime: sleepEndTime,
        duration: durationMinutes,
        date: now.toISOString().split('T')[0],
        timestamp: Date.now()
      };
      this.sleepData.set(baby, [...(previous || []), sleep]);
    }
    this.sleepStartTime = null;
    if (!this._saveData()) {
      this.sleepStartTime = startTime;
      if (previous) this.sleepData.set(baby, previous);
      else this.sleepData.delete(baby);
      this._showSaveError();
      return false;
    }
    clearInterval(this.sleepTimer);
    this.sleepTimer = null;
    if (!this._bfTimer) this._stopAutoSave();
    if (durationMinutes > 0) this.updateAllDisplays();
    const _ssb = this.shadowRoot.getElementById('startSleepBtn');
    const _stb = this.shadowRoot.getElementById('stopSleepBtn');
    if (_ssb) _ssb.style.display = 'block';
    if (_stb) _stb.style.display = 'none';
    this.updateSleepTimerDisplay();
    return true;
  }

  async addManualSleep() {
    const sleepFromStr = this.shadowRoot.getElementById('sleepFromTime').value;
    const sleepToStr = this.shadowRoot.getElementById('sleepToTime').value;

    if (!sleepFromStr || !sleepToStr) {
      alert(this._lang === 'pl' ? 'Podaj oba czasy' : 'Please fill in both times');
      return;
    }

    const startTime = new Date(sleepFromStr).getTime();
    const endTime = new Date(sleepToStr).getTime();

    if (startTime >= endTime) {
      alert(this._lang === 'pl' ? 'Czas końca musi być po czasie startu' : 'End time must be after start time');
      return;
    }

    const baby = this.getCurrentBaby();
    const durationMinutes = Math.round((endTime - startTime) / 60000);
    const sleep = {
      startTime,
      endTime,
      duration: durationMinutes,
      date: new Date(startTime).toISOString().split('T')[0],
      timestamp: Date.now()
    };
    if (!await this._saveEntries([{ category: 'sleep', entry: sleep }]) || baby !== this.getCurrentBaby()) return;

    const _sft = this.shadowRoot.getElementById('sleepFromTime');
    const _stt = this.shadowRoot.getElementById('sleepToTime');
    if (_sft) _sft.value = '';
    if (_stt) _stt.value = '';
    this.updateAllDisplays();
  }

  async addGrowth() {
    const type = this.shadowRoot.getElementById('growthType').value;
    const value = parseFloat(this.shadowRoot.getElementById('growthValue').value);
    const date = this.shadowRoot.getElementById('growthDate').value;

    if (!value || !date) {
      alert(this._lang === 'pl' ? 'Wypełnij wartość i datę' : 'Please fill in value and date');
      return;
    }

    const baby = this.getCurrentBaby();
    const growth = { type, value, date, timestamp: Date.now() };
    if (!await this._saveEntries([{ category: 'growth', entry: growth }]) || baby !== this.getCurrentBaby()) return;

    this.clearGrowthForm();
    this.updateAllDisplays();
  }

  clearGrowthForm() {
    const _gv = this.shadowRoot.getElementById('growthValue');
    if (_gv) _gv.value = '';
    this.setDefaultTimes();
  }

  updateSleepTimerDisplay() {
    const active = Boolean(this.sleepTimer && this.sleepStartTime);
    const startButton = this.shadowRoot.getElementById('startSleepBtn');
    const stopButton = this.shadowRoot.getElementById('stopSleepBtn');
    if (startButton) startButton.style.display = active ? 'none' : 'block';
    if (stopButton) stopButton.style.display = active ? 'block' : 'none';
    if (!active) {
      const _std = this.shadowRoot.getElementById('sleepTimerDisplay');
      const _sts = this.shadowRoot.getElementById('sleepTimerStatus');
      if (_std) _std.textContent = '00:00:00';
      if (_sts) _sts.textContent = this._lang === 'pl' ? 'Sen nie jest aktywny' : 'Sleep not active';
      return;
    }

    const elapsed = Math.floor((Date.now() - this.sleepStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const _std2 = this.shadowRoot.getElementById('sleepTimerDisplay');
    if (_std2) _std2.textContent = display;
    const _sts2 = this.shadowRoot.getElementById('sleepTimerStatus');
    if (_sts2) _sts2.textContent = this._lang === 'pl' ? 'Sen w toku...' : 'Sleep in progress...';
  }

  async toggleBreastfeedingTimer(side) {
    if (this._bfTogglePending) return;
    this._bfTogglePending = true;
    const baby = this.getCurrentBaby();
    try {
      const stopOnly = this._bfCurrentSide === side && this._bfTimer;
      if (this._bfTimer && await this._stopBreastfeedingTimer() === false) return;
      if (!stopOnly && baby === this.getCurrentBaby()) await this._startBreastfeedingTimer(side);
      this.updateBreastfeedingDisplay();
    } finally {
      this._bfTogglePending = false;
    }
  }

  async _startBreastfeedingTimer(side) {
    if (this._backendAvailable) return this._changeBackendTimer('bf', 'start', side);
    if (this._bfTimer) return true;
    this._bfCurrentSide = side;
    this._bfStartTime = Date.now();
    if (!this._saveData()) {
      this._bfCurrentSide = null;
      this._bfStartTime = null;
      this._showSaveError();
      return false;
    }
    this._bfTimer = setInterval(() => this.updateBreastfeedingDisplay(), 100);
    this._startAutoSave();
    return true;
  }

  async _stopBreastfeedingTimer() {
    if (!this._bfTimer) return true;
    if (this._backendAvailable) return this._changeBackendTimer('bf', 'stop');
    const startTime = this._bfStartTime;
    const side = this._bfCurrentSide;
    const previous = this._bfSessions;
    const durationSeconds = Math.round((Date.now() - this._bfStartTime) / 1000);
    if (durationSeconds > 0) {
      this._bfSessions = [...previous, {
        side: this._bfCurrentSide,
        duration: durationSeconds,
        timestamp: Date.now()
      }];
    }
    this._bfCurrentSide = null;
    this._bfStartTime = null;
    if (!this._saveData()) {
      this._bfCurrentSide = side;
      this._bfStartTime = startTime;
      this._bfSessions = previous;
      this._showSaveError();
      return false;
    }
    clearInterval(this._bfTimer);
    this._bfTimer = null;
    if (!this.sleepTimer) this._stopAutoSave();
    return true;
  }

  updateBreastfeedingDisplay() {
    const _btd = this.shadowRoot.getElementById('bfTimerDisplay');
    const _btl = this.shadowRoot.getElementById('bfTimerLabel');

    if (!this._bfTimer || !this._bfStartTime) {
      if (_btd) _btd.textContent = '00:00';
      if (_btl) _btl.textContent = this._lang === 'pl' ? 'Gotowe' : 'Ready';
      this.updateBreastfeedingSessionsList();
      return;
    }

    const elapsed = Math.floor((Date.now() - this._bfStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (_btd) _btd.textContent = display;

    const sideLabel = this._bfCurrentSide === 'left'
      ? (this._lang === 'pl' ? 'Lewa pierś' : 'Left Breast')
      : (this._lang === 'pl' ? 'Prawa pierś' : 'Right Breast');
    if (_btl) _btl.textContent = sideLabel;

    this.updateBreastfeedingSessionsList();
  }

  updateBreastfeedingSessionsList() {
    const _bsl = this.shadowRoot.getElementById('bfSessionsList');
    if (!_bsl) return;

    // Update button styling
    const leftBtn = this.shadowRoot.querySelector('.bf-breast-btn[data-side="left"]');
    const rightBtn = this.shadowRoot.querySelector('.bf-breast-btn[data-side="right"]');
    if (leftBtn) {
      leftBtn.style.borderColor = this._bfCurrentSide === 'left' ? 'var(--bento-primary)' : 'var(--bento-border)';
      leftBtn.style.background = this._bfCurrentSide === 'left' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bento-card)';
    }
    if (rightBtn) {
      rightBtn.style.borderColor = this._bfCurrentSide === 'right' ? 'var(--bento-primary)' : 'var(--bento-border)';
      rightBtn.style.background = this._bfCurrentSide === 'right' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bento-card)';
    }

    if (!this._bfSessions || this._bfSessions.length === 0) {
      _bsl.innerHTML = '';
      return;
    }
    const recentSessions = this._bfSessions.slice(-3).reverse();
    _bsl.innerHTML = recentSessions.map(s => {
      const mins = Math.floor(s.duration / 60);
      const secs = s.duration % 60;
      const sideLabel = s.side === 'left'
        ? (this._lang === 'pl' ? 'Lewa' : 'Left')
        : (this._lang === 'pl' ? 'Prawa' : 'Right');
      return `<div style="padding:6px 0;border-top:1px solid var(--bento-border);font-size:11px">
        <strong>${sideLabel}</strong>: ${mins}m ${secs}s
      </div>`;
    }).join('');
  }

  updateAllDisplays() {
    this.updateFeedingList();
    this.updateLactationDisplay();
    this.updateDiapersList();
    this.updateSleepList();
    this.updateSleepTimerDisplay();
    this.updateBreastfeedingDisplay();
    this.updateGrowthChart();
    this.updateWeeklyStats();
    this.updateHistoryDisplay();
  }

  _recordTypeLabel(type) {
    const labels = { breast: 'Karmienie piersią', bottle: 'Butelka', solid: 'Pokarm stały', wet: 'Mokra', dirty: 'Brudna', both: 'Mokra i brudna', weight: 'Masa', height: 'Wzrost', headCirc: 'Obwód głowy' };
    return this._lang === 'pl' && Object.hasOwn(labels, type) ? labels[type] : type === 'headCirc' ? 'Head Circumference' : _titleCase(type);
  }

  updateFeedingList() {
    const listContainer = this.shadowRoot.getElementById('feedingList');
    if (!listContainer) return;
    const baby = this.getCurrentBaby();
    const feedings = this.feedingData.get(baby) || [];
    const icons = { breast: '🤱', bottle: '🍼', solid: '🥣' };

    if (feedings.length === 0) {
      listContainer.innerHTML = `<div class="empty-state"><div class="empty-state-text">${this._lang === 'pl' ? 'Brak zapisanych karmień' : 'No feedings logged yet'}</div></div>`;
      return;
    }

    listContainer.innerHTML = feedings.slice(-5).reverse().map(f => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${_esc(f.time)}</div>
          <div class="list-item-title">${icons[_asText(f.type)] || '•'} ${_esc(this._recordTypeLabel(f.type))}${_esc(f.linkedId) ? ' \uD83D\uDD17' : ''}</div>
          <div class="list-item-subtitle">${_esc(f.amount)}${f.notes ? ' • ' + _esc(f.notes) : ''}</div>
        </div>
      </div>
    `).join('');
  }

  updateDiapersList() {
    const baby = this.getCurrentBaby();
    const diapers = this.diapersData.get(baby) || [];
    const listContainer = this.shadowRoot.getElementById('diapersLis');
    if (!listContainer) return;
    const icons = { wet: '💧', dirty: '💩', both: '💧💩' };

    const today = this._localDateTimeInput(new Date()).slice(0, 10);
    const todayDiapers = diapers.filter(d => this._entryLocalDay(d) === today);

    const wetCount = todayDiapers.filter(d => d.type === 'wet' || d.type === 'both').length;
    const dirtyCount = todayDiapers.filter(d => d.type === 'dirty' || d.type === 'both').length;

    const _wc = this.shadowRoot.getElementById('wetCount');
    const _dc = this.shadowRoot.getElementById('dirtyCount');
    if (_wc) _wc.textContent = wetCount;
    if (_dc) _dc.textContent = dirtyCount;

    if (diapers.length === 0) {
      listContainer.innerHTML = `<div class="empty-state"><div class="empty-state-text">${this._lang === 'pl' ? 'Brak zapisanych zmian pieluch' : 'No diaper changes logged yet'}</div></div>`;
      return;
    }

    listContainer.innerHTML = diapers.slice(-5).reverse().map(d => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${_esc(d.time)}</div>
          <div class="list-item-title">${icons[_asText(d.type)] || '•'} ${_esc(this._recordTypeLabel(d.type))}</div>
          ${d.notes ? `<div class="list-item-subtitle">${_esc(d.notes)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  _sleepDurationLabel(value) {
    const minutes = this._knownNumber(value);
    return minutes === null ? (this._lang === 'pl' ? 'Brak czasu snu' : 'Missing duration')
      : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  updateSleepList() {
    const baby = this.getCurrentBaby();
    const sleeps = this.sleepData.get(baby) || [];
    const listContainer = this.shadowRoot.getElementById('sleepList');
    if (!listContainer) return;

    const today = this._localDateTimeInput(new Date()).slice(0, 10);
    const todaySleep = sleeps.filter(s => this._entryLocalDay(s) === today);
    const durations = todaySleep.map(s => this._knownNumber(s.duration));
    const known = durations.filter(value => value !== null);
    const missing = durations.length - known.length;
    const totalMinutes = known.reduce((sum, value) => sum + value, 0);
    const totalLabel = missing && !known.length ? '—' : this._sleepDurationLabel(totalMinutes);
    const _ts = this.shadowRoot.getElementById('totalSleep');
    if (_ts) _ts.textContent = totalLabel + (missing ? ` · ${this._lang === 'pl' ? 'Brak czasu snu' : 'Missing duration'}: ${missing}` : '');

    if (sleeps.length === 0) {
      listContainer.innerHTML = `<div class="empty-state"><div class="empty-state-text">${this._lang === 'pl' ? 'Brak zapisanych snów' : 'No sleep logged yet'}</div></div>`;
      return;
    }

    listContainer.innerHTML = sleeps.slice(-5).reverse().map(s => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${_esc(s.date)}</div>
          <div class="list-item-title">😴 ${this._lang === 'pl' ? 'Sen' : 'Sleep'}</div>
          <div class="list-item-subtitle">${_esc(this._sleepDurationLabel(s.duration))}</div>
        </div>
      </div>
    `).join('');
  }

  _validCalendarDay(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const date = new Date(`${day}T12:00:00`);
    return Number.isFinite(date.getTime()) && this._localDateTimeInput(date).slice(0, 10) === day ? day : null;
  }

  _knownNumber(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
    const number = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  _feedingVolume(entry) {
    // Duration, solid-food grams and auto-created breastfeed zero amounts are
    // not milk volumes. Bare numbers are supported for bottle imports only.
    if (typeof entry.amount === 'string') {
      const match = entry.amount.trim().match(/^(\d+(?:[.,]\d+)?)\s*ml$/i);
      if (match) return this._knownNumber(match[1]);
    }
    if (entry.type === 'bottle') return this._knownNumber(entry.amount);
    return null;
  }

  _weeklySummary(offset = 0, now = new Date()) {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7 + (offset === -1 ? -7 : 0));
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    const start = this._localDateTimeInput(monday).slice(0, 10);
    const end = this._localDateTimeInput(sunday).slice(0, 10);
    const baby = this.getCurrentBaby();
    const result = { start, end, undated: 0,
      feeding: { count: 0, volumeMl: null, unknownVolume: 0 },
      diapers: { count: 0, wet: 0, dirty: 0, unknownType: 0 },
      sleep: { count: 0, minutes: null, unknownDuration: 0 } };
    const inWeek = entry => {
      const day = this._validCalendarDay(this._entryLocalDay(entry));
      if (!day) { result.undated++; return false; }
      return day >= start && day <= end;
    };
    const feeding = this.feedingData.get(baby) || [];
    // Lactation breastfeed is a feeding too, but paired records count once.
    // Pump sessions are milk production, not the child's intake.
    const links = new Set(feeding.filter(entry => entry.linkedId).map(entry => entry.linkedId));
    const combined = [...feeding, ...(this.lactationData.get(baby) || []).filter(entry =>
      entry.type === 'breastfeed' && (!entry.linkedId || !links.has(entry.linkedId))),
      ...(this._bfSessions || []).map(entry => ({ ...entry, type: 'breastfeed' }))];
    const seen = new Set();
    combined.forEach(entry => {
      if (entry.linkedId && seen.has(entry.linkedId)) return;
      if (entry.linkedId) seen.add(entry.linkedId);
      if (!inWeek(entry)) return;
      result.feeding.count++;
      const volume = this._feedingVolume(entry);
      if (volume === null) result.feeding.unknownVolume++;
      else result.feeding.volumeMl = (result.feeding.volumeMl ?? 0) + volume;
    });
    (this.diapersData.get(baby) || []).forEach(entry => {
      if (!inWeek(entry)) return;
      result.diapers.count++;
      if (entry.type === 'wet' || entry.type === 'both') result.diapers.wet++;
      if (entry.type === 'dirty' || entry.type === 'both') result.diapers.dirty++;
      if (!['wet', 'dirty', 'both'].includes(entry.type)) result.diapers.unknownType++;
    });
    (this.sleepData.get(baby) || []).forEach(entry => {
      if (!inWeek(entry)) return;
      result.sleep.count++;
      const duration = this._knownNumber(entry.duration);
      if (duration === null) result.sleep.unknownDuration++;
      else result.sleep.minutes = (result.sleep.minutes ?? 0) + duration;
    });
    return result;
  }

  _displayNumber(value) {
    return value === null ? '—' : new Intl.NumberFormat(this._lang === 'pl' ? 'pl-PL' : 'en-GB', { maximumFractionDigits: 2 }).format(value);
  }

  _localZoneLabel() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || (this._lang === 'pl' ? 'czas lokalny przeglądarki' : 'browser local time');
  }

  _savedRecordsReadNoticeV3() {
    const pl = this._lang === 'pl';
    if (this._backendDetectionFailed || (this._backendAvailable && (this._historyLoadFailed
      || !this._backupBrowserOnlineV3 || !this._backupTransportOnlineV3
      || this._hass?.connection?.connected === false))) {
      return pl ? 'Niepotwierdzony — nie udało się wczytać zapisanych wpisów.' : 'Unconfirmed — saved records could not be loaded.';
    }
    return this._backendLoading ? (pl ? 'Wczytywanie zapisanych wpisów…' : 'Loading saved records…') : null;
  }

  updateWeeklyStats() {
    const container = this.shadowRoot.getElementById('weeklyStats');
    if (!container) return;
    const pl = this._lang === 'pl';
    const readNotice = this._savedRecordsReadNoticeV3();
    if (readNotice) {
      container.innerHTML = `<p role="status">${_esc(readNotice)}</p>`;
      return;
    }
    const s = this._weeklySummary(this._weeklyOffset);
    const cards = [
      [s.feeding.count, pl ? 'Zapisane karmienia' : 'Logged feedings'],
      [`${this._displayNumber(s.feeding.volumeMl)} ml`, pl ? 'Znana ilość mleka' : 'Known milk volume'],
      [s.diapers.wet, pl ? 'Mokre pieluchy' : 'Wet diapers'],
      [s.diapers.dirty, pl ? 'Brudne pieluchy' : 'Dirty diapers'],
      [`${this._displayNumber(s.sleep.minutes)} min`, pl ? 'Znany czas snu' : 'Known sleep duration'],
    ];
    container.innerHTML = `<p><strong>${_esc(s.start)} – ${_esc(s.end)}</strong></p>
      <div class="weekly-grid">${cards.map(([value, label]) => `<div class="stat-card"><div class="stat-value">${_esc(value)}</div><div class="stat-label">${_esc(label)}</div></div>`).join('')}</div>
      <p class="summary-note">${pl ? 'Źródło: zapisane wpisy wybranego dziecka. Tydzień pon.–niedz.; strefa' : 'Source: saved records for the selected child. Monday–Sunday; time zone'}: ${_esc(this._localZoneLabel())}.
      ${pl ? 'Brak ilości mleka' : 'Unknown milk volume'}: ${s.feeding.unknownVolume}; ${pl ? 'brak czasu snu' : 'unknown sleep duration'}: ${s.sleep.unknownDuration}; ${pl ? 'nieznany typ pieluchy' : 'unknown diaper type'}: ${s.diapers.unknownType}; ${pl ? 'wpisy bez daty (poza podsumowaniem)' : 'undated records (excluded)'}: ${s.undated}.
      ${pl ? '„—” oznacza brak znanej wartości. Pielucha mokra i brudna liczy się w obu kategoriach. Trwające timery nie są doliczane; sen przypisujemy do dnia rozpoczęcia.' : '“—” means no known value. A wet and dirty diaper counts in both categories. Running timers are excluded; sleep belongs to its start day.'}</p>`;
  }

  _growthSeries(type, now = new Date()) {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    const days = ['30', '90', '365'].includes(this._growthPeriod) ? Number(this._growthPeriod) : null;
    if (days) cutoff.setDate(cutoff.getDate() - days + 1);
    const first = this._localDateTimeInput(cutoff).slice(0, 10);
    const last = this._localDateTimeInput(now).slice(0, 10);
    return (this.growthData.get(this.getCurrentBaby()) || []).filter(entry => entry.type === type).map((entry, index) => ({
      // The explicit measurement date is authoritative. timestamp is when
      // the measurement was entered, which may be many days later.
      day: entry.date ? this._validCalendarDay(entry.date) : null,
      value: this._knownNumber(entry.value), index,
    })).filter(entry => !days || !entry.day || (entry.day >= first && entry.day <= last))
      .sort((a, b) => (a.day || '9999').localeCompare(b.day || '9999') || a.index - b.index);
  }

  _growthWidth() {
    const width = this.shadowRoot.getElementById('growthCharts')?.clientWidth;
    return width > 0 ? Math.max(220, Math.floor(width - 26)) : 360;
  }

  _growthGeometry(rows) {
    const known = rows.filter(row => row.day && row.value !== null);
    if (!known.length) return [];
    // Date-only values represent calendar days, so DST must not distort the x-axis.
    const dayNumber = day => Date.parse(`${day}T00:00:00Z`) / 86400000;
    const times = known.map(row => dayNumber(row.day));
    const minTime = Math.min(...times), maxTime = Math.max(...times);
    const values = known.map(row => row.value);
    const min = Math.min(...values), max = Math.max(...values);
    const pad = Math.max((max - min) * .1, Math.abs(max) * .03, .1);
    const width = this._growthWidth();
    return known.map(row => ({ ...row,
      x: minTime === maxTime ? (52 + width - 24) / 2 : 52 + (dayNumber(row.day) - minTime) / (maxTime - minTime) * (width - 76),
      axisMin: min - pad, axisMax: max + pad,
      y: 156 - (row.value - (min - pad)) / (max - min + 2 * pad) * 132,
    }));
  }

  updateGrowthChart() {
    const container = this.shadowRoot.getElementById('growthCharts');
    const previousFocus = container?.contains(this.shadowRoot.activeElement) ? this.shadowRoot.activeElement?.dataset?.growthPoint : null;
    const listContainer = this.shadowRoot.getElementById('growthList');
    if (!container || !listContainer) return;
    const readNotice = this._savedRecordsReadNoticeV3();
    if (readNotice) {
      container.innerHTML = `<p role="status">${_esc(readNotice)}</p>`;
      listContainer.innerHTML = '';
      return;
    }
    const pl = this._lang === 'pl';
    const missing = pl ? 'Brak wartości' : 'Missing value';
    const undated = pl ? 'Nieznana data' : 'Unknown date';
    const empty = pl ? 'Brak pomiarów w wybranym okresie' : 'No measurements in this period';
    container.innerHTML = ['weight', 'height'].map(type => {
      const rows = this._growthSeries(type);
      const points = this._growthGeometry(rows);
      const unit = type === 'weight' ? 'kg' : 'cm';
      const name = this._recordTypeLabel(type);
      const labels = points.map(point => point.day);
      const valueText = row => row.value === null ? missing : `${this._displayNumber(row.value)} ${unit}`;
      const detail = row => `${row.day || undated} · ${valueText(row)}`;
      const selected = this._growthSelection?.baby === this.getCurrentBaby() && this._growthSelection?.type === type
        ? points.find(point => point.index === this._growthSelection.index) : null;
      // Break the line at missing measurements instead of implying interpolation.
      let segment = false;
      const commands = [];
      rows.forEach(row => {
        const point = points.find(item => item.index === row.index);
        if (!point) { segment = false; return; }
        commands.push(`${segment ? 'L' : 'M'}${point.x},${point.y}`); segment = true;
      });
      return `<section class="growth-metric" data-growth-metric="${type}">
        <h3>${_esc(name)} (${unit})</h3>
        <p class="summary-note">${pl ? 'Data pomiaru; strefa' : 'Measurement date; time zone'}: ${_esc(this._localZoneLabel())}. ${pl ? 'Braki pozostają w tabeli; linia nie przechodzi przez brak wartości.' : 'Missing records stay in the table; lines break at missing values.'}</p>
        ${this._growthView === 'data' ? `<table class="growth-data"><caption>${_esc(name)} — ${rows.length} ${pl ? 'wpisów' : 'records'}</caption><thead><tr><th scope="col">${pl ? 'Data' : 'Date'}</th><th scope="col">${pl ? 'Wartość' : 'Value'} (${unit})</th></tr></thead><tbody>${rows.map(row => `<tr data-growth-row="${type}"><td>${_esc(row.day || undated)}</td><td>${_esc(valueText(row))}</td></tr>`).join('')}</tbody></table>${!rows.length ? `<p>${empty}</p>` : ''}` : `
          ${points.length ? `<div class="growth-axis-labels"><span>${pl ? 'Zakres wartości' : 'Value range'}: ${this._displayNumber(Math.min(...points.map(p => p.value)))}–${this._displayNumber(Math.max(...points.map(p => p.value)))} ${unit}</span></div>
          <svg class="growth-svg" viewBox="0 0 ${this._growthWidth()} 180" role="img" aria-label="${_esc(name)} (${unit}), ${_esc(labels[0])} – ${_esc(labels[labels.length - 1])}">
            <title>${_esc(name)} (${unit})</title>
            ${[0, 1, 2, 3, 4].map(tick => {
              const value = points[0].axisMin + tick / 4 * (points[0].axisMax - points[0].axisMin);
              const y = 156 - tick / 4 * 132;
              return `<path class="axis" d="M52,${y} H${this._growthWidth() - 24}" opacity=".7" fill="none"/><text data-growth-tick="${value}" x="44" y="${y}" text-anchor="end" dominant-baseline="middle" style="fill:var(--bento-text-secondary);font-size:14px">${this._displayNumber(value)}</text>`;
            }).join('')}
            <path class="axis" d="M52,12 V156 H${this._growthWidth() - 24}" fill="none"/>
            <path class="series" d="${commands.join(' ')}"/>
            ${points.map((point, i) => `<circle class="point" cx="${point.x}" cy="${point.y}" r="${selected?.index === point.index ? 6 : 4}" data-growth-svg-point="${type}:${i}"><title>${_esc(detail(point))}</title></circle>`).join('')}
          </svg><div class="growth-axis-labels"><span>${_esc(labels[0])}</span><span>${_esc(labels[labels.length - 1])}</span></div>
          <p class="summary-note">${pl ? 'Wybierz punkt poniżej, aby odczytać szczegóły.' : 'Choose a point below to read its details.'}</p>
          <div class="growth-points">${points.map((point, i) => `<button type="button" class="growth-point-button" data-growth-point="${type}:${i}" tabindex="${selected ? (selected.index === point.index ? 0 : -1) : (i === 0 ? 0 : -1)}" aria-pressed="${selected?.index === point.index}" aria-label="${_esc(name)}: ${_esc(detail(point))}">${_esc(valueText(point))}</button>`).join('')}</div>` : `<p class="summary-note">${empty}. ${pl ? 'Do wykresu potrzebna jest znana data i wartość.' : 'A chart needs a known date and value.'}</p>`}
          <p class="growth-detail" data-growth-detail="${type}" role="status" aria-live="polite">${selected ? _esc(detail(selected)) : ''}</p>
          <p class="summary-note">${pl ? 'Brak daty lub wartości' : 'Missing date or value'}: ${rows.filter(row => !row.day || row.value === null).length}</p>`}
      </section>`;
    }).join('');
    const selectPoint = (key, focus = false) => {
      const [type, index] = key.split(':');
      const point = this._growthGeometry(this._growthSeries(type))[Number(index)];
      if (!point) return;
      this._growthSelection = { baby: this.getCurrentBaby(), type, index: point.index };
      const unit = type === 'weight' ? 'kg' : 'cm';
      const detail = container.querySelector(`[data-growth-detail="${type}"]`);
      if (detail) detail.textContent = `${point.day} · ${this._displayNumber(point.value)} ${unit}`;
      container.querySelectorAll(`[data-growth-point^="${type}:"]`).forEach(button => {
        const current = button.dataset.growthPoint === key;
        button.setAttribute('aria-pressed', String(current)); button.tabIndex = current ? 0 : -1;
      });
      container.querySelectorAll(`[data-growth-svg-point^="${type}:"]`).forEach(circle => {
        circle.setAttribute('r', circle.dataset.growthSvgPoint === key ? '7' : '4');
      });
      if (focus) container.querySelector(`[data-growth-point="${key}"]`)?.focus();
    };
    container.querySelectorAll('[data-growth-point]').forEach(button => {
      button.addEventListener('focus', () => selectPoint(button.dataset.growthPoint));
      button.addEventListener('click', () => selectPoint(button.dataset.growthPoint));
      button.addEventListener('keydown', event => {
        const [type, index] = button.dataset.growthPoint.split(':');
        const count = this._growthGeometry(this._growthSeries(type)).length;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : Math.max(0, Math.min(count - 1, Number(index) + (event.key === 'ArrowRight' ? 1 : -1)));
          selectPoint(`${type}:${next}`, true);
        } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPoint(button.dataset.growthPoint); }
      });
    });
    // SVG taps and the native 44px buttons share exactly the same point details.
    container.querySelectorAll('svg.growth-svg').forEach(svg => svg.addEventListener('click', event => {
      const type = svg.closest('[data-growth-metric]').dataset.growthMetric;
      const points = this._growthGeometry(this._growthSeries(type));
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width * Number(svg.getAttribute('viewBox').split(' ')[2]);
      const y = (event.clientY - rect.top) / rect.height * 180;
      let nearest = 0;
      points.forEach((point, index) => {
        if (Math.hypot(point.x - x, point.y - y) < Math.hypot(points[nearest].x - x, points[nearest].y - y)) nearest = index;
      });
      selectPoint(`${type}:${nearest}`, true);
    }));
    if (typeof ResizeObserver === 'function' && this._growthObserved !== container) {
      this._growthResizeObserver?.disconnect();
      this._growthObserved = container;
      this._growthMeasuredWidth = container.clientWidth;
      this._growthResizeObserver = new ResizeObserver(entries => {
        const width = entries[0]?.contentRect.width;
        if (width > 0 && Math.abs(width - this._growthMeasuredWidth) > 1) {
          this._growthMeasuredWidth = width;
          this.updateGrowthChart();
        }
      });
      this._growthResizeObserver.observe(container);
    }
    if (previousFocus && this._growthSelection?.baby === this.getCurrentBaby()) {
      const type = previousFocus.split(':')[0];
      const index = this._growthGeometry(this._growthSeries(type)).findIndex(point => point.index === this._growthSelection.index);
      if (index >= 0) container.querySelector(`[data-growth-point="${type}:${index}"]`)?.focus({ preventScroll: true });
    }
    const growths = this.growthData.get(this.getCurrentBaby()) || [];
    const icons = { weight: '⚖️', height: '📏', headCirc: '🎯' };
    listContainer.innerHTML = growths.length ? growths.slice(-10).reverse().map(g => `
      <div class="list-item"><div class="list-item-content">
        <div class="list-item-time">${_esc(this._validCalendarDay(g.date) || undated)}</div>
        <div class="list-item-title">${icons[_asText(g.type)] || '•'} ${_esc(this._recordTypeLabel(g.type))}</div>
        <div class="list-item-subtitle">${this._knownNumber(g.value) === null ? missing : _esc(this._displayNumber(this._knownNumber(g.value)))} ${g.type === 'weight' ? 'kg' : 'cm'}</div>
      </div></div>`).join('') : `<div class="empty-state"><div class="empty-state-text">${empty}</div></div>`;
  }

  // --- Custom Sentences Config ---
  _getAvailableSentenceGroups() {
    return [
      { id: 'feeding', icon: '\uD83C\uDF7C', labelPl: 'Karmienie', labelEn: 'Feeding' },
      { id: 'diapers', icon: '\uD83E\uDE77', labelPl: 'Pieluchy', labelEn: 'Diapers' },
      { id: 'sleep', icon: '\uD83D\uDE34', labelPl: 'Sen', labelEn: 'Sleep' },
      { id: 'growth', icon: '\uD83D\uDCCF', labelPl: 'Wzrost/Waga', labelEn: 'Growth' }
    ];
  }

  _renderLangOptions() {
    const sysLang = this._lang || 'en';
    const first = sysLang === 'pl' ? 'pl' : 'en';
    const second = first === 'pl' ? 'en' : 'pl';
    const sel = this._sentenceLang || first;
    const label = (l) => l === 'pl' ? 'Polski (PL)' : 'English (EN)';
    return '<option value="' + first + '"' + (sel === first ? ' selected' : '') + '>' + label(first) + '</option>' +
           '<option value="' + second + '"' + (sel === second ? ' selected' : '') + '>' + label(second) + '</option>';
  }

  _renderSentenceCheckboxes() {
    const groups = this._getAvailableSentenceGroups();
    const selected = this._selectedSentenceGroups || ['feeding','diapers','sleep','growth'];
    return groups.map(g => {
      const checked = selected.includes(g.id) ? ' checked' : '';
      const label = this._lang === 'pl' ? g.labelPl : g.labelEn;
      return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bento-text,#1e293b);cursor:pointer;padding:6px 8px;border-radius:6px;border:1px solid var(--bento-border,#e2e8f0);background:var(--bento-card,#fff)">' +
        '<input type="checkbox" class="sentence-group-cb" value="' + g.id + '"' + checked + ' style="accent-color:var(--bento-primary,#3B82F6)">' +
        '<span>' + g.icon + ' ' + label + '</span></label>';
    }).join('');
  }

  _generateSentencesYaml(lang, groups) {
    const sentences = {
      pl: {
        feeding: {
          intent: 'BabyFeedLog',
          sentences: [
            'zapisz karmienie {amount} ml',
            'karmienie butelk\u0105 {amount} ml',
            'karmienie piersi\u0105 {duration} minut',
            'nakarmiono {amount} mililitr\u00F3w',
            'baby jad\u0142o {amount} ml',
            'karmienie {type} {amount}',
            'dodaj karmienie'
          ],
          slots: { amount: { from: 10, to: 500, step: 10 }, duration: { from: 1, to: 60 }, type: ['butelka', 'pier\u015B', 'pokarm sta\u0142y'] }
        },
        diapers: {
          intent: 'BabyDiaperLog',
          sentences: [
            'zmiana pieluchy {type}',
            'pielucha {type}',
            'zapisz pieluch\u0119 {type}',
            'brudna pielucha',
            'mokra pielucha',
            'zmiana pieluchy'
          ],
          slots: { type: ['mokra', 'brudna', 'mieszana'] }
        },
        sleep: {
          intent: 'BabySleepLog',
          sentences: [
            'baby \u015Bpi',
            'zacznij sen',
            'baby zasn\u0119\u0142o',
            'koniec snu',
            'baby si\u0119 obudzi\u0142o',
            'sen {duration} minut',
            'drzemka {duration} minut',
            'zapisz sen {duration} minut'
          ],
          slots: { duration: { from: 5, to: 360 } }
        },
        growth: {
          intent: 'BabyGrowthLog',
          sentences: [
            'waga baby {weight} kg',
            'wzrost baby {height} cm',
            'zapisz wag\u0119 {weight} kilogram\u00F3w',
            'zapisz wzrost {height} centymetr\u00F3w',
            'baby wa\u017Cy {weight} kg',
            'baby mierzy {height} cm'
          ],
          slots: { weight: { from: 1, to: 30, step: 0.1 }, height: { from: 30, to: 150, step: 0.5 } }
        }
      },
      en: {
        feeding: {
          intent: 'BabyFeedLog',
          sentences: [
            'log feeding {amount} ml',
            'bottle feeding {amount} ml',
            'breast feeding {duration} minutes',
            'fed {amount} milliliters',
            'baby ate {amount} ml',
            'feeding {type} {amount}',
            'add feeding'
          ],
          slots: { amount: { from: 10, to: 500, step: 10 }, duration: { from: 1, to: 60 }, type: ['bottle', 'breast', 'solid'] }
        },
        diapers: {
          intent: 'BabyDiaperLog',
          sentences: [
            'diaper change {type}',
            '{type} diaper',
            'log diaper {type}',
            'dirty diaper',
            'wet diaper',
            'diaper change'
          ],
          slots: { type: ['wet', 'dirty', 'mixed'] }
        },
        sleep: {
          intent: 'BabySleepLog',
          sentences: [
            'baby is sleeping',
            'start sleep',
            'baby fell asleep',
            'stop sleep',
            'baby woke up',
            'sleep {duration} minutes',
            'nap {duration} minutes',
            'log sleep {duration} minutes'
          ],
          slots: { duration: { from: 5, to: 360 } }
        },
        growth: {
          intent: 'BabyGrowthLog',
          sentences: [
            'baby weighs {weight} kg',
            'baby height {height} cm',
            'log weight {weight} kilograms',
            'log height {height} centimeters',
            'weight {weight} kg',
            'height {height} cm'
          ],
          slots: { weight: { from: 1, to: 30, step: 0.1 }, height: { from: 30, to: 150, step: 0.5 } }
        }
      }
    };

    const langData = sentences[lang] || sentences.en;
    let yaml = `language: "${lang}"\nintents:\n`;

    for (const groupId of groups) {
      const group = langData[groupId];
      if (!group) continue;
      yaml += `  ${group.intent}:\n    data:\n      - sentences:\n`;
      for (const s of group.sentences) {
        yaml += `          - "${s}"\n`;
      }
      // Slots
      if (group.slots && Object.keys(group.slots).length > 0) {
        yaml += `        slots:\n`;
        for (const [slotName, slotDef] of Object.entries(group.slots)) {
          if (Array.isArray(slotDef)) {
            yaml += `          ${slotName}:\n            values:\n`;
            for (const v of slotDef) {
              yaml += `              - "${v}"\n`;
            }
          } else {
            yaml += `          ${slotName}:\n            range:\n              from: ${slotDef.from}\n              to: ${slotDef.to}${slotDef.step ? `\n              step: ${slotDef.step}` : ''}\n`;
          }
        }
      }
    }

    // Add response templates
    yaml += `\n# Response templates (${lang === 'pl' ? 'odpowiedzi Assist' : 'Assist responses'})\n`;
    if (lang === 'pl') {
      yaml += `# Dodaj do intents.yaml lub intent_script:\n`;
      for (const groupId of groups) {
        const group = langData[groupId];
        if (!group) continue;
        yaml += `# ${group.intent}: "OK, zapisano."\n`;
      }
    } else {
      yaml += `# Add to intents.yaml or intent_script:\n`;
      for (const groupId of groups) {
        const group = langData[groupId];
        if (!group) continue;
        yaml += `# ${group.intent}: "OK, logged."\n`;
      }
    }

    return yaml;
  }

  _listenBackupConnectionV3(connection) {
    if (connection === this._backupConnectionV3) return;
    for (const type of ['ready', 'disconnected']) this._backupConnectionV3?.removeEventListener?.(type, this._backupHandlersV3[type]);
    this._backupConnectionV3 = connection || null;
    this._backupTransportOnlineV3 = connection?.connected !== false;
    for (const type of ['ready', 'disconnected']) connection?.addEventListener?.(type, this._backupHandlersV3[type]);
  }

  _backupLocalInputV3() {
    return { feeding: Object.fromEntries(this.feedingData), lactation: Object.fromEntries(this.lactationData),
      diapers: Object.fromEntries(this.diapersData), sleep: Object.fromEntries(this.sleepData), growth: Object.fromEntries(this.growthData),
      breastfeeding: this._bfSessions || [], _runningTimers: {
        sleep: this.sleepStartTime ? { startTime: this.sleepStartTime, baby: this.selectedBaby } : null,
        bf: this._bfStartTime ? { startTime: this._bfStartTime, side: this._bfCurrentSide, sessions: this._bfSessions || [] } : null } };
  }

  _backupLegacyInputV3() {
    const records = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (/^ha-tools-baby-tracker-\d+$/.test(key)) records.push([key, localStorage.getItem(key)]);
    }
    return records.sort(([a], [b]) => a.localeCompare(b));
  }

  _syncBackupContextV3(notify = true) {
    if (!this._backupDialogV3) return;
    const h = this._hass;
    let fingerprint;
    try { fingerprint = JSON.stringify([this.babies, this._backupLocalInputV3(), this._backupLegacyInputV3()]); }
    catch { fingerprint = null; }
    const parts = [h?.connection, h?.user?.id, h?.user?.is_admin, this.selectedBaby, this._lang,
      this._backendAvailable, this._backendChecked, this._backendDetecting, this._backendDetectionFailed,
      this._backendLoadSequence, this._backendLoading, this._historyLoadFailed, fingerprint,
      navigator.onLine, this._backupBrowserOnlineV3, this._backupTransportOnlineV3,
      h?.connection?.connected, h?.connection?.socket?.readyState, this.isConnected];
    if (!this._backupPartsV3 || parts.some((value, i) => value !== this._backupPartsV3[i])) {
      this._backupPartsV3 = parts; this._backupRevisionV3++;
      if (notify) this._backupDialogV3.contextChanged();
    }
  }

  _backupContextV3() {
    this._syncBackupContextV3(false);
    const h = this._hass;
    return { role: h?.user?.is_admin === true ? 'admin' : 'household', userId: h?.user?.id || 'unknown',
      connectionId: 'baby-local-session', datasetId: this._backendAvailable ? 'all-server-children-and-local-records' : 'legacy-local-records',
      revision: this._backupRevisionV3,
      connected: this.isConnected && !!h && navigator.onLine !== false && this._backupBrowserOnlineV3
        && this._backupTransportOnlineV3 && h.connection?.connected !== false && h.connection?.socket?.readyState !== 3,
      // The Baby integration grants read access to authenticated household users.
      canExport: !!h?.user?.id,
      sourceConfirmed: this._backendChecked === true && !this._backendDetecting && !this._backendDetectionFailed
        && !this._backendLoading && this._backupPartsV3?.[12] !== null };
  }

  async _buildBackupPreviewV3({ draft, context, signal }) {
    const h = this._hass, local = this._backupLocalInputV3(), legacy = this._backupLegacyInputV3();
    const categories = ['feeding', 'lactation', 'diapers', 'sleep', 'growth', 'bf_sessions'];
    const active = () => !signal.aborted && context.revision === this._backupContextV3().revision;
    let children = [];
    if (this._backendAvailable) {
      const result = await h.callWS({ type: 'ha_baby_tracker/list_children' });
      if (!active()) return { status: 'no_data' };
      if (!Array.isArray(result?.children) || result.children.some(c => !c || typeof c.entry_id !== 'string' || !c.entry_id)
        || new Set(result.children.map(c => c.entry_id)).size !== result.children.length) throw Error('Unconfirmed children');
      children = await Promise.all(result.children.map(async child => {
        const replies = await Promise.all(categories.map(category => h.callWS({ type: 'ha_baby_tracker/get_data', entry_id: child.entry_id, category })));
        if (!active()) throw Error('Source changed');
        const data = {};
        for (let i = 0; i < replies.length; i++) {
          const reply = replies[i];
          if (reply?.entry_id !== child.entry_id || reply.category !== categories[i] || !Array.isArray(reply.data)
            || !reply.running_timers || typeof reply.running_timers !== 'object') throw Error('Unconfirmed category');
          data[reply.category] = reply.data;
        }
        // Timers can change during these reads; never claim a coherent snapshot then.
        if (replies.some(reply => JSON.stringify(reply.running_timers) !== JSON.stringify(replies[0].running_timers))) throw Error('Timers changed');
        return { entry_id: child.entry_id, name: child.name, date_of_birth: child.date_of_birth, data, running_timers: replies[0].running_timers };
      }));
    }
    if (!active()) return { status: 'no_data' };
    const pl = this._lang === 'pl', identities = new Map(), records = new Map();
    const alias = (map, key, prefix) => { if (!map.has(key)) map.set(key, prefix + (map.size + 1)); return map.get(key); };
    const identity = value => draft.includePrivate ? String(value ?? '') : alias(identities, String(value ?? ''), 'Child ');
    const numeric = value => typeof value === 'number' && Number.isFinite(value);
    const day = value => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const time = Date.parse(value + 'T00:00:00Z');
      return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : null;
    };
    const record = input => {
      const out = {};
      if (!input || typeof input !== 'object' || Array.isArray(input)) return { invalid: true };
      for (const key of ['timestamp', 'ts', 'startTime', 'endTime', 'duration', 'value']) if (Object.hasOwn(input, key)) out[key] = numeric(input[key]) ? input[key] : null;
      if (Object.hasOwn(input, 'amount')) out.amount = numeric(input.amount) || (typeof input.amount === 'string' && /^\d+(?:[.,]\d+)?(?:\s*(?:ml|g|kg|cm|min|s|oz))?$/.test(input.amount)) ? input.amount : null;
      if (Object.hasOwn(input, 'date')) out.date = day(input.date);
      if (Object.hasOwn(input, 'time')) out.time = typeof input.time === 'string' && /^\d{2}:\d{2}(?::\d{2})?$/.test(input.time) ? input.time : null;
      if (Object.hasOwn(input, 'type')) out.type = ['bottle','breast','solid','breastfeed','pump','manual','supplement','wet','dirty','both','mixed','sleep','weight','height','headCirc'].includes(input.type) ? input.type : 'unknown';
      if (Object.hasOwn(input, 'side')) out.side = ['left','right','both'].includes(input.side) ? input.side : null;
      // Preserve links between related entries without arbitrary identifier strings.
      for (const key of ['id','linkedId']) if (typeof input[key] === 'string' || numeric(input[key])) out[key] = alias(records, String(input[key]), 'Record ');
      return out;
    };
    const entries = list => Array.isArray(list) ? list.map(record) : [];
    const timers = value => ({ sleep: value?.sleep ? { startTime: numeric(value.sleep.startTime) ? value.sleep.startTime : null,
      ...(Number.isInteger(value.sleep.baby) && value.sleep.baby >= 0 ? { baby: value.sleep.baby } : {}) } : null,
      bf: value?.bf ? { startTime: numeric(value.bf.startTime) ? value.bf.startTime : null,
        side: ['left','right','both'].includes(value.bf.side) ? value.bf.side : null, sessions: entries(value.bf.sessions) } : null });
    const localProjection = input => {
      const out = {};
      for (const category of categories.slice(0,5)) out[category] = Object.fromEntries(Object.entries(input?.[category] || {}).map(([name, list]) => [identity(name), entries(list)]));
      out.breastfeeding = entries(input?.breastfeeding || input?.bf_sessions); out._runningTimers = timers(input?._runningTimers);
      return out;
    };
    const included = [pl ? 'Wszystkie odczytane dzieci, sześć kategorii wpisów i aktywne timery' : 'All successfully read children, six record categories and running timers',
      pl ? 'Bieżące dane lokalne i odczytywalne starsze zapisy tego narzędzia' : 'Current local data and readable older records from this tool'];
    if (draft.includePrivate) included.push(pl ? 'Imiona i daty urodzenia dzieci — tylko ten eksport' : 'Child names and dates of birth — this export only');
    const excluded = [pl ? 'Notatki, dowolne teksty, identyfikatory HA, urządzeń i wpisów, surowa konfiguracja' : 'Notes, arbitrary text, HA/device/record identifiers and raw configuration',
      pl ? 'Tokeny, użytkownicy, adresy i nieodczytywalne surowe dane przeglądarki' : 'Tokens, users, addresses and unreadable raw browser data'];
    if (!draft.includePrivate) excluded.push(pl ? 'Imiona i daty urodzenia dzieci' : 'Child names and dates of birth');
    const payload = { schema: 'ha-baby-tracker-reviewed-export-v1', exportDate: new Date().toISOString(),
      status: 'success', included, excluded, children: children.map(child => ({ alias: alias(identities, child.entry_id, 'Child '),
        ...(draft.includePrivate ? { name: typeof child.name === 'string' ? child.name : '', date_of_birth: day(child.date_of_birth) } : {}),
        data: Object.fromEntries(categories.map(category => [category, entries(child.data[category])])), running_timers: timers(child.running_timers) })),
      local_children: this.babies.map((child, index) => ({ index,
        alias: alias(identities, this._backendAvailable ? child.entry_id : child.name, 'Child '),
        ...(draft.includePrivate ? { name: typeof child.name === 'string' ? child.name : '', date_of_birth: day(child.date_of_birth) } : {}) })),
      local_current_child: alias(identities, this.getCurrentBaby(), 'Child '),
      local: localProjection(local), legacy_storage: [], omitted_legacy: [] };
    for (const [key, raw] of legacy) {
      try {
        const value = JSON.parse(raw);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Unreadable');
        payload.legacy_storage.push({ source_index: Number(key.split('-').pop()), data: localProjection(value) });
      } catch { payload.omitted_legacy.push({ source_index: Number(key.split('-').pop()), reason: 'unreadable' }); }
    }
    payload.status = payload.omitted_legacy.length ? 'partial' : 'success';
    const sourceLimit = pl
      ? 'Dane pomiarów i dat pozostają wrażliwe także z aliasami. To eksport jawnych pól, nie kopia surowego magazynu. Nieodczytywalne starsze dane są oznaczone jako pominięte i pozostają bez zmian lokalnie. Brak wartości pozostaje null; źródło: ' + (this._backendAvailable ? 'HA i ta przeglądarka.' : 'ta przeglądarka.')
      : 'Measurements and dates remain sensitive even with aliases. This exports reviewed fields, not the raw store. Unreadable older data is listed as omitted and remains unchanged locally. Missing values stay null; source: ' + (this._backendAvailable ? 'HA and this browser.' : 'this browser.');
    payload.sourceLimit = sourceLimit;
    return { serialized: JSON.stringify(payload, null, 2) + '\n', status: payload.status, confirmed: true, sourceConfirmed: true, included, excluded, sourceLimit };
  }

  async exportData() {
    if (!this._backupDialogV3) this._backupDialogV3 = createExportDialog({
      root: this.shadowRoot, getLanguage: () => this._lang, getContext: () => this._backupContextV3(), createUiV3,
      policy: { id: 'baby-reviewed-records-v1', allowlistedFields: ['schema','exportDate','status','included','excluded','sourceLimit','children.alias','children.name','children.date_of_birth','children.data','children.running_timers','local_children','local_current_child','local','legacy_storage','omitted_legacy'],
        neverInclude: ['tokens','users','addresses','raw_config','notes','device_id','entry_id'] },
      formats: ['json'], defaultFormat: 'json', defaultFilename: 'baby-tracker.json',
      buildPayload: input => this._buildBackupPreviewV3(input),
      performDownload: ({ blob, filename, context, signal }) => {
        const current = this._backupContextV3();
        if (signal.aborted || !current.connected || !current.canExport || !current.sourceConfirmed
          || context.revision !== current.revision || context.userId !== current.userId) return { outcome: 'unknown' };
        const url = URL.createObjectURL(blob), anchor = this.ownerDocument.createElement('a');
        anchor.href = url; anchor.download = filename; anchor.rel = 'noopener';
        try { anchor.click(); } finally { URL.revokeObjectURL(url); }
        return { outcome: 'initiated' };
      }
    });
    const owner = this;
    this._backupDialogV3.open({ opener: { get isConnected() { return owner.isConnected; }, focus() { owner.shadowRoot.getElementById('exportBtn')?.focus({ preventScroll: true }); } } });
    const container = this.shadowRoot.querySelector('[data-ha-tools-export]');
    if (container) { const dark = this.classList.contains('bento-dark');
      container.style.setProperty('--card-background-color', getComputedStyle(this).getPropertyValue('--card-background-color').trim() || (dark ? '#1c1c1e' : '#fff'));
      container.style.setProperty('--primary-text-color', dark ? '#f5f5f5' : '#1e293b'); }
  }

  static getConfigElement() {
    return document.createElement('ha-baby-tracker-editor');
  }

  getCardSize() { return 8; }

  getGridOptions() { return { columns: 12, min_rows: 3, min_columns: 6 }; }

  static getStubConfig() {
    return {
      type: 'custom:ha-baby-tracker',
      title: 'Baby and Lactation Tracker',
      babies: [{ name: 'Baby 1' }]
    };
  }
  // --- Pagination helper ---
  _renderPagination(tabName, totalItems) {
    if (!this._currentPage[tabName]) this._currentPage[tabName] = 1;
    const pageSize = this._pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(this._currentPage[tabName], totalPages);
    this._currentPage[tabName] = page;
    return `
      <div class="pagination">
        <button class="pagination-btn" data-page-tab="${tabName}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>&#8249; Prev</button>
        <span class="pagination-info">${page} / ${totalPages} (${totalItems})</span>
        <button class="pagination-btn" data-page-tab="${tabName}" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next &#8250;</button>
        <select class="page-size-select" data-page-tab="${tabName}" data-action="page-size">
          ${[10,15,25,50].map(s => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}/page</option>`).join('')}
        </select>
      </div>`;
  }

  _paginateItems(items, tabName) {
    if (!this._currentPage[tabName]) this._currentPage[tabName] = 1;
    const start = (this._currentPage[tabName] - 1) * this._pageSize;
    return items.slice(start, start + this._pageSize);
  }

  _setupPaginationListeners() {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.pageTab;
        const page = parseInt(e.target.dataset.page);
        if (tab && page > 0) {
          this._currentPage[tab] = page;
          this._render ? this._render() : (this.render ? this.render() : this.renderCard());
        }
      });
    });
    this.shadowRoot.querySelectorAll('.page-size-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        this._pageSize = parseInt(e.target.value);
        // Reset all pages to 1
        Object.keys(this._currentPage).forEach(k => this._currentPage[k] = 1);
        this._render ? this._render() : (this.render ? this.render() : this.renderCard());
      });
    });

  }
  async addLactation() {
    const type = this.shadowRoot.getElementById('lactationType')?.value || 'pump';
    const time = this.shadowRoot.getElementById('lactationTime')?.value || new Date().toTimeString().slice(0,5);
    const side = this.shadowRoot.getElementById('lactationSide')?.value || 'both';
    const duration = parseInt(this.shadowRoot.getElementById('lactationDuration')?.value) || 0;
    const amount = parseInt(this.shadowRoot.getElementById('lactationAmount')?.value) || 0;
    const notes = this.shadowRoot.getElementById('lactationNotes')?.value || '';

    const currentBaby = this.getCurrentBaby();
    if (!this.lactationData.has(currentBaby)) this.lactationData.set(currentBaby, []);

    const ts = Date.now();
    const entry = { type, time, side, duration, amount, notes, date: new Date().toISOString().slice(0,10), ts };

    const entries = [{ category: 'lactation', entry }];

    // Auto-link breastfeed to feeding tab
    if (type === 'breastfeed') {
      const linkId = 'link_' + ts;
      entry.linkedId = linkId;
      if (!this.feedingData.has(currentBaby)) this.feedingData.set(currentBaby, []);
      const feedEntry = {
        type: 'breast',
        time,
        amount: duration ? duration + ' min' : '',
        notes: (this._lang === 'pl' ? 'Auto z laktacji' : 'Auto from lactation') + (notes ? ' \u2014 ' + notes : ''),
        timestamp: ts,
        linkedId: linkId
      };
      entries.push({ category: 'feeding', entry: feedEntry });
    }

    if (!await this._saveEntries(entries) || currentBaby !== this.getCurrentBaby()) return;
    this.clearLactationForm();
    this.updateLactationDisplay();
    this.updateHistoryDisplay();
    if (type === 'breastfeed') this.updateAllDisplays();
  }

  _showToast(message, type = 'error') {
    if (!this.shadowRoot) return;
    const toast = document.createElement('div');
    const ui = createUiV3({ language: this._lang });
    const isInfo = type === 'info';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      background: 'var(--bento-card, #fff)',
      border: '1px solid var(--bento-border, #cbd5e1)',
      color: 'var(--bento-text, #334155)',
      padding: '10px 18px',
      borderRadius: 'var(--bento-radius-sm, 12px)',
      fontSize: '0.85rem',
      fontWeight: '500',
      boxShadow: 'var(--bento-shadow-md, 0 4px 12px rgba(0,0,0,0.1))',
      maxWidth: '320px',
      textAlign: 'center',
      cursor: 'pointer',
      opacity: '0',
      transition: 'opacity 0.25s ease',
      pointerEvents: 'auto',
    });
    if (!isInfo) {
      if (!this.shadowRoot.getElementById('baby-toast-outcomes-v3')) {
        const style = document.createElement('style');
        style.id = 'baby-toast-outcomes-v3';
        style.textContent = ui.css;
        this.shadowRoot.appendChild(style);
      }
      // Only the fixed factory markup is HTML. User-facing detail stays text.
      toast.innerHTML = ui.statusHtml(type);
      toast.appendChild(document.createTextNode(' '));
    }
    toast.appendChild(document.createTextNode(message));
    toast.setAttribute('role', isInfo ? 'status' : 'alert');
    this.shadowRoot.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    const dismiss = () => {
      toast.style.opacity = '0';
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    };
    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, 3500);
  }

  clearLactationForm() {
    const sr = this.shadowRoot;
    if (sr.getElementById('lactationDuration')) sr.getElementById('lactationDuration').value = '';
    if (sr.getElementById('lactationAmount')) sr.getElementById('lactationAmount').value = '';
    if (sr.getElementById('lactationNotes')) sr.getElementById('lactationNotes').value = '';
  }

  updateLactationDisplay() {
    const currentBaby = this.getCurrentBaby();
    const entries = this.lactationData.get(currentBaby) || [];
    const today = this._localDateTimeInput(new Date()).slice(0, 10);
    const todayEntries = entries.filter(e => this._entryLocalDay(e) === today);

    const totalMl = todayEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const sessionCount = todayEntries.length;

    const totalEl = this.shadowRoot.getElementById('lactationTotalMl');
    if (totalEl) totalEl.textContent = totalMl;
    const countEl = this.shadowRoot.getElementById('lactationSessionCount');
    if (countEl) countEl.textContent = sessionCount;

    const listEl = this.shadowRoot.getElementById('lactationList');
    if (!listEl) return;

    const sideLabels = { left: this._t.sideLeft, right: this._t.sideRight, both: this._t.sideBoth };
    const typeLabels = { breastfeed: this._t.typeBreastfeed, pump: this._t.typePump, manual: this._t.typeManual, supplement: this._t.typeSupplement };

    listEl.innerHTML = entries.slice(0, 20).map(e => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--bento-border,#e2e8f0);font-size:13px">
        <div>
          <strong>${_esc(typeLabels[e.type] || e.type)}</strong>${_esc(e.linkedId) ? ' \uD83D\uDD17' : ''} — ${_esc(sideLabels[e.side] || e.side)}
          ${e.duration ? ` \u2022 ${_esc(e.duration)} min` : ''}
          ${e.amount ? ` \u2022 ${_esc(e.amount)} ml` : ''}
          <div style="font-size:11px;color:var(--bento-text-secondary,#64748b)">${_esc(e.notes || '')}</div>
        </div>
        <div style="font-size:12px;color:var(--bento-text-secondary,#64748b);white-space:nowrap">${_esc(e.time)}${e.date !== today ? ` ${_esc(e.date)}` : ''}</div>
      </div>
    `).join('') || `<div style="text-align:center;padding:20px;color:var(--bento-text-secondary)">${this._lang === 'pl' ? 'Brak wpisów' : 'No entries'}</div>`;
  }

  // --- Canvas size fix for Bento CSS ---
  _fixCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }

  connectedCallback() {
    for (const type of ['offline','online','storage']) window.addEventListener(type, this._backupHandlersV3[type]);
    this._backupBrowserOnlineV3 = navigator.onLine !== false;
    this._listenBackupConnectionV3(this._hass?.connection);
    if (this._backendReadNeedsRecoveryV3) this._queueBackendReadRecoveryV3();
    this._backendReadNeedsRecoveryV3 = false;
  }

  disconnectedCallback() {
    this._backendReadNeedsRecoveryV3 = this._backendAvailable;
    this._timerAuthorityEpochV3++;
    this._backupDialogV3?.destroy(); this._backupDialogV3 = null; this._backupPartsV3 = null;
    for (const type of ['offline','online','storage']) window.removeEventListener(type, this._backupHandlersV3[type]);
    this._listenBackupConnectionV3(null);
    _disconnectFamilyNavigation(this);
    this._familyNavWidth = null;
    this._babyFamilyRenderedContext = null;
    this._growthResizeObserver?.disconnect();
    this._growthObserved = null;
    if (this._backendUnsubEvents) { this._backendUnsubEvents(); this._backendUnsubEvents = null; }
    if (this._bfTimer) { clearInterval(this._bfTimer); this._bfTimer = null; }
    if (this.sleepTimer) { clearInterval(this.sleepTimer); this.sleepTimer = null; }
    if (this._autoSaveTimer) { clearInterval(this._autoSaveTimer); this._autoSaveTimer = null; }
  }

  setActiveTab(tabId) {
    this.selectedTab = tabId;
    this.renderCard();
  }
}

if (!customElements.get('ha-baby-tracker')) { customElements.define('ha-baby-tracker', HaBabyTracker); }
;

class HaBabyTrackerEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }
  setConfig(config) {
    this._config = { ...config };
    const title = this.shadowRoot.querySelector('#cf_title');
    if (title) {
      const value = this._config.title || 'Baby and Lactation Tracker';
      if (title.value !== value) title.value = value;
      return;
    }
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; min-height:44px; min-width:44px; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Baby and Lactation Tracker</h3>
            <div style="margin-bottom:12px;">
              <label for="cf_title" style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'Baby and Lactation Tracker')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
    `;
        const f_title = this.shadowRoot.querySelector('#cf_title');
        if (f_title) f_title.addEventListener('input', (e) => {
          this._config = { ...this._config, title: e.target.value };
          this._dispatch();
        });
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-baby-tracker-editor')) { customElements.define('ha-baby-tracker-editor', HaBabyTrackerEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-baby-tracker', name: 'Baby and Lactation Tracker', description: 'Track baby activities: feeding, lactation, sleep, diapers', preview: false });
