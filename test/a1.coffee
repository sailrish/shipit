fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{A1Client} = require '../lib/a1'
{ShipperClient} = require '../lib/shipper'
{Parser} = require 'xml2js'

describe "a1 client", ->
  _a1Client = null
  _xmlParser = new Parser()

  before ->
    _a1Client = new A1Client()

  describe "integration tests", ->
    _package = null

    describe "in transit package", ->

      before (done) ->
        fs.readFile 'test/stub_data/a1_shipping.xml', 'utf8', (err, xmlDoc) ->
          _a1Client.presentResponse xmlDoc, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            console.log "[A1 INTL RESP] #{JSON.stringify resp}"
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a destination of Chicago, IL", ->
        expect(_package.destination).to.equal 'Chicago, IL, 60607'

      it "has 1 activity", ->
        expect(_package.activities).to.have.length 1

      it "has first activity with timestamp, location and details", ->
        act = _package.activities[0]
        expect(act.timestamp).to.deep.equal new Date 'Jul 10 2015 10:10:00'
        expect(act.details).to.equal 'Shipment has left seller facility and is in transit'
        expect(act.location).to.equal 'Whitestown, IN 46075'
