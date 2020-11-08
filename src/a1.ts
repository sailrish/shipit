/* eslint-disable
	@typescript-eslint/restrict-template-expressions,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-return,
	@typescript-eslint/no-unsafe-call,
	node/no-callback-literal
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Parser } from 'xml2js';
import moment from 'moment-timezone';
import { ShipperClient, STATUS_TYPES } from './shipper';

class A1Client extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ['101', STATUS_TYPES.EN_ROUTE],
    ['102', STATUS_TYPES.EN_ROUTE],
    ['302', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['304', STATUS_TYPES.DELAYED],
    ['301', STATUS_TYPES.DELIVERED]
  ]);

  parser: Parser;

  constructor(options) {
    super();
    this.options = options;
    this.parser = new Parser();
  }

  validateResponse(response, cb) {
    function handleResponse(xmlErr, trackResult) {
      if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr); }
      const trackingInfo = trackResult?.AmazonTrackingResponse?.PackageTrackingInfo?.[0];
      if (trackingInfo?.TrackingNumber == null) {
        const errorInfo = trackResult?.AmazonTrackingResponse?.TrackingErrorInfo?.[0];
        const error = errorInfo?.TrackingErrorDetail?.[0]?.ErrorDetailCodeDesc?.[0];
        if (error != null) { return cb(error); }
        cb('unknown error');
      }
      return cb(null, trackingInfo);
    }

    this.parser.reset();
    return this.parser.parseString(response, handleResponse);
  }

  presentAddress(address) {
    if (address == null) { return; }
    const city = address?.City?.[0];
    const stateCode = address?.StateProvince?.[0];
    const countryCode = address?.CountryCode?.[0];
    const postalCode = address?.PostalCode?.[0];
    return this.presentLocation({ city, stateCode, countryCode, postalCode });
  }

  getStatus(shipment) {
    const lastActivity = shipment?.TrackingEventHistory?.[0]?.TrackingEventDetail?.[0];
    const statusCode = lastActivity?.EventCode?.[0];
    if (statusCode == null) { return; }
    const code = statusCode.match(/EVENT_(.*)$/)?.[1];
    if (isNaN(code)) { return; }
    if (this.STATUS_MAP.has(code.toString())) {
      return this.STATUS_MAP.get(code.toString());
    } else {
      if (code < 300) {
        return STATUS_TYPES.EN_ROUTE;
      } else {
        return STATUS_TYPES.UNKNOWN;
      }
    }
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    const status = this.getStatus(shipment);
    let rawActivities: any[] = shipment?.TrackingEventHistory?.[0]?.TrackingEventDetail;
    rawActivities = rawActivities ?? [];
    for (const rawActivity of rawActivities) {
      let datetime, timestamp;
      const location = this.presentAddress(rawActivity?.EventLocation?.[0]);
      const rawTimestamp = rawActivity?.EventDateTime?.[0];
      if (rawTimestamp != null) {
        const eventTime = moment(rawTimestamp);
        timestamp = eventTime.toDate();
        datetime = rawTimestamp.slice(0, 19);
      }
      const details = rawActivity?.EventCodeDesc?.[0];

      if ((details != null) && (timestamp != null)) {
        const activity = { timestamp, datetime, location, details };
        activities.push(activity);
      }
    }
    return { activities, status };
  }

  getEta(shipment) {
    const activities = shipment?.TrackingEventHistory?.[0]?.TrackingEventDetail || [];
    const firstActivity = activities[activities.length - 1];
    if (firstActivity?.EstimatedDeliveryDate?.[0] == null) { return; }
    return moment(`${firstActivity?.EstimatedDeliveryDate?.[0]}T00:00:00Z`).toDate();
  }

  getService(shipment) {
    return null;
  }

  getWeight(shipment) {
    return null;
  }

  getDestination(shipment) {
    return this.presentAddress(shipment?.PackageDestinationLocation?.[0]);
  }

  requestOptions({ trackingNumber }) {
    return {
      method: 'GET',
      uri: `http://www.aoneonline.com/pages/customers/trackingrequest.php?tracking_number=${trackingNumber}`
    };
  }
}

export { A1Client };
