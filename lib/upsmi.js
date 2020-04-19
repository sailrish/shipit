(function() {
  var ShipperClient, UpsMiClient, load, lowerCase, moment, titleCase, upperCaseFirst;

  ({load} = require('cheerio'));

  moment = require('moment-timezone');

  ({titleCase, upperCaseFirst, lowerCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  UpsMiClient = (function() {
    var STATUS_MAP;

    class UpsMiClient extends ShipperClient {
      constructor(options) {
        STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered'];
        STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = ['transferred', 'received', 'processed', 'sorted', 'post office entry'];
        STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for post office delivery'];
        STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['shipment information received'];
        super();
        this.options = options;
      }

      validateResponse(response, cb) {
        var $, miDetails, ref, summary, uspsDetails;
        $ = load(response, {
          normalizeWhitespace: true
        });
        summary = (ref = $('#Table6').find('table')) != null ? ref[0] : void 0;
        uspsDetails = $('#ctl00_mainContent_ctl00_pnlUSPS > table');
        miDetails = $('#ctl00_mainContent_ctl00_pnlMI > table');
        return cb(null, {$, summary, uspsDetails, miDetails});
      }

      extractSummaryField(data, name) {
        var $, summary, value;
        value = null;
        ({$, summary} = data);
        if (summary == null) {
          return;
        }
        $(summary).children('tr').each(function(rindex, row) {
          $(row).children('td').each(function(cindex, col) {
            var ref, ref1, regex;
            regex = new RegExp(name);
            if (regex.test($(col).text())) {
              value = (ref = $(col).next()) != null ? (ref1 = ref.text()) != null ? ref1.trim() : void 0 : void 0;
            }
            if (value != null) {
              return false;
            }
          });
          if (value != null) {
            return false;
          }
        });
        return value;
      }

      getEta(data) {
        var eta, formattedEta;
        eta = this.extractSummaryField(data, 'Projected Delivery Date');
        if (eta != null) {
          formattedEta = moment(`${eta} 00:00 +0000`);
        }
        if (formattedEta != null ? formattedEta.isValid() : void 0) {
          return formattedEta.toDate();
        } else {
          return void 0;
        }
      }

      getService() {}

      getWeight(data) {
        var weight;
        weight = this.extractSummaryField(data, 'Weight');
        if (weight != null ? weight.length : void 0) {
          return `${weight} lbs.`;
        }
      }

      presentStatus(details) {
        var i, len, matchStrings, regex, status, statusCode, text;
        status = null;
        for (statusCode in STATUS_MAP) {
          matchStrings = STATUS_MAP[statusCode];
          for (i = 0, len = matchStrings.length; i < len; i++) {
            text = matchStrings[i];
            regex = new RegExp(text, 'i');
            if (regex.test(lowerCase(details))) {
              status = statusCode;
              break;
            }
          }
          if (status != null) {
            break;
          }
        }
        if (status != null) {
          return parseInt(status, 10);
        }
      }

      extractTimestamp(tsString) {
        if (tsString.match(':')) {
          return moment(`${tsString} +0000`).toDate();
        } else {
          return moment(`${tsString} 00:00 +0000`).toDate();
        }
      }

      extractActivities($, table) {
        var activities;
        activities = [];
        $(table).children('tr').each((rindex, row) => {
          var details, location, timestamp;
          if (rindex === 0) {
            return;
          }
          details = location = timestamp = null;
          $(row).children('td').each((cindex, col) => {
            var ref, ref1, value;
            value = (ref = $(col)) != null ? (ref1 = ref.text()) != null ? ref1.trim() : void 0 : void 0;
            switch (cindex) {
              case 0:
                return timestamp = this.extractTimestamp(value);
              case 1:
                return details = value;
              case 2:
                return location = this.presentLocationString(value);
            }
          });
          if ((details != null) && (timestamp != null)) {
            return activities.push({details, location, timestamp});
          }
        });
        return activities;
      }

      getActivitiesAndStatus(data) {
        var $, activities, activity, i, len, miDetails, ref, set1, set2, status, uspsDetails;
        status = null;
        ({$, uspsDetails, miDetails} = data);
        set1 = this.extractActivities($, uspsDetails);
        set2 = this.extractActivities($, miDetails);
        activities = set1.concat(set2);
        ref = activities || [];
        for (i = 0, len = ref.length; i < len; i++) {
          activity = ref[i];
          if (status != null) {
            break;
          }
          status = this.presentStatus(activity != null ? activity.details : void 0);
        }
        return {activities, status};
      }

      getDestination(data) {
        var destination;
        destination = this.extractSummaryField(data, 'Zip Code');
        if (destination != null ? destination.length : void 0) {
          return destination;
        }
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `http://www.ups-mi.net/packageID/PackageID.aspx?PID=${trackingNumber}`
        };
      }

    };

    STATUS_MAP = {};

    return UpsMiClient;

  }).call(this);

  module.exports = {UpsMiClient};

}).call(this);
