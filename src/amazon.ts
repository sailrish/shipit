/* eslint-disable prefer-regex-literals,@typescript-eslint/prefer-regexp-exec */
/* eslint-disable
    camelcase,
    constructor-super,
    no-constant-condition,
    no-eval,
    no-this-before-super,
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
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { load } from "cheerio";
import { addDays, isValid, set, setDay } from "date-fns";
import { IShipperResponse, ShipperClient, STATUS_TYPES } from "./shipper";

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

class AmazonClient extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ["ORDERED", STATUS_TYPES.SHIPPING],
    ["SHIPPED", STATUS_TYPES.EN_ROUTE],
    ["IN_TRANSIT", STATUS_TYPES.EN_ROUTE],
    ["OUT_FOR_DELIVERY", STATUS_TYPES.OUT_FOR_DELIVERY],
    ["DELIVERED", STATUS_TYPES.DELIVERED],
  ]);

  async validateResponse(response: any): Promise<IShipperResponse> {
    const $ = load(response, { normalizeWhitespace: true });

    return Promise.resolve({ err: null, shipment: { $, response } });
  }

  getService() {
    return undefined;
  }

  getWeight() {
    return undefined;
  }

  getDestination(data) {
    if (data == null) {
      return;
    }
    const { $ } = data;
    const dest = $(".delivery-address").text();
    if (dest != null ? dest.length : undefined) {
      return this.presentLocationString(dest);
    }
  }

  getEta(data) {
    if (data == null) {
      return;
    }
    let eta: Date = null;
    const baseDate = set(new Date(), {
      hours: 20,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });
    const { response } = data;
    let matchResult = response
      .toString()
      .match('"promiseMessage":"Arriving (.*?)"');
    if (matchResult == null) {
      matchResult = response
        .toString()
        .match('"promiseMessage":"Now expected (.*?)"');
    }
    let arrival: string = matchResult != null ? matchResult[1] : undefined;
    if (arrival != null ? new RegExp("today").exec(arrival) : undefined) {
      eta = baseDate;
    } else if (
      arrival != null ? new RegExp("tomorrow").exec(arrival) : undefined
    ) {
      eta = addDays(baseDate, 1);
    } else {
      if (arrival != null ? new RegExp("-").exec(arrival) : undefined) {
        arrival = arrival.split("-")[1]; // Get latest possible ETA
      }
      let foundMonth = false;
      for (const month of Array.from(MONTHS)) {
        if (arrival?.toUpperCase().match(month)) {
          foundMonth = true;
        }
      }
      if (foundMonth) {
        eta = set(new Date(arrival), {
          year: new Date().getUTCFullYear(),
          hours: 20,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        });
      } else {
        for (const dayOfWeek in DAYS_OF_WEEK) {
          const dayNum = DAYS_OF_WEEK[dayOfWeek];
          if (arrival?.toUpperCase().match(dayOfWeek)) {
            eta = setDay(baseDate, dayNum);
          }
        }
      }
    }
    if (!(eta ? isValid(eta) : undefined)) {
      return;
    }
    return eta != null ? eta : undefined;
  }

  presentStatus(data) {
    const { response } = data;
    const matches = response.toString().match('"shortStatus":"(.*?)"');
    return matches?.length > 0 ? this.STATUS_MAP.get(matches[1]) : undefined;
  }

  getActivitiesAndStatus(data) {
    const activities = [];
    const status = this.presentStatus(data);
    if (data == null) {
      return { activities, status };
    }
    const { $ } = data;
    for (const row of Array.from(
      $("#tracking-events-container")
        .children(".a-container")
        .children(".a-row")
    )) {
      if (!$(row).children(".tracking-event-date-header").length) {
        continue;
      }
      let dateText = "";
      const rows: any[] = Array.from($(row).children(".a-row"));
      for (let subrow of rows) {
        subrow = $(subrow);
        const cols = subrow.children(".a-column");
        if (subrow.hasClass("tracking-event-date-header")) {
          dateText = subrow.children(".tracking-event-date").text();
          if (dateText.split(",").length === 2) {
            dateText += `, ${new Date().getUTCFullYear()}`;
          }
        } else if (cols.length === 2) {
          let timestamp;
          const details = $(cols[1]).find(".tracking-event-message").text();
          const location = $(cols[1]).find(".tracking-event-location").text();
          const timeText = $(cols[0]).find(".tracking-event-time").text();
          if (dateText ? dateText.length : undefined) {
            if (timeText != null ? timeText.length : undefined) {
              timestamp = new Date(`${dateText} ${timeText} +0000`);
            } else {
              timestamp = new Date(`${dateText} 00:00:00 +0000`);
            }
          }
          activities.push({ timestamp, location, details });
        }
      }
    }
    return { activities, status };
  }

  requestOptions({ orderID, orderingShipmentId }) {
    return {
      method: "GET",
      gzip: true,
      headers: {
        accept: "text/html",
        "accept-encoding": "gzip",
      },
      uri:
        "https://www.amazon.com/gp/css/shiptrack/view.html" +
        "/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8" +
        `&orderID=${orderID}` +
        `&orderingShipmentId=${orderingShipmentId}` +
        "&packageId=1",
    };
  }
}

export { AmazonClient };
