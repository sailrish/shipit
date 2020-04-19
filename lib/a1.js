(function() {
  var A1Client, Parser, ShipperClient, moment, titleCase,
    slice = [].slice;

  ({Parser} = require('xml2js'));

  moment = require('moment-timezone');

  ({titleCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  A1Client = (function() {
    var STATUS_MAP;

    class A1Client extends ShipperClient {
      constructor(options) {
        super();
        this.options = options;
        this.parser = new Parser();
      }

      validateResponse(response, cb) {
        var handleResponse;
        handleResponse = function(xmlErr, trackResult) {
          var error, errorInfo, ref, ref1, ref2, ref3, ref4, ref5, ref6, trackingInfo;
          if ((xmlErr != null) || (trackResult == null)) {
            return cb(xmlErr);
          }
          trackingInfo = (ref = trackResult['AmazonTrackingResponse']) != null ? (ref1 = ref['PackageTrackingInfo']) != null ? ref1[0] : void 0 : void 0;
          if ((trackingInfo != null ? trackingInfo['TrackingNumber'] : void 0) == null) {
            errorInfo = (ref2 = trackResult['AmazonTrackingResponse']) != null ? (ref3 = ref2['TrackingErrorInfo']) != null ? ref3[0] : void 0 : void 0;
            error = errorInfo != null ? (ref4 = errorInfo['TrackingErrorDetail']) != null ? (ref5 = ref4[0]) != null ? (ref6 = ref5['ErrorDetailCodeDesc']) != null ? ref6[0] : void 0 : void 0 : void 0 : void 0;
            if (error != null) {
              return cb(error);
            }
            cb('unknown error');
          }
          return cb(null, trackingInfo);
        };
        this.parser.reset();
        return this.parser.parseString(response, handleResponse);
      }

      presentAddress(address) {
        var city, countryCode, postalCode, ref, ref1, ref2, ref3, stateCode;
        if (address == null) {
          return;
        }
        city = (ref = address['City']) != null ? ref[0] : void 0;
        stateCode = (ref1 = address['StateProvince']) != null ? ref1[0] : void 0;
        countryCode = (ref2 = address['CountryCode']) != null ? ref2[0] : void 0;
        postalCode = (ref3 = address['PostalCode']) != null ? ref3[0] : void 0;
        return this.presentLocation({city, stateCode, countryCode, postalCode});
      }

      getStatus(shipment) {
        var code, lastActivity, ref, ref1, ref2, ref3, ref4, statusCode;
        lastActivity = (ref = shipment['TrackingEventHistory']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['TrackingEventDetail']) != null ? ref2[0] : void 0 : void 0 : void 0;
        statusCode = lastActivity != null ? (ref3 = lastActivity['EventCode']) != null ? ref3[0] : void 0 : void 0;
        if (statusCode == null) {
          return;
        }
        code = parseInt((ref4 = statusCode.match(/EVENT_(.*)$/)) != null ? ref4[1] : void 0);
        if (isNaN(code)) {
          return;
        }
        if (STATUS_MAP[code] != null) {
          return STATUS_MAP[code];
        } else {
          if (code < 300) {
            return ShipperClient.STATUS_TYPES.EN_ROUTE;
          } else {
            return ShipperClient.STATUS_TYPES.UNKNOWN;
          }
        }
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, datetime, details, event_time, i, len, location, rawActivities, rawActivity, raw_timestamp, ref, ref1, ref2, ref3, ref4, status, timestamp;
        activities = [];
        status = null;
        rawActivities = (ref = shipment['TrackingEventHistory']) != null ? (ref1 = ref[0]) != null ? ref1['TrackingEventDetail'] : void 0 : void 0;
        ref2 = rawActivities || [];
        for (i = 0, len = ref2.length; i < len; i++) {
          rawActivity = ref2[i];
          location = this.presentAddress(rawActivity != null ? (ref3 = rawActivity['EventLocation']) != null ? ref3[0] : void 0 : void 0);
          raw_timestamp = rawActivity != null ? rawActivity['EventDateTime'][0] : void 0;
          if (raw_timestamp != null) {
            event_time = moment(raw_timestamp);
            timestamp = event_time.toDate();
            datetime = raw_timestamp.slice(0, 19);
          }
          details = rawActivity != null ? (ref4 = rawActivity['EventCodeDesc']) != null ? ref4[0] : void 0 : void 0;
          if ((details != null) && (timestamp != null)) {
            activity = {timestamp, datetime, location, details};
            activities.push(activity);
          }
        }
        return {
          activities: activities,
          status: this.getStatus(shipment)
        };
      }

      getEta(shipment) {
        var activities, firstActivity, ref, ref1, ref2, ref3;
        activities = ((ref = shipment['TrackingEventHistory']) != null ? (ref1 = ref[0]) != null ? ref1['TrackingEventDetail'] : void 0 : void 0) || [];
        [firstActivity] = slice.call(activities, -1);
        if ((firstActivity != null ? (ref2 = firstActivity['EstimatedDeliveryDate']) != null ? ref2[0] : void 0 : void 0) == null) {
          return;
        }
        return moment(`${(firstActivity != null ? (ref3 = firstActivity['EstimatedDeliveryDate']) != null ? ref3[0] : void 0 : void 0)}T00:00:00Z`).toDate();
      }

      getService(shipment) {
        return null;
      }

      getWeight(shipment) {
        return null;
      }

      getDestination(shipment) {
        var ref;
        return this.presentAddress(shipment != null ? (ref = shipment['PackageDestinationLocation']) != null ? ref[0] : void 0 : void 0);
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'GET',
          uri: `http://www.aoneonline.com/pages/customers/trackingrequest.php?tracking_number=${trackingNumber}`
        };
      }

    };

    STATUS_MAP = {
      101: ShipperClient.STATUS_TYPES.EN_ROUTE,
      102: ShipperClient.STATUS_TYPES.EN_ROUTE,
      302: ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      304: ShipperClient.STATUS_TYPES.DELAYED,
      301: ShipperClient.STATUS_TYPES.DELIVERED
    };

    return A1Client;

  }).call(this);

  module.exports = {A1Client};

}).call(this);
