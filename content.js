(function () {

  const video = document.querySelector('video');
  if (!video) {
    console.error('Video element not found.');
    return;
  }

  checkUrl = function(){
    currentUrl = window.location.href;
    const regex = /^https?:\/\/(www\.)?youtube\.com\/watch\?.*$/;
    return regex.test(currentUrl)
  }

  async function sequentialFunctions() {
    try {
      chrome.runtime.sendMessage({ type: 'getCurrentUrl' }, async function(response) {
        const getCurrentUrl = response.currentUrl;

        if (getCurrentUrl !== window.location.href) {
          if (await checkUrl()) {
            chrome.runtime.sendMessage({ type: 'updateCurrentUrl', data: getCurrentUrl });
            chrome.runtime.sendMessage({ type: 'openPopup' });
          }
        } else {
          chrome.runtime.sendMessage({ type: 'openPopup' });
        }
      });
    } catch (error) {
      // Xử lý lỗi nếu có
      console.error(error);
    }
  }


  sequentialFunctions();
})();
