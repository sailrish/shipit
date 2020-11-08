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
import { PrestigeClient } from "../src/prestige";
import { STATUS_TYPES } from "../src/shipper";

describe("prestige client", () => {
  let _presClient = null;

  beforeAll(() => (_presClient = new PrestigeClient({})));

  describe("requestOptions", () => {
    let _options = null;

    beforeAll(
      () =>
        (_options = _presClient.requestOptions({
          trackingNumber: "PS80558274",
        }))
    );

    it("creates a GET request", () => expect(_options.method).toBe("GET"));

    it("uses the correct URL", () =>
      expect(_options.uri).toBe(
        "http://www.prestigedelivery.com/TrackingHandler.ashx?trackingNumbers=PS80558274"
      ));
  });

  describe("integration tests", () => {
    let _package = null;
    let _activity = null;

    describe("out for delivery package", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/prestige_delivered.json",
          "utf8",
          (err, doc) =>
            _presClient.presentResponse(doc, "trk", function (err, resp) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      it("has a status of delivered", () =>
        expect(_package.status).toBe(STATUS_TYPES.DELIVERED));

      it("has an eta of Oct 20", () =>
        expect(_package.eta).toEqual(new Date("2015-10-20T00:00:00.000Z")));

      it("has a destination of Bloomfield Hills", () =>
        expect(_package.destination).toBe("Bloomfield Hills, MI 48304-3264"));

      describe("has one activity", () => {
        beforeAll(() => {
          _activity = _package.activities[0];
          expect(_activity).toBeDefined();
        });

        it("with timestamp Oct 19th, 2:39pm", () =>
          expect(_activity.timestamp).toEqual(
            new Date("2015-10-19T14:39:00Z")
          ));

        it("with location Taylor, MI", () =>
          expect(_activity.location).toBe("Taylor, MI 48180"));

        it("with details Out-for-delivery", () =>
          expect(_activity.details).toBe("Delivered"));
      });

      describe("has next activity", () => {
        beforeAll(() => {
          _activity = _package.activities[1];
          expect(_activity).toBeDefined();
        });

        it("with timestamp Oct 19th, 12:53pm", () =>
          expect(_activity.timestamp).toEqual(
            new Date("2015-10-19T12:53:00Z")
          ));

        it("with location Taylor, MI", () =>
          expect(_activity.location).toBe("Taylor, MI 48180"));

        it("with details Out-for-delivery", () =>
          expect(_activity.details).toBe("Out for delivery"));
      });

      describe("has another activity", () => {
        beforeAll(() => {
          _activity = _package.activities[2];
          expect(_activity).toBeDefined();
        });

        it("with timestamp Oct 19th, 6:31am", () =>
          expect(_activity.timestamp).toEqual(
            new Date("2015-10-19T06:31:00Z")
          ));

        it("with location Taylor, MI", () =>
          expect(_activity.location).toBe("Taylor, MI 48180"));

        it("with details Out-for-delivery", () =>
          expect(_activity.details).toBe("Shipment received by carrier"));
      });

      describe("has first activity", () => {
        beforeAll(() => {
          _activity = _package.activities[3];
          expect(_activity).toBeDefined();
        });

        it("with timestamp Oct 18th, 3:55pm", () =>
          expect(_activity.timestamp).toEqual(
            new Date("2015-10-18T15:55:00Z")
          ));

        it("with location Taylor, MI", () =>
          expect(_activity.location).toBe("Jeffersonville, IN 47130"));

        it("with details Out-for-delivery", () =>
          expect(_activity.details).toBe(
            "Prestige has not yet received this shipment"
          ));
      });
    });
  });
});
