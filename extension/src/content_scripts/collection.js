import { runOnPage } from './util/extension'
import { updateAudibleTiles } from './common'

const collectionRegex = /^https:\/\/soundcloud\.com\/you\/collection$/

// TODO: Recently played should also get updated

runOnPage(collectionRegex, () => {
  setTimeout(updateAudibleTiles, 0)
})
