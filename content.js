(function () {
  var CAPTIONABLE_REGEX = /(\[{"baseUrl":.*"trackName":"(.*?)"}\])/;
  var youtubeUrl = window.location.href;
  var captionsGet = null;
  var baseUrl = null;
  var captionsJson = [];

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

  function fetchYoutubeCaption() {
    fetch(youtubeUrl)
      .then(response => response.text())
      .then(youtubeHtml => {
        const matchData = youtubeHtml.match(CAPTIONABLE_REGEX);

        if (matchData && matchData.length > 1) {
          captionsGet = JSON.parse(matchData[1]);
          baseUrl = captionsGet[0]['baseUrl'];

          fetch(baseUrl)
            .then(response => response.text())
            .then(xmlString => {
              var parser = new DOMParser();
              var xmlDoc = parser.parseFromString(xmlString, 'text/xml');
              var textNodes = xmlDoc.getElementsByTagName('text');

              for (var i = 0; i < textNodes.length; i++) {
                var textNode = textNodes[i];
                var text = textNode.textContent.trim();
                var start = textNode.getAttribute('start');
                var dur = textNode.getAttribute('dur');
                captionsJson.push({ text: text, start: start, dur: dur });
              }

              const video = document.querySelector('video');
              durationTime = Math.floor(video.duration);
              chrome.runtime.sendMessage({ type: 'openPopup' });
              caption = ''
              video.addEventListener('timeupdate', () => {
                currentTime = video.currentTime;
                var time_now = Math.floor(currentTime);
                var closestIndex = binarySearch(captionsJson, currentTime);

                new_caption = captionsJson[closestIndex].text

                chrome.runtime.sendMessage({ type: 'updateTime', time: formatTime(time_now), duration: formatTime(durationTime)});
                if (new_caption != caption) {
                  caption = new_caption;

                  $.ajax({
                    type: "GET",
                    url: `https://api.datpmt.com/api/v1/dictionary/translate?string=${encodeURIComponent(caption)}`,
                    success: function (data, status, xhr) {
                      translate_caption = data
                      updateCaption(decodeHTMLEntities(caption), translate_caption);
                    }
                  });
                }
              });
            })
            .catch(error => {
              console.error('Error fetching XML:', error);
            });
        } else {
          console.log("No captions data found.");
        }
      })
      .catch(error => {
        console.error('Error fetching YouTube HTML:', error);
      });
  }

  fetchYoutubeCaption();
})();
