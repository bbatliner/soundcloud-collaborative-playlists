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

// DOM helpers

// Inject some dank CSS
document.head.appendChild(stringToDom(`<style>.sc-collaborative-label {
  padding: 2px 6px;
  margin-left: 4px;
  height: initial;
  line-height: initial;
}</style>`))

function createPlaylistListItem (playlistData) {
  const dom = stringToDom([
    '<li class="addToPlaylistList__item sc-border-light-top">',
      '<div class="addToPlaylistItem g-flex-row-centered">',
        `<a href="${playlistData.permalink_url}" class="addToPlaylistItem__image" title="${playlistData.title}">`,
          '<div class="image m-playlist image__lightOutline readOnly sc-artwork sc-artwork-placeholder-9 m-loaded" style="height: 50px; width: 50px;">',
            `<span style="background-image: url(&quot;${playlistData.artwork_url || playlistData.tracks[0].artwork_url}&quot;); width: 50px; height: 50px; opacity: 1;" class="sc-artwork sc-artwork-placeholder-9 image__full g-opacity-transition" aria-label="test" aria-role="img"></span>`,
          '</div>',
        '</a>',
        '<div class="addToPlaylistItem__content">',
          '<h3 class="addToPlaylistItem__title sc-truncate">',
            `<a href="${playlistData.permalink_url}" class="addToPlaylistItem__titleLink sc-link-dark" title="${playlistData.title}">`,
              `${playlistData.title} <span class="sc-button sc-button-small sc-button-responsive sc-button-cta sc-collaborative-label">Collaborative</span>`,
            '</a>',
          '</h3>',
          '<div class="addToPlaylistItem__data">',
            `<span title="${playlistData.tracks.length} tracks" class="addToPlaylistItem__count sc-ministats sc-ministats-small sc-ministats-sounds">${playlistData.tracks.length}</span>`,
          '</div>',
        '</div>',
        '<div class="addToPlaylistItem__actions g-flex-row-centered">',
          '<button class="addToPlaylistButton sc-button sc-button-medium sc-button-responsive sc-button-selected" tabindex="0" title="Remove">Added</button>',
        '</div>',
      '</div>',
    '</li>'
  ].join(''))
  return dom
}

const tracksObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.querySelector('.addToPlaylistList')) {
        console.log('got a nice add to playlist modal')
        console.log(editablePlaylists)

        // Playlist list
        const listPromise = poll(() => node.querySelector('.lazyLoadingList__list'), 10)
        Promise.all(
          [listPromise, ...Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById)]
        ).then(([list, ...playlistDataArr]) => {
          // Sort and add to DOM
          playlistDataArr
            .sort((a, b) => {
              // Sort by creation time
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })
            .map(createPlaylistListItem)
            .forEach(listItem => list.appendChild(listItem))
        })
      }
    })
  })
})
tracksObserver.observe(document.body, {
  childList: true
})
