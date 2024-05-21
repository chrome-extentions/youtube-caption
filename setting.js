$(document).ready(function() {
  // Load settings
  chrome.storage.sync.get('sourceSize', function(data) {
    var sourceSize = data.sourceSize;
    if (sourceSize) {
      $('#source-size input').val(sourceSize);
    }
  });

  chrome.storage.sync.get('sourceColor', function(data) {
    var sourceColor = data.sourceColor;
    if (sourceColor) {
      $('#source-color').val(sourceColor);
    }
  });

  chrome.storage.sync.get('translateSize', function(data) {
    var translateSize = data.translateSize;
    if (translateSize) {
      $('#translate-size input').val(translateSize);
    }
  });

  chrome.storage.sync.get('translateColor', function(data) {
    var translateColor = data.translateColor;
    if (translateColor) {
      $('#translate-color').val(translateColor);
    }
  });

  // Update settings
  $('#source-size input').change(function() {
    var newSize = $(this).val();
    chrome.storage.sync.set({ 'sourceSize': newSize });
    chrome.runtime.sendMessage({ type: 'updateSourceSize', size: newSize });
  });

  $('#source-color').change(function() {
    var newColor = $(this).val();
    chrome.storage.sync.set({ 'sourceColor': newColor });
    chrome.runtime.sendMessage({ type: 'updateSourceColor', color: newColor });
  });

  $('#translate-size input').change(function() {
    var newSize = $(this).val();
    chrome.storage.sync.set({ 'translateSize': newSize });
    chrome.runtime.sendMessage({ type: 'updateTranslateSize', size: newSize });
  });

  $('#translate-color').change(function() {
    var newColor = $(this).val();
    chrome.storage.sync.set({ 'translateColor': newColor });
    chrome.runtime.sendMessage({ type: 'updateTranslateColor', color: newColor });
  });
});


// Function to inject content scripts into the current tab
function injectContentScripts() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['jquery.min.js', 'content.js'] // List of content scripts to inject
      });
  });
}

// When the popup is opened, inject content scripts into the current tab
document.addEventListener('DOMContentLoaded', function() {
  injectContentScripts();
});



// chrome.runtime.sendMessage({ type: 'openPopup' });
// function isWindowIdExist(windowId, callback) {
//   chrome.windows.getAll({populate: false}, function(windows) {
//     for (var i = 0; i < windows.length; i++) {
//       if (windows[i].id === windowId) {
//         callback(true);
//         return;
//       }
//     }
//     callback(false);
//   });
// }

// chrome.storage.sync.get('popupWindowId', function(data) {
//   var popupWindowId = data.popupWindowId;
//   console.log('popupWindowId', popupWindowId)
//   isWindowIdExist(popupWindowId, function(exists) {
//     if (exists) {
//       chrome.windows.update(popupWindowId, { focused: true });
//     } else {
//       chrome.windows.create({
//         url: 'popup.html',
//         type: 'popup',
//         height: 140,
//         width: 400
//       }, (window) => {
//         popupWindowId = window.id;
//         chrome.storage.sync.set({ 'popupWindowId': popupWindowId });
//         chrome.windows.update(popupWindowId, { focused: true });
//       });
//     }
//   });
// });

// chrome.windows.onRemoved.addListener((windowId) => {
//   chrome.storage.sync.get('popupWindowId', function(data) {
//     var popupWindowId = data.popupWindowId;
//     if (windowId == popupWindowId) {
//       chrome.storage.sync.set({ 'popupWindowId': null });
//     }
//   });
// });
