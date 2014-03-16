{Builder, Parser} = require 'xml2js'
moment = require 'moment'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class DhlClient extends ShipperClient

  constructor: ({@userId, @password}, @options) ->
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
      trackStatus = shipment['Result']?[0]
      statusCode = trackStatus?['Code']?[0]
      statusDesc = trackStatus?['Desc']?[0]
      return cb(error: "unexpected track status code=#{statusCode} desc=#{statusDesc}") unless statusCode is "0"
      cb null, shipment
    try
      @parser.parseString response, handleResponse
    catch error
      cb error

  getEta: (shipment) ->

  getService: (shipment) ->
    description = shipment['Service']?[0]?['Desc']?[0]
    if description? then titleCase description

  getWeight: (shipment) ->
    weight = shipment['Weight']?[0]
    if weight? then "#{weight} LB"

  presentTimestamp: (dateString, timeString) ->
    return unless dateString?
    formatSpec = if timeString? then 'YYYY-MM-DD HH:mm' else 'YYYY-MM-DD'
    inputString = if timeString? then "#{dateString} #{timeString}" else dateString
    moment(inputString, formatSpec).toDate()

  presentAddress: (rawAddress) ->
    return unless rawAddress?
    city = rawAddress['City']?[0]
    stateCode = rawAddress['State']?[0]
    countryCode = rawAddress['Country']?[0]
    city = city.replace(' HUB', '')
    @presentLocation {city, stateCode, countryCode}

  STATUS_MAP =
    'BA': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'BD': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'BN': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'BT': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'OD': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'ED': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'AD': ShipperClient.STATUS_TYPES.DELAYED
    'CC': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DH': ShipperClient.STATUS_TYPES.EN_ROUTE
    'GH': ShipperClient.STATUS_TYPES.EN_ROUTE
    'HA': ShipperClient.STATUS_TYPES.EN_ROUTE
    'IB': ShipperClient.STATUS_TYPES.EN_ROUTE
    'LD': ShipperClient.STATUS_TYPES.DELIVERED
    'ND': ShipperClient.STATUS_TYPES.DELAYED
    'NL': ShipperClient.STATUS_TYPES.DELAYED
    'OB': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OH': ShipperClient.STATUS_TYPES.SHIPPING
    'PA': ShipperClient.STATUS_TYPES.DELIVERED
    'PT': ShipperClient.STATUS_TYPES.EN_ROUTE
    'RF': ShipperClient.STATUS_TYPES.DELAYED
    'DF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'TB': ShipperClient.STATUS_TYPES.EN_ROUTE
    'TG': ShipperClient.STATUS_TYPES.DELAYED
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
    'PF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PL': ShipperClient.STATUS_TYPES.EN_ROUTE
    'TU': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PU': ShipperClient.STATUS_TYPES.EN_ROUTE
    'SF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'CD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DE': ShipperClient.STATUS_TYPES.DELAYED
    'CA': ShipperClient.STATUS_TYPES.DELAYED
    'CH': ShipperClient.STATUS_TYPES.DELAYED
    'DY': ShipperClient.STATUS_TYPES.DELAYED
    'SE': ShipperClient.STATUS_TYPES.DELAYED
    'AX': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PO': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DI': ShipperClient.STATUS_TYPES.EN_ROUTE

  presentStatus: (status) ->
    STATUS_MAP[status] or ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    rawActivities = shipment['TrackingHistory']?[0]?['Status']
    for rawActivity in rawActivities or []
      location = @presentAddress rawActivity['Location']?[0]
      timestamp = @presentTimestamp rawActivity['Date']?[0], rawActivity['Time']?[0]
      details = rawActivity['StatusDesc']?[0]?['_']
      if details? and location? and timestamp?
        details = if details.slice(-1) is '.' then details[..-2] else details
        details = upperCaseFirst lowerCase details
        activity = {timestamp, location, details}
        activities.push activity
      if !status
        status = @presentStatus rawActivity['Disposition']?[0]
    {activities, status}

  getDestination: (shipment) ->
    destination = shipment['DestinationDescr']?[0]?['Location']?[0]
    return unless destination?
    fields = destination.split /,/
    newFields = []
    for field in fields or []
      field = field.trim()
      newFields.push(if field.length > 2 then titleCase(field) else field)
    return newFields.join(', ') if newFields?.length

  requestOptions: ({trackingNumber}) ->
    method: 'POST'
    uri: 'https://eCommerce.Airborne.com/APILanding.asp'
    body: @generateRequest trackingNumber

module.exports = {DhlClient}

