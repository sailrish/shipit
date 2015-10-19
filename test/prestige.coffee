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
    _activity = null

    describe "out for delivery package", ->
      before (done) ->
        fs.readFile 'test/stub_data/prestige_delivered.json', 'utf8', (err, doc) ->
          _presClient.presentResponse doc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has an eta of Oct 20", ->
        expect(_package.eta).to.deep.equal new Date '2015-10-20T23:59:59.000Z'

      it "has a destination of Bloomfield Hills", ->
        expect(_package.destination).to.equal 'Bloomfield Hills, MI 48304-3264'

      describe "has one activity", ->
        before ->
          _activity = _package.activities[0]
          should.exist _activity

        it "with timestamp Oct 19th, 2:39pm", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-19T14:39:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Taylor, MI 48180'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Delivered'

      describe "has next activity", ->
        before ->
          _activity = _package.activities[1]
          should.exist _activity

        it "with timestamp Oct 19th, 12:53pm", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-19T12:53:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Taylor, MI 48180'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Out for delivery'

      describe "has another activity", ->
        before ->
          _activity = _package.activities[2]
          should.exist _activity

        it "with timestamp Oct 19th, 6:31am", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-19T06:31:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Taylor, MI 48180'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Shipment received by carrier'

      describe "has first activity", ->
        before ->
          _activity = _package.activities[3]
          should.exist _activity

        it "with timestamp Oct 18th, 3:55pm", ->
          expect(_activity.timestamp).to.deep.equal new Date '2015-10-18T15:55:00Z'

        it "with location Taylor, MI", ->
          expect(_activity.location).to.equal 'Jeffersonville, IN 47130'

        it "with details Out-for-delivery", ->
          expect(_activity.details).to.equal 'Prestige has not yet received this shipment'
