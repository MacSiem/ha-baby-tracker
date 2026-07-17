/* HA Tools split — ha-baby-tracker v5.0.10 (2026-07-12) — integration-backed with legacy fallback */
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
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  margin-right: 8px; flex-shrink: 0;
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
  function deepFindAll(tag, root) {
    var out = [];
    (function walk(node){
      if (!node || !node.querySelectorAll) return;
      var children = node.querySelectorAll('*');
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c.tagName && c.tagName.toLowerCase() === tag) out.push(c);
        if (c.shadowRoot) walk(c.shadowRoot);
      }
    })(root || document);
    return out;
  }
  // Per-tool prerequisite check + inline install banner
  var PREREQS = {
    'ha-energy-email': { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-log-email':    { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-encoding-fixer': { shellCommand: 'fix_encoding', label: 'shell_command.fix_encoding (optional advanced feature)', kind: 'shell_command_optional' }
  };
  // Per-tool first-run intro banner (one-line scope + 3 use cases)
  var INTROS = {
    'ha-yaml-checker': { headline: 'Validate Home Assistant YAML configuration on demand.', steps: ['Click \'Check HA Configuration\' to run homeassistant.check_config.', 'Switch to \'Encje\' tab to search entities by domain.', 'Use \'Template\' tab to preview Jinja2 templates.'] },
    'ha-data-exporter': { headline: 'Browse, filter, and export Home Assistant entity data.', steps: ['Filter by domain or search entities live.', 'Take a snapshot or export selection to CSV / JSON.', 'Privacy warning before downloading attributes with sensitive data.'] },
    'ha-chore-tracker': { headline: 'Household chore tracker with kanban + recurring schedules.', steps: ['Add a chore: name + assignee + frequency.', 'Drag from \'Todo\' to \'Done\' to mark complete.', 'Stats tab shows counts per assignee.'] },
    'ha-energy-optimizer': { headline: 'Tariff-aware energy usage with hourly heatmaps + tips.', steps: ['Today / Yesterday / 7-day / 30-day usage and cost.', 'Patterns tab — hourly heatmap of consumption.', 'Recommendations tab — auto-generated tips.'] },
    'ha-energy-insights': { headline: 'Daily / weekly / monthly energy charts + top consumers.', steps: ['Switch view tabs to see consumption over time.', 'Top devices ranked by kWh.', 'Tips tab with energy-saving suggestions.'] },
    'ha-energy-email': { headline: 'Energy reports delivered by email via ha_tools_email.', steps: ['Click \'Send Now\' to email the current snapshot.', 'Schedule daily / weekly / monthly delivery.', 'Configure SMTP in the Schedule tab (one-time).'] },
    'ha-log-email': { headline: 'Daily error / warning digests delivered by email.', steps: ['Click \'Send Now\' to email the current digest.', 'Schedule daily delivery + threshold (e.g. \u22653 errors).', 'Requires ha-tools-email-integration.'] },
    'ha-smart-reports': { headline: 'Aggregate weekly / monthly reports — energy + automations + state changes.', steps: ['Weekly summary card on Overview.', 'Drill down by Energy / Automations / System sub-tabs.', 'Privacy-safe view strips entity names before sharing.'] },
    'ha-network-map': { headline: 'Visualise the network around HA — devices, topology, MAC bindings.', steps: ['Devices tab — table of all known devices.', 'Topology tab — graph view of the network.', 'Click \'Rescan\' to ping the local subnet (user-initiated).'] },
    'ha-trace-viewer': { headline: 'Step through HA automation traces with a flow graph.', steps: ['Pick automation in sidebar to see latest 5 traces.', 'Click trace for full path through triggers / conditions / actions.', 'Export trace as JSON for offline debug.'] },
    'ha-automation-analyzer': { headline: 'Surface slow / failing / suspicious automations.', steps: ['Overview shows total + health score + top failing.', 'Performance tab ranks by avg runtime.', 'Optimization tab suggests improvements (loops, redundant triggers).'] },
    'ha-storage-monitor': { headline: 'Disk + recorder DB + add-on storage breakdown.', steps: ['Overview shows used / free + per-category breakdown.', 'Backups tab — count + size warning.', 'Cleanup tab — actionable suggestions.'] },
    'ha-backup-manager': { headline: 'Create + list + inspect HA backups.', steps: ['List existing backups (date / size / encryption).', 'Click \'Create backup now\' to invoke backup.create.', 'Restore selected backup.'] },
    'ha-security-check': { headline: 'Security audit + remediation tips.', steps: ['Overview shows score (X/100) + letter grade.', 'Click warning row for step-by-step remediation.', 'Tips tab — checklist of best practices.'] },
    'ha-device-health': { headline: 'Device battery / signal / last-seen health.', steps: ['List devices grouped by health (OK / Warning / Critical).', 'Filter by low battery (<20%) or weak signal.', 'Click device for model / manufacturer / last seen.'] },
    'ha-encoding-fixer': { headline: 'Detect + fix UTF-8 / mojibake issues across HA.', steps: ['Click \'Scan\' to walk entity registry + states.', 'Per-entity \'Fix\' button calls homeassistant.reload.', 'Optional: deep file scan via shell_command (see README).'] },
    'ha-entity-renamer': { headline: 'Bulk-rename HA entities + friendly names.', steps: ['Pick an entity, set new ID — entity_registry/update.', 'Bulk pattern: sensor.old_* \u2192 sensor.new_*.', 'Optional: rewrite Lovelace dashboard refs.'] },
    'ha-frigate-privacy': { headline: 'One-click Frigate privacy mode (pause detection / recording / snapshots).', steps: ['Click \'Pause 15 min\' for instant privacy.', 'Schedules tab — daily privacy window (e.g. 22:00\u201306:00).', 'Resume at any time to re-enable cameras.'] }
  };
  var PREREQ_HTML_CACHE = {};
  function buildPrereqBanner(tag, prereq, hass) {
    if (PREREQ_HTML_CACHE[tag]) return PREREQ_HTML_CACHE[tag];
    var html = '';
    if (prereq.kind === 'integration') {
      html = '<div class="prereq-banner prereq-error" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">⚠️</div>' +
        '<div class="prereq-text">' +
          '<strong>This tool requires the ' + prereq.label + '</strong><br>' +
          'Install it from HACS: <code>https://github.com/MacSiem/' + prereq.repo + '</code> ' +
          '(Category: <strong>Integration</strong>) — then add <code>' + prereq.service + ':</code> to your <code>configuration.yaml</code> and restart HA.' +
        '</div>' +
        '<a class="prereq-cta" href="https://github.com/MacSiem/' + prereq.repo + '" target="_blank" rel="noopener noreferrer">Open install guide ↗</a>' +
      '</div>';
    } else if (prereq.kind === 'shell_command_optional') {
      html = '<div class="prereq-banner prereq-info" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">💡</div>' +
        '<div class="prereq-text">' +
          '<strong>Optional advanced feature: deep file scan</strong><br>' +
          'To enable scanning of <code>configuration.yaml</code> files, install the bundled <code>encoding_scanner.py</code> + add <code>shell_command:</code> entries. See README.' +
        '</div>' +
      '</div>';
    }
    PREREQ_HTML_CACHE[tag] = html;
    return html;
  }
  function buildIntroBanner(tag, intro) {
    var stepsHtml = intro.steps.map(function(s){ return '<li>' + s + '</li>'; }).join('');
    return '<div class="intro-banner" data-intro="' + tag + '">' +
      '<button class="intro-dismiss" type="button" title="Dismiss" aria-label="Dismiss">✕</button>' +
      '<div class="intro-headline">💡 ' + intro.headline + '</div>' +
      '<ol class="intro-steps">' + stepsHtml + '</ol>' +
    '</div>';
  }
  function introDismissed(tag) {
    try { return localStorage.getItem('ha-intro-dismissed-' + tag) === '1'; } catch(e) { return false; }
  }
  function dismissIntro(tag, el) {
    try { localStorage.setItem('ha-intro-dismissed-' + tag, '1'); } catch(e) {}
    var node = el.shadowRoot && el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
    if (node) node.remove();
  }
  function injectInto(tag, el) {
        // panel_custom auto-init: HA assigns hass/panel/narrow but does not always call setConfig.
        if (typeof el.setConfig === 'function' && !el.config && !el._config) {
          try { el.setConfig({ type: 'custom:' + tag, title: tag }); } catch(e) {}
        }
        if (!el.shadowRoot) return;
        // 0) First-run intro banner (skip if tool has its own native tip)
        var intro = INTROS[tag];
        if (intro && !introDismissed(tag)) {
          var hasOwnTip = el.shadowRoot.querySelector('#tip-banner, .tip-banner');
          var injectedIntro = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
          if (!hasOwnTip && !injectedIntro) {
            try {
              var _introTmp = document.createElement('div');
              _introTmp.innerHTML = buildIntroBanner(tag, intro);
              var _introNode = _introTmp.firstElementChild;
              if (_introNode) el.shadowRoot.insertBefore(_introNode, el.shadowRoot.firstChild);
              var btn = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"] .intro-dismiss');
              if (btn) btn.addEventListener('click', function(ev){ ev.stopPropagation(); dismissIntro(tag, el); });
            } catch(e) {}
          }
        }
        // 1) Prereq banner — checked every poll so it disappears when prereq becomes available
        var prereq = PREREQS[tag];
        if (prereq && el._hass) {
          var hassReady = !!el._hass;
          var present = true;
          if (prereq.service) present = !!(el._hass.services && el._hass.services[prereq.service]);
          if (prereq.shellCommand) present = !!(el._hass.services && el._hass.services.shell_command && el._hass.services.shell_command[prereq.shellCommand]);
          var existing = el.shadowRoot.querySelector('.prereq-banner[data-prereq="' + tag + '"]');
          if (!present && hassReady) {
            if (!existing) {
              try {
                var _prereqTmp = document.createElement('div');
                _prereqTmp.innerHTML = buildPrereqBanner(tag, prereq, el._hass);
                var _prereqNode = _prereqTmp.firstElementChild;
                if (_prereqNode) el.shadowRoot.insertBefore(_prereqNode, el.shadowRoot.firstChild);
              } catch(e) {}
            }
          } else if (present && existing) {
            existing.remove();
          }
        }
        // 2) Donate footer
        if (el.shadowRoot.querySelector('.donate-section')) return;
        try {
          var _donateTmp = document.createElement('div');
          _donateTmp.innerHTML = DONATE_HTML;
          while (_donateTmp.firstChild) el.shadowRoot.appendChild(_donateTmp.firstChild);
        } catch(e) {}
    // Anti-flicker: watch this card's own shadowRoot so a re-render (innerHTML wipe)
    // re-injects the footer synchronously in the same microtask, before paint.
    if (el.shadowRoot && !el.__haToolsReinjectObs) {
      try {
        el.__haToolsReinjectObs = new MutationObserver(function(){
          if (el.__haToolsReinjecting) return;
          el.__haToolsReinjecting = true;
          try { injectInto(tag, el); } catch(e) {}
          el.__haToolsReinjecting = false;
        });
        el.__haToolsReinjectObs.observe(el.shadowRoot, { childList: true });
      } catch(e) {}
    }
  }
  function injectAll() {
    SPLIT_TAGS.forEach(function(tag){
      deepFindAll(tag).forEach(function(el){ injectInto(tag, el); });
    });
  }
  // Run immediately, then aggressive MutationObserver for late mounts + view switches.
  injectAll();
  setTimeout(injectAll, 250);
  setTimeout(injectAll, 1000);
  setTimeout(injectAll, 3000);
  // MutationObserver catches every new node anywhere in the DOM, including shadow root attachments
  // that are deferred until the user navigates to a view.
  try {
    var obs = new MutationObserver(function(muts){
      // Debounce: schedule a microtask injection
      if (window.__haToolsDonateScheduled) return;
      window.__haToolsDonateScheduled = true;
      setTimeout(function(){ window.__haToolsDonateScheduled = false; injectAll(); }, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch(e) {}
  // Also re-inject on hash/path change (Lovelace view switches)
  window.addEventListener('hashchange', function(){ setTimeout(injectAll, 200); });
  window.addEventListener('popstate', function(){ setTimeout(injectAll, 200); });
  // Backup interval (every 3s for first 5min — handles cases where MutationObserver missed events)
  var pollCount = 0;
  var pollInterval = setInterval(function(){
    injectAll();
    if (++pollCount >= 100) clearInterval(pollInterval);
  }, 3000);
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
    this._ensureBackend();
  }

  _sanitize(str) {
    if (!str) return str;
    try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
  }
  set hass(hass) {
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
    if (!hass) return;
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
    this._backendLoading = false;
    this._backendChildren = [];
    this._backendUnsubEvents = null;
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
    if (this._backendAvailable) return;
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
    if (!hass?.callWS || this._backendDetecting || this._backendChecked) return;
    this._backendDetecting = true;
    try {
      const result = await hass.callWS({ type: 'ha_baby_tracker/list_children' });
      const children = Array.isArray(result?.children) ? result.children : [];
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
      this._backendAvailable = false;
      console.debug('[ha-baby-tracker] backend unavailable, using localStorage fallback', e);
    } finally {
      this._backendDetecting = false;
      this._backendChecked = true;
    }
  }

  async _subscribeBackendEvents() {
    const hass = this.hass;
    if (this._backendUnsubEvents || !hass?.connection?.subscribeEvents) return;
    try {
      this._backendUnsubEvents = await hass.connection.subscribeEvents((event) => {
        const entryId = event?.data?.entry_id;
        if (!entryId || entryId === this._currentBackendEntryId()) {
          this._loadBackendData();
        }
      }, 'ha_baby_tracker_entry_added');
    } catch (e) {
      console.debug('[ha-baby-tracker] event subscription failed', e);
    }
  }

  _currentBackendEntryId() {
    return this.babies?.[this.selectedBaby]?.entry_id || null;
  }

  async _loadBackendData() {
    const hass = this.hass;
    const entryId = this._currentBackendEntryId();
    if (!this._backendAvailable || !hass?.callWS || !entryId || this._backendLoading) return;
    this._backendLoading = true;
    try {
      const baby = this.getCurrentBaby();
      const categories = ['feeding', 'lactation', 'diapers', 'sleep', 'growth', 'bf_sessions'];
      const results = await Promise.all(categories.map((category) => hass.callWS({
        type: 'ha_baby_tracker/get_data',
        entry_id: entryId,
        category,
      })));
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
      if (runningTimers) this._applyBackendTimers(runningTimers);
      this.updateAllDisplays();
      this.renderCard();
    } catch (e) {
      console.warn('Baby and Lactation Tracker: backend load failed', e);
    } finally {
      this._backendLoading = false;
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

  async _addBackendEntry(category, entry) {
    const hass = this.hass;
    const entryId = this._currentBackendEntryId();
    if (!this._backendAvailable || !hass?.callWS || !entryId) return false;
    try {
      await hass.callWS({
        type: 'ha_baby_tracker/add_entry',
        entry_id: entryId,
        category,
        entry,
      });
      return true;
    } catch (e) {
      console.warn('Baby and Lactation Tracker: backend add failed', e);
      return false;
    }
  }

  async _backendTimerStart(kind, side) {
    const hass = this.hass;
    const entryId = this._currentBackendEntryId();
    if (!this._backendAvailable || !hass?.callWS || !entryId) return false;
    try {
      await hass.callWS({
        type: 'ha_baby_tracker/timer_start',
        entry_id: entryId,
        kind,
        ...(side ? { side } : {}),
      });
      return true;
    } catch (e) {
      console.warn('Baby and Lactation Tracker: backend timer start failed', e);
      return false;
    }
  }

  async _backendTimerStop(kind) {
    const hass = this.hass;
    const entryId = this._currentBackendEntryId();
    if (!this._backendAvailable || !hass?.callWS || !entryId) return false;
    try {
      await hass.callWS({
        type: 'ha_baby_tracker/timer_stop',
        entry_id: entryId,
        kind,
      });
      return true;
    } catch (e) {
      console.warn('Baby and Lactation Tracker: backend timer stop failed', e);
      return false;
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

  async _promptLocalMigration() {
    const hass = this.hass;
    const marker = 'ha-baby-tracker-v5-migration-prompted';
    if (!this._backendAvailable || !hass?.callWS || localStorage.getItem(marker)) return;
    const payload = this._buildLocalMigrationPayload();
    if (!payload) return;
    const PL = this._lang === 'pl';
    if (hass.user && !hass.user.is_admin) {
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
    const message = PL
      ? 'Wykryto lokalne dane Baby Tracker w tej przeglądarce. Przenieść je do integracji Home Assistant dla pasujących dzieci?'
      : 'Local Baby Tracker data was found in this browser. Migrate matching children into the Home Assistant integration?';
    if (!confirm(message)) {
      localStorage.setItem(marker, JSON.stringify({ status: 'declined', at: new Date().toISOString() }));
      return;
    }
    try {
      const result = await hass.callWS({ type: 'ha_baby_tracker/migrate_local_data', ...payload });
      localStorage.setItem(marker, JSON.stringify({ status: 'done', at: new Date().toISOString(), result }));
      await this._loadBackendData();
      const unmigrated = result?.unmigrated?.length ? `\nUnmigrated: ${result.unmigrated.join(', ')}` : '';
      alert((PL ? 'Migracja zakończona.' : 'Migration finished.') + unmigrated);
    } catch (e) {
      localStorage.setItem(marker, JSON.stringify({ status: 'failed', at: new Date().toISOString() }));
      console.warn('Baby and Lactation Tracker: migration failed', e);
      this._showToast(PL
        ? 'Migracja nie powiodła się — wymagane uprawnienia administratora lub sprawdź logi HA.'
        : 'Migration failed — admin permissions required, or check HA logs.', 'error');
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
    const title = (this.config.title && this.config.title !== 'ha-baby-tracker') ? this.config.title : this._t.title;
    const currentBaby = this.babies[this.selectedBaby].name;

    const html = `
      <style>${window.HAToolsBentoCSS || ""}
/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
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

</style>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">${title}</h2>
          <div class="baby-selector">
            ${this.babies.map((baby, idx) => `
              <button class="baby-button ${idx === this.selectedBaby ? 'active' : ''}"
                      data-index="${idx}">${_esc(baby.name)}</button>
            `).join('')}
          </div>
        </div>

        <div class="tip-banner" id="tip-banner">
          <button class="tip-dismiss" id="tip-dismiss" aria-label="Dismiss">\u2715</button>
          <div class="tip-banner-title">\u{1F4A1} ${this._lang === 'pl' ? 'Jak zacz\u0105\u0107?' : 'Getting started'}</div>
          <ul>
            ${this._lang === 'pl' ? `
            <li><strong>Zapis danych:</strong> ${this._backendAvailable ? 'dane zapisywane s\u0105 po stronie Home Assistant dla skonfigurowanego dziecka.' : 'dane zapisywane s\u0105 lokalnie w przegl\u0105darce (browser-scoped storage). Dane nie synchronizuj\u0105 si\u0119 mi\u0119dzy urz\u0105dzeniami.'}</li>
            <li><strong>Zak\u0142adki:</strong> Feeding (karmienie), Diapers (pieluchy), Sleep (sen), Growth (wzrost/waga).</li>
            <li><strong>Multi-baby:</strong> dodaj wiele dzieci \u2014 ka\u017Cde ma osobne statystyki w tej przegl\u0105darce.</li>
            <li><strong>Wykresy:</strong> statystyki dnia, tygodnia. Wykresy wzrostu z percentylami WHO.</li>
            <li><strong>Eksport:</strong> u\u017Cyj przycisku <em>Export Data (JSON)</em> aby zachowa\u0107 kopi\u0119 swoich danych.</li>
            ` : `
            <li><strong>Storage:</strong> ${this._backendAvailable ? 'data is stored server-side in Home Assistant for the configured child.' : 'data is stored locally in your browser (browser-scoped storage). Data does not sync between devices.'}</li>
            <li><strong>Tabs:</strong> Feeding, Diapers, Sleep, Growth (weight/height).</li>
            <li><strong>Multi-baby:</strong> add multiple children \u2014 each gets separate statistics in this browser.</li>
            <li><strong>Charts:</strong> daily and weekly stats. Growth charts with WHO percentiles.</li>
            <li><strong>Export:</strong> use the <em>Export Data (JSON)</em> button to keep a copy of your data.</li>
            `}
          </ul>
        </div>

        <div class="tabs" role="tablist">
          ${this.babies.length > 1 ? `
          <div style="display:flex;gap:4px;margin-bottom:12px;padding:0 4px">
            ${this.babies.map((b, i) => `
              <button class="baby-btn" data-baby="${i}" role="button" aria-pressed="${this.selectedBaby === i}" 
                style="padding:6px 14px;border:1.5px solid ${this.selectedBaby === i ? 'var(--bento-primary,#3B82F6)' : 'var(--bento-border,#e2e8f0)'};border-radius:20px;background:${this.selectedBaby === i ? 'rgba(59,130,246,0.1)' : 'transparent'};color:${this.selectedBaby === i ? 'var(--bento-primary,#3B82F6)' : 'var(--bento-text-secondary,#64748B)'};font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">
                👶 ${_esc(b.name)}
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
              <div><strong>${this._lang === 'pl' ? 'Zapis danych:' : 'Storage:'}</strong>
                ${this._lang === 'pl'
                  ? (this._backendAvailable ? 'Dane zapisywane s\u0105 po stronie Home Assistant. Tryb lokalny pozostaje jako fallback bez integracji.' : 'Dane zapisywane s\u0105 lokalnie w przegl\u0105darce. Skorzystaj z przycisku <em>Export Data (JSON)</em> aby zrobi\u0107 kopi\u0119.')
                  : (this._backendAvailable ? 'Data is stored server-side in Home Assistant. Local browser storage remains as the no-backend fallback.' : 'Data is stored locally in your browser. Use the <em>Export Data (JSON)</em> button to keep a backup.')}
              </div>
            </div>
          </div>
        </div>
        </div>
        

        <div class="export-section">
          <button class="btn-secondary" id="exportBtn">📥 Export Data (JSON)</button>
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

    shadowRoot.querySelectorAll('.baby-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedBaby = parseInt(e.target.closest('[data-index]').dataset.index);
        this._loadData();
        this.renderCard();
      });
    });

    shadowRoot.querySelectorAll('.baby-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedBaby = parseInt(e.target.closest('[data-baby]').dataset.baby);
        this._loadData();
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
      this._addBackendEntry('lactation', lactEntry).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
    }

    this.feedingData.get(baby).push(feeding);
    this._addBackendEntry('feeding', feeding).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
    this._addBackendEntry('diapers', diaper).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
    this._backendTimerStart('sleep').then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
      this._backendTimerStop('sleep').then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
    this._addBackendEntry('sleep', sleep).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
    this._addBackendEntry('growth', growth).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
    this._backendTimerStart('bf', side).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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
      this._backendTimerStop('bf').then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
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

  getGridOptions() { return { rows: 10, columns: 12, min_rows: 3, min_columns: 6 }; }

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
      this._addBackendEntry('feeding', feedEntry).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });
    }

    this.lactationData.get(currentBaby).unshift(entry);
    this._addBackendEntry('lactation', entry).then(ok => { if (ok === false) this._showToast(this._lang === 'pl' ? 'Błąd synchronizacji — dane zapisane lokalnie' : 'Sync failed — data saved locally', 'error'); });

    this._saveData();
    this.clearLactationForm();
    this.updateLactationDisplay();
    if (type === 'breastfeed') this.updateAllDisplays();
  }

  _showToast(message, type = 'error') {
    if (!this.shadowRoot) return;
    const toast = document.createElement('div');
    const isError = type === 'error';
    const bgVar = isError ? 'var(--bento-error-light, rgba(239,68,68,0.12))' : 'var(--bento-success-light, rgba(16,185,129,0.12))';
    const borderVar = isError ? 'var(--bento-error-border, rgba(239,68,68,0.35))' : 'var(--bento-success-border, rgba(16,185,129,0.35))';
    const colorVar = isError ? 'var(--bento-error, #EF4444)' : 'var(--bento-success, #10B981)';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      background: bgVar,
      border: '1px solid ' + borderVar,
      color: colorVar,
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
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
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
