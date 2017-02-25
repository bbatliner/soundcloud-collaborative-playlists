function checkStatus (response) {
  if (response.status !== 200) {
    const error = new Error('Not OK')
    error.response = response
    throw error
  }
  return response
}

const { updateUserData, getUserData } = (function () {
  let user = {}
  let userIsUpdating = false
  let userPromise

  return {
    updateUserData () {
      userIsUpdating = true
      const username = document.querySelector('.userNav__username').textContent
      userPromise = fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${username}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
        .then(checkStatus)
        .then(response => response.json())
        .then(userData => {
          user = userData
          userIsUpdating = false
          return userData
        })
    },
    getUserData () {
      if (!userPromise) {
        updateUserData()
      }
      if (userIsUpdating) {
        return userPromise
      }
      return Promise.resolve(user)
    }
  }
})()

const { updatePlaylistData, getPlaylistData } = (function () {
  let playlist = {}
  let playlistIsUpdating = false
  let playlistPromise

  return {
    updatePlaylistData (url) {
      playlistIsUpdating = true
      playlistPromise = fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
        .then(checkStatus)
        .then(response => response.json())
        .then(playlistData => {
          playlist = playlistData
          playlistIsUpdating = false
          return playlistData
        })
    },
    getPlaylistData () {
      if (!playlistPromise) {
        updatePlaylistData()
      }
      if (playlistIsUpdating) {
        return playlistPromise
      }
      return Promise.resolve(playlist)
    }
  }
})()
