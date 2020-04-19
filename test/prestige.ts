/* eslint-disable
    handle-callback-err,
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import fs from 'fs'
import assert from 'assert'
import { expect } from 'chai'
import moment from 'moment-timezone'
import { PrestigeClient } from '../lib/prestige'
import { ShipperClient } from '../lib/shipper'
const should = require('chai').should()

describe('prestige client', function () {
  let _presClient = null

  before(() => _presClient = new PrestigeClient())

  describe('requestOptions', function () {
    let _options = null

    before(() => _options = _presClient.requestOptions({ trackingNumber: 'PS80558274' }))

    it('creates a GET request', () => _options.method.should.equal('GET'))

    return it('uses the correct URL', () => _options.uri.should.equal('http://www.prestigedelivery.com/TrackingHandler.ashx?trackingNumbers=PS80558274'))
  })

  return describe('integration tests', function () {
    let _package = null
    let _activity = null

    return describe('out for delivery package', function () {
      before(done => fs.readFile('test/stub_data/prestige_delivered.json', 'utf8', (err, doc) => _presClient.presentResponse(doc, 'trk', function (err, resp) {
        should.not.exist(err)
        _package = resp
        return done()
      })))

      it('has a status of delivered', () => expect(_package.status).to.equal(ShipperClient.STATUS_TYPES.DELIVERED))

      it('has an eta of Oct 20', () => expect(_package.eta).to.deep.equal(new Date('2015-10-20T23:59:59.000Z')))

      it('has a destination of Bloomfield Hills', () => expect(_package.destination).to.equal('Bloomfield Hills, MI 48304-3264'))

      describe('has one activity', function () {
        before(function () {
          _activity = _package.activities[0]
          return should.exist(_activity)
        })

        it('with timestamp Oct 19th, 2:39pm', () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-19T14:39:00Z')))

        it('with location Taylor, MI', () => expect(_activity.location).to.equal('Taylor, MI 48180'))

        return it('with details Out-for-delivery', () => expect(_activity.details).to.equal('Delivered'))
      })

      describe('has next activity', function () {
        before(function () {
          _activity = _package.activities[1]
          return should.exist(_activity)
        })

        it('with timestamp Oct 19th, 12:53pm', () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-19T12:53:00Z')))

        it('with location Taylor, MI', () => expect(_activity.location).to.equal('Taylor, MI 48180'))

        return it('with details Out-for-delivery', () => expect(_activity.details).to.equal('Out for delivery'))
      })

      describe('has another activity', function () {
        before(function () {
          _activity = _package.activities[2]
          return should.exist(_activity)
        })

        it('with timestamp Oct 19th, 6:31am', () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-19T06:31:00Z')))

        it('with location Taylor, MI', () => expect(_activity.location).to.equal('Taylor, MI 48180'))

        return it('with details Out-for-delivery', () => expect(_activity.details).to.equal('Shipment received by carrier'))
      })

      return describe('has first activity', function () {
        before(function () {
          _activity = _package.activities[3]
          return should.exist(_activity)
        })

        it('with timestamp Oct 18th, 3:55pm', () => expect(_activity.timestamp).to.deep.equal(new Date('2015-10-18T15:55:00Z')))

        it('with location Taylor, MI', () => expect(_activity.location).to.equal('Jeffersonville, IN 47130'))

        return it('with details Out-for-delivery', () => expect(_activity.details).to.equal('Prestige has not yet received this shipment'))
      })
    })
  })
})
