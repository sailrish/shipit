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

(function() {
  var ShipperClient, request, titleCase;

  titleCase = require('change-case').titleCase;

  request = require('request');

  ShipperClient = (function() {
    function ShipperClient() {}

    ShipperClient.STATUS_TYPES = {
      UNKNOWN: 0,
      SHIPPING: 1,
      EN_ROUTE: 2,
      OUT_FOR_DELIVERY: 3,
      DELIVERED: 4,
      DELAYED: 5
    };

    ShipperClient.prototype.presentPostalCode = function(rawCode) {
      if (/^\d{9}$/.test(rawCode)) {
        return "" + rawCode.slice(0, 5) + "-" + rawCode.slice(5);
      } else {
        return rawCode;
      }
    };

    ShipperClient.prototype.presentLocation = function(_arg) {
      var address, city, countryCode, postalCode, stateCode;
      city = _arg.city, stateCode = _arg.stateCode, countryCode = _arg.countryCode, postalCode = _arg.postalCode;
      if (city != null) {
        city = titleCase(city);
      }
      address = (city != null) && (stateCode != null) ? "" + city + ", " + stateCode : void 0;
      postalCode = this.presentPostalCode(postalCode);
      if (countryCode != null) {
        if (address != null) {
          address = countryCode !== 'US' ? "" + address + ", " + countryCode : address;
        } else {
          address = countryCode;
        }
      }
      if (postalCode != null) {
        address = address != null ? "" + address + " " + postalCode : postalCode;
      }
      return address;
    };

    ShipperClient.prototype.presentResponse = function(response, cb) {
      return this.validateResponse(response, (function(_this) {
        return function(err, shipment) {
          var activities, presentedResponse, status, _ref, _ref1;
          if ((err != null) || (shipment == null)) {
            return cb(err);
          }
          _ref = _this.getActivitiesAndStatus(shipment), activities = _ref.activities, status = _ref.status;
          presentedResponse = {
            eta: _this.getEta(shipment),
            service: _this.getService(shipment),
            weight: _this.getWeight(shipment),
            destination: _this.getDestination(shipment),
            activities: activities,
            status: status
          };
          if ((_ref1 = _this.options) != null ? _ref1.raw : void 0) {
            presentedResponse.raw = shipment;
          }
          return cb(null, presentedResponse);
        };
      })(this));
    };

    ShipperClient.prototype.requestRefresh = function(requestData, cb) {
      return request(this.requestOptions(requestData), (function(_this) {
        return function(err, response, body) {
          if ((body == null) || (err != null)) {
            return cb(err);
          }
          if (response.statusCode !== 200) {
            return cb("response status " + response.statusCode);
          }
          return _this.presentResponse(body, cb);
        };
      })(this));
    };

    return ShipperClient;

  })();

  module.exports = {
    ShipperClient: ShipperClient
  };

}).call(this);

