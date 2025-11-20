const pipWindowState = {
  windowId: 0,
  tabId: 0,
  icon: '',
  window: null
};

const video = document.querySelector('video');
const subtitleButton = document.querySelector('.ytp-subtitles-button-icon');
subtitleButton?.click();
subtitleButton?.click();

let currentCaptionIndex = -1;
let captionsData = [];
let captionsJson = [];
let poToken = '';

if (!video) {
  console.error('Video element not found.');
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function updateCaption(caption, translate_caption) {
  if (!pipWindowState.window) {
    return;
  }

  const sourceCaptionElement = pipWindowState.window.document.getElementById('source-caption');
  const translateCaptionElement = pipWindowState.window.document.getElementById('translate-caption');

  if (sourceCaptionElement && translateCaptionElement) {
    sourceCaptionElement.innerText = caption;
    translateCaptionElement.innerText = translate_caption;
  } else {
    console.error('Caption elements not found in Pip window.');
  }
}

function binarySearch(captions, targetTime) {
  var low = 0;
  var high = captions.length - 1;
  var resultIndex = -1;

  while (low <= high) {
    var mid = Math.floor((low + high) / 2);
    var midTime = parseFloat(captions[mid].start);

    if (midTime === targetTime) {
      resultIndex = mid;
      break;
    } else if (midTime < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
      if (high >= 0 && parseFloat(captions[high].start) <= targetTime) {
        resultIndex = high;
      }
    }
  }

  return resultIndex;
}

function decodeHTMLEntities(text) {
  var doc = new DOMParser().parseFromString(text, "text/html");
  return doc.documentElement.textContent;
}

async function fetchTranslation(caption, translateLang) {
  const baseUrl = `https://translate.googleapis.com/translate_a/t?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(caption)}&tl=${translateLang}`;
  return fetch(baseUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Translation request failed.');
      }
      return response.json();
    })
    .then(data => {
      const translate = data[0][0];
      return translate;
    })
    .catch(error => {
      throw error;
    });
}

updatePopup = async function (captionsJson) {
  const timeElement = pipWindowState.window ? pipWindowState.window.document.getElementById('time') : null;
  if (captionsJson == [] || !timeElement) {
    return;
  } else {
    durationTime = Math.floor(video.duration);
    currentTime = video.currentTime;
    var time_now = Math.floor(currentTime);
    var closestIndex = binarySearch(captionsJson, currentTime);

    const time = formatTime(time_now);
    const duration = formatTime(durationTime);

    const timeText = `${time} / ${duration}`;
    timeElement.textContent = timeText;

    if (closestIndex != currentCaptionIndex) {
      currentCaptionIndex = closestIndex;
      newCaption = captionsJson[closestIndex]?.text;

      if (!newCaption) {
        return;
      }

      // tlang
      const translateLang = pipWindowState.window.document.getElementById('translate-lang').value;
      await fetchTranslation(newCaption, translateLang)
        .then(translate_caption => {
          updateCaption(decodeHTMLEntities(newCaption), decodeHTMLEntities(translate_caption));
        })
        .catch(error => {
          console.error('Error fetching translation:', error);
        });
    }
  }
}

updateTimeListener = async function () {
  if (captionsJson) {
    await updatePopup(captionsJson);
  }
}

async function getCaptionList(youtubeUrl) {
  var CAPTIONABLE_REGEX = /(\[{"baseUrl":.*"trackName":"(.*?)"}\])/;
  return fetch(youtubeUrl)
    .then(response => response.text())
    .then(youtubeHtml => {
      const matchData = youtubeHtml.match(CAPTIONABLE_REGEX);

      if (matchData && matchData.length > 1) {
        return JSON.parse(matchData[1]);
      } else {
        throw new Error("No captions data found.");
      }
    })
    .catch(error => {
      console.error('Error fetching or parsing YouTube HTML:', error);
      throw error;
    });
}

