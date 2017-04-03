'use strict'

let editablePlaylists = {}

// Listen for data refresh messages
function trackRefreshHandler () {
  if (location.href.match(trackRegex)) {
    // Update list of editable playlists
    getUserData()
      .then(userData => {
        const data = {
          type: 'editablePlaylistsRequest',
          userId: userData.id
        }
        return postMessage(port, data, 'editablePlaylistsResponse')
      })
      .then(response => {
        editablePlaylists = response.editablePlaylists || {}
      })
  }
}
// Run on push state
onUrlChange(trackRefreshHandler)
// Run immediately
trackRefreshHandler()

const tracksObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.querySelector('.addToPlaylistTabs')) {
        console.log('got a nice add to playlist modal')
        console.log(editablePlaylists)
      }
    })
  })
})
tracksObserver.observe(document.body, {
  childList: true
})
