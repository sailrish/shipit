(function() {
  var CanadaPostClient, Parser, ShipperClient, find, moment, titleCase;

  ({Parser} = require('xml2js'));

  ({find} = require('underscore'));

  moment = require('moment-timezone');

  ({titleCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  CanadaPostClient = (function() {
    var STATUS_MAP;

    class CanadaPostClient extends ShipperClient {
      constructor({username, password}, options) {
        super();
        this.username = username;
        this.password = password;
        this.options = options;
        this.parser = new Parser();
      }

      validateResponse(response, cb) {
        var handleResponse;
        handleResponse = function(xmlErr, trackResult) {
          var details;
          if ((xmlErr != null) || (trackResult == null)) {
            return cb(xmlErr);
          }
          details = trackResult['tracking-detail'];
          if (details == null) {
            return cb('response not recognized');
          }
          return cb(null, details);
        };
        this.parser.reset();
        return this.parser.parseString(response, handleResponse);
      }

      findStatusFromMap(statusText) {
        var regex, status, statusCode, text;
        status = ShipperClient.STATUS_TYPES.UNKNOWN;
        if (!(statusText != null ? statusText.length : void 0)) {
          return status;
        }
        for (text in STATUS_MAP) {
          statusCode = STATUS_MAP[text];
          regex = new RegExp(text, 'i');
          if (regex.test(statusText)) {
            status = statusCode;
            break;
          }
        }
        return status;
      }

      getStatus(lastEvent) {
        return this.findStatusFromMap(lastEvent != null ? lastEvent.details : void 0);
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, city, details, event, events, i, len, location, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, stateCode, status, timestamp;
        activities = [];
        status = null;
        events = (ref = shipment['significant-events']) != null ? (ref1 = ref[0]) != null ? ref1['occurrence'] : void 0 : void 0;
        ref2 = events || [];
        for (i = 0, len = ref2.length; i < len; i++) {
          event = ref2[i];
          city = (ref3 = event['event-site']) != null ? ref3[0] : void 0;
          stateCode = (ref4 = event['event-province']) != null ? ref4[0] : void 0;
          location = this.presentLocation({city, stateCode});
          timestamp = `${((ref5 = event['event-date']) != null ? ref5[0] : void 0)}T${((ref6 = event['event-time']) != null ? ref6[0] : void 0)}Z`;
          timestamp = moment(timestamp).toDate();
          details = (ref7 = event['event-description']) != null ? ref7[0] : void 0;
          if ((details != null) && (timestamp != null)) {
            activity = {timestamp, location, details};
            activities.push(activity);
          }
        }
        return {
          activities: activities,
          status: this.getStatus(activities != null ? activities[0] : void 0)
        };
      }

      getEta(shipment) {
        var ref, ref1, ts;
        ts = ((ref = shipment['changed-expected-date']) != null ? ref[0] : void 0) || ((ref1 = shipment['expected-delivery-date']) != null ? ref1[0] : void 0);
        if (!(ts != null ? ts.length : void 0)) {
          return;
        }
        if (ts != null ? ts.length : void 0) {
          return moment(`${ts}T00:00:00Z`).toDate();
        }
      }

      getService(shipment) {
        var ref;
        return (ref = shipment['service-name']) != null ? ref[0] : void 0;
      }

      getWeight(shipment) {}

      getDestination(shipment) {
        var ref;
        return (ref = shipment['destination-postal-id']) != null ? ref[0] : void 0;
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `https://soa-gw.canadapost.ca/vis/track/pin/${trackingNumber}/detail.xml`,
          auth: {
            user: this.username,
            pass: this.password
          }
        };
      }

    };

    STATUS_MAP = {
      'in transit': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'processed': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'information submitted': ShipperClient.STATUS_TYPES.SHIPPING,
      'Shipment picked up': ShipperClient.STATUS_TYPES.SHIPPING,
      'Shipment received': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'delivered': ShipperClient.STATUS_TYPES.DELIVERED,
      'out for delivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'item released': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'arrived': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'departed': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'is en route': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'item mailed': ShipperClient.STATUS_TYPES.SHIPPING,
      'available for pickup': ShipperClient.STATUS_TYPES.DELAYED,
      'Attempted delivery': ShipperClient.STATUS_TYPES.DELAYED
    };

    return CanadaPostClient;

  }).call(this);

  module.exports = {CanadaPostClient};

}).call(this);
