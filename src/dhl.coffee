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
    "#{dateString}, #{timeString}"

  presentAddress: (rawAddress) ->
    return unless rawAddress?
    city = rawAddress['City']?[0]
    stateCode = rawAddress['State']?[0]
    countryCode = rawAddress['Country']?[0]
    city = city.replace(' HUB', '')
    @presentLocation {city, stateCode, countryCode}

  STATUS_MAP =
    'D': ShipperClient.STATUS_TYPES.DELIVERED
    'P': ShipperClient.STATUS_TYPES.EN_ROUTE
    'M': ShipperClient.STATUS_TYPES.SHIPPING

  presentStatus: (status) ->
    status

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

