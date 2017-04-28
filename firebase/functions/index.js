'use strict'

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')
const FormData = require('form-data')
const cookieParser = require('cookie-parser')
const cors = require('cors')({ origin: true })
const crypto = require('crypto')

// Setup firebase-admin
const serviceAccount = require('./service-account.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
})

function getClientId () {
  return functions.config().soundcloud.client_id
}

function getClientSecret () {
  return functions.config().soundcloud.client_secret
}

function getRedirectUri () {
  return `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/popup.html`
}

function getConnectUrl (state) {
  return 'https://soundcloud.com/connect?'
    + `state=${state}`
    + `&client_id=${encodeURIComponent(getClientId())}`
    + `&redirect_uri=${encodeURIComponent(getRedirectUri())}`
    + `&display=popup`
    + `&response_type=code`
    + `&scope=non-expiring`
}

function getOauthTokenFormData (code) {
  const form = new FormData()
  form.append('client_id', getClientId())
  form.append('client_secret', getClientSecret())
  form.append('redirect_uri', getRedirectUri())
  form.append('grant_type', 'authorization_code')
  form.append('code', code)
  return form
}

exports.redirect = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, () => {
    const state = req.cookies.state || crypto.randomBytes(20).toString('hex')
    res.cookie('state', state.toString(), { maxAge: 300000, secure: true, httpOnly: true })
    res.redirect(301, getConnectUrl(state.toString()))
  })
})

exports.token = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, () => {
    if (!req.cookies.state) {
      res.send(401, 'State cookie not set or expired. Please try again.')
      return
    }
    if (req.cookies.state !== req.query.state) {
      res.send(401, 'State did not match. Please try again.')
      return
    }
    const options = {
      method: 'post',
      body: getOauthTokenFormData(req.query.code)
    }
    // POST the authorization code for an OAuth token
    fetch('https://api.soundcloud.com/oauth2/token', options).then(response => response.json())
      // Use the token to fetch the user's profile
      .then(data => {
        const accessToken = data.access_token
        const profilePromise = fetch(`https://api.soundcloud.com/me?oauth_token=${accessToken}`).then(response => response.json())
        return Promise.all([accessToken, profilePromise])
      })
      // Create a Firebase user for the user
      .then(([accessToken, profile]) => {
        return createFirebaseAccount(accessToken, profile.id, profile.username, profile.avatar_url)
      })
      // Return the Firebase token to the JSONP callback
      .then(firebaseToken => {
        res.jsonp({ token: firebaseToken })
      })
      .catch(err => {
        console.error(err)
        res.jsonp({ error: err.toString() })
      })
  })
})

function createFirebaseAccount(accessToken, soundcloudId, displayName, photoURL) {
  // The new user's Firebase profile
  const uid = soundcloudId.toString()
  const profile = {
    displayName,
    photoURL
  }

  // Save the access token
  const databasePromise = admin.database().ref(`/accessTokens/${uid}`).set(accessToken)

  // Create or update the user account
  const userCreationPromise = admin.auth().updateUser(uid, profile)
    .catch(err => {
      if (err.code === 'auth/user-not-found') {
        return admin.auth().createUser(Object.assign({}, profile, { uid }))
      }
      throw err
    })

  return Promise.all([databasePromise, userCreationPromise]).then(() => {
    return admin.auth().createCustomToken(uid)
  })
}
