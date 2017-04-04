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
  return () => editablePlaylistsPromise
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

function createPlaylistListItem (playlistData) {
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
  const addToPlaylistButton = dom.querySelector('.addToPlaylistButton')
  let isWorking = false
  addToPlaylistButton.addEventListener('click', () => {
    if (isWorking) {
      return
    }
    if (addToPlaylistButton.textContent === 'Add to playlist') {
      isWorking = true
      // Immediately update button
      addToPlaylistButton.textContent = 'Added'
      addToPlaylistButton.classList.add('sc-button-selected')
      addToPlaylistButton.title = 'Remove'
      // Then actually add to playlist
      const a = getAnyTrackData(location.href)
      const b = a.then(trackData => {
        const data = {
          type: 'addTrackToPlaylist',
          playlistId: playlistData.id,
          trackId: trackData.id
        }
        return postMessage(port, data, 'addTrackToPlaylistResponse')
      })
      Promise.all([a, b])
        .then(([trackData]) => {
          createGritter({
            title: trackData.title,
            text: `was added to <a href="${playlistData.permalink_url}">${playlistData.title}</a>.`,
            image: playlistData.artwork_url || playlistData.tracks[0].artwork_url
          })
          isWorking = false
        })
        .catch(() => {
          createGritter({
            title: 'Something went wrong :(',
            text: 'Couldn\'t add track to playlist.',
            image: playlistData.artwork_url || playlistData.tracks[0].artwork_url
          })
          // Revert button to old state
          addToPlaylistButton.textContent = 'Add to playlist'
          addToPlaylistButton.classList.remove('sc-button-selected')
          addToPlaylistButton.title = 'Add to playlist'
          isWorking = false
        })
      return
    }
    if (addToPlaylistButton.textContent === 'Added') {
      isWorking = true
      // Immediately update button
      addToPlaylistButton.textContent = 'Add to playlist'
      addToPlaylistButton.classList.remove('sc-button-selected')
      addToPlaylistButton.title = 'Add to playlist'
      // Then actually remove from playlist
      const a = getAnyTrackData(location.href)
      const b = a.then(trackData => {
        const data = {
          type: 'removeTrackFromPlaylist',
          playlistId: playlistData.id,
          trackId: trackData.id
        }
        return postMessage(port, data, 'removeTrackFromPlaylistResponse')
      })
      Promise.all([a, b])
        .then(([trackData]) => {
          addToPlaylistButton.textContent = 'Add to playlist'
          addToPlaylistButton.classList.remove('sc-button-selected')
          addToPlaylistButton.title = 'Add to playlist'
          isWorking = false
        })
        .catch(() => {
          createGritter({
            title: 'Something went wrong :(',
            text: 'Couldn\'t remove track from playlist.',
            image: playlistData.artwork_url || playlistData.tracks[0].artwork_url
          })
          // Revert button to old state
          addToPlaylistButton.textContent = 'Added'
          addToPlaylistButton.classList.add('sc-button-selected')
          addToPlaylistButton.title = 'Remove'
          isWorking = false
        })
      return
    }
    throw new Error('addToPlaylistButton had unexpected textContent')
  })
  return dom
}

const tracksObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.querySelector('.addToPlaylistList')) {
        // Playlist list
        getEditablePlaylists()
          .then(editablePlaylists => {
            const listPromise = poll(() => node.querySelector('.lazyLoadingList__list'), 10, 5000)
            const playlistDataPromise = Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
            return Promise.all([listPromise, playlistDataPromise])
          })
          .then(([list, playlistDataArr]) => {
            if (playlistDataArr.length === 0) {
              return
            }
            const hr = stringToDom('<hr id="collaborativeDivider">')
            list.parentNode.insertBefore(hr, list)
            const collaborativeList = stringToDom('<ul class="lazyLoadingList__list sc-list-nostyle sc-clearfix"></ul>')
            list.parentNode.insertBefore(collaborativeList, hr)
            // Sort and add to DOM
            playlistDataArr
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(createPlaylistListItem)
              .forEach(listItem => collaborativeList.appendChild(listItem))
          })

        // Filter input
        poll(() => node.querySelector('.addToPlaylistList input'), 100, 5000)
          .then(filter => {
            filter.addEventListener('input', () => {
              const collaborativePlaylists = Array.from(node.querySelectorAll('.sc-collaborative'))
              collaborativePlaylists.forEach(listItem => {
                const filterOnTitle = listItem.querySelector('.addToPlaylistItem__titleLink').title.toLowerCase().startsWith(filter.value.toLowerCase())
                const filterOnCollaborative = filter.value.length > 0 && 'collaborative'.startsWith(filter.value.toLowerCase())
                if (filterOnTitle || filterOnCollaborative) {
                  listItem.style.display = ''
                } else {
                  listItem.style.display = 'none'
                }
              })
              const hr = document.getElementById('collaborativeDivider')
              const noCollaborative = collaborativePlaylists.every(list => list.style.display === 'none')
              const onlyCollaborative = node.querySelector('#collaborativeDivider + ul').children.length === 0
              if (noCollaborative || onlyCollaborative) {
                hr.style.display = 'none'
              } else {
                hr.style.display = ''
              }
            })
          })

        // Clear button
        poll(() => node.querySelector('.addToPlaylistList button.textfield__clear'), 100, 5000)
          .then(clear => {
            clear.addEventListener('click', () => {
              const collaborativePlaylists = Array.from(node.querySelectorAll('.sc-collaborative'))
              collaborativePlaylists.forEach(listItem => {
                listItem.style.display = ''
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
