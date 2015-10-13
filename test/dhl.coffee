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
      expect(trackXml).to.equal  """
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <req:KnownTrackingRequest xmlns:req="http://www.dhl.com">
      <Request>
        <ServiceHeader>
          <SiteID>dhl-user</SiteID>
          <Password>dhl-pw</Password>
        </ServiceHeader>
      </Request>
      <LanguageCode>en</LanguageCode>
      <AWBNumber>1Z5678</AWBNumber>
      <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>
    </req:KnownTrackingRequest>"""

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

      it "has a destination of Woodside, NY, USA", ->
        expect(_package.destination).to.equal 'Woodside, NY, USA'

      it "has a weight of 2.42 LB", ->
        expect(_package.weight).to.equal "2.42 LB"

      it "has 14 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 14
        act = _package.activities[0]
        expect(act.location).to.equal 'Woodside, NY, USA'
        expect(act.details).to.equal 'Delivered - Signed for by'
        expect(act.timestamp).to.deep.equal new Date '2015-10-01T13:44:37Z'
        act = _package.activities[13]
        expect(act.location).to.equal 'London, Heathrow - United Kingdom'
        expect(act.details).to.equal 'Processed'
        expect(act.timestamp).to.deep.equal new Date '2015-09-29T21:10:34Z'

    describe "delayed package", ->

      before (done) ->
        fs.readFile 'test/stub_data/dhl_delayed.xml', 'utf8', (err, doc) ->
          _dhlClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delayed", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELAYED

      it "has a destination of Auckland, New Zealand", ->
        expect(_package.destination).to.equal 'Auckland, New Zealand'

      it "has a weight of 14.66 LB", ->
        expect(_package.weight).to.equal "14.66 LB"

      it "has 24 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 24
        act = _package.activities[0]
        expect(act.location).to.equal 'Auckland, New Zealand'
        expect(act.details).to.equal 'Clearance event'
        expect(act.timestamp).to.deep.equal new Date '2015-10-08T02:33:00Z'
        act = _package.activities[23]
        expect(act.location).to.equal 'London, Heathrow - United Kingdom'
        expect(act.details).to.equal 'Processed'
        expect(act.timestamp).to.deep.equal new Date '2015-09-18T20:18:58Z'
