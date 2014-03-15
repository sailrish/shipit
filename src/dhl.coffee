{Builder, Parser} = require 'xml2js'
moment = require 'moment'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class DhlClient extends ShipperClient

  constructor: ({@userId, @password}) ->
    super
    @parser = new Parser()
    @builder = new Builder(renderOpts: pretty: false)

  generateRequest: (trk) ->
    @builder.buildObject
      'ECommerce':
        '$': action: 'Request', version: '1.1'
        'Requestor':
          'ID': @userId
          'Password': @password
        'Track':
          '$': action: 'Get', version: '1.0'
          'Shipment': 'TrackingNbr': trk

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr? or !trackResult?
      shipment = trackResult['ECommerce']?['Track']?[0]?['Shipment']?[0]
      return cb(error: 'could not find shipment') unless shipment?
      trackStatus = shipment['Result']?[0]?['Code']?[0]
      return cb(error: "unexpected track status #{trackStatus}") unless trackStatus is "0"
      cb null, shipment
    try
      @parser.parseString response, handleResponse
    catch error
      cb error

  getEta: (shipment) ->

  getService: (shipment) ->

  getWeight: (shipment) ->

  presentTimestamp: (dateString, timeString) ->

  presentAddress: (rawAddress) ->

  STATUS_MAP =
    'D': ShipperClient.STATUS_TYPES.DELIVERED
    'P': ShipperClient.STATUS_TYPES.EN_ROUTE
    'M': ShipperClient.STATUS_TYPES.SHIPPING

  presentStatus: (status) ->

  getDestination: (shipment) ->

  getActivitiesAndStatus: (shipment) ->
    {}

  requestOptions: ({trackingNumber}) ->
    method: 'POST'
    uri: 'https://eCommerce.Airborne.com/APILanding.asp'
    body: @generateRequest trackingNumber

module.exports = {DhlClient}

