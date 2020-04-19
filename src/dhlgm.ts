/* eslint-disable
    constructor-super,
    no-constant-condition,
    no-eval,
    no-return-assign,
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
import { load } from 'cheerio'
import moment from 'moment-timezone'
import { titleCase, upperCaseFirst, lowerCase } from 'change-case'
import Shipper from './shipper'

const {
  ShipperClient
} = Shipper

var DhlGmClient = (function () {
  let STATUS_MAP
  DhlGmClient = class DhlGmClient extends ShipperClient {
    static initClass () {
      STATUS_MAP = {}
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
      STATUS_MAP[ShipperClient.STATUS_TYPES.DELIVERED] = ['delivered']
      STATUS_MAP[ShipperClient.STATUS_TYPES.EN_ROUTE] = [
        'transferred',
        'cleared',
        'received',
        'processed',
        'sorted',
        'sorting complete',
        'arrival',
        'tendered']
      STATUS_MAP[ShipperClient.STATUS_TYPES.OUT_FOR_DELIVERY] = ['out for delivery']
      STATUS_MAP[ShipperClient.STATUS_TYPES.SHIPPING] = ['electronic notification received']
      super()
    }

    validateResponse (response, cb) {
      try {
        response = response.replace(/<br>/gi, ' ')
        return cb(null, load(response, { normalizeWhitespace: true }))
      } catch (error) {
        return cb(error)
      }
    }

    extractSummaryField (data, name) {
      if (data == null) { return }
      const $ = data
      let value
      const regex = new RegExp(name)
      $('.card-info > dl').children().each(function (findex, field) {
        if (regex.test($(field).text())) {
          value = __guard__(__guard__($(field).next(), x1 => x1.text()), x => x.trim())
        }
        if (value != null) { return false }
      })
      return value
    }

    extractHeaderField (data, name) {
      if (data == null) { return }
      const $ = data
      let value
      const regex = new RegExp(name)
      $('.card > .row').children().each(function (findex, field) {
        $(field).children().each((cindex, col) => $(col).find('dt').each(function (dindex, element) {
          if (regex.test($(element).text())) {
            return value = __guard__(__guard__($(element).next(), x1 => x1.text()), x => x.trim())
          }
        }))
        if (value != null) { return false }
      })
      return value
    }

    getEta (data) {
      if (data == null) { return }
      const $ = data
      const eta = $('.status-info > .row .est-delivery > p').text()
      if (!(eta != null ? eta.length : undefined)) { return }
      return moment(`${eta} 23:59:59 +00:00`).toDate()
    }

    getService (data) {
      return this.extractSummaryField(data, 'Service')
    }

    getWeight (data) {
      return this.extractSummaryField(data, 'Weight')
    }

    presentStatus (details) {
      let status = null
      for (const statusCode in STATUS_MAP) {
        const matchStrings = STATUS_MAP[statusCode]
        for (const text of Array.from(matchStrings)) {
          const regex = new RegExp(text, 'i')
          if (regex.test(lowerCase(details))) {
            status = statusCode
            break
          }
        }
        if (status != null) { break }
      }
      if (status != null) { return parseInt(status, 10) }
    }

    getActivitiesAndStatus (data) {
      let status = null
      const activities = []
      if (data == null) { return { activities, status } }
      const $ = data
      let currentDate = null
      for (const rowData of Array.from($('.timeline').children() || [])) {
        const row = $(rowData)
        if (row.hasClass('timeline-date')) { currentDate = row.text() }
        if (row.hasClass('timeline-event')) {
          var timestamp
          let currentTime = row.find('.timeline-time').text()
          if (currentTime != null ? currentTime.length : undefined) {
            if (currentTime != null ? currentTime.length : undefined) { currentTime = __guard__(currentTime.trim().split(' '), x => x[0]) }
            currentTime = currentTime.replace('AM', ' AM').replace('PM', ' PM')
            currentTime += ' +00:00'
            timestamp = moment(`${currentDate} ${currentTime}`).toDate()
          }
          let location = row.find('.timeline-location-responsive').text()
          location = location != null ? location.trim() : undefined
          if (location != null ? location.length : undefined) { location = upperCaseFirst(location) }
          const details = __guard__(row.find('.timeline-description').text(), x1 => x1.trim())
          if ((details != null) && (timestamp != null)) {
            if (status == null) { status = this.presentStatus(details) }
            activities.push({ details, location, timestamp })
          }
        }
      }
      return { activities, status }
    }

    getDestination (data) {
      return this.extractHeaderField(data, 'To:')
    }

    requestOptions ({ trackingNumber }) {
      return {
        method: 'GET',
        uri: `http://webtrack.dhlglobalmail.com/?trackingnumber=${trackingNumber}`
      }
    }
  }
  DhlGmClient.initClass()
  return DhlGmClient
})()

export default { DhlGmClient }

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}
