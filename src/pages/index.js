import {connect} from 'react-redux'

import actions from '../actions'
import Application from '../components/application'
import message from '../message'
import * as select from '../selectors'
import configureTaui from '../services/config'

import '../style.css'

// Set the title
if (typeof document !== 'undefined') document.title = message('Title')

function mapStateToProps (state, ownProps) {
  return {
    ...state,
    accessibility: select.accessibility(state, ownProps),
    activeNetworkIndex: select.activeNetworkIndex(state, ownProps),
    // isochroneOutline: select.isochroneOutline(state, ownProps),
    isochrones: select.isochrones(state, ownProps),
    isLoading: select.loading(state, ownProps),
    networkRoutes: select.networkRoutes(state, ownProps),
    networkGeoJSONRoutes: select.networkGeoJSONRoutes(state, ownProps),
    pointsOfInterestOptions: select.pointsOfInterestOptions(state, ownProps),
    showComparison: select.showComparison(state, ownProps),
    travelTimes: select.travelTimes(state, ownProps)
  }
}

Application.prototype.componentDidMount = async function componentDidMount () {
  const p = this.props

  try {
    const data = await configureTaui(p.initialReduxState)

    if (data.networks) data.networks.forEach(n => p.setNetwork(n))
    if (data.grids) data.grids.forEach(g => p.setGrid(g))
    if (data.poi) p.setPointsOfInterest(data.poi)
    if (data.map) p.updateMap(data.map)
    if (data.geocoder) p.setGeocoder(data.geocoder)

    // Run update start which will download data related to a start
    if (p.start) p.updateStart(p.start)
  } catch (e) {
    console.error('Error loading initial data.')
    console.error(e)
  }
}

export default connect(mapStateToProps, actions)(Application)
