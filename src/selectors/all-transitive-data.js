// @flow
import lonlat from '@conveyal/lonlat'
import get from 'lodash/get'
import memoize from 'lodash/memoize'
import {createSelector} from 'reselect'

import createTransitiveRoutes from '../utils/create-transitive-routes'

/**
 * This assumes loaded query, paths, and targets.
 */
const memoizedTransitiveRoutes = memoize(
  (n, i, s, e, z) => createTransitiveRoutes(n, s, e, z),
  (n, i, s, e, z) =>
    `${n.name}-${i}-${n.originPoint.x}-${n.originPoint.y}-${lonlat.toString(e.position)}-${z}`
)

export default createSelector(
  state => get(state, 'data.networks'),
  state => get(state, 'geocoder.start'),
  state => get(state, 'geocoder.end'),
  state => get(state, 'map.zoom'),
  (networks, start, end, zoom) =>
    networks.map((network, nIndex) => {
      const td = network.transitive
      if (
        start &&
        start.position &&
        end &&
        end.position &&
        network.paths &&
        network.targets &&
        td.patterns
      ) {
        return memoizedTransitiveRoutes(network, nIndex, start, end, zoom)
      } else {
        return td
      }
    })
)
