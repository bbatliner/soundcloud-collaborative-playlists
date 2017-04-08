'use strict'

const { getIsCollaborative, setIsCollaborative } = (function () {
  function getPromise () {
    return new Promise((resolve, reject) => {
      // Update isCollaborative
      getPlaylistData()
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
          resolve(response.isCollaborative)
        })
        .catch(reject)
    })
  }
  let isCollaborativePromise = getPromise()
  onUrlChange(() => {
    if (location.href.match(setRegex)) {
      isCollaborativePromise = getPromise()
    }
  })
  
  return {
    getIsCollaborative () {
      return isCollaborativePromise
    },
    setIsCollaborative (val) {
      return new Promise(resolve => {
        isCollaborativePromise = Promise.resolve(val)
        resolve()
      })
    }
  }
}())

const { getCollaborators, setCollaboratorById } = (function () {
  function getPromise () {
    return new Promise((resolve, reject) => {
      // Update list of collaborators
      getPlaylistData()
        .then(playlistData => {
            if (playlistData == null) {
              return { collaborators: {} }
            }
            const data = {
              type: 'collaboratorsRequest',
              playlistId: playlistData.id
            }
            return postMessage(port, data, 'collaboratorsResponse')
        })
        .then(response => {
          resolve(response.collaborators || {})
        })
    })
  }
  let collaboratorsPromise = getPromise()
  onUrlChange(() => {
    if (location.href.match(setRegex)) {
      collaboratorsPromise = getPromise()
    }
  })
  return {
    getCollaborators () {
      return collaboratorsPromise
    },
    setCollaboratorById (id, val) {
      return getCollaborators().then(collaborators => {
        collaborators[id] = val
        collaboratorsPromise = Promise.resolve(collaborators)
      })
    }
  }
}())

const getCollaborativeTracks = (function () {
  function getPromise () {
    return getPlaylistData()
      .then(playlistData => {
        if (playlistData == null) {
          return { tracks: {} }
        }
        const data = {
          type: 'getTracks',
          playlistId: playlistData.id
        }
        return postMessage(port, data, 'getTracksResponse')
      })
      .then(response => response.tracks || {})
  }
  let getCollaborativeTracksPromise = getPromise()
  onUrlChange(() => {
    if (location.href.match(setRegex)) {
      getCollaborativeTracksPromise = getPromise()
    }
  })
  return () => getCollaborativeTracksPromise
}())


// Show "Collaborative" indicator
function showCollaborative () {
  getIsCollaborative()
    .then(isCollaborative => {
      if (isCollaborative) {
        document.querySelector('.fullHero__uploadTime').appendChild(stringToDom('<span class="sc-button sc-button-responsive sc-button-cta sc-collaborative-label" style="margin-top: 2px">Collaborative</span>'))
      }
    })
}
onUrlChange(() => {
  if (location.href.match(setRegex)) {
    showCollaborative()
  }
})
showCollaborative()

// Load collaborative tracks!
function showCollaborativeTracks () {
  const collaborativeTracksPromise = getCollaborativeTracks()
  getCollaborativeTracks()
    .then(collaborativeTracks => {
      const listPromise = poll(() => document.querySelector('.trackList__list'), 10, 5000)
      const collaborativeTracksArrPromise = Promise.all(
        Object.keys(collaborativeTracks).filter(key => collaborativeTracks[key] !== false).map(getAnyTrackDataById)
      )
      return Promise.all([listPromise, collaborativeTracksArrPromise])
    })
    .then(([list, collaborativeTracksArr]) => {
      if (collaborativeTracksArr.length === 0) {
        return
      }
      // Insert list items into DOM
      const hr = stringToDom('<hr id="collaborativeTrackDivider">')
      list.parentNode.insertBefore(hr, list)
      const collaborativeList = stringToDom('<ul class="collaborativeTrackList trackList__list sc-list-nostyle sc-clearfix"></ul>')
      list.parentNode.insertBefore(collaborativeList, list.parentNode.children[0])
      collaborativeTracksArr.map(createTrackListItem).forEach(listItem => collaborativeList.appendChild(listItem))
    })
}
onUrlChange(() => {
  if (location.href.match(setRegex)) {
    showCollaborativeTracks()
  }
})
showCollaborativeTracks()

