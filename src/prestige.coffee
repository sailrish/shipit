{reduce} = require 'underscore'
moment = require 'moment-timezone'
{titleCase} = require 'change-case'
{ShipperClient} = require './shipper'

class PrestigeClient extends ShipperClient

  constructor: (@options) ->
    super

  validateResponse: (response, cb) ->
    response = JSON.parse response
    return cb(error: 'no tracking info found') unless response?.length
    response = response[0]
    return cb(error: 'missing events') unless response['TrackingEventHistory']?
    cb null, response

  ADDR_ATTRS = ['City', 'State', 'Zip']

  presentAddress: (prefix, event) ->
    return unless event?
    address = reduce ADDR_ATTRS, ((d, v) ->
      d[v]=event["#{prefix}#{v}"]
      return d
    ), {}
    city = address['City']
    stateCode = address['State']
    postalCode = address['Zip']
    @presentLocation {city, stateCode, postalCode}

  STATUS_MAP =
    301: ShipperClient.STATUS_TYPES.DELIVERED
    302: ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    101: ShipperClient.STATUS_TYPES.SHIPPING

  presentStatus: (eventType) ->
    codeStr = eventType.match('EVENT_(.*)$')?[1]
    return unless codeStr?.length
    eventCode = parseInt codeStr
    return if isNaN eventCode
    status = STATUS_MAP[eventCode]
    return status if status?
    return ShipperClient.STATUS_TYPES.EN_ROUTE if (eventCode < 300 and eventCode > 101)

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    rawActivities = shipment?['TrackingEventHistory']
    for rawActivity in rawActivities or []
      location = @presentAddress 'EL', rawActivity
      dateTime = "#{rawActivity?['serverDate']} #{rawActivity?['serverTime']}"
      timestamp = moment("#{dateTime} +00:00").toDate()
      details = rawActivity?['EventCodeDesc']
      if details? and timestamp?
        activity = {timestamp, location, details}
        activities.push activity
      if !status
        status = @presentStatus rawActivity?['EventCode']
    {activities, status}

  getEta: (shipment) ->
    eta = shipment?['TrackingEventHistory']?[0]?['EstimatedDeliveryDate']
    return unless eta?.length
    eta = "#{eta} 00:00 +00:00"
    moment(eta, 'MM/DD/YYYY HH:mm ZZ').toDate()

  getService: (shipment) ->

  getWeight: (shipment) ->
    return unless shipment?['Pieces']?.length
    piece = shipment['Pieces'][0]
    weight = "#{piece['Weight']}"
    units = piece['WeightUnit']
    weight = "#{weight} #{units}" if units?
    weight

  getDestination: (shipment) ->
    @presentAddress 'PD', shipment?['TrackingEventHistory']?[0]

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://www.prestigedelivery.com/TrackingHandler.ashx?trackingNumbers=#{trackingNumber}"


module.exports = {PrestigeClient}
