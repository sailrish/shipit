/* eslint-disable
    handle-callback-err,
    no-new,
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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from 'fs';
import { expect, should } from 'chai';
import bond from 'bondjs';
import moment from 'moment-timezone';
import { UpsClient } from '../lib/ups';
import { ShipperClient } from '../lib/shipper';
import { Parser } from 'xml2js';

describe('ups client', function () {
  let _upsClient = null;
  const _xmlParser = new Parser();
  let _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  before(() => _upsClient = new UpsClient({
    licenseNumber: '12345',
    userId: 'shipit',
    password: 'password'
  }));

  describe('generateRequest', function () {
    let _xmlDocs = null;

    before(function () {
      const trackXml = _upsClient.generateRequest('1Z5678', 'eloquent shipit');
      return _xmlDocs = trackXml.split(_xmlHeader);
    });

    it('generates a track request with two xml documents', () => expect(_xmlDocs).to.have.length(3));

    it('includes an AccessRequest in the track request', done => _xmlParser.parseString(_xmlDocs[1], function (err, doc) {
      doc.should.have.property('AccessRequest');
      return done();
    }));

    it('includes a TrackRequest in the track request', done => _xmlParser.parseString(_xmlDocs[2], function (err, doc) {
      doc.should.have.property('TrackRequest');
      return done();
    }));

    it('includes an AccessRequest with license number, user id and password', done => _xmlParser.parseString(_xmlDocs[1], function (err, doc) {
      const accessReq = doc.AccessRequest;
      accessReq.should.have.property('AccessLicenseNumber');
      accessReq.should.have.property('UserId');
      accessReq.should.have.property('Password');
      accessReq.AccessLicenseNumber[0].should.equal('12345');
      accessReq.UserId[0].should.equal('shipit');
      accessReq.Password[0].should.equal('password');
      return done();
    }));

    it('includes a TrackRequest with customer context', done => _xmlParser.parseString(_xmlDocs[2], function (err, doc) {
      const trackReq = doc.TrackRequest;
      trackReq.should.have.property('Request');
      trackReq.Request[0].TransactionReference[0].CustomerContext[0].should.equal('eloquent shipit');
      return done();
    }));

    it('includes a TrackRequest with request action and option', done => _xmlParser.parseString(_xmlDocs[2], function (err, doc) {
      const trackReq = doc.TrackRequest;
      trackReq.should.have.property('Request');
      trackReq.Request[0].RequestAction[0].should.equal('track');
      trackReq.Request[0].RequestOption[0].should.equal('3');
      return done();
    }));

    return it('includes a TrackRequest with the correct tracking number', done => _xmlParser.parseString(_xmlDocs[2], function (err, doc) {
      const trackReq = doc.TrackRequest;
      trackReq.TrackingNumber[0].should.equal('1Z5678');
      return done();
    }));
  });

  describe('validateResponse', function () {
    it('returns an error if response is not an xml document', function (done) {
      let errorReported = false;
      return _upsClient.validateResponse('bad xml', function (err, resp) {
        err.should.exist;
        if (!errorReported) { done(); }
        return errorReported = true;
      });
    });

    it('returns an error if xml response does not contain a response status', function (done) {
      let errorReported = false;
      _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      const badResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode></Response></TrackResponse>';
      return _upsClient.validateResponse(_xmlHeader + badResponse, function (err, resp) {
        err.should.exist;
        if (!errorReported) { done(); }
        return errorReported = true;
      });
    });

    it('returns error description if xml response contains an unsuccessful status', function (done) {
      let errorReported = false;
      _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      const failureResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode><ResponseStatusDescription>Exception</ResponseStatusDescription><Error><ErrorDescription>No data</ErrorDescription></Error></Response></TrackResponse>';
      return _upsClient.validateResponse(_xmlHeader + failureResponse, function (err, resp) {
        err.should.equal('No data');
        if (!errorReported) { done(); }
        return errorReported = true;
      });
    });

    it('returns an error if xml response does not contain shipment data', function (done) {
      let errorReported = false;
      const noShipmentResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode><ResponseStatusDescription>Success</ResponseStatusDescription></Response></TrackResponse>';
      return _upsClient.validateResponse(_xmlHeader + noShipmentResponse, function (err, resp) {
        err.should.exist;
        if (!errorReported) { done(); }
        return errorReported = true;
      });
    });

    return it('returns shipment data retrieved from the xml response', function (done) {
      const goodResponse = '<TrackResponse><Response><ResponseStatusCode>1</ResponseStatusCode><ResponseStatusDescription>Success</ResponseStatusDescription></Response><Shipment>Smuggled Goods</Shipment></TrackResponse>';
      return _upsClient.validateResponse(_xmlHeader + goodResponse, function (err, resp) {
        expect(err).to.be.a('null');
        expect(resp).to.equal('Smuggled Goods');
        return done();
      });
    });
  });

  describe('getEta', function () {
    let _presentTimestamp = null;

    beforeEach(() => _presentTimestamp = bond(_upsClient, 'presentTimestamp').return('at midnight'));

    it('uses ScheduledDeliveryDate', function () {
      const shipment = { ScheduledDeliveryDate: ['tomorrow'] };
      const eta = _upsClient.getEta(shipment);
      _presentTimestamp.calledWith('tomorrow').should.equal(true);
      return expect(eta).to.equal('at midnight');
    });

    return it("uses RescheduledDeliveryDate if ScheduledDeliveryDate is't available", function () {
      const shipment = { Package: [{ RescheduledDeliveryDate: ['next week'] }] };
      _upsClient.getEta(shipment);
      return _presentTimestamp.calledWith('next week').should.equal(true);
    });
  });

  describe('getService', function () {
    it('returns service description converted to title case', function () {
      const shipment = { Service: [{ Description: ['priority overnight'] }] };
      const service = _upsClient.getService(shipment);
      return expect(service).to.equal('Priority Overnight');
    });

    it('returns undefined if service is not present', function () {
      const shipment = { NoService: 'none' };
      const service = _upsClient.getService(shipment);
      return expect(service).to.be.a('undefined');
    });

    return it('returns undefined if service description is not present', function () {
      const shipment = { Service: [{ NoDescription: ['abc'] }] };
      const service = _upsClient.getService(shipment);
      return expect(service).to.be.a('undefined');
    });
  });

  describe('getWeight', function () {
    it('returns package weight along with unit of measurement', function () {
      const shipment = { Package: [{ PackageWeight: [{ Weight: ['very heavy'], UnitOfMeasurement: [{ Code: ['moon lbs'] }] }] }] };
      const weight = _upsClient.getWeight(shipment);
      return expect(weight).to.equal('very heavy moon lbs');
    });

    it('returns package weight even when unit of measurement is not available', function () {
      const shipment = { Package: [{ PackageWeight: [{ Weight: ['very heavy'] }] }] };
      const weight = _upsClient.getWeight(shipment);
      return expect(weight).to.equal('very heavy');
    });

    return it('returns null when weight data is malformed or unavailable', function () {
      const shipment = { Package: ['PackageHasNoWeight'] };
      const weight = _upsClient.getWeight(shipment);
      return expect(weight).to.be.a('null');
    });
  });

  describe('getDestination', function () {
    let _presentAddress = null;

    beforeEach(() => _presentAddress = bond(_upsClient, 'presentAddress').return('mi casa'));

    return it('calls presentAddress with the ship to address', function () {
      const shipment = { ShipTo: [{ Address: ['casa blanca'] }] };
      const address = _upsClient.getDestination(shipment);
      _presentAddress.calledWith('casa blanca').should.equal(true);
      return expect(address).to.equal('mi casa');
    });
  });

  describe('getActivitiesAndStatus', function () {
    let _presentAddressSpy = null;
    let _presentTimestampSpy = null;
    let _presentStatusSpy = null;
    let _activity1 = null;
    let _activity2 = null;
    let _activity3 = null;
    let _activity4 = null;
    let _shipment = null;

    beforeEach(function () {
      _presentAddressSpy = bond(_upsClient, 'presentAddress');
      _presentTimestampSpy = bond(_upsClient, 'presentTimestamp');
      _presentStatusSpy = bond(_upsClient, 'presentStatus');
      _activity1 = {
        ActivityLocation: [{ Address: ['middle earth'] }],
        Date: ['yesterday'],
        Time: ['at noon'],
        Status: [{ StatusType: [{ Description: ['almost there'] }] }]
      };
      _activity2 = {
        ActivityLocation: [{ Address: ['middle earth'] }],
        Status: [{ StatusType: [{ Description: ['not there yet'] }] }]
      };
      _activity3 = {
        Date: ['yesterday'],
        Time: ['at noon'],
        Status: [{ StatusType: [{ Description: ['not there yet'] }] }]
      };
      _activity4 = {
        ActivityLocation: [{ Address: ['shire'] }],
        Date: ['two days ago'],
        Time: ['at midnight'],
        Status: [{ StatusType: [{ Description: ['fellowship begins'] }] }]
      };
      return _shipment = { Package: [{ Activity: [_activity1] }] };
    });

    it('returns an empty array and null status if no package activities are found', function () {
      const { activities, status } = _upsClient.getActivitiesAndStatus();
      expect(activities).to.be.an('array');
      expect(activities).to.have.length(0);
      return expect(status).to.be.a('null');
    });

    it("calls presentAddress for activity location in package's activities", function () {
      const presentAddress = _presentAddressSpy.return();
      _upsClient.getActivitiesAndStatus(_shipment);
      return presentAddress.calledWith('middle earth').should.equal(true);
    });

    it("calls presentTimestamp for activity time and date in package's activities", function () {
      const presentTimestamp = _presentTimestampSpy.return();
      _upsClient.getActivitiesAndStatus(_shipment);
      return presentTimestamp.calledWith('yesterday', 'at noon').should.equal(true);
    });

    it("calls presentStatus for the first of package's activities", function () {
      _presentAddressSpy.return('rivendell');
      _presentTimestampSpy.return('long long ago');
      const presentStatus = _presentStatusSpy.return('look to the east');
      _shipment.Package[0].Activity.push(_activity4);
      const { activities, status } = _upsClient.getActivitiesAndStatus(_shipment);
      expect(activities).to.be.an('array');
      expect(activities).to.have.length(2);
      return expect(status).to.equal('look to the east');
    });

    it('sets activity details to upper case first', function () {
      _presentAddressSpy.return('rivendell');
      _presentTimestampSpy.return('long long ago');
      const { activities } = _upsClient.getActivitiesAndStatus(_shipment);
      return expect(activities[0].details).to.equal('Almost there');
    });

    it("skips activities that don't have a valid timestamp", function () {
      _presentAddressSpy.return('rivendell');
      _presentTimestampSpy.to(function (dateString, timeString) {
        if (dateString != null) { return 'long long ago'; }
      });
      _shipment.Package[0].Activity.push(_activity2);
      const { activities } = _upsClient.getActivitiesAndStatus(_shipment);
      expect(activities).to.be.an('array');
      return expect(activities).to.have.length(1);
    });

    return it("accepts activities that don't have a valid location", function () {
      _presentAddressSpy.to(function (address) {
        if (address != null) { return 'rivendell'; }
      });
      _presentTimestampSpy.return('long long ago');
      _shipment.Package[0].Activity.push(_activity3);
      const { activities } = _upsClient.getActivitiesAndStatus(_shipment);
      expect(activities).to.be.an('array');
      expect(activities).to.have.length(2);
      expect(activities[1].timestamp).to.equal('long long ago');
      expect(activities[1].details).to.equal('Not there yet');
      return should.not.exist(activities[1].location);
    });
  });

  describe('presentTimestamp', function () {
    it("returns undefined if dateString isn't specified", function () {
      const ts = _upsClient.presentTimestamp();
      return expect(ts).to.be.a('undefined');
    });

    it("uses only the date string if time string isn't specified", function () {
      const ts = _upsClient.presentTimestamp('20140704');
      return expect(ts).to.deep.equal(moment('2014-07-04T00:00:00.000Z').toDate());
    });

    return it('uses the date and time strings when both are available', function () {
      const ts = _upsClient.presentTimestamp('20140704', '142305');
      return expect(ts).to.deep.equal(moment('2014-07-04T14:23:05.000Z').toDate());
    });
  });

  describe('presentAddress', function () {
    let _presentLocationSpy = null;

    beforeEach(() => _presentLocationSpy = bond(_upsClient, 'presentLocation'));

    it("returns undefined if raw address isn't specified", function () {
      const address = _upsClient.presentAddress();
      return expect(address).to.be.a('undefined');
    });

    return it('calls presentLocation using the city, state, country and postal code', function (done) {
      const address = {
        city: 'Chicago',
        stateCode: 'IL',
        countryCode: 'US',
        postalCode: '60654'
      };
      const rawAddress = {
        City: [address.city],
        StateProvinceCode: [address.stateCode],
        CountryCode: [address.countryCode],
        PostalCode: [address.postalCode]
      };
      _presentLocationSpy.to(function (raw) {
        expect(raw).to.deep.equal(address);
        return done();
      });
      return _upsClient.presentAddress(rawAddress);
    });
  });

  describe('presentStatus', function () {
    it('detects delivered status', function () {
      const statusType = { StatusType: [{ Code: ['D'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED);
    });

    it('detects en route status after package has been picked up', function () {
      const statusType = { StatusType: [{ Code: ['P'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE);
    });

    it('detects en route status for packages in transit', function () {
      const statusType = { StatusType: [{ Code: ['I'] }], StatusCode: [{ Code: ['anything'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE);
    });

    it('detects en route status for packages that have an exception', function () {
      const statusType = { StatusType: [{ Code: ['X'] }], StatusCode: [{ Code: ['U2'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE);
    });

    it('detects out-for-delivery status', function () {
      const statusType = { StatusType: [{ Code: ['I'] }], StatusCode: [{ Code: ['OF'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY);
    });

    it('detects delayed status', function () {
      const statusType = { StatusType: [{ Code: ['X'] }], StatusCode: [{ Code: ['anything else'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.DELAYED);
    });

    it("returns unknown if status code and type can't be matched", function () {
      const statusType = { StatusType: [{ Code: ['G'] }], StatusCode: [{ Code: ['W'] }] };
      const status = _upsClient.presentStatus(statusType);
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.UNKNOWN);
    });

    it("returns unknown if status code isn't available", function () {
      const status = _upsClient.presentStatus({});
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.UNKNOWN);
    });

    return it('returns unknown if status object is undefined', function () {
      const status = _upsClient.presentStatus();
      return expect(status).to.equal(ShipperClient.STATUS_TYPES.UNKNOWN);
    });
  });

  return describe('integration tests', function () {
    let _package = null;

    describe('delivered package', function () {
      before(done => fs.readFile('test/stub_data/ups_delivered.xml', 'utf8', (err, xmlDoc) => _upsClient.presentResponse(xmlDoc, '1Z12345E0291980793', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('returns the original tracking number', () => expect(_package.request).to.equal('1Z12345E0291980793'));

      it('has a status of delivered', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED));

      it('has a service of 2nd Day Air', () => expect(_package.service).to.equal('2 Nd Day Air'));

      it('has a destination of anytown', () => expect(_package.destination).to.equal('Anytown, GA 30340'));

      it('has a weight of 5 lbs', () => expect(_package.weight).to.equal('5.00 LBS'));

      return it('has two activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(2);
        const act1 = _package.activities[0];
        const act2 = _package.activities[1];
        expect(act1.timestamp).to.deep.equal(moment('2010-06-10T12:00:00.000Z').toDate());
        expect(act1.location).to.equal('Anytown, GA 30340');
        expect(act1.details).to.equal('Delivered');
        expect(act2.timestamp).to.deep.equal(moment('2010-06-08T12:00:00.000Z').toDate());
        expect(act2.location).to.equal('US');
        return expect(act2.details).to.equal('Billing information received. shipment date pending.');
      });
    });

    describe('package in transit', function () {
      before(done => fs.readFile('test/stub_data/ups_transit.xml', 'utf8', (err, xmlDoc) => _upsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of in-transit', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE));

      it('has a service of Next Day Air Saver', () => expect(_package.service).to.equal('Next Day Air Saver'));

      it('has 0.00 weight', () => expect(_package.weight).to.equal('0.00 LBS'));

      it('has destination of anytown', () => expect(_package.destination).to.equal('Anytown, GA 30304'));

      return it('has one activity with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(1);
        const act = _package.activities[0];
        expect(act.timestamp).to.deep.equal(moment('2010-05-05T01:00:00.000Z').toDate());
        expect(act.location).to.equal('Grand Junction Air S, CO');
        return expect(act.details).to.equal('Origin scan');
      });
    });

    describe('multiple delivery attempts', function () {
      before(done => fs.readFile('test/stub_data/ups_delivery_attempt.xml', 'utf8', (err, xmlDoc) => _upsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of delayed', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELAYED));

      it('has a service of Next Day Air Saver', () => expect(_package.service).to.equal('Next Day Air Saver'));

      it('has 1.00 weight', () => expect(_package.weight).to.equal('1.00 LBS'));

      it('has destination of anytown', () => expect(_package.destination).to.equal('Anytown, GA 30340'));

      return it('has 6 activities with timestamp, location and details', function () {
        expect(_package.activities).to.have.length(6);
        let act = _package.activities[0];
        expect(act.timestamp).to.deep.equal(moment('1998-08-30T10:39:00.000Z').toDate());
        new Date('Aug 30 1998 10:39:00');
        expect(act.location).to.equal('Bonn, DE');
        expect(act.details).to.equal('Ups internal activity code');
        act = _package.activities[1];
        expect(act.timestamp).to.deep.equal(moment('2010-08-30T10:32:00.000Z').toDate());
        expect(act.location).to.equal('Bonn, DE');
        return expect(act.details).to.equal('Adverse weather conditions caused this delay');
      });
    });

    describe('rescheduled delivery date', function () {
      before(done => fs.readFile('test/stub_data/ups_rescheduled.xml', 'utf8', (err, xmlDoc) => _upsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE));

      it('has destination of anytown', () => expect(_package.destination).to.equal('Chicago, IL 60607'));

      return it('has an eta of Oct 24th', () => expect(_package.eta).to.deep.equal(moment('2014-10-24T23:59:59.000Z').toDate()));
    });

    return describe('2nd tracking number', function () {
      before(done => fs.readFile('test/stub_data/ups_2nd_trk_number.xml', 'utf8', (err, xmlDoc) => _upsClient.presentResponse(xmlDoc, 'trk', function (err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it('has a status of delivered', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED));

      it('has a service of Ground', () => expect(_package.service).to.equal('Ground'));

      it('has 1.00 weight', () => expect(_package.weight).to.equal('20.00 LBS'));

      it('has destination of anytown', () => expect(_package.destination).to.equal('Anytown, GA 30304'));

      return it('has 6 activities with timestamp, location and details', function () {
        let act;
        expect(_package.activities).to.have.length(1);
        return act = _package.activities[0];
      });
    });
  });
});
