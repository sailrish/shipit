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
import * as fs from 'fs';
import { expect } from 'chai';
import { A1Client } from '../src/a1';
import { STATUS_TYPES } from '../src/shipper';
const should = require('chai').should();

describe('a1 client', function () {
  let _a1Client = null;

  before(() => _a1Client = new A1Client({}));

  return describe('integration tests', function () {
    describe('in transit package', function () {
      let _package = null;

      before(done => fs.readFile('test/stub_data/a1_shipping.xml', 'utf8', (err, xmlDoc) => _a1Client.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of en-route', () => expect(_package.status).to.equal(STATUS_TYPES.EN_ROUTE));

      it('has a destination of Chicago, IL', () => expect(_package.destination).to.equal('Chicago, IL 60607'));

      it('has an eta of July 13th', () => expect(_package.eta).to.deep.equal(new Date('2015-07-13T23:59:59.000Z')));

      it('has 1 activity', () => expect(_package.activities).to.have.length(1));

      return it('has first activity with timestamp, location and details', function () {
        const act = _package.activities[0];
        expect(act.timestamp).to.deep.equal(new Date('2015-07-10T15:10:00.000Z'));
        expect(act.datetime).to.equal('2015-07-10T10:10:00');
        expect(act.details).to.equal('Shipment has left seller facility and is in transit');
        return expect(act.location).to.equal('Whitestown, IN 46075');
      });
    });

    describe('delivered package', function () {
      let _package = null;

      before(done => fs.readFile('test/stub_data/a1_delivered.xml', 'utf8', (err, xmlDoc) => _a1Client.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of delivered', () => expect(_package.status).to.equal(STATUS_TYPES.DELIVERED));

      it('has a destination of Chicago, IL', () => expect(_package.destination).to.equal('Chicago, IL 60634'));

      it('has an eta of October 7th', () => expect(_package.eta).to.deep.equal(new Date('2013-10-07T23:59:59.000Z')));

      it('has 5 activities', () => expect(_package.activities).to.have.length(5));

      return it('has first activity with timestamp, location and details', function () {
        const act = _package.activities[0];
        expect(act.timestamp).to.deep.equal(new Date('2013-10-08T18:29:00.000Z'));
        expect(act.datetime).to.equal('2013-10-08T13:29:00');
        expect(act.details).to.equal('Delivered');
        return expect(act.location).to.equal('Chicago, IL 60634');
      });
    });

    return describe('package error', function () {
      let _package = null;
      let _err = null;

      before(done => fs.readFile('test/stub_data/a1_error.xml', 'utf8', (err, xmlDoc) => _a1Client.presentResponse(xmlDoc, 'trk', function (err, resp) {
        _package = resp;
        _err = err;
        return done();
      })));

      return it('complains about an invalid tracking number', () => expect(_err).to.equal('No data exists in the carrier\'s system for the given tracking number'));
    });
  });
});
