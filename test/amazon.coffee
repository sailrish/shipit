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

    describe "out-for-delivery package", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_out_for_del.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of out-for-delivery", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY

      it "has an eta of Oct 3rd at 8pm", ->
        expect(_package.eta).to.deep.equal new Date '2015-10-03T20:00:00Z'

      it "has a destination of San Jose, California", ->
        expect(_package.destination).to.equal 'San Jose, California'

      describe "has last activity", ->
        _activity = null

        before ->
          _activity = _package.activities[0]
          should.exist _activity

        it "with timestamp of Oct 2 2015 at 5:57 am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-02T05:57:00Z'

        it "with details showing delivered", ->
          expect(_activity.details).to.equal 'Out for delivery'

        it "with location Laurel, MD, US", ->
          expect(_activity.location).to.equal 'San Jose, US'

      describe "has another activity", ->
        _activity = null

        before ->
          _activity = _package.activities[1]
          should.exist _activity

        it "with timestamp of Oct 2 2015 at 3:05 am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-02T03:05:00Z'

        it "with details showing delivered", ->
          expect(_activity.details).to.equal 'Package arrived at a carrier facility'

        it "with location Laurel, MD, US", ->
          expect(_activity.location).to.equal 'San Jose, US'

      describe "has first activity", ->
        _activity = null

        before ->
          _activity = _package.activities[2]
          should.exist _activity

        it "with timestamp of Oct 2 2015", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-02T00:00:00Z'

        it "with details showing out-for-del", ->
          expect(_activity.details).to.equal 'Package has left seller facility and is in transit to carrier'

        it "with no location", ->
          expect(_activity.location).to.equal ''


    describe "package delivered 2 days ago", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_delivered_2days_ago.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      describe "has last activity", ->
        _activity = null

        before ->
          _activity = _package.activities[0]
          should.exist _activity

        it "with timestamp of Oct 1 2015 at 10:23 am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-01T10:23:00Z'

        it "with details showing delivered", ->
          expect(_activity.details).to.equal 'Your package was delivered. The delivery was signed by: ALEFLER'

        it "with location Hurricane, WV, US", ->
          expect(_activity.location).to.equal 'Hurricane, WV, US'

      describe "has second activity", ->
        _activity = null

        before ->
          _activity = _package.activities[1]
          should.exist _activity

        it "with timestamp of Sep 30 2015 at 4:16 am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-09-30T04:16:00Z'

        it "with details showing out-for-delivery", ->
          expect(_activity.details).to.equal 'Out for delivery'

        it "with location Charleston", ->
          expect(_activity.location).to.equal 'Charleston, WV, US'

      describe "has third activity", ->
        _activity = null

        before ->
          _activity = _package.activities[2]
          should.exist _activity

        it "with timestamp of Sep 30 2015 at 4:13 am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-09-30T04:13:00Z'

        it "with details showing package en-route", ->
          expect(_activity.details).to.equal 'Package arrived at a carrier facility'

        it "with location Charleston", ->
          expect(_activity.location).to.equal 'Charleston, WV, US'

      describe "has seventh activity", ->
        _activity = null

        before ->
          _activity = _package.activities[6]
          should.exist _activity

        it "with timestamp of Sep 29 2015 at 5:22 pm", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-09-29T17:22:00Z'

        it "with details showing package en-route", ->
          expect(_activity.details).to.equal 'Package arrived at a carrier facility'

        it "with location Chattanooga", ->
          expect(_activity.location).to.equal 'Chattanooga, TN, US'


      describe "has ninth activity", ->
        _activity = null

        before ->
          _activity = _package.activities[8]
          should.exist _activity

        it "with timestamp of Sep 29 2015 at 2:13 pm", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-09-29T14:13:00Z'

        it "with details showing package en-route", ->
          expect(_activity.details).to.equal 'Package has left seller facility and is in transit to carrier'

        it "with location US", ->
          expect(_activity.location).to.equal 'US'


    describe "package scheduled for delivery on Tuesday", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_last_update_today.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has an eta of Oct 6th", ->
        expect(_package.eta).to.deep.equal new Date '2015-10-06T23:00:00Z'

      it "has a destination of Hurricane, WV", ->
        expect(_package.destination).to.equal 'Hurricane, WV'

      describe "has one activity", ->
        _activity = null

        before ->
          _activity = _package.activities[0]
          should.exist _activity

        it "with timestamp of Oct 5 2015 at 7:47m", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-03T07:47:00Z'

        it "with location Grove City, OH, US", ->
          expect(_activity.location).to.equal 'Grove City, OH, US'

        it "with details showing enroute", ->
          expect(_activity.details).to.equal 'Package arrived at a carrier facility'


    describe "package scheduled for delivery in a date range", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_eta_date_range.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has an eta of Oct 16th", ->
        expect(_package.eta).to.deep.equal new Date '2015-10-16T23:00:00Z'

      it "has a destination of Hurricane, WV", ->
        expect(_package.destination).to.equal 'Sanford, FL'


    describe "package out-for-delivery but no clear 'last-status' string", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_out_for_del2.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of out-for-del", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY
