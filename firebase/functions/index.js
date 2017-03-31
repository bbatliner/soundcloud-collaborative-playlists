'use strict'

// Imports
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })

// Setup firebase-admin
const serviceAccount = require('./service-account.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
})

// TODO: Should be a callback from Soundcloud OAuth, not an exposed route.
exports.exchange = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
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
})

// Doesn't work because external network request on free plan...
// const request = require('superagent');
// exports.helloWorld = functions.https.onRequest((req, res) => {
//   const userId = 'djb00ts';
//   request
//     .get(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${userId}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
//     .end((err, response) => {
//         if (err) {
//             res.send(err);
//         } else {
//             res.send(response);
//         }
//     });
// })


