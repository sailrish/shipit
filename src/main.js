import { UpsClient } from './ups';
import { FedexClient } from './fedex';
import { UspsClient } from './usps';
import { LasershipClient } from './lasership';
import { DhlClient } from './dhl';
import { OnTracClient } from './ontrac';
import { UpsMiClient } from './upsmi';
import { AmazonClient } from './amazon';
import { A1Client } from './a1';
import { CanadaPostClient } from './canada_post';
import { DhlGmClient } from './dhlgm';
import { PrestigeClient } from './prestige';
import guessCarrier from './guessCarrier';

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
};
