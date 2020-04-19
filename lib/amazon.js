(function() {
  var AmazonClient, ShipperClient, load, lowerCase, moment, request, titleCase, upperCase, upperCaseFirst;

  ({load} = require('cheerio'));

  moment = require('moment-timezone');

  request = require('request');

  ({titleCase, upperCaseFirst, lowerCase, upperCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  AmazonClient = (function() {
    var DAYS_OF_WEEK, MONTHS, STATUS_MAP;

    class AmazonClient extends ShipperClient {
      constructor(options) {
        super();
        this.options = options;
      }

      validateResponse(response, cb) {
        var $;
        $ = load(response, {
          normalizeWhitespace: true
        });
        return cb(null, {$, response});
      }

      getService() {}

      getWeight() {}

      getDestination(data) {
        var $, dest, response;
        if (data == null) {
          return;
        }
        ({$, response} = data);
        dest = $(".delivery-address").text();
        if (dest != null ? dest.length : void 0) {
          return this.presentLocationString(dest);
        }
      }

      getEta(data) {
        var $, arrival, day_num, day_of_week, eta, foundMonth, i, len, matchResult, month, response;
        if (data == null) {
          return;
        }
        eta = null;
        ({$, response} = data);
        matchResult = response.toString().match('"promiseMessage":"Arriving (.*?)"');
        if (matchResult == null) {
          matchResult = response.toString().match('"promiseMessage":"Now expected (.*?)"');
        }
        arrival = matchResult != null ? matchResult[1] : void 0;
        if (arrival != null ? arrival.match('today') : void 0) {
          eta = moment();
        } else if (arrival != null ? arrival.match('tomorrow') : void 0) {
          eta = moment().add(1, 'day');
        } else {
          if (arrival != null ? arrival.match('-') : void 0) {
            arrival = arrival.split('-')[1];
          }
          foundMonth = false;
          for (i = 0, len = MONTHS.length; i < len; i++) {
            month = MONTHS[i];
            if (upperCase(arrival).match(month)) {
              foundMonth = true;
            }
          }
          if (foundMonth) {
            eta = moment(arrival).year(moment().year());
          } else {
            for (day_of_week in DAYS_OF_WEEK) {
              day_num = DAYS_OF_WEEK[day_of_week];
              if (upperCase(arrival).match(day_of_week)) {
                eta = moment().day(day_num);
              }
            }
          }
        }
        if (!(eta != null ? eta.isValid() : void 0)) {
          return;
        }
        return eta != null ? eta.hour(20).minute(0).second(0).milliseconds(0) : void 0;
      }

      presentStatus(data) {
        var $, ref, response;
        ({$, response} = data);
        return STATUS_MAP[(ref = response.toString().match('"shortStatus":"(.*?)"')) != null ? ref[1] : void 0];
      }

      getActivitiesAndStatus(data) {
        var $, activities, cols, dateText, details, i, j, len, len1, location, ref, ref1, response, row, status, subrow, timeText, timestamp;
        activities = [];
        status = this.presentStatus(data);
        if (data == null) {
          return {activities, status};
        }
        ({$, response} = data);
        ref = $('#tracking-events-container').children('.a-container').children('.a-row');
        for (i = 0, len = ref.length; i < len; i++) {
          row = ref[i];
          if (!$(row).children('.tracking-event-date-header').length) {
            continue;
          }
          dateText = '';
          ref1 = $(row).children('.a-row');
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            subrow = ref1[j];
            subrow = $(subrow);
            cols = subrow.children('.a-column');
            if (subrow.hasClass('tracking-event-date-header')) {
              dateText = subrow.children('.tracking-event-date').text();
              if (dateText.split(',').length === 2) {
                dateText += `, ${moment().year()}`;
              }
            } else if (cols.length === 2) {
              details = $(cols[1]).find('.tracking-event-message').text();
              location = $(cols[1]).find('.tracking-event-location').text();
              timeText = $(cols[0]).find('.tracking-event-time').text();
              if (dateText != null ? dateText.length : void 0) {
                if (timeText != null ? timeText.length : void 0) {
                  timestamp = moment(`${dateText} ${timeText} +0000`).toDate();
                } else {
                  timestamp = moment(`${dateText} 00:00:00 +0000`).toDate();
                }
              }
              activities.push({timestamp, location, details});
            }
          }
        }
        return {activities, status};
      }

      requestOptions({orderID, orderingShipmentId}) {
        return {
          method: 'GET',
          gzip: true,
          headers: {
            'accept': 'text/html',
            'accept-encoding': 'gzip'
          },
          uri: "https://www.amazon.com/gp/css/shiptrack/view.html" + "/ref=pe_385040_121528360_TE_SIMP_typ?ie=UTF8" + `&orderID=${orderID}` + `&orderingShipmentId=${orderingShipmentId}` + "&packageId=1"
        };
      }

    };

    STATUS_MAP = {
      'ORDERED': ShipperClient.STATUS_TYPES.SHIPPING,
      'SHIPPED': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'IN_TRANSIT': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'OUT_FOR_DELIVERY': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'DELIVERED': ShipperClient.STATUS_TYPES.DELIVERED
    };

    MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

    DAYS_OF_WEEK = {
      'SUNDAY': 0,
      'MONDAY': 1,
      'TUESDAY': 2,
      'WEDNESDAY': 3,
      'THURSDAY': 4,
      'FRIDAY': 5,
      'SATURDAY': 6
    };

    return AmazonClient;

  }).call(this);

  module.exports = {AmazonClient};

}).call(this);
