fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
{PurolatorClient} = require '../lib/purolator'
{ShipperClient} = require '../lib/shipper'
{Builder, Parser} = require 'xml2js'

describe "purolator client", ->
  _purolatorClient = null
  _xmlParser = new Parser()

  before ->
    _purolatorClient = new PurolatorClient(
      {key: 'purolator-key', password: 'my-password'},
      {dev: 'true', token: 'user-token'}
    )

  describe "generateRequest", ->
    _trackRequest = null

    before (done) ->
      trackXml = _purolatorClient.generateRequest '330362235641'
      _xmlParser.parseString trackXml, (err, data) ->
        _trackRequest = data?['SOAP-ENV:Envelope']
        assert _trackRequest?
        done()

    it 'contains the correct xml namespace and soap envelope', ->
      _trackRequest.should.have.property '$'
      _trackRequest['$']['xmlns:ns0'].should.equal 'http://purolator.com/pws/datatypes/v1'
      _trackRequest['$']['xmlns:ns1'].should.equal 'http://schemas.xmlsoap.org/soap/envelope/'
      _trackRequest['$']['xmlns:xsi'].should.equal 'http://www.w3.org/2001/XMLSchema-instance'
      _trackRequest['$']['xmlns:tns'].should.equal 'http://purolator.com/pws/datatypes/v1'
      _trackRequest['$']['xmlns:SOAP-ENV'].should.equal 'http://schemas.xmlsoap.org/soap/envelope/'

    it 'contains a valid request context', ->
      _trackRequest.should.have.property 'SOAP-ENV:Header'
      _context = _trackRequest['SOAP-ENV:Header'][0]['tns:RequestContext'][0]
      _context.should.have.property 'tns:GroupID'
      _context.should.have.property 'tns:RequestReference'
      _context.should.have.property 'tns:UserToken'
      _context['tns:Version'][0].should.equal '1.2'
      _context['tns:Language'][0].should.equal 'en'

    it 'contains a valid tracking pin', ->
      _trackRequest.should.have.property 'ns1:Body'
      _pins = _trackRequest['ns1:Body'][0]['ns0:TrackPackagesByPinRequest'][0]['ns0:PINs'][0]
      _pins['ns0:PIN'][0]['ns0:Value'][0].should.equal '330362235641'

  describe "integration tests", ->
    _package = null

    describe "delivered package", ->
      before (done) ->
        fs.readFile 'test/stub_data/purolator_delivered.xml', 'utf8', (err, xmlDoc) ->
          _purolatorClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has 11 activities", ->
        expect(_package.activities).to.have.length 11

      it "has first activity with timestamp, location and details", ->
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal new Date '2015-10-01T16:43:00.000Z'
        expect(act.details).to.equal 'Shipment delivered to'
        expect(act.location).to.equal 'Burnaby, BC'

      it "has last activity with timestamp, location and details", ->
        act = _package.activities[10]
        expect(act.timestamp).to.deep.equal new Date '2015-10-01T16:42:00.000Z'
        expect(act.details).to.equal 'Shipment created'
        expect(act.location).to.equal null

