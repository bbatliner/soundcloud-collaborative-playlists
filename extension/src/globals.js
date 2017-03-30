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

function postMessage (port, data, responseType, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const rejectTimeout = setTimeout(() => { reject('Timeout') }, timeout)
    port.onMessage.addListener(msg => {
      if (msg.type === responseType) {
        clearTimeout(rejectTimeout)
        resolve(msg)
      }
    })
    port.postMessage(data)
  })
}

function getAnyUserData (userId) {
  return fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${userId}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
    .then(checkStatus)
    .then(response => response.json())
}

const { updateUserData, getUserData } = (function () {
  let user = {}
  let userIsUpdating = false
  let userPromise

  return {
    updateUserData () {
      userIsUpdating = true
      const href = document.querySelector('.userNav__usernameButton').href
      const userId = href.substring(href.lastIndexOf('/') + 1)
      userPromise = fetch(`https://api.soundcloud.com/resolve.json?url=https://soundcloud.com/${userId}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
        .then(checkStatus)
        .then(response => response.json())
        .then(userData => {
          user = userData
          userIsUpdating = false
          return userData
        })
        .catch(() => {
          userIsUpdating = false
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
      return playlistPromise = fetch(`https://api.soundcloud.com/resolve.json?url=${url}&client_id=z8LRYFPM4UK5MMLaBe9vixfph5kqNA25`)
        .then(checkStatus)
        .then(response => response.json())
        .then(playlistData => {
          playlist = playlistData
          playlistIsUpdating = false
          return playlistData
        })
        .catch(() => {
          playlistIsUpdating = false
        })
    },
    getPlaylistData () {
      if (!playlistPromise) {
        // TODO this won't work all the time lol
        updatePlaylistData(location.href)
      }
      if (playlistIsUpdating) {
        return playlistPromise
      }
      return Promise.resolve(playlist)
    }
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
