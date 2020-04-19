/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from 'fs';
import async from 'async';
import assert from 'assert';
import moment from 'moment-timezone';
const should = require('chai').should();
import { expect } from 'chai';
import bond from 'bondjs';
import { AmazonClient } from '../lib/amazon';
import { ShipperClient } from '../lib/shipper';

describe("amazon client", function() {
  let _amazonClient = null;

  before(() => _amazonClient = new AmazonClient());

  return describe("integration tests", function() {
    let _package = null;

    describe("detects eta", function() {

      it("for delivery tomorrow", done => fs.readFile('test/stub_data/amazon_intransit.html', 'utf8', (err, docs) => _amazonClient.presentResponse(docs, 'request', function(err, pkg) {
        expect(pkg.eta).to.deep.equal(moment()
          .hour(20).minute(0).second(0).milliseconds(0).add(1, 'day').toDate());
        return done();
      })));

      it("for delivery today", done => fs.readFile('test/stub_data/amazon_today.html', 'utf8', (err, docs) => _amazonClient.presentResponse(docs, 'request', function(err, pkg) {
        expect(pkg.eta).to.deep.equal(moment()
          .hour(20).minute(0).second(0).milliseconds(0).toDate());
        return done();
      })));

      it("for delivery in a date range", done => fs.readFile('test/stub_data/amazon_date_range.html', 'utf8', (err, docs) => _amazonClient.presentResponse(docs, 'request', function(err, pkg) {
        expect(pkg.eta).to.deep.equal(moment(`${moment().year()}-10-30`)
          .hour(20).minute(0).second(0).milliseconds(0).toDate());
        return done();
      })));

      it("for delayed delivery in a date range", done => fs.readFile('test/stub_data/amazon_delayed.html', 'utf8', (err, docs) => _amazonClient.presentResponse(docs, 'request', function(err, pkg) {
        expect(pkg.eta).to.deep.equal(moment(`${moment().year()}-10-24`)
          .hour(20).minute(0).second(0).milliseconds(0).toDate());
        return done();
      })));

      return it("for delivery in a day-of-week range", done => fs.readFile('test/stub_data/amazon_wednesday.html', 'utf8', (err, docs) => _amazonClient.presentResponse(docs, 'request', function(err, pkg) {
        expect(pkg.eta).to.deep.equal(moment().day(3)
          .hour(20).minute(0).second(0).milliseconds(0).toDate());
        return done();
      })));
    });

    return describe("in transit", function() {

      before(done => fs.readFile('test/stub_data/amazon_intransit.html', 'utf8', (err, docs) => _amazonClient.presentResponse(docs, 'request', function(err, resp) {
        should.not.exist(err);
        _package = resp;
        return done();
      })));

      it("has a status of en-route", () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.EN_ROUTE));

      describe("has an activity", function() {
        let _activity = null;

        before(() => _activity = _package.activities[0]);

        it("with a timestamp", () => expect(_activity.timestamp).to.deep.equal(new Date(`${moment().year()}-10-16T07:13:00Z`)));

        it("with details", () => expect(_activity.details).to.equal('Shipment arrived at Amazon facility'));

        return it("with location", () => expect(_activity.location).to.equal('Avenel, NJ US'));
      });

      return describe("has another activity", function() {
        let _activity = null;

        before(() => _activity = _package.activities[1]);

        it("with a timestamp", () => expect(_activity.timestamp).to.deep.equal(new Date(`${moment().year()}-10-15T00:00:00Z`)));

        it("with details", () => expect(_activity.details).to.equal('Package has left seller facility and is in transit to carrier'));

        return it("with no location", () => expect(_activity.location).to.equal(''));
      });
    });
  });
});