async function getCaptionJson(baseUrl) {
  // caption = captions_data.find(obj => obj.vssId == vssId);
  return fetch(baseUrl)
    .then(response => response.text())
    .then(xmlString => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('text');

      const captionsJson = [];

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

async function loadCaptionJson(youtubeUrl) {
  console.log('Loading caption JSON...');

  const captionList = await getCaptionList(youtubeUrl);
  captionsData = captionList.map(caption => {
    return {
      baseUrl: `${caption['baseUrl']}&pot=${poToken}&c=WEB`,
      name: caption['name']['simpleText'],
      vssId: caption['vssId']
    };
  });

  const defaultCaption = captionsData[1] || captionsData[0];
  captionsJson = await getCaptionJson(defaultCaption.baseUrl);
  console.log('Caption JSON loaded successfully.');
}

// load caption json
(async () => {
  await loadCaptionJson(window.location.href);
})();

const pipStyles = `
  body {
    font-family: Arial, sans-serif;
    text-align: center;
  }

  html {
    height: 100%;
  }

  table {
    font-family: arial, sans-serif;
    border-collapse: collapse;
    width: 100%;
  }

  td, th {
    border: 1px solid #dddddd;
    text-align: left;
    padding: 8px;
  }

  input[type=text], input[type=number] {
    width: 40px;
  }

  #source-caption {
    font-weight: bold;
  }

  #translate-caption {
    padding: 0
  }
`;

function setupPipWindowStyles(pipWindow) {
  const style = document.createElement('style');
  style.textContent = pipStyles;
  pipWindow.document.head.appendChild(style);
}

async function createContent(pipWindow) {
  // Create settings icon
  const settingsIcon = pipWindow.document.createElement('div');
  settingsIcon.innerHTML = '⚙️';
  settingsIcon.style.fontSize = '24px';
  settingsIcon.style.cursor = 'pointer';
  settingsIcon.style.position = 'absolute';
  settingsIcon.style.top = '10px';
  settingsIcon.style.right = '10px';
  settingsIcon.style.zIndex = 1;
  settingsIcon.onclick = toggleSettings;
  pipWindow.document.body.appendChild(settingsIcon);

  // Create settings menu
  const settingsContainer = pipWindow.document.createElement('div');
  settingsContainer.id = 'settingsMenu';
  settingsContainer.style.padding = '10px';
  settingsContainer.style.border = '1px solid #ccc';
  settingsContainer.style.boxSizing = 'border-box';
  settingsContainer.style.display = 'none';
  settingsContainer.style.position = 'absolute';
  settingsContainer.style.background = 'white';
  settingsContainer.style.top = '40px';
  settingsContainer.style.right = '10px';
  settingsContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 1.0)';
  settingsContainer.style.fontSize = 'small';
  settingsContainer.style.zIndex = 1;

  settingsContainer.innerHTML = `
    <table>
      <tr>
        <th>Caption</th>
        <th>Language</th>
        <th>Color</th>
        <th>Size</th>
        <th>Show</th>
      </tr>
      <tr>
        <td>Source</td>
        <td>
          <select id="source-lang">
          </select>
        </td>
        <td>
          <select id="source-color">
            <option value="black">black</option>
            <option value="red">red</option>
            <option value="blue">blue</option>
            <option value="green">green</option>
            <option value="crimson">crimson</option>
            <option value="hotpink">hotpink</option>
            <option value="deeppink">deeppink</option>
          </select>
        </td>
        <td id="source-size">
          <div style="display: flex">
            <input type="number" value="16">
            <span style="padding-left: 5px;">px</span>
          </div>
        </td>
        <td><input type="checkbox" id="source-show" name="source-show" checked></td>
      </tr>
      <tr>
        <td>Translate</td>
        <td>
          <select id="translate-lang">
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="id">Indonesian</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="ru">Russian</option>
            <option value="pt">Portuguese</option>
          </select>
        </td>
        <td>
          <select id="translate-color">
            <option value="black">black</option>
            <option value="red">red</option>
            <option value="blue">blue</option>
            <option value="green">green</option>
            <option value="crimson">crimson</option>
            <option value="hotpink">hotpink</option>
            <option value="deeppink">deeppink</option>
          </select>
        </td>
        <td id="translate-size">
          <div style="display: flex">
            <input type="number" value="16">
            <span style="padding-left: 5px;">px</span>
          </div>
        </td>
        <td><input type="checkbox" id="translate-show" name="translate-show" checked></td>
      </tr>
    </table>
  `;

  pipWindow.document.body.appendChild(settingsContainer);

  // Create video control buttons
  const controlButtons = pipWindow.document.createElement('div');
  controlButtons.id = 'controlButtons';
  controlButtons.style.position = 'absolute';
  controlButtons.style.top = '10px';
  controlButtons.style.left = '50%';
  controlButtons.style.transform = 'translateX(-50%)';
  controlButtons.innerHTML = `
    <span id="prev5sButton" style="cursor: pointer;">5s ⏪</span>
    <span id="playPauseEmoji" style="cursor: pointer; padding: 0 8px;">${video.paused ? '▶️' : '⏸️'}</span>
    <span id="next5sButton" style="cursor: pointer;">⏩ 5s</span>
  `;

  pipWindow.document.body.appendChild(controlButtons);

  // Create view container
  const viewContainer = pipWindow.document.createElement('div');
  viewContainer.id = 'viewContainer';
  viewContainer.style.position = 'absolute';
  viewContainer.style.width = '100%';
  viewContainer.style.top = '50%';
  viewContainer.style.left = '50%';
  viewContainer.style.transform = 'translate(-50%, -50%)';

  // Create play/pause emoji
  viewContainer.innerHTML = `
    <div style="padding: 0 10px;">
      <p id="time"></p>
      <p id="source-caption"></p>
      <p id="translate-caption"></p>
    </div>
  `;

  pipWindow.document.body.appendChild(viewContainer);

  // Play/pause video
  const playPauseEmoji = controlButtons.querySelector('#playPauseEmoji');
  video.addEventListener('play', () => {
    playPauseEmoji.innerText = '⏸️';
  });
  video.addEventListener('pause', () => {
    playPauseEmoji.innerText = '▶️';
  });
  playPauseEmoji.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playPauseEmoji.innerText = '⏸️';
    } else {
      video.pause();
      playPauseEmoji.innerText = '▶️';
    }
  });

  const prev5sButton = controlButtons.querySelector('#prev5sButton');
  prev5sButton.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 5);
  });

  const next5sButton = controlButtons.querySelector('#next5sButton');
  next5sButton.addEventListener('click', () => {
    video.currentTime = Math.min(video.duration, video.currentTime + 5);
  });

  // Load settings from chrome.storage.sync
  const sourceLangSelect = pipWindowState.window.document.getElementById('source-lang');
  captionsData.forEach(caption => {
    const option = document.createElement('option');
    option.value = caption.vssId;
    option.text = caption.name;
    sourceLangSelect.appendChild(option);
  });
  sourceLangSelect.addEventListener('change', async function () {
    const selectedVssId = this.value;
    const selectedCaption = captionsData.find(caption => caption.vssId === selectedVssId);
    if (selectedCaption) {
      captionsJson = await getCaptionJson(selectedCaption.baseUrl);
    }

    // Hide settings menu
    const settingsContainer = pipWindowState.window.document.getElementById('settingsMenu');
    settingsContainer.style.display = 'none';
  });
  // Set default caption
  const defaultCaption = captionsData[1] || captionsData[0];
  sourceLangSelect.value = defaultCaption.vssId;

  chrome.storage.sync.get('sourceSize', function (data) {
    const sourceSize = data.sourceSize;
    if (sourceSize) {
      pipWindow.document.getElementById('source-caption').style.fontSize = sourceSize + 'px';
      pipWindow.document.querySelector('#source-size input').value = sourceSize;
    }
  });

  chrome.storage.sync.get('sourceColor', function (data) {
    const sourceColor = data.sourceColor;
    if (sourceColor) {
      pipWindow.document.getElementById('source-caption').style.color = sourceColor;
      pipWindow.document.getElementById('source-color').value = sourceColor;
    }
  });

  chrome.storage.sync.get('translateSize', function (data) {
    const translateSize = data.translateSize;
    if (translateSize) {
      pipWindow.document.getElementById('translate-caption').style.fontSize = translateSize + 'px';
      pipWindow.document.querySelector('#translate-size input').value = translateSize;
    }
  });

  chrome.storage.sync.get('translateColor', function (data) {
    const translateColor = data.translateColor;
    if (translateColor) {
      pipWindow.document.getElementById('translate-caption').style.color = translateColor;
      pipWindow.document.getElementById('translate-color').value = translateColor;
    }
  });

  chrome.storage.sync.get('translateLang', function (data) {
    const translateLang = data.translateLang;
    if (translateLang) {
      pipWindow.document.getElementById('translate-lang').value = translateLang;
    }
  });

  // Toggle settings menu
  function toggleSettings() {
    settingsContainer.style.display = settingsContainer.style.display === 'block' ? 'none' : 'block';
  }

  // Update settings
  pipWindow.document.querySelector('#source-size input').addEventListener('change', function () {
    const newSize = this.value;
    chrome.storage.sync.set({ 'sourceSize': newSize });
    pipWindow.document.getElementById('source-caption').style.fontSize = newSize + 'px';
    toggleSettings();
  });

  pipWindow.document.querySelector('#source-color').addEventListener('change', function () {
    const newColor = this.value;
    chrome.storage.sync.set({ 'sourceColor': newColor });
    pipWindow.document.getElementById('source-caption').style.color = newColor;
    toggleSettings();
  });

  pipWindow.document.querySelector('#translate-size input').addEventListener('change', function () {
    const newSize = this.value;
    chrome.storage.sync.set({ 'translateSize': newSize });
    pipWindow.document.getElementById('translate-caption').style.fontSize = newSize + 'px';
    toggleSettings();
  });

  pipWindow.document.querySelector('#translate-color').addEventListener('change', function () {
    const newColor = this.value;
    chrome.storage.sync.set({ 'translateColor': newColor });
    pipWindow.document.getElementById('translate-caption').style.color = newColor;
    toggleSettings();
  });

  pipWindow.document.querySelector('#translate-lang').addEventListener('change', function () {
    const newTranslateLang = this.value;
    chrome.storage.sync.set({ 'translateLang': newTranslateLang });
    toggleSettings();
  });

  pipWindow.document.querySelector('#source-show').addEventListener('change', function () {
    const sourceCaptionElement = pipWindow.document.getElementById('source-caption');
    if (this.checked) {
      sourceCaptionElement.style.display = 'block';
    } else {
      sourceCaptionElement.style.display = 'none';
    }
    toggleSettings();
  });

  pipWindow.document.querySelector('#translate-show').addEventListener('change', function () {
    const translateCaptionElement = pipWindow.document.getElementById('translate-caption');
    if (this.checked) {
      translateCaptionElement.style.display = 'block';
    } else {
      translateCaptionElement.style.display = 'none';
    }
    toggleSettings();
  });

  // Ensure pip window can receive keyboard events
  pipWindow.document.body.setAttribute('tabindex', '0');
  pipWindow.document.body.focus();

  const pipKeydownHandler = (e) => {
    const isSpace = e.code === 'Space' || e.key === ' ' || e.keyCode === 32;
    const isArrowLeft = e.code === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37;
    const isArrowRight = e.code === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39;

    if (isSpace) {
      e.preventDefault();
      if (video.paused) {
        video.play();
        playPauseEmoji.innerText = '⏸️';
      } else {
        video.pause();
        playPauseEmoji.innerText = '▶️';
      }
      return;
    }

    if (isArrowLeft) {
      e.preventDefault();
      // rewind 5s
      video.currentTime = Math.max(0, video.currentTime - 5);
      return;
    }

    if (isArrowRight) {
      e.preventDefault();
      // forward 5s
      video.currentTime = Math.min(video.duration, video.currentTime + 5);
      return;
    }
  };

  pipWindow.document.addEventListener('keydown', pipKeydownHandler);

  // Clean up when Pip window closes
  pipWindow.addEventListener('pagehide', () => {
    pipWindow.document.removeEventListener('keydown', pipKeydownHandler);
  });
}


