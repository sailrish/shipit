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
      summary = load(responses[0])
      details = load(responses[1])
      cb null, {summary, details}
    catch error
      cb error

  getEta: (shipment) ->

  getService: (shipment) ->

  getWeight: (shipment) ->

  presentTimestamp: (dateString, timeString) ->

  presentAddress: (rawAddress) ->

  presentStatus: (status) ->

  getActivitiesAndStatus: (shipment) ->
    {}

  getDestination: (shipment) ->

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

