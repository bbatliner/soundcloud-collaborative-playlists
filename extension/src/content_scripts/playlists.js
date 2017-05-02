'use strict'

// DOM helpers

function getPlayControlsVisible () {
  const playControls = document.querySelector('.playControls')
  return playControls && playControls.classList.contains('m-visible')
}

function getPlayingFromSet (setTitle, setOwner) {
  const playControlsLink = document.querySelector('.playbackSoundBadge__title')
  return playControlsLink && playControlsLink.href.includes(`?in=${setOwner}/sets/${setTitle}`)
}

function createPlaylistBadgeItem (playlistData) {
  const playControlsVisible = getPlayControlsVisible()
  const playingFromSet = getPlayingFromSet(playlistData.title, playlistData.user.username)
  const playControlsPlayButton = document.querySelector('.playControls .playControls__play')
  const isPlaying = playControlsVisible && playingFromSet && playControlsPlayButton.classList.contains('playing')
  const dom = stringToDom(`
    <li class="badgeList__item">
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
  `)
  const playButton = dom.querySelector('.audibleTile__playButton .playButton')
  const togglePlayStyles = (override) => {
    const tile = dom.querySelector('.audibleTile')
    if (override === 'pause' || (override !== 'play' && playButton.classList.contains('sc-button-pause'))) {
      tile.classList.remove('m-playing')
      playButton.classList.remove('sc-button-pause')
      playButton.title = 'Play'
      playButton.textContent = 'Play'
    } else {
      tile.classList.add('m-playing')
      playButton.classList.add('sc-button-pause')
      playButton.title = 'Pause'
      playButton.textContent = 'Pause'
    }
  }
  playButton.addEventListener('click', () => {
    // Toggle styles
    togglePlayStyles()

    // Toggle playing
    // Prefer the play controls, if they're on the page
    if (getPlayControlsVisible() && getPlayingFromSet(playlistData.title, playlistData.user.username)) {
      playControlsPlayButton.click()
    }
    // Otherwise navigate to the set page and click the play/pause button
    else {
      dom.querySelector('.audibleTile__artworkLink').click()
      poll(() => document.querySelector('.soundTitle__playButton .playButton'), 10, 5000)
        .then(realPlayButton => {
          realPlayButton.click()
        })
    }
  })
  // Pause this playlist when the track changes to something not in this playlist
  const playControlsContext = document.querySelector('.playControls__soundBadge')
  if (playControlsContext) {
    const linkObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.classList && node.classList.contains('playbackSoundBadge__titleContextContainer')
            && !getPlayingFromSet(playlistData.title, playlistData.user.username)) {
            togglePlayStyles('pause')
          }
        })
      })
    })
    linkObserver.observe(playControlsContext, {
      childList: true,
      subtree: true
    })
  }
  return dom
}

// Show collaborative playlists
function showCollaborativePlaylists () {
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
}
const showCollaborativePlaylistsIfLocation = () => {
  if (getLocationHref().match(playlistRegex)) {
    showCollaborativePlaylists()
  }
}
onUrlChange(showCollaborativePlaylistsIfLocation)
showCollaborativePlaylistsIfLocation()

// Update the 'Filter' input and filter dropdown styles
function updateInputs () {
  const sectionPromise = poll(() => document.querySelector('.collectionSection__filters'))
  sectionPromise.then(section => {
    section.style.width = '30%'
    section.querySelector('.sc-button-dropdown').style.width = '123.3px'
    const filterInput = section.querySelector('input.textfield__input')
    filterInput.addEventListener('input', () => {
      // TODO: filter
    })
  })
}
const updateInputsIfLocation = () => {
  if (getLocationHref().match(playlistRegex)) {
    updateInputs()
  }
}
onUrlChange(updateInputsIfLocation)
updateInputsIfLocation()

const playlistsObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Dropdown menu added to DOM
      if (node.classList.contains('dropdownMenu') && node.querySelector('.linkMenu') && node.innerHTML.includes('Liked')) {
        const collaborativeItem = stringToDom(`
          <li class="linkMenu__item sc-type-small">
            <a class="sc-link-dark sc-truncate g-block" href="" data-link-id="collaborative">Collaborative</a>
          </li>
        `)
        const list = node.querySelector('ul')
        list.appendChild(collaborativeItem)
      }
    })
  })
})
playlistsObserver.observe(document.body, {
  childList: true
})