// Replace all the tracks on the page with our custom ones
function replaceNormalTracks () {
  const normalTrackListPromise = poll(() => document.querySelector('.trackList__list:not(.collaborativeTrackList)'), 10, 2000)
  Promise.all([normalTrackListPromise, getIsCollaborative()])
    .then(([normalTrackList, isCollaborative]) => {
      if (!isCollaborative) {
        return
      }
      // Use Promise.all to parallelize the data fetching, while not blocking the DOM rendering
      return Promise.all(
        Array.from(normalTrackList.children).map(listItem => {
          return Promise.all([getUserData(), getAnyTrackData(listItem.querySelector('.trackItem__trackTitle').href), getPlaylistData()])
            .then(([userData, trackData, playlistData]) => {
              Object.assign(trackData, {
                added_by: userData
              })
              listItem.parentNode.replaceChild(createTrackListItem(trackData), listItem)
            })
        })
      )
    })
}
onUrlChange(() => {
  if (location.href.match(setRegex)) {
    replaceNormalTracks()
  }
})
replaceNormalTracks()

// Override the playControls visible on every page
function overridePlayControls () {
  const playControls = document.querySelector('.playControls')
  document.querySelector('.playControls__play').addEventListener('click', doNothing)
}
overridePlayControls()

// TODO: override "x tracks : time" display on set page
// TODO: consider overriding track counts on other pages (namely /you/sets but also in the "Playlists from this user" section)

// DOM helpers
const ctaButtonSelector = '.audibleEditForm__formButtons .sc-button-cta'
const cancelButtonSelector = '.audibleEditForm__formButtons .sc-button[title="Cancel"]'

// Inject some dank CSS
document.head.appendChild(stringToDom(`<style>
  .editTrackList__list:not(:empty) {
    margin-bottom: 15px
  }
</style>`))

function getPlaylistArtworkUrl () {
  const meta = document.head.querySelector('meta[property="twitter:image"]')
  if (meta) {
    return meta.content
  }
  const artwork = document.querySelector('.listenArtworkWrapper span.sc-artwork')
  if (artwork) {
    return artwork.style.backgroundImage.slice(5, -2)
  }
  throw new Error('Unable to find playlist artwork url')
}

function setPageAlbumArt (url) {
  const albumArt = document.querySelector('.listenArtworkWrapper span.sc-artwork')
  if (albumArt.style.backgroundImage.match(url)) {
    return
  }
  albumArt.style.opacity = 0
  const minFutureTime = Date.now() + 300
  const img = new Image()
  img.onload = function onBgLoad () {
    if (Date.now() < minFutureTime) {
      return setTimeout(onBgLoad, minFutureTime - Date.now())
    }
    albumArt.style.backgroundImage = `url("${img.src}")`
    albumArt.style.opacity = 1
  }
  img.src = url
}

