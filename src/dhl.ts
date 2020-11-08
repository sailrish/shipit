/* eslint-disable
	@typescript-eslint/restrict-template-expressions,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-return,
	@typescript-eslint/no-unsafe-call,
	node/no-callback-literal
*/
/* eslint-disable
    constructor-super,
    no-constant-condition,
    no-eval,
    no-this-before-super,
    no-unused-vars
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
import moment from 'moment-timezone';
import { ShipperClient, STATUS_TYPES } from './shipper';

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

class DhlClient extends ShipperClient {

  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ['AD', STATUS_TYPES.EN_ROUTE],
    ['AF', STATUS_TYPES.EN_ROUTE],
    ['AR', STATUS_TYPES.EN_ROUTE],
    ['BA', STATUS_TYPES.DELAYED],
    ['BN', STATUS_TYPES.EN_ROUTE],
    ['BR', STATUS_TYPES.EN_ROUTE],
    ['CA', STATUS_TYPES.DELAYED],
    ['CC', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['CD', STATUS_TYPES.DELAYED],
    ['CM', STATUS_TYPES.DELAYED],
    ['CR', STATUS_TYPES.EN_ROUTE],
    ['CS', STATUS_TYPES.DELAYED],
    ['DD', STATUS_TYPES.DELIVERED],
    ['DF', STATUS_TYPES.EN_ROUTE],
    ['DS', STATUS_TYPES.DELAYED],
    ['FD', STATUS_TYPES.EN_ROUTE],
    ['HP', STATUS_TYPES.DELAYED],
    ['IC', STATUS_TYPES.EN_ROUTE],
    ['MC', STATUS_TYPES.DELAYED],
    ['MD', STATUS_TYPES.EN_ROUTE],
    ['MS', STATUS_TYPES.DELAYED],
    ['ND', STATUS_TYPES.DELAYED],
    ['NH', STATUS_TYPES.DELAYED],
    ['OH', STATUS_TYPES.DELAYED],
    ['OK', STATUS_TYPES.DELIVERED],
    ['PD', STATUS_TYPES.EN_ROUTE],
    ['PL', STATUS_TYPES.EN_ROUTE],
    ['PO', STATUS_TYPES.EN_ROUTE],
    ['PU', STATUS_TYPES.EN_ROUTE],
    ['RD', STATUS_TYPES.DELAYED],
    ['RR', STATUS_TYPES.DELAYED],
    ['RT', STATUS_TYPES.DELAYED],
    ['SA', STATUS_TYPES.SHIPPING],
    ['SC', STATUS_TYPES.DELAYED],
    ['SS', STATUS_TYPES.DELAYED],
    ['TD', STATUS_TYPES.DELAYED],
    ['TP', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['TR', STATUS_TYPES.EN_ROUTE],
    ['UD', STATUS_TYPES.DELAYED],
    ['WC', STATUS_TYPES.OUT_FOR_DELIVERY],
    ['WX', STATUS_TYPES.DELAYED],
  ]);

  get userId(): string { return this.options.userId; };
  get password(): string { return this.options.password; };
  parser: Parser;

  constructor(options) {
    super();
    this.options = options;
    this.parser = new Parser();
  }

  generateRequest(trk) {
    return `\
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<req:KnownTrackingRequest xmlns:req="http://www.dhl.com">
  <Request>
    <ServiceHeader>
      <SiteID>${this.userId}</SiteID>
      <Password>${this.password}</Password>
    </ServiceHeader>
  </Request>
  <LanguageCode>en</LanguageCode>
  <AWBNumber>${trk}</AWBNumber>
  <LevelOfDetails>ALL_CHECK_POINTS</LevelOfDetails>
</req:KnownTrackingRequest>\
`;
  }

  validateResponse(response, cb) {
    function handleResponse(xmlErr, trackResult) {
      if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr); }
      const trackingResponse = trackResult['req:TrackingResponse'];
      if (trackingResponse == null) { return cb({ error: 'no tracking response' }); }
      const awbInfo = trackingResponse.AWBInfo != null ? trackingResponse.AWBInfo[0] : undefined;
      if (awbInfo == null) { return cb({ error: 'no AWBInfo in response' }); }
      const shipment = awbInfo.ShipmentInfo != null ? awbInfo.ShipmentInfo[0] : undefined;
      if (shipment == null) { return cb({ error: 'could not find shipment' }); }
      const trackStatus = awbInfo.Status != null ? awbInfo.Status[0] : undefined;
      const statusCode = trackStatus != null ? trackStatus.ActionStatus : undefined;
      if (statusCode.toString() !== 'success') { return cb({ error: `unexpected track status code=${statusCode}` }); }
      return cb(null, shipment);
    }

    this.parser.reset();
    return this.parser.parseString(response, handleResponse);
  }

  getEta(shipment) {
    const eta = shipment.EstDlvyDate != null ? shipment.EstDlvyDate[0] : undefined;
    const formatSpec = 'YYYYMMDD HHmmss ZZ';
    if (eta != null) { return moment(eta, formatSpec).toDate(); }
  }

  getService(shipment) { }

  getWeight(shipment) {
    const weight = shipment.Weight != null ? shipment.Weight[0] : undefined;
    if (weight != null) { return `${weight} LB`; }
  }

  presentTimestamp(dateString, timeString) {
    if (dateString == null) { return; }
    if (timeString == null) { timeString = '00:00'; }
    const inputString = `${dateString} ${timeString} +0000`;
    const formatSpec = 'YYYYMMDD HHmmss ZZ';
    return moment(inputString, formatSpec).toDate();
  }

  presentAddress(rawAddress) {
    let city, countryCode, stateCode;
    if (rawAddress == null) { return; }
    const firstComma = rawAddress.indexOf(',');
    const firstDash = rawAddress.indexOf('-', firstComma);
    if ((firstComma > -1) && (firstDash > -1)) {
      city = rawAddress.substring(0, firstComma).trim();
      stateCode = rawAddress.substring(firstComma + 1, firstDash).trim();
      countryCode = rawAddress.substring(firstDash + 1).trim();
    } else if ((firstComma < 0) && (firstDash > -1)) {
      city = rawAddress.substring(0, firstDash).trim();
      stateCode = null;
      countryCode = rawAddress.substring(firstDash + 1).trim();
    } else {
      return rawAddress;
    }
    city = city.replace(' HUB', '');
    city = city.replace(' GATEWAY', '');
    return this.presentLocation({ city, stateCode, countryCode, postalCode: null });
  }

  presentDetails(rawAddress, rawDetails) {
    if (rawDetails == null) { return; }
    if (rawAddress == null) { return rawDetails; }
    return rawDetails.replace(/\s\s+/, ' ').trim().replace(new RegExp(`(?: at| in)? ${rawAddress.trim()}$`), '');
  }

  presentStatus(status) {
    return this.STATUS_MAP.get(status) || STATUS_TYPES.UNKNOWN;
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    let status = null;
    let rawActivities: any[] = shipment.ShipmentEvent;
    if (rawActivities == null) { rawActivities = []; }
    rawActivities.reverse();
    for (const rawActivity of Array.from(rawActivities || [])) {
      const rawLocation = __guard__(__guard__(rawActivity.ServiceArea != null ? rawActivity.ServiceArea[0] : undefined, x1 => x1.Description), x => x[0]);
      const location = this.presentAddress(rawLocation);
      const timestamp = this.presentTimestamp(rawActivity.Date != null ? rawActivity.Date[0] : undefined, rawActivity.Time != null ? rawActivity.Time[0] : undefined);
      let details = this.presentDetails(rawLocation, __guard__(__guard__(rawActivity.ServiceEvent != null ? rawActivity.ServiceEvent[0] : undefined, x3 => x3.Description), x2 => x2[0]));
      if ((details != null) && (timestamp != null)) {
        details = details.slice(-1) === '.' ? details.slice(0, +-2 + 1 || undefined) : details;
        const activity = { timestamp, location, details };
        activities.push(activity);
      }
      if (!status) {
        status = this.presentStatus(__guard__(__guard__(rawActivity.ServiceEvent != null ? rawActivity.ServiceEvent[0] : undefined, x5 => x5.EventCode), x4 => x4[0]));
      }
    }
    return { activities, status };
  }

  getDestination(shipment) {
    const destination = __guard__(__guard__(shipment.DestinationServiceArea != null ? shipment.DestinationServiceArea[0] : undefined, x1 => x1.Description), x => x[0]);
    if (destination == null) { return; }
    return this.presentAddress(destination);
  }

  requestOptions({ trackingNumber }) {
    return {
      method: 'POST',
      uri: 'http://xmlpi-ea.dhl.com/XMLShippingServlet',
      body: this.generateRequest(trackingNumber)
    };
  }
}

export { DhlClient };
