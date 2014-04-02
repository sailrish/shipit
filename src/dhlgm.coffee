{load} = require 'cheerio'
moment = require 'moment'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class DhlGmClient extends ShipperClient
  STATUS_MAP = {}

  constructor: (@options) ->
    STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered']
    STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = ['transferred', 'received', 'processed', 'sorted', 'post office entry']
    STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for post office delivery']
    STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['shipment information received']
    super

  validateResponse: (response, cb) ->
    try
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

  getService: (data) ->
    @extractSummaryField data, 'Service'

  getWeight: (data) ->
    @extractSummaryField data, 'Weight'

  presentStatus: (details) ->
    status = null
    for statusCode, matchStrings of STATUS_MAP
      for text in matchStrings
        regex = new RegExp(text)
        if regex.test lowerCase(details)
          status = statusCode
          break
      break if status?
    parseInt(status, 10) if status?

  getActivitiesAndStatus: (data) ->
    status = null
    activities = []
    {activities, status}

  getDestination: (data) ->
    @extractHeaderField data, 'To:'

  requestOptions: ({trackingNumber}) ->
    method: 'GET'
    uri: "http://webtrack.dhlglobalmail.com/?trackingnumber=#{trackingNumber}"

module.exports = {DhlGmClient}

