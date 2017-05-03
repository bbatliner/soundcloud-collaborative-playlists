/* global firebase */
'use strict'

function getURLParameter (name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(window.location.search) ||
      [null, ''])[1].replace(/\+/g, '%20')) || null
}

function getFirebaseProjectId () {
  return firebase.app().options.authDomain.split('.')[0]
}

function jsonpTokenReceived (data) {
  if (data.token) {
    firebase.auth().signInWithCustomToken(data.token).then(() => {
      window.close()
    })
  } else {
    console.error(data)
    document.body.innerText = `Error in the token Function: ${data.error}`
  }
}

const code = getURLParameter('code')
const state = getURLParameter('state')
const error = getURLParameter('error')

if (error) {
  document.body.innerText = `Error back from the SoundCloud auth page: ${error}`
} else if (!code) {
  // Start the auth flow.
  window.location.href = `https://us-central1-${getFirebaseProjectId()}.cloudfunctions.net/redirect`
} else {
  // Use JSONP to load the 'token' Firebase Function to exchange the auth code against a Firebase custom token.
  const script = document.createElement('script')
  const tokenFunctionURL = `https://us-central1-${getFirebaseProjectId()}.cloudfunctions.net/token`
  script.src = `${tokenFunctionURL}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&callback=${jsonpTokenReceived.name}`
  script.addEventListener('error', () => jsonpTokenReceived({ error: 'Internal server error.' }))
  document.head.appendChild(script)
}
