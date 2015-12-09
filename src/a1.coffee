{Parser} = require 'xml2js'
moment = require 'moment-timezone'
{titleCase} = require 'change-case'
{ShipperClient} = require './shipper'

class A1Client extends ShipperClient

  constructor: (@options) ->
    super
    @parser = new Parser()

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr? or !trackResult?
      trackingInfo = trackResult['AmazonTrackingResponse']?['PackageTrackingInfo']?[0]
      unless trackingInfo?['TrackingNumber']?
        errorInfo = trackResult['AmazonTrackingResponse']?['TrackingErrorInfo']?[0]
        error = errorInfo?['TrackingErrorDetail']?[0]?['ErrorDetailCodeDesc']?[0]
        return cb error if error?
        cb 'unknown error'
      cb null, trackingInfo
    @parser.reset()
    @parser.parseString response, handleResponse

  presentAddress: (address) ->
    return unless address?
    city = address['City']?[0]
    stateCode = address['StateProvince']?[0]
    countryCode = address['CountryCode']?[0]
    postalCode = address['PostalCode']?[0]
    @presentLocation {city, stateCode, countryCode, postalCode}

  STATUS_MAP =
    101: ShipperClient.STATUS_TYPES.EN_ROUTE
    102: ShipperClient.STATUS_TYPES.EN_ROUTE
    302: ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    304: ShipperClient.STATUS_TYPES.DELAYED
    301: ShipperClient.STATUS_TYPES.DELIVERED

  getStatus: (shipment) ->
    lastActivity = shipment['TrackingEventHistory']?[0]?['TrackingEventDetail']?[0]
    statusCode = lastActivity?['EventCode']?[0]
    return unless statusCode?
    code = parseInt(statusCode.match(/EVENT_(.*)$/)?[1])
    return if isNaN code
    if STATUS_MAP[code]?
      return STATUS_MAP[code]
    else
      if code < 300
        ShipperClient.STATUS_TYPES.EN_ROUTE
      else
        ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    for rawActivity in shipment['TrackingEventHistory']?[0]?['TrackingEventDetail'] or []
      location = @presentAddress rawActivity?['EventLocation']?[0]
      timestamp = moment("#{rawActivity?['EventDateTime'][0][..18]}Z")
        .toDate() if rawActivity?['EventDateTime']?[0]?
      details = rawActivity?['EventCodeDesc']?[0]

      if details? and timestamp?
        activity = {timestamp, location, details}
        activities.push activity
    activities: activities, status: @getStatus shipment

  getEta: (shipment) ->
    activities = shipment['TrackingEventHistory']?[0]?['TrackingEventDetail'] or []
    [..., firstActivity] = activities
    return unless firstActivity?['EstimatedDeliveryDate']?[0]?
    moment("#{firstActivity?['EstimatedDeliveryDate']?[0]}T00:00:00Z").toDate()

  getService: (shipment) ->
    null

  getWeight: (shipment) ->
    null

  getDestination: (shipment) ->
    @presentAddress shipment?['PackageDestinationLocation']?[0]

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://www.aoneonline.com/pages/customers/trackingrequest.php?tracking_number=#{trackingNumber}"


module.exports = {A1Client}
