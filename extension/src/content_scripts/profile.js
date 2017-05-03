'use strict'

// DOM Helpers
// TODO: this is hella copy pasted from playlists.js
function createSetListItem (playlistData) {
  const playControlsVisible = getPlayControlsVisible()
  const playingFromSet = getPlayingFromSet(playlistData.title, playlistData.user.username)
  const playControlsPlayButton = document.querySelector('.playControls .playControls__play')
  const isPlaying = playControlsVisible && playingFromSet && playControlsPlayButton.classList.contains('playing')
  const dom = stringToDom(`
    <li class="soundList__item">
      <div role="group" class="sound playlist streamContext" aria-label="Playlist: ${playlistData.title} by ${playlistData.user.username}">
        <div class="sound__body">
          <div class="sound__artwork">
            <a class="sound__coverArt" href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">
              <span class="coverArt__infoItem">
                <div class="playlistTrackCount">
                  <div class="genericTrackCount small m-active" title="${playlistData.track_count} ${playlistData.track_count === 1 ? 'track' : 'tracks'}" style="border: 2.5px solid #f50; padding-top: 10.5px;">
                    <div class="genericTrackCount__title sc-font-tabular">${playlistData.track_count}</div>
                    <div class="genericTrackCount__subtitle sc-font">
                      ${playlistData.track_count === 1 ? 'track' : 'tracks'}
                    </div>
                  </div>
                </div>
              </span>
              <div class="image m-playlist image__lightOutline readOnly sc-artwork sc-artwork-placeholder-5 m-loaded" style="height: 100%; width: 100%;">
                <span style="width: 100%; height: 100%; opacity: 1; background-image: url(&quot;${playlistData.artwork_url}&quot;);" class="sc-artwork sc-artwork-placeholder-5  image__full g-opacity-transition" aria-label="${playlistData.title}" aria-role="img"></span>
              </div>
            </a>
          </div>
          <div class="sound__content">
            <div class="sound__header">
              <div class="soundTitle sc-clearfix sc-hyphenate sc-type-h2 streamContext">
                <div class="soundTitle__titleContainer">
                  <div class="soundTitle__playButton  ">
                    ${isPlaying ? '<button class="sc-button-play playButton sc-button sc-button-xlarge sc-button-pause" tabindex="0" title="Pause">Pause</button>' : '<button class="sc-button-play playButton sc-button sc-button-xlarge" tabindex="0" title="Play">Play</button>'}
                  </div>
                  <div class="soundTitle__usernameTitleContainer">
                    <div class="sc-type-light soundTitle__secondary ">
                      <a href="${playlistData.user.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}" class="soundTitle__username sc-link-light">
                        <span class="soundTitle__usernameText">${playlistData.user.username}</span>
                      </a>
                    </div>
                    <a class="soundTitle__title sc-link-dark" href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">
                      <span class="">${playlistData.title}</span>
                    </a>
                    <span class="releaseDataCompact sc-type-light sc-font-light"></span>
                  </div>
                  <div class="soundTitle__additionalContainer">
                    <div class="soundTitle__uploadTime">
                      <time class="relativeTime" title="Posted on ${new Date(playlistData.created_at).toLocaleString('en-gb', { month: 'long', day: 'numeric', year: 'numeric' })}" datetime="${new Date(playlistData.created_at).toISOString()}"><span class="sc-visuallyhidden">Posted ${timeSince(new Date(playlistData.created_at))} ago</span><span aria-hidden="true">${timeSince(new Date(playlistData.created_at))}</span></time>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="sound__waveform" style="height: calc(100% - 73px);">
              <div class="waveformWrapper m-empty">
                <div class="waveformWrapper__empty sc-type-small">
                  <a href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">View this collaborative playlist</a>
                </div>
              </div>
            </div>
            <div class="sound__footer g-all-transitions-300" style="min-height: auto">
              <div class="sound__trackList">
                <div class="compactTrackList sc-border-light sc-font-body"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  `)
  const playButton = dom.querySelector('.soundTitle__playButton .playButton')
  const togglePlayStyles = (override) => {
    if (override === 'pause' || (override !== 'play' && playButton.classList.contains('sc-button-pause'))) {
      playButton.classList.remove('sc-button-pause')
      playButton.title = 'Play'
      playButton.textContent = 'Play'
    } else {
      playButton.classList.add('sc-button-pause')
      playButton.title = 'Pause'
      playButton.textContent = 'Pause'
    }
  }
  playButton.addEventListener('click', () => {
    // Toggle playing
    // Prefer the play controls, if they're on the page and for this playlist
    if (getPlayControlsVisible() && getPlayingFromSet(playlistData.title, playlistData.user.username)) {
      playControlsPlayButton.click()
    }
    // Otherwise navigate to the set page and click the play/pause button
    else {
      dom.querySelector('.soundTitle__title').click()
      poll(() => document.querySelector('.fullHero__title .soundTitle__playButton .playButton'), 10, 5000)
        .then(realPlayButton => {
          realPlayButton.click()
        })
    }
  })
  // Pause this playlist when the track changes to something not in this playlist
  const playControlsElements = document.querySelector('.playControls__elements')
  if (playControlsElements) {
    const elementsObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          const isTitle = node.classList && node.classList.contains('playbackSoundBadge__titleContextContainer')
          const isText = node.nodeType === Node.TEXT_NODE
          if (!isTitle && !isText) {
            return
          }
          const paused = node.textContent === 'Play current'
          if (paused) {
            togglePlayStyles('pause')
            return
          }
          const playingFromSet = getPlayingFromSet(playlistData.title, playlistData.user.username)
          const playing = node.textContent === 'Pause current'
          if (playing) {
            togglePlayStyles(playingFromSet ? 'play' : 'pause')
          }
        })
      })
    })
    elementsObserver.observe(playControlsElements, {
      childList: true,
      subtree: true
    })
  }
  return dom
}

// Show collaborative sets
function showCollaborativeSets () {
  getEditablePlaylists()
  .then(editablePlaylists => {
    return Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
  })
  .then(playlistDataArr => {
    const listPromise = poll(() => document.querySelector('.lazyLoadingList__list'), 10, 5000)
    const badgeItemsPromise = Promise.all(
    playlistDataArr
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(createSetListItem)
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
const showCollaborativeSetsIfLocation = () => {
  if (getLocationHref().match(profileRegex)) {
    showCollaborativeSets()
  }
}
onUrlChange(showCollaborativeSetsIfLocation)
showCollaborativeSetsIfLocation()
