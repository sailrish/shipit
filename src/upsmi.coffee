{load} = require 'cheerio'
moment = require 'moment'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class UpsMiClient extends ShipperClient

  constructor: (@options) ->
    super

  validateResponse: (response, cb) ->
    try
      data = load(response, normalizeWhitespace: true)
      cb null, data
    catch error
      cb error

  getEta: (shipment) ->

  getService: (shipment) ->

  getWeight: (shipment) ->

  presentStatus: (status) ->

  presentTimestamp: (ts) ->

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    {activities, status}

  getDestination: (shipment) ->

  requestOptions: ({trackingNumber}) ->
    method: GET
    uri: "http://www.ups-mi.net/packageID/PackageID.aspx?PID=#{trackingNumber}"

module.exports = {UpsMiClient}

