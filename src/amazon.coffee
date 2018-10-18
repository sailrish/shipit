{load} = require 'cheerio'
moment = require 'moment-timezone'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase, upperCase} = require 'change-case'
{ShipperClient} = require './shipper'

class AmazonClient extends ShipperClient
  STATUS_MAP = {}

  DAYS_OF_THE_WEEK = {}

  constructor: (@options) ->
    STATUS_MAP[ShipperClient.STATUS_TYPES.DELAYED] = ['delivery attempted']
    STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered']
    STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for delivery']

    STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = [
      'in transit to carrier'
      'shipping soon'
    ]

    STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = [
      'on the way'
      'package arrived'
      'package received'
      'shipment departed'
      'shipment arrived'
    ]

    DAYS_OF_THE_WEEK['SUNDAY'] = 0
    DAYS_OF_THE_WEEK['MONDAY'] = 1
    DAYS_OF_THE_WEEK['TUESDAY'] = 2
    DAYS_OF_THE_WEEK['WEDNESDAY'] = 3
    DAYS_OF_THE_WEEK['THURSDAY'] = 4
    DAYS_OF_THE_WEEK['FRIDAY'] = 5
    DAYS_OF_THE_WEEK['SATURDAY'] = 6
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

  presentStatus: (details) ->
    status = null
    for statusCode, matchStrings of STATUS_MAP
      for text in matchStrings
        regex = new RegExp(text, 'i')
        if regex.test lowerCase(details)
          status = statusCode
          break
      break if status?
    parseInt(status, 10) if status?

  getActivitiesAndStatus: (data) ->
    activities = []
    status = null
    return {activities, status} unless data?
    {$, response} = data
    status = response.toString().match('shortStatus=(.*?),')?[1]
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
          if dateText?.length and timeText?.length
            timestamp = moment("#{dateText} #{timeText}")
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

