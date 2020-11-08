/* eslint-disable
    handle-callback-err,
    no-return-assign,
    no-undef,
    no-unused-expressions,
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
import assert from "assert";
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import * as fs from "fs";
import { Parser } from "xml2js";
import { FedexClient } from "../src/fedex";
import { STATUS_TYPES } from "../src/shipper";

describe("fedex client", () => {
  let _fedexClient: FedexClient = null;
  const _xmlParser = new Parser();
  const _xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  beforeAll(
    () =>
      (_fedexClient = new FedexClient({
        key: "fedex-api-key",
        password: "password",
        account: "fedex-user",
        meter: "what-can-brown-do-for-you",
      }))
  );

  describe("generateRequest", () => {
    let _trackRequest = null;

    beforeAll(async () => {
      const promise = new Promise((resolve, reject) => {
        const trackXml = _fedexClient.generateRequest(
          "1Z5678",
          "eloquent shipit"
        );
        return _xmlParser.parseString(trackXml, function (err, data) {
          _trackRequest = data?.["ns:TrackRequest"];
          assert(_trackRequest != null);
          return resolve();
        });
      });
      return promise;
    });

    it("contains the correct xml namespace and scheme location", () => {
      expect(_trackRequest).toHaveProperty("$");
      expect(_trackRequest.$["xmlns:ns"]).toBe("http://fedex.com/ws/track/v5");
      expect(_trackRequest.$["xmlns:xsi"]).toBe(
        "http://www.w3.org/2001/XMLSchema-instance"
      );
      expect(_trackRequest.$["xsi:schemaLocation"]).toBe(
        "http://fedex.com/ws/track/v4 TrackService_v4.xsd"
      );
    });

    it("contains correct api key and password", () => {
      expect(_trackRequest).toHaveProperty("ns:WebAuthenticationDetail");
      const credentials =
        _trackRequest?.["ns:WebAuthenticationDetail"]?.[0]?.[
          "ns:UserCredential"
        ]?.[0];
      if (credentials["ns:Key"] != null) {
        expect(credentials["ns:Key"][0]).toBe("fedex-api-key");
      }
      expect(credentials?.["ns:Password"]?.[0]).toEqual("password");
    });

    it("contains correct client detail", () => {
      expect(_trackRequest).toHaveProperty("ns:ClientDetail");
      const clientDetail = _trackRequest?.["ns:ClientDetail"]?.[0];
      if (clientDetail["ns:AccountNumber"] != null) {
        expect(clientDetail["ns:AccountNumber"][0]).toBe("fedex-user");
      }
      expect(clientDetail?.["ns:MeterNumber"]?.[0]).toEqual(
        "what-can-brown-do-for-you"
      );
    });

    it("contains customer reference number", () => {
      expect(_trackRequest).toHaveProperty("ns:TransactionDetail");
      const transaction =
        _trackRequest?.["ns:TransactionDetail"]?.[0]?.[
          "ns:CustomerTransactionId"
        ]?.[0];
      expect(transaction).toBe("eloquent shipit");
    });

    it("contains tracking version information", () => {
      expect(_trackRequest).toHaveProperty("ns:Version");
      const version = _trackRequest?.["ns:Version"]?.[0];
      if (version != null) {
        if (version["ns:ServiceId"] != null) {
          expect(version["ns:ServiceId"][0]).toBe("trck");
        }
        if (version["ns:Major"] != null) {
          expect(version["ns:Major"][0]).toBe("5");
        }
        if (version["ns:Intermediate"] != null) {
          expect(version["ns:Intermediate"][0]).toBe("0");
        }
      }
      expect(version?.["ns:Minor"]?.[0]).toEqual("0");
    });

    it("contains tracking number", () => {
      expect(_trackRequest).toHaveProperty("ns:PackageIdentifier");
      if (_trackRequest["ns:PackageIdentifier"] != null) {
        expect(_trackRequest["ns:PackageIdentifier"][0]["ns:Value"][0]).toBe(
          "1Z5678"
        );
      }
      expect(
        _trackRequest?.["ns:PackageIdentifier"]?.[0]?.["ns:Type"]?.[0]
      ).toEqual("TRACKING_NUMBER_OR_DOORTAG");
    });

    it("contains appropriate flags", () => {
      expect(_trackRequest).toHaveProperty("ns:IncludeDetailedScans");
      expect(_trackRequest["ns:IncludeDetailedScans"][0]).toBe("true");
    });
  });

  describe("validateResponse", () => {
    it("returns an error if response is not an xml document", (done) => {
      let errorReported = false;
      return _fedexClient.validateResponse("bad xml", function (err) {
        expect(expect(err)).toBeDefined();
        if (!errorReported) {
          done();
        }
        return (errorReported = true);
      });
    });

    it("returns an error if there's no track reply", (done) => {
      const badResponse = "<RandomXml>Random</RandomXml>";
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (
        err
      ) {
        expect(err).toBeDefined();
        return done();
      });
    });

    it("returns an error if track reply doesn't contain notifications", (done) => {
      const badResponse =
        '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity></TrackReply>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (
        err
      ) {
        expect(err).toBeDefined();
        return done();
      });
    });

    it("returns an error when there are no success notifications", (done) => {
      const badResponse =
        '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity><Notifications><Severity>SUCCESS</Severity><Source>trck</Source><Code>1</Code><Message>Request was successfully processed.</Message><LocalizedMessage>Request was successfully processed.</LocalizedMessage></Notifications></TrackReply>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (
        err
      ) {
        expect(err).toBeDefined();
        return done();
      });
    });

    it("returns track details when notifications indicate success", (done) => {
      const badResponse =
        '<TrackReply xmlns="http://fedex.com/ws/track/v5" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><HighestSeverity>SUCCESS</HighestSeverity><Notifications><Severity>SUCCESS</Severity><Source>trck</Source><Code>0</Code><Message>Request was successfully processed.</Message><LocalizedMessage>Request was successfully processed.</LocalizedMessage></Notifications><TrackDetails>details</TrackDetails></TrackReply>';
      return _fedexClient.validateResponse(_xmlHeader + badResponse, function (
        err,
        resp
      ) {
        expect(err).toBeNull();
        expect(resp).toBe("details");
        return done();
      });
    });
  });

  describe("integration tests", () => {
    let _package = null;

    describe("delivered package", () => {
      beforeAll(async () => {
        const promise = new Promise((resolve, reject) => {
          fs.readFile(
            "test/stub_data/fedex_delivered.xml",
            "utf8",
            (err, xmlDoc) =>
              _fedexClient.presentResponse(xmlDoc, "trk", function (err, resp) {
                expect(err).toBeFalsy();
                _package = resp;
                resolve();
              })
          );
        });
        return promise;
      });

      it("has a status of delivered", () =>
        expect(_package.status).toBe(STATUS_TYPES.DELIVERED));

      it("has a service type of fedex priority overnight", () =>
        expect(_package.service).toBe("FedEx Priority Overnight"));

      it("has a weight of 0.2 LB", () =>
        expect(_package.weight).toBe("0.2 LB"));

      it("has a destination of MD", () =>
        expect(_package.destination).toBe("MD"));

      it("has 7 activities", () => expect(_package.activities).toHaveLength(7));

      it("has first activity with timestamp, location and details", () => {
        const act = _package.activities[0];
        expect(act.timestamp).toEqual(new Date("2014-02-17T14:05:00.000Z"));
        expect(act.datetime).toBe("2014-02-17T09:05:00");
        expect(act.details).toBe("Delivered");
        expect(act.location).toBe("MD 21133");
      });

      it("has last activity with timestamp, location and details", () => {
        const act = _package.activities[6];
        expect(act.timestamp).toEqual(new Date("2014-02-15T15:57:00.000Z"));
        expect(act.details).toBe("Picked up");
        expect(act.location).toBe("East Hanover, NJ 07936");
      });
    });

    describe("in transit package with an activity with missing location", () => {
      beforeAll(async () => {
        const promise = new Promise((resolve, reject) => {
          fs.readFile(
            "test/stub_data/fedex_missing_location.xml",
            "utf8",
            (err, xmlDoc) =>
              _fedexClient.presentResponse(xmlDoc, "trk", function (err, resp) {
                expect(err).toBeFalsy();
                _package = resp;
                return resolve();
              })
          );
        });
        return promise;
      });

      it("has a status of in-transit", () =>
        expect(_package.status).toBe(STATUS_TYPES.EN_ROUTE));

      it("has a service type of FedEx SmartPost", () =>
        expect(_package.service).toBe("FedEx SmartPost"));

      it("has a weight of 1.2 LB", () =>
        expect(_package.weight).toBe("1.2 LB"));

      it("has a destination of Greenacres, WA", () =>
        expect(_package.destination).toBe("Greenacres, WA"));

      it("has 3 activities", () => expect(_package.activities).toHaveLength(3));

      it("has first activity with location Troutdale, OR 97060", () =>
        expect(_package.activities[0].location).toBe("Troutdale, OR 97060"));

      it("has second activity with no location", () =>
        expect(_package.activities[1].location).toBeFalsy());
    });
  });
});
