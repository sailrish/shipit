fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
moment = require 'moment-timezone'
{UspsClient} = require '../lib/usps'
{ShipperClient} = require '../lib/shipper'
{Builder, Parser} = require 'xml2js'

describe "usps client", ->
  _uspsClient = null
  _xmlParser = new Parser()

  before ->
    _uspsClient = new UspsClient userId: 'hello-neuman'

  describe "generateRequest", ->
    _xmlDoc = null

    before ->
      _xmlDoc = _uspsClient.generateRequest('9400111899560008231892', '10.10.5.2')

    it "includes TrackFieldRequest in the track request document", (done) ->
      _xmlParser.parseString _xmlDoc, (err, doc) ->
        doc.should.have.property 'TrackFieldRequest'
        done()

    it "includes user ID in the track field request", (done) ->
      _xmlParser.parseString _xmlDoc, (err, doc) ->
        expect(doc['TrackFieldRequest']['$']['USERID']).to.equal 'hello-neuman'
        done()

    it "includes revision 1 in the track field request", (done) ->
      _xmlParser.parseString _xmlDoc, (err, doc) ->
        expect(doc['TrackFieldRequest']['Revision'][0]).to.equal '1'
        done()

    it "includes client IP in the track field request", (done) ->
      _xmlParser.parseString _xmlDoc, (err, doc) ->
        expect(doc['TrackFieldRequest']['ClientIp'][0]).to.equal '10.10.5.2'
        done()

    it "includes source ID in the track field request", (done) ->
      _xmlParser.parseString _xmlDoc, (err, doc) ->
        expect(doc['TrackFieldRequest']['SourceId'][0]).to.equal 'shipit'
        done()

    it "includes track ID in the track field request", (done) ->
      _xmlParser.parseString _xmlDoc, (err, doc) ->
        expect(doc['TrackFieldRequest']['TrackID'][0]['$']['ID']).to.equal '9400111899560008231892'
        done()

  describe "integration tests", ->
    _package = null

    describe "pre-shipment package", ->
      before (done) ->
        fs.readFile 'test/stub_data/usps_pre_shipment.xml', 'utf8', (err, xmlDoc) ->
          _uspsClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of shipping", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.SHIPPING

      it "has a service of Package Service", ->
        expect(_package.service).to.equal 'Package Services'

      it "has a destination of Kihei, HW", ->
        expect(_package.destination).to.equal "Kihei, HI 96753"

      it "has only one activity", ->
        expect(_package.activities).to.have.length 1
        expect(_package.activities[0].timestamp.getTime()).to.equal 1393545600000
        expect(_package.activities[0].location).to.equal ''
        expect(_package.activities[0].details).to.equal 'Electronic Shipping Info Received'

    describe "delivered package", ->
      before (done) ->
        fs.readFile 'test/stub_data/usps_delivered.xml', 'utf8', (err, xmlDoc) ->
          _uspsClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of shipping", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a service of first class package", ->
        expect(_package.service).to.equal 'First-Class Package Service'

      it "has a destination of Chicago", ->
        expect(_package.destination).to.equal "Chicago, IL 60654"

      it "has 9 activities", ->
        expect(_package.activities).to.have.length 9
        act1 = _package.activities[0]
        act9 = _package.activities[8]
        expect(act1.details).to.equal 'Delivered'
        expect(act1.location).to.equal 'Chicago, IL 60610'
        expect(act1.timestamp).to.deep.equal moment('Feb 13, 2014 12:24 pm +0000').toDate()
        expect(act9.details).to.equal 'Acceptance'
        expect(act9.location).to.equal 'Pomona, CA 91768'
        expect(act9.timestamp).to.deep.equal moment('Feb 10, 2014 11:31 am +0000').toDate()

    describe "out-for-delivery package", ->
      before (done) ->
        fs.readFile 'test/stub_data/usps_out_for_delivery.xml', 'utf8', (err, xmlDoc) ->
          _uspsClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of shipping", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY

      it "has a service of first class package", ->
        expect(_package.service).to.equal 'Package Services'

      it "has a destination of Chicago", ->
        expect(_package.destination).to.equal "New York, NY 10010"

      it "has 5 activities", ->
        expect(_package.activities).to.have.length 5
        act1 = _package.activities[0]
        act5 = _package.activities[4]
        expect(act1.details).to.equal 'Out for Delivery'
        expect(act1.location).to.equal 'New York, NY 10022'
        expect(act1.timestamp).to.deep.equal moment('Mar 02, 2014 08:09 am +0000').toDate()
        expect(act5.details).to.equal 'Electronic Shipping Info Received'
        expect(act5.location).to.equal ''
        expect(act5.timestamp).to.deep.equal moment('Mar 1, 2014 00:00:00 +0000').toDate()

    describe "out-for-delivery package with predicted delivery date", ->
      before (done) ->
        fs.readFile 'test/stub_data/usps_predicted_eta.xml', 'utf8', (err, xmlDoc) ->
          _uspsClient.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has an eta of September 25th", ->
        expect(_package.eta).to.deep.equal new Date '2015-09-25T23:59:59'
