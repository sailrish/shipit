(function() {
  var LasershipClient, ShipperClient, find, moment, titleCase;

  ({find} = require('underscore'));

  moment = require('moment-timezone');

  ({titleCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  LasershipClient = (function() {
    var STATUS_MAP;

    class LasershipClient extends ShipperClient {
      constructor(options) {
        super();
        this.options = options;
      }

      validateResponse(response, cb) {
        var error;
        try {
          response = JSON.parse(response);
          if (response['Events'] == null) {
            return cb({
              error: 'missing events'
            });
          }
          return cb(null, response);
        } catch (error1) {
          error = error1;
          return cb(error);
        }
      }

      presentAddress(address) {
        var city, countryCode, postalCode, stateCode;
        city = address['City'];
        stateCode = address['State'];
        postalCode = address['PostalCode'];
        countryCode = address['Country'];
        return this.presentLocation({city, stateCode, countryCode, postalCode});
      }

      presentStatus(eventType) {
        if (eventType != null) {
          return STATUS_MAP[eventType];
        }
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, dateTime, details, i, len, location, rawActivities, rawActivity, ref, status, timestamp;
        activities = [];
        status = null;
        rawActivities = shipment != null ? shipment['Events'] : void 0;
        ref = rawActivities || [];
        for (i = 0, len = ref.length; i < len; i++) {
          rawActivity = ref[i];
          location = this.presentAddress(rawActivity);
          dateTime = rawActivity != null ? rawActivity['DateTime'] : void 0;
          if (dateTime != null) {
            timestamp = moment(`${dateTime}Z`).toDate();
          }
          details = rawActivity != null ? rawActivity['EventShortText'] : void 0;
          if ((details != null) && (timestamp != null)) {
            activity = {timestamp, location, details};
            activities.push(activity);
          }
          if (!status) {
            status = this.presentStatus(rawActivity != null ? rawActivity['EventType'] : void 0);
          }
        }
        return {activities, status};
      }

      getEta(shipment) {
        if ((shipment != null ? shipment['EstimatedDeliveryDate'] : void 0) == null) {
          return;
        }
        return moment(`${shipment['EstimatedDeliveryDate']}T00:00:00Z`).toDate();
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
        var destination;
        destination = shipment != null ? shipment['Destination'] : void 0;
        if (destination == null) {
          return;
        }
        return this.presentAddress(destination);
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `http://www.lasership.com/track/${trackingNumber}/json`
        };
      }

    };

    STATUS_MAP = {
      'Released': ShipperClient.STATUS_TYPES.DELIVERED,
      'Delivered': ShipperClient.STATUS_TYPES.DELIVERED,
      'OutForDelivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'Arrived': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Received': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'OrderReceived': ShipperClient.STATUS_TYPES.SHIPPING,
      'OrderCreated': ShipperClient.STATUS_TYPES.SHIPPING
    };

    return LasershipClient;

  }).call(this);

  module.exports = {LasershipClient};

}).call(this);
