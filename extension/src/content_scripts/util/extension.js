import { getLocationHref } from './window'

export const onUrlChange = (function () {
  const myScript = document.createElement('script')
  myScript.innerHTML = `
    // http://felix-kling.de/blog/2011/01/06/how-to-detect-history-pushstate/
    const pushState = history.pushState;
    history.pushState = function customPushState (state) {
      if (typeof history.onpushstate === 'function') {
        history.onpushstate({ state });
      }
      window.postMessage({ type: 'pushState' }, '*')
      return pushState.apply(history, arguments);
    }

    // Also handle forward/back buttons
    window.addEventListener('popstate', () => window.postMessage({ type: 'popstate' }, '*'))
  `
  document.head.appendChild(myScript)

  const handlers = []
  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return
    }
    if (event.data.type === 'pushState' || event.data.type === 'popstate') {
      handlers.forEach(handler => handler())
    }
  })

  return function onUrlChange (fn) {
    handlers.push(fn)
  }
}())

export function runOnPage (pageRegex, fn) {
  const runIfLocation = () => {
    if (getLocationHref().match(pageRegex)) {
      fn()
    }
  }
  onUrlChange(runIfLocation)
  runIfLocation()
}
