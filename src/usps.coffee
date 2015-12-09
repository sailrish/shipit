{Builder, Parser} = require 'xml2js'
request = require 'request'
moment = require 'moment-timezone'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class UspsClient extends ShipperClient

  constructor: ({@userId}, @options) ->
    super
    @parser = new Parser()
    @builder = new Builder(renderOpts: pretty: false)

  generateRequest: (trk, clientIp= '127.0.0.1') ->
    @builder.buildObject
      'TrackFieldRequest':
        '$': 'USERID': @userId
        'Revision': '1'
        'ClientIp': clientIp
        'SourceId': 'shipit'
        'TrackID':
          '$': 'ID': trk

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      trackInfo = trackResult?['TrackResponse']?['TrackInfo']?[0]
      return cb(xmlErr) if xmlErr? or !trackInfo?
      cb null, trackInfo
    @parser.reset()
    @parser.parseString response, handleResponse

  getEta: (shipment) ->
    rawEta =
      shipment['PredictedDeliveryDate']?[0] or
      shipment['ExpectedDeliveryDate']?[0]
    moment("#{rawEta} 00:00:00Z").toDate() if rawEta?

  getService: (shipment) ->
    service = shipment['Class']?[0]
    service.replace /\<SUP\>.*\<\/SUP\>/, '' if service?

  getWeight: (shipment) ->

  presentTimestamp: (dateString, timeString) ->
    return unless dateString?
    timeString = if timeString?.length then timeString else '12:00 am'
    moment("#{dateString} #{timeString} +0000").toDate()

  presentStatus: (status) ->
    return ShipperClient.STATUS_TYPES.UNKNOWN

  getDestination: (shipment) ->
    city = shipment['DestinationCity']?[0]
    stateCode = shipment['DestinationState']?[0]
    postalCode = shipment['DestinationZip']?[0]
    @presentLocation {city, stateCode, postalCode}

  STATUS_MAP =
   'Accept': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Processed': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Depart': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Picked Up': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Arrival': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Sorting Complete': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Customs clearance': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Dispatch': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Arrive': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Inbound Out of Customs': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Forwarded': ShipperClient.STATUS_TYPES.EN_ROUTE
   'Out for Delivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
   'Delivered': ShipperClient.STATUS_TYPES.DELIVERED
   'Notice Left': ShipperClient.STATUS_TYPES.DELAYED
   'Refused': ShipperClient.STATUS_TYPES.DELAYED
   'Item being held': ShipperClient.STATUS_TYPES.DELAYED
   'Missed delivery': ShipperClient.STATUS_TYPES.DELAYED
   'Addressee not available': ShipperClient.STATUS_TYPES.DELAYED
   'Undeliverable as Addressed': ShipperClient.STATUS_TYPES.DELAYED
   'Tendered to Military Agent': ShipperClient.STATUS_TYPES.DELIVERED

  findStatusFromMap: (statusText) ->
    status = ShipperClient.STATUS_TYPES.UNKNOWN
    for text, statusCode of STATUS_MAP
      regex = new RegExp text, 'i'
      if regex.test statusText
        status = statusCode
        break
    status

  getStatus: (shipment) ->
    statusCategory = shipment?['StatusCategory']?[0]
    switch statusCategory
      when 'Pre-Shipment' then ShipperClient.STATUS_TYPES.SHIPPING
      when 'Delivered' then ShipperClient.STATUS_TYPES.DELIVERED
      else @findStatusFromMap shipment?['Status']?[0]

  presentActivity: (rawActivity) ->
    return unless rawActivity?
    activity = null
    city = rawActivity['EventCity']?[0]
    stateCode = rawActivity['EventState']?[0] if rawActivity['EventState']?[0]?.length
    postalCode = rawActivity['EventZIPCode']?[0] if rawActivity['EventZIPCode']?[0]?.length
    countryCode = rawActivity['EventCountry']?[0] if rawActivity['EventCountry']?[0]?.length
    location = @presentLocation {city, stateCode, countryCode, postalCode}
    timestamp = @presentTimestamp rawActivity?['EventDate']?[0], rawActivity?['EventTime']?[0]
    details = rawActivity?['Event']?[0]
    if details? and timestamp?
      activity = {timestamp, location, details}
    activity

  getActivitiesAndStatus: (shipment) ->
    activities = []
    trackSummary = @presentActivity shipment?['TrackSummary']?[0]
    activities.push trackSummary if trackSummary?
    for rawActivity in shipment?['TrackDetail'] or []
      activity = @presentActivity rawActivity
      activities.push activity if activity?
    {activities: activities, status: @getStatus shipment}

  requestOptions: ({trackingNumber, clientIp, test}) ->
    endpoint = if test then 'ShippingAPITest.dll' else 'ShippingAPI.dll'
    xml = @generateRequest trackingNumber, clientIp
    method: 'GET'
    uri: "http://production.shippingapis.com/#{endpoint}?API=TrackV2&XML=#{xml}"

module.exports = {UspsClient}

