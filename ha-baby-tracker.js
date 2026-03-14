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
        :host {
          --primary-text: var(--primary-text-color, #212121);
          --secondary-text: var(--secondary-text-color, #727272);
          --card-bg: var(--card-background-color, #ffffff);
          --primary: var(--primary-color, #1976d2);
          --divider: var(--divider-color, #e0e0e0);
          --surface: var(--ha-card-background, #ffffff);
        }

        .card {
          background: var(--card-bg);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--primary-text);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--divider);
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
          border: 2px solid var(--divider);
          background: transparent;
          color: var(--primary-text);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .baby-button:hover {
          border-color: var(--primary);
          background: rgba(25, 118, 210, 0.05);
        }

        .baby-button.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid var(--divider);
          overflow-x: auto;
        }

        .tab-button {
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--secondary-text);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-button:hover {
          color: var(--primary-text);
        }

        .tab-button.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
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
          color: var(--primary-text);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-row.full {
          grid-template-columns: 1fr;
        }

        input, select, textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--divider);
          border-radius: 6px;
          background: var(--surface);
          color: var(--primary-text);
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--primary);
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
          background: var(--primary);
          color: white;
        }

        .btn-primary:hover {
          opacity: 0.9;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        }

        .btn-secondary {
          background: transparent;
          color: var(--primary);
          border: 1px solid var(--primary);
        }

        .btn-secondary:hover {
          background: rgba(25, 118, 210, 0.05);
        }

        .btn-danger {
          background: #f44336;
          color: white;
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
          border: 1px solid var(--divider);
          border-radius: 6px;
          margin-bottom: 8px;
          background: rgba(0, 0, 0, 0.02);
        }

        .list-item-content {
          flex: 1;
        }

        .list-item-time {
          font-size: 12px;
          color: var(--secondary-text);
          margin-bottom: 4px;
        }

        .list-item-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text);
        }

        .list-item-subtitle {
          font-size: 12px;
          color: var(--secondary-text);
          margin-top: 4px;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          background: var(--primary);
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
          border: 2px dashed var(--primary);
        }

        .timer-value {
          font-size: 48px;
          font-weight: 700;
          color: var(--primary);
          font-variant-numeric: tabular-nums;
        }

        .timer-label {
          font-size: 12px;
          color: var(--secondary-text);
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
          border: 1px solid var(--divider);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--primary);
        }

        .stat-label {
          font-size: 12px;
          color: var(--secondary-text);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .growth-chart {
          width: 100%;
          max-width: 100%;
          margin: 20px 0;
          border: 1px solid var(--divider);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.02);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--secondary-text);
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
          border-top: 1px solid var(--divider);
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
            🍼 Feeding
          </button>
          <button class="tab-button ${this.selectedTab === 'diapers' ? 'active' : ''}" data-tab="diapers">
            🩷 Diapers
          </button>
          <button class="tab-button ${this.selectedTab === 'sleep' ? 'active' : ''}" data-tab="sleep">
            😴 Sleep
          </button>
          <button class="tab-button ${this.selectedTab === 'growth' ? 'active' : ''}" data-tab="growth">
            📏 Growth
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
          <button class="btn-secondary" id="exportBtn">📥 Export Data (JSON)</button>
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
    const icons = { breast: '🤱', bottle: '🍼', solid: '🥣' };

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
