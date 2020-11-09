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
    no-unused-vars,
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
import moment from "moment-timezone";
import { ShipperClient, STATUS_TYPES } from "./shipper";

class LasershipClient extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ["Released", STATUS_TYPES.DELIVERED],
    ["Delivered", STATUS_TYPES.DELIVERED],
    ["OutForDelivery", STATUS_TYPES.OUT_FOR_DELIVERY],
    ["Arrived", STATUS_TYPES.EN_ROUTE],
    ["Received", STATUS_TYPES.EN_ROUTE],
    ["OrderReceived", STATUS_TYPES.SHIPPING],
    ["OrderCreated", STATUS_TYPES.SHIPPING],
  ]);

  validateResponse(response, cb) {
    try {
      response = JSON.parse(response);
      if (response.Events == null) {
        return cb({ error: "missing events" });
      }
      return cb(null, response);
    } catch (error) {
      return cb(error);
    }
  }

  presentAddress(address) {
    const city = address.City;
    const stateCode = address.State;
    const postalCode = address.PostalCode;
    const countryCode = address.Country;
    return this.presentLocation({
      city,
      stateCode,
      countryCode,
      postalCode,
    });
  }

  presentStatus(eventType) {
    if (eventType != null) {
      return this.STATUS_MAP.get(eventType);
    }
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    let status = null;
    let rawActivities = shipment != null ? shipment.Events : undefined;
    rawActivities = Array.from(rawActivities || []);
    for (const rawActivity of rawActivities) {
      let timestamp;
      const location = this.presentAddress(rawActivity);
      const dateTime = rawActivity != null ? rawActivity.DateTime : undefined;
      if (dateTime != null) {
        timestamp = moment(`${dateTime}Z`).toDate();
      }
      const details =
        rawActivity != null ? rawActivity.EventShortText : undefined;
      if (details != null && timestamp != null) {
        const activity = { timestamp, location, details };
        activities.push(activity);
      }
      if (!status) {
        status = this.presentStatus(
          rawActivity != null ? rawActivity.EventType : undefined
        );
      }
    }
    return { activities, status };
  }

  getEta(shipment) {
    if (
      (shipment != null ? shipment.EstimatedDeliveryDate : undefined) == null
    ) {
      return;
    }
    return moment(`${shipment.EstimatedDeliveryDate}T00:00:00Z`).toDate();
  }

  getService() {
    return undefined;
  }

  getWeight(shipment) {
    if (!shipment?.Pieces?.length) {
      return;
    }
    const piece = shipment.Pieces[0];
    let weight = `${piece.Weight}`;
    const units = piece.WeightUnit;
    if (units != null) {
      weight = `${weight} ${units}`;
    }
    return weight;
  }

  getDestination(shipment) {
    const destination = shipment != null ? shipment.Destination : undefined;
    if (destination == null) {
      return;
    }
    return this.presentAddress(destination);
  }

  requestOptions({ trackingNumber }) {
    return {
      method: "GET",
      uri: `http://www.lasership.com/track/${trackingNumber}/json`,
    };
  }
}

export { LasershipClient };
