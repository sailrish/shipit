fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{FedexClient} = require '../lib/fedex'
{ShipperClient} = require '../lib/shipper'
{Builder, Parser} = require 'xml2js'

describe "fedex client", ->
  _fedexClient = null
  _xmlParser = new Parser()
  _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

  before ->
    _fedexClient = new FedexClient
      key: 'fedex-api-key'
      password: 'password'
      account: 'fedex-user'
      meter: 'what-can-brown-do-for-you'

  describe "generateRequest", ->
    _trackRequest = null

    before (done) ->
      trackXml = _fedexClient.generateRequest('1Z5678', 'eloquent shipit')
      _xmlParser.parseString trackXml, (err, data) ->
        _trackRequest = data?['ns:TrackRequest']
        assert _trackRequest?
        done()

    it "contains the correct xml namespace and scheme location", ->
      _trackRequest.should.have.property '$'
      _trackRequest['$']['xmlns:ns'].should.equal 'http://fedex.com/ws/track/v5'
      _trackRequest['$']['xmlns:xsi'].should.equal 'http://www.w3.org/2001/XMLSchema-instance'
      _trackRequest['$']['xsi:schemaLocation'].should.equal 'http://fedex.com/ws/track/v4 TrackService_v4.xsd'

    it "contains correct api key and password", ->
      _trackRequest.should.have.property 'ns:WebAuthenticationDetail'
      credentials = _trackRequest['ns:WebAuthenticationDetail']?[0]?['ns:UserCredential']?[0]
      credentials['ns:Key']?[0].should.equal 'fedex-api-key'
      credentials['ns:Password']?[0].should.equal 'password'

    it "contains correct client detail", ->
      _trackRequest.should.have.property 'ns:ClientDetail'
      clientDetail = _trackRequest['ns:ClientDetail']?[0]
      clientDetail['ns:AccountNumber']?[0].should.equal 'fedex-user'
      clientDetail['ns:MeterNumber']?[0].should.equal 'what-can-brown-do-for-you'

    it "contains customer reference number", ->
      _trackRequest.should.have.property 'ns:TransactionDetail'
      _trackRequest['ns:TransactionDetail']?[0]?['ns:CustomerTransactionId'][0].should.equal 'eloquent shipit'

    it "contains tracking version information", ->
      _trackRequest.should.have.property 'ns:Version'
      version = _trackRequest['ns:Version']?[0]
      version['ns:ServiceId']?[0].should.equal 'trck'
      version['ns:Major']?[0].should.equal '5'
      version['ns:Intermediate']?[0].should.equal '0'
      version['ns:Minor']?[0].should.equal '0'

    it "contains tracking number", ->
      _trackRequest.should.have.property 'ns:PackageIdentifier'
      _trackRequest['ns:PackageIdentifier']?[0]['ns:Value'][0].should.equal '1Z5678'
      _trackRequest['ns:PackageIdentifier']?[0]['ns:Type'][0].should.equal 'TRACKING_NUMBER_OR_DOORTAG'

    it "contains appropriate flags", ->
      _trackRequest.should.have.property 'ns:IncludeDetailedScans'
      _trackRequest['ns:IncludeDetailedScans'][0].should.equal 'true'

  describe "requestOptions", ->
    _options = null
    _generateReq = null
    _generateReqSpy = null

    before ->
      _generateReqSpy = bond(_fedexClient, 'generateRequest')
      _generateReq = _generateReqSpy.through()
      _options = _fedexClient.requestOptions trackingNumber: '1ZMYTRACK123', reference: 'zappos'

    after ->
      _generateReqSpy.restore()

    it "creates a POST request", ->
      _options.method.should.equal 'POST'

    it "uses the correct URL", ->
      _options.uri.should.equal 'https://ws.fedex.com/xml'

    it "calls generateRequest with the correct parameters", ->
      _generateReq.calledWith('1ZMYTRACK123', 'zappos').should.equal true

  describe "validateResponse", ->
    it "returns an error if response is not an xml document", (done) ->
      errorReported = false
      _fedexClient.validateResponse 'bad xml', (err, resp) ->
        expect(err).should.exist
        done() unless errorReported
        errorReported = true

    it "returns an error if there's no track reply", (done) ->
      badResponse = '<RandomXml>Random</RandomXml>'
      _fedexClient.validateResponse _xmlHeader + badResponse, (err, resp) ->
        err.should.exist
        done()

    it "returns an error if track reply doesn't contain notifications", (done) ->
      badResponse = '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity></TrackReply>'
      _fedexClient.validateResponse _xmlHeader + badResponse, (err, resp) ->
        err.should.exist
        done()

    it "returns an error when there are no success notifications", (done) ->
      badResponse = '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity><Notifications><Severity>SUCCESS</Severity><Source>trck</Source><Code>1</Code><Message>Request was successfully processed.</Message><LocalizedMessage>Request was successfully processed.</LocalizedMessage></Notifications></TrackReply>'
      _fedexClient.validateResponse _xmlHeader + badResponse, (err, resp) ->
        err.should.exist
        done()

    it "returns track details when notifications indicate success", (done) ->
      badResponse = '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity><Notifications><Severity>SUCCESS</Severity><Source>trck</Source><Code>0</Code><Message>Request was successfully processed.</Message><LocalizedMessage>Request was successfully processed.</LocalizedMessage></Notifications><TrackDetails>details</TrackDetails></TrackReply>'
      _fedexClient.validateResponse _xmlHeader + badResponse, (err, resp) ->
        expect(err).to.be.a 'null'
        expect(resp).to.equal 'details'
        done()

  describe "integration tests", ->
    _package = null

    describe "delivered package", ->
      before (done) ->
        fs.readFile 'test/stub_data/fedex_delivered.xml', 'utf8', (err, xmlDoc) ->
          _fedexClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a service type of fedex priority overnight", ->
        expect(_package.service).to.equal 'FedEx Priority Overnight'

      it "has a weight of 0.2 LB", ->
        expect(_package.weight).to.equal '0.2 LB'

      it "has a destination of MD", ->
        expect(_package.destination).to.equal 'MD'

      it "has 7 activities", ->
        expect(_package.activities).to.have.length 7

      it "has first activity with timestamp, location and details", ->
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal new Date '2014-02-17T09:05:00.000Z'
        expect(act.details).to.equal 'Delivered'
        expect(act.location).to.equal 'MD 21133'

      it "has last activity with timestamp, location and details", ->
        act = _package.activities[6]
        expect(act.timestamp).to.deep.equal new Date '2014-02-15T10:57:00.000Z'
        expect(act.details).to.equal 'Picked up'
        expect(act.location).to.equal 'East Hanover, NJ 07936'


    describe "in transit package with an activity with missing location", ->
      before (done) ->
        fs.readFile 'test/stub_data/fedex_missing_location.xml', 'utf8', (err, xmlDoc) ->
          _fedexClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of in-transit", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a service type of FedEx SmartPost", ->
        expect(_package.service).to.equal 'FedEx SmartPost'

      it "has a weight of 1.2 LB", ->
        expect(_package.weight).to.equal '1.2 LB'

      it "has a destination of Greenacres, WA", ->
        expect(_package.destination).to.equal 'Greenacres, WA'

      it "has 3 activities", ->
        expect(_package.activities).to.have.length 3

      it "has first activity with location Troutdale, OR 97060", ->
        expect(_package.activities[0].location).to.equal 'Troutdale, OR 97060'

      it "has second activity with no location", ->
        should.not.exist(_package.activities[1].location)

