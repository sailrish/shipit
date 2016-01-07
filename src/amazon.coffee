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
    super

  validateResponse: (response, cb) ->
    $ = load(response, normalizeWhitespace: true)
    rightNow = /<!-- navp-.* \((.*)\) --?>/.exec(response)?[1]
    cb null, {$, rightNow}

  getService: ->

  getWeight: ->

  getDestination: (data) ->
    return unless data?
    {$, rightNow} = data
    dest = $(".delivery-address").text()
    @presentLocationString(dest) if dest?.length

  getEta: (data) ->
    return unless data?
    {$, rightNow} = data
    container = $(".shipment-status-content").children('span')
    return unless container.length
    deliveryStatus = $(container[0]).text().trim()
    return if /delivered/i.test deliveryStatus
    return unless /arriving/i.test deliveryStatus
    if /.* by .*/i.test deliveryStatus
      matches = deliveryStatus.match /(.*) by (.*)/, 'i'
      deliveryStatus = matches[1]
      timeComponent = matches[2]
    matches = deliveryStatus.match /Arriving (.*)/, 'i'
    dateComponentStr = matches?[1]
    if /-/.test dateComponentStr
      dateComponentStr = dateComponentStr.split('-')?[1]?.trim()
    dateComponent = moment(rightNow)
    if /today/i.test dateComponentStr
      numDays = 0
    else if /tomorrow/i.test dateComponentStr
      numDays = 1
    else if /day/i.test dateComponentStr
      nowDayVal = DAYS_OF_THE_WEEK[upperCase moment(rightNow).format('dddd')]
      etaDayVal = DAYS_OF_THE_WEEK[upperCase dateComponentStr]
      if etaDayVal > nowDayVal
        numDays = etaDayVal - nowDayVal
      else
        numDays = 7 + (etaDayVal - nowDayVal)
    else
      dateComponentStr += ', 2015' unless /20\d{2}/.test dateComponentStr
      numDays = (moment(dateComponentStr) - moment(rightNow)) / (1000 * 3600 * 24) + 1
    dateComponent = moment(rightNow).add(numDays, 'days')
    timeComponent ?= "11pm"
    timeComponent = upperCase timeComponent
    etaString = "#{dateComponent.format 'YYYY-MM-DD'} #{timeComponent} +00:00"
    moment(etaString, 'YYYY-MM-DD HA Z').toDate()

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
    {$, rightNow} = data
    status = @presentStatus $(".latest-event-status").text()
    rows = $("div[data-a-expander-name=event-history-list] .a-box")
    for row in rows
      columns = $($(row).find(".a-row")[0]).children '.a-column'
      if columns.length is 2
        timeOfDay = $(columns[0]).text().trim()
        timeOfDay = '12:00 AM' if timeOfDay is '--'
        components = $(columns[1]).children 'span'
        details = if components?[0]? then $(components[0]).text().trim() else ''
        location = if components?[1]? then $(components[1]).text().trim() else ''
        location = @presentLocationString location
        ts = "#{dateStr} #{timeOfDay} +00:00"
        timestamp = moment(ts, 'YYYY-MM-DD H:mm A Z').toDate()
        if timestamp? and details?.length
          activities.push {timestamp, location, details}
          status ?= @presentStatus details
      else
        dateStr = $(row).text().trim()
          .replace 'Latest update: ', ''
        if /yesterday/i.test dateStr
          date = moment(rightNow).subtract(1, 'day')
        else if /today/i.test dateStr
          date = moment(rightNow)
        else if /day/.test dateStr
          date = moment "#{dateStr}, #{moment(rightNow).format 'YYYY'}"
        else
          date = moment dateStr
        dateStr = date.format 'YYYY-MM-DD'
    {activities, status}

  requestOptions: ({orderID, orderingShipmentId}) ->
    method: 'GET'
    uri: "https://www.amazon.com/gp/css/shiptrack/view.html" +
      "/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8" +
      "&orderID=#{orderID}" +
      "&orderingShipmentId=#{orderingShipmentId}" +
      "&packageId=1"

module.exports = {AmazonClient}

