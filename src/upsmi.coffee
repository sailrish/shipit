{load} = require 'cheerio'
moment = require 'moment-timezone'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class UpsMiClient extends ShipperClient
  STATUS_MAP = {}

  constructor: (@options) ->
    STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered']
    STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = ['transferred', 'received', 'processed', 'sorted', 'post office entry']
    STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for post office delivery']
    STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['shipment information received']
    super

  validateResponse: (response, cb) ->
    $ = load(response, normalizeWhitespace: true)
    summary = $('#Table6').find('table')?[0]
    uspsDetails = $('#ctl00_mainContent_ctl00_pnlUSPS > table')
    miDetails = $('#ctl00_mainContent_ctl00_pnlMI > table')
    cb null, {$, summary, uspsDetails, miDetails}

  extractSummaryField: (data, name) ->
    value=null
    {$, summary} = data
    return unless summary?
    $(summary).children('tr').each (rindex, row) ->
      $(row).children('td').each (cindex, col) ->
        regex = new RegExp name
        if regex.test $(col).text()
          value = $(col).next()?.text()?.trim()
        return false if value?
      return false if value?
    value

  getEta: (data) ->
    eta = @extractSummaryField data, 'Projected Delivery Date'
    formattedEta = moment("#{eta} 00:00 +0000") if eta?
    if formattedEta?.isValid() then formattedEta.toDate() else undefined

  getService: ->

  getWeight: (data) ->
    weight = @extractSummaryField data, 'Weight'
    "#{weight} lbs." if weight?.length

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

  extractTimestamp: (tsString) ->
    if tsString.match ':'
      return moment("#{tsString} +0000").toDate()
    else
      return moment("#{tsString} 00:00 +0000").toDate()

  extractActivities: ($, table) ->
    activities = []
    $(table).children('tr').each (rindex, row) =>
      return if rindex is 0
      details = location = timestamp = null
      $(row).children('td').each (cindex, col) =>
        value = $(col)?.text()?.trim()
        switch cindex
          when 0 then timestamp = @extractTimestamp value
          when 1 then details = value
          when 2 then location = @presentLocationString value
      if details? and timestamp?
        activities.push {details, location, timestamp}
    activities

  getActivitiesAndStatus: (data) ->
    status = null
    {$, uspsDetails, miDetails} = data
    set1 = @extractActivities $, uspsDetails
    set2 = @extractActivities $, miDetails
    activities = set1.concat set2
    for activity in activities or []
      break if status?
      status = @presentStatus activity?.details

    {activities, status}

  getDestination: (data) ->
    destination = @extractSummaryField data, 'Zip Code'
    destination if destination?.length

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://www.ups-mi.net/packageID/PackageID.aspx?PID=#{trackingNumber}"

module.exports = {UpsMiClient}

