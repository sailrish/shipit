{Builder, Parser} = require 'xml2js'
request = require 'request'
moment = require 'moment'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class UspsClient extends ShipperClient

  constructor: ({@userId}, @options) ->
    super
    @parser = new Parser()
    @builder = new Builder(renderOpts: pretty: false)

  generateRequest: (trk, reference = 'n/a') ->
    @builder.buildObject
      'TrackFieldRequest':
        '$': 'USERID': @userId
        'Revision': '1'
        'ClientIp': '54.243.112.104'
        'SourceId': 'Shiprack'
        'TrackID':
          '$': 'ID': trk

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      trackInfo = trackResult?['TrackResponse']?['TrackInfo']?[0]
      return cb(xmlErr) if xmlErr? or !trackInfo?
      cb null, trackInfo
    try
      @parser.parseString response, handleResponse
    catch error
      cb error

  getEta: (shipment) ->
    rawEta = shipment['ExpectedDeliveryDate']?[0]
    moment(rawEta).toDate() if rawEta?

  getService: (shipment) ->
    service = shipment['Class']?[0]
    service.replace /\<SUP\>.*\<\/SUP\>/, '' if service?

  getWeight: (shipment) ->

  presentTimestamp: (dateString, timeString) ->

  presentStatus: (status) ->
    return ShipperClient.STATUS_TYPES.UNKNOWN

  getDestination: (shipment) ->
    city = shipment['DestinationCity']?[0]
    stateCode = shipment['DestinationState']?[0]
    postalCode = shipment['DestinationZip']?[0]
    @presentLocation {city, stateCode, postalCode}

  getActivitiesAndStatus: (shipment) ->
    {}

  requestOptions: ({trackingNumber, reference, test}) ->
    xml = @generateRequest trackingNumber, reference
    method: 'GET'
    uri: "http://production.shippingapis.com/ShippingAPITest.dll?API=TrackV2&XML=#{xml}"

module.exports = {UspsClient}

