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
