import lonlat from '@conveyal/lonlat'
import Leaflet from 'leaflet'
import {createAction} from 'redux-actions'

import fetch, {
  incrementFetches as incrementWork,
  decrementFetches as decrementWork
} from '@conveyal/woonerf/fetch'

import featureToLabel from '../utils/feature-to-label'
import {setKeyTo} from '../utils/hash'
import {reverse} from '../utils/mapbox-geocoder'

const reverseGeocode = ({latlng}) => reverse(process.env.MAPBOX_ACCESS_TOKEN, latlng)

export const addActionLogItem = createAction('add action log item', (item) => {
  const payload = typeof item === 'string'
    ? { text: item }
    : item

  return {
    createdAt: new Date(),
    level: 'info',
    ...payload
  }
})

export const setDestination = createAction('set destination', (destination) => {
  setKeyTo('end', destination ? destination.label : null)
  return destination
})

export const setOrigin = createAction('set origin', (origin) => {
  setKeyTo('start', origin ? origin.label : null)
  return origin
})

export const setDestinationLabel = createAction('set destination label', (label) => {
  setKeyTo('end', label)
  return label
})

export const setOriginLabel = createAction('set origin label', (label) => {
  setKeyTo('start', label)
  return label
})

export const clearEnd = createAction('clear end', () => {
  setKeyTo('end', null)
})
export const clearStart = createAction('clear start', () => {
  setKeyTo('start', null)
})

export const setAccessibilityFor = createAction('set accessibility for')

export const setActiveBrowsochronesInstance = createAction('set active browsochrones instance')
export const setBrowsochronesInstances = createAction('set browsochrones instances')
export const setSelectedTimeCutoff = createAction('set selected time cutoff')
export const setDestinationDataFor = createAction('set destination data for')
export const showMapMarker = createAction('show map marker')
export const hideMapMarker = createAction('hide map marker')

export const clearIsochrone = createAction('clear isochrone')
export const setIsochrone = createAction('set isochrone')
export const setIsochroneFor = createAction('set isochrone for')

export const updateMap = createAction('update map')

/**
 * What happens on origin update:
 *  - Map marker should get set to the new origin immmediately (if it wasn't a drag/drop)
 *  - If there's no label, the latlng point should be reverse geocoded and saved
 *  - If Browsochones is loaded, new origin data is retreived
 *    - A new surface is generated
 *      - A new jsonline generated
 *      - Accessibility is calculated for grids
 */
export function updateOrigin ({
  browsochronesInstances,
  destinationLatlng,
  latlng, label,
  timeCutoff,
  zoom
}) {
  const actions = [
    addActionLogItem('Generating origins...'),
    clearIsochrone()
  ]

  // TODO: Remove this!
  if (label && label.toLowerCase().indexOf('airport') !== -1) {
    latlng = {
      lat: 39.7146,
      lng: -86.2983
    }
  }

  if (label) {
    actions.push(
      addActionLogItem(`Set start address to: ${label}`),
      setOrigin({label, latlng})
    )
  } else {
    actions.push(
      setOrigin({latlng}),
      addActionLogItem(`Finding start address for ${lonlat(latlng).toString()}`),
      reverseGeocode({latlng})
        .then(({features}) => {
          if (!features || features.length < 1) return
          const label = featureToLabel(features[0])
          return [
            addActionLogItem(`Set start address to: ${label}`),
            setOriginLabel(label)
          ]
        })
    )
  }

  if (!browsochronesInstances || browsochronesInstances.length === 0) return actions

  const point = Leaflet.CRS.EPSG3857.latLngToPoint(lonlat.toLeaflet(latlng), zoom)
  const originPoint = browsochronesInstances[0].pixelToOriginPoint(point, zoom)
  if (browsochronesInstances[0].pointInQueryBounds(originPoint)) {
    actions.push(browsochronesInstances.map((instance, index) => fetchBrowsochronesFor({
      browsochrones: instance,
      destinationLatlng,
      index,
      latlng,
      timeCutoff,
      zoom
    })))
  } else {
    console.log('point out of bounds') // TODO: Handle
  }

  return actions
}

