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
          return fetchAuthenticated(`/api/isCollaborative?playlistId=${playlistData.id}`).then(response => response.json())
        })
        .then(response => {
          resolve(response.isCollaborative)
        })
        .catch(reject)
    })
  }
  let isCollaborativePromise
  const updatePromiseIfLocation = () => {
    if (getLocationHref().match(setRegex)) {
      isCollaborativePromise = getPromise()
    }
  }
  onUrlChange(updatePromiseIfLocation)
  updatePromiseIfLocation()
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
            return fetchAuthenticated(`/api/collaborators?playlistId=${playlistData.id}`).then(response => response.json())
        })
        .then(response => {
          resolve(response.collaborators || {})
        })
    })
  }
  let collaboratorsPromise
  const updatePromiseIfLocation = () => {
    if (getLocationHref().match(setRegex)) {
      collaboratorsPromise = getPromise()
    }
  }
  onUrlChange(updatePromiseIfLocation)
  updatePromiseIfLocation()
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
        return fetchAuthenticated(`/api/getTracks?playlistId=${playlistData.id}`)
      })
      .then(response => response.json())
      .then(data => data.tracks || {})
  }
  let getCollaborativeTracksPromise
  const updatePromiseIfLocation = () => {
    if (getLocationHref().match(setRegex)) {
      getCollaborativeTracksPromise = getPromise()
    }
  }
  onUrlChange(updatePromiseIfLocation)
  updatePromiseIfLocation()
  return () => getCollaborativeTracksPromise
}())

// Load collaborative tracks!
function showCollaborativeTracks () {
  const collaborativeTracksPromise = getCollaborativeTracks()
  const collaborativeTracksArrDataPromise = collaborativeTracksPromise.then(collaborativeTracks => {
    return Promise.all(Object.keys(collaborativeTracks).map(getAnyTrackDataById))
  })
  const listPromise = poll(() => document.querySelector('.trackList__list'), 10, 5000)
  Promise.all([collaborativeTracksPromise, collaborativeTracksArrDataPromise, listPromise])
    .then(([collaborativeTracks, collaborativeTracksDataArr, list]) => {
      function addCollaborator (node, addedBy) {
        if (node.querySelector('#collaboratorImage') != null) {
          return
        }
        console.count('called')
        const image = node.querySelector('.trackItem__image')
        image.style.marginRight = '4px'
        const number = node.querySelector('.trackItem__numberWrapper')
        number.parentNode.removeChild(number)
        const collaboratorImage = stringToDom(`
          <div class="trackItem__image" style="margin-right: 4.69px;">
            <div id="collaboratorImage" class="image m-sound image__lightOutline readOnly customImage sc-artwork sc-artwork-placeholder-9 m-loaded" style="height: 30px; width: 30px; background-image: none">
              <span style="width: 30px; height: 30px; opacity: 0;" class="sc-artwork sc-artwork-placeholder-9 image__full image__rounded g-opacity-transition" aria-label="${addedBy.name}" aria-role="img"></span>
            </div>
          </div>
        `)
        const container = collaboratorImage.querySelector('div.sc-artwork')
        const addedOn = new Date(addedBy.timestamp)
        container.title = `Added by ${addedBy.name} on ${addedOn.toLocaleString('en-us', { month: 'long', day: 'numeric' })}`
        if (addedOn.getFullYear() < new Date().getFullYear()) {
          container.title += `, ${addedOn.getFullYear()}`
        }
        const img = collaboratorImage.querySelector('span.sc-artwork')
        const bgImg = new Image()
        bgImg.onload = () => {
          img.style.backgroundImage = `url(${addedBy.picture})`
          img.style.opacity = 1
        }
        bgImg.src = addedBy.picture
        image.parentNode.insertBefore(collaboratorImage, image.nextSibling)
      }
      collaborativeTracksDataArr.forEach(trackData => {
        const addedBy = collaborativeTracks[trackData.id]
        const listItem = Array.from(list.children).filter(el => el.querySelector('.trackItem__trackTitle').innerText === trackData.title)[0]
        addCollaborator(listItem, addedBy)
        const listItemObserver = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.querySelector && node.querySelector('#collaboratorImage')) {
                return
              }
              if (node.parentNode && node.parentNode.parentNode && node.parentNode.parentNode.matches('li.trackList__item')) {
                addCollaborator(node.parentNode.parentNode, addedBy)
              }
            })
          })
        })
        listItemObserver.observe(listItem.parentNode, {
          childList: true,
          subtree: true
        })
      })
    })

  const trackDataArrPromise = listPromise.then(list => {
    return Promise.all(Array.from(list.children).map((listItem, index) => {
      return getAnyTrackData(listItem.querySelector('.trackItem__trackTitle').href)
    }))
  })
  Promise.all([listPromise, trackDataArrPromise])
    .then(([list, trackDataArr]) => {
      Array.from(list.children).forEach((listItem, index) => {
        listItem.addEventListener('click', () => {
          window.currentTrackId = trackDataArr[index].id
        })
      })
    })
}
const showCollaborativeTracksIfLocation = () => {
  if (location.href.match(setRegex)) {
    showCollaborativeTracks()
  }
}
onUrlChange(showCollaborativeTracksIfLocation)
showCollaborativeTracksIfLocation()

