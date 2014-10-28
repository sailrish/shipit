{UpsClient} = require './ups'
{FedexClient} = require './fedex'
{UspsClient} = require './usps'
{LasershipClient} = require './lasership'
{DhlClient} = require './dhl'
{OnTracClient} = require './ontrac'
{UpsMiClient} = require './upsmi'
{AmazonClient} = require './amazon'
guessCarrier = require './guessCarrier'

module.exports = {
  UpsClient,
  FedexClient,
  UspsClient,
  LasershipClient,
  DhlClient,
  OnTracClient,
  UpsMiClient,
  AmazonClient,
  guessCarrier
}
