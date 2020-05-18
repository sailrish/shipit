/* eslint-disable
    constructor-super,
    no-constant-condition,
    no-eval,
    no-this-before-super,
    no-unused-vars,
    standard/no-callback-literal,
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
import { Parser } from 'xml2js';
import moment, { min } from 'moment-timezone';
import { ShipperClient, STATUS_TYPES } from './shipper';

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

class CanadaPostClient extends ShipperClient {

  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ['in transit', STATUS_TYPES.EN_ROUTE],
    ['processed', STATUS_TYPES.EN_ROUTE],
    ['information submitted', STATUS_TYPES.SHIPPING],
    ['Shipment picked up', STATUS_TYPES.SHIPPING],
    ['Shipment received', STATUS_TYPES.EN_ROUTE],
    ['delivered', STATUS_TYPES.DELIVERED],
    ['out for delivery', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['item released', STATUS_TYPES.EN_ROUTE],
    ['arrived', STATUS_TYPES.EN_ROUTE],
    ['departed', STATUS_TYPES.EN_ROUTE],
    ['is en route', STATUS_TYPES.EN_ROUTE],
    ['item mailed', STATUS_TYPES.SHIPPING],
    ['available for pickup', STATUS_TYPES.DELAYED],
    ['Attempted delivery', STATUS_TYPES.DELAYED]
  ]);

  get username(): string { return this.options.username; };
  get password(): string { return this.options.password; };
  parser: Parser;

  constructor(options) {
    super();
    this.options = options;
    this.parser = new Parser();
  }

  validateResponse(response, cb) {
    function handleResponse(xmlErr, trackResult) {
      if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr); }
      const details = trackResult['tracking-detail'];
      if (details == null) { return cb('response not recognized'); }
      return cb(null, details);
    }

    this.parser.reset();
    return this.parser.parseString(response, handleResponse);
  }

  findStatusFromMap(statusText) {
    let status = STATUS_TYPES.UNKNOWN;
    if (statusText && statusText.length > 0) {
      for (const [key, value] of this.STATUS_MAP) {
        if (statusText?.toLowerCase().includes(key?.toLowerCase())) {
          status = value;
          break;
        }
      }
    }
    return status;
  }

  getStatus(lastEvent) {
    return this.findStatusFromMap(lastEvent != null ? lastEvent.details : undefined);
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    const events = __guard__(shipment['significant-events'] != null ? shipment['significant-events'][0] : undefined, x => x.occurrence);
    for (const event of Array.from(events || [])) {
      const city = event['event-site'] != null ? event['event-site'][0] : undefined;
      const stateCode = event['event-province'] != null ? event['event-province'][0] : undefined;
      const location = this.presentLocation({ city, stateCode, countryCode: null, postalCode: null });
      const timestampString = `${(event['event-date'] != null ? event['event-date'][0] : undefined)}T${(event['event-time'] != null ? event['event-time'][0] : undefined)}Z`;
      const timestamp = moment(timestampString).toDate();
      const details = event['event-description'] != null ? event['event-description'][0] : undefined;
      if ((details != null) && (timestamp != null)) {
        const activity = { timestamp, location, details };
        activities.push(activity);
      }
    }
    return { activities, status: this.getStatus(activities != null ? activities[0] : undefined) };
  }

  getEta(shipment) {
    const ts = (shipment['changed-expected-date'] != null ? shipment['changed-expected-date'][0] : undefined) ||
      (shipment['expected-delivery-date'] != null ? shipment['expected-delivery-date'][0] : undefined);
    if (!(ts != null ? ts.length : undefined)) { return; }
    if (ts != null ? ts.length : undefined) { return moment(`${ts}T00:00:00Z`).toDate(); }
  }

  getService(shipment) {
    return (shipment['service-name'] != null ? shipment['service-name'][0] : undefined);
  }

  getWeight() { }

  getDestination(shipment) {
    return (shipment['destination-postal-id'] != null ? shipment['destination-postal-id'][0] : undefined);
  }

  requestOptions({ trackingNumber }) {
    return {
      method: 'GET',
      uri: `https://soa-gw.canadapost.ca/vis/track/pin/${trackingNumber}/detail.xml`,
      auth: { user: this.username, pass: this.password }
    };
  }
}

export { CanadaPostClient };
