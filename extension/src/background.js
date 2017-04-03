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

      if (msg.type === 'collaboratorsRequest') {
        firebase.database().ref(`editPermissions/playlists/${msg.playlistId}`).once('value', (snapshot) => {
          port.postMessage({
            type: 'collaboratorsResponse',
            collaborators: snapshot.val()
          })
        })
        return
      }

      if (msg.type === 'saveCollaborators') {
        firebase.database().ref(`editPermissions/playlists/${msg.playlistId}`).set(msg.collaborators)
        Object.keys(msg.collaborators).forEach(collaboratorId => {
          firebase.database().ref(`editPermissions/users/${collaboratorId}/${msg.playlistId}`).set(msg.collaborators[collaboratorId])
        })
        return
      }

      if (msg.type === '') {}

      // if (msg.type === 'grantEditPermissions') {
      //   firebase.database().ref(`editPermissions/${msg.playlistId}/${msg.userId}`).once('value', (snapshot) => {
      //     const response = {
      //       type: 'grantEditPermissionsResponse'
      //     }
      //     if (snapshot.exists() && snapshot.val()) {
      //       response.error = 'Collaborator already added!'
      //       return port.postMessage(response)
      //     }

      //     return snapshot.ref.set(true, (err) => {
      //       if (err) {
      //         response.error = err.message
      //       }
      //       port.postMessage(response)
      //     })
      //   })
      //   return
      // }

      // if (msg.type === 'revokeEditPermissions') {
      //   firebase.database().ref(`editPermissions/${msg.playlistId}/${msg.userId}`).once('value', (snapshot) => {
      //     if (snapshot.exists()) {
      //       snapshot.ref.set(false)
      //     }
      //     port.postMessage({
      //       type: 'revokeEditPermissionsResponse'
      //     })
      //   })
      //   return
      // }

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