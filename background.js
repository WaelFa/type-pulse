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
    chrome.tabs.sendMessage(tab.id, {
      action: 'open_overlay',
      selectedText: info.selectionText || ''
    });
  }
});

const pendingRetypes = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle_mode') {
    modeEnabled = message.enabled;
    sendResponse({ modeEnabled });
  }
  if (message.action === 'get_mode') {
    sendResponse({ modeEnabled });
  }
  if (message.action === 'save_stats') {
    const stats = message.stats;
    chrome.storage.local.set({ lastSession: stats });
    chrome.storage.local.get(['sessionsHistory'], (data) => {
      const history = Array.isArray(data.sessionsHistory) ? data.sessionsHistory : [];
      history.push(stats);
      if (history.length > 200) history.splice(0, history.length - 200);
      chrome.storage.local.set({ sessionsHistory: history });
    });
    sendResponse({ saved: true });
  }

  if (message.action === 'retype_request') {
    const { text, url } = message;
    if (url && url.startsWith('http')) {
      chrome.tabs.create({ url, active: true }, (tab) => {
        pendingRetypes.set(tab.id, text);
      });
    } else {
      // Fallback for current tab or finding a valid tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.startsWith('http')) {
          chrome.tabs.sendMessage(tab.id, { action: 'retype_from_history', text });
        }
      });
    }
    sendResponse({ ok: true });
  }
  return true; 
});

// Listen for tab loads to trigger pending retypes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && pendingRetypes.has(tabId)) {
    const text = pendingRetypes.get(tabId);
    pendingRetypes.delete(tabId);
    
    // Give content script a moment to be ready
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: 'retype_from_history', text }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("Retype failed, content script might not be injected:", chrome.runtime.lastError.message);
        }
      });
    }, 800);
  }
});
