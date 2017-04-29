'use strict'

firebase.auth().onAuthStateChanged(user => {
  if (user != null) {
    user.getToken().then(token => {
      window.parent.postMessage(token, 'https://soundcloud.com')
    })
  } else {
    window.parent.postMessage('UNAUTHORIZED', 'https://soundcloud.com')
  }
})
