'use strict'

let isCollaborative = false

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
            '<div class="textfield">',
              '<label for="scFormControl">',
                '<span class="textfield__label">Add collaborator</span>',
              '</label>',
              '<div class="textfield__inputWrapper">',
                '<input class="textfield__input sc-input sc-input-medium" id="scFormControl" type="text">',
              '</div>',
            '</div>'
          ].join(''))
          tab.appendChild(input)
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
