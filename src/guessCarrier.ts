// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { upperCase } from 'change-case';
import { uniq } from 'underscore';
import { CheckDigit } from './checkdigit';

function _preprocess (trk) {
  return upperCase(trk.replace(/\s+/g, ''));
}

function _confirmUps (trk) {
  let sum = 0;
  for (let index = 2; index <= 16; index++) {
    let num;
    const asciiValue = trk[index].charCodeAt(0);
    if ((asciiValue >= 48) && (asciiValue <= 57)) {
      num = parseInt(trk[index], 10);
    } else {
      num = (asciiValue - 63) % 10;
    }

    if ((index % 2) !== 0) { num = num * 2; }
    sum += num;
  }

  const checkdigit = (sum % 10) > 0 ? 10 - (sum % 10) : 0;
  if (checkdigit === parseInt(trk[17], 10)) { return [true, true]; }
  return [false, false];
}

function _confirmUpsFreight (trk) {
  const firstChar = `${(trk.charCodeAt(0) - 63) % 10}`;
  const remaining = trk.slice(1);
  trk = `${firstChar}${remaining}`;
  if (CheckDigit(trk, [3, 1, 7], 10)) { return [true, true]; }
  return [false, false];
}

function _confirmFedex12 (trk) {
  if (CheckDigit(trk, [3, 1, 7], 11)) { return [true, false]; }
  return [false, false];
}

function _confirmFedexDoorTag (trk) {
  if (CheckDigit(trk.match(/^DT(\d{12})$/)[1], [3, 1, 7], 11)) { return [true, true]; }
  return [false, false];
}

function _confirmFedexSmartPost (trk) {
  if (CheckDigit(`91${trk}`, [3, 1], 10)) {
    return [true, false];
  }
  return [false, false];
}

function _confirmFedex15 (trk) {
  if (CheckDigit(trk, [1, 3], 10)) { return [true, false]; }
  return [false, false];
}

function _confirmFedex20 (trk) {
  if (CheckDigit(trk, [3, 1, 7], 11)) {
    return [true, false];
  } else {
    const alteredTrk = `92${trk}`;
    if (CheckDigit(alteredTrk, [3, 1], 10)) {
      return [true, false];
    }
  }
  return [false, false];
}

function _confirmUsps20 (trk) {
  if (CheckDigit(trk, [3, 1], 10)) {
    return [true, false];
  }
  return [false, false];
}

function _confirmFedex9622 (trk) {
  if (CheckDigit(trk, [3, 1, 7], 11)) { return [true, false]; }
  if (CheckDigit(trk.slice(7), [1, 3], 10)) { return [true, false]; }
  return [false, false];
}

function _confirmUsps22 (trk) {
  if (CheckDigit(trk, [3, 1], 10)) { return [true, false]; }
  return [false, false];
}

function _confirmUsps26 (trk) {
  if (CheckDigit(trk, [3, 1], 10)) { return [true, false]; }
  return [false, false];
}

function _confirmUsps420Zip (trk) {
  if (CheckDigit(trk.match(/^420\d{5}(\d{22})$/)[1], [3, 1], 10)) { return [true, false]; }
  return [false, false];
}

function _confirmUsps420ZipPlus4 (trk) {
  if (CheckDigit(trk.match(/^420\d{9}(\d{22})$/)[1], [3, 1], 10)) {
    return [true, false];
  } else {
    if (CheckDigit(trk.match(/^420\d{5}(\d{26})$/)[1], [3, 1], 10)) {
      return [true, false];
    }
  }
  return [false, false];
}

function _confirmCanadaPost16 (trk) {
  if (CheckDigit(trk, [3, 1], 10)) { return [true, false]; }
  return [false, false];
}

function _confirmA1International (trk) {
  if ((trk.length === 9) || (trk.length === 13)) { return [true, false]; }
  return [false, false];
}

const CARRIERS = [
  { name: 'ups', regex: /^1Z[0-9A-Z]{16}$/, confirm: _confirmUps },
  { name: 'ups', regex: /^(H|T|J|K|F|W|M|Q|A)\d{10}$/, confirm: _confirmUpsFreight },
  { name: 'amazon', regex: /^1\d{2}-\d{7}-\d{7}:\d{13}$/ },
  { name: 'fedex', regex: /^\d{12}$/, confirm: _confirmFedex12 },
  { name: 'fedex', regex: /^\d{15}$/, confirm: _confirmFedex15 },
  { name: 'fedex', regex: /^\d{20}$/, confirm: _confirmFedex20 },
  { name: 'usps', regex: /^\d{20}$/, confirm: _confirmUsps20 },
  { name: 'usps', regex: /^02\d{18}$/, confirm: _confirmFedexSmartPost },
  { name: 'fedex', regex: /^02\d{18}$/, confirm: _confirmFedexSmartPost },
  { name: 'fedex', regex: /^DT\d{12}$/, confirm: _confirmFedexDoorTag },
  { name: 'fedex', regex: /^927489\d{16}$/ },
  { name: 'fedex', regex: /^926129\d{16}$/ },
  { name: 'upsmi', regex: /^927489\d{16}$/ },
  { name: 'upsmi', regex: /^926129\d{16}$/ },
  { name: 'upsmi', regex: /^927489\d{20}$/ },
  { name: 'fedex', regex: /^96\d{20}$/, confirm: _confirmFedex9622 },
  { name: 'usps', regex: /^927489\d{16}$/ },
  { name: 'usps', regex: /^926129\d{16}$/ },
  { name: 'fedex', regex: /^7489\d{16}$/ },
  { name: 'fedex', regex: /^6129\d{16}$/ },
  { name: 'usps', regex: /^(91|92|93|94|95|96)\d{20}$/, confirm: _confirmUsps22 },
  { name: 'usps', regex: /^\d{26}$/, confirm: _confirmUsps26 },
  { name: 'usps', regex: /^420\d{27}$/, confirm: _confirmUsps420Zip },
  { name: 'usps', regex: /^420\d{31}$/, confirm: _confirmUsps420ZipPlus4 },
  { name: 'dhlgm', regex: /^420\d{27}$/, confirm: _confirmUsps420Zip },
  { name: 'dhlgm', regex: /^420\d{31}$/, confirm: _confirmUsps420ZipPlus4 },
  { name: 'dhlgm', regex: /^94748\d{17}$/, confirm: _confirmUsps22 },
  { name: 'dhlgm', regex: /^93612\d{17}$/, confirm: _confirmUsps22 },
  { name: 'dhlgm', regex: /^GM\d{16}/ },
  { name: 'usps', regex: /^[A-Z]{2}\d{9}[A-Z]{2}$/ },
  { name: 'canadapost', regex: /^\d{16}$/, confirm: _confirmCanadaPost16 },
  { name: 'lasership', regex: /^L[A-Z]\d{8}$/ },
  { name: 'lasership', regex: /^1LS\d{12}/ },
  { name: 'lasership', regex: /^Q\d{8}[A-Z]/ },
  { name: 'ontrac', regex: /^(C|D)\d{14}$/ },
  { name: 'prestige', regex: /^P[A-Z]{1}\d{8}/ },
  { name: 'a1intl', regex: /^AZ.\d+/, confirm: _confirmA1International }
];

export default function (trk) {
  const carriers = [];
  trk = _preprocess(trk);

  CARRIERS.every(function (c) {
    if (trk.match(c.regex)) {
      if (c.confirm != null) {
        const [good, stop] = Array.from(c.confirm(trk));
        if (good) { carriers.push(c.name); }
        return !stop;
      }
      carriers.push(c.name);
      return true;
    }
    return true;
  });

  return uniq(carriers);
}
