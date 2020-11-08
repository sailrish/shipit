/* eslint-disable
	@typescript-eslint/restrict-template-expressions,
	@typescript-eslint/no-unsafe-member-access,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-return,
	@typescript-eslint/no-unsafe-call,
	node/no-callback-literal
*/
import moment from "moment-timezone";
import { find } from "underscore";
import { Builder, Parser } from "xml2js";
import { IShipperClientOptions, ShipperClient, STATUS_TYPES } from "./shipper";

interface IFedexClientOptions extends IShipperClientOptions {
  account: string;
  password: string;
  key: string;
  meter: string;
}

export class FedexClient extends ShipperClient {
  private STATUS_MAP = new Map<string, STATUS_TYPES>([
    ["AA", STATUS_TYPES.EN_ROUTE],
    ["AD", STATUS_TYPES.EN_ROUTE],
    ["AF", STATUS_TYPES.EN_ROUTE],
    ["AP", STATUS_TYPES.SHIPPING],
    ["EO", STATUS_TYPES.EN_ROUTE],
    ["EP", STATUS_TYPES.SHIPPING],
    ["FD", STATUS_TYPES.EN_ROUTE],
    ["HL", STATUS_TYPES.DELIVERED],
    ["IT", STATUS_TYPES.EN_ROUTE],
    ["LO", STATUS_TYPES.EN_ROUTE],
    ["OC", STATUS_TYPES.SHIPPING],
    ["DL", STATUS_TYPES.DELIVERED],
    ["DP", STATUS_TYPES.EN_ROUTE],
    ["DS", STATUS_TYPES.EN_ROUTE],
    ["ED", STATUS_TYPES.OUT_FOR_DELIVERY],
    ["OD", STATUS_TYPES.OUT_FOR_DELIVERY],
    ["PF", STATUS_TYPES.EN_ROUTE],
    ["PL", STATUS_TYPES.EN_ROUTE],
    ["PU", STATUS_TYPES.EN_ROUTE],
    ["SF", STATUS_TYPES.EN_ROUTE],
    ["AR", STATUS_TYPES.EN_ROUTE],
    ["CD", STATUS_TYPES.EN_ROUTE],
    ["CC", STATUS_TYPES.EN_ROUTE],
    ["DE", STATUS_TYPES.DELAYED],
    ["CA", STATUS_TYPES.DELAYED],
    ["CH", STATUS_TYPES.DELAYED],
    ["DY", STATUS_TYPES.DELAYED],
    ["SE", STATUS_TYPES.DELAYED],
    ["AX", STATUS_TYPES.EN_ROUTE],
    ["OF", STATUS_TYPES.EN_ROUTE],
    ["RR", STATUS_TYPES.EN_ROUTE],
    ["OX", STATUS_TYPES.EN_ROUTE],
    ["CP", STATUS_TYPES.EN_ROUTE],
  ]);

  get key(): string {
    return this.options.key;
  }

  get password(): string {
    return this.options.password;
  }

  get account(): string {
    return this.options.account;
  }

  get meter(): string {
    return this.options.meter;
  }

  options: IFedexClientOptions;
  parser: Parser;
  builder: Builder;

  constructor(options: IFedexClientOptions) {
    super();
    this.options = options;
    this.parser = new Parser();
    this.builder = new Builder({ renderOpts: { pretty: false } });
  }

  generateRequest(trk, reference) {
    if (reference == null) {
      reference = "n/a";
    }
    return this.builder.buildObject({
      "ns:TrackRequest": {
        $: {
          "xmlns:ns": "http://fedex.com/ws/track/v5",
          "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
          "xsi:schemaLocation":
            "http://fedex.com/ws/track/v4 TrackService_v4.xsd",
        },
        "ns:WebAuthenticationDetail": {
          "ns:UserCredential": {
            "ns:Key": this.key,
            "ns:Password": this.password,
          },
        },
        "ns:ClientDetail": {
          "ns:AccountNumber": this.account,
          "ns:MeterNumber": this.meter,
        },
        "ns:TransactionDetail": {
          "ns:CustomerTransactionId": reference,
        },
        "ns:Version": {
          "ns:ServiceId": "trck",
          "ns:Major": 5,
          "ns:Intermediate": 0,
          "ns:Minor": 0,
        },
        "ns:PackageIdentifier": {
          "ns:Value": trk,
          "ns:Type": "TRACKING_NUMBER_OR_DOORTAG",
        },
        "ns:IncludeDetailedScans": true,
      },
    });
  }

