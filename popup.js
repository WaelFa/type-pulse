// Popup script

// ---------- Theme Definitions (MonkeyType-inspired) ----------
const themes = {
  dark:     { bg: '#323437', text: '#d1d0c5', sub: '#646669', main: '#e2b714', caret: '#e2b714', error: '#ca4754' },
  latte:    { bg: '#f6e6d8', text: '#454345', sub: '#826d64', main: '#7f5539', caret: '#7f5539', error: '#e59e80' },
  matcha:   { bg: '#ebf9f0', text: '#b1d3e0', sub: '#82cdaa', main: '#1c2020', caret: '#1c2020', error: '#c38080' },
  bingus:   { bg: '#221b4f', text: '#4e2e7c', sub: '#6800ff', main: '#00ffff', caret: '#00ffff', error: '#ff5577' },
  carbon:   { bg: '#191919', text: '#9b9b9b', sub: '#525252', main: '#c19549', caret: '#c19549', error: '#d04040' },
  dracula:  { bg: '#282a36', text: '#f8f8f2', sub: '#6272a4', main: '#bd93f9', caret: '#bd93f9', error: '#ff5555' },
  revo:     { bg: '#214082', text: '#f6e6d8', sub: '#826d64', main: '#d2a8ff', caret: '#d2a8ff', error: '#ff8080' },
  honeybee: { bg: '#f5e050', text: '#310808', sub: '#6b441d', main: '#f7b068', caret: '#f7b068', error: '#d14242' },
};

// ---------- Helpers ----------
function applyThemeToDocument(themeName) {
  const t = themes[themeName];
  if (!t) return;
  const root = document.documentElement;
  root.style.setProperty('--bg-color', t.bg);
  root.style.setProperty('--text-color', t.text);
  root.style.setProperty('--sub-color', t.sub);
  root.style.setProperty('--main-color', t.main);
  root.style.setProperty('--caret-color', t.caret);
  root.style.setProperty('--error-color', t.error);
  // surface is slightly altered bg
  root.style.setProperty('--surface-color', adjustBrightness(t.bg, t, -8));
}

function darken(hex, amount) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r - amount));
  g = Math.max(0, Math.min(255, g - amount));
  b = Math.max(0, Math.min(255, b - amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function lighten(hex, amount) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function adjustBrightness(hex, theme, amount) {
  // For dark themes darken, for light themes lighten
  const isLight = isLightColor(hex);
  return isLight ? darken(hex, Math.abs(amount)) : lighten(hex, Math.abs(amount));
}

function isLightColor(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function renderThemeCircles(container, themeName) {
  const t = themes[themeName];
  if (!t) return;
  container.innerHTML = '';
  // Show main, sub, and bg as circles
  const colors = [t.main, t.sub, t.bg];
  colors.forEach(c => {
    const circle = document.createElement('div');
    circle.className = 'theme-circle';
    circle.style.backgroundColor = c;
    container.appendChild(circle);
  });
}

function initCustomSelect() {
  const customSelect = document.getElementById('theme-custom-select');
  const selectedItem = document.getElementById('theme-selected-item');
  const optionsList = document.getElementById('theme-options-list');
  const currentName = document.getElementById('current-theme-name');
  const currentCircles = document.getElementById('current-theme-circles');

  if (!customSelect || !selectedItem || !optionsList) return;

  // Render initial state
  chrome.storage.local.get(['selectedTheme'], (data) => {
    const themeName = data.selectedTheme || 'dark';
    currentName.textContent = themeName;
    renderThemeCircles(currentCircles, themeName);
    applyThemeToDocument(themeName);
  });

  // Generate options
  optionsList.innerHTML = '';
  Object.keys(themes).forEach(themeName => {
    const option = document.createElement('div');
    option.className = 'select-option';
    option.innerHTML = `<span>${themeName}</span>`;
    const circles = document.createElement('div');
    circles.className = 'theme-circles';
    renderThemeCircles(circles, themeName);
    option.appendChild(circles);

    option.addEventListener('click', (e) => {
      e.stopPropagation();
      currentName.textContent = themeName;
      renderThemeCircles(currentCircles, themeName);
      optionsList.classList.add('select-hide');
      customSelect.classList.remove('active');

      chrome.storage.local.set({ selectedTheme: themeName });
      applyThemeToDocument(themeName);
      notifyContentScriptOfThemeChange(themeName);
    });
    optionsList.appendChild(option);
  });

  // Toggle dropdown
  selectedItem.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = optionsList.classList.toggle('select-hide');
    customSelect.classList.toggle('active', !isHidden);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    optionsList.classList.add('select-hide');
    customSelect.classList.remove('active');
  });
}

function notifyContentScriptOfThemeChange(themeName) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'apply_theme', theme: themeName }, () => {
      void chrome.runtime.lastError;
    });
  });
}