function fetchBrowsochronesFor ({
  browsochrones,
  destinationLatlng,
  index,
  latlng,
  timeCutoff,
  zoom
}) {
  const point = browsochrones.pixelToOriginPoint(Leaflet.CRS.EPSG3857.latLngToPoint(lonlat.toLeaflet(latlng), zoom), zoom)
  return [
    incrementWork(), // to include the time taking to set the origin and generate the surface
    addActionLogItem(`Fetching origin data for scenario ${index}`),
    fetch({
      url: `${browsochrones.originsUrl}/${point.x | 0}/${point.y | 0}.dat`,
      next: async (error, response) => {
        if (error) {
          console.error(error)
        } else {
          await browsochrones.setOrigin(response.value, point)
          await browsochrones.generateSurface()

          return [
            decrementWork(),
            generateAccessiblityFor({browsochrones, index, latlng, timeCutoff}),
            generateIsochroneFor({browsochrones, index, latlng, timeCutoff}),
            destinationLatlng && generateDestinationDataFor({
              browsochrones,
              fromLatlng: latlng,
              toLatlng: destinationLatlng,
              zoom
            })
          ]
        }
      }
    })
  ]
}

const storedAccessibility = {}
const storedIsochrones = {}

function generateAccessiblityFor ({browsochrones, index, latlng, timeCutoff}) {
  return [
    incrementWork(),
    addActionLogItem(`Generating accessibility surface for scenario ${index}`),
    (async () => {
      const accessibility = {}
      for (const grid of browsochrones.grids) {
        const key = `${index}-${lonlat.toString(latlng)}-${timeCutoff}-${grid}`
        accessibility[grid] = storedAccessibility[key] || await browsochrones.getAccessibilityForGrid(grid, timeCutoff)
        storedAccessibility[key] = accessibility[grid]
      }
      return [
        setAccessibilityFor({accessibility, index}),
        decrementWork()
      ]
    })()
  ]
}

function generateIsochroneFor ({browsochrones, index, latlng, timeCutoff}) {
  return [
    incrementWork(),
    addActionLogItem(`Generating travel time isochrone for scenario ${index}`),
    (async () => {
      const key = `${index}-${lonlat.toString(latlng)}-${timeCutoff}`
      const isochrone = storedIsochrones[key] || await browsochrones.getIsochrone(timeCutoff)
      isochrone.key = key
      storedIsochrones[key] = isochrone

      return [
        setIsochroneFor({isochrone, index}),
        decrementWork()
      ]
    })()
  ]
}

function generateDestinationDataFor ({
  browsochrones,
  fromLatlng,
  index,
  toLatlng,
  zoom
}) {
  return [
    incrementWork(),
    addActionLogItem(`Generating transit data for scenario ${index}`),
    (async () => {
      const destinationPoint = browsochrones.pixelToOriginPoint(Leaflet.CRS.EPSG3857.latLngToPoint(lonlat.toLeaflet(toLatlng), zoom), zoom)
      const data = await browsochrones.generateDestinationData({
        from: fromLatlng || null,
        to: {
          ...toLatlng,
          ...destinationPoint
        }
      })
      data.transitive.key = `${index}-${lonlat.toString(toLatlng)}`
      return [
        setDestinationDataFor({data, index}),
        decrementWork()
      ]
    })()
  ]
}

export function updateSelectedTimeCutoff ({browsochrones, latlng, timeCutoff}) {
  const actions = [
    setSelectedTimeCutoff(timeCutoff)
  ]

  browsochrones.instances
    .filter((instance) => instance.isLoaded())
    .map((instance, index) => {
      actions.push(generateIsochroneFor({browsochrones: instance, index, latlng, timeCutoff}))
      actions.push(generateAccessiblityFor({browsochrones: instance, index, latlng, timeCutoff}))
    })

  return actions
}

/**
 * What happens on destination update:
 *  - Map marker is set to the new destination immmediately (if it wasn't a drag/drop)
 *  - If there's no label, the latlng point should be reverse geocoded and saved
 *  - If Browsochones is loaded, transitive data is generated
 *  - If Browsochones has a surface generated, travel time is calculated
 */
export function updateDestination ({
  browsochrones,
  fromLatlng,
  latlng,
  label,
  zoom
}) {
  const actions = []

  // TODO: Remove this!
  if (label && label.toLowerCase().indexOf('airport') !== -1) {
    latlng = {
      lat: 39.7146,
      lng: -86.2983
    }
  }

  if (label) {
    actions.push(setDestination({label, latlng}))
  } else {
    actions.push(
      setDestination({latlng}),
      reverseGeocode({latlng})
        .then(({features}) => setDestinationLabel(featureToLabel(features[0])))
    )
  }

  browsochrones.instances
    .filter((instance) => instance.isLoaded())
    .map((instance, index) => {
      actions.push(generateDestinationDataFor({
        browsochrones: instance,
        fromLatlng,
        index,
        toLatlng: latlng,
        zoom
      }))
    })

  return actions
}
