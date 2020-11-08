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
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { titleCase } from "change-case";
import { endOfDay, startOfDay } from "date-fns";
import request from "request";

// import moment from 'moment-timezone';

export enum STATUS_TYPES {
  UNKNOWN = 0,
  SHIPPING = 1,
  EN_ROUTE = 2,
  OUT_FOR_DELIVERY = 3,
  DELIVERED = 4,
  DELAYED = 5,
}

export interface IShipperClientOptions {
  /**
   * response includes the raw response received from the shipping carrier API.
   */
  raw?: boolean;
  /**
   * Number of milliseconds before requests to carriers timeout.
   * This option can be overridden by a `timeout` attribute in the object passed on to the `requestData()` call.
   */
  timeout?: number;
}

export abstract class ShipperClient {
  public abstract validateResponse(response: any, cb: any): any;

  public abstract getActivitiesAndStatus(shipment: any): any;

  public abstract getEta(shipment: any): Date;

  public abstract getService(shipment: any): any;

  public abstract getWeight(shipment: any): any;

  public abstract getDestination(shipment: any): any;

  public abstract requestOptions(options: any): any;

  // TODO: Convert to a typed abstract object class?
  public options: IShipperClientOptions = { timeout: 2000 };

  constructor(options?: IShipperClientOptions) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  private presentPostalCode(rawCode: string): string {
    rawCode = rawCode?.trim() || undefined;
    if (/^\d{9}$/.test(rawCode)) {
      return `${rawCode.slice(0, 5)}-${rawCode.slice(5)}`;
    } else {
      return rawCode;
    }
  }

  public presentLocationString(location: string): string {
    const newFields = [];
    for (let field of location?.split(",") || []) {
      field = field.trim();
      if (field.length > 2) {
        field = titleCase(field);
      }
      newFields.push(field);
    }

    return newFields.join(", ");
  }

  public presentLocation({ city, stateCode, countryCode, postalCode }): string {
    let address: string;
    if (city?.length) {
      city = titleCase(city);
    }
    if (stateCode != null ? stateCode.length : undefined) {
      stateCode = stateCode.trim();
      if (stateCode.length > 3) {
        stateCode = titleCase(stateCode);
      }
      if (city?.length) {
        city = city.trim();
        address = `${city}, ${stateCode}`;
      } else {
        address = stateCode;
      }
    } else {
      address = city;
    }
    postalCode = this.presentPostalCode(postalCode);
    if (countryCode?.length) {
      countryCode = countryCode.trim();
      if (countryCode.length > 3) {
        countryCode = titleCase(countryCode);
      }
      if (address?.length) {
        address = countryCode !== "US" ? `${address}, ${countryCode}` : address;
      } else {
        address = countryCode;
      }
    }
    if (postalCode?.length) {
      address = address != null ? `${address} ${postalCode}` : postalCode;
    }
    return address;
  }

  public presentResponse(response, requestData, cb) {
    // TODO: Remove Unsafe return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.validateResponse(response, (err, shipment) => {
      let adjustedEta: Date;
      if (err != null || shipment == null) {
        return cb(err);
      }
      const { activities, status } = this.getActivitiesAndStatus(shipment);
      const eta = this.getEta(shipment);
      if (eta && startOfDay(eta) === eta) {
        adjustedEta = endOfDay(eta);
      }
      if (adjustedEta === null) {
        adjustedEta = eta;
      }
      const presentedResponse = {
        eta: adjustedEta || eta,
        service: this.getService(shipment),
        weight: this.getWeight(shipment),
        destination: this.getDestination(shipment),
        activities,
        status,
        raw: undefined,
        request: undefined,
      };
      if (requestData?.raw || this.options?.raw) {
        presentedResponse.raw = response;
      }
      presentedResponse.request = requestData;
      return cb(null, presentedResponse);
    });
  }

  public requestData(requestData, cb) {
    const opts = this.requestOptions(requestData);
    opts.timeout = requestData?.timeout || this.options?.timeout;
    return request(opts, (err, response, body) => {
      if (body == null || err != null) {
        return cb(err);
      }
      if (response.statusCode !== 200) {
        return cb(`response status ${response.statusCode}`);
      }
      return this.presentResponse(body, requestData, cb);
    });
  }
}
