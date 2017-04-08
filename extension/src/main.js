'use strict'

// Open port to background page (firebase)
const port = chrome.runtime.connect({ name: 'fb_msgs' })

// Error handler
port.onMessage.addListener(msg => {
  if (msg.type === 'error') {
    console.error(msg.error)
  }
})

SC.connect().then(() => {
  console.log('zik')
})

// TODO: other things might depend on the client to be authenticated first...
// Exchange UID for a JWT to sign-in to Firebase with
getUserData()
  .then(userData => {
    // Sign-in listener to update profile
    port.onMessage.addListener(msg => {
      if (msg.type === 'login') {
        port.postMessage({ type: 'profile', profile: {
          displayName: userData.username,
          photoURL: userData.avatar_url.replace('large.jpg', 't500x500.jpg')
        }})
      }
    })
    return userData
  })
  .then(userData => fetch(`https://us-central1-collaborative-playlists.cloudfunctions.net/exchange?uid=${userData.id}`))
  .then(checkStatus)
  .then(response => response.text())
  .then(jwt => {
    port.postMessage({ type: 'customToken', token: jwt })
  })
  .catch(err => {
    console.error(err)
  })
