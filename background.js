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
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('youtube.com/watch')) {
    chrome.tabs.sendMessage(tab.id, { action: 'openPip' });
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  setupContextMenus();
});
