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
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from "fs";
import moment from "moment-timezone";
import { Parser } from "xml2js";
import { STATUS_TYPES } from "../src/shipper";
import { UspsClient } from "../src/usps";

describe("usps client", () => {
  let _uspsClient = null;
  const _xmlParser = new Parser();

  beforeAll(() => (_uspsClient = new UspsClient({ userId: "hello-neuman" })));

  describe("generateRequest", () => {
    let _xmlDoc = null;

    beforeAll(
      () =>
        (_xmlDoc = _uspsClient.generateRequest(
          "9400111899560008231892",
          "10.10.5.2"
        ))
    );

    it("includes TrackFieldRequest in the track request document", (done) =>
      _xmlParser.parseString(_xmlDoc, function (err, doc) {
        expect(doc).toHaveProperty("TrackFieldRequest");
        return done();
      }));

    it("includes user ID in the track field request", (done) =>
      _xmlParser.parseString(_xmlDoc, function (err, doc) {
        expect(doc.TrackFieldRequest.$.USERID).toBe("hello-neuman");
        return done();
      }));

    it("includes revision 1 in the track field request", (done) =>
      _xmlParser.parseString(_xmlDoc, function (err, doc) {
        expect(doc.TrackFieldRequest.Revision[0]).toBe("1");
        return done();
      }));

    it("includes client IP in the track field request", (done) =>
      _xmlParser.parseString(_xmlDoc, function (err, doc) {
        expect(doc.TrackFieldRequest.ClientIp[0]).toBe("10.10.5.2");
        return done();
      }));

    it("includes source ID in the track field request", (done) =>
      _xmlParser.parseString(_xmlDoc, function (err, doc) {
        expect(doc.TrackFieldRequest.SourceId[0]).toBe("shipit");
        return done();
      }));

    it("includes track ID in the track field request", (done) =>
      _xmlParser.parseString(_xmlDoc, function (err, doc) {
        expect(doc.TrackFieldRequest.TrackID[0].$.ID).toBe(
          "9400111899560008231892"
        );
        return done();
      }));
  });

  describe("integration tests", () => {
    let _package = null;

    describe("pre-shipment package", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/usps_pre_shipment.xml",
          "utf8",
          (err, xmlDoc) =>
            _uspsClient.presentResponse(xmlDoc, "trk", function (err, resp) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      it("has a status of shipping", () =>
        expect(_package.status).toBe(STATUS_TYPES.SHIPPING));

      it("has a service of Package Service", () =>
        expect(_package.service).toBe("Package Services"));

      it("has a destination of Kihei, HW", () =>
        expect(_package.destination).toBe("Kihei, HI 96753"));

      it("has only one activity", () => {
        expect(_package.activities).toHaveLength(1);
        expect(_package.activities[0].timestamp.getTime()).toBe(1393545600000);
        expect(_package.activities[0].location).toBe("");
        expect(_package.activities[0].details).toBe(
          "Electronic Shipping Info Received"
        );
      });
    });

    describe("delivered package", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/usps_delivered.xml",
          "utf8",
          (err, xmlDoc) =>
            _uspsClient.presentResponse(xmlDoc, "trk", function (err, resp) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      it("has a status of shipping", () =>
        expect(_package.status).toBe(STATUS_TYPES.DELIVERED));

      it("has a service of first class package", () =>
        expect(_package.service).toBe("First-Class Package Service"));

      it("has a destination of Chicago", () =>
        expect(_package.destination).toBe("Chicago, IL 60654"));

      it("has 9 activities", () => {
        expect(_package.activities).toHaveLength(9);
        const act1 = _package.activities[0];
        const act9 = _package.activities[8];
        expect(act1.details).toBe("Delivered");
        expect(act1.location).toBe("Chicago, IL 60610");
        expect(act1.timestamp).toEqual(new Date("Feb 13, 2014 12:24 pm +0000"));
        expect(act9.details).toBe("Acceptance");
        expect(act9.location).toBe("Pomona, CA 91768");
        expect(act9.timestamp).toEqual(new Date("Feb 10, 2014 11:31 am +0000"));
      });
    });

    describe("out-for-delivery package", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/usps_out_for_delivery.xml",
          "utf8",
          (err, xmlDoc) =>
            _uspsClient.presentResponse(xmlDoc, "trk", function (err, resp) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      it("has a status of shipping", () =>
        expect(_package.status).toBe(STATUS_TYPES.OUT_FOR_DELIVERY));

      it("has a service of first class package", () =>
        expect(_package.service).toBe("Package Services"));

      it("has a destination of Chicago", () =>
        expect(_package.destination).toBe("New York, NY 10010"));

      it("has 5 activities", () => {
        expect(_package.activities).toHaveLength(5);
        const act1 = _package.activities[0];
        const act5 = _package.activities[4];
        expect(act1.details).toBe("Out for Delivery");
        expect(act1.location).toBe("New York, NY 10022");
        expect(act1.timestamp).toEqual(new Date("Mar 02, 2014 08:09 am +0000"));
        expect(act5.details).toBe("Electronic Shipping Info Received");
        expect(act5.location).toBe("");
        expect(act5.timestamp).toEqual(new Date("Mar 1, 2014 00:00:00 +0000"));
      });
    });

    describe("out-for-delivery package with predicted delivery date", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/usps_predicted_eta.xml",
          "utf8",
          (err, xmlDoc) =>
            _uspsClient.presentResponse(xmlDoc, "trk", function (err, resp) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      it("has an eta of September 25th", () =>
        expect(_package.eta).toEqual(
          moment("2015-09-25T00:00:00.000Z").toDate()
        ));
    });
  });
});
