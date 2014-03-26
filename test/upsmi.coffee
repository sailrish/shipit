fs = require 'fs'
async = require 'async'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{UpsMiClient} = require '../lib/upsmi'
{ShipperClient} = require '../lib/shipper'

describe "ups mi client", ->
  _upsMiClient = null

  before ->
    _upsMiClient = new UpsMiClient()

  describe "integration tests", ->
    _package = null

    describe "delivered package", ->

      before (done) ->
        fs.readFile 'test/stub_data/upsmi_delivered.html', 'utf8', (err, docs) ->
          _upsMiClient.presentResponse docs, (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      verifyActivity = (act, ts, loc, details) ->
        expect(act.timestamp).to.deep.equal new Date ts
        expect(act.location).to.equal loc
        expect(act.details).to.equal details

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has an eta of Mar 25 2014", ->
        expect(_package.eta).to.deep.equal new Date '3/25/2014'

      it "has a weight of 0.3050 lbs.", ->
        expect(_package.weight).to.equal "0.3050 lbs."

      it "has destination of 11218", ->
        expect(_package.destination).to.equal "11218"

      it "has 11 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 11
        verifyActivity(_package.activities[0], 'Mar 25 2014 6:07 pm', 'Brooklyn, NY', 'Package delivered by local post office')
        verifyActivity(_package.activities[10], 'Mar 20 2014', 'Kansas City, MO', 'Package received for processing')
