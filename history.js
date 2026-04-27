// history.js — TypePulse Typing History Page

// ---------- Theme Definitions ----------
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
  root.style.setProperty('--surface-color', adjustBrightness(t.bg, -8));
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

function adjustBrightness(hex, amount) {
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

document.addEventListener('DOMContentLoaded', () => {
  const historyList = document.getElementById('history-list');
  const emptyState = document.getElementById('empty-state');
  const statsBanner = document.getElementById('stats-banner');
  const totalSessionsEl = document.getElementById('total-sessions');
  const bestWpmEl = document.getElementById('best-wpm');
  const avgAccuracyEl = document.getElementById('avg-accuracy');
  const avgWpmEl = document.getElementById('avg-wpm');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Load and apply theme
  chrome.storage.local.get(['selectedTheme'], (data) => {
    applyThemeToDocument(data.selectedTheme || 'dark');
  });

  // Load and render history
  loadHistory();

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all typing history?')) {
      chrome.storage.local.remove(['sessionsHistory'], () => {
        loadHistory();
      });
    }
  });

  function loadHistory() {
    chrome.storage.local.get(['sessionsHistory'], (data) => {
      const sessions = Array.isArray(data.sessionsHistory) ? data.sessionsHistory : [];
      renderHistory(sessions);
      renderStats(sessions);
    });
  }

  function renderStats(sessions) {
    if (sessions.length === 0) {
      totalSessionsEl.textContent = '0';
      bestWpmEl.textContent = '-';
      avgAccuracyEl.textContent = '-';
      avgWpmEl.textContent = '-';
      return;
    }

    totalSessionsEl.textContent = sessions.length;

    const wpmValues = sessions.map(s => s.wpm || 0);
    const bestWpm = Math.max(...wpmValues);
    const avgWpm = Math.round(wpmValues.reduce((sum, val) => sum + val, 0) / sessions.length);

    const accValues = sessions.map(s => s.accuracy || 0);
    const avgAcc = Math.round(accValues.reduce((sum, val) => sum + val, 0) / sessions.length);

    bestWpmEl.textContent = bestWpm;
    avgWpmEl.textContent = avgWpm ?? '-';
    avgAccuracyEl.textContent = avgAcc + '%';
  }

  function renderHistory(sessions) {
    historyList.innerHTML = '';

    if (sessions.length === 0) {
      emptyState.classList.remove('hidden');
      statsBanner.style.display = 'none';
      return;
    }

    emptyState.classList.add('hidden');
    statsBanner.style.display = 'grid';

    // Show most recent first
    const ordered = [...sessions].reverse();

    ordered.forEach((session, idx) => {
      const entry = document.createElement('div');
      entry.className = 'history-entry';
      entry.setAttribute('data-index', sessions.length - 1 - idx); // original index

      const dateObj = new Date(session.date);
      const dateStr = formatDate(dateObj);
      const timeStr = formatTime(dateObj);
      const textSnippet = truncate(session.text || '', 80);
      const sourceTitle = session.sourceTitle || 'Original Page';
      const sourceUrl = session.url || '#';

      entry.innerHTML = `
        <div class="entry-date">
          <span class="date-part">${dateStr}</span>
          <span class="time-part">${timeStr}</span>
        </div>
        <div class="entry-divider"></div>
        <div class="entry-stats">
          <div class="entry-stat">
            <span class="stat-label">WPM</span>
            <span class="stat-value highlight">${session.wpm}</span>
          </div>
          <div class="entry-stat">
            <span class="stat-label">Accuracy</span>
            <span class="stat-value">${session.accuracy}%</span>
          </div>
          <div class="entry-stat">
            <span class="stat-label">Errors</span>
            <span class="stat-value">${session.errors ?? 0}</span>
          </div>
          <div class="entry-stat">
            <span class="stat-label">Time</span>
            <span class="stat-value">${session.time ?? '-'}s</span>
          </div>
        </div>
        <div class="entry-text" title="${escapeHtml(session.text || '')}">${escapeHtml(textSnippet)}</div>
        <div class="entry-source">
          ${session.url ? `
            <a href="${session.url}" target="_blank" class="source-link" title="${escapeHtml(session.url)}">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              ${escapeHtml(truncate(sourceTitle, 30))}
            </a>
          ` : ''}
        </div>
        <div class="entry-actions">
          <button class="btn btn-primary btn-sm retype-btn" title="Retype this text">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Retype
          </button>
        </div>
      `;

      // Bind retype button
      const retypeBtn = entry.querySelector('.retype-btn');
      retypeBtn.addEventListener('click', () => {
        handleRetype(session);
      });

      historyList.appendChild(entry);
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

  function truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
