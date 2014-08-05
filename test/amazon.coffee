fs = require 'fs'
async = require 'async'
assert = require 'assert'
moment = require 'moment'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{AmazonClient} = require '../lib/amazon'
{ShipperClient} = require '../lib/shipper'

describe "amazon client", ->
  _amazonClient = null

  before ->
    _amazonClient = new AmazonClient()

  describe "integration tests", ->
    _package = null

    describe "delivered package", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_delivered.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of delivered", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.DELIVERED

      it "has one activity with delivery details", ->
        expect(_package.activities.length).to.equal 1
        expect(_package.activities[0].details).to.equal 'Delivered'
        expect(_package.activities[0].timestamp).to.deep.equal new Date 'August 1, 2014'

    describe "in transit package", ->

      before (done) ->
        fs.readFile 'test/stub_data/amazon_intransit.html', 'utf8', (err, docs) ->
          _amazonClient.presentResponse docs, 'request', (err, resp) ->
            should.not.exist(err)
            _package = resp
            done()

      it "has a status of en route", ->
        expect(_package.status).to.equal ShipperClient.STATUS_TYPES.EN_ROUTE

      it "has an eta of August 6th 8pm", ->
        expect(_package.eta).to.deep.equal new Date 'Aug 6 2014 20:00:00'

