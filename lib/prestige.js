(function() {
  var PrestigeClient, ShipperClient, moment, reduce, titleCase;

  ({reduce} = require('underscore'));

  moment = require('moment-timezone');

  ({titleCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  PrestigeClient = (function() {
    var ADDR_ATTRS, STATUS_MAP;

    class PrestigeClient extends ShipperClient {
      constructor(options) {
        super();
        this.options = options;
      }

      validateResponse(response, cb) {
        response = JSON.parse(response);
        if (!(response != null ? response.length : void 0)) {
          return cb({
            error: 'no tracking info found'
          });
        }
        response = response[0];
        if (response['TrackingEventHistory'] == null) {
          return cb({
            error: 'missing events'
          });
        }
        return cb(null, response);
      }

      presentAddress(prefix, event) {
        var address, city, postalCode, stateCode;
        if (event == null) {
          return;
        }
        address = reduce(ADDR_ATTRS, (function(d, v) {
          d[v] = event[`${prefix}${v}`];
          return d;
        }), {});
        city = address['City'];
        stateCode = address['State'];
        postalCode = address['Zip'];
        return this.presentLocation({city, stateCode, postalCode});
      }

      presentStatus(eventType) {
        var codeStr, eventCode, ref, status;
        codeStr = (ref = eventType.match('EVENT_(.*)$')) != null ? ref[1] : void 0;
        if (!(codeStr != null ? codeStr.length : void 0)) {
          return;
        }
        eventCode = parseInt(codeStr);
        if (isNaN(eventCode)) {
          return;
        }
        status = STATUS_MAP[eventCode];
        if (status != null) {
          return status;
        }
        if (eventCode < 300 && eventCode > 101) {
          return ShipperClient.STATUS_TYPES.EN_ROUTE;
        }
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, dateTime, details, i, len, location, rawActivities, rawActivity, ref, status, timestamp;
        activities = [];
        status = null;
        rawActivities = shipment != null ? shipment['TrackingEventHistory'] : void 0;
        ref = rawActivities || [];
        for (i = 0, len = ref.length; i < len; i++) {
          rawActivity = ref[i];
          location = this.presentAddress('EL', rawActivity);
          dateTime = `${(rawActivity != null ? rawActivity['serverDate'] : void 0)} ${(rawActivity != null ? rawActivity['serverTime'] : void 0)}`;
          timestamp = moment(`${dateTime} +00:00`).toDate();
          details = rawActivity != null ? rawActivity['EventCodeDesc'] : void 0;
          if ((details != null) && (timestamp != null)) {
            activity = {timestamp, location, details};
            activities.push(activity);
          }
          if (!status) {
            status = this.presentStatus(rawActivity != null ? rawActivity['EventCode'] : void 0);
          }
        }
        return {activities, status};
      }

      getEta(shipment) {
        var eta, ref, ref1;
        eta = shipment != null ? (ref = shipment['TrackingEventHistory']) != null ? (ref1 = ref[0]) != null ? ref1['EstimatedDeliveryDate'] : void 0 : void 0 : void 0;
        if (!(eta != null ? eta.length : void 0)) {
          return;
        }
        eta = `${eta} 00:00 +00:00`;
        return moment(eta, 'MM/DD/YYYY HH:mm ZZ').toDate();
      }

      getService(shipment) {}

      getWeight(shipment) {
        var piece, ref, units, weight;
        if (!(shipment != null ? (ref = shipment['Pieces']) != null ? ref.length : void 0 : void 0)) {
          return;
        }
        piece = shipment['Pieces'][0];
        weight = `${piece['Weight']}`;
        units = piece['WeightUnit'];
        if (units != null) {
          weight = `${weight} ${units}`;
        }
        return weight;
      }

      getDestination(shipment) {
        var ref;
        return this.presentAddress('PD', shipment != null ? (ref = shipment['TrackingEventHistory']) != null ? ref[0] : void 0 : void 0);
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `http://www.prestigedelivery.com/TrackingHandler.ashx?trackingNumbers=${trackingNumber}`
        };
      }

    };

    ADDR_ATTRS = ['City', 'State', 'Zip'];

    STATUS_MAP = {
      301: ShipperClient.STATUS_TYPES.DELIVERED,
      302: ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      101: ShipperClient.STATUS_TYPES.SHIPPING
    };

    return PrestigeClient;

  }).call(this);

  module.exports = {PrestigeClient};

}).call(this);
