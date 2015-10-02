{load} = require 'cheerio'
moment = require 'moment-timezone'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class DhlGmClient extends ShipperClient
  STATUS_MAP = {}

  constructor: (@options) ->
    STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered']
    STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = [
      'transferred'
      'cleared'
      'received'
      'processed'
      'sorted'
      'sorting complete'
      'arrival'
      'tendered']
    STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for delivery']
    STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['electronic notification received']
    super

  validateResponse: (response, cb) ->
    try
      response = response.replace /<br>/gi, ' '
      cb null, load(response, normalizeWhitespace: true)
    catch error
      cb error

  extractSummaryField: (data, name) ->
    return unless data?
    $ = data
    value = undefined
    regex = new RegExp name
    $(".card-info > dl").children().each (findex, field) ->
      if regex.test $(field).text()
        value = $(field).next()?.text()?.trim()
      return false if value?
    value

  extractHeaderField: (data, name) ->
    return unless data?
    $ = data
    value = undefined
    regex = new RegExp name
    $(".card > .row").children().each (findex, field) ->
      $(field).children().each (cindex, col) ->
        $(col).find('dt').each (dindex, element) ->
          if regex.test $(element).text()
            value = $(element).next()?.text()?.trim()
      return false if value?
    value

  getEta: (data) ->
    return unless data?
    $ = data
    eta = $(".status-info > .row .est-delivery > p").text()
    return unless eta?.length
    moment("#{eta} 23:59:59 +00:00").toDate()

  getService: (data) ->
    @extractSummaryField data, 'Service'

  getWeight: (data) ->
    @extractSummaryField data, 'Weight'

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
    status = null
    activities = []
    return {activities, status} unless data?
    $ = data
    currentDate = null
    for rowData in $(".timeline").children() or []
      row = $(rowData)
      currentDate = row.text() if row.hasClass 'timeline-date'
      if row.hasClass 'timeline-event'
        currentTime = row.find(".timeline-time").text()
        if currentTime?.length
          currentTime = currentTime.trim().split(' ')?[0] if currentTime?.length
          currentTime = currentTime.replace('AM', ' AM').replace('PM', ' PM')
          currentTime += " +00:00"
          timestamp = moment("#{currentDate} #{currentTime}").toDate()
        location = row.find(".timeline-location-responsive").text()
        location = location?.trim()
        location = upperCaseFirst(location) if location?.length
        details = row.find(".timeline-description").text()?.trim()
        if details? and timestamp?
          status ?= @presentStatus details
          activities.push {details, location, timestamp}
    {activities, status}

  getDestination: (data) ->
    @extractHeaderField data, 'To:'

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://webtrack.dhlglobalmail.com/?trackingnumber=#{trackingNumber}"

module.exports = {DhlGmClient}

