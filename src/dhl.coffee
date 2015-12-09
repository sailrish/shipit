{Parser} = require 'xml2js'
moment = require 'moment-timezone'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class DhlClient extends ShipperClient

  constructor: ({@userId, @password}, @options) ->
    super
    @parser = new Parser()

  generateRequest: (trk) ->
    """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <req:KnownTrackingRequest xmlns:req="http://www.dhl.com">
      <Request>
        <ServiceHeader>
          <SiteID>#{@userId}</SiteID>
          <Password>#{@password}</Password>
        </ServiceHeader>
      </Request>
      <LanguageCode>en</LanguageCode>
      <AWBNumber>#{trk}</AWBNumber>
      <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>
    </req:KnownTrackingRequest>
    """

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
      statusCode = trackStatus?['ActionStatus']
      return cb(error: "unexpected track status code=#{statusCode}") unless statusCode.toString() is 'success'
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

  presentDetails: (rawAddress, rawDetails) ->
    return unless rawDetails?
    return rawDetails unless rawAddress?
    rawDetails.replace(/\s\s+/, ' ').trim().replace(new RegExp("(?: at| in)? #{rawAddress.trim()}$"), '')

  STATUS_MAP =
    'AD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'AR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'BA': ShipperClient.STATUS_TYPES.DELAYED
    'BN': ShipperClient.STATUS_TYPES.EN_ROUTE
    'BR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'CA': ShipperClient.STATUS_TYPES.DELAYED
    'CC': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'CD': ShipperClient.STATUS_TYPES.DELAYED
    'CM': ShipperClient.STATUS_TYPES.DELAYED
    'CR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'CS': ShipperClient.STATUS_TYPES.DELAYED
    'DD': ShipperClient.STATUS_TYPES.DELIVERED
    'DF': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DS': ShipperClient.STATUS_TYPES.DELAYED
    'FD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'HP': ShipperClient.STATUS_TYPES.DELAYED
    'IC': ShipperClient.STATUS_TYPES.EN_ROUTE
    'MC': ShipperClient.STATUS_TYPES.DELAYED
    'MD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'MS': ShipperClient.STATUS_TYPES.DELAYED
    'ND': ShipperClient.STATUS_TYPES.DELAYED
    'NH': ShipperClient.STATUS_TYPES.DELAYED
    'OH': ShipperClient.STATUS_TYPES.DELAYED
    'OK': ShipperClient.STATUS_TYPES.DELIVERED
    'PD': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PL': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PO': ShipperClient.STATUS_TYPES.EN_ROUTE
    'PU': ShipperClient.STATUS_TYPES.EN_ROUTE
    'RD': ShipperClient.STATUS_TYPES.DELAYED
    'RR': ShipperClient.STATUS_TYPES.DELAYED
    'RT': ShipperClient.STATUS_TYPES.DELAYED
    'SA': ShipperClient.STATUS_TYPES.SHIPPING
    'SC': ShipperClient.STATUS_TYPES.DELAYED
    'SS': ShipperClient.STATUS_TYPES.DELAYED
    'TD': ShipperClient.STATUS_TYPES.DELAYED
    'TP': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'TR': ShipperClient.STATUS_TYPES.EN_ROUTE
    'UD': ShipperClient.STATUS_TYPES.DELAYED
    'WC': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'WX': ShipperClient.STATUS_TYPES.DELAYED

  presentStatus: (status) ->
    STATUS_MAP[status] or ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    rawActivities = shipment['ShipmentEvent']
    rawActivities = [] unless rawActivities?
    rawActivities.reverse()
    for rawActivity in rawActivities or []
      rawLocation = rawActivity['ServiceArea']?[0]?['Description']?[0]
      location = @presentAddress rawLocation
      timestamp = @presentTimestamp rawActivity['Date']?[0], rawActivity['Time']?[0]
      details = @presentDetails rawLocation, rawActivity['ServiceEvent']?[0]?['Description']?[0]
      if details? and timestamp?
        details = if details.slice(-1) is '.' then details[..-2] else details
        activity = {timestamp, location, details}
        activities.push activity
      if !status
        status = @presentStatus rawActivity['ServiceEvent']?[0]?['EventCode']?[0]
    {activities, status}

  getDestination: (shipment) ->
    destination = shipment['DestinationServiceArea']?[0]?['Description']?[0]
    return unless destination?
    @presentAddress destination

  requestOptions: ({trackingNumber}) ->
    method: 'POST'
    uri: 'http://xmlpi-ea.dhl.com/XMLShippingServlet'
    body: @generateRequest trackingNumber

module.exports = {DhlClient}

