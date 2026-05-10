/* HA Tools split — ha-baby-tracker v4.0.0 (2026-05-10) — single-tool standalone repo */
(function() {
'use strict';

// XSS protection helper (reuse global from panel, fallback for standalone)
const _esc = window._haToolsEsc || ((s) => typeof s === 'string' ? s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) : (s ?? ''));

// -- HA Tools Persistence (stub -- full impl in ha-tools-panel.js) --
window._haToolsPersistence = window._haToolsPersistence || { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-baby-tracker-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-baby-tracker] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-baby-tracker-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-baby-tracker-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };


/* ===== HA Tools split — inline shared infrastructure ===== */
// Bento Design System CSS (inline copy — keeps tool standalone)
if (typeof window !== 'undefined' && !window.HAToolsBentoCSS) {
  window.HAToolsBentoCSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v1.0
   ═══════════════════════════════════════════════ */

/* ── CSS Custom Properties ───────────────────── */
:host {
  /* Primary palette */
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);

  /* Theme — maps to HA theme vars with light fallbacks */
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);

  /* Radii */
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;

  /* Shadows */
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);

  /* Transition */
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: block;
  color: var(--bento-text);
}

/* ── Dark mode ───────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :host {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-border: var(--divider-color, #2a2a4a);
    --bento-text: var(--primary-text-color, #e0e0e0);
    --bento-text-secondary: var(--secondary-text-color, #a0a0b0);
    --bento-text-muted: var(--disabled-text-color, #6a6a7a);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
    --bento-primary-light: rgba(59,130,246,0.15);
    --bento-success-light: rgba(16,185,129,0.15);
    --bento-error-light: rgba(239,68,68,0.15);
    --bento-warning-light: rgba(245,158,11,0.15);
    color-scheme: dark !important;
  }
  .card, .card-container, .main-card, .exporter-card, .security-card, .reports-card, .storage-card, .chore-card, .cry-card, .backup-card, .network-card, .sentence-card, .energy-card, .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
  input, select, textarea { background: var(--bento-bg); color: var(--bento-text); border-color: var(--bento-border); }
  .stat, .stat-card, .summary-card, .metric-card, .kpi-card, .health-card { background: var(--bento-bg); border-color: var(--bento-border); }
  .tab-content, .section { color: var(--bento-text); }
  table th { background: var(--bento-bg); color: var(--bento-text-secondary); border-color: var(--bento-border); }
  table td { color: var(--bento-text); border-color: var(--bento-border); }
  tr:hover td { background: rgba(59,130,246,0.08); }
  .empty-state, .no-data { color: var(--bento-text-secondary); }
  .schedule-section, .settings-section, .detail-panel, .details, .device-detail { background: var(--bento-bg); border-color: var(--bento-border); }
  .addon-list, .content-item { background: rgba(255,255,255,0.05); }
  .chart-container { background: var(--bento-bg); border-color: var(--bento-border); }
  pre, code { background: #1e293b !important; color: #e2e8f0 !important; }
}

/* ── Reset ───────────────────────────────────── */
* { box-sizing: border-box; }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-sm);
  color: var(--bento-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 16px 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-icon { font-size: 22px; }
.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-border);
  color: var(--bento-text-secondary);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  font-weight: 500;
}
.content { padding: 16px 20px 20px; }

/* ── Tabs (Bento unified) ────────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important;
  gap: 4px !important;
  border-bottom: 2px solid var(--bento-border, var(--divider-color, #334155)) !important;
  padding: 0 4px !important;
  margin-bottom: 20px !important;
  overflow-x: auto !important; overflow-y: hidden !important; -webkit-overflow-scrolling: touch !important;
  flex-wrap: nowrap !important;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 10px 18px !important;
  border: none !important;
  background: transparent !important;
  cursor: pointer !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  font-family: 'Inter', sans-serif !important;
  color: var(--bento-text-secondary, var(--secondary-text-color, #94A3B8)) !important;
  border-bottom: 2px solid transparent !important;
  margin-bottom: -2px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  white-space: nowrap !important;
  border-radius: 0 !important;
  flex: none !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-primary, #3B82F6) !important;
  background: rgba(59, 130, 246, 0.08) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  color: var(--bento-primary, #3B82F6) !important;
  border-bottom-color: var(--bento-primary, #3B82F6) !important;
  background: rgba(59, 130, 246, 0.04) !important;
  font-weight: 600 !important;
}

/* ── Tab content animation ───────────────────── */
.tab-content {
  display: block;
}
.tab-content.active {
  animation: bentoFadeIn 0.3s ease-out;
}
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards ────────────────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-card, var(--card-background-color, #1E293B)) !important;
  border: 1px solid var(--bento-border, var(--divider-color, #334155)) !important;
  border-radius: var(--bento-radius-sm, 10px) !important;
  padding: 16px !important;
  text-align: center !important;
  transition: var(--bento-transition);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  box-shadow: var(--bento-shadow-md);
}
.stat-icon { font-size: 20px; margin-bottom: 4px; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--bento-text);
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px;
  color: var(--bento-text-secondary);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

/* ── Overview grid (2×2 stat layout) ─────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

/* ── Section headers ─────────────────────────── */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--bento-text-secondary);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin: 12px 0 8px;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px;
  background: linear-gradient(90deg, var(--bento-primary), transparent);
  border-radius: 2px;
  animation: bentoLoad 1s infinite;
  margin-bottom: 8px;
}
@keyframes bentoLoad { 0% { background-position: 0; } 100% { background-position: 200px; } }

