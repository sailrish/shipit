assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
guessCarrier = require '../lib/guessCarrier'

describe 'carrier guesser', ->

  describe 'for amazon shipments', ->

    it 'detects an amazon order id + shipment id combo', ->
      expect(guessCarrier '110-4970488-4173016:2879726997123').to.include 'amazon'


  describe 'for UPS', ->

    it 'detects a good UPS tracking number', ->
      expect(guessCarrier '1Z6V86420323794365').to.include 'ups'

    it 'detects a good UPS tracking number in lower case', ->
      expect(guessCarrier '1z6v86420323794365').to.include 'ups'

    it 'detects a mismatch in UPS checkdigit', ->
      expect(guessCarrier '1Z6V86420323794364').to.not.include 'ups'

    it 'detects an incorrect length', ->
      expect(guessCarrier '1Z6V864223794364').to.not.include 'ups'
      expect(guessCarrier '1Z6V86453420323794365').to.not.include 'ups'

    it 'strips spaces and then detects', ->
      expect(guessCarrier '1Z 6V86 4203 2379 4365').to.include 'ups'

    it 'detects UPS freight tracking number beginning with H', ->
      expect(guessCarrier 'H9205817377').to.include 'ups'


  describe 'for FedEx', ->

    it 'detects a 12 digit fedex tracking number', ->
      expect(guessCarrier '771613423732').to.include 'fedex'

    it 'detects a 12 digit fedex tracking number with spaces', ->
      expect(guessCarrier '7716 1342 3732').to.include 'fedex'

    it 'detects a fedex door tag number', ->
      expect(guessCarrier 'DT771613423732').to.include 'fedex'

    it 'detects a fedex 15 digit tracking number', ->
      expect(guessCarrier '376738675175401').to.include 'fedex'

    it 'detects a fedex 15 digit tracking number', ->
      expect(guessCarrier '997048950367429').to.include 'fedex'

    it 'detects a fedex 15 digit tracking number with spaces', ->
      expect(guessCarrier '9970 4895 0367 429').to.include 'fedex'

    it 'detects a fedex 20 digit tracking number', ->
      expect(guessCarrier '61299998620341515252').to.include 'fedex'

    it 'detects a fedex smartpost number', ->
      expect(guessCarrier '9274899992136003821767').to.include 'fedex'

    it 'detects a fedex smartpost number with spaces', ->
      expect(guessCarrier '92 7489 9992 1360 0382 1767').to.include 'fedex'

    it 'detects a 20-digit fedex smartpost number', ->
      expect(guessCarrier '41999998135520738841').to.include 'fedex'

    it 'detects a fedex 22 digit tracking number starting with 96', ->
      expect(guessCarrier '9611804010639001854878').to.include 'fedex'

    it 'detects a fedex 22 digit trk 96.. that has only 15 recognizable digits', ->
      expect(guessCarrier '9611804512604749366900').to.include 'fedex'

    it 'detects a fedex smartpost number beginning with 02', ->
      expect(guessCarrier '02931503799192766595').to.include 'fedex'

  describe 'for USPS', ->

    it 'detects a USPS 94+20 digit tracking number', ->
      expect(guessCarrier '9400109699938860246573').to.include 'usps'

    it 'detects a USPS 94+20 digit tracking number with spaces', ->
      expect(guessCarrier '94 0010 9699 9388 6024 6573').to.include 'usps'

    it 'detects a 420+zipcode+22 digit tracking number', ->
      expect(guessCarrier '420921559505500020714300000128').to.include 'usps'

    it 'detects a 420+zipcode+22 digit tracking number with spaces', ->
      expect(guessCarrier '420 92155 95 0550 0020 7143 0000 0128').to.include 'usps'

    it 'detects a 420+zipcode+ext4+22 digit tracking number', ->
      expect(guessCarrier '4209215512349505500020714300000128').to.include 'usps'

    it 'detects a 420+zipcode+ext4+22 digit tracking number with spaces', ->
      expect(guessCarrier '420 92155 1234 95 0550 0020 7143 0000 0128').to.include 'usps'

    it 'detects an express mail / international tracking number', ->
      expect(guessCarrier 'EC207920162US').to.include 'usps'

    it 'detects an express mail tracking number with spaces', ->
      expect(guessCarrier 'EC 207 920 162 US').to.include 'usps'

    it 'detects an express mail tracking number with lowercase letters', ->
      expect(guessCarrier 'ec 207 920 162 us').to.include 'usps'

    it 'detects a fedex smartpost number', ->
      expect(guessCarrier '9274899992136003821767').to.include 'usps'

    it 'detects a fedex smartpost number with spaces', ->
      expect(guessCarrier '92 7489 9992 1360 0382 1767').to.include 'usps'

    it 'detects a fedex smartpost number beginning with 02', ->
      expect(guessCarrier '02931503799192766595').to.include 'usps'

    it 'detects a 26 digit usps tracking number', ->
      expect(guessCarrier '92023901003036542400961407').to.include 'usps'

    it 'detects a ups mail innovation tracking number', ->
      expect(guessCarrier '92748999997295513123034457').to.include 'usps'
      expect(guessCarrier '92748999997295513123034457').to.include 'upsmi'

    it 'detects another mail innovation tracking number', ->
      expect(guessCarrier '92748901377803583000610270').to.include 'usps'
      expect(guessCarrier '92748901377803583000610270').to.include 'upsmi'

    it 'detects a 420+zipcode+26 digit tracking number', ->
      expect(guessCarrier '4205690192023901019233001401555746').to.include 'usps'

    it 'detects a 20 digit tracking number', ->
      expect(guessCarrier '70131710000012912087').to.include 'usps'

  describe 'for lasership', ->

    it 'detects a legitimate lasership tracking number', ->
      expect(guessCarrier 'LM25904730').to.include 'lasership'

    it 'detects a another lasership tracking number', ->
      expect(guessCarrier 'LE17119906').to.include 'lasership'

    it 'ignores a malformed lasership tracking number', ->
      expect(guessCarrier 'LE1711990').to.not.include 'lasership'

    it 'detects a lasership tracking number with lower case prefix', ->
      expect(guessCarrier 'le17119906').to.include 'lasership'

    it 'detects a lasership tracking number beginning with 1LS', ->
      expect(guessCarrier '1LS72264319420039910').to.include 'lasership'

    it 'detects a smaller lasership tracking number beginning with 1LS', ->
      expect(guessCarrier '1LS717790937967').to.include 'lasership'

    it 'detects a smaller lasership tracking number beginning with Q', ->
      expect(guessCarrier 'Q54631325C').to.include 'lasership'

    it 'detects a smaller lasership tracking number beginning with q', ->
      expect(guessCarrier 'q54631325c').to.include 'lasership'

  describe 'for ontrac', ->

    it 'detects a legitimate ontrac tracking number', ->
      expect(guessCarrier 'C10999814714549').to.include 'ontrac'

    it 'ignores a malformed ontract tracking number', ->
      expect(guessCarrier 'C1099981471459').to.not.include 'ontrac'

    it 'detects a ontrac tracking number with lower case prefix', ->
      expect(guessCarrier 'c10999814714549').to.include 'ontrac'

  describe 'for dhl global mail', ->

    it 'detects a 93612... number', ->
      expect(guessCarrier '9361269903500576940071').to.include 'dhlgm'

    it 'detects a 420... number', ->
      expect(guessCarrier '4209215512349505500020714300000128').to.include 'dhlgm'

    it 'detects a 94748... number', ->
      expect(guessCarrier '9474812901015476250258').to.include 'dhlgm'

  describe 'for A1 International', ->

    it 'detects a 13 digit number', ->
      expect(guessCarrier 'AZK1000301864').to.include 'a1intl'

    it 'detects another 13 digit number', ->
      expect(guessCarrier 'AZI1001449356').to.include 'a1intl'

    it 'detects a 9 digit number', ->
      expect(guessCarrier 'AZ2393686').to.include 'a1intl'
