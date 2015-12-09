{Builder, Parser} = require 'xml2js'
{find} = require 'underscore'
moment = require 'moment-timezone'
{titleCase} = require 'change-case'
{ShipperClient} = require './shipper'

class FedexClient extends ShipperClient

  constructor: ({@key, @password, @account, @meter}, @options) ->
    super
    @parser = new Parser()
    @builder = new Builder(renderOpts: pretty: false)

  generateRequest: (trk, reference = 'n/a') ->
    @builder.buildObject
      'ns:TrackRequest':
        '$':
          'xmlns:ns': 'http://fedex.com/ws/track/v5'
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
          'xsi:schemaLocation': 'http://fedex.com/ws/track/v4 TrackService_v4.xsd'
        'ns:WebAuthenticationDetail':
          'ns:UserCredential':
            'ns:Key': @key
            'ns:Password': @password
        'ns:ClientDetail':
          'ns:AccountNumber': @account
          'ns:MeterNumber': @meter
        'ns:TransactionDetail':
          'ns:CustomerTransactionId': reference
        'ns:Version':
          'ns:ServiceId': 'trck'
          'ns:Major': 5
          'ns:Intermediate': 0
          'ns:Minor': 0
        'ns:PackageIdentifier':
          'ns:Value': trk
          'ns:Type': 'TRACKING_NUMBER_OR_DOORTAG'
        'ns:IncludeDetailedScans': true

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr? or !trackResult?
      notifications = trackResult['TrackReply']?['Notifications']
      success = find notifications, (notice) -> notice?['Code']?[0] is '0'
      return cb(notifications or 'invalid reply') unless success
      cb null, trackResult['TrackReply']?['TrackDetails']?[0]
    @parser.reset()
    @parser.parseString response, handleResponse

  presentAddress: (address) ->
    return unless address?
    city = address['City']?[0]
    city = city.replace('FEDEX SMARTPOST ', '') if city?
    stateCode = address['StateOrProvinceCode']?[0]
    countryCode = address['CountryCode']?[0]
    postalCode = address['PostalCode']?[0]
    @presentLocation {city, stateCode, countryCode, postalCode}

  STATUS_MAP =
    'AA': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AP': ShipperClient.STATUS_TYPES.SHIPPING
    'EO': ShipperClient.STATUS_TYPES.EN_ROUTE
    'EP': ShipperClient.STATUS_TYPES.SHIPPING
    'FD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'HL': ShipperClient.STATUS_TYPES.DELIVERED
    'IT': ShipperClient.STATUS_TYPES.EN_ROUTE
    'LO': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OC': ShipperClient.STATUS_TYPES.SHIPPING
    'DL': ShipperClient.STATUS_TYPES.DELIVERED
    'DP': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DS': ShipperClient.STATUS_TYPES.EN_ROUTE
    'ED': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'OD': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'PF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PL': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PU': ShipperClient.STATUS_TYPES.EN_ROUTE
    'SF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'CD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'CC': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DE': ShipperClient.STATUS_TYPES.DELAYED
    'CA': ShipperClient.STATUS_TYPES.DELAYED
    'CH': ShipperClient.STATUS_TYPES.DELAYED
    'DY': ShipperClient.STATUS_TYPES.DELAYED
    'SE': ShipperClient.STATUS_TYPES.DELAYED
    'AX': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'RR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OX': ShipperClient.STATUS_TYPES.EN_ROUTE
    'CP': ShipperClient.STATUS_TYPES.EN_ROUTE

  getStatus: (shipment) ->
    statusCode = shipment?['StatusCode']?[0]
    return unless statusCode?
    if STATUS_MAP[statusCode]? then STATUS_MAP[statusCode] else ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    for rawActivity in shipment['Events'] or []
      location = @presentAddress rawActivity['Address']?[0]
      timestamp = moment("#{rawActivity['Timestamp'][0][..18]}Z")
        .toDate() if rawActivity['Timestamp']?[0]?
      details = rawActivity['EventDescription']?[0]
      if details? and timestamp?
        activity = {timestamp, location, details}
        activities.push activity
    activities: activities, status: @getStatus shipment

  getEta: (shipment) ->
    ts = shipment?['EstimatedDeliveryTimestamp']?[0]
    return unless ts?
    moment("#{ts[..18]}Z").toDate()

  getService: (shipment) ->
    shipment?['ServiceInfo']?[0]

  getWeight: (shipment) ->
    weightData = shipment?['PackageWeight']?[0]
    return unless weightData?
    units = weightData['Units']?[0]
    value = weightData['Value']?[0]
    if units? and value? then "#{value} #{units}"

  getDestination: (shipment) ->
    @presentAddress shipment['DestinationAddress']?[0]

  requestOptions: ({trackingNumber, reference}) ->
    method: 'POST'
    uri: 'https://ws.fedex.com/xml'
    body: @generateRequest trackingNumber, reference


module.exports = {FedexClient}
