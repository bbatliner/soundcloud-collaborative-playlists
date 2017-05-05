import { MutationObserver } from './util/window'
import { stringToDom, poll } from './util/dom'
import { getEditablePlaylists, getAnyPlaylistDataById } from './util/data'

export function updateAudibleTiles () {
  getEditablePlaylists()
    .then(editablePlaylists => {
      const listPromise = poll(() => document.querySelector('.lazyLoadingList__list'), 10, 5000)
      const playlistDataArrPromise = Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
      return Promise.all([listPromise, playlistDataArrPromise])
    })
    .then(([list, playlistDataArr]) => {
      const permalinks = playlistDataArr.map(playlistData => playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, ''))
      Array.from(list.children).filter(tile => {
        const heading = tile.querySelector('.audibleTile__heading')
        return heading && permalinks.includes(heading.href.replace(/http(s?):\/\/soundcloud.com/, ''))
      }).forEach(tile => {
        function styleTrackCount (trackCount) {
          trackCount.title = 'Collaborative Playlist'
          trackCount.style.border = '2.5px solid #f50'
          trackCount.style.paddingTop = '10.5px'
        }
        // Style it now
        styleTrackCount(tile.querySelector('.genericTrackCount'))
        // And later!
        const tileObserver = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.matches && node.matches('.genericTrackCount')) {
                styleTrackCount(node)
              }
            })
          })
        })
        tileObserver.observe(tile, {
          childList: true,
          subtree: true
        })
      })
    })
}

export function initializeTabSwitching (node) {
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

export function createPlaylistItemCreator ({ templateFn, onPause = () => {}, onPlay = () => {}, stayOnPageOnPlay = true }) {
  function getPlayControlsVisible () {
    const playControls = document.querySelector('.playControls')
    return playControls && playControls.classList.contains('m-visible')
  }

  function getPlayingFromSet (setTitle, setOwner) {
    const playControlsLink = document.querySelector('.playbackSoundBadge__title')
    return playControlsLink && playControlsLink.href.includes(`?in=${setOwner}/sets/${setTitle}`)
  }

  return function createPlaylistItem (playlistData) {
    const playControlsVisible = getPlayControlsVisible()
    const playingFromSet = getPlayingFromSet(playlistData.title, playlistData.user.username)
    const playControlsPlayButton = document.querySelector('.playControls .playControls__play')
    const isPlaying = playControlsVisible && playingFromSet && playControlsPlayButton.classList.contains('playing')
    const dom = stringToDom(templateFn(playlistData, isPlaying))
    const playButton = dom.querySelector('.playButton')
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
      } else {
        // Otherwise navigate to the set page and click the play/pause button
        dom.querySelector('[href]').click()
        poll(() => document.querySelector('.fullHero__title .soundTitle__playButton .playButton'), 10, 5000)
          .then(realPlayButton => {
            realPlayButton.click()
            if (stayOnPageOnPlay === true) {
              window.history.back(1)
            }
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
            const isText = node.nodeType === window.Node.TEXT_NODE
            if (!isTitle && !isText) {
              return
            }
            const paused = node.textContent === 'Play current'
            if (paused) {
              onPause.call(dom)
              togglePlayStyles('pause')
              return
            }
            const playingFromSet = getPlayingFromSet(playlistData.title, playlistData.user.username)
            const playing = node.textContent === 'Pause current'
            if (playing) {
              if (playingFromSet) {
                onPlay.call(dom)
                togglePlayStyles('play')
              } else {
                onPause.call(dom)
                togglePlayStyles('pause')
              }
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
}
