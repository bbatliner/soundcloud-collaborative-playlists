'use strict'

/******************
 *    Firebase    *
 ******************/

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const fetch = require('node-fetch')

// Setup firebase-admin
const serviceAccount = require('./service-account.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
  databaseAuthVariableOverride: {
    uid: 'admin'
  }
})

/******************
 *     OAuth      *
 ******************/

const FormData = require('form-data')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')

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
  return 'https://soundcloud.com/connect?' +
    `state=${state}` +
    `&client_id=${encodeURIComponent(getClientId())}` +
    `&redirect_uri=${encodeURIComponent(getRedirectUri())}` +
    `&display=popup` +
    `&response_type=code` +
    `&scope=non-expiring`
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

function createFirebaseAccount (accessToken, soundcloudId, displayName, photoURL) {
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

exports.redirect = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, () => {
    const state = req.cookies.state || crypto.randomBytes(20).toString('hex')
    res.cookie('state', state.toString(), { maxAge: 300000, secure: true, httpOnly: true })
    res.redirect(getConnectUrl(state.toString()))
  })
})

exports.token = functions.https.onRequest((req, res) => {
  cookieParser()(req, res, () => {
    if (!req.cookies.state) {
      res.status(401).json({ error: 'State cookie not set or expired. Please try again.' })
      return
    }
    if (req.cookies.state !== req.query.state) {
      res.status(401).json({ error: 'State did not match. Please try again.' })
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

/******************
 *      API       *
 ******************/

const express = require('express')
const cors = require('cors')({ origin: true })
const apiRouter = new express.Router()

// Firebase authorization middleware
function validateFirebaseToken (req, res, next) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const token = req.headers.authorization.split('Bearer ')[1]
  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      req.user = decodedToken
      next()
    })
    .catch(error => {
      console.error('Error while validating Firebase token:', error)
      res.status(401).json({ error: 'Unauthorized' })
    })
}

// Soundcloud verification middleware
function ensurePlaylistOwnership (playlistId) {
  return function ensurePlaylistOwnership (req, res, next) {
    fetch(`https://api.soundcloud.com/playlists/${playlistId}?client_id=${getClientId()}`).then(response => response.json())
      .then(data => {
        if (data.user_id.toString() !== req.user.uid) {
          res.status(403).json({ error: 'Not allowed' })
          return
        }
        next()
      })
      .catch(err => {
        console.error(err)
        res.status(500).json({ error: 'Internal server error.' })
      })
  }
}

// Use CORS and Firebase authentication on every route
apiRouter.use(cors)
apiRouter.use(validateFirebaseToken)

apiRouter.get('/markCollaborative', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }

  // Users can only mark their own playlists collaborative
  ensurePlaylistOwnership(req.query.playlistId)(req, res, () => {
    admin.database().ref(`collaborativePlaylists/${req.query.playlistId}`).set(true, (err) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: 'Internal server error.' })
        return
      }
      res.send()
    })
  })
})

apiRouter.get('/unmarkCollaborative', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }

  // Users can only unmark their own playlists
  ensurePlaylistOwnership(req.query.playlistId)(req, res, () => {
    admin.database().ref(`collaborativePlaylists/${req.query.playlistId}`).once('value', (snapshot) => {
      if (!snapshot.exists()) {
        res.status(409).json({ error: 'Playlist cannot be unmarked without marking first.' })
        return
      }
      snapshot.ref.set(false)
      res.send()
    }, (err) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: 'Internal server error.' })
      }
    })
  })
})

apiRouter.get('/isCollaborative', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }
  admin.database().ref(`collaborativePlaylists/${req.query.playlistId}`).once('value', (snapshot) => {
    res.json({ isCollaborative: snapshot.val() })
  }, (err) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error.' })
  })
})

apiRouter.get('/collaborators', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }
  admin.database().ref(`editPermissions/playlists/${req.query.playlistId}`).once('value', (snapshot) => {
    res.json({ collaborators: snapshot.val() })
  }, (err) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error.' })
  })
})

apiRouter.post('/collaborators', (req, res) => {
  if (!req.body.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }
  if (req.body.collaborators == null) {
    res.status(400).json({ error: 'collaborators is required.' })
    return
  }

  // Users can only edit collaborators for their own playlists
  ensurePlaylistOwnership(req.body.playlistId)(req, res, () => {
    Promise.all([
      // Store the collaborators' permissions on the playlist
      admin.database().ref(`editPermissions/playlists/${req.body.playlistId}`).set(req.body.collaborators),
      // Store the playlist permission (true/false) on each collaborator
      ...Object.keys(req.body.collaborators).map(collaboratorId => {
        admin.database().ref(`editPermissions/users/${collaboratorId}/${req.body.playlistId}`).set(req.body.collaborators[collaboratorId])
      })
    ])
      .then(() => {
        res.send()
      })
      .catch(err => {
        console.error(err)
        res.status(500).json({ error: 'Internal server error.' })
      })
  })
})