(function() {
  var Builder, Parser, ShipperClient, UpsClient, moment, request, titleCase, upperCaseFirst, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('xml2js'), Builder = _ref.Builder, Parser = _ref.Parser;

  request = require('request');

  moment = require('moment');

  _ref1 = require('change-case'), titleCase = _ref1.titleCase, upperCaseFirst = _ref1.upperCaseFirst;

  ShipperClient = require('./shipper').ShipperClient;

  UpsClient = (function(_super) {
    var STATUS_MAP;

    __extends(UpsClient, _super);

    function UpsClient(_arg, options) {
      this.licenseNumber = _arg.licenseNumber, this.userId = _arg.userId, this.password = _arg.password;
      this.options = options;
      UpsClient.__super__.constructor.apply(this, arguments);
      this.parser = new Parser();
      this.builder = new Builder({
        renderOpts: {
          pretty: false
        }
      });
    }

    UpsClient.prototype.generateRequest = function(trk, reference) {
      var accessRequest, trackRequest;
      if (reference == null) {
        reference = 'n/a';
      }
      accessRequest = this.builder.buildObject({
        'AccessRequest': {
          'AccessLicenseNumber': this.licenseNumber,
          'UserId': this.userId,
          'Password': this.password
        }
      });
      trackRequest = this.builder.buildObject({
        'TrackRequest': {
          'Request': {
            'TransactionReference': {
              'CustomerContext': reference
            },
            'RequestAction': 'track',
            'RequestOption': 3
          },
          'TrackingNumber': trk
        }
      });
      return "" + accessRequest + trackRequest;
    };

    UpsClient.prototype.validateResponse = function(response, cb) {
      return this.parser.parseString(response, function(xmlErr, trackResult) {
        var error, errorMsg, responseStatus, shipment, _ref10, _ref11, _ref12, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
        if ((xmlErr != null) || (trackResult == null)) {
          return cb(xmlErr);
        }
        responseStatus = (_ref2 = trackResult['TrackResponse']) != null ? (_ref3 = _ref2['Response']) != null ? (_ref4 = _ref3[0]) != null ? (_ref5 = _ref4['ResponseStatusDescription']) != null ? _ref5[0] : void 0 : void 0 : void 0 : void 0;
        if (responseStatus !== 'Success') {
          error = (_ref6 = trackResult['TrackResponse']) != null ? (_ref7 = _ref6['Response']) != null ? (_ref8 = _ref7[0]) != null ? (_ref9 = _ref8['Error']) != null ? (_ref10 = _ref9[0]) != null ? (_ref11 = _ref10['ErrorDescription']) != null ? _ref11[0] : void 0 : void 0 : void 0 : void 0 : void 0 : void 0;
          errorMsg = error || "unknown error";
        }
        shipment = (_ref12 = trackResult['TrackResponse']['Shipment']) != null ? _ref12[0] : void 0;
        if (shipment == null) {
          errorMsg = "missing shipment data";
        }
        if (errorMsg != null) {
          return cb(errorMsg);
        }
        return cb(null, shipment);
      });
    };

    UpsClient.prototype.getEta = function(shipment) {
      var _ref2, _ref3, _ref4, _ref5;
      return this.presentTimestamp(((_ref2 = shipment['ScheduledDeliveryDate']) != null ? _ref2[0] : void 0) || ((_ref3 = shipment['Package']) != null ? (_ref4 = _ref3[0]) != null ? (_ref5 = _ref4['RescheduledDeliveryDate']) != null ? _ref5[0] : void 0 : void 0 : void 0));
    };

    UpsClient.prototype.getService = function(shipment) {
      var service, _ref2, _ref3, _ref4;
      if (service = (_ref2 = shipment['Service']) != null ? (_ref3 = _ref2[0]) != null ? (_ref4 = _ref3['Description']) != null ? _ref4[0] : void 0 : void 0 : void 0) {
        return titleCase(service);
      }
    };

    UpsClient.prototype.getWeight = function(shipment) {
      var units, weight, weightData, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
      weight = null;
      if (weightData = (_ref2 = shipment['Package']) != null ? (_ref3 = _ref2[0]) != null ? (_ref4 = _ref3['PackageWeight']) != null ? _ref4[0] : void 0 : void 0 : void 0) {
        weight = (_ref5 = weightData['Weight']) != null ? _ref5[0] : void 0;
        if ((weight != null) && (units = (_ref6 = weightData['UnitOfMeasurement']) != null ? (_ref7 = _ref6[0]) != null ? (_ref8 = _ref7['Code']) != null ? _ref8[0] : void 0 : void 0 : void 0)) {
          weight = "" + weight + " " + units;
        }
      }
      return weight;
    };

    UpsClient.prototype.presentTimestamp = function(dateString, timeString) {
      var formatSpec, inputString;
      if (dateString == null) {
        return;
      }
      formatSpec = timeString != null ? 'YYYYMMDD HHmmss' : 'YYYYMMDD';
      inputString = timeString != null ? "" + dateString + " " + timeString : dateString;
      return moment(inputString, formatSpec).toDate();
    };

    UpsClient.prototype.presentAddress = function(rawAddress) {
      var city, countryCode, postalCode, stateCode, _ref2, _ref3, _ref4, _ref5;
      if (!rawAddress) {
        return;
      }
      city = (_ref2 = rawAddress['City']) != null ? _ref2[0] : void 0;
      stateCode = (_ref3 = rawAddress['StateProvinceCode']) != null ? _ref3[0] : void 0;
      countryCode = (_ref4 = rawAddress['CountryCode']) != null ? _ref4[0] : void 0;
      postalCode = (_ref5 = rawAddress['PostalCode']) != null ? _ref5[0] : void 0;
      return this.presentLocation({
        city: city,
        stateCode: stateCode,
        countryCode: countryCode,
        postalCode: postalCode
      });
    };

    STATUS_MAP = {
      'D': ShipperClient.STATUS_TYPES.DELIVERED,
      'P': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'M': ShipperClient.STATUS_TYPES.SHIPPING,
      'X': ShipperClient.STATUS_TYPES.DELAYED
    };

    UpsClient.prototype.presentStatus = function(status) {
      var statusCode, statusType, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
      if (status == null) {
        return;
      }
      statusType = (_ref2 = status['StatusType']) != null ? (_ref3 = _ref2[0]) != null ? (_ref4 = _ref3['Code']) != null ? _ref4[0] : void 0 : void 0 : void 0;
      statusCode = (_ref5 = status['StatusCode']) != null ? (_ref6 = _ref5[0]) != null ? (_ref7 = _ref6['Code']) != null ? _ref7[0] : void 0 : void 0 : void 0;
      if (STATUS_MAP[statusType] != null) {
        return STATUS_MAP[statusType];
      }
      switch (statusType) {
        case 'I':
          switch (statusCode) {
            case 'OF':
              return ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY;
            default:
              return ShipperClient.STATUS_TYPES.EN_ROUTE;
          }
          break;
        case 'X':
          switch (statusCode) {
            case 'U2':
              return ShipperClient.STATUS_TYPES.EN_ROUTE;
            default:
              return ShipperClient.STATUS_TYPES.DELAYED;
          }
          break;
        default:
          return ShipperClient.STATUS_TYPES.UNKNOWN;
      }
    };

    UpsClient.prototype.getDestination = function(shipment) {
      var _ref2, _ref3, _ref4;
      return this.presentAddress((_ref2 = shipment['ShipTo']) != null ? (_ref3 = _ref2[0]) != null ? (_ref4 = _ref3['Address']) != null ? _ref4[0] : void 0 : void 0 : void 0);
    };

    UpsClient.prototype.getActivitiesAndStatus = function(shipment) {
      var activities, activity, details, lastStatus, location, rawActivities, rawActivity, status, statusObj, timestamp, _i, _len, _ref10, _ref11, _ref12, _ref13, _ref14, _ref15, _ref16, _ref17, _ref18, _ref19, _ref2, _ref20, _ref21, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
      activities = [];
      status = null;
      rawActivities = (_ref2 = shipment['Package']) != null ? (_ref3 = _ref2[0]) != null ? _ref3['Activity'] : void 0 : void 0;
      _ref4 = rawActivities || [];
      for (_i = 0, _len = _ref4.length; _i < _len; _i++) {
        rawActivity = _ref4[_i];
        location = this.presentAddress((_ref5 = rawActivity['ActivityLocation']) != null ? (_ref6 = _ref5[0]) != null ? (_ref7 = _ref6['Address']) != null ? _ref7[0] : void 0 : void 0 : void 0);
        timestamp = this.presentTimestamp((_ref8 = rawActivity['Date']) != null ? _ref8[0] : void 0, (_ref9 = rawActivity['Time']) != null ? _ref9[0] : void 0);
        lastStatus = (_ref10 = rawActivity['Status']) != null ? _ref10[0] : void 0;
        details = lastStatus != null ? (_ref11 = lastStatus['StatusType']) != null ? (_ref12 = _ref11[0]) != null ? (_ref13 = _ref12['Description']) != null ? _ref13[0] : void 0 : void 0 : void 0 : void 0;
        if ((details != null) && (location != null) && (timestamp != null)) {
          details = upperCaseFirst(details);
          activity = {
            timestamp: timestamp,
            location: location,
            details: details
          };
          if (statusObj = (_ref14 = rawActivity['Status']) != null ? _ref14[0] : void 0) {
            activity.statusType = (_ref15 = statusObj['StatusType']) != null ? (_ref16 = _ref15[0]) != null ? (_ref17 = _ref16['Code']) != null ? _ref17[0] : void 0 : void 0 : void 0;
            activity.statusCode = (_ref18 = statusObj['StatusCode']) != null ? (_ref19 = _ref18[0]) != null ? (_ref20 = _ref19['Code']) != null ? _ref20[0] : void 0 : void 0 : void 0;
          }
          activities.push(activity);
        }
        if (!status) {
          status = this.presentStatus((_ref21 = rawActivity['Status']) != null ? _ref21[0] : void 0);
        }
      }
      return {
        activities: activities,
        status: status
      };
    };

    UpsClient.prototype.requestOptions = function(_arg) {
      var reference, trk;
      trk = _arg.trk, reference = _arg.reference;
      return {
        method: 'POST',
        uri: 'https://www.ups.com/ups.app/xml/Track',
        body: this.generateRequest(trk, reference)
      };
    };

    return UpsClient;

  })(ShipperClient);

  module.exports = {
    UpsClient: UpsClient
  };

}).call(this);
