{load} = require 'cheerio'
moment = require 'moment'
async = require 'async'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class OnTracClient extends ShipperClient

  constructor: (@options) ->
    super

  validateResponse: (responses, cb) ->
    try
      return cb(error: "missing data") if responses?.length < 2
      return cb(error: "missing summary") unless responses[0]?
      return cb(error: "missing details") unless responses[1]?
      summary = load(responses[0], normalizeWhitespace: true)
      details = load(responses[1], normalizeWhitespace: true)
      cb null, {summary, details}
    catch error
      cb error

  extractSummaryField: (shipment, name) ->
    value = null
    $ = shipment?.summary
    return unless $?
    $('td[bgcolor="#ffd204"]').each (index, element) ->
      regex = new RegExp(name)
      return unless regex.test $(element).text()
      value = $(element).next()?.text()?.trim()
      false

    value

  getEta: (shipment) ->
    eta = @extractSummaryField shipment, 'Service Commitment'
    return unless eta?
    regexMatch = eta.match('(.*) by (.*)')
    if regexMatch?.length > 1
      eta = regexMatch[1]
    moment(eta).toDate()

  getService: (shipment) ->
    service = @extractSummaryField shipment, 'Service Code'
    return unless service?
    titleCase service

  getWeight: (shipment) ->
    @extractSummaryField shipment, 'Weight'

  presentTimestamp: (dateString, timeString) ->

  presentAddress: (rawAddress) ->

  STATUS_MAP =
    'DELIVERED': ShipperClient.STATUS_TYPES.DELIVERED
    'OUT FOR DELIVERY': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'PACKAGE RECEIVED AT FACILITY': ShipperClient.STATUS_TYPES.EN_ROUTE
    'IN TRANSIT': ShipperClient.STATUS_TYPES.EN_ROUTE
    'DATA ENTRY': ShipperClient.STATUS_TYPES.SHIPPING

  presentStatus: (status) ->
    status = status?.replace('DETAILS', '')?.trim()
    return ShipperClient.STATUS_TYPES.UNKNOWN unless status?.length
    statusType = STATUS_MAP[status]
    if statusType? then statusType else ShipperClient.STATUS_TYPES.UNKNOWN

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = @presentStatus @extractSummaryField shipment, 'Delivery Status'
    {activities, status}

  getDestination: (shipment) ->
    destination = @extractSummaryField shipment, 'Deliver To'
    fields = destination?.split ','
    return unless fields.length

    newFields = []
    for field in fields
      field = field.trim()
      field = titleCase(field) if field.length > 2
      newFields.push field

    newFields.join ', '


  requestData: ({trackingNumber}, cb) ->
    summary = (done) ->
      opts =
        method: 'GET'
        uri: "https://www.ontrac.com/trackingres.asp?tracking_number=#{trackingNumber}"
      request opts, (err, response, body) =>
        return done(err) if !body? or err?
        return done("response status #{response.statusCode}") if response.statusCode isnt 200
        done(null, body)

    details = (done) ->
      opts =
        method: 'GET'
        uri: "https://www.ontrac.com/trackingdetail.asp?tracking=#{trackingNumber}"
      request opts, (err, response, body) =>
        return done(err) if !body? or err?
        return done("response status #{response.statusCode}") if response.statusCode isnt 200
        done(null, body)

    async.parallel [summary, details], (err, responses) =>
      return cb(err) if err? or !responses?
      @presentResponse responses, cb

module.exports = {OnTracClient}

