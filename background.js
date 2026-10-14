// Create context menu items
async function setupContextMenus() {
  chrome.contextMenus.create({
    id: "support",
    title: "❤️ Support",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "issues",
    title: "🤔 Issues and Suggestions",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "github",
    title: "🌐 GitHub",
    parentId: "issues",
    contexts: ["action"]
  });

  chrome.contextMenus.create({
    id: "reportIssue",
    title: "🐛 Report Issue",
    parentId: "issues",
    contexts: ["action"]
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "github":
      chrome.tabs.create({
        url: "https://github.com/datpmt/youtube-caption"
      });
      break;
    case "reportIssue":
      chrome.tabs.create({
        url: "https://github.com/datpmt/youtube-caption/issues"
      });
      break;
  }
});

// Handle extension button click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.includes('youtube.com/watch')) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'openPip' });
  } catch (error) {
    // Content script is missing (extension reloaded, or the watch page was reached via SPA navigation)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'openPip' });
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  setupContextMenus();
});

chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    if (details.url.includes("timedtext") && details.url.includes("pot=")) {
      const poToken = new URL(details.url).searchParams.get("pot");
      chrome.tabs.sendMessage(details.tabId, { type: "POT_FOUND", poToken }).catch(() => {
        // No content script in this tab yet
      });
    }
  },
  {urls: ["*://*.youtube.com/*"]},
  ["requestHeaders"]
);
