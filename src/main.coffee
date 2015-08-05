{UpsClient} = require './ups'
{FedexClient} = require './fedex'
{UspsClient} = require './usps'
{LasershipClient} = require './lasership'
{DhlClient} = require './dhl'
{OnTracClient} = require './ontrac'
{UpsMiClient} = require './upsmi'
{AmazonClient} = require './amazon'
{A1Client} = require './a1'
{DhlGmClient} = require './dhlgm'
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
  A1Client,
  DhlGmClient,
  guessCarrier
}
