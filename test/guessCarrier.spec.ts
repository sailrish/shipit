/* eslint-disable
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
import guessCarrier from '../src/guessCarrier';

describe('carrier guesser', () => {
  describe('for amazon shipments', () => it(
    'detects an amazon order id + shipment id combo',
    () => expect(guessCarrier('110-4970488-4173016:2879726997123')).toEqual(expect.arrayContaining(['amazon']))
  ));

  describe('for UPS', () => {
    it(
      'detects a good UPS tracking number',
      () => expect(guessCarrier('1Z6V86420323794365')).toEqual(expect.arrayContaining(['ups']))
    );

    it(
      'detects a good UPS tracking number in lower case',
      () => expect(guessCarrier('1z6v86420323794365')).toEqual(expect.arrayContaining(['ups']))
    );

    it(
      'detects a mismatch in UPS checkdigit',
      () => expect(guessCarrier('1Z6V86420323794364')).toEqual(expect.not.arrayContaining(['ups']))
    );

    it('detects an incorrect length', () => {
      expect(guessCarrier('1Z6V864223794364')).toEqual(expect.not.arrayContaining(['ups']));
      expect(guessCarrier('1Z6V86453420323794365')).toEqual(expect.not.arrayContaining(['ups']));
    });

    it(
      'strips spaces and then detects',
      () => expect(guessCarrier('1Z 6V86 4203 2379 4365')).toEqual(expect.arrayContaining(['ups']))
    );

    it(
      'detects UPS freight tracking number beginning with H',
      () => expect(guessCarrier('H9205817377')).toEqual(expect.arrayContaining(['ups']))
    );
  });

  describe('for FedEx', () => {
    it(
      'detects a 12 digit fedex tracking number',
      () => expect(guessCarrier('771613423732')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a 12 digit fedex tracking number with spaces',
      () => expect(guessCarrier('7716 1342 3732')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex door tag number',
      () => expect(guessCarrier('DT771613423732')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex 15 digit tracking number',
      () => expect(guessCarrier('376738675175401')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex 15 digit tracking number',
      () => expect(guessCarrier('997048950367429')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex 15 digit tracking number with spaces',
      () => expect(guessCarrier('9970 4895 0367 429')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex 20 digit tracking number',
      () => expect(guessCarrier('61299998620341515252')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex smartpost number',
      () => expect(guessCarrier('9274899992136003821767')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex smartpost number with spaces',
      () => expect(guessCarrier('92 7489 9992 1360 0382 1767')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a 20-digit fedex smartpost number',
      () => expect(guessCarrier('41999998135520738841')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex 22 digit tracking number starting with 96',
      () => expect(guessCarrier('9611804010639001854878')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex 22 digit trk 96.. that has only 15 recognizable digits',
      () => expect(guessCarrier('9611804512604749366900')).toEqual(expect.arrayContaining(['fedex']))
    );

    it(
      'detects a fedex smartpost number beginning with 02',
      () => expect(guessCarrier('02931503799192766595')).toEqual(expect.arrayContaining(['fedex']))
    );
  });

  describe('for USPS', () => {
    it(
      'detects a USPS 94+20 digit tracking number',
      () => expect(guessCarrier('9400109699938860246573')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a USPS 94+20 digit tracking number with spaces',
      () => expect(guessCarrier('94 0010 9699 9388 6024 6573')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a 420+zipcode+22 digit tracking number',
      () => expect(guessCarrier('420921559505500020714300000128')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a 420+zipcode+22 digit tracking number with spaces',
      () => expect(guessCarrier('420 92155 95 0550 0020 7143 0000 0128')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a 420+zipcode+ext4+22 digit tracking number',
      () => expect(guessCarrier('4209215512349505500020714300000128')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a 420+zipcode+ext4+22 digit tracking number with spaces',
      () => expect(guessCarrier('420 92155 1234 95 0550 0020 7143 0000 0128')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects an express mail / international tracking number',
      () => expect(guessCarrier('EC207920162US')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects an express mail tracking number with spaces',
      () => expect(guessCarrier('EC 207 920 162 US')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects an express mail tracking number with lowercase letters',
      () => expect(guessCarrier('ec 207 920 162 us')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a fedex smartpost number',
      () => expect(guessCarrier('9274899992136003821767')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a fedex smartpost number with spaces',
      () => expect(guessCarrier('92 7489 9992 1360 0382 1767')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a fedex smartpost number beginning with 02',
      () => expect(guessCarrier('02931503799192766595')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a 26 digit usps tracking number',
      () => expect(guessCarrier('92023901003036542400961407')).toEqual(expect.arrayContaining(['usps']))
    );

    it('detects a ups mail innovation tracking number', () => {
      expect(guessCarrier('92748999997295513123034457')).toEqual(expect.arrayContaining(['usps']));
      expect(guessCarrier('92748999997295513123034457')).toEqual(expect.arrayContaining(['upsmi']));
    });

    it('detects another mail innovation tracking number', () => {
      expect(guessCarrier('92748901377803583000610270')).toEqual(expect.arrayContaining(['usps']));
      expect(guessCarrier('92748901377803583000610270')).toEqual(expect.arrayContaining(['upsmi']));
    });

    it(
      'detects a 420+zipcode+26 digit tracking number',
      () => expect(guessCarrier('4205690192023901019233001401555746')).toEqual(expect.arrayContaining(['usps']))
    );

    it(
      'detects a 20 digit tracking number',
      () => expect(guessCarrier('70131710000012912087')).toEqual(expect.arrayContaining(['usps']))
    );
  });

  describe('for lasership', () => {
    it(
      'detects a legitimate lasership tracking number',
      () => expect(guessCarrier('LM25904730')).toEqual(expect.arrayContaining(['lasership']))
    );

    it(
      'detects a another lasership tracking number',
      () => expect(guessCarrier('LE17119906')).toEqual(expect.arrayContaining(['lasership']))
    );

    it(
      'ignores a malformed lasership tracking number',
      () => expect(guessCarrier('LE1711990')).toEqual(expect.not.arrayContaining(['lasership']))
    );

    it(
      'detects a lasership tracking number with lower case prefix',
      () => expect(guessCarrier('le17119906')).toEqual(expect.arrayContaining(['lasership']))
    );

    it(
      'detects a lasership tracking number beginning with 1LS',
      () => expect(guessCarrier('1LS72264319420039910')).toEqual(expect.arrayContaining(['lasership']))
    );

    it(
      'detects a smaller lasership tracking number beginning with 1LS',
      () => expect(guessCarrier('1LS717790937967')).toEqual(expect.arrayContaining(['lasership']))
    );

    it(
      'detects a smaller lasership tracking number beginning with Q',
      () => expect(guessCarrier('Q54631325C')).toEqual(expect.arrayContaining(['lasership']))
    );

    it(
      'detects a smaller lasership tracking number beginning with q',
      () => expect(guessCarrier('q54631325c')).toEqual(expect.arrayContaining(['lasership']))
    );
  });

  describe('for ontrac', () => {
    it(
      'detects a legitimate ontrac tracking number',
      () => expect(guessCarrier('C10999814714549')).toEqual(expect.arrayContaining(['ontrac']))
    );

    it(
      'ignores a malformed ontract tracking number',
      () => expect(guessCarrier('C1099981471459')).toEqual(expect.not.arrayContaining(['ontrac']))
    );

    it(
      'detects a ontrac tracking number with lower case prefix',
      () => expect(guessCarrier('c10999814714549')).toEqual(expect.arrayContaining(['ontrac']))
    );
  });

  describe('for dhl global mail', () => {
    it(
      'detects a 93612... number',
      () => expect(guessCarrier('9361269903500576940071')).toEqual(expect.arrayContaining(['dhlgm']))
    );

    it(
      'detects a 420... number',
      () => expect(guessCarrier('4209215512349505500020714300000128')).toEqual(expect.arrayContaining(['dhlgm']))
    );

    it(
      'detects a 94748... number',
      () => expect(guessCarrier('9474812901015476250258')).toEqual(expect.arrayContaining(['dhlgm']))
    );
  });

  describe('for A1 International', () => {
    it(
      'detects a 13 digit number',
      () => expect(guessCarrier('AZK1000301864')).toEqual(expect.arrayContaining(['a1intl']))
    );

    it(
      'detects another 13 digit number',
      () => expect(guessCarrier('AZI1001449356')).toEqual(expect.arrayContaining(['a1intl']))
    );

    it(
      'detects a 9 digit number',
      () => expect(guessCarrier('AZ2393686')).toEqual(expect.arrayContaining(['a1intl']))
    );
  });
});
