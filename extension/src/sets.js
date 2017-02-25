'use strict'

// getPlaylistData(location.href)


// Get username and set name from url
// const [ , username, setName ] = location.href.match('https://soundcloud.com/(.*)/sets/(.*)')
// Get playlist id from page
// const [ , setId ] = document.head.innerHTML.match(/"soundcloud:\/\/playlists:(\d+)"/)

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.classList.contains('dropdownMenu') && node.innerHTML.includes('Playlist') && node.innerHTML.includes('EP')) {
        const list = node.querySelector('ul')
        const newItem = document.createElement('li')
        newItem.classList = 'linkMenu__item sc-type-small'
        const newLink = document.createElement('a')
        newLink.classList = 'sc-link-dark sc-truncate g-block'
        newLink.href = ''
        newLink.textContent = 'Collaborative Playlist'
        newItem.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          getPlaylistData().then(data => console.log('I am playlist data!', data))
          const menu = document.querySelector('.dropdownMenu')
          menu.parentNode.removeChild(menu)
          const labelsParent = document.querySelector('.baseFields__playlistTypeSelect .sc-button-alt-labels')
          for (let i = 0; i < labelsParent.children.length; i++) {
            labelsParent.children[i].textContent = 'Collaborative Playlist'
          }
        })
        newItem.appendChild(newLink)
        list.insertBefore(newItem, list.children[1])
      }
    })
  })
})
observer.observe(document.body, {
  childList: true
})
