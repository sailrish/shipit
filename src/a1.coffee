{Parser} = require 'xml2js'
moment = require 'moment'
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
        console.log "[A1] ERR=#{JSON.stringify errorInfo}"
        error = errorInfo?['TrackingErrorDetail']?[0]?['ErrorDetailCodeDesc']?[0]
        return cb error if error?
        cb 'unknown error'
      cb null, trackingInfo
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

  getStatus: (shipment) ->
    statusCode = shipment?['StatusCode']?[0]
    return unless statusCode?
    if STATUS_MAP[statusCode]? then STATUS_MAP[statusCode] else ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    for rawActivity in shipment['Events'] or []
      location = @presentAddress rawActivity['Address']?[0]
      timestamp = moment(rawActivity['Timestamp'][0]).toDate() if rawActivity['Timestamp']?[0]?
      details = rawActivity['EventDescription']?[0]
      if details? and location? and timestamp?
        activity = {timestamp, location, details}
        activities.push activity
    activities: activities, status: @getStatus shipment

  getEta: (shipment) ->
    return null

  getService: (shipment) ->
    return null

  getWeight: (shipment) ->
    return null

  getDestination: (shipment) ->
    @presentAddress shipment['DestinationAddress']?[0]

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://www.aoneonline.com/pages/customers/trackingrequest.php?tracking_number=#{trackingNumber}"


module.exports = {A1Client}