async function getStoredUrl() {
  try {
    const result = await chrome.storage.local.get(['lastUrl']);
    return result.lastUrl;
  } catch (error) {
    console.error('Error getting stored URL:', error);
    return null;
  }
}

async function togglePictureInPicture() {
  try {
    const pipWindow = await window.documentPictureInPicture?.requestWindow({
      width: 450,
      height: 250
    });

    if (!pipWindow) {
      console.error("Could not create Picture-in-Picture window");
      return;
    }

    pipWindowState.window = pipWindow;
    pipWindowState.windowId = chrome.windows?.WINDOW_ID_CURRENT || 0;
    pipWindowState.tabId = chrome.tabs?.TAB_ID_NONE || 0;
    pipWindowState.icon = document.querySelector('link[rel="icon"]')?.href || '';

    console.log('Pip window created successfully');
    setupPipWindowStyles(pipWindow);
    await createContent(pipWindow);
    video.addEventListener('timeupdate', await updateTimeListener);

    // Handle window close
    pipWindow.addEventListener('pagehide', (event) => {
      console.log('Pip window closed');
      if (window.documentPictureInPicture.window) {
        window.documentPictureInPicture.window.close();
        // Reset Pip window state
        pipWindowState.window = null;
        pipWindowState.windowId = 0;
        pipWindowState.tabId = 0;
        pipWindowState.icon = '';
      }
    });
  } catch (error) {
    console.error('Failed to enter Picture-in-Picture mode:', error);
    // Reset Pip window state on error
    pipWindowState.window = null;
    pipWindowState.windowId = 0;
    pipWindowState.tabId = 0;
    pipWindowState.icon = '';
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPip') {
    togglePictureInPicture();
    sendResponse({ received: true });
  } else if (request.type === "POT_FOUND") {
    const newToken = request.poToken;
    if (newToken !== poToken) {
      poToken = request.poToken;
    }
  }
  // return true; // Keep the message channel open for the async response
});

document.addEventListener('yt-page-data-updated', async () => {
  // console.log(window.ytInitialPlayerResponse);
  // console.log('Page updated');
  const sourceCaptionElement = pipWindowState.window.document.getElementById('source-caption');
  const translateCaptionElement = pipWindowState.window.document.getElementById('translate-caption');
  sourceCaptionElement.innerText = '';
  translateCaptionElement.innerText = '';
  currentCaptionIndex = -1;
  captionsData = [];
  captionsJson = [];
  subtitleButton?.click();
  subtitleButton?.click();
  await loadCaptionJson(window.location.href);
});
