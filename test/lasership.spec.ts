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
import moment from 'moment-timezone';
import { LasershipClient } from '../src/lasership';
import { STATUS_TYPES } from '../src/shipper';

describe('lasership client', () => {
  let _lsClient = null;

  beforeAll(() => _lsClient = new LasershipClient({}));

  describe('requestOptions', () => {
    let _options = null;

    beforeAll(
      () => _options = _lsClient.requestOptions({ trackingNumber: 'LA40305346' })
    );

    it('creates a GET request', () => expect(_options.method).toBe('GET'));

    it(
      'uses the correct URL',
      () => expect(_options.uri).toBe('http://www.lasership.com/track/LA40305346/json')
    );
  });

  describe('validateResponse', () => {});

  describe('integration tests', () => {
    let _package = null;

    describe('delivered package', () => {
      beforeAll(
        done => fs.readFile('test/stub_data/lasership_delivered.json', 'utf8', (err, doc) => _lsClient.presentResponse(doc, 'trk', function (err, resp) {
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
        'has a destination of NYC',
        () => expect(_package.destination).toBe('New York, NY 10001')
      );

      it(
        'has a weight of 2.282 lbs',
        () => expect(_package.weight).toBe('2.282 LBS')
      );

      it('has four activities with timestamp, location and details', () => {
        expect(_package.activities).toHaveLength(4);
        let act = _package.activities[0];
        expect(act.timestamp).toEqual(new Date('2014-03-04T10:45:34Z'));
        expect(act.location).toBe('New York, NY 10001-2828');
        expect(act.details).toBe('Delivered');
        act = _package.activities[3];
        expect(act.timestamp).toEqual(new Date('2014-03-03T22:36:12Z'));
        expect(act.location).toBe('US');
        expect(act.details).toBe('Ship Request Received');
      });
    });

    describe('released package', () => {
      beforeAll(
        done => fs.readFile('test/stub_data/lasership_released.json', 'utf8', (err, doc) => _lsClient.presentResponse(doc, 'trk', function (err, resp) {
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
        'has a destination of NYC',
        () => expect(_package.destination).toBe('Pinellas Park, FL 33782')
      );

      it(
        'has a weight of 2.282 lbs',
        () => expect(_package.weight).toBe('1.31 LBS')
      );
    });

    describe('en-route package', () => {
      beforeAll(
        done => fs.readFile('test/stub_data/lasership_enroute.json', 'utf8', (err, doc) => _lsClient.presentResponse(doc, 'trk', function (err, resp) {
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
        'has a destination of Jacksonville',
        () => expect(_package.destination).toBe('Jacksonville, FL 32216-4702')
      );

      it(
        'has a weight of 5.25 lbs',
        () => expect(_package.weight).toBe('5.25 lbs')
      );

      it(
        'has an eta of Sep 23rd, 2015',
        () => expect(_package.eta).toEqual(moment('2015-09-23T00:00:00Z').toDate())
      );

      it('has two activities with timestamp, location and details', () => {
        expect(_package.activities).toHaveLength(2);
        let act = _package.activities[0];
        expect(act.timestamp).toEqual(moment('2015-09-20T14:42:14Z').toDate());
        expect(act.location).toBe('Groveport, OH 43125');
        expect(act.details).toBe('Origin Scan');
        act = _package.activities[1];
        expect(act.timestamp).toEqual(moment('2015-09-20T00:07:51Z').toDate());
        expect(act.location).toBe('US');
        expect(act.details).toBe('Ship Request Received');
      });
    });
  });
});
