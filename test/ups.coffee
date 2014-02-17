assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
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

