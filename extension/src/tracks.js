'use strict'

// Listen for data refresh messages
function trackRefreshHandler () {
  if (location.href.match(trackRegex)) {
    // Do something
  }
}
// Run on push state
onPushState(trackRefreshHandler)
// Run immediately
trackRefreshHandler()

const tracksObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.querySelector('.addToPlaylistTabs')) {
        console.log('got a nice add to playlist modal')
      }
    })
  })
})
tracksObserver.observe(document.body, {
  childList: true
})
