/* eslint-disable
	@typescript-eslint/restrict-template-expressions,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-return,
	@typescript-eslint/no-unsafe-call,
	node/no-callback-literal
*/
import { lowerCase, titleCase, upperCaseFirst } from "change-case";
import moment from "moment-timezone";
/* eslint-disable
    constructor-super,
    no-cond-assign,
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
import { Builder, Parser } from "xml2js";
import {
  IShipperClientOptions,
  IShipperResponse,
  ShipperClient,
  STATUS_TYPES,
} from "./shipper";

interface IUpsClientOptions extends IShipperClientOptions {
  userId: string;
  password: string;
  licenseNumber: string;
}

class UpsClient extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ["D", STATUS_TYPES.DELIVERED],
    ["P", STATUS_TYPES.EN_ROUTE],
    ["M", STATUS_TYPES.SHIPPING],
  ]);

  get licenseNumber(): string {
    return this.options.licenseNumber;
  }

  get userId(): string {
    return this.options.userId;
  }

  get password(): string {
    return this.options.password;
  }

  public options: IUpsClientOptions;
  parser: Parser;
  builder: Builder;

  /**
   * Instantiates a Ups Client
   * @param options licenseNumber, userId, password are required
   */
  constructor(options: IUpsClientOptions) {
    super(options);
    // Todo: Check if this works
    // this.options = options;
    this.parser = new Parser();
    this.builder = new Builder({ renderOpts: { pretty: false } });
  }

  generateRequest(trk, reference) {
    if (reference == null) {
      reference = "n/a";
    }
    const accessRequest = this.builder.buildObject({
      AccessRequest: {
        AccessLicenseNumber: this.licenseNumber,
        UserId: this.userId,
        Password: this.password,
      },
    });

    const trackRequest = this.builder.buildObject({
      TrackRequest: {
        Request: {
          TransactionReference: { CustomerContext: reference },
          RequestAction: "track",
          RequestOption: 3,
        },
        TrackingNumber: trk,
      },
    });

    return `${accessRequest}${trackRequest}`;
  }

  async validateResponse(response: any): Promise<IShipperResponse> {
    this.parser.reset();
    try {
      const trackResult = await new Promise<any>((resolve, reject) => {
        this.parser.parseString(response, (xmlErr, trackResult) => {
          if (xmlErr) {
            reject(xmlErr);
          } else {
            resolve(trackResult);
          }
        });
      });

      if (trackResult == null) {
        return { err: new Error("TrackResult is empty") };
      }
      let errorMsg, shipment;
      const responseStatus =
        trackResult?.TrackResponse?.Response?.[0]
          ?.ResponseStatusDescription?.[0];
      if (responseStatus !== "Success") {
        const error =
          trackResult?.TrackResponse?.Response?.[0]?.Error?.[0]
            ?.ErrorDescription?.[0];
        errorMsg = error || "unknown error";
        shipment = null;
      } else {
        shipment =
          trackResult.TrackResponse.Shipment != null
            ? trackResult.TrackResponse.Shipment[0]
            : undefined;
        if (shipment == null) {
          errorMsg = "missing shipment data";
        }
      }
      if (errorMsg != null) {
        return { err: new Error(errorMsg) };
      }
      return { shipment };
    } catch (e) {
      return { err: e };
    }
  }

  getEta(shipment) {
    return this.presentTimestamp(
      shipment?.Package?.[0]?.RescheduledDeliveryDate?.[0] ||
        shipment?.ScheduledDeliveryDate?.[0] ||
        undefined
    );
  }

  getService(shipment) {
    const service = shipment?.Service?.[0]?.Description?.[0];
    if (service) {
      return titleCase(service);
    }
  }

  getWeight(shipment) {
    const weightData = shipment?.Package?.[0]?.PackageWeight?.[0];
    let weight = null;
    if (weightData) {
      const units = weightData?.UnitOfMeasurement?.[0]?.Code?.[0];
      weight = weightData.Weight != null ? weightData?.Weight?.[0] : undefined;
      if (weight != null && units) {
        weight = `${weight} ${units}`;
      }
    }
    return weight;
  }

  presentTimestamp(dateString?, timeString?) {
    if (dateString == null) {
      return;
    }
    if (timeString == null) {
      timeString = "00:00:00";
    }
    const formatSpec = "YYYYMMDD HHmmss ZZ";
    return moment(`${dateString} ${timeString} +0000`, formatSpec).toDate();
  }

  presentAddress(rawAddress) {
    if (!rawAddress) {
      return;
    }
    const city = rawAddress.City != null ? rawAddress.City[0] : undefined;
    const stateCode =
      rawAddress.StateProvinceCode != null
        ? rawAddress.StateProvinceCode[0]
        : undefined;
    const countryCode =
      rawAddress.CountryCode != null ? rawAddress.CountryCode[0] : undefined;
    const postalCode =
      rawAddress.PostalCode != null ? rawAddress.PostalCode[0] : undefined;
    return this.presentLocation({
      city,
      stateCode,
      countryCode,
      postalCode,
    });
  }

  presentStatus(status) {
    if (status == null) {
      return STATUS_TYPES.UNKNOWN;
    }

    const statusType = status?.StatusType?.[0]?.Code?.[0];
    const statusCode = status?.StatusCode?.[0]?.Code?.[0];
    if (this.STATUS_MAP.has(statusType)) {
      return this.STATUS_MAP.get(statusType);
    }

    switch (statusType) {
      case "I":
        switch (statusCode) {
          case "OF":
            return STATUS_TYPES.OUT_FOR_DELIVERY;
          default:
            return STATUS_TYPES.EN_ROUTE;
        }
      case "X":
        switch (statusCode) {
          case "U2":
            return STATUS_TYPES.EN_ROUTE;
          default:
            return STATUS_TYPES.DELAYED;
        }
      default:
        return STATUS_TYPES.UNKNOWN;
    }
  }

  getDestination(shipment) {
    return this.presentAddress(shipment?.ShipTo?.[0]?.Address?.[0]);
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    let status = null;
    const rawActivities: any[] = shipment?.Package?.[0]?.Activity;
    for (const rawActivity of Array.from(rawActivities || [])) {
      const location = this.presentAddress(
        rawActivity?.ActivityLocation?.[0]?.Address?.[0]
      );
      const timestamp = this.presentTimestamp(
        rawActivity.Date != null ? rawActivity.Date[0] : undefined,
        rawActivity.Time != null ? rawActivity.Time[0] : undefined
      );
      const lastStatus =
        rawActivity.Status != null ? rawActivity.Status[0] : undefined;
      let details = lastStatus?.StatusType?.[0]?.Description?.[0];
      if (details != null && timestamp != null) {
        const statusObj = rawActivity.Status;
        details = upperCaseFirst(lowerCase(details));
        const activity: any = { timestamp, location, details };
        if (statusObj != null ? rawActivity.Status[0] : undefined) {
          activity.statusType = statusObj?.StatusType?.[0]?.Code?.[0];
          activity.statusCode = statusObj?.StatusCode?.[0]?.Code?.[0];
        }
        activities.push(activity);
      }
      if (!status) {
        status = this.presentStatus(
          rawActivity.Status != null ? rawActivity.Status[0] : undefined
        );
      }
    }
    return { activities, status };
  }

  requestOptions({ trackingNumber, reference, test }) {
    const hostname = test ? "wwwcie.ups.com" : "onlinetools.ups.com";
    return {
      method: "POST",
      uri: `https://${hostname}/ups.app/xml/Track`,
      body: this.generateRequest(trackingNumber, reference),
    };
  }
}

export { UpsClient };
