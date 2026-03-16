class HaBabyTracker extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.babies = config.babies || [{ name: 'Baby 1' }];
    this.selectedBaby = 0;
    this.selectedTab = 'feeding';
    this.renderCard();
  }

  set hass(hass) {
    this._hass = hass;
  }

  get hass() {
    return this._hass;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.feedingData = new Map();
    this.diapersData = new Map();
    this.sleepData = new Map();
    this.growthData = new Map();
    this.sleepTimer = null;
    this.sleepStartTime = null;
    this.babies = [{ name: 'Baby 1' }];
    this.initializeDataStructures();
  }

  initializeDataStructures() {
    this.babies.forEach(baby => {
      const babyName = baby.name;
      if (!this.feedingData.has(babyName)) {
        this.feedingData.set(babyName, []);
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
  }

  renderCard() {
    const title = this.config.title || 'Baby Tracker';
    const currentBaby = this.babies[this.selectedBaby].name;

    this.shadowRoot.innerHTML = `
      <style>

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:host {
  --bento-bg: #F8FAFC;
  --bento-card: #FFFFFF;
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-text: #1E293B;
  --bento-text-secondary: #64748B;
  --bento-border: #E2E8F0;
  --bento-success: #10B981;
  --bento-warning: #F59E0B;
  --bento-error: #EF4444;
  --bento-radius: 16px;
  --bento-radius-sm: 10px;
  --bento-radius-xs: 6px;
  --bento-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  color-scheme: light !important;
}
* { box-sizing: border-box; }

.card, .card-container, .reports-card, .export-card {
  background: var(--bento-card); border-radius: var(--bento-radius); box-shadow: var(--bento-shadow);
  padding: 28px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--bento-text); border: 1px solid var(--bento-border); animation: fadeSlideIn 0.4s ease-out;
}
.card-header { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--bento-text); letter-spacing: -0.01em; display: flex; justify-content: space-between; align-items: center; }
.card-header h2 { font-size: 20px; font-weight: 700; color: var(--bento-text); margin: 0; letter-spacing: -0.01em; }
.card-title, .title, .header-title, .pan-title { font-size: 20px; font-weight: 700; color: var(--bento-text); letter-spacing: -0.01em; }
.header, .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--bento-border); margin-bottom: 24px; overflow-x: auto; padding-bottom: 0; }
.tab, .tab-btn, .tab-button { padding: 10px 20px; border: none; background: transparent; color: var(--bento-text-secondary); cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: var(--bento-transition); white-space: nowrap; margin-bottom: -2px; border-radius: 8px 8px 0 0; font-family: 'Inter', sans-serif; }
.tab.active, .tab-btn.active, .tab-button.active { color: var(--bento-primary); border-bottom-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.tab:hover, .tab-btn:hover, .tab-button:hover { color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
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
.alert-item:hover { box-shadow: var(--bento-shadow); }
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

        <div class="tabs">
          <button class="tab-button ${this.selectedTab === 'feeding' ? 'active' : ''}" data-tab="feeding">
            ?? Feeding
          </button>
          <button class="tab-button ${this.selectedTab === 'diapers' ? 'active' : ''}" data-tab="diapers">
            ?? Diapers
          </button>
          <button class="tab-button ${this.selectedTab === 'sleep' ? 'active' : ''}" data-tab="sleep">
            ?? Sleep
          </button>
          <button class="tab-button ${this.selectedTab === 'growth' ? 'active' : ''}" data-tab="growth">
            ?? Growth
          </button>
        </div>

        <!-- Feeding Tab -->
        <div class="tab-content ${this.selectedTab === 'feeding' ? 'active' : ''}">
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

        <!-- Diapers Tab -->
        <div class="tab-content ${this.selectedTab === 'diapers' ? 'active' : ''}">
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

        <!-- Sleep Tab -->
        <div class="tab-content ${this.selectedTab === 'sleep' ? 'active' : ''}">
          <div class="timer-display">
            <div class="timer-value" id="timerDisplay">00:00</div>
            <div class="timer-label" id="timerLabel">Sleep Timer</div>
          </div>

          <div class="button-group">
            <button class="btn-primary" id="startSleepBtn">Start Timer</button>
            <button class="btn-danger" id="stopSleepBtn">Stop & Log</button>
          </div>

          <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Manual Entry</h3>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Duration (minutes)</label>
                <input type="number" id="sleepDuration" placeholder="e.g., 45" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" id="sleepDate">
              </div>
            </div>
            <button class="btn-primary" id="addSleepBtn">Log Sleep</button>
          </div>

          <div style="margin-top: 20px;">
            <div class="stat-card" style="grid-column: 1 / -1;">
              <div class="stat-value" id="totalSleep">0h 0m</div>
              <div class="stat-label">Total Sleep Today</div>
            </div>
            <h3 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: 600;">Sleep Log</h3>
            <div id="sleepList"></div>
          </div>
        </div>

        <!-- Growth Tab -->
        <div class="tab-content ${this.selectedTab === 'growth' ? 'active' : ''}">
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

        <div class="export-section">
          <button class="btn-secondary" id="exportBtn">?? Export Data (JSON)</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.setDefaultTimes();
    this.updateAllDisplays();
  }

  attachEventListeners() {
    const shadowRoot = this.shadowRoot;

    shadowRoot.querySelectorAll('.baby-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedBaby = parseInt(e.target.dataset.index);
        this.renderCard();
      });
    });

    shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectedTab = e.target.dataset.tab;
        this.renderCard();
      });
    });

    shadowRoot.getElementById('addFeedingBtn')?.addEventListener('click', () => this.addFeeding());
    shadowRoot.getElementById('clearFeedingBtn')?.addEventListener('click', () => this.clearFeedingForm());
    shadowRoot.getElementById('addDiapersBtn')?.addEventListener('click', () => this.addDiapers());
    shadowRoot.getElementById('clearDiapersBtn')?.addEventListener('click', () => this.clearDiapersForm());
    shadowRoot.getElementById('startSleepBtn')?.addEventListener('click', () => this.startSleepTimer());
    shadowRoot.getElementById('stopSleepBtn')?.addEventListener('click', () => this.stopSleepTimer());
    shadowRoot.getElementById('addSleepBtn')?.addEventListener('click', () => this.addManualSleep());
    shadowRoot.getElementById('addGrowthBtn')?.addEventListener('click', () => this.addGrowth());
    shadowRoot.getElementById('clearGrowthBtn')?.addEventListener('click', () => this.clearGrowthForm());
    shadowRoot.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
  }

  setDefaultTimes() {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateString = now.toISOString().split('T')[0];

    this.shadowRoot.getElementById('feedingTime').value = timeString;
    this.shadowRoot.getElementById('diapersTime').value = timeString;
    this.shadowRoot.getElementById('sleepDate').value = dateString;
    this.shadowRoot.getElementById('growthDate').value = dateString;
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
      alert('Please fill in time and duration/amount');
      return;
    }

    const baby = this.getCurrentBaby();
    const feeding = { type, time, amount, notes, timestamp: Date.now() };
    this.feedingData.get(baby).push(feeding);

    this.clearFeedingForm();
    this.updateAllDisplays();
  }

  clearFeedingForm() {
    this.shadowRoot.getElementById('feedingType').value = 'breast';
    this.shadowRoot.getElementById('feedingAmount').value = '';
    this.shadowRoot.getElementById('feedingNotes').value = '';
    this.setDefaultTimes();
  }

  addDiapers() {
    const type = this.shadowRoot.getElementById('diapersType').value;
    const time = this.shadowRoot.getElementById('diapersTime').value;
    const notes = this.shadowRoot.getElementById('diapersNotes').value;

    if (!time) {
      alert('Please select a time');
      return;
    }

    const baby = this.getCurrentBaby();
    const diaper = { type, time, notes, timestamp: Date.now() };
    this.diapersData.get(baby).push(diaper);

    this.clearDiapersForm();
    this.updateAllDisplays();
  }

  clearDiapersForm() {
    this.shadowRoot.getElementById('diapersType').value = 'wet';
    this.shadowRoot.getElementById('diapersNotes').value = '';
    this.setDefaultTimes();
  }

  startSleepTimer() {
    if (this.sleepTimer) return;
    this.sleepStartTime = Date.now();
    this.sleepTimer = setInterval(() => this.updateTimerDisplay(), 100);
  }

  stopSleepTimer() {
    if (!this.sleepTimer) return;
    clearInterval(this.sleepTimer);
    const duration = Math.round((Date.now() - this.sleepStartTime) / 60000);
    this.sleepTimer = null;
    this.sleepStartTime = null;

    if (duration > 0) {
      const baby = this.getCurrentBaby();
      const now = new Date();
      const sleep = {
        duration,
        date: now.toISOString().split('T')[0],
        timestamp: Date.now()
      };
      this.sleepData.get(baby).push(sleep);
      this.updateAllDisplays();
    }
    this.updateTimerDisplay();
  }

  addManualSleep() {
    const duration = parseInt(this.shadowRoot.getElementById('sleepDuration').value);
    const date = this.shadowRoot.getElementById('sleepDate').value;

    if (!duration || !date) {
      alert('Please fill in duration and date');
      return;
    }

    const baby = this.getCurrentBaby();
    const sleep = { duration, date, timestamp: Date.now() };
    this.sleepData.get(baby).push(sleep);

    this.shadowRoot.getElementById('sleepDuration').value = '';
    this.updateAllDisplays();
  }

  addGrowth() {
    const type = this.shadowRoot.getElementById('growthType').value;
    const value = parseFloat(this.shadowRoot.getElementById('growthValue').value);
    const date = this.shadowRoot.getElementById('growthDate').value;

    if (!value || !date) {
      alert('Please fill in value and date');
      return;
    }

    const baby = this.getCurrentBaby();
    const growth = { type, value, date, timestamp: Date.now() };
    this.growthData.get(baby).push(growth);

    this.clearGrowthForm();
    this.updateAllDisplays();
  }

  clearGrowthForm() {
    this.shadowRoot.getElementById('growthValue').value = '';
    this.setDefaultTimes();
  }

  updateTimerDisplay() {
    if (!this.sleepTimer || !this.sleepStartTime) {
      this.shadowRoot.getElementById('timerDisplay').textContent = '00:00';
      return;
    }

    const elapsed = Math.floor((Date.now() - this.sleepStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.shadowRoot.getElementById('timerDisplay').textContent = display;
  }

  updateAllDisplays() {
    this.updateFeedingList();
    this.updateDiapersList();
    this.updateSleepList();
    this.updateGrowthChart();
  }

  updateFeedingList() {
    const baby = this.getCurrentBaby();
    const feedings = this.feedingData.get(baby) || [];
    const listContainer = this.shadowRoot.getElementById('feedingList');
    const icons = { breast: '??', bottle: '??', solid: '??' };

    if (feedings.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No feedings logged yet</div></div>';
      return;
    }

    listContainer.innerHTML = feedings.slice(-5).reverse().map(f => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${f.time}</div>
          <div class="list-item-title">${icons[f.type]} ${f.type.charAt(0).toUpperCase() + f.type.slice(1)}</div>
          <div class="list-item-subtitle">${f.amount}${f.notes ? ' • ' + f.notes : ''}</div>
        </div>
      </div>
    `).join('');
  }

  updateDiapersList() {
    const baby = this.getCurrentBaby();
    const diapers = this.diapersData.get(baby) || [];
    const listContainer = this.shadowRoot.getElementById('diapersLis');
    const icons = { wet: '??', dirty: '??', both: '????' };

    const today = new Date().toISOString().split('T')[0];
    const todayDiapers = diapers.filter(d => {
      const [h, m] = d.time.split(':');
      const diapDate = new Date();
      diapDate.setHours(parseInt(h), parseInt(m), 0);
      return diapDate.toISOString().split('T')[0] === today;
    });

    const wetCount = todayDiapers.filter(d => d.type === 'wet' || d.type === 'both').length;
    const dirtyCount = todayDiapers.filter(d => d.type === 'dirty' || d.type === 'both').length;

    this.shadowRoot.getElementById('wetCount').textContent = wetCount;
    this.shadowRoot.getElementById('dirtyCount').textContent = dirtyCount;

    if (diapers.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No diaper changes logged yet</div></div>';
      return;
    }

    listContainer.innerHTML = diapers.slice(-5).reverse().map(d => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${d.time}</div>
          <div class="list-item-title">${icons[d.type]} ${d.type.charAt(0).toUpperCase() + d.type.slice(1)}</div>
          ${d.notes ? `<div class="list-item-subtitle">${d.notes}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  updateSleepList() {
    const baby = this.getCurrentBaby();
    const sleeps = this.sleepData.get(baby) || [];
    const listContainer = this.shadowRoot.getElementById('sleepList');

    const today = new Date().toISOString().split('T')[0];
    const todaySleep = sleeps.filter(s => s.date === today);
    const totalMinutes = todaySleep.reduce((sum, s) => sum + s.duration, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    this.shadowRoot.getElementById('totalSleep').textContent = `${hours}h ${minutes}m`;

    if (sleeps.length === 0) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No sleep logged yet</div></div>';
      return;
    }

    listContainer.innerHTML = sleeps.slice(-5).reverse().map(s => `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-time">${s.date}</div>
          <div class="list-item-title">?? Sleep</div>
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

    if (growths.length === 0) {
      canvas.style.display = 'none';
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">No measurements logged yet</div></div>';
      return;
    }

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    const weights = growths.filter(g => g.type === 'weight').sort((a, b) => new Date(a.date) - new Date(b.date));

    if (weights.length > 0) {
      this.drawChart(ctx, weights);
    }

    const icons = { weight: '??', height: '??', headCirc: '??' };
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
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || 'var(--primary-color, #03a9f4)';
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

  exportData() {
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

  static getStubConfig() {
    return {
      type: 'custom:ha-baby-tracker',
      title: 'Baby Tracker',
      babies: [{ name: 'Baby 1' }]
    };
  }
}

customElements.define('ha-baby-tracker', HaBabyTracker);
