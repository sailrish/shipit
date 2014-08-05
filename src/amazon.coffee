{load} = require 'cheerio'
moment = require 'moment'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class AmazonClient extends ShipperClient
  STATUS_MAP = {}

  constructor: (@options) ->
    STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered']
    STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = ['transit']
    STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for delivery']
    STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['shipping soon']
    super

  validateResponse: (response, cb) ->
    try
      $ = load(response, normalizeWhitespace: true)
      summary = $('#summaryLeft')
      cb null, {$, summary}
    catch error
      cb error

  getService: ->

  getWeight: ->

  getDestination: ->

  getEta: (data) ->
    eta = etaString = null
    {$, summary} = data
    $(summary).children('span').each (sindex, span) ->
      if /Expected delivery/.test $(span).text()
        etaString = $(span).next().text().split(',')[1..-1].join(',')
        eta = moment(etaString, ' MMM D, YYYY by h:mma').toDate()
    eta

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
    statusText = status = null
    activities = []
    {$, summary} = data
    $(summary).children('h2').each (hindex, h2) ->
      statusText = $(h2).text()
    status = @presentStatus statusText if statusText?
    if status==ShipperClient.STATUS_TYPES.DELIVERED
      tsString = null
      $(summary).children('span').each (sindex, span) ->
        if /Delivered on:/.test $(span).text()
          tsString = $(span).next().text().split(',')[1..-1].join(',')
          ts = moment(tsString, 'MMM D, YYYY').toDate()
          activities.push timestamp: ts, location: '', details: 'Delivered'
    {activities, status}

  requestOptions: ({orderID, orderingShipmentId}) ->
    method: 'GET'
    uri: "https://www.amazon.com/gp/css/shiptrack/view.html/ref=pe_385040_121528360_TE_typ?orderID=#{orderID}&orderingShipmentId=#{orderingShipmentId}&packageId=1"

module.exports = {AmazonClient}

