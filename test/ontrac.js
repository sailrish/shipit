/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from 'fs';
import async from 'async';
import assert from 'assert';
const should = require('chai').should();
import { expect } from 'chai';
import bond from 'bondjs';
import moment from 'moment-timezone';
import { OnTracClient } from '../lib/ontrac';
import { ShipperClient } from '../lib/shipper';

describe("on trac client", function() {
  let _onTracClient = null;

  before(() => _onTracClient = new OnTracClient());

  return describe("integration tests", function() {
    let _package = null;

    return describe("in transit package", function() {

      before(done => fs.readFile('test/stub_data/ontrac_intransit_details.html', 'utf8', (e, r) => _onTracClient.presentResponse(r, 'trk', function(err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      const verifyActivity = function(act, ts, loc, details) {
        expect(act.timestamp).to.deep.equal(new Date(ts));
        expect(act.location).to.equal(loc);
        return expect(act.details).to.equal(details);
      };

      it("has a status of en route", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE));

      it("has a destination of Palo Alto, CA", () => expect(_package.destination).to.equal('Palo Alto, CA'));

      it("has an eta of Oct 7th, 2015", () => expect(_package.eta).to.deep.equal(new Date('2015-10-07T23:59:59Z')));

      it("has a service of Caltrac", () => expect(_package.service).to.equal("Ground"));

      it("has a weight of 2 lbs.", () => expect(_package.weight).to.equal("2 lbs."));

      return it("has 2 activities with timestamp, location and details", function() {
        expect(_package.activities).to.have.length(2);
        verifyActivity(_package.activities[1], new Date('2015-10-04T20:00:00.000Z'), 'SaltLake, UT', 'Data entry');
        return verifyActivity(_package.activities[0], new Date('2015-10-05T17:27:00.000Z'), 'SaltLake, UT', 'Package received at facility');
      });
    });
  });
});
