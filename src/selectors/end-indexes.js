// @flow
import get from 'lodash/get'
import {createSelector} from 'reselect'

import coordinateToPoint, {
  pointToOriginIndex
} from '../utils/coordinate-to-point'

export default createSelector(
  state => get(state, 'geocoder.end.position'),
  state => get(state, 'map.zoom'),
  state => get(state, 'data.networks'),
  (position, zoom, networks) =>
    networks.map(
      n =>
        (position && n.query
          ? pointToOriginIndex(
              coordinateToPoint(position, zoom, n.query),
              n.query.width
            )
          : -1)
    )
)
