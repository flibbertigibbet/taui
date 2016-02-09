import Browsochrones from 'browsochrones'
import fetch from 'isomorphic-fetch'

export function initialize (store, config) {
  const bs = new Browsochrones()
  bs.originsUrl = config.originsUrl
  bs.grids = {}

  Promise.all([
    fetch(config.queryUrl)
      .then(res => res.json())
      .then(query => bs.setQuery(query)),
    fetch(config.stopTreesUrl)
      .then(res => res.arrayBuffer())
      .then(st => bs.setStopTrees(st)),
    fetch(`${config.gridsUrl}/Jobs_total.grid`)
      .then(res => res.arrayBuffer())
      .then(grid => { bs.grids.Jobs_total = grid }),
    fetch(`${config.gridsUrl}/Workers_total.grid`)
      .then(res => res.arrayBuffer())
      .then(grid => { bs.grids.Workers_total = grid }),
    fetch(config.transitiveNetworkUrl)
      .then(res => res.json())
      .then(tn => bs.setTransitiveNetwork(tn))
  ]).then(() => {
    console.log('bs loaded')
  }).catch(err => {
    console.error(err)
  })

  return bs
}
