import { poll, createGritter } from './dom'
const fetch = window.fetch

function checkStatus (response) {
  if (response.status !== 200) {
    const error = new Error(`Not OK (${response.status})`)
    error.response = response
    throw error
  }
  return response
}

function playlistPageToJson (html) {
  return JSON.parse(html.substring(html.indexOf('artwork_url') - 3, html.indexOf('}]}]') + 2))[0]
}

function trackPageToJson (html) {
  return JSON.parse(html.substring(html.indexOf('artwork_url') - 2, html.indexOf('}]}}}') + 5))
}

function checkPlaylistError (err, url) {
  // If the playlist isn't available via API, then load it via web and scrape the JSON
  if (err.response && err.response.status === 500) {
    return fetch(url).then(response => response.text()).then(playlistPageToJson)
  }
  throw err
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

export const fetchAuthenticated = (function () {
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
        reject(new Error('Unauthorized'))
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
        tokenPromise = Promise.reject(new Error('Unauthorized'))
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

export function getAnyUserDataById (userId) {
  return fetch(`https://api.soundcloud.com/users/${userId}.json?client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
}

export function getAnyUserData (permalink) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${permalink}&client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
}

export function getAnyPlaylistDataById (playlistId) {
  return fetch(`https://api.soundcloud.com/playlists/${playlistId}.json?client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
}

export function getAnyPlaylistData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
    .catch(err => {
      return checkPlaylistError(err, url)
    })
}

export function getAnyTrackDataById (trackId) {
  return fetch(`https://api.soundcloud.com/tracks/${trackId}.json?client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
    .catch(err => {
      return checkTrackError({ err, trackId })
    })
}

export function getAnyTrackData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=${CLIENT_ID}`)
    .then(checkStatus)
    .then(response => response.json())
    .catch(err => {
      return checkTrackError({ err, url })
    })
}

// TODO: this shouldn't exist
export const getPlaylistData = (function () {
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

export function getEditablePlaylists () {
  return fetchAuthenticated(`/api/editablePlaylists`)
    .then(response => response.json())
    .then(response => {
      return response.editablePlaylists || {}
    })
}
