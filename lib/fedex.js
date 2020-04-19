(function() {
  var Builder, FedexClient, Parser, ShipperClient, find, moment, titleCase;

  ({Builder, Parser} = require('xml2js'));

  ({find} = require('underscore'));

  moment = require('moment-timezone');

  ({titleCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  FedexClient = (function() {
    var STATUS_MAP;

    class FedexClient extends ShipperClient {
      constructor({key, password, account, meter}, options) {
        super();
        this.key = key;
        this.password = password;
        this.account = account;
        this.meter = meter;
        this.options = options;
        this.parser = new Parser();
        this.builder = new Builder({
          renderOpts: {
            pretty: false
          }
        });
      }

      generateRequest(trk, reference = 'n/a') {
        return this.builder.buildObject({
          'ns:TrackRequest': {
            '$': {
              'xmlns:ns': 'http://fedex.com/ws/track/v5',
              'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
              'xsi:schemaLocation': 'http://fedex.com/ws/track/v4 TrackService_v4.xsd'
            },
            'ns:WebAuthenticationDetail': {
              'ns:UserCredential': {
                'ns:Key': this.key,
                'ns:Password': this.password
              }
            },
            'ns:ClientDetail': {
              'ns:AccountNumber': this.account,
              'ns:MeterNumber': this.meter
            },
            'ns:TransactionDetail': {
              'ns:CustomerTransactionId': reference
            },
            'ns:Version': {
              'ns:ServiceId': 'trck',
              'ns:Major': 5,
              'ns:Intermediate': 0,
              'ns:Minor': 0
            },
            'ns:PackageIdentifier': {
              'ns:Value': trk,
              'ns:Type': 'TRACKING_NUMBER_OR_DOORTAG'
            },
            'ns:IncludeDetailedScans': true
          }
        });
      }

      validateResponse(response, cb) {
        var handleResponse;
        handleResponse = function(xmlErr, trackResult) {
          var notifications, ref, ref1, ref2, success;
          if ((xmlErr != null) || (trackResult == null)) {
            return cb(xmlErr);
          }
          notifications = (ref = trackResult['TrackReply']) != null ? ref['Notifications'] : void 0;
          success = find(notifications, function(notice) {
            var ref1;
            return (notice != null ? (ref1 = notice['Code']) != null ? ref1[0] : void 0 : void 0) === '0';
          });
          if (!success) {
            return cb(notifications || 'invalid reply');
          }
          return cb(null, (ref1 = trackResult['TrackReply']) != null ? (ref2 = ref1['TrackDetails']) != null ? ref2[0] : void 0 : void 0);
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
        if (city != null) {
          city = city.replace('FEDEX SMARTPOST ', '');
        }
        stateCode = (ref1 = address['StateOrProvinceCode']) != null ? ref1[0] : void 0;
        countryCode = (ref2 = address['CountryCode']) != null ? ref2[0] : void 0;
        postalCode = (ref3 = address['PostalCode']) != null ? ref3[0] : void 0;
        return this.presentLocation({city, stateCode, countryCode, postalCode});
      }

      getStatus(shipment) {
        var ref, statusCode;
        statusCode = shipment != null ? (ref = shipment['StatusCode']) != null ? ref[0] : void 0 : void 0;
        if (statusCode == null) {
          return;
        }
        if (STATUS_MAP[statusCode] != null) {
          return STATUS_MAP[statusCode];
        } else {
          return ShipperClient.STATUS_TYPES.UNKNOWN;
        }
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, datetime, details, event_time, i, len, location, rawActivity, raw_timestamp, ref, ref1, ref2, ref3, status, timestamp;
        activities = [];
        status = null;
        ref = shipment['Events'] || [];
        for (i = 0, len = ref.length; i < len; i++) {
          rawActivity = ref[i];
          location = this.presentAddress((ref1 = rawActivity['Address']) != null ? ref1[0] : void 0);
          raw_timestamp = (ref2 = rawActivity['Timestamp']) != null ? ref2[0] : void 0;
          if (raw_timestamp != null) {
            event_time = moment(raw_timestamp);
            timestamp = event_time.toDate();
            datetime = raw_timestamp.slice(0, 19);
          }
          details = (ref3 = rawActivity['EventDescription']) != null ? ref3[0] : void 0;
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
        var ref, ts;
        ts = shipment != null ? (ref = shipment['EstimatedDeliveryTimestamp']) != null ? ref[0] : void 0 : void 0;
        if (ts == null) {
          return;
        }
        return moment(`${ts.slice(0, 19)}Z`).toDate();
      }

      getService(shipment) {
        var ref;
        return shipment != null ? (ref = shipment['ServiceInfo']) != null ? ref[0] : void 0 : void 0;
      }

      getWeight(shipment) {
        var ref, ref1, ref2, units, value, weightData;
        weightData = shipment != null ? (ref = shipment['PackageWeight']) != null ? ref[0] : void 0 : void 0;
        if (weightData == null) {
          return;
        }
        units = (ref1 = weightData['Units']) != null ? ref1[0] : void 0;
        value = (ref2 = weightData['Value']) != null ? ref2[0] : void 0;
        if ((units != null) && (value != null)) {
          return `${value} ${units}`;
        }
      }

      getDestination(shipment) {
        var ref;
        return this.presentAddress((ref = shipment['DestinationAddress']) != null ? ref[0] : void 0);
      }

      requestOptions({trackingNumber, reference}) {
        return {
          method: 'POST',
          uri: 'https://ws.fedex.com/xml',
          body: this.generateRequest(trackingNumber, reference)
        };
      }

    };

    STATUS_MAP = {
      'AA': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'AD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'AF': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'AP': ShipperClient.STATUS_TYPES.SHIPPING,
      'EO': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'EP': ShipperClient.STATUS_TYPES.SHIPPING,
      'FD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'HL': ShipperClient.STATUS_TYPES.DELIVERED,
      'IT': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'LO': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'OC': ShipperClient.STATUS_TYPES.SHIPPING,
      'DL': ShipperClient.STATUS_TYPES.DELIVERED,
      'DP': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'DS': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'ED': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'OD': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'PF': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'PL': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'PU': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'SF': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'AR': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'CD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'CC': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'DE': ShipperClient.STATUS_TYPES.DELAYED,
      'CA': ShipperClient.STATUS_TYPES.DELAYED,
      'CH': ShipperClient.STATUS_TYPES.DELAYED,
      'DY': ShipperClient.STATUS_TYPES.DELAYED,
      'SE': ShipperClient.STATUS_TYPES.DELAYED,
      'AX': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'OF': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'RR': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'OX': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'CP': ShipperClient.STATUS_TYPES.EN_ROUTE
    };

    return FedexClient;

  }).call(this);

  module.exports = {FedexClient};

}).call(this);
