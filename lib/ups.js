(function() {
  var Builder, Parser, ShipperClient, UpsClient, lowerCase, moment, request, titleCase, upperCaseFirst;

  ({Builder, Parser} = require('xml2js'));

  request = require('request');

  moment = require('moment-timezone');

  ({titleCase, upperCaseFirst, lowerCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  UpsClient = (function() {
    var STATUS_MAP;

    class UpsClient extends ShipperClient {
      constructor({licenseNumber, userId, password}, options) {
        super();
        this.licenseNumber = licenseNumber;
        this.userId = userId;
        this.password = password;
        this.options = options;
        this.parser = new Parser();
        this.builder = new Builder({
          renderOpts: {
            pretty: false
          }
        });
      }

      generateRequest(trk, reference = 'n/a') {
        var accessRequest, trackRequest;
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
        return `${accessRequest}${trackRequest}`;
      }

      validateResponse(response, cb) {
        var handleResponse;
        handleResponse = function(xmlErr, trackResult) {
          var error, errorMsg, ref, ref1, ref10, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, responseStatus, shipment;
          if ((xmlErr != null) || (trackResult == null)) {
            return cb(xmlErr);
          }
          responseStatus = (ref = trackResult['TrackResponse']) != null ? (ref1 = ref['Response']) != null ? (ref2 = ref1[0]) != null ? (ref3 = ref2['ResponseStatusDescription']) != null ? ref3[0] : void 0 : void 0 : void 0 : void 0;
          if (responseStatus !== 'Success') {
            error = (ref4 = trackResult['TrackResponse']) != null ? (ref5 = ref4['Response']) != null ? (ref6 = ref5[0]) != null ? (ref7 = ref6['Error']) != null ? (ref8 = ref7[0]) != null ? (ref9 = ref8['ErrorDescription']) != null ? ref9[0] : void 0 : void 0 : void 0 : void 0 : void 0 : void 0;
            errorMsg = error || "unknown error";
            shipment = null;
          } else {
            shipment = (ref10 = trackResult['TrackResponse']['Shipment']) != null ? ref10[0] : void 0;
            if (shipment == null) {
              errorMsg = "missing shipment data";
            }
          }
          if (errorMsg != null) {
            return cb(errorMsg);
          }
          return cb(null, shipment);
        };
        this.parser.reset();
        return this.parser.parseString(response, handleResponse);
      }

      getEta(shipment) {
        var ref, ref1, ref2, ref3;
        return this.presentTimestamp(((ref = shipment['Package']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['RescheduledDeliveryDate']) != null ? ref2[0] : void 0 : void 0 : void 0) || ((ref3 = shipment['ScheduledDeliveryDate']) != null ? ref3[0] : void 0));
      }

      getService(shipment) {
        var ref, ref1, ref2, service;
        if (service = (ref = shipment['Service']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['Description']) != null ? ref2[0] : void 0 : void 0 : void 0) {
          return titleCase(service);
        }
      }

      getWeight(shipment) {
        var ref, ref1, ref2, ref3, ref4, ref5, ref6, units, weight, weightData;
        weight = null;
        if (weightData = (ref = shipment['Package']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['PackageWeight']) != null ? ref2[0] : void 0 : void 0 : void 0) {
          weight = (ref3 = weightData['Weight']) != null ? ref3[0] : void 0;
          if ((weight != null) && (units = (ref4 = weightData['UnitOfMeasurement']) != null ? (ref5 = ref4[0]) != null ? (ref6 = ref5['Code']) != null ? ref6[0] : void 0 : void 0 : void 0)) {
            weight = `${weight} ${units}`;
          }
        }
        return weight;
      }

      presentTimestamp(dateString, timeString) {
        var formatSpec;
        if (dateString == null) {
          return;
        }
        if (timeString == null) {
          timeString = '00:00:00';
        }
        formatSpec = 'YYYYMMDD HHmmss ZZ';
        return moment(`${dateString} ${timeString} +0000`, formatSpec).toDate();
      }

      presentAddress(rawAddress) {
        var city, countryCode, postalCode, ref, ref1, ref2, ref3, stateCode;
        if (!rawAddress) {
          return;
        }
        city = (ref = rawAddress['City']) != null ? ref[0] : void 0;
        stateCode = (ref1 = rawAddress['StateProvinceCode']) != null ? ref1[0] : void 0;
        countryCode = (ref2 = rawAddress['CountryCode']) != null ? ref2[0] : void 0;
        postalCode = (ref3 = rawAddress['PostalCode']) != null ? ref3[0] : void 0;
        return this.presentLocation({city, stateCode, countryCode, postalCode});
      }

      presentStatus(status) {
        var ref, ref1, ref2, ref3, ref4, ref5, statusCode, statusType;
        if (status == null) {
          return ShipperClient.STATUS_TYPES.UNKNOWN;
        }
        statusType = (ref = status['StatusType']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['Code']) != null ? ref2[0] : void 0 : void 0 : void 0;
        statusCode = (ref3 = status['StatusCode']) != null ? (ref4 = ref3[0]) != null ? (ref5 = ref4['Code']) != null ? ref5[0] : void 0 : void 0 : void 0;
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
      }

      getDestination(shipment) {
        var ref, ref1, ref2;
        return this.presentAddress((ref = shipment['ShipTo']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['Address']) != null ? ref2[0] : void 0 : void 0 : void 0);
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, details, i, lastStatus, len, location, rawActivities, rawActivity, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref15, ref16, ref17, ref18, ref19, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, status, statusObj, timestamp;
        activities = [];
        status = null;
        rawActivities = shipment != null ? (ref = shipment['Package']) != null ? (ref1 = ref[0]) != null ? ref1['Activity'] : void 0 : void 0 : void 0;
        ref2 = rawActivities || [];
        for (i = 0, len = ref2.length; i < len; i++) {
          rawActivity = ref2[i];
          location = this.presentAddress((ref3 = rawActivity['ActivityLocation']) != null ? (ref4 = ref3[0]) != null ? (ref5 = ref4['Address']) != null ? ref5[0] : void 0 : void 0 : void 0);
          timestamp = this.presentTimestamp((ref6 = rawActivity['Date']) != null ? ref6[0] : void 0, (ref7 = rawActivity['Time']) != null ? ref7[0] : void 0);
          lastStatus = (ref8 = rawActivity['Status']) != null ? ref8[0] : void 0;
          details = lastStatus != null ? (ref9 = lastStatus['StatusType']) != null ? (ref10 = ref9[0]) != null ? (ref11 = ref10['Description']) != null ? ref11[0] : void 0 : void 0 : void 0 : void 0;
          if ((details != null) && (timestamp != null)) {
            details = upperCaseFirst(lowerCase(details));
            activity = {timestamp, location, details};
            if (statusObj = (ref12 = rawActivity['Status']) != null ? ref12[0] : void 0) {
              activity.statusType = (ref13 = statusObj['StatusType']) != null ? (ref14 = ref13[0]) != null ? (ref15 = ref14['Code']) != null ? ref15[0] : void 0 : void 0 : void 0;
              activity.statusCode = (ref16 = statusObj['StatusCode']) != null ? (ref17 = ref16[0]) != null ? (ref18 = ref17['Code']) != null ? ref18[0] : void 0 : void 0 : void 0;
            }
            activities.push(activity);
          }
          if (!status) {
            status = this.presentStatus((ref19 = rawActivity['Status']) != null ? ref19[0] : void 0);
          }
        }
        return {activities, status};
      }

      requestOptions({trackingNumber, reference, test}) {
        var hostname;
        hostname = test ? 'wwwcie.ups.com' : 'onlinetools.ups.com';
        return {
          method: 'POST',
          uri: `https://${hostname}/ups.app/xml/Track`,
          body: this.generateRequest(trackingNumber, reference)
        };
      }

    };

    STATUS_MAP = {
      'D': ShipperClient.STATUS_TYPES.DELIVERED,
      'P': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'M': ShipperClient.STATUS_TYPES.SHIPPING
    };

    return UpsClient;

  }).call(this);

  module.exports = {UpsClient};

}).call(this);
