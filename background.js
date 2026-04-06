// Background service worker — handles extension-level state
let modeEnabled = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle_mode') {
    modeEnabled = message.enabled;
    sendResponse({ modeEnabled });
  }
  if (message.action === 'get_mode') {
    sendResponse({ modeEnabled });
  }
  if (message.action === 'save_stats') {
    // Persist session stats to chrome.storage
    chrome.storage.local.set({ lastSession: message.stats });
    sendResponse({ saved: true });
  }
  return true; // keep message channel open for async sendResponse
});
