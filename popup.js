// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const statsSummary = document.getElementById('stats-summary');

  // Load last session stats if available
  chrome.storage.local.get('lastSession', (data) => {
    if (data.lastSession) {
      const s = data.lastSession;
      document.getElementById('last-wpm').textContent = s.wpm;
      document.getElementById('last-accuracy').textContent = s.accuracy + '%';
      document.getElementById('last-errors').textContent = s.errors;
      document.getElementById('last-time').textContent = s.timeElapsed;
      statsSummary.classList.remove('hidden');
    }
  });

  // When user clicks "Start Typing", send message to the active tab
  startBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'open_overlay' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded — try reloading or notify user
          console.log('Content script not ready. Try refreshing the page.');
          startBtn.textContent = 'Refresh Page & Try Again';
          startBtn.onclick = () => {
            chrome.tabs.reload(tabs[0].id);
            window.close();
          };
          return;
        }
        // Close popup after sending the message
        window.close();
      });
    });
  });
});
