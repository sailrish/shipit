{find} = require 'underscore'
moment = require 'moment'
{titleCase} = require 'change-case'
{ShipperClient} = require './shipper'

class LasershipClient extends ShipperClient

  constructor: (@options) ->
    super

  validateResponse: (response, cb) ->
    cb null, response

  getStatus: (shipment) ->

  getActivitiesAndStatus: (shipment) ->
    {}

  getEta: (shipment) ->

  getService: (shipment) ->

  getWeight: (shipment) ->

  getDestination: (shipment) ->

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://www.lasership.com/track/#{trackingNumber}/json"


module.exports = {LasershipClient}
