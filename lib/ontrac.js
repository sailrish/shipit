(function() {
  var OnTracClient, ShipperClient, async, load, lowerCase, moment, request, titleCase, upperCaseFirst;

  ({load} = require('cheerio'));

  moment = require('moment-timezone');

  async = require('async');

  request = require('request');

  ({titleCase, upperCaseFirst, lowerCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  OnTracClient = (function() {
    var LOCATION_STATES, STATUS_MAP;

    class OnTracClient extends ShipperClient {
      constructor(options) {
        super();
        this.options = options;
      }

      validateResponse(response, cb) {
        var data;
        data = load(response, {
          normalizeWhitespace: true
        });
        return cb(null, data);
      }

      extractSummaryField(shipment, name) {
        var $, value;
        value = null;
        $ = shipment;
        if ($ == null) {
          return;
        }
        $('td[bgcolor="#ffd204"]').each(function(index, element) {
          var ref, ref1, regex;
          regex = new RegExp(name);
          if (!regex.test($(element).text())) {
            return;
          }
          value = (ref = $(element).next()) != null ? (ref1 = ref.text()) != null ? ref1.trim() : void 0 : void 0;
          return false;
        });
        return value;
      }

      getEta(shipment) {
        var eta, regexMatch;
        eta = this.extractSummaryField(shipment, 'Service Commitment');
        if (eta == null) {
          return;
        }
        regexMatch = eta.match('(.*) by (.*)');
        if ((regexMatch != null ? regexMatch.length : void 0) > 1) {
          eta = `${regexMatch[1]} 23:59:59 +00:00`;
        }
        return moment(eta).toDate();
      }

      getService(shipment) {
        var service;
        service = this.extractSummaryField(shipment, 'Service Code');
        if (service == null) {
          return;
        }
        return titleCase(service);
      }

      getWeight(shipment) {
        return this.extractSummaryField(shipment, 'Weight');
      }

      presentAddress(location) {
        var addressState;
        addressState = LOCATION_STATES[location];
        if (addressState != null) {
          return `${location}, ${addressState}`;
        } else {
          return location;
        }
      }

      presentStatus(status) {
        var ref, statusType;
        status = status != null ? (ref = status.replace('DETAILS', '')) != null ? ref.trim() : void 0 : void 0;
        if (!(status != null ? status.length : void 0)) {
          return ShipperClient.STATUS_TYPES.UNKNOWN;
        }
        statusType = STATUS_MAP[status];
        if (statusType != null) {
          return statusType;
        } else {
          return ShipperClient.STATUS_TYPES.UNKNOWN;
        }
      }

      presentTimestamp(ts) {
        if (ts == null) {
          return;
        }
        ts = ts.replace(/AM$/, ' AM').replace(/PM$/, ' PM');
        return moment(`${ts} +0000`).toDate();
      }

      getActivitiesAndStatus(shipment) {
        var $, activities, status;
        activities = [];
        status = this.presentStatus(this.extractSummaryField(shipment, 'Delivery Status'));
        $ = shipment;
        if ($ == null) {
          return {activities, status};
        }
        $("#trkdetail table table").children('tr').each((rowIndex, row) => {
          var details, fields, location, timestamp;
          if (!(rowIndex > 0)) {
            return;
          }
          fields = [];
          $(row).find('td').each(function(colIndex, col) {
            return fields.push($(col).text().trim());
          });
          if (fields.length) {
            if (fields[0].length) {
              details = upperCaseFirst(lowerCase(fields[0]));
            }
            timestamp = this.presentTimestamp(fields[1]);
            if (fields[2].length) {
              location = this.presentAddress(fields[2]);
            }
            if ((details != null) && (timestamp != null)) {
              return activities.unshift({details, timestamp, location});
            }
          }
        });
        return {activities, status};
      }

      getDestination(shipment) {
        var destination;
        destination = this.extractSummaryField(shipment, 'Deliver To');
        return this.presentLocationString(destination);
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `https://www.ontrac.com/trackingdetail.asp?tracking=${trackingNumber}&run=0`
        };
      }

    };

    LOCATION_STATES = {
      'Ontario': 'CA',
      'Bakersfield': 'CA',
      'Denver': 'CO',
      'Vancouver': 'WA',
      'Orange': 'CA',
      'Hayward': 'CA',
      'Phoenix': 'AZ',
      'Sacramento': 'CA',
      'Vegas': 'NV',
      'Los Angeles': 'CA',
      'Santa Maria': 'CA',
      'Eugene': 'OR',
      'Commerce': 'CA',
      'Kettleman City': 'CA',
      'Menlo Park': 'CA',
      'San Jose': 'CA',
      'Burbank': 'CA',
      'Ventura': 'CA',
      'Petaluma': 'CA',
      'Corporate': 'CA',
      'Medford': 'OR',
      'Monterey': 'CA',
      'San Francisco': 'CA',
      'Stockton': 'CA',
      'San Diego': 'CA',
      'Fresno': 'CA',
      'Salt Lake': 'UT',
      'SaltLake': 'UT',
      'Concord': 'CA',
      'Tucson': 'AZ',
      'Reno': 'NV',
      'Seattle': 'WA'
    };

    STATUS_MAP = {
      'DELIVERED': ShipperClient.STATUS_TYPES.DELIVERED,
      'OUT FOR DELIVERY': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'PACKAGE RECEIVED AT FACILITY': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'IN TRANSIT': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'DATA ENTRY': ShipperClient.STATUS_TYPES.SHIPPING
    };

    return OnTracClient;

  }).call(this);

  module.exports = {OnTracClient};

}).call(this);
