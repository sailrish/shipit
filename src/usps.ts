/* eslint-disable
    constructor-super,
    no-constant-condition,
    no-eval,
    no-this-before-super,
    no-unused-vars,
    no-useless-escape,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
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
import moment from 'moment-timezone';
import { ShipperClient, STATUS_TYPES } from './shipper';

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

class UspsClient extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ['Accept', STATUS_TYPES.EN_ROUTE],
    ['Processed', STATUS_TYPES.EN_ROUTE],
    ['Depart', STATUS_TYPES.EN_ROUTE],
    ['Picked Up', STATUS_TYPES.EN_ROUTE],
    ['Arrival', STATUS_TYPES.EN_ROUTE],
    ['Sorting Complete', STATUS_TYPES.EN_ROUTE],
    ['Customs clearance', STATUS_TYPES.EN_ROUTE],
    ['Dispatch', STATUS_TYPES.EN_ROUTE],
    ['Arrive', STATUS_TYPES.EN_ROUTE],
    ['In Transit', STATUS_TYPES.EN_ROUTE],
    ['Inbound Out of Customs', STATUS_TYPES.EN_ROUTE],
    ['Inbound Into Customs', STATUS_TYPES.EN_ROUTE],
    ['Forwarded', STATUS_TYPES.EN_ROUTE],
    ['Out for Delivery', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['Delivered', STATUS_TYPES.DELIVERED],
    ['Notice Left', STATUS_TYPES.DELAYED],
    ['Refused', STATUS_TYPES.DELAYED],
    ['Item being held', STATUS_TYPES.DELAYED],
    ['Missed delivery', STATUS_TYPES.DELAYED],
    ['Addressee not available', STATUS_TYPES.DELAYED],
    ['Undeliverable as Addressed', STATUS_TYPES.DELAYED],
    ['Tendered to Military Agent', STATUS_TYPES.DELIVERED],
    ['USPS Awaiting Item', STATUS_TYPES.SHIPPING],
    ['USPS in possession of item', STATUS_TYPES.EN_ROUTE],
  ]);

  get userId(): string { return this.options.userId; };
  parser: Parser;
  builder: Builder;

  constructor(options) {
    super();
    this.options = options;
    this.parser = new Parser();
    this.builder = new Builder({ renderOpts: { pretty: false } });
  }

  generateRequest(trk, clientIp) {
    if (clientIp == null) { clientIp = '127.0.0.1'; }
    return this.builder.buildObject({
      TrackFieldRequest: {
        $: { USERID: this.userId },
        Revision: '1',
        ClientIp: clientIp,
        SourceId: 'shipit',
        TrackID: {
          $: { ID: trk }
        }
      }
    });
  }

  validateResponse(response, cb) {
    function handleResponse(xmlErr, trackResult) {
      const trackInfo = __guard__(__guard__(trackResult != null ? trackResult.TrackResponse : undefined, x1 => x1.TrackInfo), x => x[0]);
      if ((xmlErr != null) || (trackInfo == null)) { return cb(xmlErr); }
      return cb(null, trackInfo);
    }

    this.parser.reset();
    return this.parser.parseString(response, handleResponse);
  }

  getEta(shipment) {
    const rawEta =
      (shipment.PredictedDeliveryDate != null ? shipment.PredictedDeliveryDate[0] : undefined) ||
      (shipment.ExpectedDeliveryDate != null ? shipment.ExpectedDeliveryDate[0] : undefined);
    if (rawEta != null) { return moment(`${rawEta} 00:00:00Z`).toDate(); }
  }

  getService(shipment) {
    const service = shipment.Class != null ? shipment.Class[0] : undefined;
    if (service != null) { return service.replace(/\<SUP\>.*\<\/SUP\>/, ''); }
  }

  getWeight(shipment) { }

  presentTimestamp(dateString, timeString) {
    if (dateString == null) { return; }
    timeString = (timeString != null ? timeString.length : undefined) ? timeString : '12:00 am';
    return moment(`${dateString} ${timeString} +0000`).toDate();
  }

  // Whyy???
  // presentStatus(status) {
  //   return STATUS_TYPES.UNKNOWN;
  // }

  // findStatusFromMap(statusText) {
  //   let status = STATUS_TYPES.UNKNOWN;
  //   for (const text in this.STATUS_MAP) {
  //     const statusCode = this.STATUS_MAP[text];
  //     const regex = new RegExp(text, 'i');
  //     if (regex.test(statusText)) {
  //       status = statusCode;
  //       break;
  //     }
  //   }
  //   return status;
  // }

  presentStatus(details: string) {
    let status = STATUS_TYPES.UNKNOWN;
    for (const [key, value] of this.STATUS_MAP) {
      if (details?.toLowerCase().includes(key?.toLowerCase())) {
        status = value;
        break;
      }
    }
    return status;
  }

  getDestination(shipment) {
    const city = shipment.DestinationCity != null ? shipment.DestinationCity[0] : undefined;
    const stateCode = shipment.DestinationState != null ? shipment.DestinationState[0] : undefined;
    const postalCode = shipment.DestinationZip != null ? shipment.DestinationZip[0] : undefined;
    return this.presentLocation({ city, stateCode, postalCode, countryCode: null });
  }

  getStatus(shipment) {
    const statusCategory = __guard__(shipment != null ? shipment.StatusCategory : undefined, x => x[0]);
    switch (statusCategory) {
      case 'Pre-Shipment': return STATUS_TYPES.SHIPPING;
      case 'Delivered': return STATUS_TYPES.DELIVERED;
      default: return this.presentStatus(__guard__(shipment != null ? shipment.Status : undefined, x1 => x1[0]));
    }
  }

  presentActivity(rawActivity) {
    let countryCode, postalCode, stateCode;
    if (rawActivity == null) { return; }
    let activity = null;
    const city = rawActivity.EventCity != null ? rawActivity.EventCity[0] : undefined;
    if (__guard__(rawActivity.EventState != null ? rawActivity.EventState[0] : undefined, x => x.length)) { stateCode = rawActivity.EventState != null ? rawActivity.EventState[0] : undefined; }
    if (__guard__(rawActivity.EventZIPCode != null ? rawActivity.EventZIPCode[0] : undefined, x1 => x1.length)) { postalCode = rawActivity.EventZIPCode != null ? rawActivity.EventZIPCode[0] : undefined; }
    if (__guard__(rawActivity.EventCountry != null ? rawActivity.EventCountry[0] : undefined, x2 => x2.length)) { countryCode = rawActivity.EventCountry != null ? rawActivity.EventCountry[0] : undefined; }
    const location = this.presentLocation({ city, stateCode, countryCode, postalCode });
    const timestamp = this.presentTimestamp(__guard__(rawActivity != null ? rawActivity.EventDate : undefined, x3 => x3[0]), __guard__(rawActivity != null ? rawActivity.EventTime : undefined, x4 => x4[0]));
    const details = __guard__(rawActivity != null ? rawActivity.Event : undefined, x5 => x5[0]);
    if ((details != null) && (timestamp != null)) {
      activity = { timestamp, location, details };
    }
    return activity;
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    const trackSummary = this.presentActivity(__guard__(shipment != null ? shipment.TrackSummary : undefined, x => x[0]));
    if (trackSummary != null) { activities.push(trackSummary); }
    for (const rawActivity of Array.from((shipment != null ? shipment.TrackDetail : undefined) || [])) {
      const activity = this.presentActivity(rawActivity);
      if (activity != null) { activities.push(activity); }
    }
    return { activities, status: this.getStatus(shipment) };
  }

  requestOptions({ trackingNumber, clientIp, test }) {
    const endpoint = test ? 'ShippingAPITest.dll' : 'ShippingAPI.dll';
    const xml = this.generateRequest(trackingNumber, clientIp);
    return {
      method: 'GET',
      uri: `http://production.shippingapis.com/${endpoint}?API=TrackV2&XML=${xml}`
    };
  }
}

export { UspsClient };