function renderRecentActivity() {
  const recentActivity = document.getElementById('recent-activity');
  const recentList = document.getElementById('recent-list');
  if (!recentActivity || !recentList) return;

  chrome.storage.local.get(['sessionsHistory'], (data) => {
    const sessions = Array.isArray(data.sessionsHistory) ? data.sessionsHistory : [];
    if (sessions.length === 0) {
      recentActivity.classList.add('hidden');
      return;
    }

    recentActivity.classList.remove('hidden');
    recentList.innerHTML = '';

    // Take the last 3 sessions and show most recent first
    const lastThree = sessions.slice(-3).reverse();

    lastThree.forEach(session => {
      const card = document.createElement('div');
      card.className = 'mini-history-card';

      const dateObj = new Date(session.date);
      const dateStr = formatDate(dateObj);
      const timeStr = formatTime(dateObj);
      const textSnippet = session.text ? session.text.substring(0, 35) + '...' : '-';
      const sourceTitle = session.sourceTitle || 'Original Page';

      card.innerHTML = `
        <div class="mini-card-top">
          <div class="mini-date-box">
            <span class="mini-date-part">${dateStr}</span>
            <span class="mini-time-part">${timeStr}</span>
          </div>
          <div class="mini-v-divider"></div>
          <div class="mini-stats-row">
            <div class="mini-stat-item">
              <span class="mini-stat-label">WPM</span>
              <span class="mini-stat-value highlight">${session.wpm}</span>
            </div>
            <div class="mini-stat-item">
              <span class="mini-stat-label">ACC</span>
              <span class="mini-stat-value">${session.accuracy}%</span>
            </div>
            <div class="mini-stat-item">
              <span class="mini-stat-label">ERR</span>
              <span class="mini-stat-value">${session.errors ?? 0}</span>
            </div>
            <div class="mini-stat-item">
              <span class="mini-stat-label">TIME</span>
              <span class="mini-stat-value">${session.time ?? '-'}s</span>
            </div>
          </div>
          <button class="mini-retype-btn" title="Retype this text">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Retype
          </button>
        </div>
        <div class="mini-card-bottom">
          <div class="mini-text-snippet" title="${session.text || ''}">${textSnippet}</div>
          ${session.url ? `
            <a href="${session.url}" target="_blank" class="mini-source-link" title="${session.url}">
              <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              ${sourceTitle}
            </a>
          ` : ''}
        </div>
      `;

      const retypeBtn = card.querySelector('.mini-retype-btn');
      retypeBtn.addEventListener('click', () => {
        handleRetype(session);
      });

      recentList.appendChild(card);
    });
  });
}

function handleRetype(session) {
  const { text, url } = session;
  if (!text) return;
  chrome.runtime.sendMessage({ action: 'retype_request', text, url });
}

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(2);
  return `${month}/${day}/${year}`;
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  const selectionButtonToggle = document.getElementById('selection-button-toggle');
  const viewHistoryBtn = document.getElementById('view-history-btn');

  // Initialize Custom Select
  initCustomSelect();

  // Render Recent Activity
  renderRecentActivity();

  // Restore settings
  chrome.storage.local.get(['showSelectionButton'], (data) => {
    selectionButtonToggle.checked = data.showSelectionButton !== false;
  });

  // Selection button toggle
  selectionButtonToggle.addEventListener('change', () => {
    const enabled = selectionButtonToggle.checked;
    chrome.storage.local.set({ showSelectionButton: enabled });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'selection_button_setting_changed', enabled }, () => {
        void chrome.runtime.lastError;
      });
    });
  });

  // History button
  viewHistoryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  });
});
