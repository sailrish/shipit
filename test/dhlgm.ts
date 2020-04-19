/* eslint-disable
    handle-callback-err,
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from 'fs'
import { expect } from 'chai'
import { DhlGmClient } from '../lib/dhlgm'
import { ShipperClient } from '../lib/shipper'
const should = require('chai').should()

describe('DHL Global Mail client', function () {
  let _dhlgmClient = null

  before(() => _dhlgmClient = new DhlGmClient())

  return describe('integration tests', function () {
    let _package = null

    describe('in transit package', function () {
      before(done => fs.readFile('test/stub_data/dhlgm_intransit.html', 'utf8', (err, docs) => _dhlgmClient.presentResponse(docs, 'trk', function (err, resp) {
        should.not.exist(err)
        _package = resp
        return done()
      })))

      function verifyActivity (act, ts, loc, details) {
        expect(act.timestamp).to.deep.equal(new Date(ts))
        expect(act.location).to.equal(loc)
        return expect(act.details).to.equal(details)
      }

      it('has a status of en-route', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE))

      it('has a service of Direct Priority', () => expect(_package.service).to.equal('GM Parcel Direct Priority'))

      it('has a weight of 0.25 lbs', () => expect(_package.weight).to.equal('0.25 lbs'))

      it('has destination of CAIRNS, QLD 4870 AUSTRALIA', () => expect(_package.destination).to.equal('CAIRNS, QLD 4870 AUSTRALIA'))

      return it('has 5 activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(5)
        verifyActivity(_package.activities[0], 'Mar 27 2014 10:00 am', 'Brisbane, AU', 'Cleared Customs')
        return verifyActivity(_package.activities[4], 'Mar 19 2014 11:07 pm', 'Des Plaines, IL, US', 'Arrival DHL Global Mail Facility')
      })
    })

    describe('delivered package', function () {
      before(done => fs.readFile('test/stub_data/dhlgm_delivered.html', 'utf8', (err, docs) => _dhlgmClient.presentResponse(docs, 'trk', function (err, resp) {
        should.not.exist(err)
        _package = resp
        return done()
      })))

      function verifyActivity (act, ts, loc, details) {
        expect(act.timestamp).to.deep.equal(new Date(ts))
        expect(act.location).to.equal(loc)
        return expect(act.details).to.equal(details)
      }

      it('has a status of delivered', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED))

      it('has a service of SM Parcels Expedited', () => expect(_package.service).to.equal('SM Parcels Expedited'))

      it('has a weight of 0.989 lbs', () => expect(_package.weight).to.equal('0.989 lbs'))

      it('has destination of Seaford, NY', () => expect(_package.destination).to.contain('Seaford, NY'))

      return it('has 11 activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(11)
        verifyActivity(_package.activities[0], '2015-09-18T15:48:00Z', 'Seaford, NY, US', 'Delivered')
        return verifyActivity(_package.activities[10], '2015-09-14T15:06:00Z', '', 'Electronic Notification Received')
      })
    })

    return describe('en-route package with eta', function () {
      before(done => fs.readFile('test/stub_data/dhlgm_eta.html', 'utf8', (err, docs) => _dhlgmClient.presentResponse(docs, 'trk', function (err, resp) {
        should.not.exist(err)
        _package = resp
        return done()
      })))

      it('has a status of en-route', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE))

      return it('has an eta of October 7th', () => expect(_package.eta).to.deep.equal(new Date('2015-10-07T23:59:59Z')))
    })
  })
})
