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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from 'fs';
import { expect } from 'chai';
import { UpsMiClient } from '../src/upsmi';
import { STATUS_TYPES } from '../src/shipper';
const should = require('chai').should();

function verifyActivity(act, ts, loc, details) {
  expect(act.timestamp.getTime()).to.equal(ts);
  expect(act.location).to.equal(loc);
  return expect(act.details).to.equal(details);
};

describe('ups mi client', function () {
  let _upsMiClient = null;

  before(() => _upsMiClient = new UpsMiClient());

  describe('integration tests', function () {
    describe('delivered package', function () {
      let _package = null;
      before(async () => {
        const promise = new Promise((resolve, reject) => {
          fs.readFile('test/stub_data/upsmi_delivered.html', 'utf8', (err, docs) => _upsMiClient.presentResponse(docs, 'trk', function (err, resp) {
            should.not.exist(err);
            _package = resp;
            return resolve();
          }));
        });
        return promise;
      });

      it('has non-null package', () => expect(_package).to.not.be.null);

      it('has a status of delivered', () => expect(_package.status).to.equal(STATUS_TYPES.DELIVERED));

      it('has an eta of Mar 25 2014', () => expect(_package.eta.getTime()).to.equal(1395791999000));

      it('has a weight of 0.3050 lbs.', () => expect(_package.weight).to.equal('0.3050 lbs.'));

      it('has destination of 11218', () => expect(_package.destination).to.equal('11218'));

      return it('has 11 activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(11);
        verifyActivity(_package.activities[0], 1395770820000, 'Brooklyn, NY', 'Package delivered by local post office');
        return verifyActivity(_package.activities[10], 1395273600000, 'Kansas City, MO', 'Package received for processing');
      });
    });

    describe('about to ship package', function () {
      let _package = null;
      beforeEach(done => fs.readFile('test/stub_data/upsmi_shipping.html', 'utf8', (err, docs) => _upsMiClient.presentResponse(docs, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      function verifyActivity(act, ts, loc, details) {
        expect(act.timestamp.getTime()).to.equal(ts);
        expect(act.location).to.equal(loc);
        return expect(act.details).to.equal(details);
      }

      it('has a status of shipping', () => expect(_package.status).to.equal(STATUS_TYPES.SHIPPING));

      it('does not have an eta', function () {
        if (_package.eta != null) {
          return expect(_package.eta).to.deep.equal(new Date('Invalid Date'));
        }
      });

      it('does not have a weight', () => expect(_package.weight).to.be.undefined);

      it('does not have a destination', () => expect(_package.destination).to.be.undefined);

      return it('has 1 activity with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(1);
        return verifyActivity(_package.activities[0], 1395619200000, '', 'Shipment information received');
      });
    });
  });
});