function createTrackListItem (trackData) {
  // TODO: who added the track data (stored in firebase)
  trackData.added_by = trackData.added_by || {}
  const dom = stringToDom([
    '<li class="trackList__item sc-border-light-bottom">',
      '<div class="trackItem g-flex-row sc-type-small sc-type-light">',
        '<div class="trackItem__image">',
          '<div class="image m-sound image__lightOutline readOnly customImage sc-artwork sc-artwork-placeholder-10 m-loaded" style="height: 30px; width: 30px;">',
            `<span style="background-image: url(&quot;${trackData.artwork_url}&quot;); width: 30px; height: 30px; opacity: 1;" class="sc-artwork sc-artwork-placeholder-10  image__full g-opacity-transition" aria-label="${trackData.title}" aria-role="img"></span>`,
          '</div>',
          '<div class="trackItem__play">',
            `<button class="sc-button-play playButton sc-button sc-button-small" tabindex="0" title="Play">Play</button>`,
          '</div>',
        '</div>',
        '<div class="trackItem__image">',
          `<a href="/${trackData.added_by.permalink}" rel="nofollow" class="g-avatar-badge-avatar-link">`,
            `<div class="image m-user readOnly customImage sc-artwork sc-artwork-placeholder-5 image__rounded m-loaded" style="height: 30px; width: 30px;" title="Added by ${trackData.added_by.username}"><span style="background-image: url(&quot;${trackData.added_by.avatar_url}&quot;); width: 30px; height: 30px; opacity: 1;" class="sc-artwork sc-artwork-placeholder-5 image__rounded image__full g-opacity-transition" aria-label="${trackData.added_by.username}’s avatar" aria-role="img"></span></div>`,
          '</a>',
        '</div>',
        '<div class="trackItem__content sc-truncate">',
          `<a href="${trackData.user.permalink_url.replace(/http(s?):\/\/soundcloud\.com/, '')}" class="trackItem__username sc-link-light">${trackData.user.username}</a> `,
          '<span class="sc-type-light">—</span> ',
          `<a href="${trackData.permalink_url.replace(/http(s?):\/\/soundcloud\.com/, '')}" class="trackItem__trackTitle sc-link-dark sc-font-light">${trackData.title}</a>`,
        '</div>',
        '<div class="trackItem__additional">',
          '<span class="trackItem__tierIndicator g-go-plus-marker-list sc-hidden"></span>',
          `<span class="trackItem__playCount sc-ministats sc-ministats-medium sc-ministats-plays">${abbreviateNumber(trackData.playback_count).toUpperCase()}</span>`,
          '<div class="trackItem__actions">',
            '<div class="soundActions sc-button-toolbar soundActions__small">',
              '<div class="sc-button-group sc-button-group-small">',
                '<button class="sc-button-like sc-button sc-button-small sc-button-responsive sc-button-icon" aria-describedby="tooltip-134" tabindex="0" title="Like">Like</button>',
                '<button class="sc-button-repost sc-button sc-button-small sc-button-responsive sc-button-icon" aria-describedby="tooltip-136" tabindex="0" aria-haspopup="true" role="button" aria-owns="dropdown-button-137" title="Repost">Repost</button>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
    '</li>'
  ].join(''))

  // Handle hover classes
  const trackItem = dom.querySelector('.trackItem')
  trackItem.addEventListener('mouseover', () => trackItem.classList.add('hover'))
  trackItem.addEventListener('mouseout', () => trackItem.classList.remove('hover'))

  // The play button is very important!
  const playButton = dom.querySelector('.playButton')

  // Handle if this track is already playing
  const activePlayer = getActivePlayer()
  if (activePlayer != null && activePlayer.options.soundId === trackData.id) {
    playButton.classList.add('sc-button-pause')
    setPageAlbumArt(trackData.artwork_url.replace('-large', '-t500x500'))
    trackItem.classList.add('active')
  }

  // Handle play button click
  let isWorking = false
  playButton.addEventListener('click', () => {
    if (isWorking) {
      return
    }
    isWorking = true
    // Show play controls
    document.querySelector('.playControls').classList.add('m-visible')
    // Toggle this track playing
    getPlayerByTrackId(trackData.id).then(player => {
      player.toggle()
      isWorking = false
    })
    // Update all the play buttons in the track list
    Array.from(document.querySelectorAll('.trackList__list .playButton')).forEach(button => {
      if (button === playButton) {
        button.classList.toggle('sc-button-pause')
        getClosest('.trackItem', button).classList.toggle('active')
      } else {
        button.classList.remove('sc-button-pause')
        getClosest('.trackItem', button).classList.remove('active')
      }
    })
    // Update the big album art
    setPageAlbumArt(trackData.artwork_url.replace('-large', '-t500x500'))
  })
  return dom
}

