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
import { DhlClient } from '../src/dhl';
import { STATUS_TYPES } from '../src/shipper';
const should = require('chai').should();

describe('dhl client', function () {
  let _dhlClient = null;

  before(() => _dhlClient = new DhlClient({
    userId: 'dhl-user',
    password: 'dhl-pw'
  }));

  describe('generateRequest', () => it('generates an accurate track request', function () {
    const trackXml = _dhlClient.generateRequest('1Z5678');
    return expect(trackXml).to.equal(`\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<req:KnownTrackingRequest xmlns:req="http://www.dhl.com">
  <Request>
    <ServiceHeader>
      <SiteID>dhl-user</SiteID>
      <Password>dhl-pw</Password>
    </ServiceHeader>
  </Request>
  <LanguageCode>en</LanguageCode>
  <AWBNumber>1Z5678</AWBNumber>
  <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>
</req:KnownTrackingRequest>`
    );
  }));

  return describe('integration tests', function () {
    let _package = null;

    describe('delivered package', function () {
      before(done => fs.readFile('test/stub_data/dhl_delivered.xml', 'utf8', (err, doc) => _dhlClient.presentResponse(doc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of delivered', () => expect(_package.status).to.equal(STATUS_TYPES.DELIVERED));

      it('has a destination of Woodside, NY, USA', () => expect(_package.destination).to.equal('Woodside, NY, USA'));

      it('has a weight of 2.42 LB', () => expect(_package.weight).to.equal('2.42 LB'));

      return it('has 14 activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(14);
        let act = _package.activities[0];
        expect(act.location).to.equal('Woodside, NY, USA');
        expect(act.details).to.equal('Delivered - Signed for by');
        expect(act.timestamp).to.deep.equal(new Date('2015-10-01T13:44:37Z'));
        act = _package.activities[13];
        expect(act.location).to.equal('London, Heathrow United Kingdom');
        expect(act.details).to.equal('Processed');
        return expect(act.timestamp).to.deep.equal(new Date('2015-09-29T21:10:34Z'));
      });
    });

    describe('delayed package', function () {
      before(done => fs.readFile('test/stub_data/dhl_delayed.xml', 'utf8', (err, doc) => _dhlClient.presentResponse(doc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of delayed', () => expect(_package.status).to.equal(STATUS_TYPES.DELAYED));

      it('has a destination of Auckland, New Zealand', () => expect(_package.destination).to.equal('Auckland, New Zealand'));

      it('has a weight of 14.66 LB', () => expect(_package.weight).to.equal('14.66 LB'));

      return it('has 24 activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(24);
        let act = _package.activities[0];
        expect(act.location).to.equal('Auckland, New Zealand');
        expect(act.details).to.equal('Clearance event');
        expect(act.timestamp).to.deep.equal(new Date('2015-10-08T02:33:00Z'));
        act = _package.activities[23];
        expect(act.location).to.equal('London, Heathrow United Kingdom');
        expect(act.details).to.equal('Processed');
        return expect(act.timestamp).to.deep.equal(new Date('2015-09-18T20:18:58Z'));
      });
    });

    return describe('package with estimated delivery', function () {
      before(done => fs.readFile('test/stub_data/dhl_eta.xml', 'utf8', (err, doc) => _dhlClient.presentResponse(doc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      return it('has an estimated delivery date', () => expect(_package.eta).to.deep.equal(new Date('2019-02-05T07:59:00.000Z')));
    });
  });
});
