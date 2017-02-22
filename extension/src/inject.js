chrome.extension.sendMessage({}, function (response) {
  const readyStateCheckInterval = setInterval(function () {
    if (document.readyState === 'complete') {
      clearInterval(readyStateCheckInterval)

      const usernameEl = document.querySelector('.userNav__username')

      const usernameObserver = new MutationObserver(function (mutations, observer) {
        window.alert('SHAME. SHAME. SHAME.')
      })
      usernameObserver.observe(usernameEl, {
        attributeOldValue: true,
        attributes: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true
      })

      const username = document.querySelector('.userNav__username').textContent

      console.log('Hello, we think you are logged in as', username)
    }
  }, 10);
});