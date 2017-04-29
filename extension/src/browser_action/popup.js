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

const loading = document.getElementById('loading')

firebase.auth().onAuthStateChanged(user => {
  loading.style.display = 'none'

  const signedIn = document.getElementById('signed-in')
  const signedOut = document.getElementById('signed-out')
  if (user) {
    const displayNameEl = signedIn.querySelector('#displayName')
    displayNameEl.href = `https://soundcloud.com/${user.displayName}`
    displayNameEl.textContent = user.displayName
    signedIn.style.display = 'block'
    signedOut.style.display = 'none'
  } else {
    signedIn.style.display = 'none'
    signedOut.style.display = 'block'
  }
})

document.getElementById('signIn').addEventListener('click', (e) => {
  e.preventDefault()
  window.open('https://collaborative-playlists.firebaseapp.com/popup.html', 'name', 'height=585,width=400')
})

document.getElementById('signOut').addEventListener('click', (e) => {
  e.preventDefault()
  loading.style.display = 'block'
  setTimeout(() => {
    firebase.auth().signOut()
  }, 200)
})
