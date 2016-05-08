fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{A1Client} = require '../lib/a1'
{ShipperClient} = require '../lib/shipper'

describe "a1 client", ->
  _a1Client = null

  before ->
    _a1Client = new A1Client()

  describe "integration tests", ->

    describe "in transit package", ->
      _package = null

      before (done) ->
        fs.readFile 'test/stub_data/a1_shipping.xml', 'utf8', (err, xmlDoc) ->
          _a1Client.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a destination of Chicago, IL", ->
        expect(_package.destination).to.equal 'Chicago, IL 60607'

      it "has an eta of July 13th", ->
        expect(_package.eta).to.deep.equal new Date '2015-07-13T23:59:59.000Z'

      it "has 1 activity", ->
        expect(_package.activities).to.have.length 1

      it "has first activity with timestamp, location and details", ->
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal new Date '2015-07-10T15:10:00.000Z'
        expect(act.datetime).to.equal '2015-07-10T10:10:00'
        expect(act.details).to.equal 'Shipment has left seller facility and is in transit'
        expect(act.location).to.equal 'Whitestown, IN 46075'


    describe "delivered package", ->
      _package = null

      before (done) ->
        fs.readFile 'test/stub_data/a1_delivered.xml', 'utf8', (err, xmlDoc) ->
          _a1Client.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a destination of Chicago, IL", ->
        expect(_package.destination).to.equal 'Chicago, IL 60634'

      it "has an eta of October 7th", ->
        expect(_package.eta).to.deep.equal new Date '2013-10-07T23:59:59.000Z'

      it "has 5 activities", ->
        expect(_package.activities).to.have.length 5

      it "has first activity with timestamp, location and details", ->
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal new Date '2013-10-08T18:29:00.000Z'
        expect(act.datetime).to.equal '2013-10-08T13:29:00'
        expect(act.details).to.equal 'Delivered'
        expect(act.location).to.equal 'Chicago, IL 60634'


    describe "package error", ->
      _package = null
      _err = null

      before (done) ->
        fs.readFile 'test/stub_data/a1_error.xml', 'utf8', (err, xmlDoc) ->
          _a1Client.presentResponse xmlDoc, 'trk', (err, resp) ->
            _package = resp
            _err = err
            done()

      it "complains about an invalid tracking number", ->
        expect(_err).to.equal 'No data exists in the carrier\'s system for the given tracking number'