apiRouter.get('/editablePlaylists', (req, res) => {
  admin.database().ref(`editPermissions/users/${req.user.uid}`).once('value', (snapshot) => {
    res.json({ editablePlaylists: snapshot.val() })
  }, (err) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error.' })
  })
})

function addRemoveHelper (req, res, tracksFn, collaboratorInfo) {
  // Verify the user has permission to add tracks to this playlist
  admin.database().ref(`editPermissions/playlists/${req.query.playlistId}`).once('value')
    .then(snapshot => {
      const permissions = snapshot.val()
      if (permissions[req.user.uid] !== true) {
        const error = new Error('Not allowed.')
        error.status = 403
        error.body = { error: 'Not allowed' }
        throw error
      }
      const playlistDataPromise = fetch(`https://api.soundcloud.com/playlists/${req.query.playlistId}?client_id=${getClientId()}`)
        .then(response => response.json())
      const ownerAccessTokenPromise = playlistDataPromise.then(data => {
        const ownerId = data.user_id
        return admin.database().ref(`accessTokens/${ownerId}`).once('value').then(snapshot => snapshot.val())
      })
      return Promise.all([playlistDataPromise, ownerAccessTokenPromise])
    })
    .then(([playlistData, ownerAccessToken]) => {
      if (ownerAccessToken == null) {
        const error = new Error('Conflict.')
        error.status = 409
        error.body = { error: 'The playlist owner does not have a Collaborative Playlist account.' }
        throw error
      }
      // Add/remove the track on SoundCloud
      const tracks = playlistData.tracks.map(track => ({ id: track.id }))
      const modifiedTracks = tracksFn(tracks.slice(0))
      return fetch(`https://api.soundcloud.com/playlists/${req.query.playlistId}?oauth_token=${ownerAccessToken}&client_id=${getClientId()}&client_secret=${getClientSecret()}`, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playlist: { tracks: modifiedTracks }
        })
      })
    })
    .then(() => {
      // Add/remove the collaborator info in Firebase
      return admin.database().ref(`tracks/${req.query.playlistId}/${req.query.trackId}`).set(collaboratorInfo)
    })
    .then(() => {
      res.send()
    })
    .catch(err => {
      if (err.status) {
        res.status(err.status).json(err.body)
        return
      }
      console.error(err)
      res.status(500).json({ error: 'Internal server error.' })
    })
}

apiRouter.get('/addTrackToPlaylist', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }
  if (!req.query.trackId) {
    res.status(400).json({ error: 'trackId is required.' })
    return
  }

  addRemoveHelper(req, res, (tracks) => {
    // Add the track requested
    tracks.push({ id: req.query.trackId })
    return tracks
  }, {
    timestamp: Date.now(),
    name: req.user.name,
    picture: req.user.picture
  })
})

apiRouter.get('/removeTrackFromPlaylist', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }
  if (!req.query.trackId) {
    res.status(400).json({ error: 'trackId is required.' })
    return
  }

  addRemoveHelper(req, res, (tracks) => {
    // Remove the track requested
    // TODO: allow users to delete any track from the playlist (even if they didn't add it?)
    return tracks.filter(track => track.id.toString() !== req.query.trackId)
  }, null)
})

apiRouter.get('/getTracks', (req, res) => {
  if (!req.query.playlistId) {
    res.status(400).json({ error: 'playlistId is required.' })
    return
  }
  admin.database().ref(`tracks/${req.query.playlistId}`).once('value', (snapshot) => {
    res.json({ tracks: snapshot.val() })
  }, (err) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error.' })
  })
})

apiRouter.get('/getTrackDataById', (req, res) => {
  function trackEmbedPageToJson (html) {
    return JSON.parse(html.substring(html.indexOf('artwork_url') - 2, html.indexOf('}}]}]') + 2))
  }
  if (!req.query.trackId) {
    res.status(400).json({ error: 'trackId is required.' })
    return
  }
  fetch(`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${req.query.trackId}`)
    .then(response => response.text())
    .then(trackEmbedPageToJson)
    .then(data => {
      res.json(data)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ error: 'Internal server error.' })
    })
})

// TODO: 404s for routes that don't exist?
exports.api = functions.https.onRequest((req, res) => {
  // https://github.com/firebase/firebase-functions/issues/27
  req.url = req.path ? req.url : `/${req.url}`
  return apiRouter(req, res)
})
