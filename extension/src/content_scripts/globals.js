'use strict'

const CLIENT_ID = 'QRU7nXBB8VqgGUz3eMl8Jjrr7CgFAE9J'
const setRegex = /^https:\/\/soundcloud\.com\/[^\/]+\/sets\/[^\/]+$/
const trackRegex = /^https:\/\/soundcloud\.com\/(?!you|stream|search)[^\/]+\/[^\/]+(\?in=.*)?$/
const playlistRegex = /^https:\/\/soundcloud\.com\/you\/sets$/
const collectionRegex = /^https:\/\/soundcloud\.com\/you\/collection$/
const profileRegex = /^https:\/\/soundcloud\.com\/(?!you)[^\/]+\/sets$/

const fetchAuthenticated = (function () {
  // Bootstrap the iframe that will communicate Firebase authentication state to the extension
  const tokenIframe = document.createElement('iframe')
  tokenIframe.src = `https://collaborative-playlists.firebaseapp.com/getToken.html`
  tokenIframe.height = 0
  tokenIframe.width = 0
  tokenIframe.style.display = 'none'

  // A helper function to add a message listener from the iframe, and run appropriate callbacks.
  function addEventListener ({ success, fail, runOnce }) {
    window.addEventListener('message', function handler (e) {
      if (e.origin === 'https://collaborative-playlists.firebaseapp.com') {
        if (runOnce === true) {
          window.removeEventListener('message', handler)
        }
        if (e.data !== 'UNAUTHORIZED') {
          success(e)
        } else {
          fail(e)
        }
      }
    })
  }

  // The first token Promise is purely asynchronous - it waits until the first message is received
  let tokenPromise = new Promise((resolve, reject) => {
    addEventListener({
      runOnce: true,
      success (e) {
        resolve(e.data)
      },
      fail () {
        createGritter({
          // TODO: Show extension icon in `image` option
          text: 'You are not logged in to Collaborative Playlists. Click the extension icon to log in.'
        })
        reject('Unauthorized')
      }
    })
  })
  // Subsequent token Promises are basically synchronous. They update tokenPromise to the latest value
  function addUpdater () {
    addEventListener({
      success (e) {
        createGritter({
          // TODO: Show extension icon in `image` option
          text: 'You\'re logged in! <a onclick="location.reload()">Refresh</a> to enable collaborative content.'
        })
        tokenPromise = Promise.resolve(e.data)
      },
      fail () {
        createGritter({
          // TODO: Show extension icon in `image` option
          text: 'You signed out of Collaborative Playlists. Collaborative content will not display.'
        })
        tokenPromise = Promise.reject('Unauthorized')
      }
    })
  }
  // Subsequent tokens are listened for after the first one is received (authorized or not)
  tokenPromise.then(addUpdater).catch(addUpdater)

  // Kick off the messaging
  document.body.appendChild(tokenIframe)

  // An authenticated fetch will wait, if necessary, for an auth token, and then fetch.
  return function fetchAuthenticated (path, options = {}) {
    return tokenPromise.then(token => {
      options.headers = Object.assign({}, options.headers, { Authorization: `Bearer ${token}` })
      return fetch(`https://us-central1-collaborative-playlists.cloudfunctions.net${path}`, options)
    }).then(response => {
      if (response.status === 401) {
        createGritter({
          // TODO: Show extension icon in `image` option
          text: 'Your data couldn\'t be fetched. Try <a onclick="location.reload()">refreshing</a> or logging in again.'
        })
      }
      if (response.status >= 400) {
        throw new Error(`${response.url} ${response.status}`)
      }
      return response
    })
  }
}())

// https://davidwalsh.name/javascript-polling
function poll (fn, interval = 100, timeout = 2000) {
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

function checkStatus (response) {
  if (response.status !== 200) {
    const error = new Error(`Not OK (${response.status})`)
    error.response = response
    throw error
  }
  return response
}

function doNothing (e) {
  e.preventDefault()
  e.stopPropagation()
}

function createGritter (options) {
  if (options.class_name) {
    options.class_name += ' no-title'
  } else {
    options.class_name = 'no-title'
  }
  const id = $.gritter.add(options)
  document.getElementById(`gritter-item-${id}`).querySelector('.gritter-close').textContent = ''
}

const postMessage = (function () {
  let n = 1
  return function postMessage (port, data, responseType, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const messageId = n++
      const rejectTimeout = setTimeout(() => { reject('Timeout') }, timeout)
      port.onMessage.addListener(msg => {
        if (msg.type === responseType && msg.messageId === messageId) {
          clearTimeout(rejectTimeout)
          if (msg.error) {
            return reject(new Error(msg.error))
          }
          return resolve(msg)
        }
      })
      data.messageId = messageId
      port.postMessage(data)
    })
  }
}())

