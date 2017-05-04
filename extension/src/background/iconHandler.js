/* global chrome */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'auth') {
    if (request.loggedIn === true) {
      chrome.browserAction.setIcon({
        path: 'icons/icon16.png'
      })
    } else if (request.loggedIn === false) {
      chrome.browserAction.setIcon({
        path: 'icons/icon16-gray.png'
      })
    }
  }
})
