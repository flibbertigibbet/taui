// @flow
import {MapLayer} from 'react-leaflet'
import Transitive from 'transitive-js'
import LeafletTransitiveLayer from 'leaflet-transitivelayer'

import styles from './style'

type Props = {
  data: any
}

const TRANSITIVE_SETTINGS = {
  gridCellSize: 200,
  useDynamicRendering: true,
  styles,
  // see https://github.com/conveyal/transitive.js/wiki/Zoom-Factors
  zoomFactors: [
    {
      minScale: 0,
      gridCellSize: 25,
      internalVertexFactor: 1000000,
      angleConstraint: 45,
      mergeVertexThreshold: 200
    },
    {
      minScale: 0.5,
      gridCellSize: 0,
      internalVertexFactor: 0,
      angleConstraint: 5,
      mergeVertexThreshold: 0
    }
  ]
}

export default class TransitiveMapLayer extends MapLayer {
  props: Props

  shouldComponentUpdate (newProps: Props) {
    return this.props.data !== newProps.data
  }

  componentWillMount () {
    super.componentWillMount()
    this.transitive = new Transitive({
      ...TRANSITIVE_SETTINGS,
      data: this.props.data
    })
    this.leafletElement = new LeafletTransitiveLayer(this.transitive)
  }

  componentDidMount () {
    super.componentDidMount()
    this.leafletElement._refresh()
  }

  componentDidUpdate () {
    this.transitive.updateData(this.props.data)
    this.leafletElement._refresh()
  }

  render () {
    return null
  }
}
