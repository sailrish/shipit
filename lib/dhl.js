(function() {
  var DhlClient, Parser, ShipperClient, lowerCase, moment, titleCase, upperCaseFirst;

  ({Parser} = require('xml2js'));

  moment = require('moment-timezone');

  ({titleCase, upperCaseFirst, lowerCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  DhlClient = (function() {
    var STATUS_MAP;

    class DhlClient extends ShipperClient {
      constructor({userId, password}, options) {
        super();
        this.userId = userId;
        this.password = password;
        this.options = options;
        this.parser = new Parser();
      }

      generateRequest(trk) {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<req:KnownTrackingRequest xmlns:req="http://www.dhl.com">\n  <Request>\n    <ServiceHeader>\n      <SiteID>${this.userId}</SiteID>\n      <Password>${this.password}</Password>\n    </ServiceHeader>\n  </Request>\n  <LanguageCode>en</LanguageCode>\n  <AWBNumber>${trk}</AWBNumber>\n  <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>\n</req:KnownTrackingRequest>`;
      }

      validateResponse(response, cb) {
        var handleResponse;
        handleResponse = function(xmlErr, trackResult) {
          var awbInfo, ref, ref1, ref2, shipment, statusCode, trackStatus, trackingResponse;
          if ((xmlErr != null) || (trackResult == null)) {
            return cb(xmlErr);
          }
          trackingResponse = trackResult['req:TrackingResponse'];
          if (trackingResponse == null) {
            return cb({
              error: 'no tracking response'
            });
          }
          awbInfo = (ref = trackingResponse['AWBInfo']) != null ? ref[0] : void 0;
          if (awbInfo == null) {
            return cb({
              error: 'no AWBInfo in response'
            });
          }
          shipment = (ref1 = awbInfo['ShipmentInfo']) != null ? ref1[0] : void 0;
          if (shipment == null) {
            return cb({
              error: 'could not find shipment'
            });
          }
          trackStatus = (ref2 = awbInfo['Status']) != null ? ref2[0] : void 0;
          statusCode = trackStatus != null ? trackStatus['ActionStatus'] : void 0;
          if (statusCode.toString() !== 'success') {
            return cb({
              error: `unexpected track status code=${statusCode}`
            });
          }
          return cb(null, shipment);
        };
        this.parser.reset();
        return this.parser.parseString(response, handleResponse);
      }

      getEta(shipment) {
        var eta, formatSpec, ref;
        eta = (ref = shipment['EstDlvyDate']) != null ? ref[0] : void 0;
        formatSpec = 'YYYYMMDD HHmmss ZZ';
        if (eta != null) {
          return moment(eta, formatSpec).toDate();
        }
      }

      getService(shipment) {}

      getWeight(shipment) {
        var ref, weight;
        weight = (ref = shipment['Weight']) != null ? ref[0] : void 0;
        if (weight != null) {
          return `${weight} LB`;
        }
      }

      presentTimestamp(dateString, timeString) {
        var formatSpec, inputString;
        if (dateString == null) {
          return;
        }
        if (timeString == null) {
          timeString = '00:00';
        }
        inputString = `${dateString} ${timeString} +0000`;
        formatSpec = 'YYYYMMDD HHmmss ZZ';
        return moment(inputString, formatSpec).toDate();
      }

      presentAddress(rawAddress) {
        var city, countryCode, firstComma, firstDash, stateCode;
        if (rawAddress == null) {
          return;
        }
        firstComma = rawAddress.indexOf(',');
        firstDash = rawAddress.indexOf('-', firstComma);
        if (firstComma > -1 && firstDash > -1) {
          city = rawAddress.substring(0, firstComma).trim();
          stateCode = rawAddress.substring(firstComma + 1, firstDash).trim();
          countryCode = rawAddress.substring(firstDash + 1).trim();
        } else if (firstComma < 0 && firstDash > -1) {
          city = rawAddress.substring(0, firstDash).trim();
          stateCode = null;
          countryCode = rawAddress.substring(firstDash + 1).trim();
        } else {
          return rawAddress;
        }
        city = city.replace(' HUB', '');
        city = city.replace(' GATEWAY', '');
        return this.presentLocation({city, stateCode, countryCode});
      }

      presentDetails(rawAddress, rawDetails) {
        if (rawDetails == null) {
          return;
        }
        if (rawAddress == null) {
          return rawDetails;
        }
        return rawDetails.replace(/\s\s+/, ' ').trim().replace(new RegExp(`(?: at| in)? ${rawAddress.trim()}$`), '');
      }

      presentStatus(status) {
        return STATUS_MAP[status] || ShipperClient.STATUS_TYPES.UNKNOWN;
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, details, i, len, location, rawActivities, rawActivity, rawLocation, ref, ref1, ref10, ref11, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, status, timestamp;
        activities = [];
        status = null;
        rawActivities = shipment['ShipmentEvent'];
        if (rawActivities == null) {
          rawActivities = [];
        }
        rawActivities.reverse();
        ref = rawActivities || [];
        for (i = 0, len = ref.length; i < len; i++) {
          rawActivity = ref[i];
          rawLocation = (ref1 = rawActivity['ServiceArea']) != null ? (ref2 = ref1[0]) != null ? (ref3 = ref2['Description']) != null ? ref3[0] : void 0 : void 0 : void 0;
          location = this.presentAddress(rawLocation);
          timestamp = this.presentTimestamp((ref4 = rawActivity['Date']) != null ? ref4[0] : void 0, (ref5 = rawActivity['Time']) != null ? ref5[0] : void 0);
          details = this.presentDetails(rawLocation, (ref6 = rawActivity['ServiceEvent']) != null ? (ref7 = ref6[0]) != null ? (ref8 = ref7['Description']) != null ? ref8[0] : void 0 : void 0 : void 0);
          if ((details != null) && (timestamp != null)) {
            details = details.slice(-1) === '.' ? details.slice(0, -1) : details;
            activity = {timestamp, location, details};
            activities.push(activity);
          }
          if (!status) {
            status = this.presentStatus((ref9 = rawActivity['ServiceEvent']) != null ? (ref10 = ref9[0]) != null ? (ref11 = ref10['EventCode']) != null ? ref11[0] : void 0 : void 0 : void 0);
          }
        }
        return {activities, status};
      }

      getDestination(shipment) {
        var destination, ref, ref1, ref2;
        destination = (ref = shipment['DestinationServiceArea']) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1['Description']) != null ? ref2[0] : void 0 : void 0 : void 0;
        if (destination == null) {
          return;
        }
        return this.presentAddress(destination);
      }

      requestOptions({trackingNumber}) {
        return {
          method: 'POST',
          uri: 'http://xmlpi-ea.dhl.com/XMLShippingServlet',
          body: this.generateRequest(trackingNumber)
        };
      }

    };

    STATUS_MAP = {
      'AD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'AF': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'AR': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'BA': ShipperClient.STATUS_TYPES.DELAYED,
      'BN': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'BR': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'CA': ShipperClient.STATUS_TYPES.DELAYED,
      'CC': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'CD': ShipperClient.STATUS_TYPES.DELAYED,
      'CM': ShipperClient.STATUS_TYPES.DELAYED,
      'CR': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'CS': ShipperClient.STATUS_TYPES.DELAYED,
      'DD': ShipperClient.STATUS_TYPES.DELIVERED,
      'DF': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'DS': ShipperClient.STATUS_TYPES.DELAYED,
      'FD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'HP': ShipperClient.STATUS_TYPES.DELAYED,
      'IC': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'MC': ShipperClient.STATUS_TYPES.DELAYED,
      'MD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'MS': ShipperClient.STATUS_TYPES.DELAYED,
      'ND': ShipperClient.STATUS_TYPES.DELAYED,
      'NH': ShipperClient.STATUS_TYPES.DELAYED,
      'OH': ShipperClient.STATUS_TYPES.DELAYED,
      'OK': ShipperClient.STATUS_TYPES.DELIVERED,
      'PD': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'PL': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'PO': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'PU': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'RD': ShipperClient.STATUS_TYPES.DELAYED,
      'RR': ShipperClient.STATUS_TYPES.DELAYED,
      'RT': ShipperClient.STATUS_TYPES.DELAYED,
      'SA': ShipperClient.STATUS_TYPES.SHIPPING,
      'SC': ShipperClient.STATUS_TYPES.DELAYED,
      'SS': ShipperClient.STATUS_TYPES.DELAYED,
      'TD': ShipperClient.STATUS_TYPES.DELAYED,
      'TP': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'TR': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'UD': ShipperClient.STATUS_TYPES.DELAYED,
      'WC': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'WX': ShipperClient.STATUS_TYPES.DELAYED
    };

    return DhlClient;

  }).call(this);

  module.exports = {DhlClient};

}).call(this);
