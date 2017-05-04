import { fetchAuthenticated } from './auth'
import { poll } from './dom'
import { getLocationHref } from './window'

const CLIENT_ID = 'QRU7nXBB8VqgGUz3eMl8Jjrr7CgFAE9J'

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

export const getUserData = (function () {
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

export function getEditablePlaylists () {
  return fetchAuthenticated(`/api/editablePlaylists`)
    .then(response => response.json())
    .then(response => {
      return response.editablePlaylists || {}
    })
}

export function getPlaylistDataHere () {
  return getAnyPlaylistData(getLocationHref())
    .catch(err => {
      if (err.response && err.response.status === 404) {
        return null
      }
      throw err
    })
}

export function getTrackDataHere () {
  let trackDataPromise
  if (window.currentTrackUrl) {
    trackDataPromise = getAnyTrackData(window.currentTrackUrl)
  } else {
    trackDataPromise = getAnyTrackData(getLocationHref())
  }
  return trackDataPromise.catch(err => {
    if (err.response && err.response.status === 404) {
      return null
    }
    throw err
  })
}
