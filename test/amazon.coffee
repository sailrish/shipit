fs = require 'fs'
async = require 'async'
assert = require 'assert'
moment = require 'moment-timezone'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{AmazonClient} = require '../lib/amazon'
{ShipperClient} = require '../lib/shipper'

describe "amazon client", ->
  _amazonClient = null

  before ->
    _amazonClient = new AmazonClient()

  describe "integration tests", ->
    _package = null

    describe "in transit", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_intransit.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      describe "has an activity", ->
        _activity = null

        before ->
          _activity = _package.activities[0]

        it "with a timestamp", ->
          expect(_activity.timestamp).to.deep.equal new Date '2018-10-16T07:13:00Z'

        it "with details", ->
          expect(_activity.details).to.equal 'Shipment arrived at Amazon facility'

        it "with location", ->
          expect(_activity.location).to.equal 'Avenel, NJ US'

      describe "has another activity", ->
        _activity = null

        before ->
          _activity = _package.activities[1]

        it "with a timestamp", ->
          expect(_activity.timestamp).to.deep.equal new Date '2018-10-15T00:00:00Z'

        it "with details", ->
          expect(_activity.details).to.equal 'Package has left seller facility and is in transit to carrier'

        it "with no location", ->
          expect(_activity.location).to.equal ''
