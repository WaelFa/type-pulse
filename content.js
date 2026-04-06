// Content script — injects typing overlay into pages

// ---------- State ----------
let state = {
  enabled: false,
  active: false,
  targetText: '',
  currentIndex: 0,
  startTime: null,
  correctKeystrokes: 0,
  totalKeystrokes: 0,
  errors: 0,
  errorPositions: new Set(),
  wpmHistory: [],
  timerId: null,
};

// ---------- Overlay Elements ----------
let overlayPanel = null;
let overlayBackdrop = null;
let floatingBtn = null;

function createFloatingButton() {
  if (floatingBtn) return;
  floatingBtn = document.createElement('div');
  floatingBtn.id = 'typepulse-floating-btn';
  floatingBtn.title = 'Start Typing with TypePulse';
  floatingBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
    </svg>
  `;
  
  floatingBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  floatingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideFloatingButton();
    createOverlayPanel();
  });
  
  document.body.appendChild(floatingBtn);
}

function showFloatingButton(x, y) {
  if (!floatingBtn) createFloatingButton();
  floatingBtn.style.display = 'flex';
  floatingBtn.style.left = `${x}px`;
  floatingBtn.style.top = `${y}px`;
}

function hideFloatingButton() {
  if (floatingBtn) {
    floatingBtn.style.display = 'none';
  }
}

function handleMouseUp(e) {
  // Wait a tiny bit for selection to be updated
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0) {
      if (overlayPanel) return; // Don't show if overlay is already open
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Position the button above the selection, centered
      const x = rect.left + (rect.width / 2) - 20 + window.scrollX;
      const y = rect.top - 50 + window.scrollY;
      
      showFloatingButton(x, y);
    } else {
      // If clicking outside the button and no text is selected, hide it
      if (floatingBtn && e.target !== floatingBtn && !floatingBtn.contains(e.target)) {
        hideFloatingButton();
      }
    }
  }, 10);
}

document.addEventListener('mouseup', handleMouseUp);
window.addEventListener('resize', hideFloatingButton);
document.addEventListener('mousedown', (e) => {
  if (floatingBtn && e.target !== floatingBtn && !floatingBtn.contains(e.target)) {
     // Optional: could hide on mousedown too, but mouseup handles it
  }
});

function createOverlayPanel() {
  hideFloatingButton();
  // Hide any existing panels
  removePanels();

  // Get the text the user has highlighted on the page
  let selection = window.getSelection().toString().trim();
  if (!selection) {
    showToast('Please highlight text on the page first, then click the extension icon.');
    return;
  }

  // Clean up the text: normalize whitespace, remove extra newlines
  state.targetText = selection.split(/\s+/).join(' ').replace(/\s+/g, ' ');

  // Add active class for body blur
  document.body.classList.add('typing-overlay-active');

  // --- Backdrop ---
  overlayBackdrop = document.createElement('div');
  overlayBackdrop.id = 'typing-overlay-backdrop';
  document.body.appendChild(overlayBackdrop);

  // --- Main overlay panel ---
  overlayPanel = document.createElement('div');
  overlayPanel.id = 'typing-overlay-panel';
  
  // Block propagation to prevent the page from reacting to clicks
  overlayPanel.addEventListener('mousedown', (e) => e.stopPropagation());
  overlayPanel.addEventListener('keydown', (e) => e.stopPropagation());
  overlayPanel.addEventListener('keyup', (e) => e.stopPropagation());
  overlayPanel.addEventListener('keypress', (e) => e.stopPropagation());

  overlayPanel.innerHTML = `
    <div class="overlay-header-modern">
      <div class="overlay-logo">
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
        TypePulse
      </div>
      <div class="overlay-stats-top" id="overlay-stats-top">
        <div class="stat-item"><span class="stat-val" id="stats-time">0</span>s</div>
        <div class="stat-item"><span class="stat-val" id="stats-wpm">0</span> wpm</div>
        <div class="stat-item"><span class="stat-val" id="stats-accuracy">100</span>% acc</div>
      </div>
      <div class="overlay-close-modern" id="overlay-close-btn" title="Close">
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </div>
    </div>
    <div class="overlay-input-wrapper-modern" id="overlay-input-wrapper">
      <div class="overlay-text-display-modern" id="overlay-text-display"></div>
      <div id="overlay-caret"></div>
      <input class="overlay-hidden-input" id="overlay-textarea" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
    </div>
    <div class="overlay-controls-modern">
      <button id="overlay-reset-btn" class="overlay-btn-modern" title="Restart Text">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        Restart Text
      </button>
    </div>
  `;

  // Append to body
  document.body.appendChild(overlayPanel);

  // Render the target text into the display
  renderTextDisplay();

  // --- Bind events on the hidden input ---
  const textarea = document.getElementById('overlay-textarea');
  textarea.focus();

  textarea.addEventListener('input', handleInput);
  
  // Prevent tabbing out
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      resetSession();
    }
  });

  // Keep focus on the hidden input even if user clicks elsewhere in the overlay
  overlayPanel.addEventListener('click', () => {
    textarea.focus();
  });
  overlayBackdrop.addEventListener('click', () => {
    finishSession();
  });

  // Close / reset buttons
  document.getElementById('overlay-close-btn').addEventListener('click', finishSession);
  document.getElementById('overlay-reset-btn').addEventListener('click', resetSession);

  // Capture ALL keyboard events so the underlying page doesn't receive them
  window.addEventListener('keydown', captureWindowKeys, true);
  
  // Resize handler to adjust caret position
  window.addEventListener('resize', updateCaretPosition);
}

function captureWindowKeys(e) {
  if (!overlayPanel) return; // double check
  // Do not affect the developer tools or reload
  if (e.key === 'F12' || (e.metaKey && e.key === 'r') || (e.ctrlKey && e.key === 'r')) return;
  // If user presses Escape, let it close the modal
  if (e.key === 'Escape' && e.type === 'keydown') {
    finishSession();
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  
  // To absolutely prevent underlying page from doing things with shortcuts,
  // we check if focus is NOT in our textarea, and put it there.
  const textarea = document.getElementById('overlay-textarea');
  if (document.activeElement !== textarea) {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
       textarea.focus();
    }
  }
}

function renderTextDisplay() {
  const display = document.getElementById('overlay-text-display');
  if (!display) return;

  let html = '';
  // Span per character for perfect caret positioning
  for (let i = 0; i < state.targetText.length; i++) {
    let cls = 'char';
    if (i < state.currentIndex) {
      cls += state.errorPositions.has(i) ? ' error' : ' done';
    }
    const ch = state.targetText[i] === ' ' ? '&nbsp;' : escapeHtml(state.targetText[i]);
    html += `<span class="${cls}" id="char-${i}">${ch}</span>`;
  }
  // Add a placeholder span at the end for the caret when text is finished
  html += `<span id="char-end" style="display:inline-block; width:1px; height:1em;"></span>`;
  display.innerHTML = html;
  
  // We need a small timeout to allow the browser to paint spans before getting offsetLeft
  setTimeout(updateCaretPosition, 10);
}

function updateCaretPosition() {
  const caret = document.getElementById('overlay-caret');
  const display = document.getElementById('overlay-text-display');
  if (!caret || !display) return;

  const charEl = document.getElementById(`char-${state.currentIndex}`) || document.getElementById('char-end');
  if (charEl) {
    caret.style.left = charEl.offsetLeft + 'px';
    // Center the caret vertically relative to the character
    const charHeight = charEl.offsetHeight || 32;
    caret.style.top = (charEl.offsetTop + (charHeight - caret.offsetHeight) / 2) + 'px';
  }
  
  if (state.active) {
    caret.classList.add('typing');
  } else {
    caret.classList.remove('typing');
  }

  // Scroll to follow the caret
  if (charEl) {
    const wrapper = document.getElementById('overlay-input-wrapper');
    if (wrapper) {
      const topPos = charEl.offsetTop;
      const height = wrapper.offsetHeight;
      const currentScroll = wrapper.scrollTop;

      // If caret is below the visible area or too close to bottom, scroll down
      if (topPos > currentScroll + height - 100) {
        wrapper.scrollTo({ top: topPos - 100, behavior: 'smooth' });
      } 
      // If caret is above the visible area, scroll up
      else if (topPos < currentScroll + 50) {
        wrapper.scrollTo({ top: Math.max(0, topPos - 50), behavior: 'smooth' });
      }
    }
  }
}

function escapeHtml(ch) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return map[ch] || ch;
}

// ---------- Typing Logic ----------
function handleInput(e) {
  if (!state.active) {
    state.active = true;
    state.startTime = Date.now();
    startTimer();
    const statsTop = document.getElementById('overlay-stats-top');
    if (statsTop) statsTop.classList.add('typing-started');
  }

  const textarea = e.target;
  let typed = textarea.value;

  // Prevent input larger than target length
  if (typed.length > state.targetText.length) {
    typed = typed.substring(0, state.targetText.length);
    textarea.value = typed;
  }

  // Reset: clear errors so far, re-check
  state.errorPositions.clear();
  state.errors = 0;
  state.correctKeystrokes = 0;
  state.totalKeystrokes = 0;

  for (let i = 0; i < typed.length; i++) {
    state.totalKeystrokes++;
    if (typed[i] === state.targetText[i]) {
      state.correctKeystrokes++;
    } else {
      state.errors++;
      state.errorPositions.add(i);
    }
  }

  state.currentIndex = typed.length;

  // Update stats
  updateStats();
  renderTextDisplay();

  // Check completion: finished whenever typed length matches target
  if (typed.length >= state.targetText.length) {
    sessionComplete();
  }
}

// ---------- Stats ----------
function startTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if (!state.active) return;
    const elapsed = (Date.now() - state.startTime) / 1000;
    const timeEl = document.getElementById('stats-time');
    if (timeEl) timeEl.textContent = Math.floor(elapsed);

    // Live WPM update
    const wpm = state.currentIndex > 0 ? Math.round((state.currentIndex / 5) / (elapsed / 60)) : 0;
    const wpmEl = document.getElementById('stats-wpm');
    if (wpmEl) wpmEl.textContent = wpm;
  }, 1000);
}

function updateStats() {
  const total = state.totalKeystrokes;
  const accuracy = total > 0 ? Math.round((state.correctKeystrokes / total) * 100) : 100;
  
  const accEl = document.getElementById('stats-accuracy');
  if (accEl) accEl.textContent = accuracy;
}

function calculateSessionStats() {
  const elapsedMinutes = (Date.now() - state.startTime) / 1000 / 60;
  const elapsedSeconds = (Date.now() - state.startTime) / 1000;
  // Monkeytype WPM = (chars / 5) / minutes
  const wpm = elapsedMinutes > 0 ? Math.round((state.targetText.length / 5) / elapsedMinutes) : 0;
  // Raw WPM = (total keystrokes / 5) / minutes
  const rawWpm = elapsedMinutes > 0 ? Math.round((state.totalKeystrokes / 5) / elapsedMinutes) : 0;
  const total = state.totalKeystrokes;
  const accuracy = total > 0 ? Math.round((state.correctKeystrokes / total) * 100) : 100;
  
  return {
    wpm,
    rawWpm,
    accuracy,
    errors: state.errors,
    characters: state.targetText.length,
    totalKeystrokes: total,
    time: Math.round(elapsedSeconds),
    date: new Date().toISOString(),
  };
}

function sessionComplete() {
  clearInterval(state.timerId);
  state.active = false;
  state.timerId = null;

  const stats = calculateSessionStats();

  // Hide the typing interface
  const headerStats = document.getElementById('overlay-stats-top');
  if (headerStats) headerStats.classList.add('hidden');
  
  const inputArea = document.getElementById('overlay-input-wrapper');
  if (inputArea) inputArea.classList.add('hidden');
  
  const controls = document.querySelector('.overlay-controls-modern');
  if (controls) controls.classList.add('hidden');

  // Create results view
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'overlay-results-modern';
  resultsDiv.innerHTML = `
    <div class="results-main">
      <div class="results-left">
        <div class="result-big-item">
          <span class="result-big-label">wpm</span>
          <span class="result-big-val">${stats.wpm}</span>
        </div>
        <div class="result-big-item">
          <span class="result-big-label">acc</span>
          <span class="result-big-val">${stats.accuracy}%</span>
        </div>
      </div>
      <div class="results-grid">
        <div class="result-small-item">
          <span class="result-small-label">raw</span>
          <span class="result-small-val">${stats.rawWpm}</span>
        </div>
        <div class="result-small-item">
          <span class="result-small-label">characters</span>
          <span class="result-small-val">${stats.characters}</span>
        </div>
        <div class="result-small-item">
          <span class="result-small-label">time</span>
          <span class="result-small-val">${stats.time}s</span>
        </div>
      </div>
    </div>
    <div class="results-footer">
      <button id="results-restart-btn" class="footer-btn" title="Next Test">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        <span>Next Test</span>
      </button>
      <button id="results-close-btn" class="footer-btn" title="Close">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span>Close</span>
      </button>
    </div>
  `;
  
  overlayPanel.appendChild(resultsDiv);

  // Bind result buttons
  document.getElementById('results-restart-btn').addEventListener('click', () => {
    resultsDiv.remove();
    headerStats.classList.remove('hidden');
    inputArea.classList.remove('hidden');
    controls.classList.remove('hidden');
    resetSession();
  });
  
  document.getElementById('results-close-btn').addEventListener('click', finishSession);

  // Save stats
  try {
     chrome.runtime.sendMessage({ action: 'save_stats', stats });
  } catch (err) {}
}

function finishSession() {
  clearInterval(state.timerId);
  removePanels();
  resetState();
}

function resetSession() {
  clearInterval(state.timerId);
  resetState();
  resetUI();
  const textarea = document.getElementById('overlay-textarea');
  if (textarea) textarea.focus();
}

function resetState() {
  state.active = false;
  state.currentIndex = 0;
  state.startTime = null;
  state.correctKeystrokes = 0;
  state.totalKeystrokes = 0;
  state.errors = 0;
  state.errorPositions.clear();
  state.wpmHistory = [];
}

function resetUI() {
  const textarea = document.getElementById('overlay-textarea');
  if (textarea) {
    textarea.value = '';
    textarea.disabled = false;
  }
  const wpmEl = document.getElementById('stats-wpm');
  if (wpmEl) wpmEl.textContent = '0';
  const accEl = document.getElementById('stats-accuracy');
  if (accEl) accEl.textContent = '100';
  const timeEl = document.getElementById('stats-time');
  if (timeEl) timeEl.textContent = '0';
  
  const statsTop = document.getElementById('overlay-stats-top');
  if (statsTop) statsTop.classList.remove('typing-started');
  
  renderTextDisplay();
}

function removePanels() {
  if (overlayPanel) {
    overlayPanel.remove();
    overlayPanel = null;
  }
  if (overlayBackdrop) {
    overlayBackdrop.remove();
    overlayBackdrop = null;
  }
  hideFloatingButton();
  document.body.classList.remove('typing-overlay-active');
  window.removeEventListener('keydown', captureWindowKeys, true);
  window.removeEventListener('resize', updateCaretPosition);
}

// ---------- Toast Notification ----------
function showToast(message) {
  let existing = document.getElementById('typing-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'typing-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3500);
}

// ---------- Message from popup ----------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'open_overlay') {
    createOverlayPanel();
    sendResponse({ ok: true });
  }
  return true;
});
