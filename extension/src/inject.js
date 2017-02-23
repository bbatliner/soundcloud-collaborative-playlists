'use strict'

function getUserData() {
  // Should be done with an OAuth sign-in but nobody got time for that.
  const html = document.body.innerHTML

  let userDataString = ''

  const startString = '"id":1317,"data":['
  let searching = true
  let stackHeight = 0
  let index = html.indexOf(startString) + startString.length
  while (searching) {
    const char = html.charAt(index++)
    userDataString += char
    if (char === '{') {
      stackHeight++
    }
    if (char === '}') {
      stackHeight--
      if (stackHeight === 0) {
        searching = false
      }
    }
  }

  return JSON.parse(userDataString)
}

// Fetch SoundCloud user data
const userData = getUserData()

// Open port to background page (firebase)
const port = chrome.runtime.connect({ name: 'fb_msgs' })

// Error handler
port.onMessage.addListener(msg => {
  if (msg.type === 'error') {
    console.error(msg.error)
  }
})

// Exchange UID for a JWT to sign-in to Firebase with
fetch(`https://localhost:3000/exchange?uid=${userData.id}`)
  .then(response => {
    if (response.status !== 200) {
      console.error('Unable to exchange uid for JWT')
      return
    }
    return response.text()
  })
  .then(jwt => {
    port.postMessage({ type: 'customToken', token: jwt })
  })
  .catch(err => {
    console.error(err)
  })

// Sign-in listener to update profile
port.onMessage.addListener(msg => {
  if (msg.type === 'login') {
    port.postMessage({ type: 'profile', profile: {
      displayName: userData.username,
      photoURL: userData.avatar_url.replace('large.jpg', 't500x500.jpg')
    }})
  }
})
