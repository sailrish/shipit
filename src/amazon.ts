/* eslint-disable
    camelcase,
    constructor-super,
    no-constant-condition,
    no-eval,
    no-this-before-super,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { load } from 'cheerio';
import moment from 'moment-timezone';
import { ShipperClient, STATUS_TYPES } from './shipper';

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

class AmazonClient extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ['ORDERED', STATUS_TYPES.SHIPPING],
    ['SHIPPED', STATUS_TYPES.EN_ROUTE],
    ['IN_TRANSIT', STATUS_TYPES.EN_ROUTE],
    ['OUT_FOR_DELIVERY', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['DELIVERED', STATUS_TYPES.DELIVERED],
  ]);

  constructor(options) {
    super();
    this.options = options;
  }

  validateResponse(response, cb) {
    const $ = load(response, { normalizeWhitespace: true });
    return cb(null, { $, response });
  }

  getService() { }

  getWeight() { }

  getDestination(data) {
    if (data == null) { return; }
    const { $ } = data;
    const dest = $('.delivery-address').text();
    if (dest != null ? dest.length : undefined) { return this.presentLocationString(dest); }
  }

  getEta(data) {
    if (data == null) { return; }
    let eta = null;
    const { response } = data;
    let matchResult = response.toString().match('"promiseMessage":"Arriving (.*?)"');
    if (matchResult == null) { matchResult = response.toString().match('"promiseMessage":"Now expected (.*?)"'); }
    let arrival: string = matchResult != null ? matchResult[1] : undefined;
    if (arrival != null ? arrival.match('today') : undefined) {
      eta = moment();
    } else if (arrival != null ? arrival.match('tomorrow') : undefined) {
      eta = moment().add(1, 'day');
    } else {
      if (arrival != null ? arrival.match('-') : undefined) {
        arrival = arrival.split('-')[1];
      }
      let foundMonth = false;
      for (const month of Array.from(MONTHS)) {
        if (arrival?.toUpperCase().match(month)) {
          foundMonth = true;
        }
      }
      if (foundMonth) {
        eta = moment(arrival).year(moment().year());
      } else {
        for (const day_of_week in DAYS_OF_WEEK) {
          const day_num = DAYS_OF_WEEK[day_of_week];
          if (arrival?.toUpperCase().match(day_of_week)) {
            eta = moment().day(day_num);
          }
        }
      }
    }
    if (!(eta != null ? eta.isValid() : undefined)) { return; }
    return (eta != null ? eta.hour(20).minute(0).second(0).milliseconds(0) : undefined);
  }

  presentStatus(data) {
    const { response } = data;
    return this.STATUS_MAP.get(__guard__(response.toString().match('"shortStatus":"(.*?)"'), x => x[1]));
  }

  getActivitiesAndStatus(data) {
    const activities = [];
    const status = this.presentStatus(data);
    if (data == null) { return { activities, status }; }
    const { $ } = data;
    for (const row of Array.from($('#tracking-events-container').children('.a-container').children('.a-row'))) {
      if (!$(row).children('.tracking-event-date-header').length) { continue; }
      let dateText = '';
      const rows: any[] = Array.from($(row).children('.a-row'));
      for (let subrow of rows) {
        subrow = $(subrow);
        const cols = subrow.children('.a-column');
        if (subrow.hasClass('tracking-event-date-header')) {
          dateText = subrow.children('.tracking-event-date').text();
          if (dateText.split(',').length === 2) { dateText += `, ${moment().year()}`; }
        } else if (cols.length === 2) {
          let timestamp;
          const details = $(cols[1]).find('.tracking-event-message').text();
          const location = $(cols[1]).find('.tracking-event-location').text();
          const timeText = $(cols[0]).find('.tracking-event-time').text();
          if (dateText != null ? dateText.length : undefined) {
            if ((timeText != null ? timeText.length : undefined)) {
              timestamp = moment(`${dateText} ${timeText} +0000`).toDate();
            } else {
              timestamp = moment(`${dateText} 00:00:00 +0000`).toDate();
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
      method: 'GET',
      gzip: true,
      headers: {
        accept: 'text/html',
        'accept-encoding': 'gzip'
      },
      uri: 'https://www.amazon.com/gp/css/shiptrack/view.html' +
        '/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8' +
        `&orderID=${orderID}` +
        `&orderingShipmentId=${orderingShipmentId}` +
        '&packageId=1'
    };
  }
};

export { AmazonClient };
