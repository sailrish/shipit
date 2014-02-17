(function() {
  var Builder, FedexClient, Parser, ShipperClient, find, moment, titleCase, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('xml2js'), Builder = _ref.Builder, Parser = _ref.Parser;

  find = require('underscore').find;

  moment = require('moment');

  titleCase = require('change-case').titleCase;

  ShipperClient = require('./shipper').ShipperClient;

  FedexClient = (function(_super) {
    var STATUS_MAP;

    __extends(FedexClient, _super);

    function FedexClient(_arg, options) {
      this.key = _arg.key, this.password = _arg.password, this.account = _arg.account, this.meter = _arg.meter;
      this.options = options;
      FedexClient.__super__.constructor.apply(this, arguments);
      this.parser = new Parser();
      this.builder = new Builder({
        renderOpts: {
          pretty: false
        }
      });
    }

    FedexClient.prototype.generateRequest = function(trk, reference) {
      if (reference == null) {
        reference = 'n/a';
      }
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
    };

    FedexClient.prototype.validateResponse = function(response, cb) {
      return this.parser.parseString(response, function(xmlErr, trackResult) {
        var notifications, success, _ref1, _ref2, _ref3;
        if ((xmlErr != null) || (trackResult == null)) {
          return cb(xmlErr);
        }
        notifications = (_ref1 = trackResult['TrackReply']) != null ? _ref1['Notifications'] : void 0;
        success = find(notifications, function(notice) {
          var _ref2;
          return (notice != null ? (_ref2 = notice['Code']) != null ? _ref2[0] : void 0 : void 0) === '0';
        });
        if (!success) {
          return cb(notifications);
        }
        return cb(null, (_ref2 = trackResult['TrackReply']) != null ? (_ref3 = _ref2['TrackDetails']) != null ? _ref3[0] : void 0 : void 0);
      });
    };

    FedexClient.prototype.presentAddress = function(address) {
      var city, countryCode, postalCode, stateCode, _ref1, _ref2, _ref3, _ref4;
      if (address == null) {
        return;
      }
      city = (_ref1 = address['City']) != null ? _ref1[0] : void 0;
      if (city != null) {
        city = city.replace('FEDEX SMARTPOST ', '');
      }
      stateCode = (_ref2 = address['StateOrProvinceCode']) != null ? _ref2[0] : void 0;
      countryCode = (_ref3 = address['CountryCode']) != null ? _ref3[0] : void 0;
      postalCode = (_ref4 = address['PostalCode']) != null ? _ref4[0] : void 0;
      return this.presentLocation({
        city: city,
        stateCode: stateCode,
        countryCode: countryCode,
        postalCode: postalCode
      });
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

    FedexClient.prototype.getStatus = function(shipment) {
      var statusCode, _ref1;
      statusCode = shipment != null ? (_ref1 = shipment['StatusCode']) != null ? _ref1[0] : void 0 : void 0;
      if (statusCode == null) {
        return;
      }
      if (STATUS_MAP[statusCode] != null) {
        return STATUS_MAP[statusCode];
      } else {
        return ShipperClient.STATUS_TYPES.UNKNOWN;
      }
    };

    FedexClient.prototype.getActivitiesAndStatus = function(shipment) {
      var activities, activity, details, location, rawActivity, status, timestamp, _i, _len, _ref1, _ref2, _ref3, _ref4;
      activities = [];
      status = null;
      _ref1 = shipment['Events'] || [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        rawActivity = _ref1[_i];
        location = this.presentAddress((_ref2 = rawActivity['Address']) != null ? _ref2[0] : void 0);
        if (((_ref3 = rawActivity['Timestamp']) != null ? _ref3[0] : void 0) != null) {
          timestamp = moment(rawActivity['Timestamp'][0]).toDate();
        }
        details = (_ref4 = rawActivity['EventDescription']) != null ? _ref4[0] : void 0;
        if ((details != null) && (location != null) && (timestamp != null)) {
          activity = {
            timestamp: timestamp,
            location: location,
            details: details
          };
          activities.push(activity);
        }
      }
      return {
        activities: activities,
        status: this.getStatus(shipment)
      };
    };

    FedexClient.prototype.getEta = function(shipment) {
      var ts, _ref1;
      ts = shipment != null ? (_ref1 = shipment['EstimatedDeliveryTimestamp']) != null ? _ref1[0] : void 0 : void 0;
      if (ts == null) {
        return;
      }
      return moment(ts).toDate();
    };

    FedexClient.prototype.getService = function(shipment) {
      var _ref1;
      return shipment != null ? (_ref1 = shipment['ServiceInfo']) != null ? _ref1[0] : void 0 : void 0;
    };

    FedexClient.prototype.getWeight = function(shipment) {
      var units, value, weightData, _ref1, _ref2, _ref3;
      weightData = shipment != null ? (_ref1 = shipment['PackageWeight']) != null ? _ref1[0] : void 0 : void 0;
      if (weightData == null) {
        return;
      }
      units = (_ref2 = weightData['Units']) != null ? _ref2[0] : void 0;
      value = (_ref3 = weightData['Value']) != null ? _ref3[0] : void 0;
      if ((units != null) && (value != null)) {
        return "" + value + " " + units;
      }
    };

    FedexClient.prototype.getDestination = function(shipment) {
      var _ref1;
      return this.presentAddress((_ref1 = shipment['DestinationAddress']) != null ? _ref1[0] : void 0);
    };

    FedexClient.prototype.requestOptions = function(_arg) {
      var reference, trackingNumber;
      trackingNumber = _arg.trackingNumber, reference = _arg.reference;
      return {
        method: 'POST',
        uri: 'https://ws.fedex.com/xml',
        body: this.generateRequest(trackingNumber, reference)
      };
    };

    return FedexClient;

  })(ShipperClient);

  module.exports = {
    FedexClient: FedexClient
  };

}).call(this);
