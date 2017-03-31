var functions = require('firebase-functions');
var request = require('superagent');

// // Start writing Firebase Functions
// // https://firebase.google.com/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((req, res) => {
  const userId = 'djb00ts';
  request
    .get(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${userId}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .end((err, response) => {
        if (err) {
            res.send(err);
        } else {
            res.send(response);
        }
    });
})


