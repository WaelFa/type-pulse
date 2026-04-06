// Background service worker — handles extension-level state
let modeEnabled = false;

// Initialize context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "start-typing",
    title: "TypePulse: Start typing selection",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "start-typing") {
    // Selection text is already captured by the context menu
    // but the overlay can also read it from the window selection
    chrome.tabs.sendMessage(tab.id, { action: 'open_overlay' });
  }
});

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
