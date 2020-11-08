/* eslint-disable
    handle-callback-err,
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
/* eslint-disable
	@typescript-eslint/restrict-template-expressions,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-return,
	@typescript-eslint/no-unsafe-call,
	node/no-callback-literal
*/
import { addDays, getDate, getYear, set, setDay } from "date-fns";
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from "fs";
import moment from "moment-timezone";
import { AmazonClient } from "../src/amazon";
import { STATUS_TYPES } from "../src/shipper";

describe("amazon client", () => {
  let _amazonClient = null;

  beforeAll(() => (_amazonClient = new AmazonClient({})));

  describe("integration tests", () => {
    let _package = null;

    describe("detects eta", () => {
      it("for delivery tomorrow", (done) =>
        fs.readFile(
          "test/stub_data/amazon_intransit.html",
          "utf8",
          (err, docs) =>
            _amazonClient.presentResponse(docs, "request", function (err, pkg) {
              expect(getDate(pkg.eta)).toEqual(getDate(addDays(new Date(), 1)));
              return done();
            })
        ));

      it("for delivery today", (done) =>
        fs.readFile("test/stub_data/amazon_today.html", "utf8", (err, docs) =>
          _amazonClient.presentResponse(docs, "request", function (err, pkg) {
            expect(getDate(pkg.eta)).toEqual(getDate(new Date()));
            return done();
          })
        ));

      it("for delivery in a date range", (done) =>
        fs.readFile(
          "test/stub_data/amazon_date_range.html",
          "utf8",
          (err, docs) =>
            _amazonClient.presentResponse(docs, "request", function (err, pkg) {
              const year = getYear(new Date());
              const expected = set(new Date(year, 9, 30), {
                hours: 20,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
              });
              expect(pkg.eta).toEqual(expected);
              return done();
            })
        ));

      it("for delayed delivery in a date range", (done) =>
        fs.readFile("test/stub_data/amazon_delayed.html", "utf8", (err, docs) =>
          _amazonClient.presentResponse(docs, "request", function (err, pkg) {
            const year = getYear(new Date());
            const expected = new Date(year, 9, 24, 20, 0, 0, 0);
            expect(pkg.eta).toEqual(expected);
            return done();
          })
        ));

      it("for delivery in a day-of-week range", (done) =>
        fs.readFile(
          "test/stub_data/amazon_wednesday.html",
          "utf8",
          (err, docs) =>
            _amazonClient.presentResponse(docs, "request", function (err, pkg) {
              let arrivalDay = set(new Date(), {
                hours: 20,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
              });
              arrivalDay = setDay(arrivalDay, 3);
              expect(pkg.eta).toEqual(arrivalDay);
              return done();
            })
        ));
    });

    describe("in transit", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/amazon_intransit.html",
          "utf8",
          (err, docs) =>
            _amazonClient.presentResponse(docs, "request", function (
              err,
              resp
            ) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      it("has a status of en-route", () =>
        expect(_package.status).toBe(STATUS_TYPES.EN_ROUTE));

      describe("has an activity", () => {
        let _activity = null;

        beforeAll(() => (_activity = _package.activities[0]));

        it("with a timestamp", () =>
          expect(_activity.timestamp).toEqual(
            new Date(`${moment().year()}-10-16T07:13:00Z`)
          ));

        it("with details", () =>
          expect(_activity.details).toBe(
            "Shipment arrived at Amazon facility"
          ));

        it("with location", () =>
          expect(_activity.location).toBe("Avenel, NJ US"));
      });

      describe("has another activity", () => {
        let _activity = null;

        beforeAll(() => (_activity = _package.activities[1]));

        it("with a timestamp", () =>
          expect(_activity.timestamp).toEqual(
            new Date(`${moment().year()}-10-15T00:00:00Z`)
          ));

        it("with details", () =>
          expect(_activity.details).toBe(
            "Package has left seller facility and is in transit to carrier"
          ));

        it("with no location", () => expect(_activity.location).toBe(""));
      });
    });
  });
});
