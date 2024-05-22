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

  chrome.runtime.sendMessage({ type: 'getCaptionsData' }, async function(response) {
    captionsData = response.captionsData

    async function handleChangeSourceLang() {
      const vssId = $('#source-lang').val();
      caption = captionsData.find(obj => obj.vssId == vssId);
      baseUrl = caption.baseUrl;
      const captionsJson = await getCaptionJson(baseUrl);
      chrome.runtime.sendMessage({ type: 'updateCaptionsJson', data: captionsJson });
    }

    if (captionsData) {
      let html = '';
      $.each(captionsData, function(i, caption) {
        html += `<option value="${caption.vssId}">${caption.name}</option>`;
      });
      $('#source-lang').html(html);

      $('#source-lang').change(function() {
        handleChangeSourceLang();
      });
    }
  });


  async function getCaptionJson(baseUrl) {
    // caption = captions_data.find(obj => obj.vssId == vssId);
    return fetch(baseUrl)
      .then(response => response.text())
      .then(xmlString => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('text');

        const captionsJson = []; // Khởi tạo một mảng mới

        for (let i = 0; i < textNodes.length; i++) {
          const textNode = textNodes[i];
          const text = textNode.textContent.trim();
          const start = textNode.getAttribute('start');
          const dur = textNode.getAttribute('dur');
          captionsJson.push({ text: text, start: start, dur: dur });
        }

        return captionsJson;
      })
      .catch(error => {
        console.error('Error fetching XML:', error);
        throw error;
      });
  }

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
