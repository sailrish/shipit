fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{DhlClient} = require '../lib/dhl'
{ShipperClient} = require '../lib/shipper'
{Builder, Parser} = require 'xml2js'

describe "dhl client", ->
  _dhlClient = null
  _xmlParser = new Parser()
  _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

  before ->
    _dhlClient = new DhlClient()

  describe "generateRequest", ->
    _xmlDocs = null

    before ->
      trackXml = _dhlClient.generateRequest('1Z5678', 'eloquent shipit')
      _xmlDocs = trackXml.split _xmlHeader

    it "generates a track request with two xml documents", ->

    it "includes an AccessRequest in the track request", (done) ->
      done()

    it "includes a TrackRequest in the track request", (done) ->
      done()

    it "includes an AccessRequest with license number, user id and password", (done) ->
      done()

  describe "requestOptions", ->
    _options = null
    _generateReq = null
    _generateReqSpy = null

    before ->
      _generateReqSpy = bond(_dhlClient, 'generateRequest')
      _generateReq = _generateReqSpy.through()
      _options = _dhlClient.requestOptions trackingNumber: '1ZMYTRACK123', reference: 'zappos'

    after ->
      _generateReqSpy.restore()

    it "creates a POST request", ->
      _options.method.should.equal 'POST'
