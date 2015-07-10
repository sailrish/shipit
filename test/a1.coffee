fs = require 'fs'
assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
{A1Client} = require '../lib/a1'
{ShipperClient} = require '../lib/shipper'
{Parser} = require 'xml2js'

describe "a1 client", ->
  _a1Client = null
  _xmlParser = new Parser()

  before ->
    _a1Client = new A1Client()

  describe "integration tests", ->
    _package = null

    describe "in transit package", ->

    before (done) ->
      fs.readFile 'test/stub_data/a1_shipping.xml', 'utf8', (err, xmlDoc) ->
        _a1Client.presentResponse xmlDoc, 'trk', (err, resp) ->
          should.not.exist(err)
          _package = resp
          console.log "[A1 INTL RESP] #{JSON.stringify resp}"
          done()

    describe "delivered package", ->
      it "works", ->

