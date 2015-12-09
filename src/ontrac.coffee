{load} = require 'cheerio'
moment = require 'moment-timezone'
async = require 'async'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class OnTracClient extends ShipperClient

  constructor: (@options) ->
    super

  validateResponse: (response, cb) ->
    data = load(response, normalizeWhitespace: true)
    cb null, data

  extractSummaryField: (shipment, name) ->
    value = null
    $ = shipment
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
      eta = "#{regexMatch[1]} 23:59:59 +00:00"
    moment(eta).toDate()

  getService: (shipment) ->
    service = @extractSummaryField shipment, 'Service Code'
    return unless service?
    titleCase service

  getWeight: (shipment) ->
    @extractSummaryField shipment, 'Weight'

  LOCATION_STATES =
   'Ontario': 'CA'
   'Bakersfield': 'CA'
   'Denver': 'CO'
   'Vancouver': 'WA'
   'Orange': 'CA'
   'Hayward': 'CA'
   'Phoenix': 'AZ'
   'Sacramento': 'CA'
   'Vegas': 'NV'
   'Los Angeles': 'CA'
   'Santa Maria': 'CA'
   'Eugene': 'OR'
   'Commerce': 'CA'
   'Kettleman City': 'CA'
   'Menlo Park': 'CA'
   'San Jose': 'CA'
   'Burbank': 'CA'
   'Ventura': 'CA'
   'Petaluma': 'CA'
   'Corporate': 'CA'
   'Medford': 'OR'
   'Monterey': 'CA'
   'San Francisco': 'CA'
   'Stockton': 'CA'
   'San Diego': 'CA'
   'Fresno': 'CA'
   'Salt Lake': 'UT'
   'SaltLake': 'UT'
   'Concord': 'CA'
   'Tucson':'AZ'
   'Reno': 'NV'
   'Seattle': 'WA'

  presentAddress: (location) ->
    addressState = LOCATION_STATES[location]
    if addressState? then "#{location}, #{addressState}" else location

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

  presentTimestamp: (ts) ->
    return unless ts?
    ts = ts.replace(/AM$/, ' AM').replace(/PM$/, ' PM')
    moment("#{ts} +0000").toDate()

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = @presentStatus @extractSummaryField shipment, 'Delivery Status'
    $ = shipment
    return {activities, status} unless $?
    $("#trkdetail table table").children('tr').each (rowIndex, row) =>
      return unless rowIndex > 0
      fields = []
      $(row).find('td').each (colIndex, col) ->
        fields.push $(col).text().trim()
      if fields.length
        details = upperCaseFirst(lowerCase(fields[0])) if fields[0].length
        timestamp = @presentTimestamp fields[1]
        location = @presentAddress fields[2] if fields[2].length
        activities.unshift {details, timestamp, location} if details? and timestamp?
    {activities, status}

  getDestination: (shipment) ->
    destination = @extractSummaryField shipment, 'Deliver To'
    @presentLocationString destination

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "https://www.ontrac.com/trackingdetail.asp?tracking=#{trackingNumber}&run=0"

module.exports = {OnTracClient}

