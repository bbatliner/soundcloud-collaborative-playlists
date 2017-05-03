/* global firebase */
'use strict'

const loading = document.getElementById('loading')
const signedIn = document.getElementById('signed-in')
const signedOut = document.getElementById('signed-out')

firebase.auth().onAuthStateChanged(user => {
  function show () {
    loading.style.display = 'none'
    signedIn.style.display = 'block'
    signedOut.style.display = 'none'
  }
  if (user) {
    const displayNameEl = signedIn.querySelector('#displayName')
    displayNameEl.textContent = user.displayName
    fetch(`https://api.soundcloud.com/users/${user.uid}?client_id=QRU7nXBB8VqgGUz3eMl8Jjrr7CgFAE9J`)
      .then(response => response.json())
      .then(data => {
        displayNameEl.href = data.permalink_url
        show()
      })
      .catch(err => {
        console.error(err)
        show()
      })
  } else {
    loading.style.display = 'none'
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
