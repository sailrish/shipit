assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{UpsClient} = require '../lib/ups'
{Builder, Parser} = require 'xml2js'

describe "ups client", ->
  _upsClient = null
  _xmlParser = new Parser()
  _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

  before ->
    _upsClient = new UpsClient
      licenseNumber: '12345'
      userId: 'shipit'
      password: 'password'

  describe "generateRequest", ->
    _xmlDocs = null

    before ->
      trackXml = _upsClient.generateRequest('1Z5678', 'eloquent shipit')
      _xmlDocs = trackXml.split _xmlHeader

    it "generates a track request with two xml documents", ->
      expect(_xmlDocs).to.have.length(3)

    it "includes an AccessRequest in the track request", (done) ->
      _xmlParser.parseString _xmlDocs[1], (err, doc) ->
        doc.should.have.property('AccessRequest')
        done()

    it "includes a TrackRequest in the track request", (done) ->
      _xmlParser.parseString _xmlDocs[2], (err, doc) ->
        doc.should.have.property('TrackRequest')
        done()

    it "includes an AccessRequest with license number, user id and password", (done) ->
      _xmlParser.parseString _xmlDocs[1], (err, doc) ->
        accessReq = doc['AccessRequest']
        accessReq.should.have.property 'AccessLicenseNumber'
        accessReq.should.have.property 'UserId'
        accessReq.should.have.property 'Password'
        accessReq['AccessLicenseNumber'][0].should.equal '12345'
        accessReq['UserId'][0].should.equal 'shipit'
        accessReq['Password'][0].should.equal 'password'
        done()

    it "includes a TrackRequest with customer context", (done) ->
      _xmlParser.parseString _xmlDocs[2], (err, doc) ->
        trackReq = doc['TrackRequest']
        trackReq.should.have.property 'Request'
        trackReq['Request'][0]['TransactionReference'][0]['CustomerContext'][0].should.equal 'eloquent shipit'
        done()

    it "includes a TrackRequest with request action and option", (done) ->
      _xmlParser.parseString _xmlDocs[2], (err, doc) ->
        trackReq = doc['TrackRequest']
        trackReq.should.have.property 'Request'
        trackReq['Request'][0]['RequestAction'][0].should.equal 'track'
        trackReq['Request'][0]['RequestOption'][0].should.equal '3'
        done()

    it "includes a TrackRequest with the correct tracking number", (done) ->
      _xmlParser.parseString _xmlDocs[2], (err, doc) ->
        trackReq = doc['TrackRequest']
        trackReq['TrackingNumber'][0].should.equal '1Z5678'
        done()

  describe "requestOptions", ->
    _options = null
    _generateReqSpy = null

    before ->
      _generateReqSpy = bond(_upsClient, 'generateRequest').through()
      _options = _upsClient.requestOptions trk: '1ZMYTRACK123', reference: 'zappos'

    it "creates a POST request", ->
      _options.method.should.equal 'POST'

    it "uses the correct URL", ->
      _options.uri.should.equal 'https://www.ups.com/ups.app/xml/Track'

    it "calls generateRequest with the correct parameters", ->
      _generateReqSpy.calledWith('1ZMYTRACK123', 'zappos').should.equal true

  describe "validateResponse", ->
    it "returns an error if response is not an xml document", (done) ->
      errorReported = false
      _upsClient.validateResponse 'bad xml', (err, resp) ->
        err.should.exist
        done() unless errorReported
        errorReported = true

    it "returns an error if xml response contains no nodes", (done) ->
      errorReported = false
      emptyResponse = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      _upsClient.validateResponse emptyResponse, (err, resp) ->
        err.should.exist
        done() unless errorReported
        errorReported = true

    it "returns an error if xml response does not contain a response status", (done) ->
      errorReported = false
      _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      badResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode></Response></TrackResponse>'
      _upsClient.validateResponse _xmlHeader + badResponse, (err, resp) ->
        err.should.exist
        done() unless errorReported
        errorReported = true

    it "returns error description if xml response contains an unsuccessful status", (done) ->
      errorReported = false
      _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      failureResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode><ResponseStatusDescription>Exception</ResponseStatusDescription><Error><ErrorDescription>No data</ErrorDescription></Error></Response></TrackResponse>'
      _upsClient.validateResponse _xmlHeader + failureResponse, (err, resp) ->
        err.should.equal "No data"
        done() unless errorReported
        errorReported = true

    it "returns an error if xml response does not contain shipment data", (done) ->
      errorReported = false
      noShipmentResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode><ResponseStatusDescription>Success</ResponseStatusDescription></Response></TrackResponse>'
      _upsClient.validateResponse _xmlHeader + noShipmentResponse, (err, resp) ->
        err.should.exist
        done() unless errorReported
        errorReported = true

    it "returns shipment data retrieved from the xml response", (done) ->
      goodResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode><ResponseStatusDescription>Success</ResponseStatusDescription></Response><Shipment>Smuggled Goods</Shipment></TrackResponse>'
      _upsClient.validateResponse _xmlHeader + goodResponse, (err, resp) ->
        expect(err).to.be.a 'null'
        expect(resp).to.equal 'Smuggled Goods'
        done()

  describe "getEta", ->
    _presentTimestamp = null

    beforeEach ->
      _presentTimestamp = bond(_upsClient, 'presentTimestamp').return('at midnight')

    it "uses ScheduledDeliveryDate", ->
      shipment = 'ScheduledDeliveryDate': ['tomorrow']
      eta = _upsClient.getEta shipment
      _presentTimestamp.calledWith('tomorrow').should.equal true
      expect(eta).to.equal 'at midnight'

    it "uses RescheduledDeliveryDate if ScheduledDeliveryDate is't available", ->
      shipment = 'Package': ['RescheduledDeliveryDate': ['next week']]
      _upsClient.getEta shipment
      _presentTimestamp.calledWith('next week').should.equal true

    it "calls presentTimestamp with a null if shipment is malformed", ->
      shipment = 'RandomCrap': ['garbage']
      _upsClient.getEta shipment
      _presentTimestamp.calledWith().should.equal true

  describe "getService", ->
    it "returns service description converted to title case", ->
      shipment = 'Service': ['Description': ['priority overnight']]
      service = _upsClient.getService shipment
      expect(service).to.equal 'Priority Overnight'

    it "returns undefined if service is not present", ->
      shipment = 'NoService': 'none'
      service = _upsClient.getService shipment
      expect(service).to.be.a 'undefined'

    it "returns undefined if service description is not present", ->
      shipment = 'Service': ['NoDescription': ['abc']]
      service = _upsClient.getService shipment
      expect(service).to.be.a 'undefined'

