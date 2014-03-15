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
    _dhlClient = new DhlClient
      userId: 'dhl-user'
      password: 'dhl-pw'

  describe "generateRequest", ->
    it "generates an accurate track request", ->
      trackXml = _dhlClient.generateRequest('1Z5678')
      expect(trackXml).to.equal '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ECommerce action="Request" version="1.1"><Requestor><ID>dhl-user</ID><Password>dhl-pw</Password></Requestor><Track action="Get" version="1.0"><Shipment><TrackingNbr>1Z5678</TrackingNbr></Shipment></Track></ECommerce>'

  describe "requestOptions", ->
    _options = null
    _generateReq = null
    _generateReqSpy = null

    before ->
      _generateReqSpy = bond(_dhlClient, 'generateRequest')
      _generateReq = _generateReqSpy.through()
      _options = _dhlClient.requestOptions trackingNumber: '1ZMYTRACK123'

    after ->
      _generateReqSpy.restore()

    it "creates a POST request", ->
      _options.method.should.equal 'POST'
