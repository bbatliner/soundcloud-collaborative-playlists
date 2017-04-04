const setRegex = /^https:\/\/soundcloud\.com\/[^\/]+\/sets\/[^\/]+$/
const trackRegex = /^https:\/\/soundcloud\.com\/(?!you)[^\/]+\/[^\/]+(\?in=.*)?$/

// https://davidwalsh.name/javascript-polling
function poll (fn, interval = 100, timeout = 2000) {
  const endTime = Date.now() + timeout
  return new Promise(function checkCondition (resolve, reject) {
    const result = fn()
    if (result) {
      return resolve(result)
    }
    if (Date.now() < endTime) {
      return setTimeout(checkCondition, interval, resolve, reject);
    }
    return reject(new Error('Timed out.'))
  })
}

function checkStatus (response) {
  if (response.status !== 200) {
    const error = new Error('Not OK')
    error.response = response
    throw error
  }
  return response
}

function doNothing (e) {
  e.preventDefault()
  e.stopPropagation()
}

function createGritter (options) {
  const id = $.gritter.add(Object.assign({}, options, {
    class_name: 'no-title'
  }))
  document.getElementById(`gritter-item-${id}`).querySelector('.gritter-close').textContent = ''
}

function postMessage (port, data, responseType, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const rejectTimeout = setTimeout(() => { reject('Timeout') }, timeout)
    port.onMessage.addListener(msg => {
      if (msg.type === responseType) {
        clearTimeout(rejectTimeout)
        if (msg.error) {
          return reject(new Error(msg.error))
        }
        return resolve(msg)
      }
    })
    port.postMessage(data)
  })
}

const onUrlChange = (function () {
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

function getAnyUserDataById (userId) {
  return fetch(`https://api.soundcloud.com/users/${userId}.json?client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

function getAnyUserData (permalink) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${permalink}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

function getAnyPlaylistDataById (playlistId) {
  return fetch(`https://api.soundcloud.com/playlists/${playlistId}.json?client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

function getAnyPlaylistData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

function getAnyTrackData (url) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

const getUserData = (function () {
  let userPromise
  return function getUserData () {
    // Lazy load user data!
    if (!userPromise) {
      userPromise = poll(() => document.querySelector('.userNav__usernameButton'))
        .then(el => {
          const href = el.href
          const permalink = href.substring(href.lastIndexOf('/') + 1)
          return getAnyUserData(permalink)
        })
    }
    return userPromise
  }
})()

const getPlaylistData = (function () {
  let playlistPromise = Promise.resolve(null)

  const update = () => {
    if (location.href.match(setRegex)) {
      playlistPromise = getAnyPlaylistData(location.href)
    }
  }
  onUrlChange(update)
  update()

  return function getPlaylistData () {
    return playlistPromise
  }
})()

// http://krasimirtsonev.com/blog/article/Revealing-the-magic-how-to-properly-convert-HTML-string-to-a-DOM-element
function stringToDom (html) {
   var wrapMap = {
        option: [ 1, "<select multiple='multiple'>", "</select>" ],
        legend: [ 1, "<fieldset>", "</fieldset>" ],
        area: [ 1, "<map>", "</map>" ],
        param: [ 1, "<object>", "</object>" ],
        thead: [ 1, "<table>", "</table>" ],
        tr: [ 2, "<table><tbody>", "</tbody></table>" ],
        col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
        td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
        body: [0, "", ""],
        _default: [ 1, "<div>", "</div>"  ]
    };
    wrapMap.optgroup = wrapMap.option;
    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;
    var match = /<\s*\w.*?>/g.exec(html);
    var element = document.createElement('div');
    if(match != null) {
        var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0];
        if(tag.toLowerCase() === 'body') {
            var dom = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
            var body = document.createElement("body");
            // keeping the attributes
            element.innerHTML = html.replace(/<body/g, '<div').replace(/<\/body>/g, '</div>');
            var attrs = element.firstChild.attributes;
            body.innerHTML = html;
            for(var i=0; i<attrs.length; i++) {
                body.setAttribute(attrs[i].name, attrs[i].value);
            }
            return body;
        } else {
            var map = wrapMap[tag] || wrapMap._default, element;
            html = map[1] + html + map[2];
            element.innerHTML = html;
            // Descend through wrappers to the right content
            var j = map[0]+1;
            while(j--) {
                element = element.lastChild;
            }
        }
    } else {
        element.innerHTML = html;
        element = element.lastChild;
    }
    return element;
}
