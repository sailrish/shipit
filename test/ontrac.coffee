fs = require 'fs'
async = require 'async'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
moment = require 'moment-timezone'
{OnTracClient} = require '../lib/ontrac'
{ShipperClient} = require '../lib/shipper'

describe "on trac client", ->
  _onTracClient = null

  before ->
    _onTracClient = new OnTracClient()

  describe "integration tests", ->
    _package = null

    describe "in transit package", ->

      before (done) ->
        fs.readFile 'test/stub_data/ontrac_intransit_details.html', 'utf8', (e, r) ->
          _onTracClient.presentResponse r, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      verifyActivity = (act, ts, loc, details) ->
        expect(act.timestamp).to.deep.equal new Date ts
        expect(act.location).to.equal loc
        expect(act.details).to.equal details

      it "has a status of en route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a destination of Palo Alto, CA", ->
        expect(_package.destination).to.equal 'Palo Alto, CA'

      it "has an eta of Oct 7th, 2015", ->
        expect(_package.eta).to.deep.equal new Date '2015-10-07T23:59:59Z'

      it "has a service of Caltrac", ->
        expect(_package.service).to.equal "Ground"

      it "has a weight of 2 lbs.", ->
        expect(_package.weight).to.equal "2 lbs."

      it "has 2 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 2
        verifyActivity(_package.activities[1], new Date('2015-10-04T20:00:00.000Z'), 'SaltLake, UT', 'Data entry')
        verifyActivity(_package.activities[0], new Date('2015-10-05T17:27:00.000Z'), 'SaltLake, UT', 'Package received at facility')
