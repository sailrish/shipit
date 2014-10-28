assert = require 'assert'
should = require('chai').should()
expect = require('chai').expect
bond = require 'bondjs'
guessCarrier = require '../lib/guessCarrier'

describe 'guesses shipment carrier', ->

  describe 'for UPS tracking numbers', ->

    it 'detects a good UPS tracking number', ->
      expect(guessCarrier '1Z6V86420323794365').to.include 'ups'

    it 'detects a mismatch in UPS checkdigit', ->
      expect(guessCarrier '1Z6V86420323794364').to.not.include 'ups'

    it 'detects an incorrect length', ->
      expect(guessCarrier '1Z6V864223794364').to.not.include 'ups'
      expect(guessCarrier '1Z6V86453420323794365').to.not.include 'ups'

    it 'strips spaces and then detects', ->
      expect(guessCarrier '1Z 6V86 4203 2379 4365').to.include 'ups'
