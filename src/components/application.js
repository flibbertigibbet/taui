// @flow
import lonlat from '@conveyal/lonlat'
import Icon from '@conveyal/woonerf/components/icon'
import message from '@conveyal/woonerf/message'
import memoize from 'lodash/memoize'
import React, {Component} from 'react'
import {GeoJSON} from 'react-leaflet'

import type {
  Coordinate,
  GeocoderStore,
  LogItems,
  LonLat,
  InputEvent,
  MapboxFeature,
  MapEvent,
  PointsOfInterest,
  UIStore
} from '../types'
import {getAsObject} from '../utils/hash'
import downloadJson from '../utils/download-json'

import Form from './form'
import Gridualizer from './gridualizer'
import Log from './log'
import Map from './map'
import RouteAccess from './route-access'
import RouteCard from './route-card'
import RouteSegments from './route-segments'
import TransitiveLayer from './transitive-map-layer'

type Network = {
  name: string,
  active: boolean
}

type MapState = {
  centerCoordinates: Coordinate,
  zoom: number
}

type Props = {
  accessibility: number[][],
  actionLog: LogItems,
  activeNetworkIndex: number,
  activeTransitive: any,
  data: {
    grids: string[],
    networks: Network[]
  },
  drawActiveOpportunityDataset: Function,
  geocoder: GeocoderStore,
  isLoading: boolean,
  isochrones: any[],
  map: MapState,
  pointsOfInterest: PointsOfInterest,
  showComparison: boolean,
  timeCutoff: any,
  travelTimes: number[],
  ui: UIStore,
  uniqueRoutes: any[],

  geocode: (string, Function) => void,
  reverseGeocode: (string, Function) => void,
  initialize: Function => void,
  setActiveNetwork: (name: string) => void,
  setEnd: any => void,
  setSelectedTimeCutoff: any => void,
  setStart: any => void,
  updateEnd: any => void,
  updateEndPosition: LonLat => void,
  updateMap: any => void,
  updateStart: any => void,
  updateStartPosition: LonLat => void
}

type State = {
  componentError: any
}

const getStyle = color => () => ({
  fillColor: color,
  fillOpacity: 0.4,
  pointerEvents: 'none',
  stroke: color,
  weight: 1
})

const BASE_ISOCHRONE_STYLE = getStyle('#4269a4')
const COMP_ISOCHRONE_STYLE = getStyle('#ff8c00')

/**
 *
 */
export default class Application extends Component<Props, State> {
  state = {
    componentError: null
  }

  /**
   * Top level component error catch
   */
  componentDidCatch (error, info) {
    this.setState({
      componentError: {
        error, info
      }
    })
  }

  /**
   * Initialize the application.
   */
  componentDidMount () {
    const qs = getAsObject()
    const startCoordinate = qs.startCoordinate
      ? lonlat.fromString(qs.startCoordinate)
      : undefined

    if (startCoordinate) {
      this.props.setStart({
        label: qs.start,
        position: startCoordinate
      })
    } else if (qs.centerCoordinates) {
      this.props.updateMap({
        centerCoordinates: lonlat.toLeaflet(qs.centerCoordinates)
      })
    }

    if (qs.endCoordinate) {
      this.props.setEnd({
        label: qs.end,
        position: lonlat.fromString(qs.endCoordinate)
      })
    }

    if (qs.zoom) {
      this.props.updateMap({zoom: parseInt(qs.zoom, 10)})
    }

    this.props.initialize(startCoordinate)
  }

  _saveRefToConfig = (ref) => {
    this._refToConfig = ref
  }

  _updateConfig = () => {
    try {
      const json = JSON.parse(this._refToConfig.value)
      this.props.loadDatasetFromJSON(json)
    } catch (e) {
      console.error(e)
      window.alert('Invalid JSON!')
    }
  }

  _clearStartAndEnd = () => {
    const {setEnd, setStart} = this.props
    setStart(null)
    setEnd(null)
  }

  _setStartWithEvent = (event: MapEvent) => {
    this.props.updateStartPosition(lonlat(event.latlng || event.target._latlng))
  }

  _setStartWithFeature = (feature?: MapboxFeature) => {
    if (!feature) {
      this._clearStartAndEnd()
    } else {
      this.props.updateStart({
        label: feature.place_name,
        position: lonlat(feature.geometry.coordinates)
      })
    }
  }

  _setEndWithEvent = (event: MapEvent) => {
    this.props.updateEndPosition(lonlat(event.latlng || event.target._latlng))
  }

  _setEndWithFeature = (feature?: MapboxFeature) => {
    if (!feature) {
      this.props.setEnd(null)
    } else {
      this.props.updateEnd({
        label: feature.place_name,
        position: lonlat(feature.geometry.coordinates)
      })
    }
  }

  _onTimeCutoffChange = (event: InputEvent) => {
    this.props.setSelectedTimeCutoff(parseInt(event.currentTarget.value, 10))
  }

  _setActiveNetwork = memoize(name => () => this.props.setActiveNetwork(name))

