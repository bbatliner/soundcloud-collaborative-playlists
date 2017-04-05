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

const getTrackData = (function () {
  function getPromise () {
    return getAnyTrackData(location.href)
  }
  let getTrackDataPromise = getPromise()
  onUrlChange(() => {
    if (location.href.match(trackRegex)) {
      getTrackDataPromise = getPromise()
    }
  })
  return () => getTrackDataPromise
}())

// DOM helpers

// Inject some dank CSS
document.head.appendChild(stringToDom(`<style>
  .sc-collaborative-label {
    margin-left: 10px;
    height: 26px;
    line-height: 1.5;
    user-select: initial;
  }
  .sc-collaborative-label-small {
    padding: 1px 4px;
    margin-left: 8px;
    height: 16px;
    line-height: 1.2;
    user-select: initial;
  }
  .sc-collaborative-label:hover,
  .sc-collaborative-label-small:hover {
    cursor: default;
  }
</style>`))

function createPlaylistListItem (playlistData) {
  // TODO: number of tracks in the playlist is actually this data + the track data in the Firebase
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
            `<span title="${playlistData.tracks.length} tracks" class="addToPlaylistItem__count sc-ministats sc-ministats-small sc-ministats-sounds"> ${playlistData.tracks.length}</span>`,
            `<span class="sc-button sc-button-small sc-button-responsive sc-button-cta sc-collaborative-label-small">Collaborative</span>`,
          '</div>',
        '</div>',
        '<div class="addToPlaylistItem__actions g-flex-row-centered">',
          playlistData.tracks.map(track => track.permalink_url.replace('http:', location.protocol)).includes(`${location.protocol}//${location.host}${location.pathname}`) ? '<button class="addToPlaylistButton sc-button sc-button-medium sc-button-responsive sc-button-selected" tabindex="0" title="Remove">Added</button>' : '<button class="addToPlaylistButton sc-button sc-button-medium sc-button-responsive" tabindex="0" title="Add to playlist">Add to playlist</button>',
        '</div>',
      '</div>',
    '</li>'
  ].join(''))
  const addToPlaylistButton = dom.querySelector('.addToPlaylistButton')
  const count = dom.querySelector('.addToPlaylistItem__count')
  let isWorking = false
  addToPlaylistButton.addEventListener('click', () => {
    if (isWorking) {
      return
    }
    const currentCount = parseInt(count.textContent, 10)
    if (addToPlaylistButton.textContent === 'Add to playlist') {
      isWorking = true
      // Immediately update button
      addToPlaylistButton.textContent = 'Added'
      addToPlaylistButton.classList.add('sc-button-selected')
      addToPlaylistButton.title = 'Remove'
      count.title = `${currentCount + 1} tracks`
      count.textContent = ` ${currentCount + 1}`
      // Then actually add to playlist
      const a = getTrackData()
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
          count.title = `${currentCount} tracks`
          count.textContent = ` ${currentCount}`
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
      count.title = `${currentCount - 1} tracks`
      count.textContent = ` ${currentCount - 1}`
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
          count.title = `${currentCount} tracks`
          count.textContent = ` ${currentCount}`
          isWorking = false
        })
      return
    }
    throw new Error('addToPlaylistButton had unexpected textContent')
  })
  return getTrackData().then(trackData => {
    if (playlistData.tracks.map(track => track.id).includes(trackData.id)) {
      addToPlaylistButton.disabled = true
      addToPlaylistButton.textContent = 'Added by owner'
      addToPlaylistButton.title = 'Added by owner'
    }
    return dom
  })
}

const tracksObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.querySelector('.addToPlaylistTabs')) {
        // Add "Collaborative" badges to your own playlists, too!
        if (node.querySelector('.addToPlaylistList')) {
          poll(() => node.querySelector('.lazyLoadingList__list:last-child:not(:first-child)'), 10, 5000)
            .then(list => {
              // Use Promise.all to parallelize the entire process of data fetching + port messaging,
              // instead of waiting for each piece of the pipeline to finish entirely
              return Promise.all(Array.from(list.children).map(li => li.querySelector('a').href).map((url, i) => {
                return getAnyPlaylistData(url)
                  .then(playlistData => {
                    if (playlistData == null) {
                      return { isCollaborative: false }
                    }
                    const data = {
                      type: 'isCollaborativeRequest',
                      playlistId: playlistData.id
                    }
                    return postMessage(port, data, 'isCollaborativeResponse')
                  })
                  .then(response => {
                    if (response.isCollaborative) {
                      list.children[i].querySelector('.addToPlaylistItem__data').appendChild(stringToDom(
                        '<span class="sc-button sc-button-small sc-button-responsive sc-button-cta sc-collaborative-label-small">Collaborative</span>'
                      ))
                    }
                  })
              }))
            })
        }
        // Playlist list
        getEditablePlaylists()
          .then(editablePlaylists => {
            return Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
          })
          .then(playlistDataArr => {
            const listPromise = poll(() => node.querySelector('.lazyLoadingList__list'), 10, 5000)
            const listItemsPromise = Promise.all(
              playlistDataArr
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(createPlaylistListItem)
            )
            // Add the "Add" tab if there are no SoundCloud playlists and some collaborative playlists
            if (playlistDataArr.length !== 0 && !node.querySelector('.addToPlaylistList')) {
              const tabsContainer = node.querySelector('.tabs')
              tabsContainer.removeChild(tabsContainer.querySelector('.tabs__headingContainer'))
              const tabs = tabsContainer.insertBefore(stringToDom(`
                <div class="tabs__tabs">
                  <ul class="g-tabs g-tabs-large">
                      <li class="g-tabs-item">
                        <a class="g-tabs-link" tabindex="-1" href="">
                          Add to playlist
                        </a>
                      </li>
                      <li class="g-tabs-item">
                        <a class="g-tabs-link active" href="">
                          Create a playlist
                        </a>
                      </li>
                  </ul>
                </div>
              `), tabsContainer.children[0])
              const addTab = tabs.querySelector('li:first-child')
              addTab.addEventListener('click', doNothing)
              const createTab = tabs.querySelector('li:last-child')
              createTab.addEventListener('click', doNothing)

              // Add the CSS that Soundcloud would add to the page
              document.head.appendChild(stringToDom('<style type="text/css">.addToPlaylistItem__title{margin-bottom:3px}.addToPlaylistItem__image{margin-right:10px}.addToPlaylistItem__content{-webkit-flex:1;-ms-flex:1;flex:1;margin-right:8px;overflow:hidden}.addToPlaylistItem__private{margin-right:10px}.addToPlaylistItem__hint{margin-left:5px}</style>'))
              document.head.appendChild(stringToDom('<style>.addToPlaylistList__item{padding:10px 0;margin-right:30px;width:100%}.addToPlaylistList__item:first-child{border-top:0;padding-top:0}.addToPlaylistList__item:last-child{padding-bottom:0}</style>'))

              // Add "Add to playlist" tab content
              const tabContent = stringToDom(`
                <div class="tabs__contentSlot" style="display: none;">
                  <div class="addToPlaylist">
                    <section class="g-modal-section sc-clearfix">
                      <div class="addToPlaylistList lazyLoadingList">
                        <form onsubmit="return false">
                          <div class="textfield">
                            <label for="formControl_4031">
                              <span class="textfield__label sc-visuallyhidden"> Filter playlists</span>
                            </label>
                            <div class="textfield__inputWrapper">
                              <input class="textfield__input sc-input sc-input-medium" id="formControl_4031" type="text" value="" placeholder="Filter playlists" aria-required="false">
                              <button type="button" class="textfield__clear" title="Clear"></button>
                              <div class="textfield__validation g-input-validation g-input-validation-hidden"></div>
                            </div>
                          </div>
                          <div class="addToPlaylistList__list">
                            <ul class="lazyLoadingList__list sc-list-nostyle sc-clearfix"></ul>
                          </div>
                        </form>
                      </div>
                    </section>
                  </div>
                </div>
              `)
              const contentContainer = node.querySelector('.tabs__content')
              contentContainer.insertBefore(tabContent, contentContainer.children[0])

              // Do tab switching entirely on our own, because adding a new tab breaks Soundcloud's switching
              initializeTabSwitching(node)
            }

            return Promise.all([listPromise, listItemsPromise])
          })
          .then(([list, listItems]) => {
            if (listItems.length === 0) {
              return
            }
            // Insert into DOM
            const hr = stringToDom('<hr id="collaborativeDivider">')
            list.parentNode.insertBefore(hr, list)
            const collaborativeList = stringToDom('<ul class="lazyLoadingList__list sc-list-nostyle sc-clearfix"></ul>')
            list.parentNode.insertBefore(collaborativeList, hr)
            listItems.forEach(listItem => collaborativeList.appendChild(listItem))
          })

        // Filter input
        poll(() => node.querySelector('.addToPlaylistList input'), 100, 5000)
          .then(filter => {
            const filterInputHandler = () => {
              // Poll for when the custom list is actually inserted into the DOM (since it's all Promises lol)
              poll(() => node.querySelector('#collaborativeDivider + ul'), 10, 2000).then(collaborativeList => {
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
                const noCollaborative = collaborativePlaylists.every(list => list.style.display === 'none')
                const hr = document.getElementById('collaborativeDivider')
                const onlyCollaborative = collaborativeList.children.length === 0
                if (noCollaborative || onlyCollaborative) {
                  hr.style.display = 'none'
                } else {
                  hr.style.display = ''
                }
              })
            }
            filter.addEventListener('input', filterInputHandler)
            filterInputHandler()
          })

        // Clear button
        poll(() => node.querySelector('.addToPlaylistList button.textfield__clear'), 100, 5000)
          .then(clear => {
            clear.addEventListener('click', () => {
              document.getElementById('collaborativeDivider').style.display = ''
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
