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
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { load } from 'cheerio'
import moment from 'moment-timezone'
import { titleCase, upperCaseFirst, lowerCase } from 'change-case'
import Shipper from './shipper'

const {
  ShipperClient
} = Shipper

var OnTracClient = (function () {
  let LOCATION_STATES
  let STATUS_MAP
  OnTracClient = class OnTracClient extends ShipperClient {
    static initClass () {
      LOCATION_STATES = {
        Ontario: 'CA',
        Bakersfield: 'CA',
        Denver: 'CO',
        Vancouver: 'WA',
        Orange: 'CA',
        Hayward: 'CA',
        Phoenix: 'AZ',
        Sacramento: 'CA',
        Vegas: 'NV',
        'Los Angeles': 'CA',
        'Santa Maria': 'CA',
        Eugene: 'OR',
        Commerce: 'CA',
        'Kettleman City': 'CA',
        'Menlo Park': 'CA',
        'San Jose': 'CA',
        Burbank: 'CA',
        Ventura: 'CA',
        Petaluma: 'CA',
        Corporate: 'CA',
        Medford: 'OR',
        Monterey: 'CA',
        'San Francisco': 'CA',
        Stockton: 'CA',
        'San Diego': 'CA',
        Fresno: 'CA',
        'Salt Lake': 'UT',
        SaltLake: 'UT',
        Concord: 'CA',
        Tucson: 'AZ',
        Reno: 'NV',
        Seattle: 'WA'
      }

      STATUS_MAP = {
        DELIVERED: ShipperClient.STATUS_TYPES.DELIVERED,
        'OUT FOR DELIVERY': ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY,
        'PACKAGE RECEIVED AT FACILITY': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'IN TRANSIT': ShipperClient.STATUS_TYPES.EN_ROUTE,
        'DATA ENTRY': ShipperClient.STATUS_TYPES.SHIPPING
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
      const data = load(response, { normalizeWhitespace: true })
      return cb(null, data)
    }

    extractSummaryField (shipment, name) {
      let value = null
      const $ = shipment
      if ($ == null) { return }
      $('td[bgcolor="#ffd204"]').each(function (index, element) {
        const regex = new RegExp(name)
        if (!regex.test($(element).text())) { return }
        value = __guard__(__guard__($(element).next(), x1 => x1.text()), x => x.trim())
        return false
      })

      return value
    }

    getEta (shipment) {
      let eta = this.extractSummaryField(shipment, 'Service Commitment')
      if (eta == null) { return }
      const regexMatch = eta.match('(.*) by (.*)')
      if ((regexMatch != null ? regexMatch.length : undefined) > 1) {
        eta = `${regexMatch[1]} 23:59:59 +00:00`
      }
      return moment(eta).toDate()
    }

    getService (shipment) {
      const service = this.extractSummaryField(shipment, 'Service Code')
      if (service == null) { return }
      return titleCase(service)
    }

    getWeight (shipment) {
      return this.extractSummaryField(shipment, 'Weight')
    }

    presentAddress (location) {
      const addressState = LOCATION_STATES[location]
      if (addressState != null) { return `${location}, ${addressState}` } else { return location }
    }

    presentStatus (status) {
      status = __guard__(status != null ? status.replace('DETAILS', '') : undefined, x => x.trim())
      if (!(status != null ? status.length : undefined)) { return ShipperClient.STATUS_TYPES.UNKNOWN }
      const statusType = STATUS_MAP[status]
      if (statusType != null) { return statusType } else { return ShipperClient.STATUS_TYPES.UNKNOWN }
    }

    presentTimestamp (ts) {
      if (ts == null) { return }
      ts = ts.replace(/AM$/, ' AM').replace(/PM$/, ' PM')
      return moment(`${ts} +0000`).toDate()
    }

    getActivitiesAndStatus (shipment) {
      const activities = []
      const status = this.presentStatus(this.extractSummaryField(shipment, 'Delivery Status'))
      const $ = shipment
      if ($ == null) { return { activities, status } }
      $('#trkdetail table table').children('tr').each((rowIndex, row) => {
        if (!(rowIndex > 0)) { return }
        const fields = []
        $(row).find('td').each((colIndex, col) => fields.push($(col).text().trim()))
        if (fields.length) {
          let details, location
          if (fields[0].length) { details = upperCaseFirst(lowerCase(fields[0])) }
          const timestamp = this.presentTimestamp(fields[1])
          if (fields[2].length) { location = this.presentAddress(fields[2]) }
          if ((details != null) && (timestamp != null)) { return activities.unshift({ details, timestamp, location }) }
        }
      })
      return { activities, status }
    }

    getDestination (shipment) {
      const destination = this.extractSummaryField(shipment, 'Deliver To')
      return this.presentLocationString(destination)
    }

    requestOptions ({ trackingNumber }) {
      return {
        method: 'GET',
        uri: `https://www.ontrac.com/trackingdetail.asp?tracking=${trackingNumber}&run=0`
      }
    }
  }
  OnTracClient.initClass()
  return OnTracClient
})()

export default { OnTracClient }

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}
