#!/usr/bin/env node

const budo = require('budo')
const argv = require('minimist')(process.argv.slice(2))
const proxy = require('proxy-middleware')
const transform = require('./transform')

const middleware = []
if (argv.proxy) {
  const proxyOptions = ''
  proxyOptions.route = '/api'
  middleware.push(proxy(proxyOptions))
}

budo.cli([`${argv._[0]}:assets/index.js`], {
  browserify: {debug: true, transform},
  cors: true,
  middleware
})