.empty-state, .no-data, .no-results {
  text-align: center;
  color: var(--bento-text-secondary);
  padding: 32px 16px;
  font-size: 13px;
  background: var(--bento-bg);
  border-radius: var(--bento-radius-sm);
}
.info-note, .tip-box {
  font-size: 12px;
  color: var(--bento-text-secondary);
  background: var(--bento-bg);
  border-radius: var(--bento-radius-sm);
  padding: 8px 10px;
  border-left: 3px solid var(--bento-primary);
  margin-top: 8px;
}
.last-updated {
  font-size: 11px;
  color: var(--bento-text-muted);
  text-align: right;
  margin-top: 8px;
}

/* ── Buttons ─────────────────────────────────── */
.refresh-btn {
  background: var(--bento-border);
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--bento-text-secondary);
  cursor: pointer;
  font-weight: 500;
  transition: var(--bento-transition);
}
.refresh-btn:hover { background: var(--bento-primary); color: white; }

.toggle-btn, .action-btn {
  background: var(--bento-primary);
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: var(--bento-transition);
}
.toggle-btn:hover, .action-btn:hover { opacity: .85; }

.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--bento-transition);
}
.send-btn:hover, .btn-primary:hover {
  background: var(--bento-primary-hover);
  transform: translateY(-1px);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ── Badges / Status ─────────────────────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); }
.badge-info { background: var(--bento-primary-light); color: var(--bento-primary); }

/* ── Count badges (inline) ───────────────────── */
.count-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}
.error-badge { background: rgba(239,68,68,0.13); color: var(--bento-error); }
.warn-badge  { background: rgba(245,158,11,0.13); color: var(--bento-warning); }
.info-badge  { background: rgba(59,130,246,0.13); color: var(--bento-primary); }
.ok-badge    { background: rgba(16,185,129,0.13); color: var(--bento-success); }

/* ── Tables ───────────────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg);
  color: var(--bento-text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 2px solid var(--bento-border);
}
td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text);
  font-size: 13px;
}
tr:hover td { background: var(--bento-primary-light); }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 8px 12px;
  border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card);
  color: var(--bento-text);
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  transition: var(--bento-transition);
  outline: none;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-border);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm);
  padding: 14px;
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px 6px;
  padding: 8px;
  border-radius: var(--bento-radius-sm);
  margin-bottom: 4px;
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
}
.error-entry { background: var(--bento-error-light); border: 1px solid rgba(239,68,68,0.13); }
.warn-entry  { background: var(--bento-warning-light); border: 1px solid rgba(245,158,11,0.13); }
.log-time { color: var(--bento-text-muted); flex-shrink: 0; }
.log-domain {
  font-weight: 600;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary);
  flex-basis: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  min-width: 0;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 10px 14px;
  border-radius: var(--bento-radius-sm);
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 12px; }
  .tabs { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; gap: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 10px !important; font-size: 12px !important; white-space: nowrap !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 18px !important; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px !important; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; }
  .log-domain { max-width: 60%; font-size: 11px; }
  .log-msg { flex-basis: 100%; max-width: 100%; overflow-wrap: anywhere; font-size: 11px; }
  pre { white-space: pre-wrap; word-break: break-all; max-width: calc(100vw - 80px); overflow-x: auto; }
  .panels, .board { flex-direction: column; }
  .column { min-width: unset; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
}

/* ── Mobile — 480 px ─────────────────────────── */
@media (max-width: 480px) {
  .tabs { gap: 1px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 8px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 16px !important; }
}
`;
}
// XSS escape singleton (idempotent)
if (typeof window !== 'undefined') {
  window._haToolsEsc = window._haToolsEsc || (function(){
    var MAP = {};
    MAP[String.fromCharCode(38)] = '&amp;';
    MAP[String.fromCharCode(60)] = '&lt;';
    MAP[String.fromCharCode(62)] = '&gt;';
    MAP[String.fromCharCode(34)] = '&quot;';
    MAP[String.fromCharCode(39)] = '&#39;';
    return function(s){ return typeof s === 'string' ? s.replace(/[&<>"']/g, function(c){ return MAP[c]; }) : (s == null ? '' : s); };
  })();
}
// Universal donate footer injector — guarantees the support box appears
// on every split-tool card regardless of internal render state.
if (typeof window !== 'undefined' && !window.__haToolsSplitDonateInjector) {
  window.__haToolsSplitDonateInjector = true;
  var SPLIT_TAGS = ['ha-purge-cache','ha-yaml-checker','ha-data-exporter','ha-baby-tracker','ha-chore-tracker','ha-energy-optimizer','ha-energy-insights','ha-energy-email','ha-log-email','ha-smart-reports','ha-network-map','ha-trace-viewer','ha-automation-analyzer','ha-storage-monitor','ha-backup-manager','ha-security-check','ha-device-health','ha-sentence-manager','ha-encoding-fixer','ha-entity-renamer','ha-frigate-privacy','ha-vacuum-water-monitor'];
  var DONATE_HTML = ''
    + '<div class="donate-section" data-source="ha-tools-split-injector">'
    + '  <div class="donate-text">'
    + '    <h3>❤️ Support HA Tools Development</h3>'
    + '    <p>If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!</p>'
    + '  </div>'
    + '  <div class="donate-buttons">'
    + '    <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>'
    + '    <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>'
    + '  </div>'
    + '</div>';
  function injectAll() {
    SPLIT_TAGS.forEach(function(tag){
      document.querySelectorAll(tag).forEach(function(el){
        if (!el.shadowRoot) return;
        if (el.shadowRoot.querySelector('.donate-section')) return;
        var target = el.shadowRoot.querySelector('.card, .card-container, .main-card, [class$="-card"]') || el.shadowRoot.firstElementChild || el.shadowRoot;
        try { target.insertAdjacentHTML('beforeend', DONATE_HTML); } catch(e) {}
      });
    });
  }
  // Initial + periodic for first 60s; then MutationObserver for later mounts.
  setTimeout(injectAll, 250);
  var pollCount = 0;
  var pollInterval = setInterval(function(){
    injectAll();
    if (++pollCount >= 30) {
      clearInterval(pollInterval);
      try {
        var obs = new MutationObserver(function(){ injectAll(); });
        obs.observe(document.body, { childList: true, subtree: true });
      } catch(e) {}
    }
  }, 2000);
}
/* ============================================================ */

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
    this.babies = this._loadChildren();
    if (this.babies.length === 0) this.babies = config.babies || [{ name: 'Baby 1' }];
    this.selectedBaby = 0;
    this.selectedTab = 'feeding';
    this.renderCard();
  }

  _sanitize(str) {
    if (!str) return str;
    try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
  }
  set hass(hass) {

    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';    this._hass = hass;
    if (!hass) return;
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
          this.renderCard();
          this._lastRenderTime = Date.now();
        }, 5000 - (now - (this._lastRenderTime || 0)));
      }
      return;
    }
    this.renderCard();
    this._lastRenderTime = now;
  }

  get hass() {
    return this._hass;
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
    } catch (e) { console.warn('Baby and Lactation Tracker: save failed', e); }
  }

  _loadData() {
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
    this.babies.push({name: 'Baby ' + (this.babies.length + 1)});
    this._saveChildren();
    this.renderCard();
  }

  _removeChild(idx) {
    if (this.babies.length <= 1) return;
    this.babies.splice(idx, 1);
    localStorage.removeItem('ha-tools-baby-tracker-' + idx);
    if (this.selectedBaby >= this.babies.length) this.selectedBaby = this.babies.length - 1;
    this._saveChildren();
    this._loadData();
    this.renderCard();
  }

  _saveChildNames() {
    const inputs = this.shadowRoot.querySelectorAll('.child-name-input');
    inputs.forEach(input => {
      const idx = parseInt(input.dataset.childIdx);
      if (this.babies[idx]) this.babies[idx].name = input.value.trim() || ('Baby ' + (idx + 1));
    });
    this._saveChildren();
    this.renderCard();
  }

  initializeDataStructures() {
    if (!this.babies || !this.babies.length) return;
    this.babies.forEach(baby => {
      const babyName = baby.name;
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

  renderCard() {
    if (!this._hass) return;
    if (!this.config) return;
    if (!this.selectedTab) this.selectedTab = 'feeding';
    if (!this.babies || this.babies.length === 0) {
      this.babies = [{ name: 'Baby 1' }];
    }
    if (this.selectedBaby >= this.babies.length) this.selectedBaby = 0;
    if (!this.selectedTab) this.selectedTab = 'feeding';
    const title = this.config.title || this._t.title;
    const currentBaby = this.babies[this.selectedBaby].name;

    const html = `
      <style>${window.HAToolsBentoCSS || ""}
