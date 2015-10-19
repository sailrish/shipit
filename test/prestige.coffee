fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
moment = require 'moment-timezone'
{PrestigeClient} = require '../lib/prestige'
{ShipperClient} = require '../lib/shipper'

describe "prestige client", ->
  _presClient = null

  before ->
    _presClient = new PrestigeClient()

  describe "requestOptions", ->
    _options = null

    before ->
      _options = _presClient.requestOptions trackingNumber: 'PS80558274'

    it "creates a GET request", ->
      _options.method.should.equal 'GET'

    it "uses the correct URL", ->
      _options.uri.should.equal "http://www.prestigedelivery.com/TrackingHandler.ashx?trackingNumbers=PS80558274"


  describe "integration tests", ->
    _package = null

    describe "out for delivery package", ->
      before (done) ->
        fs.readFile 'test/stub_data/prestige_out_for_del.json', 'utf8', (err, doc) ->
          _presClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of out-for-delivery", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.OUT_FOR_DEL

      it "has a destination of Bloomfield Hills", ->
        expect(_package.destination).to.equal 'Bloomfield Hills, MI 483043264'

      describe "has one activity", ->
        before ->
          _activity = _package.activities[0]
          should.exist _activity

        it "with timestamp Oct 19th, 7:18am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-19T07:18:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Taylor, MI 48180'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Out for delivery'

      describe "has another activity", ->
        before ->
          _activity = _package.activities[1]
          should.exist _activity

        it "with timestamp Oct 19th, 7:18am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-19T06:31:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Taylor, MI 48180'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Shipment received by carrier'

      describe "has first activity", ->
        before ->
          _activity = _package.activities[2]
          should.exist _activity

        it "with timestamp Oct 19th, 7:18am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-18T15:55:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Jeffersonville, IN 47130'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Prestige has not yet received this shipment'
