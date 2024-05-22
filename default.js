(function () {

  const video = document.querySelector('video');
  let captionsJson = [];
  let captionsData = [];

  if (!video) {
    console.error('Video element not found.');
    return;
  }

  function formatTime(seconds) {
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  function updateCaption(caption, translate_caption) {
    chrome.runtime.sendMessage({ type: 'updateCaption', caption: caption, translate_caption: translate_caption });
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

  async function fetchTranslation(caption) {
    return fetch(`https://api.datpmt.com/api/v1/dictionary/translate?string=${encodeURIComponent(caption)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Translation request failed.');
        }
        return response.json();
      })
      .then(data => data)
      .catch(error => {
        throw error;
      });
  }

  updatePopup = function(captionsJson){
    if (captionsJson == []) {
      return;
    } else {
      let currentCaptionIndex = -1;
      durationTime = Math.floor(video.duration);
      currentTime = video.currentTime;
      var time_now = Math.floor(currentTime);
      var closestIndex = binarySearch(captionsJson, currentTime);

      if (closestIndex != currentCaptionIndex) {
        chrome.runtime.sendMessage({ type: 'updateTime', time: formatTime(time_now), duration: formatTime(durationTime)});
        newCaption = captionsJson[closestIndex].text;

        // tlang
        fetchTranslation(newCaption)
          .then(translate_caption => {
            updateCaption(decodeHTMLEntities(newCaption), decodeHTMLEntities(translate_caption));
          })
          .catch(error => {
            console.error('Error fetching translation:', error);
          });
      }
    }
  }

  updateTimeListener = function(){
    chrome.runtime.sendMessage({ type: 'getCaptionsJson' }, async function(response) {
      captionsJson = response.captionsJson
      if (captionsJson) {
        updatePopup(captionsJson);
      } else {
        // captionsJson = await loadCaptionJson(getCurrentUrl)
        // console.log('captionsJson2', captionsJson);
        // updatePopup(captionsJson);
      }
    })
  }

  async function getCaptionList(youtubeUrl) {
    var CAPTIONABLE_REGEX = /(\[{"baseUrl":.*"trackName":"(.*?)"}\])/;
    // Trả về một promise
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
        throw error; // Chuyển tiếp lỗi cho promise
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

  async function loadCaptionJson(youtubeUrl){
    const captionList = await getCaptionList(youtubeUrl);
    captionsData = $.map(captionList, function(caption) {
      return {
        baseUrl: caption['baseUrl'],
        name: caption['name']['simpleText'],
        vssId: caption['vssId']
      };
    });

    chrome.runtime.sendMessage({ type: 'updateCaptionsData', data: captionsData });

    const default_caption = captionsData[0];
    const captionsJson = await getCaptionJson(default_caption.baseUrl);

    chrome.runtime.sendMessage({ type: 'updateCaptionsJson', data: captionsJson });

    return captionsJson;
  }

  async function loadDefault() {
    try {
      getCurrentUrl = window.location.href
      captionsJson = await loadCaptionJson(getCurrentUrl)

      video.addEventListener('timeupdate', updateTimeListener);
    } catch (error) {
      // Xử lý lỗi nếu có
      console.error(error);
    }
  }

  loadDefault();
})();