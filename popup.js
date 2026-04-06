// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const statsSummary = document.getElementById('stats-summary');
  const selectionButtonToggle = document.getElementById('selection-button-toggle');

  chrome.storage.local.get(['lastSession', 'showSelectionButton'], (data) => {
    selectionButtonToggle.checked = data.showSelectionButton !== false;

    if (data.lastSession) {
      const s = data.lastSession;
      document.getElementById('last-wpm').textContent = s.wpm;
      document.getElementById('last-accuracy').textContent = s.accuracy + '%';
      document.getElementById('last-errors').textContent = s.errors ?? '-';
      document.getElementById('last-time').textContent = s.time ?? '-';
      statsSummary.classList.remove('hidden');
    }
  });

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
});
