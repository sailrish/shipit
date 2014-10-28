assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
guessCarrier = require '../lib/guessCarrier'

describe 'guesses shipment carrier', ->

  describe 'for UPS', ->

    it 'detects a good UPS tracking number', ->
      expect(guessCarrier '1Z6V86420323794365').to.include 'ups'

    it 'detects a mismatch in UPS checkdigit', ->
      expect(guessCarrier '1Z6V86420323794364').to.not.include 'ups'

    it 'detects an incorrect length', ->
      expect(guessCarrier '1Z6V864223794364').to.not.include 'ups'
      expect(guessCarrier '1Z6V86453420323794365').to.not.include 'ups'

    it 'strips spaces and then detects', ->
      expect(guessCarrier '1Z 6V86 4203 2379 4365').to.include 'ups'


  describe 'for FedEx', ->

    it 'detects a 12 digit fedex tracking number', ->
      expect(guessCarrier '771613423732').to.include 'fedex'

    it 'detects a 12 digit fedex tracking number with spaces', ->
      expect(guessCarrier '7716 1342 3732').to.include 'fedex'

    it 'detects a fedex door tag number', ->
      expect(guessCarrier 'DT771613423732').to.include 'fedex'

    it 'detects a fedex 15 digit tracking number', ->
      expect(guessCarrier '997048950367429').to.include 'fedex'

    it 'detects a fedex 15 digit tracking number with spaces', ->
      expect(guessCarrier '9970 4895 0367 429').to.include 'fedex'

    it 'detects a fedex smartpost number', ->
      expect(guessCarrier '9274899992136003821767').to.include 'fedex'

    it 'detects a fedex smartpost number with spaces', ->
      expect(guessCarrier '92 7489 9992 1360 0382 1767').to.include 'fedex'


  describe 'for USPS', ->

    it 'detects a USPS 94+20 digit tracking number', ->
      expect(guessCarrier '9400109699938860246573').to.include 'usps'

    it 'detects a USPS 94+20 digit tracking number with spaces', ->
      expect(guessCarrier '94 0010 9699 9388 6024 6573').to.include 'usps'

    it 'detects a 420+zipcode+22 digit tracking number', ->
      expect(guessCarrier '420921559505500020714300000128').to.include 'usps'

    it 'detects a 420+zipcode+22 digit tracking number with spaces', ->
      expect(guessCarrier '420 92155 95 0550 0020 7143 0000 0128').to.include 'usps'

    it 'detects an express mail / international tracking number', ->
      expect(guessCarrier 'EC207920162US').to.include 'usps'

    it 'detects an express mail tracking number with spaces', ->
      expect(guessCarrier 'EC 207 920 162 US').to.include 'usps'

    it 'detects a 26 digit usps tracking number', ->
      expect(guessCarrier '92023901003036542400961407').to.include 'usps'

    it 'detects a fedex smartpost number', ->
      expect(guessCarrier '9274899992136003821767').to.include 'usps'

    it 'detects a fedex smartpost number with spaces', ->
      expect(guessCarrier '92 7489 9992 1360 0382 1767').to.include 'usps'

    it 'detects a ups mail innovations number', ->
      expect(guessCarrier '92748999997295513123034457').to.include 'usps'

    it 'detects a ups mail innovations number with spaces', ->
      expect(guessCarrier '92 7489 9999 7295 5131 2303 4457').to.include 'usps'
