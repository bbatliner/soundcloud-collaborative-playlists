'use strict'

const getEditablePlaylists = (function () {
  function getPromise () {
    return new Promise((resolve, reject) => {
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
          resolve(response.editablePlaylists || {})
        })
        .catch(reject)
    })
  }
  let editablePlaylistsPromise = getPromise()
  onUrlChange(() => {
    if (location.href.match(trackRegex)) {
      editablePlaylistsPromise = getPromise()
    }
  })
  return editablePlaylistsPromise
}())

// DOM helpers

// Inject some dank CSS
document.head.appendChild(stringToDom(`<style>
.sc-collaborative-label {
  padding: 1px 4px;
  margin-left: 8px;
  height: 16px;
  line-height: 1.2;
  user-select: initial;
}
.sc-collaborative-label:hover {
  cursor: default;
}
</style>`))

function createPlaylistListItem (playlistData, trackPermalink) {
  const dom = stringToDom([
    '<li class="addToPlaylistList__item sc-border-light-top sc-collaborative">',
      '<div class="addToPlaylistItem g-flex-row-centered">',
        `<a href="${playlistData.permalink_url}" class="addToPlaylistItem__image" title="${playlistData.title}">`,
          '<div class="image m-playlist image__lightOutline readOnly sc-artwork sc-artwork-placeholder-9 m-loaded" style="height: 50px; width: 50px;">',
            `<span style="background-image: url(&quot;${playlistData.artwork_url || playlistData.tracks[0].artwork_url}&quot;); width: 50px; height: 50px; opacity: 1;" class="sc-artwork sc-artwork-placeholder-9 image__full g-opacity-transition" aria-label="test" aria-role="img"></span>`,
          '</div>',
        '</a>',
        '<div class="addToPlaylistItem__content">',
          '<h3 class="addToPlaylistItem__title sc-truncate">',
            `<a href="${playlistData.permalink_url}" class="addToPlaylistItem__titleLink sc-link-dark" title="${playlistData.title}">${playlistData.title}</span>`,
            '</a>',
          '</h3>',
          '<div class="addToPlaylistItem__data">',
            `<span title="${playlistData.tracks.length} tracks" class="addToPlaylistItem__count sc-ministats sc-ministats-small sc-ministats-sounds">${playlistData.tracks.length}</span>`,
            `<span class="sc-button sc-button-small sc-button-responsive sc-button-cta sc-collaborative-label">Collaborative</span>`,
          '</div>',
        '</div>',
        '<div class="addToPlaylistItem__actions g-flex-row-centered">',
          playlistData.tracks.map(track => track.permalink_url.replace('http:', location.protocol)).includes(`${location.protocol}//${location.host}${location.pathname}`) ? '<button class="addToPlaylistButton sc-button sc-button-medium sc-button-responsive sc-button-selected" tabindex="0" title="Remove">Added</button>' : '<button class="addToPlaylistButton sc-button sc-button-medium sc-button-responsive" tabindex="0" title="Add to playlist">Add to playlist</button>',
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
        // Playlist list
        getEditablePlaylists
          .then(editablePlaylists => {
            const listPromise = poll(() => node.querySelector('.lazyLoadingList__list'), 10, 5000)
            return Promise.all(
              [listPromise, ...Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById)]
            )
          })
          .then(([list, ...playlistDataArr]) => {
            // Sort and add to DOM
            playlistDataArr
              .sort((a, b) => {
                // Sort by creation time
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              })
              .map(createPlaylistListItem)
              .forEach(listItem => list.appendChild(listItem))
          })

        // Filter input
        const filterPromise = poll(() => node.querySelector('.addToPlaylistList input'), 100, 5000)
        filterPromise.then(filter => {
          filter.addEventListener('input', () => {
            Array.from(node.querySelectorAll('.sc-collaborative')).forEach(listItem => {
              // TODO: Maintain ordering in list (whatever ordering that is)
              if (listItem.querySelector('.addToPlaylistItem__titleLink').title.startsWith(filter.value)) {
                listItem.style.display = ''
              } else {
                listItem.style.display = 'none'
              }
            })
          })
        })
      }
    })
  })
})
tracksObserver.observe(document.body, {
  childList: true
})
