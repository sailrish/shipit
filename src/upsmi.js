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
import { titleCase, upperCaseFirst, lowerCase } from 'change-case';
import { ShipperClient } from './shipper';

var UpsMiClient = (function() {
  let STATUS_MAP = undefined;
  UpsMiClient = class UpsMiClient extends ShipperClient {
    static initClass() {
      STATUS_MAP = {};
    }

    constructor(options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.options = options;
      STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered'];
      STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = ['transferred', 'received', 'processed', 'sorted', 'post office entry'];
      STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for post office delivery'];
      STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['shipment information received'];
      super();
    }

    validateResponse(response, cb) {
      const $ = load(response, {normalizeWhitespace: true});
      const summary = __guard__($('#Table6').find('table'), x => x[0]);
      const uspsDetails = $('#ctl00_mainContent_ctl00_pnlUSPS > table');
      const miDetails = $('#ctl00_mainContent_ctl00_pnlMI > table');
      return cb(null, {$, summary, uspsDetails, miDetails});
    }

    extractSummaryField(data, name) {
      let value=null;
      const {$, summary} = data;
      if (summary == null) { return; }
      $(summary).children('tr').each(function(rindex, row) {
        $(row).children('td').each(function(cindex, col) {
          const regex = new RegExp(name);
          if (regex.test($(col).text())) {
            value = __guard__(__guard__($(col).next(), x1 => x1.text()), x => x.trim());
          }
          if (value != null) { return false; }
        });
        if (value != null) { return false; }
      });
      return value;
    }

    getEta(data) {
      let formattedEta;
      const eta = this.extractSummaryField(data, 'Projected Delivery Date');
      if (eta != null) { formattedEta = moment(`${eta} 00:00 +0000`); }
      if ((formattedEta != null ? formattedEta.isValid() : undefined)) { return formattedEta.toDate(); } else { return undefined; }
    }

    getService() {}

    getWeight(data) {
      const weight = this.extractSummaryField(data, 'Weight');
      if (weight != null ? weight.length : undefined) { return `${weight} lbs.`; }
    }

    presentStatus(details) {
      let status = null;
      for (let statusCode in STATUS_MAP) {
        const matchStrings = STATUS_MAP[statusCode];
        for (let text of Array.from(matchStrings)) {
          const regex = new RegExp(text, 'i');
          if (regex.test(lowerCase(details))) {
            status = statusCode;
            break;
          }
        }
        if (status != null) { break; }
      }
      if (status != null) { return parseInt(status, 10); }
    }

    extractTimestamp(tsString) {
      if (tsString.match(':')) {
        return moment(`${tsString} +0000`).toDate();
      } else {
        return moment(`${tsString} 00:00 +0000`).toDate();
      }
    }

    extractActivities($, table) {
      const activities = [];
      $(table).children('tr').each((rindex, row) => {
        let location, timestamp;
        if (rindex === 0) { return; }
        let details = (location = (timestamp = null));
        $(row).children('td').each((cindex, col) => {
          const value = __guard__(__guard__($(col), x1 => x1.text()), x => x.trim());
          switch (cindex) {
            case 0: return timestamp = this.extractTimestamp(value);
            case 1: return details = value;
            case 2: return location = this.presentLocationString(value);
          }
        });
        if ((details != null) && (timestamp != null)) {
          return activities.push({details, location, timestamp});
        }
    });
      return activities;
    }

    getActivitiesAndStatus(data) {
      let status = null;
      const {$, uspsDetails, miDetails} = data;
      const set1 = this.extractActivities($, uspsDetails);
      const set2 = this.extractActivities($, miDetails);
      const activities = set1.concat(set2);
      for (let activity of Array.from(activities || [])) {
        if (status != null) { break; }
        status = this.presentStatus(activity != null ? activity.details : undefined);
      }

      return {activities, status};
    }

    getDestination(data) {
      const destination = this.extractSummaryField(data, 'Zip Code');
      if (destination != null ? destination.length : undefined) { return destination; }
    }

    requestOptions({trackingNumber}) {
      return {
        method: 'GET',
        uri: `http://www.ups-mi.net/packageID/PackageID.aspx?PID=${trackingNumber}`
      };
    }
  };
  UpsMiClient.initClass();
  return UpsMiClient;
})();

export default {UpsMiClient};


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}