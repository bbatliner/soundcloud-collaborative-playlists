export const fetch = window.fetch
export const Image = window.Image
export const MutationObserver = window.MutationObserver

export function getLocationHref () {
  return `${window.location.protocol}//${window.location.host}${window.location.pathname}${window.location.search ? window.location.search : ''}`
}
