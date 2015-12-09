{Builder, Parser} = require 'xml2js'
request = require 'request'
moment = require 'moment-timezone'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class UpsClient extends ShipperClient

  constructor: ({@licenseNumber, @userId, @password}, @options) ->
    super
    @parser = new Parser()
    @builder = new Builder(renderOpts: pretty: false)

  generateRequest: (trk, reference = 'n/a') ->
    accessRequest = @builder.buildObject
      'AccessRequest':
        'AccessLicenseNumber': @licenseNumber
        'UserId': @userId
        'Password': @password

    trackRequest = @builder.buildObject
      'TrackRequest':
        'Request':
          'TransactionReference': 'CustomerContext': reference
          'RequestAction': 'track'
          'RequestOption': 3
        'TrackingNumber': trk

    "#{accessRequest}#{trackRequest}"

  validateResponse: (response, cb) ->
    handleResponse = (xmlErr, trackResult) ->
      return cb(xmlErr) if xmlErr? or !trackResult?
      responseStatus = trackResult['TrackResponse']?['Response']?[0]?['ResponseStatusDescription']?[0]
      if responseStatus isnt 'Success'
        error = trackResult['TrackResponse']?['Response']?[0]?['Error']?[0]?['ErrorDescription']?[0]
        errorMsg = error or "unknown error"
        shipment = null
      else
        shipment = trackResult['TrackResponse']['Shipment']?[0]
        errorMsg = "missing shipment data" unless shipment?
      return cb(errorMsg) if errorMsg?
      cb null, shipment
    @parser.reset()
    @parser.parseString response, handleResponse

  getEta: (shipment) ->
    @presentTimestamp shipment['Package']?[0]?['RescheduledDeliveryDate']?[0] or shipment['ScheduledDeliveryDate']?[0]

  getService: (shipment) ->
    if service = shipment['Service']?[0]?['Description']?[0]
      titleCase service

  getWeight: (shipment) ->
    weight = null
    if weightData = shipment['Package']?[0]?['PackageWeight']?[0]
      weight = weightData['Weight']?[0]
      if weight? and units = weightData['UnitOfMeasurement']?[0]?['Code']?[0]
        weight = "#{weight} #{units}"
    weight

  presentTimestamp: (dateString, timeString) ->
    return unless dateString?
    timeString ?= '00:00:00'
    formatSpec = 'YYYYMMDD HHmmss ZZ'
    moment("#{dateString} #{timeString} +0000", formatSpec).toDate()

  presentAddress: (rawAddress) ->
    return unless rawAddress
    city = rawAddress['City']?[0]
    stateCode = rawAddress['StateProvinceCode']?[0]
    countryCode = rawAddress['CountryCode']?[0]
    postalCode = rawAddress['PostalCode']?[0]
    @presentLocation {city, stateCode, countryCode, postalCode}

  STATUS_MAP =
    'D': ShipperClient.STATUS_TYPES.DELIVERED
    'P': ShipperClient.STATUS_TYPES.EN_ROUTE
    'M': ShipperClient.STATUS_TYPES.SHIPPING

  presentStatus: (status) ->
    return ShipperClient.STATUS_TYPES.UNKNOWN unless status?

    statusType = status['StatusType']?[0]?['Code']?[0]
    statusCode = status['StatusCode']?[0]?['Code']?[0]
    return STATUS_MAP[statusType] if STATUS_MAP[statusType]?

    switch statusType
      when 'I' then switch statusCode
        when 'OF' then ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
        else ShipperClient.STATUS_TYPES.EN_ROUTE
      when 'X' then switch statusCode
        when 'U2' then ShipperClient.STATUS_TYPES.EN_ROUTE
        else ShipperClient.STATUS_TYPES.DELAYED
      else
        ShipperClient.STATUS_TYPES.UNKNOWN

  getDestination: (shipment) ->
    @presentAddress shipment['ShipTo']?[0]?['Address']?[0]

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    rawActivities = shipment?['Package']?[0]?['Activity']
    for rawActivity in rawActivities or []
      location = @presentAddress rawActivity['ActivityLocation']?[0]?['Address']?[0]
      timestamp = @presentTimestamp rawActivity['Date']?[0], rawActivity['Time']?[0]
      lastStatus = rawActivity['Status']?[0]
      details = lastStatus?['StatusType']?[0]?['Description']?[0]
      if details? and timestamp?
        details = upperCaseFirst lowerCase details
        activity = {timestamp, location, details}
        if statusObj = rawActivity['Status']?[0]
          activity.statusType = statusObj['StatusType']?[0]?['Code']?[0]
          activity.statusCode = statusObj['StatusCode']?[0]?['Code']?[0]
        activities.push activity
      if !status
        status = @presentStatus rawActivity['Status']?[0]
    {activities, status}

  requestOptions: ({trackingNumber, reference, test}) ->
    hostname = if test then 'wwwcie.ups.com' else 'www.ups.com'
    method: 'POST'
    uri: "https://#{hostname}/ups.app/xml/Track"
    body: @generateRequest trackingNumber, reference

module.exports = {UpsClient}

