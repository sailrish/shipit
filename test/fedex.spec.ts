/* eslint-disable
    handle-callback-err,
    no-return-assign,
    no-undef,
    no-unused-expressions,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import * as fs from 'fs';
import assert from 'assert';
import { expect } from 'chai';
import { FedexClient } from '../src/fedex';
import { STATUS_TYPES } from '../src/shipper';
import { Parser } from 'xml2js';
const should = require('chai').should();

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

describe('fedex client', function () {
  let _fedexClient: FedexClient = null;
  const _xmlParser = new Parser();
  const _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  before(() => _fedexClient = new FedexClient({
    key: 'fedex-api-key',
    password: 'password',
    account: 'fedex-user',
    meter: 'what-can-brown-do-for-you'
  }));

  describe('generateRequest', function () {
    let _trackRequest = null;

    // before(function (done) {
    //   const trackXml = _fedexClient.generateRequest('1Z5678', 'eloquent shipit');
    //   return _xmlParser.parseString(trackXml, function (err, data) {
    //     _trackRequest = data != null ? data['ns:TrackRequest'] : undefined;
    //     assert(_trackRequest != null);
    //     return done();
    //   });
    // });

    before(async () => {
      const promise = new Promise((resolve, reject) => {
        const trackXml = _fedexClient.generateRequest('1Z5678', 'eloquent shipit');
        return _xmlParser.parseString(trackXml, function (err, data) {
          _trackRequest = data != null ? data['ns:TrackRequest'] : undefined;
          assert(_trackRequest != null);
          return resolve();
        });
      });
      return promise;
    });


    it('contains the correct xml namespace and scheme location', function () {
      _trackRequest.should.have.property('$');
      _trackRequest.$['xmlns:ns'].should.equal('http://fedex.com/ws/track/v5');
      _trackRequest.$['xmlns:xsi'].should.equal('http://www.w3.org/2001/XMLSchema-instance');
      return _trackRequest.$['xsi:schemaLocation'].should.equal('http://fedex.com/ws/track/v4 TrackService_v4.xsd');
    });

    it('contains correct api key and password', function () {
      _trackRequest.should.have.property('ns:WebAuthenticationDetail');
      const credentials = __guard__(__guard__(_trackRequest['ns:WebAuthenticationDetail'] != null ? _trackRequest['ns:WebAuthenticationDetail'][0] : undefined, x1 => x1['ns:UserCredential']), x => x[0]);
      if (credentials['ns:Key'] != null) {
        credentials['ns:Key'][0].should.equal('fedex-api-key');
      }
      return (credentials['ns:Password'] != null ? credentials['ns:Password'][0].should.equal('password') : undefined);
    });

    it('contains correct client detail', function () {
      _trackRequest.should.have.property('ns:ClientDetail');
      const clientDetail = _trackRequest['ns:ClientDetail'] != null ? _trackRequest['ns:ClientDetail'][0] : undefined;
      if (clientDetail['ns:AccountNumber'] != null) {
        clientDetail['ns:AccountNumber'][0].should.equal('fedex-user');
      }
      return (clientDetail['ns:MeterNumber'] != null ? clientDetail['ns:MeterNumber'][0].should.equal('what-can-brown-do-for-you') : undefined);
    });

    it('contains customer reference number', function () {
      _trackRequest.should.have.property('ns:TransactionDetail');
      return __guard__(_trackRequest['ns:TransactionDetail'] != null ? _trackRequest['ns:TransactionDetail'][0] : undefined, x => x['ns:CustomerTransactionId'][0].should.equal('eloquent shipit'));
    });

    it('contains tracking version information', function () {
      _trackRequest.should.have.property('ns:Version');
      const version = _trackRequest['ns:Version'] != null ? _trackRequest['ns:Version'][0] : undefined;
      if (version['ns:ServiceId'] != null) {
        version['ns:ServiceId'][0].should.equal('trck');
      }
      if (version['ns:Major'] != null) {
        version['ns:Major'][0].should.equal('5');
      }
      if (version['ns:Intermediate'] != null) {
        version['ns:Intermediate'][0].should.equal('0');
      }
      return (version['ns:Minor'] != null ? version['ns:Minor'][0].should.equal('0') : undefined);
    });

    it('contains tracking number', function () {
      _trackRequest.should.have.property('ns:PackageIdentifier');
      if (_trackRequest['ns:PackageIdentifier'] != null) {
        _trackRequest['ns:PackageIdentifier'][0]['ns:Value'][0].should.equal('1Z5678');
      }
      return (_trackRequest['ns:PackageIdentifier'] != null ? _trackRequest['ns:PackageIdentifier'][0]['ns:Type'][0].should.equal('TRACKING_NUMBER_OR_DOORTAG') : undefined);
    });

    return it('contains appropriate flags', function () {
      _trackRequest.should.have.property('ns:IncludeDetailedScans');
      return _trackRequest['ns:IncludeDetailedScans'][0].should.equal('true');
    });
  });

  describe('validateResponse', function () {
    it('returns an error if response is not an xml document', function (done) {
      let errorReported = false;
      return _fedexClient.validateResponse('bad xml', function (err) {
        expect(err).should.exist;
        if (!errorReported) { done(); }
        return errorReported = true;
      });
    });

    it("returns an error if there's no track reply", function (done) {
      const badResponse = '<RandomXml>Random</RandomXml>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (err) {
        err.should.exist;
        return done();
      });
    });

    it("returns an error if track reply doesn't contain notifications", function (done) {
      const badResponse = '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity></TrackReply>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (err) {
        err.should.exist;
        return done();
      });
    });

    it('returns an error when there are no success notifications', function (done) {
      const badResponse = '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity><Notifications><Severity>SUCCESS</Severity><Source>trck</Source><Code>1</Code><Message>Request was successfully processed.</Message><LocalizedMessage>Request was successfully processed.</LocalizedMessage></Notifications></TrackReply>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (err) {
        err.should.exist;
        return done();
      });
    });

    return it('returns track details when notifications indicate success', function (done) {
      const badResponse = '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity><Notifications><Severity>SUCCESS</Severity><Source>trck</Source><Code>0</Code><Message>Request was successfully processed.</Message><LocalizedMessage>Request was successfully processed.</LocalizedMessage></Notifications><TrackDetails>details</TrackDetails></TrackReply>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (err, resp) {
        expect(err).to.be.a('null');
        expect(resp).to.equal('details');
        return done();
      });
    });
  });

  return describe('integration tests', function () {
    let _package = null;

    describe('delivered package', function () {
      before(async () => {
        const promise = new Promise((resolve, reject) => {
          fs.readFile('test/stub_data/fedex_delivered.xml', 'utf8', (err, xmlDoc) => _fedexClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
            should.not.exist(err);
            _package = resp;
            resolve();
          }));
        });
        return promise;
      });

      it('has a status of delivered', () => expect(_package.status).to.equal(STATUS_TYPES.DELIVERED));

      it('has a service type of fedex priority overnight', () => expect(_package.service).to.equal('FedEx Priority Overnight'));

      it('has a weight of 0.2 LB', () => expect(_package.weight).to.equal('0.2 LB'));

      it('has a destination of MD', () => expect(_package.destination).to.equal('MD'));

      it('has 7 activities', () => expect(_package.activities).to.have.length(7));

      it('has first activity with timestamp, location and details', function () {
        const act = _package.activities[0];
        expect(act.timestamp).to.deep.equal(new Date('2014-02-17T14:05:00.000Z'));
        expect(act.datetime).to.equal('2014-02-17T09:05:00');
        expect(act.details).to.equal('Delivered');
        return expect(act.location).to.equal('MD 21133');
      });

      return it('has last activity with timestamp, location and details', function () {
        const act = _package.activities[6];
        expect(act.timestamp).to.deep.equal(new Date('2014-02-15T15:57:00.000Z'));
        expect(act.details).to.equal('Picked up');
        return expect(act.location).to.equal('East Hanover, NJ 07936');
      });
    });

    return describe('in transit package with an activity with missing location', function () {
      before(async () => {
        const promise = new Promise((resolve, reject) => {
          fs.readFile('test/stub_data/fedex_missing_location.xml', 'utf8', (err, xmlDoc) => _fedexClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
            should.not.exist(err);
            _package = resp;
            return resolve();
          }));
        });
        return promise;
      });

      it('has a status of in-transit', () => expect(_package.status).to.equal(STATUS_TYPES.EN_ROUTE));

      it('has a service type of FedEx SmartPost', () => expect(_package.service).to.equal('FedEx SmartPost'));

      it('has a weight of 1.2 LB', () => expect(_package.weight).to.equal('1.2 LB'));

      it('has a destination of Greenacres, WA', () => expect(_package.destination).to.equal('Greenacres, WA'));

      it('has 3 activities', () => expect(_package.activities).to.have.length(3));

      it('has first activity with location Troutdale, OR 97060', () => expect(_package.activities[0].location).to.equal('Troutdale, OR 97060'));

      return it('has second activity with no location', () => should.not.exist(_package.activities[1].location));
    });
  });
});
