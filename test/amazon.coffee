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

    describe "detects eta", ->

      it "for delivery tomorrow", (done) ->
        fs.readFile 'test/stub_data/amazon_intransit.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, pkg) ->
            expect(pkg.eta).to.deep.equal(moment()
              .hour(20).minute(0).second(0).milliseconds(0).add(1, 'day').toDate())
            done()

      it "for delivery today", (done) ->
        fs.readFile 'test/stub_data/amazon_today.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, pkg) ->
            expect(pkg.eta).to.deep.equal(moment()
              .hour(20).minute(0).second(0).milliseconds(0).toDate())
            done()

      it "for delivery in a date range", (done) ->
        fs.readFile 'test/stub_data/amazon_date_range.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, pkg) ->
            expect(pkg.eta).to.deep.equal(moment('2018-10-30')
              .hour(20).minute(0).second(0).milliseconds(0).toDate())
            done()

      it "for delayed delivery in a date range", (done) ->
        fs.readFile 'test/stub_data/amazon_delayed.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, pkg) ->
            expect(pkg.eta).to.deep.equal(moment('2018-10-24')
              .hour(20).minute(0).second(0).milliseconds(0).toDate())
            done()

      it "for delivery in a day-of-week range", (done) ->
        fs.readFile 'test/stub_data/amazon_wednesday.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, pkg) ->
            expect(pkg.eta).to.deep.equal(moment().day(3)
              .hour(20).minute(0).second(0).milliseconds(0).toDate())
            done()

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
