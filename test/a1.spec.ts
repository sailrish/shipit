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
import { A1Client } from '../src/a1';
import { STATUS_TYPES } from '../src/shipper';

describe('a1 client', () => {
  let _a1Client = null;

  beforeAll(() => _a1Client = new A1Client({}));

  describe('integration tests', () => {
    describe('in transit package', () => {
      let _package = null;

      beforeAll(
        done => fs.readFile('test/stub_data/a1_shipping.xml', 'utf8', (err, xmlDoc) => _a1Client.presentResponse(xmlDoc, 'trk', function (err, resp) {
          expect(err).toBeFalsy();
          _package = resp;
          return done();
        }))
      );

      it(
        'has a status of en-route',
        () => expect(_package.status).toBe(STATUS_TYPES.EN_ROUTE)
      );

      it(
        'has a destination of Chicago, IL',
        () => expect(_package.destination).toBe('Chicago, IL 60607')
      );

      it(
        'has an eta of July 13th',
        () => expect(_package.eta).toEqual(new Date('2015-07-13T23:59:59.000Z'))
      );

      it('has 1 activity', () => expect(_package.activities).toHaveLength(1));

      return it('has first activity with timestamp, location and details', () => {
        const act = _package.activities[0];
        expect(act.timestamp).toEqual(new Date('2015-07-10T15:10:00.000Z'));
        expect(act.datetime).toBe('2015-07-10T10:10:00');
        expect(act.details).toBe('Shipment has left seller facility and is in transit');
        return expect(act.location).toBe('Whitestown, IN 46075');
      });
    });

    describe('delivered package', () => {
      let _package = null;

      beforeAll(
        done => fs.readFile('test/stub_data/a1_delivered.xml', 'utf8', (err, xmlDoc) => _a1Client.presentResponse(xmlDoc, 'trk', function (err, resp) {
          expect(err).toBeFalsy();
          _package = resp;
          return done();
        }))
      );

      it(
        'has a status of delivered',
        () => expect(_package.status).toBe(STATUS_TYPES.DELIVERED)
      );

      it(
        'has a destination of Chicago, IL',
        () => expect(_package.destination).toBe('Chicago, IL 60634')
      );

      it(
        'has an eta of October 7th',
        () => expect(_package.eta).toEqual(new Date('2013-10-07T23:59:59.000Z'))
      );

      it('has 5 activities', () => expect(_package.activities).toHaveLength(5));

      it('has first activity with timestamp, location and details', () => {
        const act = _package.activities[0];
        expect(act.timestamp).toEqual(new Date('2013-10-08T18:29:00.000Z'));
        expect(act.datetime).toBe('2013-10-08T13:29:00');
        expect(act.details).toBe('Delivered');
        return expect(act.location).toBe('Chicago, IL 60634');
      });
    });

    describe('package error', () => {
      let _package = null;
      let _err = null;

      beforeAll(
        done => fs.readFile('test/stub_data/a1_error.xml', 'utf8', (err, xmlDoc) => _a1Client.presentResponse(xmlDoc, 'trk', function (err, resp) {
          _package = resp;
          _err = err;
          return done();
        }))
      );

      it(
        'complains about an invalid tracking number',
        () => expect(_err).toBe('No data exists in the carrier\'s system for the given tracking number')
      );
    });
  });
});
