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
