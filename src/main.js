// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
import Ups from './ups'

import Fedex from './fedex'

import Usps from './usps'

import Lasership from './lasership'

import Dhl from './dhl'

import Ontrac from './ontrac'

import Upsmi from './upsmi'

import Amazon from './amazon'

import A1 from './a1'

import CanadaPost from './canada_post'

import Dhlgm from './dhlgm'

import Prestige from './prestige'

import guessCarrier from './guessCarrier'

const {
  UpsClient
} = Ups

const {
  FedexClient
} = Fedex

const {
  UspsClient
} = Usps

const {
  LasershipClient
} = Lasership

const {
  DhlClient
} = Dhl

const {
  OnTracClient
} = Ontrac

const {
  UpsMiClient
} = Upsmi

const {
  AmazonClient
} = Amazon

const {
  A1Client
} = A1

const {
  CanadaPostClient
} = CanadaPost

const {
  DhlGmClient
} = Dhlgm

const {
  PrestigeClient
} = Prestige

export default {
  UpsClient,
  FedexClient,
  UspsClient,
  LasershipClient,
  DhlClient,
  OnTracClient,
  UpsMiClient,
  AmazonClient,
  A1Client,
  CanadaPostClient,
  DhlGmClient,
  PrestigeClient,
  guessCarrier
}
