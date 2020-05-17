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
import fs from 'fs';
import { expect } from 'chai';
import moment from 'moment-timezone';
import { UspsClient } from '../src/usps';
import { STATUS_TYPES } from '../src/shipper';
import { Parser } from 'xml2js';
const should = require('chai').should();

describe('usps client', function () {
  let _uspsClient = null;
  const _xmlParser = new Parser();

  before(() => _uspsClient = new UspsClient({ userId: 'hello-neuman' }));

  describe('generateRequest', function () {
    let _xmlDoc = null;

    before(() => _xmlDoc = _uspsClient.generateRequest('9400111899560008231892', '10.10.5.2'));

    it('includes TrackFieldRequest in the track request document', done => _xmlParser.parseString(_xmlDoc, function (err, doc) {
      doc.should.have.property('TrackFieldRequest');
      return done();
    }));

    it('includes user ID in the track field request', done => _xmlParser.parseString(_xmlDoc, function (err, doc) {
      expect(doc.TrackFieldRequest.$.USERID).to.equal('hello-neuman');
      return done();
    }));

    it('includes revision 1 in the track field request', done => _xmlParser.parseString(_xmlDoc, function (err, doc) {
      expect(doc.TrackFieldRequest.Revision[0]).to.equal('1');
      return done();
    }));

    it('includes client IP in the track field request', done => _xmlParser.parseString(_xmlDoc, function (err, doc) {
      expect(doc.TrackFieldRequest.ClientIp[0]).to.equal('10.10.5.2');
      return done();
    }));

    it('includes source ID in the track field request', done => _xmlParser.parseString(_xmlDoc, function (err, doc) {
      expect(doc.TrackFieldRequest.SourceId[0]).to.equal('shipit');
      return done();
    }));

    return it('includes track ID in the track field request', done => _xmlParser.parseString(_xmlDoc, function (err, doc) {
      expect(doc.TrackFieldRequest.TrackID[0].$.ID).to.equal('9400111899560008231892');
      return done();
    }));
  });

  return describe('integration tests', function () {
    let _package = null;

    describe('pre-shipment package', function () {
      before(done => fs.readFile('test/stub_data/usps_pre_shipment.xml', 'utf8', (err, xmlDoc) => _uspsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of shipping', () => expect(_package.status).to.equal(STATUS_TYPES.SHIPPING));

      it('has a service of Package Service', () => expect(_package.service).to.equal('Package Services'));

      it('has a destination of Kihei, HW', () => expect(_package.destination).to.equal('Kihei, HI 96753'));

      return it('has only one activity', function () {
        expect(_package.activities).to.have.length(1);
        expect(_package.activities[0].timestamp.getTime()).to.equal(1393545600000);
        expect(_package.activities[0].location).to.equal('');
        return expect(_package.activities[0].details).to.equal('Electronic Shipping Info Received');
      });
    });

    describe('delivered package', function () {
      before(done => fs.readFile('test/stub_data/usps_delivered.xml', 'utf8', (err, xmlDoc) => _uspsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of shipping', () => expect(_package.status).to.equal(STATUS_TYPES.DELIVERED));

      it('has a service of first class package', () => expect(_package.service).to.equal('First-Class Package Service'));

      it('has a destination of Chicago', () => expect(_package.destination).to.equal('Chicago, IL 60654'));

      return it('has 9 activities', function () {
        expect(_package.activities).to.have.length(9);
        const act1 = _package.activities[0];
        const act9 = _package.activities[8];
        expect(act1.details).to.equal('Delivered');
        expect(act1.location).to.equal('Chicago, IL 60610');
        expect(act1.timestamp).to.deep.equal(moment('Feb 13, 2014 12:24 pm +0000').toDate());
        expect(act9.details).to.equal('Acceptance');
        expect(act9.location).to.equal('Pomona, CA 91768');
        return expect(act9.timestamp).to.deep.equal(moment('Feb 10, 2014 11:31 am +0000').toDate());
      });
    });

    describe('out-for-delivery package', function () {
      before(done => fs.readFile('test/stub_data/usps_out_for_delivery.xml', 'utf8', (err, xmlDoc) => _uspsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of shipping', () => expect(_package.status).to.equal(STATUS_TYPES.OUT_FOR_DELIVERY));

      it('has a service of first class package', () => expect(_package.service).to.equal('Package Services'));

      it('has a destination of Chicago', () => expect(_package.destination).to.equal('New York, NY 10010'));

      return it('has 5 activities', function () {
        expect(_package.activities).to.have.length(5);
        const act1 = _package.activities[0];
        const act5 = _package.activities[4];
        expect(act1.details).to.equal('Out for Delivery');
        expect(act1.location).to.equal('New York, NY 10022');
        expect(act1.timestamp).to.deep.equal(moment('Mar 02, 2014 08:09 am +0000').toDate());
        expect(act5.details).to.equal('Electronic Shipping Info Received');
        expect(act5.location).to.equal('');
        return expect(act5.timestamp).to.deep.equal(moment('Mar 1, 2014 00:00:00 +0000').toDate());
      });
    });

    return describe('out-for-delivery package with predicted delivery date', function () {
      before(done => fs.readFile('test/stub_data/usps_predicted_eta.xml', 'utf8', (err, xmlDoc) => _uspsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      return it('has an eta of September 25th', () => expect(_package.eta).to.deep.equal(moment('2015-09-25T23:59:59.000Z').toDate()));
    });
  });
});
