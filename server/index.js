const fs = require('fs')
const https = require('https')
const express = require('express')
const app = express()

const admin = require('firebase-admin')
const serviceAccount = require('./collaborative-playlists-key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://collaborative-playlists.firebaseio.com'
})

// TODO: Should be a callback from Soundcloud OAuth, not an exposed route.
app.get('/exchange', (req, res) => {
  const uid = req.query.uid
  console.log('Got uid', uid)
  admin.auth().createCustomToken(uid)
    .then(customToken => {
      res.send(customToken)
    })
    .catch(err => {
      console.error('Error creating custom token:', err)
      res.status(500).end()
    })
})

const httpsServer = https.createServer({
  key: fs.readFileSync('sslcert/key.pem', 'utf8'),
  cert: fs.readFileSync('sslcert/cert.pem')
}, app)

httpsServer.listen(3000, () => {
  console.log('Listening on port 3000')
})
