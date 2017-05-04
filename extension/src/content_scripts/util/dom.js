import { MutationObserver } from './window'

export function doNothing (e) {
  e.preventDefault()
  e.stopPropagation()
}

// https://davidwalsh.name/javascript-polling
export function poll (fn, interval = 100, timeout = 2000) {
  const endTime = Date.now() + timeout
  return new Promise(function checkCondition (resolve, reject) {
    const result = fn()
    if (result) {
      return resolve(result)
    }
    if (Date.now() < endTime) {
      return setTimeout(checkCondition, interval, resolve, reject)
    }
    return reject(new Error(`Timed out: ${fn.name || '(anonymous function)'}`))
  })
}

export function createGritter (options) {
  if (options.class_name) {
    options.class_name += ' no-title'
  } else {
    options.class_name = 'no-title'
  }
  const id = window.$.gritter.add(options)
  const gritter = document.getElementById(`gritter-item-${id}`)
  gritter.querySelector('.gritter-close').textContent = ''
  gritter.querySelector('.gritter-image').style.boxShadow = 'none'
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

// https://gomakethings.com/climbing-up-and-down-the-dom-tree-with-vanilla-javascript/
export const getClosest = function (selector, elem) {
  // Get closest match
  for (; elem && elem !== document; elem = elem.parentNode) {
    if (elem.matches(selector)) return elem
  }
  return null
}

// http://krasimirtsonev.com/blog/article/Revealing-the-magic-how-to-properly-convert-HTML-string-to-a-DOM-element
export function stringToDom (html) {
  var wrapMap = {
    option: [ 1, "<select multiple='multiple'>", '</select>' ],
    legend: [ 1, '<fieldset>', '</fieldset>' ],
    area: [ 1, '<map>', '</map>' ],
    param: [ 1, '<object>', '</object>' ],
    thead: [ 1, '<table>', '</table>' ],
    tr: [ 2, '<table><tbody>', '</tbody></table>' ],
    col: [ 2, '<table><tbody></tbody><colgroup>', '</colgroup></table>' ],
    td: [ 3, '<table><tbody><tr>', '</tr></tbody></table>' ],
    body: [0, '', ''],
    _default: [ 1, '<div>', '</div>' ]
  }
  wrapMap.optgroup = wrapMap.option
  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead
  wrapMap.th = wrapMap.td
  html = html.trim()
  var match = /<\s*\w.*?>/g.exec(html)
  var element = document.createElement('div')
  if (match != null) {
    var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0]
    if (tag.toLowerCase() === 'body') {
      var body = document.createElement('body')
      // keeping the attributes
      element.innerHTML = html.replace(/<body/g, '<div').replace(/<\/body>/g, '</div>')
      var attrs = element.firstChild.attributes
      body.innerHTML = html
      for (var i = 0; i < attrs.length; i++) {
        body.setAttribute(attrs[i].name, attrs[i].value)
      }
      return body
    } else {
      var map = wrapMap[tag] || wrapMap._default
      html = map[1] + html + map[2]
      element.innerHTML = html
      // Descend through wrappers to the right content
      var j = map[0] + 1
      while (j--) {
        element = element.lastChild
      }
    }
  } else {
    element.innerHTML = html
    element = element.lastChild
  }
  return element
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
