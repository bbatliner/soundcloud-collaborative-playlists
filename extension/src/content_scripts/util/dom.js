export function doNothing (e) {
  e.preventDefault()
  e.stopPropagation()
}

// https://davidwalsh.name/javascript-polling
export function poll (fn, interval = 100, timeout = 2000) {
  const endTime = Date.now() + timeout
  return new Promise(function checkCondition (resolve, reject) {
    const result = fn()
    if (result) {
      return resolve(result)
    }
    if (Date.now() < endTime) {
      return setTimeout(checkCondition, interval, resolve, reject)
    }
    return reject(new Error(`Timed out: ${fn.name || '(anonymous function)'}`))
  })
}

export function createGritter (options) {
  if (options.class_name) {
    options.class_name += ' no-title'
  } else {
    options.class_name = 'no-title'
  }
  const id = window.$.gritter.add(options)
  const gritter = document.getElementById(`gritter-item-${id}`)
  gritter.querySelector('.gritter-close').textContent = ''
  gritter.querySelector('.gritter-image').style.boxShadow = 'none'
}

// https://gomakethings.com/climbing-up-and-down-the-dom-tree-with-vanilla-javascript/
export const getClosest = function (selector, elem) {
  // Get closest match
  for (; elem && elem !== document; elem = elem.parentNode) {
    if (elem.matches(selector)) return elem
  }
  return null
}

// http://krasimirtsonev.com/blog/article/Revealing-the-magic-how-to-properly-convert-HTML-string-to-a-DOM-element
export function stringToDom (html) {
  var wrapMap = {
    option: [ 1, "<select multiple='multiple'>", '</select>' ],
    legend: [ 1, '<fieldset>', '</fieldset>' ],
    area: [ 1, '<map>', '</map>' ],
    param: [ 1, '<object>', '</object>' ],
    thead: [ 1, '<table>', '</table>' ],
    tr: [ 2, '<table><tbody>', '</tbody></table>' ],
    col: [ 2, '<table><tbody></tbody><colgroup>', '</colgroup></table>' ],
    td: [ 3, '<table><tbody><tr>', '</tr></tbody></table>' ],
    body: [0, '', ''],
    _default: [ 1, '<div>', '</div>' ]
  }
  wrapMap.optgroup = wrapMap.option
  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead
  wrapMap.th = wrapMap.td
  html = html.trim()
  var match = /<\s*\w.*?>/g.exec(html)
  var element = document.createElement('div')
  if (match != null) {
    var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0]
    if (tag.toLowerCase() === 'body') {
      var body = document.createElement('body')
      // keeping the attributes
      element.innerHTML = html.replace(/<body/g, '<div').replace(/<\/body>/g, '</div>')
      var attrs = element.firstChild.attributes
      body.innerHTML = html
      for (var i = 0; i < attrs.length; i++) {
        body.setAttribute(attrs[i].name, attrs[i].value)
      }
      return body
    } else {
      var map = wrapMap[tag] || wrapMap._default
      html = map[1] + html + map[2]
      element.innerHTML = html
      // Descend through wrappers to the right content
      var j = map[0] + 1
      while (j--) {
        element = element.lastChild
      }
    }
  } else {
    element.innerHTML = html
    element = element.lastChild
  }
  return element
}
