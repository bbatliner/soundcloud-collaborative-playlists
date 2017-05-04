import { MutationObserver } from './util/window'
import { runOnPage } from './util/extension'
import { stringToDom, poll, doNothing, createPlaylistItemCreator } from './util/dom'
import { getEditablePlaylists, getAnyPlaylistDataById } from './util/data'

const playlistRegex = /^https:\/\/soundcloud\.com\/you\/sets$/

// DOM Helpers
const createPlaylistBadgeItem = createPlaylistItemCreator({
  stayOnPageOnPlay: true,
  onPlay () {
    const tile = this.querySelector('.audibleTile')
    tile.classList.add('m-playing')
  },
  onPause () {
    const tile = this.querySelector('.audibleTile')
    tile.classList.remove('m-playing')
  },
  templateFn: (playlistData, isPlaying) => `html
    <li class="badgeList__item collaborativeBadge">
      <div class="audibleTile ${isPlaying ? 'm-playing' : ''}" data-description="always" data-playbutton="hover" data-actions="hover">
        <div class="audibleTile__artwork">
          <a class="audibleTile__artworkLink" href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">
            <div class="audibleTile__image">
              <div class="image m-playlist image__lightOutline readOnly customImage sc-artwork sc-artwork-placeholder-1 m-loaded" style="height: 100%; width: 100%;"><span style="width: 100%; height: 100%; opacity: 1; background-image: url(&quot;${playlistData.artwork_url.replace('-large', '-t200x200')}&quot;);" class="sc-artwork sc-artwork-placeholder-1  image__full g-opacity-transition" aria-label="${playlistData.title}" aria-role="img"></span>
              </div>
            </div>
            <div class="audibleTile__trackCount">
              <div class="playlistTrackCount">
                <div class="genericTrackCount small m-active" title="Collaborative Playlist" style="border: 2.5px solid #f50; padding-top: 10.5px;">
                  <div class="genericTrackCount__title sc-font-tabular">${playlistData.track_count}</div>
                  <div class="genericTrackCount__subtitle sc-font">
                    Tracks
                  </div>
                </div>
              </div>
            </div>
          </a>

          <div class="audibleTile__playButton g-z-index-content">
            ${isPlaying ? '<button class="sc-button-play playButton sc-button m-stretch sc-button-pause" tabindex="0" title="Pause">Pause</button>' : '<button class="sc-button-play playButton sc-button m-stretch" tabindex="0" title="Play">Play</button>'}
          </div>
        </div>

        <div class="audibleTile__description">
          <a class="audibleTile__heading audibleTile__mainHeading audibleTile__audibleHeading sc-truncate sc-type-light sc-font-light sc-link-dark" href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">

            ${playlistData.title}
          </a>
          <div class="audibleTile__usernameHeadingContainer sc-type-light sc-font-light">
            <a class="audibleTile__usernameHeading sc-link-light sc-truncate" href="${playlistData.user.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">${playlistData.user.username}</a>
              <span class="releaseDataCompact sc-type-light sc-font-light audibleTile__releaseData"></span>
          </div>
        </div>
      </div>
    </li>
  `
})

// Show collaborative playlists
runOnPage(playlistRegex, function showCollaborativePlaylists () {
  getEditablePlaylists()
    .then(editablePlaylists => {
      return Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
    })
    .then(playlistDataArr => {
      const listPromise = poll(() => document.querySelector('.lazyLoadingList__list'), 10, 5000)
      const badgeItemsPromise = Promise.all(
        playlistDataArr
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(createPlaylistBadgeItem)
      )
      return Promise.all([listPromise, badgeItemsPromise])
    })
    .then(([list, badgeItems]) => {
      badgeItems.forEach(item => {
        item.style.opacity = 0
        item.classList.add('g-opacity-transition')
        list.appendChild(item)
        setTimeout(() => { item.style.opacity = 1 }, 10)
      })
    })
})