function createCollaboratorListItem (userData, isNew) {
  const dom = stringToDom([
    '<li class="editTrackList__item sc-border-light-bottom" style="display: list-item;">',
      '<div class="editTrackItem sc-type-small">',
        '<div class="editTrackItem__image sc-media-image">',
          `<div class="image m-sound image__lightOutline readOnly customImage sc-artwork sc-artwork-placeholder-10 m-loaded" style="height: 30px; width: 30px;"><span style="background-image: url(&quot;${userData.avatar_url}&quot;); width: 30px; height: 30px; opacity: 1;" class="sc-artwork sc-artwork-placeholder-10 image__full g-opacity-transition"></span>`,
          '</div>',
        '</div>',
        '<div class="sc-media-content sc-truncate">',
          `<span class="sc-link-light" data-id="${userData.id}">${userData.full_name}</span>`,
        '</div>',
        '<div class="editTrackItem__additional">',
          '<button class="editTrackItem__remove g-button-remove" title="Revoke collaborator access">',
            'Revoke collaborator access',
          '</button>',
        '</div>',
      '</div>',
    '</li>'
  ].join(''))
  const removeButton = dom.querySelector('.g-button-remove')
  removeButton.addEventListener('click', () => {
    setCollaboratorById(userData.id, false).then(() => {
      document.querySelector(ctaButtonSelector).removeAttribute('disabled')
      if (dom.parentNode) {
        dom.parentNode.removeChild(dom)
      }
    })
  })
  if (isNew === true) {
    const cancelButton = document.querySelector(cancelButtonSelector)
    cancelButton.addEventListener('click', () => {
      setCollaboratorById(userData.id, false).then(() => {
        if (dom.parentNode) {
          dom.parentNode.removeChild(dom)
        }
      })
    })
  }
  return dom
}

const setsObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.innerHTML.includes('Playlist type')) {
        // "Save Changes" override
        const ctaButton = document.querySelector(ctaButtonSelector)
        ctaButton.addEventListener('click', () => {
          Promise.all([getPlaylistData(), getIsCollaborative(), getCollaborators()])
            .then(([playlistData, isCollaborative, collaborators]) => {
              // Controls the ctaButton state and styles to simulate a save
              function save () {
                ctaButton.classList.add('sc-pending')
                ctaButton.innerHTML = 'Saving'
                ctaButton.disabled = 'disabled'
                setTimeout(() => {
                  ctaButton.classList.remove('sc-pending')
                  ctaButton.innerHTML = 'Save Changes'
                  const closeButton = document.querySelector('.modal__closeButton')
                  if (closeButton) {
                    closeButton.click()
                    if (!document.getElementById('gritter-notice-wrapper')) {
                      createGritter({
                        text: 'Your playlist has been updated successfully.',
                        image: getPlaylistArtworkUrl().replace('500x500', '50x50')
                      })
                    }
                  } else {
                    console.warn('Unable to close modal - close button not found.')
                  }
                }, 750)
              }

              // Handle isCollaborative
              if (isCollaborative) {
                port.postMessage({
                  type: 'markCollaborative',
                  playlistId: playlistData.id
                })
                save()
              } else {
                port.postMessage({
                  type: 'unmarkCollaborative',
                  playlistId: playlistData.id
                })
              }

              // Handle collaborators
              if (isCollaborative) {
                port.postMessage({
                  type: 'saveCollaborators',
                  playlistId: playlistData.id,
                  collaborators: collaborators
                })
                save()
              }
            })
        })

        getIsCollaborative().then(isCollaborative => {
          if (isCollaborative) {
            // Set active playlist type to Collaborative Playlist
            const button = node.querySelector('.baseFields__playlistTypeSelect button.sc-button-dropdown')
            const labels = button.querySelectorAll('span span')
            for (let i = 0; i < labels.length; i++) {
              labels[i].textContent = 'Collaborative Playlist'
            }
          }
        })

        // Add tab for Collaborators
        const ul = node.querySelector('.g-tabs')
        const li = stringToDom('<li class="g-tabs-item" id="collaboratorsTabLi"></li>')
        getIsCollaborative().then(isCollaborative => {
          if (!isCollaborative) {
            li.style.display = 'none'
          }
        })
        li.addEventListener('click', doNothing)
        const a = stringToDom('<a class="g-tabs-link" href>Collaborators</a>')
        li.appendChild(a)
        ul.appendChild(li)

        // Add tab content for Collaborators

        // Tab structure
        const contentContainer = node.querySelector('.tabs__content')
        const content = stringToDom('<div class="tabs__contentSlot" style="display: none;"></div>')
        const tab = stringToDom('<div style="margin-top: 25px"></div>')
        content.appendChild(tab)
        contentContainer.appendChild(content)

        // Collaborator list
        const list = stringToDom('<ul class="collaborators__list editTrackList__list sc-clearfix sc-list-nostyle"></ul>')
        getCollaborators()
          .then(collaborators => {
            return Promise.all(
              Object.keys(collaborators).filter(key => collaborators[key] === true).map(getAnyUserDataById)
            )
          })
          .then(userDataArr => {
            // Clean data...
            userDataArr.forEach(user => { user.full_name = user.full_name || user.username || user.permalink })
            // Sort and add to DOM
            userDataArr
              .sort((a, b) => {
                // Sort lexicographically
                const name = a.full_name.toLowerCase().localeCompare(b.full_name.toLowerCase())
                if (name !== 0) {
                  return name
                }
                // And then by id
                return a.id - b.id
              })
              .map(createCollaboratorListItem)
              .forEach(listItem => list.appendChild(listItem))
          })
        tab.appendChild(list)

        // "Add Collaborator" input
        const input = stringToDom([
          '<div><div class="textfield" id="scCollaboratorTextfield">',
            '<label for="scCollaboratorInput">',
              '<span class="textfield__label">Add collaborator</span>',
            '</label>',
            '<div class="textfield__inputWrapper">',
              '<input class="textfield__input sc-input sc-input-medium" id="scCollaboratorInput" type="text">',
            '</div>',
          '</div>',
          '<button class="sc-button sc-button-medium sc-button-responsive" id="scCollaboratorButton">Add</button></div>'
        ].join(''))
        tab.appendChild(input)

        const textfield = tab.querySelector('#scCollaboratorTextfield')
        const addButton = tab.querySelector('#scCollaboratorButton')
        const collaboratorInput = tab.querySelector('#scCollaboratorInput')

        const handleError = (message) => {
          textfield.classList.add('invalid')
          if (!collaboratorInput.parentNode.querySelector('.textfield__validation')) {
            collaboratorInput.parentNode.appendChild(stringToDom(
              `<div class="textfield__validation g-input-validation">${message}</div>`
            ))
          }
          const removeError = () => {
            addButton.removeEventListener('input', removeError)
            collaboratorInput.removeEventListener('input', removeError)
            textfield.classList.remove('invalid')
            const validation = collaboratorInput.parentNode.querySelector('.textfield__validation')
            if (validation) {
              collaboratorInput.parentNode.removeChild(validation)
            }
          }
          addButton.addEventListener('click', removeError)
          collaboratorInput.addEventListener('input', removeError)
        }

        const addHandler = () => {
          if (!collaboratorInput.value || collaboratorInput.value.length === 0) {
            return
          }
          // Also support adding by profile URL
          let userId
          if (collaboratorInput.value.match(/^https:\/\/soundcloud\.com\/[^\/]+$/)) {
            userId = collaboratorInput.value.substring(collaboratorInput.value.lastIndexOf('/') + 1)
          } else {
            userId = collaboratorInput.value
          }
          const a = getAnyUserData(userId)
          const b = getUserData()
          const c = getCollaborators()
          const d = Promise.all([a, b, c]).then(([userData, myUserData, collaborators]) => {
            if (collaborators[userData.id] === true) {
              throw new Error('Collaborator already added!')
            }
            if (userData.id === myUserData.id) {
              throw new Error('Collaborate with yourself? Impossible!')
            }
            return setCollaboratorById(userData.id, true)
          })
          Promise.all([a, b, c, d])
            .then(([userData, myUserData, collaborators]) => {
              // Find the correct index to insert the new collaborator
              let indexToInsert
              const selector = '.collaborators__list .editTrackItem .sc-link-light'
              const existingCollaborators = Array.from(document.querySelectorAll(selector)).map(el => ({
                id: parseInt(el.dataset.id, 10),
                name: el.textContent
              }))
              userData.full_name = userData.full_name || userData.username || userData.permalink
              const indexOfName = existingCollaborators.map(c => c.name.toLowerCase()).indexOf(userData.full_name.toLowerCase())
              if (indexOfName === -1) {
                indexToInsert = [...existingCollaborators.map(c => c.name.toLowerCase()), userData.full_name.toLowerCase()].sort().indexOf(userData.full_name.toLowerCase())
              } else {
                indexToInsert = indexOfName + [...existingCollaborators.filter(c => c.name === userData.full_name).map(c => c.id), userData.id].sort((a, b) => a - b).indexOf(userData.id)
              }
              list.insertBefore(createCollaboratorListItem(userData, true), list.children[indexToInsert])

              // Reset stuff
              document.querySelector(ctaButtonSelector).removeAttribute('disabled')
              collaboratorInput.value = ''
            })
            .catch(err => {
              if (err.response && err.response.status === 404) {
                handleError('Enter a valid user permalink.')
              } else if (err.message) {
                handleError(err.message)
              } else {
                handleError('Something went wrong.')
              }
            })
        }

        addButton.addEventListener('click', addHandler)
        collaboratorInput.addEventListener('keypress', (e) => {
          if (e.keyCode === 13 || e.which === 13) {
            addHandler()
          }
        })

        // Do tab switching entirely on our own, because adding a new tab breaks Soundcloud's switching
        initializeTabSwitching(node)
      }

      // Dropdown menu for playlist type added to DOM
      if (node.classList.contains('dropdownMenu') && node.innerHTML.includes('Playlist') && node.innerHTML.includes('EP')) {
        // Dropdown structure
        const list = node.querySelector('ul')
        const newItem = document.createElement('li')
        newItem.classList = 'linkMenu__item sc-type-small'
        const newLink = document.createElement('a')
        newLink.classList = 'sc-link-dark sc-truncate g-block'
        newLink.href = ''
        newLink.textContent = 'Collaborative Playlist'
        newItem.appendChild(newLink)
        getIsCollaborative().then(isCollaborative => {
          if (isCollaborative) {
            newItem.classList.add('linkMenu__activeItem')
            list.querySelector('.linkMenu__activeItem').classList.remove('linkMenu__activeItem')
          }
        })
        list.insertBefore(newItem, list.children[1])

        // "Collaborative Playlist" list item events
        newItem.addEventListener('click', doNothing)
        newItem.addEventListener('click', (e) => {
          setIsCollaborative(true).then(() => {
            // Show collaborators tab, if present
            document.querySelector('#collaboratorsTabLi').style.display = ''
            // Set menu labels to Collaborative Playlist
            const menu = document.querySelector('.dropdownMenu')
            menu.parentNode.removeChild(menu)
            const labelsParent = document.querySelector('.baseFields__playlistTypeSelect .sc-button-alt-labels')
            for (let i = 0; i < labelsParent.children.length; i++) {
              labelsParent.children[i].textContent = 'Collaborative Playlist'
            }
            document.querySelector(ctaButtonSelector).removeAttribute('disabled')
          })
        })

        // Set the label back to a normal option when it's selected (not Collaborative Playlist)
        Array.from(list.querySelectorAll('li')).forEach(li => {
          if (li.textContent === 'Collaborative Playlist') {
            return
          }
          li.addEventListener('click', () => {
            setIsCollaborative(false).then(() => {
              // Hide collaborators tab
              document.querySelector('#collaboratorsTabLi').style.display = 'none'
              // Set menu labels to the selected playlist type
              const labelsParent = document.querySelector('.baseFields__playlistTypeSelect .sc-button-alt-labels')
              for (let i = 0; i < labelsParent.children.length; i++) {
                labelsParent.children[i].textContent = li.firstElementChild.textContent
              }
            })
          })
        })
      }
    })
  })
})
setsObserver.observe(document.body, {
  childList: true
})