// Show "Collaborative" indicator
function showCollaborative () {
  const isCollaborativePromise = getIsCollaborative()
  const elPromise = poll(() => document.querySelector('.fullHero__uploadTime'))
  Promise.all([isCollaborativePromise, elPromise])
    .then(([isCollaborative, el]) => {
      if (isCollaborative) {
        const indicator = stringToDom('<span class="sc-button sc-button-responsive sc-button-cta sc-collaborative-label g-opacity-transition" style="margin-top: 2px; opacity: 0">Collaborative</span>')
        el.appendChild(indicator)
        setTimeout(() => { indicator.style.opacity = 1 }, 10)
      }
    })
}
const showCollaborativeIfLocation = () => {
  if (getLocationHref().match(setRegex)) {
    showCollaborative()
  }
}
onUrlChange(showCollaborativeIfLocation)
showCollaborativeIfLocation()

// DOM helpers
const ctaButtonSelector = '.audibleEditForm__formButtons .sc-button-cta'
const cancelButtonSelector = '.audibleEditForm__formButtons .sc-button[title="Cancel"]'

// Inject some dank CSS
document.head.appendChild(stringToDom(`<style>
  .editTrackList__list:not(:empty) {
    margin-bottom: 15px;
  }
  .editTrackList__item.toRemove {
    display: none!important;
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
      dom.classList.add('toRemove')
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
              // Style the simulated pending save
              ctaButton.classList.add('sc-pending')
              ctaButton.innerHTML = 'Saving'
              ctaButton.disabled = 'disabled'

              const promises = []

              // Handle isCollaborative
              if (isCollaborative) {
                promises.push(fetchAuthenticated(`/api/markCollaborative?playlistId=${playlistData.id}`))
              } else {
                promises.push(fetchAuthenticated(`/api/unmarkCollaborative?playlistId=${playlistData.id}`))
              }

              // Handle collaborators
              if (isCollaborative) {
                promises.push(fetchAuthenticated(`/api/collaborators`, {
                  method: 'post',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    playlistId: playlistData.id,
                    collaborators
                  })
                }))
              }

              Promise.all(promises)
                .then(() => {
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
                })
                .catch(err => {
                  console.error(err)
                  ctaButton.classList.remove('sc-pending')
                  ctaButton.innerHTML = 'Save Changes'
                  Array.from(document.querySelectorAll('.editTrackList__item.toRemove')).forEach(el => {
                    el.classList.remove('toRemove')
                  })
                  createGritter({
                    text: 'Unable to save playlist. Try again later.',
                    image: getPlaylistArtworkUrl().replace('500x500', '50x50')
                  })
                })
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