// Update the 'Filter' input and filter dropdown styles
runOnPage(playlistRegex, function updateInputs () {
  const sectionPromise = poll(() => document.querySelector('.collectionSection__filters'))
  const listPromise = poll(() => document.querySelector('.badgeList'))
  Promise.all([sectionPromise, listPromise]).then(([section, list]) => {
    section.style.width = '30%'
    section.querySelector('.sc-button-dropdown').style.width = '123.3px'
    const onNewList = (function () {
      const handlers = []
      const listObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.matches && node.matches('ul.lazyLoadingList__list')) {
              handlers.forEach(handler => handler(node))
            }
          })
        })
      })
      listObserver.observe(list, {
        childList: true
      })
      return function onNewList (fn) {
        handlers.push(fn)
      }
    }())
    const filterInput = section.querySelector('input.textfield__input')
    filterInput.addEventListener('input', () => {
      function matches (badge) {
        const title = badge.querySelector('.audibleTile__heading')
        const owner = badge.querySelector('.audibleTile__usernameHeading')
        const titleMatches = title.textContent.trim().toLowerCase().split(' ').some(word => word.startsWith(filterInput.value.toLowerCase()))
        const ownerMatches = owner.textContent.trim().toLowerCase().split(' ').some(word => word.startsWith(filterInput.value.toLowerCase()))
        if (titleMatches || ownerMatches) {
          return true
        }
        return false
      }
      Array.from(document.querySelectorAll('.collaborativeBadge')).forEach(badge => {
        if (filterInput.value.length === 0) {
          badge.style.display = 'block'
          return
        }
        if (matches(badge)) {
          badge.style.display = 'block'
        } else {
          badge.style.display = 'none'
        }
        onNewList(newList => {
          newList.appendChild(badge)
        })
      })
    })
    const clearButton = section.querySelector('button.textfield__clear')
    clearButton.addEventListener('click', () => {
      Array.from(document.querySelectorAll('.collaborativeBadge')).forEach(badge => {
        badge.style.display = 'block'
      })
    })
  })
})

const playlistsObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Dropdown menu added to DOM
      if (node.classList.contains('dropdownMenu') && node.querySelector('.linkMenu') && node.innerHTML.includes('Liked')) {
        // Add "Collaborative"
        const collaborativeItem = stringToDom(`html
          <li class="linkMenu__item sc-type-small">
            <a class="sc-link-dark sc-truncate g-block" href="" data-link-id="collaborative">Collaborative</a>
          </li>
        `)
        const list = node.querySelector('ul')
        list.appendChild(collaborativeItem)

        // Set active item
        const dropdownButton = document.querySelector('button.sc-button-dropdown')
        const activeFilter = dropdownButton.querySelector('.sc-button-label-default').textContent
        Array.from(list.children).forEach(item => {
          if (item.textContent.trim() === activeFilter) {
            item.classList.add('linkMenu__activeItem')
          } else {
            item.classList.remove('linkMenu__activeItem')
          }
        })

        // Override clicks
        Array.from(list.children).map(item => {
          item.addEventListener('click', doNothing)
          item.addEventListener('click', () => {
            function filter (condition) {
              Array.from(document.querySelectorAll('.badgeList__item')).forEach(badge => {
                if (condition(badge)) {
                  if (badge.style.display === 'block') {
                    return
                  }
                  const artwork = badge.querySelector('span.sc-artwork')
                  artwork.style.opacity = 0
                  badge.style.display = 'block'
                  setTimeout(() => {
                    artwork.style.opacity = 1
                  })
                } else {
                  badge.style.display = 'none'
                }
              })
            }
            function setLabel (text) {
              Array.from(document.querySelector('.collectionSection__filterSelect .sc-button-alt-labels').children).forEach(label => {
                label.textContent = text
              })
            }
            switch (item.textContent.trim()) {
              case 'All':
                filter(() => true)
                setLabel('All')
                break
              case 'Created':
                filter(badge => badge.querySelector('.audibleTile__usernameHeading').textContent === document.querySelector('.userNav__username').textContent)
                setLabel('Created')
                break
              case 'Liked':
                filter(badge => badge.querySelector('.sc-button-like.sc-button-selected'))
                setLabel('Liked')
                break
              case 'Collaborative':
                filter(badge => badge.classList.contains('collaborativeBadge'))
                setLabel('Collaborative')
                break
              default:
                console.warn('Unsupported filter:', item.textContent.trim())
                break
            }
            node.parentNode.removeChild(node)
            setTimeout(() => dropdownButton.click(), 0)
          })
        })
      }
    })
  })
})
playlistsObserver.observe(document.body, {
  childList: true
})
