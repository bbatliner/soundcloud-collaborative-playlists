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

  if (port.name === 'fb_msgs') {
    // Listen for url changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (!tab.url) {
        return
      }
      if (tab.url.match(/https:\/\/soundcloud\.com\/.+\/sets\/.+/) && (changeInfo.status === 'completed' || changeInfo.status === 'complete')) {
        port.postMessage({ type: 'refresh', name: 'playlist' })
      }
    })
  }

  if (port.name === 'fb_msgs') {

    port.onMessage.addListener(msg => {

      if (msg.type === 'customToken') {
        firebase.auth().signInWithCustomToken(msg.token).catch(errorHandler)
        return
      }

      if (msg.type === 'profile') {
        firebase.auth().currentUser.updateProfile(msg.profile).catch(errorHandler)
        return
      }

      if (msg.type === 'markCollaborative') {
        firebase.database().ref(`collaborativePlaylists/${msg.playlistId}`).set(true)
        return
      }

      if (msg.type === 'unmarkCollaborative') {
        firebase.database().ref(`collaborativePlaylists/${msg.playlistId}`).once('value', (snapshot) => {
          if (snapshot.exists()) {
            snapshot.ref.set(false)
          }
        })
        return
      }

      if (msg.type === 'isCollaborativeRequest') {
        firebase.database().ref(`collaborativePlaylists/${msg.playlistId}`).once('value', (snapshot) => {
          port.postMessage({
            type: 'isCollaborativeResponse',
            isCollaborative: snapshot.val()
          })
        })
        return
      }

      if (msg.type === 'grantEditPermissions') {
        firebase.database().ref(`editPermissions/${msg.playlistId}/${msg.userId}`).once('value', (snapshot) => {
          const response = {
            type: 'grantEditPermissionsResponse'
          }
          if (snapshot.exists() && snapshot.val()) {
            response.error = 'Collaborator already added!'
            return port.postMessage(response)
          }

          return snapshot.ref.set(true, (err) => {
            if (err) {
              response.error = err.message
            }
            port.postMessage(response)
          })
        })
        return
      }

    })

    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        console.log('Logged in:', user)
        port.postMessage({ type: 'login', user })
      } else {
        console.log('No user is signed in.')
      }
    })
  }
})