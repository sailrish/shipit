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

  describe "validateResponse", ->

  describe "integration tests", ->
    _package = null

    describe "delivered package", ->

      before (done) ->
        fs.readFile 'test/stub_data/dhl_delivered.xml', 'utf8', (err, doc) ->
          _dhlClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a destination of Henniker, MA", ->
        expect(_package.destination).to.equal 'Henniker, MA'

      it "has a service description of Express Worldwide Nondoc", ->
        expect(_package.service).to.equal 'Express Worldwide Nondoc'

      it "has a weight of 81.4 LB", ->
        expect(_package.weight).to.equal "81.4 LB"

      it "has 15 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 15
        act = _package.activities[0]
        expect(act.location).to.equal 'Boston, MA'
        expect(act.details).to.equal 'Shipment delivered'
        expect(act.timestamp).to.deep.equal new Date '2014-03-14T14:06:00Z'
        act = _package.activities[14]
        expect(act.location).to.equal 'Ahmedabad, India'
        expect(act.details).to.equal 'Shipment picked up'
        expect(act.timestamp).to.deep.equal new Date '2014-03-12T16:24:00Z'

    describe "in transit package", ->

      before (done) ->
        fs.readFile 'test/stub_data/dhl_intransit.xml', 'utf8', (err, doc) ->
          _dhlClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a destination of Kuwait", ->
        expect(_package.destination).to.equal 'Kuwait, Kuwait'

      it "has a service description of Express Worldwide Nondoc", ->
        expect(_package.service).to.equal 'Express Worldwide Nondoc'

      it "has a weight of 81.4 LB", ->
        expect(_package.weight).to.equal "1.0 LB"

      it "has 15 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 14
        act = _package.activities[0]
        expect(act.location).to.equal 'Kuwait, Kuwait'
        expect(act.details).to.equal 'Clearance Delay'
        expect(act.timestamp).to.deep.equal new Date '2014-03-16T14:48:00Z'
        act = _package.activities[13]
        expect(act.location).to.equal 'Dayton, OH'
        expect(act.details).to.equal 'Shipment picked up'
        expect(act.timestamp).to.deep.equal new Date '2014-03-13T15:05:00Z'
