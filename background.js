let captionsJson;
let captionsData;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type == 'openPopup') {
    openPopup();
  } else if (message.type == 'getCaptionsJson') {
    sendResponse({ captionsJson: captionsJson });
  } else if (message.type == 'getCaptionsData') {
    sendResponse({ captionsData: captionsData });
  } else if (message.type == 'updateCaptionsData') {
    captionsData = message.data;
  } else if (message.type == 'updateCaptionsJson') {
    captionsJson = message.data;
  } else if (message.type == 'getCurrentUrl') {
    chrome.storage.sync.get('currentUrl', function(data) {
      sendResponse({ currentUrl: data.currentUrl });
    });
    return true;
  } else if (message.type == 'updateCurrentUrl') {
    chrome.storage.sync.set({ 'currentUrl': message.data });
  }
})

function isWindowIdExist(windowId, callback) {
  chrome.windows.getAll({populate: false}, function(windows) {
    for (var i = 0; i < windows.length; i++) {
      if (windows[i].id === windowId) {
        callback(true);
        return;
      }
    }
    callback(false);
  });
}

openPopup = function(){
  chrome.storage.sync.get('popupWindowId', function(data) {
    var popupWindowId = data.popupWindowId;
    isWindowIdExist(popupWindowId, function(exists) {
      if (exists) {
        chrome.windows.update(popupWindowId, { focused: true });
      } else {
        chrome.windows.create({
          url: 'popup.html',
          type: 'panel',
          height: 180,
          width: 400
        }, (window) => {
          popupWindowId = window.id;
          chrome.storage.sync.set({ 'popupWindowId': popupWindowId });
          chrome.windows.update(popupWindowId, { focused: true });
        });
      }
    });
  });
}

chrome.windows.onRemoved.addListener((windowId) => {
  chrome.storage.sync.get('popupWindowId', function(data) {
    var popupWindowId = data.popupWindowId;
    if (windowId == popupWindowId) {
      chrome.storage.sync.set({ 'popupWindowId': null });
    }
  });
});
