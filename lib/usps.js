(function() {
  var Builder, Parser, ShipperClient, UspsClient, lowerCase, moment, request, titleCase, upperCaseFirst;

  ({Builder, Parser} = require('xml2js'));

  request = require('request');

  moment = require('moment-timezone');

  ({titleCase, upperCaseFirst, lowerCase} = require('change-case'));

  ({ShipperClient} = require('./shipper'));

  UspsClient = (function() {
    var STATUS_MAP;

    class UspsClient extends ShipperClient {
      constructor({userId}, options) {
        super();
        this.userId = userId;
        this.options = options;
        this.parser = new Parser();
        this.builder = new Builder({
          renderOpts: {
            pretty: false
          }
        });
      }

      generateRequest(trk, clientIp = '127.0.0.1') {
        return this.builder.buildObject({
          'TrackFieldRequest': {
            '$': {
              'USERID': this.userId
            },
            'Revision': '1',
            'ClientIp': clientIp,
            'SourceId': 'shipit',
            'TrackID': {
              '$': {
                'ID': trk
              }
            }
          }
        });
      }

      validateResponse(response, cb) {
        var handleResponse;
        handleResponse = function(xmlErr, trackResult) {
          var ref, ref1, trackInfo;
          trackInfo = trackResult != null ? (ref = trackResult['TrackResponse']) != null ? (ref1 = ref['TrackInfo']) != null ? ref1[0] : void 0 : void 0 : void 0;
          if ((xmlErr != null) || (trackInfo == null)) {
            return cb(xmlErr);
          }
          return cb(null, trackInfo);
        };
        this.parser.reset();
        return this.parser.parseString(response, handleResponse);
      }

      getEta(shipment) {
        var rawEta, ref, ref1;
        rawEta = ((ref = shipment['PredictedDeliveryDate']) != null ? ref[0] : void 0) || ((ref1 = shipment['ExpectedDeliveryDate']) != null ? ref1[0] : void 0);
        if (rawEta != null) {
          return moment(`${rawEta} 00:00:00Z`).toDate();
        }
      }

      getService(shipment) {
        var ref, service;
        service = (ref = shipment['Class']) != null ? ref[0] : void 0;
        if (service != null) {
          return service.replace(/\<SUP\>.*\<\/SUP\>/, '');
        }
      }

      getWeight(shipment) {}

      presentTimestamp(dateString, timeString) {
        if (dateString == null) {
          return;
        }
        timeString = (timeString != null ? timeString.length : void 0) ? timeString : '12:00 am';
        return moment(`${dateString} ${timeString} +0000`).toDate();
      }

      presentStatus(status) {
        return ShipperClient.STATUS_TYPES.UNKNOWN;
      }

      getDestination(shipment) {
        var city, postalCode, ref, ref1, ref2, stateCode;
        city = (ref = shipment['DestinationCity']) != null ? ref[0] : void 0;
        stateCode = (ref1 = shipment['DestinationState']) != null ? ref1[0] : void 0;
        postalCode = (ref2 = shipment['DestinationZip']) != null ? ref2[0] : void 0;
        return this.presentLocation({city, stateCode, postalCode});
      }

      findStatusFromMap(statusText) {
        var regex, status, statusCode, text;
        status = ShipperClient.STATUS_TYPES.UNKNOWN;
        for (text in STATUS_MAP) {
          statusCode = STATUS_MAP[text];
          regex = new RegExp(text, 'i');
          if (regex.test(statusText)) {
            status = statusCode;
            break;
          }
        }
        return status;
      }

      getStatus(shipment) {
        var ref, ref1, statusCategory;
        statusCategory = shipment != null ? (ref = shipment['StatusCategory']) != null ? ref[0] : void 0 : void 0;
        switch (statusCategory) {
          case 'Pre-Shipment':
            return ShipperClient.STATUS_TYPES.SHIPPING;
          case 'Delivered':
            return ShipperClient.STATUS_TYPES.DELIVERED;
          default:
            return this.findStatusFromMap(shipment != null ? (ref1 = shipment['Status']) != null ? ref1[0] : void 0 : void 0);
        }
      }

      presentActivity(rawActivity) {
        var activity, city, countryCode, details, location, postalCode, ref, ref1, ref10, ref11, ref12, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, stateCode, timestamp;
        if (rawActivity == null) {
          return;
        }
        activity = null;
        city = (ref = rawActivity['EventCity']) != null ? ref[0] : void 0;
        if ((ref1 = rawActivity['EventState']) != null ? (ref2 = ref1[0]) != null ? ref2.length : void 0 : void 0) {
          stateCode = (ref3 = rawActivity['EventState']) != null ? ref3[0] : void 0;
        }
        if ((ref4 = rawActivity['EventZIPCode']) != null ? (ref5 = ref4[0]) != null ? ref5.length : void 0 : void 0) {
          postalCode = (ref6 = rawActivity['EventZIPCode']) != null ? ref6[0] : void 0;
        }
        if ((ref7 = rawActivity['EventCountry']) != null ? (ref8 = ref7[0]) != null ? ref8.length : void 0 : void 0) {
          countryCode = (ref9 = rawActivity['EventCountry']) != null ? ref9[0] : void 0;
        }
        location = this.presentLocation({city, stateCode, countryCode, postalCode});
        timestamp = this.presentTimestamp(rawActivity != null ? (ref10 = rawActivity['EventDate']) != null ? ref10[0] : void 0 : void 0, rawActivity != null ? (ref11 = rawActivity['EventTime']) != null ? ref11[0] : void 0 : void 0);
        details = rawActivity != null ? (ref12 = rawActivity['Event']) != null ? ref12[0] : void 0 : void 0;
        if ((details != null) && (timestamp != null)) {
          activity = {timestamp, location, details};
        }
        return activity;
      }

      getActivitiesAndStatus(shipment) {
        var activities, activity, i, len, rawActivity, ref, ref1, trackSummary;
        activities = [];
        trackSummary = this.presentActivity(shipment != null ? (ref = shipment['TrackSummary']) != null ? ref[0] : void 0 : void 0);
        if (trackSummary != null) {
          activities.push(trackSummary);
        }
        ref1 = (shipment != null ? shipment['TrackDetail'] : void 0) || [];
        for (i = 0, len = ref1.length; i < len; i++) {
          rawActivity = ref1[i];
          activity = this.presentActivity(rawActivity);
          if (activity != null) {
            activities.push(activity);
          }
        }
        return {
          activities: activities,
          status: this.getStatus(shipment)
        };
      }

      requestOptions({trackingNumber, clientIp, test}) {
        var endpoint, xml;
        endpoint = test ? 'ShippingAPITest.dll' : 'ShippingAPI.dll';
        xml = this.generateRequest(trackingNumber, clientIp);
        return {
          method: 'GET',
          uri: `http://production.shippingapis.com/${endpoint}?API=TrackV2&XML=${xml}`
        };
      }

    };

    STATUS_MAP = {
      'Accept': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Processed': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Depart': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Picked Up': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Arrival': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Sorting Complete': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Customs clearance': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Dispatch': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Arrive': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'In Transit': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Inbound Out of Customs': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Inbound Into Customs': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Forwarded': ShipperClient.STATUS_TYPES.EN_ROUTE,
      'Out for Delivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
      'Delivered': ShipperClient.STATUS_TYPES.DELIVERED,
      'Notice Left': ShipperClient.STATUS_TYPES.DELAYED,
      'Refused': ShipperClient.STATUS_TYPES.DELAYED,
      'Item being held': ShipperClient.STATUS_TYPES.DELAYED,
      'Missed delivery': ShipperClient.STATUS_TYPES.DELAYED,
      'Addressee not available': ShipperClient.STATUS_TYPES.DELAYED,
      'Undeliverable as Addressed': ShipperClient.STATUS_TYPES.DELAYED,
      'Tendered to Military Agent': ShipperClient.STATUS_TYPES.DELIVERED,
      'USPS Awaiting Item': ShipperClient.STATUS_TYPES.SHIPPING,
      'USPS in possession of item': ShipperClient.STATUS_TYPES.EN_ROUTE
    };

    return UspsClient;

  }).call(this);

  module.exports = {UspsClient};

}).call(this);
