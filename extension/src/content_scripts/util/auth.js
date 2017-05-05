/* global chrome */
import { createGritter } from './dom'

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
        chrome.runtime.sendMessage({ type: 'auth', loggedIn: true })
        resolve(e.data)
      },
      fail () {
        chrome.runtime.sendMessage({ type: 'auth', loggedIn: false })
        createGritter({
          image: chrome.runtime.getURL('icons/icon48-gray.png'),
          text: 'Click the extension icon to log in to Collaborative Playlists.'
        })
        reject(new Error('Unauthorized'))
      }
    })
  })
  // Subsequent token Promises are basically synchronous. They update tokenPromise to the latest value
  function addUpdater () {
    addEventListener({
      success (e) {
        chrome.runtime.sendMessage({ type: 'auth', loggedIn: true })
        createGritter({
          image: chrome.runtime.getURL('icons/icon48.png'),
          text: 'You\'re logged in! <a onclick="location.reload()">Refresh</a> to enable collaborative content.'
        })
        tokenPromise = Promise.resolve(e.data)
      },
      fail () {
        chrome.runtime.sendMessage({ type: 'auth', loggedIn: false })
        createGritter({
          image: chrome.runtime.getURL('icons/icon48-gray.png'),
          text: 'You signed out. Collaborative content will not display.'
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
          image: chrome.runtime.getURL('icons/icon48.png'),
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