function initializeTabSwitching (node) {
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

const onUrlChange = (function () {
  const myScript = document.createElement('script')
  myScript.innerHTML = `
    // http://felix-kling.de/blog/2011/01/06/how-to-detect-history-pushstate/
    const pushState = history.pushState;
    history.pushState = function customPushState (state) {
      if (typeof history.onpushstate === 'function') {
        history.onpushstate({ state });
      }
      window.postMessage({ type: 'pushState' }, '*')
      return pushState.apply(history, arguments);
    }

    // Also handle forward/back buttons
    window.addEventListener('popstate', () => window.postMessage({ type: 'popstate' }, '*'))
  `
  document.head.appendChild(myScript)

  const handlers = []
  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return
    }
    if (event.data.type === 'pushState' || event.data.type === 'popstate') {
      handlers.forEach(handler => handler())
    }
  })

  return function onUrlChange (fn) {
    handlers.push(fn)
  }
}())

function getLocationHref () {
  return `${location.protocol}//${location.host}${location.pathname}${location.search ? location.search : ''}`
}

function getAnyUserDataById (userId) {
  return fetch(`https://api.soundcloud.com/users/${userId}.json?client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
}

function getAnyUserData (permalink) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${permalink}&client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
}

function playlistPageToJson (html) {
  return JSON.parse(html.substring(html.indexOf('artwork_url') - 3, html.indexOf('}]}]') + 2))[0]
}

function checkPlaylistError (err, url) {
  // If the track isn't available via API, then load it via web and scrape the JSON
  if (err.response && err.response.status === 500) {
    return fetch(url).then(response => response.text()).then(playlistPageToJson)
  }
  throw err
}

function getAnyPlaylistDataById (playlistId) {
  return fetch(`https://api.soundcloud.com/playlists/${playlistId}.json?client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
}

function getAnyPlaylistData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
    .catch(err => {
      return checkPlaylistError(err, url)
    })
}

function trackPageToJson (html) {
  return JSON.parse(html.substring(html.indexOf('artwork_url') - 2, html.indexOf('}]}}}') + 5))
}

function checkTrackError ({ err, url, trackId } = {}) {
  // If the track isn't available via API, then load it via web and scrape the JSON
  if (err.response && err.response.status === 403) {
    if (url) {
      return fetch(url).then(response => response.text()).then(trackPageToJson)
    }
    if (trackId) {
      return fetchAuthenticated(`/api/getTrackDataById?trackId=${trackId}`).then(response => response.json())
    }
    throw err
  }
  throw err
}

function getAnyTrackDataById (trackId) {
  return fetch(`https://api.soundcloud.com/tracks/${trackId}.json?client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
    .catch(err => {
      return checkTrackError({ err, trackId })
    })
}

function getAnyTrackData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
    .catch(err => {
      return checkTrackError({ err, url })
    })
}

const getUserData = (function () {
  let userPromise
  return function getUserData () {
    // Lazy load user data!
    if (!userPromise) {
      userPromise = poll(() => document.querySelector('.userNav__usernameButton'))
        .then(el => {
          const href = el.href
          const permalink = href.substring(href.lastIndexOf('/') + 1)
          return getAnyUserData(permalink)
        })
    }
    return userPromise
  }
}())

const getPlaylistData = (function () {
  let playlistPromise = Promise.resolve(null)

  const update = () => {
    if (getLocationHref().match(setRegex)) {
      playlistPromise = getAnyPlaylistData(getLocationHref())
    }
  }
  onUrlChange(update)
  update()

  return function getPlaylistData () {
    return playlistPromise
  }
}())

// http://stackoverflow.com/a/3177838
function timeSince (date) {
  var seconds = Math.floor((new Date() - date) / 1000)

  var interval = Math.floor(seconds / 31536000)

  if (interval > 1) {
    return interval + ' years'
  }
  interval = Math.floor(seconds / 2592000)
  if (interval > 1) {
    return interval + ' months'
  }
  interval = Math.floor(seconds / 86400)
  if (interval > 1) {
    return interval + ' days'
  }
  interval = Math.floor(seconds / 3600)
  if (interval > 1) {
    return interval + ' hours'
  }
  interval = Math.floor(seconds / 60)
  if (interval > 1) {
    return interval + ' minutes'
  }
  return Math.floor(seconds) + ' seconds'
}

// https://gomakethings.com/climbing-up-and-down-the-dom-tree-with-vanilla-javascript/
var getClosest = function (selector, elem) {
  // Element.matches() polyfill
  if (!Element.prototype.matches) {
    Element.prototype.matches =
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function (s) {
              var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length
              while (--i >= 0 && matches.item(i) !== this) {}
              return i > -1
            }
  }

  // Get closest match
  for (; elem && elem !== document; elem = elem.parentNode) {
    if (elem.matches(selector)) return elem
  }

  return null
}

// http://krasimirtsonev.com/blog/article/Revealing-the-magic-how-to-properly-convert-HTML-string-to-a-DOM-element
function stringToDom (html) {
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
      var dom = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null)
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
      var map = wrapMap[tag] || wrapMap._default, element
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
