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
import { reduce } from 'underscore'
import moment from 'moment-timezone'
import Shipper from './shipper'

const {
  ShipperClient
} = Shipper

var PrestigeClient = (function () {
  let ADDR_ATTRS
  let STATUS_MAP
  PrestigeClient = class PrestigeClient extends ShipperClient {
    static initClass () {
      ADDR_ATTRS = ['City', 'State', 'Zip']

      STATUS_MAP = {
        301: ShipperClient.STATUS_TYPES.DELIVERED,
        302: ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        101: ShipperClient.STATUS_TYPES.SHIPPING
      }
    }

    constructor (options) {
      {
        // Hack: trick Babel/TypeScript into allowing this before super.
        if (false) { super() }
        const thisFn = (() => { return this }).toString()
        const thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1]
        eval(`${thisName} = this;`)
      }
      this.options = options
      super()
    }

    validateResponse (response, cb) {
      response = JSON.parse(response)
      if (!(response != null ? response.length : undefined)) { return cb({ error: 'no tracking info found' }) }
      response = response[0]
      if (response.TrackingEventHistory == null) { return cb({ error: 'missing events' }) }
      return cb(null, response)
    }

    presentAddress (prefix, event) {
      if (event == null) { return }
      const address = reduce(ADDR_ATTRS, function (d, v) {
        d[v] = event[`${prefix}${v}`]
        return d
      }, {})
      const city = address.City
      const stateCode = address.State
      const postalCode = address.Zip
      return this.presentLocation({ city, stateCode, postalCode })
    }

    presentStatus (eventType) {
      const codeStr = __guard__(eventType.match('EVENT_(.*)$'), x => x[1])
      if (!(codeStr != null ? codeStr.length : undefined)) { return }
      const eventCode = parseInt(codeStr)
      if (isNaN(eventCode)) { return }
      const status = STATUS_MAP[eventCode]
      if (status != null) { return status }
      if ((eventCode < 300) && (eventCode > 101)) { return ShipperClient.STATUS_TYPES.EN_ROUTE }
    }

    getActivitiesAndStatus (shipment) {
      const activities = []
      let status = null
      const rawActivities = shipment != null ? shipment.TrackingEventHistory : undefined
      for (const rawActivity of Array.from(rawActivities || [])) {
        const location = this.presentAddress('EL', rawActivity)
        const dateTime = `${(rawActivity != null ? rawActivity.serverDate : undefined)} ${(rawActivity != null ? rawActivity.serverTime : undefined)}`
        const timestamp = moment(`${dateTime} +00:00`).toDate()
        const details = rawActivity != null ? rawActivity.EventCodeDesc : undefined
        if ((details != null) && (timestamp != null)) {
          const activity = { timestamp, location, details }
          activities.push(activity)
        }
        if (!status) {
          status = this.presentStatus(rawActivity != null ? rawActivity.EventCode : undefined)
        }
      }
      return { activities, status }
    }

    getEta (shipment) {
      let eta = __guard__(__guard__(shipment != null ? shipment.TrackingEventHistory : undefined, x1 => x1[0]), x => x.EstimatedDeliveryDate)
      if (!(eta != null ? eta.length : undefined)) { return }
      eta = `${eta} 00:00 +00:00`
      return moment(eta, 'MM/DD/YYYY HH:mm ZZ').toDate()
    }

    getService () {}

    getWeight (shipment) {
      if (!__guard__(shipment != null ? shipment.Pieces : undefined, x => x.length)) { return }
      const piece = shipment.Pieces[0]
      let weight = `${piece.Weight}`
      const units = piece.WeightUnit
      if (units != null) { weight = `${weight} ${units}` }
      return weight
    }

    getDestination (shipment) {
      return this.presentAddress('PD', __guard__(shipment != null ? shipment.TrackingEventHistory : undefined, x => x[0]))
    }

    requestOptions ({ trackingNumber }) {
      return {
        method: 'GET',
        uri: `http://www.prestigedelivery.com/TrackingHandler.ashx?trackingNumbers=${trackingNumber}`
      }
    }
  }
  PrestigeClient.initClass()
  return PrestigeClient
})()

export default { PrestigeClient }

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}