  validateResponse(response, cb) {
    function handleResponse(xmlErr, trackResult) {
      if (xmlErr != null || trackResult == null) {
        return cb(xmlErr);
      }
      const notifications =
        trackResult.TrackReply != null
          ? trackResult.TrackReply.Notifications
          : undefined;
      const success = find<any>(
        notifications,
        (notice) => notice?.Code?.[0] === "0"
      );
      if (!success) {
        return cb(notifications || "invalid reply");
      }
      return cb(null, trackResult?.TrackReply?.TrackDetails?.[0]);
    }

    this.parser.reset();
    return this.parser.parseString(response, handleResponse);
  }

  presentAddress(address) {
    if (address == null) {
      return;
    }
    let city = address.City != null ? address.City[0] : undefined;
    if (city != null) {
      city = city.replace("FEDEX SMARTPOST ", "");
    }
    const stateCode =
      address.StateOrProvinceCode != null
        ? address.StateOrProvinceCode[0]
        : undefined;
    const countryCode =
      address.CountryCode != null ? address.CountryCode[0] : undefined;
    const postalCode =
      address.PostalCode != null ? address.PostalCode[0] : undefined;
    return this.presentLocation({
      city,
      stateCode,
      countryCode,
      postalCode,
    });
  }

  getStatus(shipment) {
    const statusCode = shipment?.StatusCode?.[0];
    if (statusCode == null) {
      return;
    }
    return this.STATUS_MAP.has(statusCode)
      ? this.STATUS_MAP.get(statusCode)
      : STATUS_TYPES.UNKNOWN;
  }

  getActivitiesAndStatus(shipment) {
    const activities = [];
    for (const rawActivity of shipment?.Events || []) {
      let datetime, timestamp;
      const location = this.presentAddress(
        rawActivity.Address != null ? rawActivity.Address[0] : undefined
      );
      const rawTimestamp =
        rawActivity.Timestamp != null ? rawActivity.Timestamp[0] : undefined;
      if (rawTimestamp != null) {
        const eventTime = moment(rawTimestamp);
        timestamp = eventTime.toDate();
        datetime = rawTimestamp.slice(0, 19);
      }
      const details =
        rawActivity.EventDescription != null
          ? rawActivity.EventDescription[0]
          : undefined;
      if (details != null && timestamp != null) {
        const activity = { timestamp, datetime, location, details };
        activities.push(activity);
      }
    }
    return { activities, status: this.getStatus(shipment) };
  }

  getEta(shipment) {
    const ts = shipment?.EstimatedDeliveryTimestamp?.[0];
    if (ts == null) {
      return;
    }
    return moment(`${ts.slice(0, 19)}Z`).toDate();
  }

  getService(shipment) {
    return shipment?.ServiceInfo ? shipment?.ServiceInfo[0] : undefined;
  }

  getWeight(shipment) {
    const weightData = shipment?.PackageWeight?.[0];
    if (weightData == null) {
      return;
    }
    const units = weightData?.Units?.[0];
    const value = weightData?.Value?.[0];
    if (units != null && value != null) {
      return `${value} ${units}`;
    }
  }

  getDestination(shipment) {
    return this.presentAddress(
      shipment.DestinationAddress != null
        ? shipment.DestinationAddress[0]
        : undefined
    );
  }

  requestOptions({ trackingNumber, reference }) {
    return {
      method: "POST",
      uri: "https://ws.fedex.com/xml",
      body: this.generateRequest(trackingNumber, reference),
    };
  }
}
