import React, {PropTypes} from 'react'
import {GeoJson, Map as LeafletMap, Marker, Popup, TileLayer} from 'react-leaflet'
import PureComponent from 'react-pure-render/component'

import styles from './style.css'
import TransitiveLayer from '../../components/transitive-layer'
import transitiveStyle from './transitive-style'

export default class Map extends PureComponent {
  static propTypes = {
    attribution: PropTypes.string,
    centerCoordinates: PropTypes.arrayOf(PropTypes.number),
    geojson: PropTypes.arrayOf(PropTypes.object).isRequired,
    markers: PropTypes.arrayOf(PropTypes.object).isRequired,
    transitive: PropTypes.object,
    url: PropTypes.string.isRequired,
    zoom: PropTypes.number
  };

  render () {
    const {attribution, centerCoordinates, geojson, markers, transitive, url, zoom} = this.props

    return (
      <LeafletMap
        center={centerCoordinates}
        className={styles.map}
        ref='map'
        zoom={zoom}
        onLeafletZoom={e => {
          console.log(e)
        }}
        >
        <TileLayer
          attribution={attribution}
          url={url}
        />
        {markers.map((m, index) => {
          return (
            <Marker
              draggable
              key={`marker-${index}`}
              {...m}
              >
              {m.label && <Popup><span>{m.label}</span></Popup>}
            </Marker>
          )
        })}
        {geojson.map(g => {
          return <GeoJson
            key={`${g.key}`}
            data={g}
            />
        })}
        {transitive &&
          <TransitiveLayer
            data={transitive}
            styles={transitiveStyle}
            />
        }
      </LeafletMap>
    )
  }
}
