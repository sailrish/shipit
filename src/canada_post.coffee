{Parser} = require 'xml2js'
{find} = require 'underscore'
moment = require 'moment-timezone'
{titleCase} = require 'change-case'
{ShipperClient} = require './shipper'

class CanadaPostClient extends ShipperClient

  constructor: ({@username, @password}, @options) ->
    super
    @parser = new Parser()

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr? or !trackResult?
      details = trackResult['tracking-detail']
      return cb('response not recognized') unless details?
      cb null, details
    @parser.reset()
    @parser.parseString response, handleResponse

  STATUS_MAP =
   'in transit': ShipperClient.STATUS_TYPES.EN_ROUTE
   'processed': ShipperClient.STATUS_TYPES.EN_ROUTE
   'information submitted': ShipperClient.STATUS_TYPES.SHIPPING
   'Shipment picked up': ShipperClient.STATUS_TYPES.SHIPPING
   'Shipment received': ShipperClient.STATUS_TYPES.EN_ROUTE
   'delivered': ShipperClient.STATUS_TYPES.DELIVERED
   'out for delivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
   'item released': ShipperClient.STATUS_TYPES.EN_ROUTE
   'arrived': ShipperClient.STATUS_TYPES.EN_ROUTE
   'is en route': ShipperClient.STATUS_TYPES.EN_ROUTE
   'item mailed': ShipperClient.STATUS_TYPES.SHIPPING

  findStatusFromMap: (statusText) ->
    status = ShipperClient.STATUS_TYPES.UNKNOWN
    return status unless statusText?.length
    for text, statusCode of STATUS_MAP
      regex = new RegExp text
      if regex.test statusText
        status = statusCode
        break
    status

  getStatus: (lastEvent) ->
    @findStatusFromMap lastEvent?.details

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    events = shipment['significant-events']?[0]?['occurrence']
    for event in events or []
      city = event['event-site']?[0]
      stateCode = event['event-province']?[0]
      location = @presentLocation({city, stateCode})
      timestamp = "#{event['event-date']?[0]}T#{event['event-time']?[0]}Z"
      timestamp = moment(timestamp).toDate()
      details = event['event-description']?[0]
      if details? and timestamp?
        activity = {timestamp, location, details}
        activities.push activity
    activities: activities, status: @getStatus activities?[0]

  getEta: (shipment) ->
    ts = shipment['changed-expected-date']?[0] or
      shipment['expected-delivery-date']?[0]
    return unless ts?.length
    moment("#{ts}T00:00:00Z").toDate() if ts?.length

  getService: (shipment) ->
    shipment['service-name']?[0]

  getWeight: (shipment) ->

  getDestination: (shipment) ->
    shipment['destination-postal-id']?[0]

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "https://soa-gw.canadapost.ca/vis/track/pin/#{trackingNumber}/detail.xml"
    auth: {user: @username, pass: @password}


module.exports = {CanadaPostClient}
