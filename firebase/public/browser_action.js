'use strict'

const loading = document.getElementById('loading')
const signedIn = document.getElementById('signed-in')
const signedOut = document.getElementById('signed-out')

firebase.auth().onAuthStateChanged(user => {
  loading.style.display = 'none'
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
  signedIn.style.display = 'none'
  setTimeout(() => {
    firebase.auth().signOut()
  }, 200)
})
