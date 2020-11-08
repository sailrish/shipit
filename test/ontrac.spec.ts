/* eslint-disable
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
import { OnTracClient } from "../src/ontrac";
import { STATUS_TYPES } from "../src/shipper";

describe("on trac client", () => {
  let _onTracClient = null;

  beforeAll(() => (_onTracClient = new OnTracClient({})));

  describe("integration tests", () => {
    let _package = null;

    describe("in transit package", () => {
      beforeAll((done) =>
        fs.readFile(
          "test/stub_data/ontrac_intransit_details.html",
          "utf8",
          (e, r) =>
            _onTracClient.presentResponse(r, "trk", function (err, resp) {
              expect(err).toBeFalsy();
              _package = resp;
              return done();
            })
        )
      );

      function verifyActivity(act, ts, loc, details) {
        expect(act.timestamp).toEqual(new Date(ts));
        expect(act.location).toBe(loc);
        expect(act.details).toBe(details);
      }

      it("has a status of en route", () =>
        expect(_package.status).toBe(STATUS_TYPES.EN_ROUTE));

      it("has a destination of Palo Alto, CA", () =>
        expect(_package.destination).toBe("Palo Alto, CA"));

      it("has an eta of Oct 7th, 2015", () =>
        expect(_package.eta).toEqual(new Date("2015-10-07T23:59:59Z")));

      it("has a service of Caltrac", () =>
        expect(_package.service).toBe("Ground"));

      it("has a weight of 2 lbs.", () =>
        expect(_package.weight).toBe("2 lbs."));

      it("has 2 activities with timestamp, location and details", () => {
        expect(_package.activities).toHaveLength(2);
        verifyActivity(
          _package.activities[1],
          new Date("2015-10-04T20:00:00.000Z"),
          "SaltLake, UT",
          "Data entry"
        );
        return verifyActivity(
          _package.activities[0],
          new Date("2015-10-05T17:27:00.000Z"),
          "SaltLake, UT",
          "Package received at facility"
        );
      });
    });
  });
});
