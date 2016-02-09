import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-select/dist/react-select.min.css'
import deepAssign from 'deep-assign'
import React from 'react'
import {render} from 'react-dom'

import {initialize as initializeBrowsochrones} from './browsochrones'
import Root from './containers/root'
import Site from './containers/indianapolis'
import configureStore from './store'

const {config} = window.taui
config.browsochrones = initializeBrowsochrones(store, config.browsochrones)
const fakeStore = configureStore()
const store = configureStore(deepAssign(fakeStore.getState(), config))

render(
  <Root store={store}><Site browsochrones={config.browsochrones} /></Root>,
  document.getElementById('root')
)

export default store
