{Parser} = require 'xml2js'
moment = require 'moment-timezone'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class DhlClient extends ShipperClient

  constructor: ({@userId, @password}, @options) ->
    super
    @parser = new Parser()

  generateRequest: (trk) ->
    '<req:KnownTrackingRequest xmlns:req="http://www.dhl.com">' +
      '<Request>' +
        '<ServiceHeader>' +
          '<SiteID>' + @userId + '</SiteID>' +
          '<Password>' + @password + '</Password>' +
        '</ServiceHeader>' +
      '</Request>' +
      '<LanguageCode>en</LanguageCode>' +
      '<AWBNumber>' + trk + '</AWBNumber>' +
      '<LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>' +
    '</req:KnownTrackingRequest>'

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr? or !trackResult?
      trackingResponse = trackResult['req:TrackingResponse']
      return cb(error: 'no tracking response') unless trackingResponse?
      awbInfo = trackingResponse['AWBInfo']?[0]
      return cb(error: 'no AWBInfo in response') unless awbInfo?
      shipment = awbInfo['ShipmentInfo']?[0]
      return cb(error: 'could not find shipment') unless shipment?
      trackStatus = awbInfo['Status']?[0]
      statusCode = if trackStatus == null then null else trackStatus['ActionStatus']
      return cb(error: 'unexpected track status code=' + statusCode) unless statusCode.toString() is 'success'
      cb null, shipment
    @parser.reset()
    @parser.parseString response, handleResponse

  getEta: (shipment) ->

  getService: (shipment) ->

  getWeight: (shipment) ->
    weight = shipment['Weight']?[0]
    if weight? then "#{weight} LB"

  presentTimestamp: (dateString, timeString) ->
    return unless dateString?
    timeString ?= '00:00'
    inputString = "#{dateString} #{timeString} +0000"
    moment(inputString).toDate()

  presentAddress: (rawAddress) ->
    return unless rawAddress?
    firstComma = rawAddress.indexOf(',')
    firstDash = rawAddress.indexOf('-', firstComma)
    if firstComma > -1 and firstDash > -1
      city = rawAddress.substring(0, firstComma).trim()
      stateCode = rawAddress.substring(firstComma+1, firstDash).trim()
      countryCode = rawAddress.substring(firstDash+1).trim()
    else if firstComma < 0 and firstDash > -1
      city = rawAddress.substring(0, firstDash).trim()
      stateCode = null
      countryCode = rawAddress.substring(firstDash+1).trim()
    else
      return rawAddress
    city = city.replace(' HUB', '')
    city = city.replace(' GATEWAY', '')
    @presentLocation {city, stateCode, countryCode}

  STATUS_MAP =
    'BA': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'BD': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'BN': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'BT': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'OD': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'ED': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
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
    'UD': ShipperClient.STATUS_TYPES.DELAYED
    'AX': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PO': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DI': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OK': ShipperClient.STATUS_TYPES.DELIVERED

  presentStatus: (status) ->
    STATUS_MAP[status] or ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    rawActivities = shipment['ShipmentEvent']
    rawActivities = [] unless rawActivities?
    rawActivities.reverse()
    for rawActivity in rawActivities or []
      location = @presentAddress rawActivity['ServiceArea']?[0]?['Description']?[0]
      timestamp = @presentTimestamp rawActivity['Date']?[0], rawActivity['Time']?[0]
      details = rawActivity['ServiceEvent']?[0]?['Description']?[0]
      if details? and location? and timestamp?
        details = if details.slice(-1) is '.' then details[..-2] else details
        activity = {timestamp, location, details}
        activities.push activity
      if !status
        status = @presentStatus rawActivity['ServiceEvent']?[0]?['EventCode']?[0]
    {activities, status}

  getDestination: (shipment) ->
    destination = shipment['DestinationServiceArea']?[0]?['Description']?[0]
    return unless destination?
    fields = destination.split /,-/
    newFields = []
    for field in fields or []
      field = field.trim()
      newFields.push(if field.length > 3 then titleCase(field) else field)
    return newFields.join(', ') if newFields?.length

  requestOptions: ({trackingNumber}) ->
    method: 'POST'
    uri: 'http://xmlpi-ea.dhl.com/XMLShippingServlet'
    body: @generateRequest trackingNumber

module.exports = {DhlClient}