  _downloadIsochrone = memoize(index => () => {
    const p = this.props
    const isochrone = p.isochrones[index]
    if (isochrone) {
      const name = p.data.networks[index].name
      const ll = lonlat.toString(p.geocoder.start.position)
      downloadJson({
        data: isochrone,
        filename: `${name}-${ll}-${p.timeCutoff.selected}min-isochrone.json`
      })
    } else {
      window.alert('No isochrone has been generated for this network.')
    }
  })

  /**
   *
   */
  render () {
    const {
      accessibility,
      actionLog,
      activeNetworkIndex,
      activeTransitive,
      drawActiveOpportunityDataset,
      data,
      geocoder,
      geocode,
      isochrones,
      isLoading,
      map,
      pointsOfInterest,
      reverseGeocode,
      showComparison,
      timeCutoff,
      travelTimes,
      ui,
      uniqueRoutes,
      updateEndPosition,
      updateMap,
      updateStartPosition
    } = this.props
    const {componentError} = this.state
    const comparisonIsochrone = activeNetworkIndex > 0
      ? isochrones[activeNetworkIndex]
      : null
    return (
      <div>
        <div className='Fullscreen'>
          <Map
            {...map}
            centerCoordinates={map.centerCoordinates}
            clearStartAndEnd={this._clearStartAndEnd}
            end={geocoder.end}
            pointsOfInterest={pointsOfInterest}
            setEndPosition={updateEndPosition}
            setStartPosition={updateStartPosition}
            start={geocoder.start}
            updateMap={updateMap}
            zoom={map.zoom}
          >
            {drawActiveOpportunityDataset &&
              <Gridualizer drawTile={drawActiveOpportunityDataset} />}

            {!isLoading && isochrones[0] &&
              <GeoJSON
                data={isochrones[0]}
                key={isochrones[0].key}
                style={BASE_ISOCHRONE_STYLE}
              />}

            {!isLoading && comparisonIsochrone &&
              <GeoJSON
                data={comparisonIsochrone}
                key={comparisonIsochrone.key}
                style={COMP_ISOCHRONE_STYLE}
              />}

            {!isLoading && <TransitiveLayer data={activeTransitive} />}
          </Map>
        </div>
        <Dock showSpinner={ui.fetches > 0} componentError={componentError}>
          <Form
            boundary={geocoder.boundary}
            end={geocoder.end}
            geocode={geocode}
            onTimeCutoffChange={this._onTimeCutoffChange}
            onChangeEnd={this._setEndWithFeature}
            onChangeStart={this._setStartWithFeature}
            pointsOfInterest={pointsOfInterest}
            reverseGeocode={reverseGeocode}
            selectedTimeCutoff={timeCutoff.selected}
            start={geocoder.start}
          />
          {data.networks.map((network, index) => (
            <RouteCard
              active={network.active}
              alternate={index !== 0}
              downloadIsochrone={this._downloadIsochrone(index)}
              isLoading={isLoading}
              key={`${index}-route-card`}
              showIsochrone={this._setActiveNetwork(network.name)}
              title={network.name}
            >
              {!isLoading &&
                <RouteAccess
                  accessibility={accessibility[index]}
                  grids={data.grids}
                  hasStart={!!geocoder.start}
                  oldAccessibility={accessibility[0]}
                  showComparison={showComparison}
                />}
              {!isLoading && !!geocoder.end && !!geocoder.start &&
                <RouteSegments
                  oldTravelTime={travelTimes[0]}
                  routeSegments={uniqueRoutes[index]}
                  travelTime={travelTimes[index]}
                />}
            </RouteCard>
          ))}
          {ui.showLog &&
            <div className='Card'>
              <div className='CardTitle'>
                <span className='fa fa-terminal' /> {message('Log.Title')}
              </div>
              <Log items={actionLog} />
            </div>}
          {ui.allowChangeConfig &&
            <div className='Card'>
              <div
                className='CardTitle'
              >
                <span className='fa fa-cog' /> Configure
                <a
                  className='pull-right'
                  onClick={this._updateConfig}
                >save changes</a>
              </div>
              <div className='CardContent'>
                <br /><a href='https://github.com/conveyal/taui/blob/aa9e6285002d59b4b6ae38890229569311cc4b6d/config.json.tmp' target='_blank'>See example config</a>
              </div>
              <textarea ref={this._saveRefToConfig} defaultValue={window.localStorage.getItem('taui-config')} />
            </div>}
          {ui.showLink &&
            <div className='Attribution'>
              site made by
              {' '}
              <a href='https://www.conveyal.com' target='_blank'>
                conveyal
              </a>
            </div>}
        </Dock>
      </div>
    )
  }
}

function Dock (props) {
  return <div className='Taui-Dock'>
    <div className='Taui-Dock-content'>
      <div className='title'>
        {props.showSpinner
          ? <Icon type='spinner' className='fa-spin' />
          : <Icon type='map' />}
        {' '}
        {message('Title')}
      </div>
      {props.componentError &&
        <div>
          <h1>Error</h1>
          <p>{props.componentError.info}</p>
        </div>}
      {props.children}
    </div>
  </div>
}
