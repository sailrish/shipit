/* eslint-disable
    constructor-super,
    no-constant-condition,
    no-eval,
    no-return-assign,
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
import { upperCaseFirst } from 'change-case';
import { ShipperClient, STATUS_TYPES } from './shipper';

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

class DhlGmClient extends ShipperClient {

  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ['electronic notification received', STATUS_TYPES.SHIPPING],
    ['out for delivery', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['transferred', STATUS_TYPES.EN_ROUTE],
    ['cleared', STATUS_TYPES.EN_ROUTE],
    ['received', STATUS_TYPES.EN_ROUTE],
    ['processed', STATUS_TYPES.EN_ROUTE],
    ['sorted', STATUS_TYPES.EN_ROUTE],
    ['sorting complete', STATUS_TYPES.EN_ROUTE],
    ['arrival', STATUS_TYPES.EN_ROUTE],
    ['tendered', STATUS_TYPES.EN_ROUTE],
    ['delivered', STATUS_TYPES.DELIVERED]
  ]);

  constructor(options) {
    super();
    this.options = options;
  }

  validateResponse(response, cb) {
    try {
      response = response.replace(/<br>/gi, ' ');
      return cb(null, load(response, { normalizeWhitespace: true }));
    } catch (error) {
      return cb(error);
    }
  }

  extractSummaryField(data, name) {
    if (data == null) { return; }
    const $ = data;
    let value;
    const regex = new RegExp(name);
    $('.card-info > dl').children().each(function (findex, field) {
      if (regex.test($(field).text())) {
        value = __guard__(__guard__($(field).next(), x1 => x1.text()), x => x.trim());
      }
      if (value != null) { return false; }
    });
    return value;
  }

  extractHeaderField(data, name) {
    if (data == null) { return; }
    const $ = data;
    let value;
    const regex = new RegExp(name);
    $('.card > .row').children().each(function (findex, field) {
      $(field).children().each((cindex, col) => $(col).find('dt').each(function (dindex, element) {
        if (regex.test($(element).text())) {
          return value = __guard__(__guard__($(element).next(), x1 => x1.text()), x => x.trim());
        }
      }));
      if (value != null) { return false; }
    });
    return value;
  }

  getEta(data) {
    if (data == null) { return; }
    const $ = data;
    const eta = $('.status-info > .row .est-delivery > p').text();
    if (!(eta != null ? eta.length : undefined)) { return; }
    return moment(`${eta} 23:59:59 +00:00`).toDate();
  }

  getService(data) {
    return this.extractSummaryField(data, 'Service');
  }

  getWeight(data) {
    return this.extractSummaryField(data, 'Weight');
  }

  findStatusFromMap(statusText) {
    let status = STATUS_TYPES.UNKNOWN;
    if (statusText && statusText.length > 0) {
      for (const [key, value] of this.STATUS_MAP) {
        if (statusText?.toLowerCase().includes(key?.toLowerCase())) {
          status = value;
          break;
        }
      }
    }
    return status;
  }

  presentStatus(details) {
    return this.findStatusFromMap(details);
  }

  getActivitiesAndStatus(data) {
    let status = null;
    const activities = [];
    if (data == null) { return { activities, status }; }
    const $ = data;
    let currentDate = null;
    for (const rowData of Array.from($('.timeline').children() || [])) {
      const row = $(rowData);
      if (row.hasClass('timeline-date')) { currentDate = row.text(); }
      if (row.hasClass('timeline-event')) {
        let timestamp;
        let currentTime = row.find('.timeline-time').text();
        if (currentTime != null ? currentTime.length : undefined) {
          if (currentTime != null ? currentTime.length : undefined) { currentTime = __guard__(currentTime.trim().split(' '), x => x[0]); }
          currentTime = currentTime.replace('AM', ' AM').replace('PM', ' PM');
          currentTime += ' +00:00';
          timestamp = moment(`${currentDate} ${currentTime}`).toDate();
        }
        let location = row.find('.timeline-location-responsive').text();
        location = location != null ? location.trim() : undefined;
        if (location != null ? location.length : undefined) { location = upperCaseFirst(location); }
        const details = __guard__(row.find('.timeline-description').text(), x1 => x1.trim());
        if ((details != null) && (timestamp != null)) {
          if (status == null) { status = this.presentStatus(details); }
          activities.push({ details, location, timestamp });
        }
      }
    }
    return { activities, status };
  }

  getDestination(data) {
    return this.extractHeaderField(data, 'To:');
  }

  requestOptions({ trackingNumber }) {
    return {
      method: 'GET',
      uri: `http://webtrack.dhlglobalmail.com/?trackingnumber=${trackingNumber}`
    };
  }
}

export { DhlGmClient };