/* === Support / Donation Section (HA Tools split) === */
.donate-section { margin: 20px 0 4px; padding: 18px 20px;  background: var(--donate-bg, linear-gradient(135deg, #fff5f5 0%, #fff0f6 50%, #f8f0ff 100%));  border: 1px solid var(--donate-border, #f3d3e0); border-radius: var(--bento-radius-md, 16px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
.donate-section h3 { margin: 0 0 6px; font-size: 15px; color: var(--donate-heading, #be185d); }
.donate-section p  { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--donate-text, #6b21a8); }
.donate-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.donate-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;  font-weight: 600; font-size: 12.5px; text-decoration: none; transition: transform .15s ease, box-shadow .15s ease; }
.donate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
.donate-btn.coffee { background: #FFDD00; color: #000; border: 1px solid #e6c700; }
.donate-btn.paypal { background: #0070ba; color: #fff; border: 1px solid #005ea6; }
@media (prefers-color-scheme: dark) {  .donate-section { background: linear-gradient(135deg, #2a1525 0%, #1e1530 50%, #251530 100%); border-color: #4a3555; }  .donate-section h3 { color: #f0c0d8; }  .donate-section p  { color: #d4a0b8; }  .donate-btn.coffee { background: #b8a100; color: #fff; border-color: #8a7a00; }  .donate-btn.paypal { background: #005a96; color: #e0f0ff; border-color: #004a7a; } }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 16px; }  .donate-buttons { justify-content: center; } }


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


@media (prefers-color-scheme: dark) {
  :host {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  }
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

</style>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">${title}</h2>
          <div class="baby-selector">
            ${this.babies.map((baby, idx) => `
              <button class="baby-button ${idx === this.selectedBaby ? 'active' : ''}"
                      data-index="${idx}">${baby.name}</button>
            `).join('')}
          </div>
        </div>

        <div class="tip-banner" id="tip-banner">
          <button class="tip-dismiss" id="tip-dismiss" aria-label="Dismiss">\u2715</button>
          <div class="tip-banner-title">\u{1F4A1} ${this._lang === 'pl' ? 'Jak zacz\u0105\u0107?' : 'Getting started'}</div>
          <ul>
            ${this._lang === 'pl' ? `
            <li><strong>Encje HA:</strong> tool automatycznie tworzy 15 encji <code>input_*</code> (input_number, input_datetime, input_select) przy pierwszym uruchomieniu.</li>
            <li><strong>Komendy g\u0142osowe:</strong> po skonfigurowaniu Sentence Manager, mo\u017Cesz u\u017Cywa\u0107 komend jak <em>"karmienie butelk\u0105 120 ml"</em> lub <em>"zmiana pieluchy brudna"</em>.</li>
            <li><strong>Zak\u0142adki:</strong> Feeding (karmienie), Diapers (pieluchy), Sleep (sen), Growth (wzrost/waga).</li>
            <li><strong>Multi-baby:</strong> dodaj wiele dzieci \u2014 ka\u017Cde ma osobne encje i statystyki.</li>
            <li><strong>Wykresy:</strong> statystyki dnia, tygodnia. Wykresy wzrostu z percentylami WHO.</li>
            ` : `
            <li><strong>HA Entities:</strong> the tool automatically creates 15 <code>input_*</code> entities (input_number, input_datetime, input_select) on first run.</li>
            <li><strong>Voice commands:</strong> after configuring Sentence Manager, you can use commands like <em>"bottle feeding 120 ml"</em> or <em>"dirty diaper change"</em>.</li>
            <li><strong>Tabs:</strong> Feeding, Diapers, Sleep, Growth (weight/height).</li>
            <li><strong>Multi-baby:</strong> add multiple children \u2014 each gets separate entities and statistics.</li>
            <li><strong>Charts:</strong> daily and weekly stats. Growth charts with WHO percentiles.</li>
            `}
          </ul>
        </div>

        <div class="tabs" role="tablist">
          ${this.babies.length > 1 ? `
          <div style="display:flex;gap:4px;margin-bottom:12px;padding:0 4px">
            ${this.babies.map((b, i) => `
              <button class="baby-btn" data-baby="${i}" role="button" aria-pressed="${this.selectedBaby === i}" 
                style="padding:6px 14px;border:1.5px solid ${this.selectedBaby === i ? 'var(--bento-primary,#3B82F6)' : 'var(--bento-border,#e2e8f0)'};border-radius:20px;background:${this.selectedBaby === i ? 'rgba(59,130,246,0.1)' : 'transparent'};color:${this.selectedBaby === i ? 'var(--bento-primary,#3B82F6)' : 'var(--bento-text-secondary,#64748B)'};font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">
                👶 ${b.name}
              </button>
            `).join('')}
          </div>` : ``}
          <button class="tab-button ${this.selectedTab === 'feeding' ? 'active' : ''}" data-tab="feeding" role="tab" aria-selected="${!!(this.selectedTab === 'feeding' )}">
            🍼 Feeding
          </button>
          <button class="tab-button ${this.selectedTab === 'lactation' ? 'active' : ''}" data-tab="lactation" role="tab" aria-selected="${!!(this.selectedTab === 'lactation' )}">
            🤱 Lactation
          </button>
          <button class="tab-button ${this.selectedTab === 'diapers' ? 'active' : ''}" data-tab="diapers" role="tab" aria-selected="${!!(this.selectedTab === 'diapers' )}">
            🩷 Diapers
          </button>
          <button class="tab-button ${this.selectedTab === 'sleep' ? 'active' : ''}" data-tab="sleep" role="tab" aria-selected="${!!(this.selectedTab === 'sleep' )}">
            😴 Sleep
          </button>
          <button class="tab-button ${this.selectedTab === 'growth' ? 'active' : ''}" data-tab="growth" role="tab" aria-selected="${!!(this.selectedTab === 'growth' )}">
            📏 Growth
          </button>
          <button class="tab-button ${this.selectedTab === 'config' ? 'active' : ''}" data-tab="config" role="tab" aria-selected="${!!(this.selectedTab === 'config' )}">
            ⚙️ Config
          </button>
        </div>

        <!-- Feeding Tab -->
        <div class="tab-pane" id="feeding-tab" style="display:${this.selectedTab === 'feeding' ? 'block' : 'none'}">
        <div class="section-block" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px;font-size:15px">👶 ${this._lang === 'pl' ? 'Dzieci' : 'Children'}</h3>
        <div id="children-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          ${this.babies.map((b, i) => `
            <div style="display:flex;align-items:center;gap:8px">
              <input type="text" value="${_esc(b.name)}" data-child-idx="${i}" class="child-name-input"
                style="flex:1;padding:8px 12px;border:1.5px solid var(--bento-border,#e2e8f0);border-radius:6px;font-size:13px;font-family:Inter,sans-serif;background:var(--bento-card,#fff);color:var(--bento-text,#333)">
              ${this.babies.length > 1 ? `<button onclick="this.getRootNode().host._removeChild(${i})" style="padding:6px 10px;border:1px solid var(--bento-border);border-radius:6px;background:none;cursor:pointer;color:var(--bento-text-secondary);font-size:14px" title="${this._t.remove}">🗑</button>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="this.getRootNode().host._addChild()" style="padding:8px 16px;border:none;border-radius:8px;background:var(--bento-primary,#3B82F6);color:white;font-weight:600;font-size:12px;cursor:pointer">➕ ${this._lang === 'pl' ? 'Dodaj dziecko' : 'Add child'}</button>
          <button onclick="this.getRootNode().host._saveChildNames()" style="padding:8px 16px;border:1px solid var(--bento-border);border-radius:8px;background:var(--bento-card);color:var(--bento-text);font-weight:500;font-size:12px;cursor:pointer">💾 ${this._lang === 'pl' ? 'Zapisz nazwy' : 'Save names'}</button>
        </div>
      </div>

      <!-- Breastfeeding Timer Section -->
      <div class="section-block" style="margin-bottom:16px;background:var(--bento-bg);border:1px solid var(--bento-border);border-radius:8px;padding:16px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">\u{1F4CA} ${this._lang === 'pl' ? 'Karmienie piersi\u0105' : 'Breastfeeding'}</h3>

        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button class="bf-breast-btn" data-side="left" style="flex:1;padding:12px 16px;border:2px solid var(--bento-border);background:var(--bento-card);border-radius:8px;font-weight:600;cursor:pointer;font-size:14px" title="${this._t.leftBreast}">
            \u{1F452} ${this._lang === 'pl' ? 'Lewa' : 'Left'}
          </button>
          <button class="bf-breast-btn" data-side="right" style="flex:1;padding:12px 16px;border:2px solid var(--bento-border);background:var(--bento-card);border-radius:8px;font-weight:600;cursor:pointer;font-size:14px" title="${this._t.rightBreast}">
            \u{1F452} ${this._lang === 'pl' ? 'Prawa' : 'Right'}
          </button>
        </div>

        <div class="bf-timer-display" style="background:var(--bento-bg);border:2px solid var(--bento-border);border-radius:8px;padding:16px;text-align:center;margin-bottom:16px">
          <div style="font-size:32px;font-weight:700;font-family:monospace;letter-spacing:2px;color:var(--bento-primary);margin-bottom:8px" id="bfTimerDisplay">00:00</div>
          <div style="font-size:12px;color:var(--bento-text-secondary);font-weight:600;text-transform:uppercase" id="bfTimerLabel">Ready</div>
        </div>

        <div id="bfSessionsList" style="margin-top:12px;font-size:12px"></div>
      </div>

      <div class="tab-content active">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="feedingType">
              <option value="breast">Breast Feeding</option>
              <option value="bottle">Bottle Feeding</option>
              <option value="solid">Solid Food</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Time</label>
              <input type="time" id="feedingTime">
            </div>
            <div class="form-group">
              <label class="form-label">Duration/Amount</label>
              <input type="text" id="feedingAmount" placeholder="e.g., 15 min or 120 ml">
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label">Notes</label>
            <textarea id="feedingNotes" placeholder="Optional notes..."></textarea>
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addFeedingBtn">Add Feeding</button>
            <button class="btn-secondary" id="clearFeedingBtn">Clear</button>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Recent Feedings</h3>
            <div id="feedingList"></div>
          </div>
        </div>
        </div>
        

        <!-- Lactation Tab -->
        <div class="tab-pane" id="lactation-tab" style="display:${this.selectedTab === 'lactation' ? 'block' : 'none'}">
        <div class="tab-content active">
          <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">🤱 ${this._lang === 'pl' ? 'Śledzenie laktacji' : 'Lactation Tracking'}</h3>

          <div class="form-group">
            <label class="form-label">${this._lang === 'pl' ? 'Typ' : 'Type'}</label>
            <select id="lactationType">
              <option value="breastfeed">${this._lang === 'pl' ? 'Karmienie piersi\u0105' : 'Breastfeeding'}</option>
              <option value="pump">${this._lang === 'pl' ? 'Odciąganie' : 'Pumping'}</option>
              <option value="manual">${this._lang === 'pl' ? 'Ręczne odciąganie' : 'Hand Expression'}</option>
              <option value="supplement">${this._lang === 'pl' ? 'Suplementacja' : 'Supplementation'}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${this._lang === 'pl' ? 'Czas' : 'Time'}</label>
              <input type="time" id="lactationTime">
            </div>
            <div class="form-group">
              <label class="form-label">${this._lang === 'pl' ? 'Strona' : 'Side'}</label>
              <select id="lactationSide">
                <option value="left">${this._lang === 'pl' ? 'Lewa' : 'Left'}</option>
                <option value="right">${this._lang === 'pl' ? 'Prawa' : 'Right'}</option>
                <option value="both">${this._lang === 'pl' ? 'Obie' : 'Both'}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${this._lang === 'pl' ? 'Czas trwania (min)' : 'Duration (min)'}</label>
              <input type="number" id="lactationDuration" placeholder="e.g., 15" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">${this._lang === 'pl' ? 'Ilość (ml)' : 'Amount (ml)'}</label>
              <input type="number" id="lactationAmount" placeholder="e.g., 80" min="0">
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label">${this._lang === 'pl' ? 'Notatki' : 'Notes'}</label>
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
            <label class="form-label">Type</label>
            <select id="diapersType">
              <option value="wet">Wet</option>
              <option value="dirty">Dirty</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Time</label>
            <input type="time" id="diapersTime">
          </div>

          <div class="form-group full">
            <label class="form-label">Notes</label>
            <textarea id="diapersNotes" placeholder="Optional notes..."></textarea>
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addDiapersBtn">Log Diaper</button>
            <button class="btn-secondary" id="clearDiapersBtn">Clear</button>
          </div>

          <div style="margin-top: 20px;">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value" id="wetCount">0</div>
                <div class="stat-label">Wet Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="dirtyCount">0</div>
                <div class="stat-label">Dirty Today</div>
              </div>
            </div>
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Recent Changes</h3>
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
                <label class="form-label">${this._lang === 'pl' ? 'Sen od' : 'Sleep From'}</label>
                <input type="datetime-local" id="sleepFromTime">
              </div>
              <div class="form-group">
                <label class="form-label">${this._lang === 'pl' ? 'Sen do' : 'Sleep To'}</label>
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
              <label class="form-label">Measurement</label>
              <select id="growthType">
                <option value="weight">Weight (kg)</option>
                <option value="height">Height (cm)</option>
                <option value="headCirc">Head Circumference (cm)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Value</label>
              <input type="number" id="growthValue" placeholder="Enter value" step="0.1">
            </div>
          </div>

          <div class="form-group full">
            <label class="form-label">Date</label>
            <input type="date" id="growthDate">
          </div>

          <div class="button-group">
            <button class="btn-primary" id="addGrowthBtn">Add Measurement</button>
            <button class="btn-secondary" id="clearGrowthBtn">Clear</button>
          </div>

          <canvas id="growthChart" class="growth-chart"></canvas>

          <h3 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600;">Measurements</h3>
          <div id="growthList"></div>
        </div>
        </div>
        

        <!-- Config Tab -->
        <div class="tab-pane" id="config-tab" style="display:${this.selectedTab === 'config' ? 'block' : 'none'}">
        <div class="tab-content active">
          <div class="config-section">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:600">Custom Sentences</h3>
            <p style="font-size:13px;color:var(--bento-text-secondary,#64748B);margin:0 0 16px">
              ${this._lang === 'pl'
                ? 'Wygeneruj plik YAML z komendami g\u0142osowymi do sterowania Baby and Lactation Trackerem przez Assist. Skopiuj wygenerowany YAML i wklej do <code>custom_sentences/</code> w folderze konfiguracji HA.'
                : 'Generate a YAML file with voice commands to control Baby and Lactation Tracker via Assist. Copy the generated YAML and paste into <code>custom_sentences/</code> in your HA config folder.'}
            </p>

            <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
              <label style="font-size:13px;font-weight:600;color:var(--bento-text,#1e293b)">
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
                  ${this._generatedYaml ? ' \u2014 <code>custom_sentences/' + (this._sentenceLang || this._lang || 'en') + '/baby.yaml</code>' : ''}
                </span>
                <button class="btn-secondary" id="copySentencesBtn" style="font-size:11px;padding:4px 10px">
                  ${this._lang === 'pl' ? 'Kopiuj' : 'Copy'}
                </button>
              </div>
              <pre id="sentencesYaml" style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-size:11px;line-height:1.6;overflow-x:auto;max-height:400px;overflow-y:auto;margin:0;white-space:pre">${this._generatedYaml || ''}</pre>
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
              <div><strong>Entity:</strong>
                ${this._lang === 'pl'
                  ? 'Dane zapisywane s\u0105 w input_* helpers. Stw\u00F3rz je w Settings > Helpers:'
                  : 'Data is stored in input_* helpers. Create them in Settings > Helpers:'}
              </div>
              <div style="margin-left:8px"><code>input_datetime.baby_last_feed</code>, <code>input_number.baby_feed_amount</code>, <code>input_select.baby_feed_type</code></div>
            </div>
          </div>
        </div>
        </div>
        

        <div class="export-section">
          <button class="btn-secondary" id="exportBtn">📥 Export Data (JSON)</button>
        </div>
      
        <!-- Support / Donation -->
        <div class="donate-section" data-source="ha-tools-split">
          <div class="donate-text">
            <h3>❤️ ${this._lang === 'pl' ? 'Wesprzyj rozwój HA Tools' : 'Support HA Tools Development'}</h3>
            <p>${this._lang === 'pl' ? 'Jeśli to narzędzie ułatwia Ci życie z Home Assistant, rozważ wsparcie projektu. Każda kawa motywuje do dalszego rozwoju!' : 'If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!'}</p>
          </div>
          <div class="donate-buttons">
            <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>
            <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>
          </div>
        </div>
        </div>
    `;

    if (this._lastHtml === html) return;
    this._lastHtml = html;
    const tabsEl = this.shadowRoot.querySelector('.tabs');
    const tabsScrollLeft = tabsEl ? tabsEl.scrollLeft : 0;
    this.shadowRoot.innerHTML = html;
    requestAnimationFrame(() => {
      const newTabsEl = this.shadowRoot.querySelector('.tabs');
      if (newTabsEl) newTabsEl.scrollLeft = tabsScrollLeft;
    });

    this.attachEventListeners();
    this.setDefaultTimes();
    this.updateAllDisplays();
  }

  attachEventListeners() {
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

    shadowRoot.querySelectorAll('.baby-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedBaby = parseInt(e.target.closest('[data-baby]').dataset.baby);
        this.renderCard();
      });
    });

    shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedTab = e.target.closest('[data-tab]').dataset.tab;
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this.selectedTab);
        // Toggle button active states
        shadowRoot.querySelectorAll('.tab-button').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === this.selectedTab);
        });
        // Toggle tab pane visibility
        ['feeding', 'lactation', 'diapers', 'sleep', 'growth', 'config'].forEach(t => {
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

  setDefaultTimes() {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateString = now.toISOString().split('T')[0];
    const dateTimeString = now.toISOString().slice(0, 16);

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
      stt.value = oneHourLater.toISOString().slice(0, 16);
    }
  }

  getCurrentBaby() {
    return this.babies[this.selectedBaby].name;
  }

  addFeeding() {
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
      if (!this.lactationData.has(baby)) this.lactationData.set(baby, []);
      this.lactationData.get(baby).unshift(lactEntry);
    }

    this.feedingData.get(baby).push(feeding);
    this._saveData();

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

  addDiapers() {
    const type = this.shadowRoot.getElementById('diapersType').value;
    const time = this.shadowRoot.getElementById('diapersTime').value;
    const notes = this.shadowRoot.getElementById('diapersNotes').value;

    if (!time) {
      alert(this._lang === 'pl' ? 'Wybierz czas' : 'Please select a time');
      return;
    }

    const baby = this.getCurrentBaby();
    const diaper = { type, time, notes, timestamp: Date.now() };
    this.diapersData.get(baby).push(diaper);
    this._saveData();

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

  startSleepTimer() {
    if (this.sleepTimer) return;
    this.sleepStartTime = Date.now();
    this.sleepTimer = setInterval(() => this.updateSleepTimerDisplay(), 100);
    this._saveData(); // Persist running timer immediately
    this._startAutoSave();
    const _ssb = this.shadowRoot.getElementById('startSleepBtn');
    const _stb = this.shadowRoot.getElementById('stopSleepBtn');
    if (_ssb) _ssb.style.display = 'none';
    if (_stb) _stb.style.display = 'block';
    this.updateSleepTimerDisplay();
  }

  stopSleepTimer() {
    if (!this.sleepTimer) return;
    clearInterval(this.sleepTimer);
    const sleepEndTime = Date.now();
    const durationMinutes = Math.round((sleepEndTime - this.sleepStartTime) / 60000);
    this.sleepTimer = null;
    if (!this._bfTimer) this._stopAutoSave();

    if (durationMinutes > 0) {
      const baby = this.getCurrentBaby();
      const now = new Date();
      const sleep = {
        startTime: this.sleepStartTime,
        endTime: sleepEndTime,
        duration: durationMinutes,
        date: now.toISOString().split('T')[0],
        timestamp: Date.now()
      };
      this.sleepData.get(baby).push(sleep);
      this._saveData();
      this.updateAllDisplays();
    }
    this.sleepStartTime = null;
    const _ssb = this.shadowRoot.getElementById('startSleepBtn');
    const _stb = this.shadowRoot.getElementById('stopSleepBtn');
    if (_ssb) _ssb.style.display = 'block';
    if (_stb) _stb.style.display = 'none';
    this.updateSleepTimerDisplay();
  }

  addManualSleep() {
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
    this.sleepData.get(baby).push(sleep);
    this._saveData();

    const _sft = this.shadowRoot.getElementById('sleepFromTime');
    const _stt = this.shadowRoot.getElementById('sleepToTime');
    if (_sft) _sft.value = '';
    if (_stt) _stt.value = '';
    this.updateAllDisplays();
  }

  addGrowth() {
    const type = this.shadowRoot.getElementById('growthType').value;
    const value = parseFloat(this.shadowRoot.getElementById('growthValue').value);
    const date = this.shadowRoot.getElementById('growthDate').value;

    if (!value || !date) {
      alert(this._lang === 'pl' ? 'Wypełnij wartość i datę' : 'Please fill in value and date');
      return;
    }

    const baby = this.getCurrentBaby();
    const growth = { type, value, date, timestamp: Date.now() };
    this.growthData.get(baby).push(growth);
    this._saveData();

    this.clearGrowthForm();
    this.updateAllDisplays();
  }

  clearGrowthForm() {
    const _gv = this.shadowRoot.getElementById('growthValue');
    if (_gv) _gv.value = '';
    this.setDefaultTimes();
  }

  updateSleepTimerDisplay() {
    if (!this.sleepTimer || !this.sleepStartTime) {
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

  toggleBreastfeedingTimer(side) {
    if (this._bfCurrentSide === side && this._bfTimer) {
      // Stop timer on the same side
      this._stopBreastfeedingTimer();
    } else {
      // Switch to the other side or start if not running
      if (this._bfTimer) {
        this._stopBreastfeedingTimer();
      }
      this._startBreastfeedingTimer(side);
    }
    this.updateBreastfeedingDisplay();
  }

  _startBreastfeedingTimer(side) {
    this._bfCurrentSide = side;
    this._bfStartTime = Date.now();
    this._bfTimer = setInterval(() => this.updateBreastfeedingDisplay(), 100);
    this._saveData(); // Persist running timer immediately
    this._startAutoSave();
  }

  _stopBreastfeedingTimer() {
    if (!this._bfTimer) return;
    clearInterval(this._bfTimer);
    if (!this.sleepTimer) this._stopAutoSave();
    const durationSeconds = Math.round((Date.now() - this._bfStartTime) / 1000);
    if (durationSeconds > 0) {
      this._bfSessions.push({
        side: this._bfCurrentSide,
        duration: durationSeconds,
        timestamp: Date.now()
      });
    }
    this._bfTimer = null;
    this._bfCurrentSide = null;
    this._bfStartTime = null;
    this._saveData();
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
    this.updateGrowthChart();
  }

  updateFeedingList() {
    const listContainer = this.shadowRoot.getElementById('feedingList');
    if (!listContainer) return;
    const baby = this.getCurrentBaby();
    const feedings = this.feedingData.get(baby) || [];
    const icons = { breast: '🤱', bottle: '🍼', solid: '🥣' };

    if (feedings.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No feedings logged yet</div></div>';
      return;
    }

    listContainer.innerHTML = feedings.slice(-5).reverse().map(f => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${f.time}</div>
          <div class="list-item-title">${icons[f.type]} ${_esc(f.type.charAt(0).toUpperCase() + f.type.slice(1))}${_esc(f.linkedId) ? ' \uD83D\uDD17' : ''}</div>
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

    const today = new Date().toISOString().split('T')[0];
    const todayDiapers = diapers.filter(d => {
      const [h, m] = d.time.split(':');
      const diapDate = new Date();
      diapDate.setHours(parseInt(h), parseInt(m), 0);
      return diapDate.toISOString().split('T')[0] === today;
    });

    const wetCount = todayDiapers.filter(d => d.type === 'wet' || d.type === 'both').length;
    const dirtyCount = todayDiapers.filter(d => d.type === 'dirty' || d.type === 'both').length;

    const _wc = this.shadowRoot.getElementById('wetCount');
    const _dc = this.shadowRoot.getElementById('dirtyCount');
    if (_wc) _wc.textContent = wetCount;
    if (_dc) _dc.textContent = dirtyCount;

    if (diapers.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No diaper changes logged yet</div></div>';
      return;
    }

    listContainer.innerHTML = diapers.slice(-5).reverse().map(d => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${d.time}</div>
          <div class="list-item-title">${icons[d.type]} ${_esc(d.type.charAt(0).toUpperCase() + d.type.slice(1))}</div>
          ${d.notes ? `<div class="list-item-subtitle">${_esc(d.notes)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  updateSleepList() {
    const baby = this.getCurrentBaby();
    const sleeps = this.sleepData.get(baby) || [];
    const listContainer = this.shadowRoot.getElementById('sleepList');
    if (!listContainer) return;

    const today = new Date().toISOString().split('T')[0];
    const todaySleep = sleeps.filter(s => s.date === today);
    const totalMinutes = todaySleep.reduce((sum, s) => sum + s.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const _ts = this.shadowRoot.getElementById('totalSleep');
    if (_ts) _ts.textContent = `${hours}h ${minutes}m`;

    if (sleeps.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No sleep logged yet</div></div>';
      return;
    }

    listContainer.innerHTML = sleeps.slice(-5).reverse().map(s => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${s.date}</div>
          <div class="list-item-title">😴 Sleep</div>
          <div class="list-item-subtitle">${Math.floor(s.duration / 60)}h ${s.duration % 60}m</div>
        </div>
      </div>
    `).join('');
  }

  updateGrowthChart() {
    const baby = this.getCurrentBaby();
    const growths = this.growthData.get(baby) || [];
    const canvas = this.shadowRoot.getElementById('growthChart');
    const listContainer = this.shadowRoot.getElementById('growthList');
    if (!canvas || !listContainer) return;

    if (growths.length === 0) {
      canvas.style.display = 'none';
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No measurements logged yet</div></div>';
      return;
    }

    canvas.style.display = 'block';
    this._fixCanvasSize(canvas);
    const ctx = canvas.getContext('2d');
    const weights = growths.filter(g => g.type === 'weight').sort((a, b) => new Date(a.date) - new Date(b.date));

    if (weights.length > 0) {
      this.drawChart(ctx, weights);
    }

    const icons = { weight: '⚖️', height: '📏', headCirc: '🎯' };
    listContainer.innerHTML = growths.slice(-10).reverse().map(g => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${g.date}</div>
          <div class="list-item-title">${icons[g.type]} ${g.type === 'headCirc' ? 'Head Circumference' : g.type.charAt(0).toUpperCase() + g.type.slice(1)}</div>
          <div class="list-item-subtitle">${g.value} ${g.type === 'weight' ? 'kg' : 'cm'}</div>
        </div>
      </div>
    `).join('');
  }

  drawChart(ctx, data) {
    const padding = 40;
    const chartWidth = ctx.canvas.width - padding * 2;
    const chartHeight = ctx.canvas.height - padding * 2;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    const range = maxVal - minVal;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#1976d2';
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 2;

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = ctx.canvas.height - padding - ((d.value - minVal) / range) * chartHeight;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = ctx.canvas.height - padding - ((d.value - minVal) / range) * chartHeight;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    });
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

  exportData() {
    // Privacy: warn before exporting sensitive child tracking data.
    const PL = this._lang === 'pl';
    const warn = PL
      ? 'Eksportowany plik zawiera wrażliwe dane: imiona dzieci, godziny i ilości karmień, sen, pieluszki, wzrost/waga.\n\nNie wysyłaj go publicznie ani do zewnętrznych usług bez świadomej zgody.\n\nKontynuować?'
      : 'The exported file contains sensitive data: child names, feeding times and amounts, sleep, diapers, growth/weight.\n\nDo not share it publicly or with third-party services without informed consent.\n\nContinue?';
    if (!confirm(warn)) return;
    const allData = {
      exportDate: new Date().toISOString(),
      babies: this.babies.map(b => b.name),
      feeding: Object.fromEntries(this.feedingData),
      diapers: Object.fromEntries(this.diapersData),
      sleep: Object.fromEntries(this.sleepData),
      growth: Object.fromEntries(this.growthData)
    };

    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baby-tracker-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static getConfigElement() {
    return document.createElement('ha-baby-tracker-editor');
  }

  getCardSize() { return 8; }

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

      this.shadowRoot.querySelectorAll('[data-baby]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.selectedBaby = parseInt(btn.dataset.baby);
          this._loadData();
          this.renderCard();
        });
      });
  }
  addLactation() {
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
      this.feedingData.get(currentBaby).push(feedEntry);
    }

    this.lactationData.get(currentBaby).unshift(entry);

    this._saveData();
    this.clearLactationForm();
    this.updateLactationDisplay();
    if (type === 'breastfeed') this.updateAllDisplays();
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
    const today = new Date().toISOString().slice(0,10);
    const todayEntries = entries.filter(e => e.date === today);

    const totalMl = todayEntries.reduce((s, e) => s + (e.amount || 0), 0);
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
          ${e.duration ? ` \u2022 ${e.duration} min` : ''}
          ${e.amount ? ` \u2022 ${e.amount} ml` : ''}
          <div style="font-size:11px;color:var(--bento-text-secondary,#64748b)">${_esc(e.notes || '')}</div>
        </div>
        <div style="font-size:12px;color:var(--bento-text-secondary,#64748b);white-space:nowrap">${e.time} ${e.date !== today ? e.date : ''}</div>
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

  disconnectedCallback() {
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
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Baby and Lactation Tracker</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
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
