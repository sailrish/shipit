{Builder, Parser} = require 'xml2js'
{find} = require 'underscore'
moment = require 'moment-timezone'
{titleCase, upperCase} = require 'change-case'
{ShipperClient} = require './shipper'

class PurolatorClient extends ShipperClient
  DEV_URI_BASE = 'https://devwebservices.purolator.com/EWS/V1'
  URI_BASE = 'https://webservices.purolator.com/EWS/V1'

  PROVINCES = [
    'NL', 'PE', 'NS', 'NB', 'QC', 'ON',
    'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU'
  ]

  STATUS_MAP =
    'Delivery': ShipperClient.STATUS_TYPES.DELIVERED
    'Undeliverable': ShipperClient.STATUS_TYPES.DELAYED
    'OnDelivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY

  DESCRIPTION_MAP =
   'Arrived': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Departed': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Picked up': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Shipment created': ShipperClient.STATUS_TYPES.SHIPPING

  constructor: ({@key, @password}, @options) ->
    super()
    @parser = new Parser()
    @builder = new Builder(renderOpts: pretty: true)

  generateRequest: (trk) ->
    req =
      'SOAP-ENV:Envelope':
        '$':
          'xmlns:ns0': 'http://purolator.com/pws/datatypes/v1'
          'xmlns:ns1': 'http://schemas.xmlsoap.org/soap/envelope/'
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
          'xmlns:tns': 'http://purolator.com/pws/datatypes/v1'
          'xmlns:SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/'
        'SOAP-ENV:Header':
          'tns:RequestContext':
            'tns:Version': '1.2'
            'tns:Language': 'en'
            'tns:GroupID': 'xxx'
            'tns:RequestReference': 'Shiprack Package Tracker'
        'ns1:Body':
          'ns0:TrackPackagesByPinRequest':
            'ns0:PINs':
              'ns0:PIN':
                'ns0:Value': trk

    if @options?.dev
      req['SOAP-ENV:Envelope']['SOAP-ENV:Header']['tns:RequestContext']['tns:UserToken'] =
        @options.token

    @builder.buildObject req

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr?
      body = trackResult?['s:Envelope']?['s:Body']?[0]
      trackInfo = body?.TrackPackagesByPinResponse?[0]?.TrackingInformationList?[0]
      scans = trackInfo?.TrackingInformation?[0]?.Scans?[0]?.Scan
      return cb('Unrecognized response format') unless scans?.length
      cb null, scans
    @parser.reset()
    @parser.parseString response, handleResponse

  getStatus: (data) ->
    status = STATUS_MAP[data?.ScanType[0]]
    return status if status?
    for text, statusCode of DESCRIPTION_MAP
      regex = new RegExp text, 'i'
      if regex.test data?.ScanType[0]
        status = statusCode
        break
    status

  presentLocation: (depot) ->
    return null if upperCase(depot) is 'PUROLATOR'
    words = depot?.split(' ')
    lastWord = words?.pop()
    if lastWord?.length is 2 and upperCase(lastWord) in PROVINCES
      return "#{titleCase(words.join(' '))}, #{lastWord}"
    else
      return titleCase depot

  presentTimestamp: (datestr, timestr) ->
    moment("#{datestr} #{timestr} +0000", 'YYYY-MM-DD HHmmss ZZ').toDate()

  getActivitiesAndStatus: (data) ->
    activities = data?.map (scan) =>
      details: scan?.Description?[0]
      location: @presentLocation scan?.Depot?[0]?.Name?[0]
      timestamp: @presentTimestamp scan?.ScanDate?[0], scan?.ScanTime?[0]
    activities: activities, status: @getStatus data?[0]

  getEta: (data) ->

  getService: (data) ->

  getWeight: (data) ->

  getDestination: (data) ->

  requestOptions: ({trackingNumber}) ->
    method: 'POST'
    uri: "#{if @options?.dev then DEV_URI_BASE else URI_BASE}/Tracking/TrackingService.asmx"
    headers:
      'SOAPAction': '"http://purolator.com/pws/service/v1/TrackPackagesByPin"'
      'Content-Type': 'text/xml; charset=utf-8'
      'Content-type': 'text/xml; charset=utf-8'
      'Soapaction': '"http://purolator.com/pws/service/v1/TrackPackagesByPin"'
    auth:
      user: @key
      pass: @password
    body: @generateRequest trackingNumber


module.exports = {PurolatorClient}
