fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
moment = require 'moment-timezone'
{LasershipClient} = require '../lib/lasership'
{ShipperClient} = require '../lib/shipper'

describe "lasership client", ->
  _lsClient = null

  before ->
    _lsClient = new LasershipClient()

  describe "requestOptions", ->
    _options = null

    before ->
      _options = _lsClient.requestOptions trackingNumber: 'LA40305346'

    it "creates a GET request", ->
      _options.method.should.equal 'GET'

    it "uses the correct URL", ->
      _options.uri.should.equal "http://www.lasership.com/track/LA40305346/json"

  describe "validateResponse", ->

  describe "integration tests", ->
    _package = null

    describe "delivered package", ->
      before (done) ->
        fs.readFile 'test/stub_data/lasership_delivered.json', 'utf8', (err, doc) ->
          _lsClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a destination of NYC", ->
        expect(_package.destination).to.equal "New York, NY 10001"

      it "has a weight of 2.282 lbs", ->
        expect(_package.weight).to.equal "2.282 LBS"

      it "has four activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 4
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal new Date '2014-03-04T10:45:34Z'
        expect(act.location).to.equal 'New York, NY 10001-2828'
        expect(act.details).to.equal 'Delivered'
        act = _package.activities[3]
        expect(act.timestamp).to.deep.equal new Date '2014-03-03T22:36:12Z'
        expect(act.location).to.equal 'US'
        expect(act.details).to.equal 'Ship Request Received'

    describe "released package", ->
      before (done) ->
        fs.readFile 'test/stub_data/lasership_released.json', 'utf8', (err, doc) ->
          _lsClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a destination of NYC", ->
        expect(_package.destination).to.equal "Pinellas Park, FL 33782"

      it "has a weight of 2.282 lbs", ->
        expect(_package.weight).to.equal "1.31 LBS"


    describe "en-route package", ->
      before (done) ->
        fs.readFile 'test/stub_data/lasership_enroute.json', 'utf8', (err, doc) ->
          _lsClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a destination of Jacksonville", ->
        expect(_package.destination).to.equal "Jacksonville, FL 32216-4702"

      it "has a weight of 5.25 lbs", ->
        expect(_package.weight).to.equal "5.25 lbs"

      it "has an eta of Sep 23rd, 2015", ->
        expect(_package.eta).to.deep.equal moment('2015-09-23T23:59:59Z').toDate()

      it "has two activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 2
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal moment('2015-09-20T14:42:14Z').toDate()
        expect(act.location).to.equal 'Groveport, OH 43125'
        expect(act.details).to.equal 'Origin Scan'
        act = _package.activities[1]
        expect(act.timestamp).to.deep.equal moment('2015-09-20T00:07:51Z').toDate()
        expect(act.location).to.equal 'US'
        expect(act.details).to.equal 'Ship Request Received'

