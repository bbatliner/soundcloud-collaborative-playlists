// Singleton-ize document.createElement('audio')
const createElementOverride = document.createElement('script')
createElementOverride.innerHTML = `
  (function () {
    let audioElement
    const createElement = document.createElement
    document.createElement = function customCreateElement (name) {
      if (name === 'audio') {
        if (audioElement == null) {
          audioElement = createElement.call(document, 'audio')
        }
        return audioElement
      }
      return createElement.call(document, name)
    }
  }())
`
document.head.appendChild(createElementOverride)

// Load the SoundCloud SDK on the page
const scSdk = document.createElement('script')
scSdk.src = chrome.extension.getURL('vendor/sdk-3.1.2.js')
scSdk.onload = function () {
  this.remove()
  sdkOnload()
}
document.head.appendChild(scSdk)

function sdkOnload () {
  // Initialize the SoundCloud SDK
  const sdkSetup = document.createElement('script')
  sdkSetup.innerHTML = `
    SC.initialize({
      client_id: '${CLIENT_ID}'
    })
  `
  document.head.appendChild(sdkSetup)

  // Setup message handlers from extension
  const handlers = document.createElement('script')
  handlers.innerHTML = `
    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return
      }
      if (event.data.type === 'playTrack') {
        SC.stream(\`/tracks/\${event.data.trackId}\`).then(player => {
          player.options.protocols = ['http', 'rtmp']
          player.play()
        })
      }
    })
  `
  document.head.appendChild(handlers)
}
