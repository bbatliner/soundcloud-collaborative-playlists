function checkStatus (response) {
  if (response.status !== 200) {
    const error = new Error('Not OK')
    error.response = response
    throw error
  }
  return response
}

function getUserData () {
  const username = document.querySelector('.userNav__username').textContent
  return fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${username}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

function getPlaylistData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}
