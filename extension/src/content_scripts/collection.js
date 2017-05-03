'use strict'

function updateRecentlyPlayed () {
  getEditablePlaylists()
    .then(editablePlaylists => {
      const listPromise = poll(() => document.querySelector('.lazyLoadingList__list'), 10, 5000)
      const playlistDataArrPromise = Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
      return Promise.all([listPromise, playlistDataArrPromise])
    })
    .then(([list, playlistDataArr]) => {
      const permalinks = playlistDataArr.map(playlistData => playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, ''))
      Array.from(list.children).filter(tile => {
        const heading = tile.querySelector('.audibleTile__heading')
        return heading && permalinks.includes(heading.href.replace(/http(s?):\/\/soundcloud.com/, ''))
      }).forEach(tile => {
        function styleTrackCount (trackCount) {
          trackCount.title = 'Collaborative Playlist'
          trackCount.style.border = '2.5px solid #f50'
          trackCount.style.paddingTop = '10.5px'
        }
        // Style it now
        styleTrackCount(tile.querySelector('.genericTrackCount'))
        // And later!
        const tileObserver = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (node.matches && node.matches('.genericTrackCount')) {
                styleTrackCount(node)
              }
            })
          })
        })
        tileObserver.observe(tile, {
          childList: true,
          subtree: true
        })
      })
    })
}

const updateRecentlyPlayedIfLocation = () => {
  if (getLocationHref().match(collectionRegex)) {
    setTimeout(() => updateRecentlyPlayed(), 0)
  }
}
onUrlChange(updateRecentlyPlayedIfLocation)
updateRecentlyPlayedIfLocation()
