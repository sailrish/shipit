fs = require 'fs'
async = require 'async'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{DhlGmClient} = require '../lib/dhlgm'
{ShipperClient} = require '../lib/shipper'

describe "DHL Global Mail client", ->
  _dhlgmClient = null

  before ->
    _dhlgmClient = new DhlGmClient()

  describe "integration tests", ->
    _package = null

    describe "in transit package", ->

      before (done) ->
        fs.readFile 'test/stub_data/dhlgm_intransit.html', 'utf8', (err, docs) ->
          _dhlgmClient.presentResponse docs, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      verifyActivity = (act, ts, loc, details) ->
        expect(act.timestamp).to.deep.equal new Date ts
        expect(act.location).to.equal loc
        expect(act.details).to.equal details

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has a service of Direct Priority", ->
        expect(_package.service).to.equal 'GM Parcel Direct Priority'

      it "has a weight of 0.25 lbs", ->
        expect(_package.weight).to.equal "0.25 lbs"

      it "has destination of CAIRNS, QLD 4870 AUSTRALIA", ->
        expect(_package.destination).to.equal "CAIRNS, QLD 4870 AUSTRALIA"

      it "has 5 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 5
        verifyActivity(_package.activities[0], 'Mar 27 2014 10:00 am', 'Brisbane, AU', 'Cleared Customs')
        verifyActivity(_package.activities[4], 'Mar 19 2014 11:07 pm', 'Des Plaines, IL, US', 'Arrival DHL Global Mail Facility')


    describe "delivered package", ->

      before (done) ->
        fs.readFile 'test/stub_data/dhlgm_delivered.html', 'utf8', (err, docs) ->
          _dhlgmClient.presentResponse docs, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      verifyActivity = (act, ts, loc, details) ->
        expect(act.timestamp).to.deep.equal new Date ts
        expect(act.location).to.equal loc
        expect(act.details).to.equal details

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has a service of SM Parcels Expedited", ->
        expect(_package.service).to.equal 'SM Parcels Expedited'

      it "has a weight of 0.989 lbs", ->
        expect(_package.weight).to.equal "0.989 lbs"

      it "has destination of Seaford, NY", ->
        expect(_package.destination).to.contain "Seaford, NY"

      it "has 11 activities with timestamp, location and details", ->
        expect(_package.activities).to.have.length 11
        verifyActivity(_package.activities[0], '2015-09-18T15:48:00Z', 'Seaford, NY, US', 'Delivered')
        verifyActivity(_package.activities[10], '2015-09-14T15:06:00Z', '', 'Electronic Notification Received')


    describe "en-route package with eta", ->

      before (done) ->
        fs.readFile 'test/stub_data/dhlgm_eta.html', 'utf8', (err, docs) ->
          _dhlgmClient.presentResponse docs, 'trk', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en-route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has an eta of October 7th", ->
        expect(_package.eta).to.deep.equal new Date '2015-10-07T23:59:59Z'
