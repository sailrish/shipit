{load} = require 'cheerio'
moment = require 'moment'
request = require 'request'
{titleCase, upperCaseFirst, lowerCase} = require 'change-case'
{ShipperClient} = require './shipper'

class UpsMiClient extends ShipperClient

  constructor: (@options) ->
    super

  validateResponse: (response, cb) ->
    try
      $ = load(response, normalizeWhitespace: true)
      summary = $('#Table6').find('table')?[0]
      uspsDetails = $('#ctl00_mainContent_ctl00_pnlUSPS > table')
      miDetails = $('#ctl00_mainContent_ctl00_pnlMI > table')
      cb null, {$, summary, uspsDetails, miDetails}
    catch error
      cb error

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
    moment(eta).toDate() if eta?

  getService: ->

  getWeight: (data) ->
    weight = @extractSummaryField data, 'Weight'
    "#{weight} lbs." if weight?

  presentStatus: (status) ->

  presentTimestamp: (ts) ->

  getActivitiesAndStatus: (shipment) ->
    activities = []
    status = null
    {activities, status}

  getDestination: (data) ->
    @extractSummaryField data, 'Zip Code'

  requestOptions: ({trackingNumber}) ->
    method: GET
    uri: "http://www.ups-mi.net/packageID/PackageID.aspx?PID=#{trackingNumber}"

module.exports = {UpsMiClient}

