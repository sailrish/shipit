/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Builder, Parser } from 'xml2js';
import { find } from 'underscore';
import moment from 'moment-timezone';
import { titleCase } from 'change-case';
import { ShipperClient } from './shipper';

var FedexClient = (function() {
  let STATUS_MAP = undefined;
  FedexClient = class FedexClient extends ShipperClient {
    static initClass() {
  
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
    }

    constructor({key, password, account, meter}, options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super(); }
        let thisFn = (() => { return this; }).toString();
        let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
        eval(`${thisName} = this;`);
      }
      this.key = key;
      this.password = password;
      this.account = account;
      this.meter = meter;
      this.options = options;
      super();
      this.parser = new Parser();
      this.builder = new Builder({renderOpts: {pretty: false}});
    }

    generateRequest(trk, reference) {
      if (reference == null) { reference = 'n/a'; }
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
      const handleResponse = function(xmlErr, trackResult) {
        if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr); }
        const notifications = trackResult['TrackReply'] != null ? trackResult['TrackReply']['Notifications'] : undefined;
        const success = find(notifications, notice => __guard__(notice != null ? notice['Code'] : undefined, x => x[0]) === '0');
        if (!success) { return cb(notifications || 'invalid reply'); }
        return cb(null, __guard__(trackResult['TrackReply'] != null ? trackResult['TrackReply']['TrackDetails'] : undefined, x => x[0]));
      };
      this.parser.reset();
      return this.parser.parseString(response, handleResponse);
    }

    presentAddress(address) {
      if (address == null) { return; }
      let city = address['City'] != null ? address['City'][0] : undefined;
      if (city != null) { city = city.replace('FEDEX SMARTPOST ', ''); }
      const stateCode = address['StateOrProvinceCode'] != null ? address['StateOrProvinceCode'][0] : undefined;
      const countryCode = address['CountryCode'] != null ? address['CountryCode'][0] : undefined;
      const postalCode = address['PostalCode'] != null ? address['PostalCode'][0] : undefined;
      return this.presentLocation({city, stateCode, countryCode, postalCode});
    }

    getStatus(shipment) {
      const statusCode = __guard__(shipment != null ? shipment['StatusCode'] : undefined, x => x[0]);
      if (statusCode == null) { return; }
      if (STATUS_MAP[statusCode] != null) { return STATUS_MAP[statusCode]; } else { return ShipperClient.STATUS_TYPES.UNKNOWN; }
    }

    getActivitiesAndStatus(shipment) {
      const activities = [];
      const status = null;
      for (let rawActivity of Array.from(shipment['Events'] || [])) {
        var datetime, timestamp;
        const location = this.presentAddress(rawActivity['Address'] != null ? rawActivity['Address'][0] : undefined);
        const raw_timestamp = rawActivity['Timestamp'] != null ? rawActivity['Timestamp'][0] : undefined;
        if (raw_timestamp != null) {
          const event_time = moment(raw_timestamp);
          timestamp = event_time.toDate();
          datetime = raw_timestamp.slice(0, 19);
        }
        const details = rawActivity['EventDescription'] != null ? rawActivity['EventDescription'][0] : undefined;
        if ((details != null) && (timestamp != null)) {
          const activity = {timestamp, datetime, location, details};
          activities.push(activity);
        }
      }
      return {activities, status: this.getStatus(shipment)};
    }

    getEta(shipment) {
      const ts = __guard__(shipment != null ? shipment['EstimatedDeliveryTimestamp'] : undefined, x => x[0]);
      if (ts == null) { return; }
      return moment(`${ts.slice(0, 19)}Z`).toDate();
    }

    getService(shipment) {
      return __guard__(shipment != null ? shipment['ServiceInfo'] : undefined, x => x[0]);
    }

    getWeight(shipment) {
      const weightData = __guard__(shipment != null ? shipment['PackageWeight'] : undefined, x => x[0]);
      if (weightData == null) { return; }
      const units = weightData['Units'] != null ? weightData['Units'][0] : undefined;
      const value = weightData['Value'] != null ? weightData['Value'][0] : undefined;
      if ((units != null) && (value != null)) { return `${value} ${units}`; }
    }

    getDestination(shipment) {
      return this.presentAddress(shipment['DestinationAddress'] != null ? shipment['DestinationAddress'][0] : undefined);
    }

    requestOptions({trackingNumber, reference}) {
      return {
        method: 'POST',
        uri: 'https://ws.fedex.com/xml',
        body: this.generateRequest(trackingNumber, reference)
      };
    }
  };
  FedexClient.initClass();
  return FedexClient;
})();


export default {FedexClient};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}