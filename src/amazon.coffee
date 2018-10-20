{load} = require 'cheerio'
moment = require 'moment-timezone'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase, upperCase} = require 'change-case'
{ShipperClient} = require './shipper'

class AmazonClient extends ShipperClient
  STATUS_MAP =
    'ORDERED': ShipperClient.STATUS_TYPES.SHIPPING
    'SHIPPED': ShipperClient.STATUS_TYPES.EN_ROUTE
    'IN_TRANSIT': ShipperClient.STATUS_TYPES.EN_ROUTE
    'OUT_FOR_DELIVERY': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
    'DELIVERED': ShipperClient.STATUS_TYPES.DELIVERED

  constructor: (@options) ->
    super()

  validateResponse: (response, cb) ->
    $ = load(response, normalizeWhitespace: true)
    cb null, {$, response}

  getService: ->

  getWeight: ->

  getDestination: (data) ->
    return unless data?
    {$, response} = data
    dest = $(".delivery-address").text()
    @presentLocationString(dest) if dest?.length

  getEta: (data) ->
    return unless data?
    {$, response} = data

  presentStatus: (data) ->
    {$, response} = data
    STATUS_MAP[response.toString().match('"shortStatus":"(.*?)"')?[1]]

  getActivitiesAndStatus: (data) ->
    activities = []
    status = @presentStatus data
    return {activities, status} unless data?
    {$, response} = data
    for row in $('#tracking-events-container').children('.a-container').children('.a-row')
      continue unless $(row).children('.tracking-event-date-header').length
      dateText = ''
      for subrow in $(row).children('.a-row')
        subrow = $(subrow)
        cols = subrow.children('.a-column')
        if subrow.hasClass('tracking-event-date-header')
          dateText = subrow.children('.tracking-event-date').text()
          dateText += ", #{moment().year()}" if dateText.split(',').length == 2
        else if cols.length == 2
          details = $(cols[1]).find('.tracking-event-message').text()
          location = $(cols[1]).find('.tracking-event-location').text()
          timeText = $(cols[0]).find('.tracking-event-time').text()
          if dateText?.length
            if timeText?.length
              timestamp = moment("#{dateText} #{timeText} +0000").toDate()
            else
              timestamp = moment("#{dateText} 00:00:00 +0000").toDate()
          activities.push {timestamp, location, details}
    {activities, status}

  requestOptions: ({orderID, orderingShipmentId}) ->
    method: 'GET'
    uri: "https://www.amazon.com/gp/css/shiptrack/view.html" +
      "/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8" +
      "&orderID=#{orderID}" +
      "&orderingShipmentId=#{orderingShipmentId}" +
      "&packageId=1"

module.exports = {AmazonClient}

