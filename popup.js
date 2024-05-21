// Load settings
chrome.storage.sync.get('sourceSize', function(data) {
  var sourceSize = data.sourceSize;
  if (sourceSize) {
    $('#source-caption').css('font-size', `${sourceSize}px`);
  }
});

chrome.storage.sync.get('sourceColor', function(data) {
  var sourceColor = data.sourceColor;
  if (sourceColor) {
    $('#source-caption').css('color', `${sourceColor}`);
  }
});

chrome.storage.sync.get('translateSize', function(data) {
  var translateSize = data.translateSize;
  if (translateSize) {
    $('#translate-caption').css('font-size', `${translateSize}px`);
  }
});

chrome.storage.sync.get('translateColor', function(data) {
  var translateColor = data.translateColor;
  if (translateColor) {
    $('#translate-caption').css('color', `${translateColor}`);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type == 'updateTime') {
    $('#time').text(`${message.time} / ${message.duration}`)
  } else if (message.type == 'updateCaption') {
    document.getElementById('source-caption').innerText = message.caption;
    document.getElementById('translate-caption').innerText = message.translate_caption;
  } else if (message.type == 'updateSourceSize') {
    $('#source-caption').css('font-size', `${message.size}px`);
  } else if (message.type == 'updateSourceColor') {
    $('#source-caption').css('color', message.color);
  } else if (message.type == 'updateTranslateSize') {
    $('#translate-caption').css('font-size', `${message.size}px`);
  } else if (message.type == 'updateTranslateColor') {
    $('#translate-caption').css('color', message.color);
  }
});
