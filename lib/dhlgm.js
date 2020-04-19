(function() {
  var DhlGmClient, ShipperClient, load, lowerCase, moment, titleCase, upperCaseFirst;

  ({load} = require('cheerio'));

  moment = require('moment-timezone');

  ({titleCase, upperCaseFirst, lowerCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  DhlGmClient = (function() {
    var STATUS_MAP;

    class DhlGmClient extends ShipperClient {
      constructor(options) {
        STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered'];
        STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = ['transferred', 'cleared', 'received', 'processed', 'sorted', 'sorting complete', 'arrival', 'tendered'];
        STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for delivery'];
        STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['electronic notification received'];
        super();
        this.options = options;
      }

      validateResponse(response, cb) {
        var error;
        try {
          response = response.replace(/<br>/gi, ' ');
          return cb(null, load(response, {
            normalizeWhitespace: true
          }));
        } catch (error1) {
          error = error1;
          return cb(error);
        }
      }

      extractSummaryField(data, name) {
        var $, regex, value;
        if (data == null) {
          return;
        }
        $ = data;
        value = void 0;
        regex = new RegExp(name);
        $(".card-info > dl").children().each(function(findex, field) {
          var ref, ref1;
          if (regex.test($(field).text())) {
            value = (ref = $(field).next()) != null ? (ref1 = ref.text()) != null ? ref1.trim() : void 0 : void 0;
          }
          if (value != null) {
            return false;
          }
        });
        return value;
      }

      extractHeaderField(data, name) {
        var $, regex, value;
        if (data == null) {
          return;
        }
        $ = data;
        value = void 0;
        regex = new RegExp(name);
        $(".card > .row").children().each(function(findex, field) {
          $(field).children().each(function(cindex, col) {
            return $(col).find('dt').each(function(dindex, element) {
              var ref, ref1;
              if (regex.test($(element).text())) {
                return value = (ref = $(element).next()) != null ? (ref1 = ref.text()) != null ? ref1.trim() : void 0 : void 0;
              }
            });
          });
          if (value != null) {
            return false;
          }
        });
        return value;
      }

      getEta(data) {
        var $, eta;
        if (data == null) {
          return;
        }
        $ = data;
        eta = $(".status-info > .row .est-delivery > p").text();
        if (!(eta != null ? eta.length : void 0)) {
          return;
        }
        return moment(`${eta} 23:59:59 +00:00`).toDate();
      }

      getService(data) {
        return this.extractSummaryField(data, 'Service');
      }

      getWeight(data) {
        return this.extractSummaryField(data, 'Weight');
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

      getActivitiesAndStatus(data) {
        var $, activities, currentDate, currentTime, details, i, len, location, ref, ref1, ref2, row, rowData, status, timestamp;
        status = null;
        activities = [];
        if (data == null) {
          return {activities, status};
        }
        $ = data;
        currentDate = null;
        ref = $(".timeline").children() || [];
        for (i = 0, len = ref.length; i < len; i++) {
          rowData = ref[i];
          row = $(rowData);
          if (row.hasClass('timeline-date')) {
            currentDate = row.text();
          }
          if (row.hasClass('timeline-event')) {
            currentTime = row.find(".timeline-time").text();
            if (currentTime != null ? currentTime.length : void 0) {
              if (currentTime != null ? currentTime.length : void 0) {
                currentTime = (ref1 = currentTime.trim().split(' ')) != null ? ref1[0] : void 0;
              }
              currentTime = currentTime.replace('AM', ' AM').replace('PM', ' PM');
              currentTime += " +00:00";
              timestamp = moment(`${currentDate} ${currentTime}`).toDate();
            }
            location = row.find(".timeline-location-responsive").text();
            location = location != null ? location.trim() : void 0;
            if (location != null ? location.length : void 0) {
              location = upperCaseFirst(location);
            }
            details = (ref2 = row.find(".timeline-description").text()) != null ? ref2.trim() : void 0;
            if ((details != null) && (timestamp != null)) {
              if (status == null) {
                status = this.presentStatus(details);
              }
              activities.push({details, location, timestamp});
            }
          }
        }
        return {activities, status};
      }

      getDestination(data) {
        return this.extractHeaderField(data, 'To:');
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `http://webtrack.dhlglobalmail.com/?trackingnumber=${trackingNumber}`
        };
      }

    };

    STATUS_MAP = {};

    return DhlGmClient;

  }).call(this);

  module.exports = {DhlGmClient};

}).call(this);
