'use strict'

let isCollaborative = false

// TODO: figure out a promise based solution for isCollaborative

// Listen for data refresh messages
port.onMessage.addListener(msg => {
  if (msg.type === 'refresh' && msg.name === 'playlist' && location.href.match(/https:\/\/soundcloud\.com\/.+\/sets\/.+/)) {
    updatePlaylistData(location.href)
      .then(playlistData => {
        const data = {
          type: 'isCollaborativeRequest',
          playlistId: playlistData.id
        }
        return postMessage(port, data, 'isCollaborativeResponse')
      })
      .then(response => {
        isCollaborative = response.isCollaborative
      })
  }
})

function ctaButtonClickHandler (e) {
  getPlaylistData().then(playlistData => {
    if (isCollaborative) {
      port.postMessage({
        type: 'markCollaborative',
        playlistId: playlistData.id
      })
      e.target.classList.add('sc-pending')
      e.target.innerHTML = 'Saving'
      e.target.disabled = 'disabled'
      setTimeout(() => {
        e.target.classList.remove('sc-pending')
        e.target.innerHTML = 'Save Changes'
        const closeButton = document.querySelector('.modal__closeButton')
        if (closeButton) {
          closeButton.click()
        }
      }, 750)
    } else {
      port.postMessage({
        type: 'unmarkCollaborative',
        playlistId: playlistData.id
      })
    }
  })
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.innerHTML.includes('Playlist type')) {
        if (isCollaborative) {
          // Set active playlist type to Collaborative Playlist
          const button = node.querySelector('.baseFields__playlistTypeSelect button.sc-button-dropdown')
          const labels = button.querySelectorAll('span span')
          for (let i = 0; i < labels.length; i++) {
            labels[i].textContent = 'Collaborative Playlist'
          }

          // Add tab for Collaborators
          const ul = node.querySelector('.g-tabs')
          const li = document.createElement('li')
          li.classList = 'g-tabs-item'
          li.addEventListener('click', doNothing)
          const a = document.createElement('a')
          a.classList = 'g-tabs-link'
          a.href = ''
          a.textContent = 'Collaborators'
          li.appendChild(a)
          ul.appendChild(li)

          // Add tab content for Collaborators
          const contentContainer = node.querySelector('.tabs__content')
          const content = document.createElement('div')
          content.classList = 'tabs__contentSlot'
          content.style = 'display: none;'
          const tab = document.createElement('div')
          tab.style = 'margin-top: 25px'
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
            getAnyUserData(collaboratorInput.value).then(userData => {
              return getPlaylistData().then(playlistData => {
                const data = {
                  type: 'grantEditPermissions',
                  playlistId: playlistData.id,
                  userId: userData.id
                }
                return postMessage(port, data, 'grantEditPermissionsResponse')
              })
            }).then(response => {
              if (response.error) {
                return handleError(response.error)
              }
              console.log('SUCCESSFULLY ADDED')
            }).catch(err => {
              if (err.response && err.response.status === 404) {
                handleError('Enter a valid user permalink.')
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

// HTML for List Item (for collaborators)
//          <li class="editTrackList__item sc-border-light-bottom" draggable="true" style="display: list-item;">
//            <div class="editTrackItem sc-type-small">
//              <div class="editTrackItem__image sc-media-image">
//                <div class="image m-sound image__lightOutline readOnly customImage sc-artwork sc-artwork-placeholder-10 m-loaded" style="height: 30px; width: 30px;"><span style="background-image: url(&quot;https://i1.sndcdn.com/artworks-000208884139-5p21bl-t50x50.jpg&quot;); width: 30px; height: 30px; opacity: 1;" class="sc-artwork sc-artwork-placeholder-10  image__full g-opacity-transition" aria-label="Unlike Pluto - Worst In Me" aria-role="img"></span>
//                </div>
//                <div class="editTrackItem__play">
//                  <button class="sc-button-play playButton sc-button sc-button-small" tabindex="0" title="Play">Play</button>
//                </div>
//              </div>
//              <div class="editTrackItem__content sc-media-content sc-truncate">
//                <span class="sc-link-light">Lowly Palace</span> — <span class="editTrackItem__trackTitle sc-type-h3">Unlike Pluto - Worst In Me</span>
//              </div>
//              <div class="editTrackItem__additional">
//                <span class="editTrackItem__duration">
//                  <span class="sc-visuallyhidden">Duration: 3 minutes 17 seconds</span><span aria-hidden="true">3:17</span>
//                </span>
//                <button class="editTrackItem__remove g-button-remove" title="Remove track from playlist">
//                  Remove track from playlist
//                </button>
//              </div>
//            </div>
//          </li>

          content.appendChild(tab)
          contentContainer.appendChild(content)

          // Hook up tab to toggle content
          Array.from(node.querySelectorAll('.g-tabs-item')).forEach((tabItem, tabIndex) => {
            tabItem.addEventListener('click', () => {
              // Set this link to active
              Array.from(node.querySelectorAll('.g-tabs-link')).forEach(link => {
                if (link.parentNode === tabItem) {
                  link.classList.add('active')
                } else {
                  link.classList.remove('active')
                }
              })
              // Show the correct tab content
              Array.from(node.querySelectorAll('.tabs__contentSlot')).forEach((tabContent, contentIndex) => {
                if (tabIndex === contentIndex) {
                  tabContent.style.display = 'block'
                } else {
                  tabContent.style.display = 'none'
                }
              })
            })
          })
        }
      }

      // Dropdown menu for playlist type added to DOM
      if (node.classList.contains('dropdownMenu') && node.innerHTML.includes('Playlist') && node.innerHTML.includes('EP')) {
        const list = node.querySelector('ul')
        const newItem = document.createElement('li')
        newItem.classList = 'linkMenu__item sc-type-small'
        const newLink = document.createElement('a')
        newLink.classList = 'sc-link-dark sc-truncate g-block'
        newLink.href = ''
        newLink.textContent = 'Collaborative Playlist'
        const ctaButton = document.querySelector('.audibleEditForm__formButtons .sc-button-cta')
        ctaButton.addEventListener('click', ctaButtonClickHandler)
        newItem.addEventListener('click', doNothing)
        newItem.addEventListener('click', (e) => {
          isCollaborative = true
          const menu = document.querySelector('.dropdownMenu')
          menu.parentNode.removeChild(menu)
          const labelsParent = document.querySelector('.baseFields__playlistTypeSelect .sc-button-alt-labels')
          for (let i = 0; i < labelsParent.children.length; i++) {
            labelsParent.children[i].textContent = 'Collaborative Playlist'
          }
          ctaButton.removeAttribute('disabled')
        })
        Array.from(list.querySelectorAll('li')).forEach(li => {
          li.addEventListener('click', () => {
            isCollaborative = false
            const labelsParent = document.querySelector('.baseFields__playlistTypeSelect .sc-button-alt-labels')
            for (let i = 0; i < labelsParent.children.length; i++) {
              labelsParent.children[i].textContent = li.firstElementChild.textContent
            }
          })
        })
        newItem.appendChild(newLink)
        if (isCollaborative) {
          newItem.classList.add('linkMenu__activeItem')
          list.querySelector('.linkMenu__activeItem').classList.remove('linkMenu__activeItem')
        }
        list.insertBefore(newItem, list.children[1])
      }
    })
  })
})
observer.observe(document.body, {
  childList: true
})
