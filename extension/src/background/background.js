'use strict'

// Initialize Firebase
const config = {
  apiKey: 'AIzaSyBBgIlKYOKr0Jm4-57PCkUfUeiPSjjKrt0',
  authDomain: 'collaborative-playlists.firebaseapp.com',
  databaseURL: 'https://collaborative-playlists.firebaseio.com',
  storageBucket: 'collaborative-playlists.appspot.com',
  messagingSenderId: '1021011259445'
}
firebase.initializeApp(config)

chrome.extension.onConnect.addListener(port => {
  function errorHandler (err) {
    console.error(err)
    port.postMessage({ type: 'error', error: err })
  }

  let disconnected = false
  port.onDisconnect.addListener(() => {
    disconnected = true
  })

  if (port.name === 'fb_msgs') {
    port.onMessage.addListener(msg => {
      if (disconnected) {
        return
      }

      if (msg.type === 'addTrackToPlaylist') {
        firebase.database().ref(`tracks/${msg.playlistId}/${msg.trackId}`).set(true, (err) => {
          const response = {
            messageId: msg.messageId,
            type: 'addTrackToPlaylistResponse'
          }
          if (err) {
            response.error = err.message
          }
          port.postMessage(response)
        })
        return
      }

      if (msg.type === 'removeTrackFromPlaylist') {
        firebase.database().ref(`tracks/${msg.playlistId}/${msg.trackId}`).set(false, (err) => {
          const response = {
            messageId: msg.messageId,
            type: 'removeTrackFromPlaylistResponse'
          }
          if (err) {
            response.error = err.message
          }
          port.postMessage(response)
        })
        return
      }

    })
  }
})