// Initialize Firebase
const config = {
  apiKey: "AIzaSyBBgIlKYOKr0Jm4-57PCkUfUeiPSjjKrt0",
  authDomain: "collaborative-playlists.firebaseapp.com",
  databaseURL: "https://collaborative-playlists.firebaseio.com",
  storageBucket: "collaborative-playlists.appspot.com",
  messagingSenderId: "1021011259445"
}
firebase.initializeApp(config)

chrome.extension.onConnect.addListener(port => {
  function errorHandler (err) {
    console.error(err)
    port.postMessage({ type: 'error', error: err })
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