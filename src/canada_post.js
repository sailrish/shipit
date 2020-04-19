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
import { Parser } from 'xml2js'
import { find } from 'underscore'
import moment from 'moment-timezone'
import { titleCase } from 'change-case'
import Shipper from './shipper'

const {
  ShipperClient
} = Shipper

var CanadaPostClient = (function () {
  let STATUS_MAP
  CanadaPostClient = class CanadaPostClient extends ShipperClient {
    static initClass () {
      STATUS_MAP = {
        'in transit': ShipperClient.STATUS_TYPES.EN_ROUTE,
        processed: ShipperClient.STATUS_TYPES.EN_ROUTE,
        'information submitted': ShipperClient.STATUS_TYPES.SHIPPING,
        'Shipment picked up': ShipperClient.STATUS_TYPES.SHIPPING,
        'Shipment received': ShipperClient.STATUS_TYPES.EN_ROUTE,
        delivered: ShipperClient.STATUS_TYPES.DELIVERED,
        'out for delivery': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        'item released': ShipperClient.STATUS_TYPES.EN_ROUTE,
        arrived: ShipperClient.STATUS_TYPES.EN_ROUTE,
        departed: ShipperClient.STATUS_TYPES.EN_ROUTE,
        'is en route': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'item mailed': ShipperClient.STATUS_TYPES.SHIPPING,
        'available for pickup': ShipperClient.STATUS_TYPES.DELAYED,
        'Attempted delivery': ShipperClient.STATUS_TYPES.DELAYED
      }
    }

    constructor ({ username, password }, options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super() }
        const thisFn = (() => { return this }).toString()
        const thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1]
        eval(`${thisName} = this;`)
      }
      this.username = username
      this.password = password
      this.options = options
      super()
      this.parser = new Parser()
    }

    validateResponse (response, cb) {
      function handleResponse (xmlErr, trackResult) {
        if ((xmlErr != null) || (trackResult == null)) { return cb(xmlErr) }
        const details = trackResult['tracking-detail']
        if (details == null) { return cb('response not recognized') }
        return cb(null, details)
      }

      this.parser.reset()
      return this.parser.parseString(response, handleResponse)
    }

    findStatusFromMap (statusText) {
      let status = ShipperClient.STATUS_TYPES.UNKNOWN
      if (!(statusText != null ? statusText.length : undefined)) { return status }
      for (const text in STATUS_MAP) {
        const statusCode = STATUS_MAP[text]
        const regex = new RegExp(text, 'i')
        if (regex.test(statusText)) {
          status = statusCode
          break
        }
      }
      return status
    }

    getStatus (lastEvent) {
      return this.findStatusFromMap(lastEvent != null ? lastEvent.details : undefined)
    }

    getActivitiesAndStatus (shipment) {
      const activities = []
      const status = null
      const events = __guard__(shipment['significant-events'] != null ? shipment['significant-events'][0] : undefined, x => x.occurrence)
      for (const event of Array.from(events || [])) {
        const city = event['event-site'] != null ? event['event-site'][0] : undefined
        const stateCode = event['event-province'] != null ? event['event-province'][0] : undefined
        const location = this.presentLocation({ city, stateCode })
        let timestamp = `${(event['event-date'] != null ? event['event-date'][0] : undefined)}T${(event['event-time'] != null ? event['event-time'][0] : undefined)}Z`
        timestamp = moment(timestamp).toDate()
        const details = event['event-description'] != null ? event['event-description'][0] : undefined
        if ((details != null) && (timestamp != null)) {
          const activity = { timestamp, location, details }
          activities.push(activity)
        }
      }
      return { activities, status: this.getStatus(activities != null ? activities[0] : undefined) }
    }

    getEta (shipment) {
      const ts = (shipment['changed-expected-date'] != null ? shipment['changed-expected-date'][0] : undefined) ||
        (shipment['expected-delivery-date'] != null ? shipment['expected-delivery-date'][0] : undefined)
      if (!(ts != null ? ts.length : undefined)) { return }
      if (ts != null ? ts.length : undefined) { return moment(`${ts}T00:00:00Z`).toDate() }
    }

    getService (shipment) {
      return (shipment['service-name'] != null ? shipment['service-name'][0] : undefined)
    }

    getWeight (shipment) {}

    getDestination (shipment) {
      return (shipment['destination-postal-id'] != null ? shipment['destination-postal-id'][0] : undefined)
    }

    requestOptions ({ trackingNumber }) {
      return {
        method: 'GET',
        uri: `https://soa-gw.canadapost.ca/vis/track/pin/${trackingNumber}/detail.xml`,
        auth: { user: this.username, pass: this.password }
      }
    }
  }
  CanadaPostClient.initClass()
  return CanadaPostClient
})()

export default { CanadaPostClient }

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}
