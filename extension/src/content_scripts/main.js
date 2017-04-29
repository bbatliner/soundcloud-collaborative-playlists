'use strict'

// Open port to background page (firebase)
const port = chrome.runtime.connect({ name: 'fb_msgs' })

// Error handler
port.onMessage.addListener(msg => {
  if (msg.type === 'error') {
    console.error(msg.error)
  }
})
