'use strict'

// DOM helpers
function createPlaylistBadgeItem (playlistData) {
  const dom = stringToDom(`
    <li class="badgeList__item">
      <div class="audibleTile" data-description="always" data-playbutton="hover" data-actions="hover">
        <div class="audibleTile__artwork">
          <a class="audibleTile__artworkLink" href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">
            <div class="audibleTile__image">
              <div class="image m-playlist image__lightOutline readOnly customImage sc-artwork sc-artwork-placeholder-1 m-loaded" style="height: 100%; width: 100%;"><span style="width: 100%; height: 100%; opacity: 1; background-image: url(&quot;${playlistData.artwork_url.replace('-large', '-t200x200')}&quot;);" class="sc-artwork sc-artwork-placeholder-1  image__full g-opacity-transition" aria-label="${playlistData.title}" aria-role="img"></span>
              </div>
            </div>
            <div class="audibleTile__trackCount">
              <div class="playlistTrackCount">
                <div class="genericTrackCount small m-active" title="${playlistData.track_count} ${playlistData.track_count === 1 ? 'track' : 'tracks'}">
                  <div class="genericTrackCount__title sc-font-tabular">${playlistData.track_count}</div>
                  <div class="genericTrackCount__subtitle sc-font">
                    Tracks
                  </div>
                </div>
              </div>
            </div>
          </a>

          <div class="audibleTile__playButton g-z-index-content">
            <button class="sc-button-play playButton sc-button m-stretch" tabindex="0" title="Play">Play</button>
          </div>
        </div>

        <div class="audibleTile__description">
          <a class="audibleTile__heading audibleTile__mainHeading audibleTile__audibleHeading sc-truncate sc-type-light sc-font-light sc-link-dark" href="${playlistData.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">
              <span class="sc-icon sc-icon-large sc-icon-like audibleTile__mainHeadingLike"></span>

            ${playlistData.title}
          </a>
          <div class="audibleTile__usernameHeadingContainer sc-type-light sc-font-light">
            <a class="audibleTile__usernameHeading sc-link-light sc-truncate" href="${playlistData.user.permalink_url.replace(/http(s?):\/\/soundcloud.com/, '')}">${playlistData.user.username}</a>
              <span class="releaseDataCompact sc-type-light sc-font-light audibleTile__releaseData"></span>
          </div>
        </div>
      </div>
    </li>
  `)
  const playButton = dom.querySelector('.audibleTile__playButton .playButton')
  playButton.addEventListener('click', () => {
    dom.querySelector('.audibleTile__artworkLink').click()
    poll(() => document.querySelector('.soundTitle__playButton .playButton'), 10, 5000)
      .then(realPlayButton => {
        realPlayButton.click()
      })
  })
  return dom
}

// Show collaborative playlists
function showCollaborativePlaylists () {
  getEditablePlaylists()
    .then(editablePlaylists => {
      return Promise.all(Object.keys(editablePlaylists).filter(key => editablePlaylists[key] === true).map(getAnyPlaylistDataById))
    })
    .then(playlistDataArr => {
      const listPromise = poll(() => document.querySelector('.lazyLoadingList__list'), 10, 5000)
      const badgeItemsPromise = Promise.all(
        playlistDataArr
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(createPlaylistBadgeItem)
      )
      return Promise.all([listPromise, badgeItemsPromise])
    })
    .then(([list, badgeItems]) => {
      badgeItems.forEach(item => {
        item.style.opacity = 0
        item.classList.add('g-opacity-transition')
        list.appendChild(item)
        setTimeout(() => { item.style.opacity = 1 }, 10)
      })
    })
}
const showCollaborativePlaylistsIfLocation = () => {
  if (getLocationHref().match(playlistRegex)) {
    showCollaborativePlaylists()
  }
}
onUrlChange(showCollaborativePlaylistsIfLocation)
showCollaborativePlaylistsIfLocation()

// Update the 'Filter' input and filter dropdown styles
function updateInputs () {
  const sectionPromise = poll(() => document.querySelector('.collectionSection__filters'))
  sectionPromise.then(section => {
    section.style.width = '30%'
    section.querySelector('.sc-button-dropdown').style.width = '123.3px'
  })
}
const updateInputsIfLocation = () => {
  if (getLocationHref().match(playlistRegex)) {
    updateInputs()
  }
}
onUrlChange(updateInputsIfLocation)
updateInputsIfLocation()

const playlistsObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      // Dropdown menu added to DOM
      if (node.classList.contains('dropdownMenu') && node.querySelector('.linkMenu') && node.innerHTML.includes('Liked')) {
        const collaborativeItem = stringToDom(`
          <li class="linkMenu__item sc-type-small">
            <a class="sc-link-dark sc-truncate g-block" href="" data-link-id="collaborative">Collaborative</a>
          </li>
        `)
        const list = node.querySelector('ul')
        list.appendChild(collaborativeItem)
      }
    })
  })
})
playlistsObserver.observe(document.body, {
  childList: true
})
