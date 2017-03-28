'use strict'

let isCollaborative = false

// Listen for data refresh messages
port.onMessage.addListener(msg => {
  if (msg.type === 'refresh') {
    if (msg.name === 'playlist') {
      updatePlaylistData(location.href).then(playlistData => {
        const reject = setTimeout(() => { throw new Error('Timeout') }, 10000)
        port.onMessage.addListener(msg => {
          if (msg.type == 'isCollaborativeResponse') {
            clearTimeout(reject)
            return isCollaborative = msg.isCollaborative
          }
        })
        port.postMessage({
          type: 'isCollaborativeRequest',
          playlistId: playlistData.id
        })
      })
    }
  }
})

function ctaButtonClickHandler (e) {
  getPlaylistData().then(playlistData => {
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
  })
}

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Modal added to DOM
      if (node.classList.contains('modal') && node.innerHTML.includes('Playlist type')) {
        if (isCollaborative) {
          const button = node.querySelector('.baseFields__playlistTypeSelect button.sc-button-dropdown')
          const labels = button.querySelectorAll('span span')
          for (let i = 0; i < labels.length; i++) {
            labels[i].textContent = 'Collaborative Playlist'
          }
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
        newItem.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          isCollaborative = true
          const menu = document.querySelector('.dropdownMenu')
          menu.parentNode.removeChild(menu)
          const labelsParent = document.querySelector('.baseFields__playlistTypeSelect .sc-button-alt-labels')
          for (let i = 0; i < labelsParent.children.length; i++) {
            labelsParent.children[i].textContent = 'Collaborative Playlist'
          }
          ctaButton.removeAttribute('disabled')
          ctaButton.addEventListener('click', ctaButtonClickHandler)
        })
        Array.from(list.querySelectorAll('li')).forEach(li => {
          li.addEventListener('click', () => {
            isCollaborative = false
            ctaButton.removeEventListener('click', ctaButtonClickHandler)
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
