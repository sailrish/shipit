fs = require 'fs'
async = require 'async'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
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
        async.parallel [
          (cb) -> fs.readFile 'test/stub_data/ontrac_intransit_summary.html', 'utf8', cb
          (cb) -> fs.readFile 'test/stub_data/ontrac_intransit_details.html', 'utf8', cb
        ],
          (err, docs) ->
            _onTracClient.presentResponse docs, 'trk', (err, resp) ->
              should.not.exist(err)
              _package = resp
              done()

      verifyActivity = (act, ts, loc, details) ->
        expect(act.timestamp).to.deep.equal new Date ts
        expect(act.location).to.equal loc
        expect(act.details).to.equal details

      it "has a status of en route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a destination of Fountain Valley, CA", ->
        expect(_package.destination).to.equal 'Fountain Valley, CA'

      it "has an eta of March 17th, 2014", ->
        expect(_package.eta).to.deep.equal new Date '3/17/2014'

      it "has a service of Caltrac", ->
        expect(_package.service).to.equal "Caltrac"

      it "has a weight of 2 lbs.", ->
        expect(_package.weight).to.equal "2 lbs."

      it "has 15 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 2
        verifyActivity(_package.activities[0], 'Mar 15 2014 4:30 am', 'Orange, CA', 'Package received at facility')
        verifyActivity(_package.activities[1], 'Mar 14 2014 5:30 pm', 'Stockton, CA', 'Data entry')
