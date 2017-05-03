'use strict'

// Listens for addtoset button presses, and sets the current track URL for data fetching
document.body.addEventListener('mousedown', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('sc-button-addtoset')) {
    let target = e.target
    const dropdown = getClosest('.dropdownMenu', e.target)
    if (dropdown) {
      target = document.querySelector(`[aria-owns~="${dropdown.id}"]`)
    }
    const soundListItem = getClosest('.soundList__item', target)
    if (soundListItem) {
      window.currentTrackUrl = soundListItem.querySelector('.soundTitle__title').href
      return
    }
    const trackListItem = getClosest('.trackList__item', target)
    if (trackListItem) {
      window.currentTrackUrl = trackListItem.querySelector('.trackItem__trackTitle').href
      return
    }
    console.warn('Unable to find track URL', e.target)
  }
})
