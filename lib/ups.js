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
