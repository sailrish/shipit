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

    describe "delivered package 2 days ago", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_delivered_2days_ago.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      describe "has the last activity", ->
        _activity = null

        before ->
          _activity = _package.activities[0]
          should.exist _activity

        it "with timestamp of 9/30/2015 at 1:09pm", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-09-30T13:09:00Z'

        it "with details showing delivered", ->
          expect(_activity.details).to_equal 'Your package was delivered'

        it "with location Laurel, MD, US", ->
          expect(_activity.location).to.equal 'Laurel, MD, US'
