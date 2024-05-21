chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type == 'openPopup') {
    openPopup();
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
          type: 'popup',
          height: 140,
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
