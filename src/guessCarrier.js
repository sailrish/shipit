{upperCase} = require 'change-case'
{uniq} = require 'underscore'

_preprocess = (trk) ->
  upperCase trk.replace /\s+/g, ''

_confirmUps = (trk) ->
  sum = 0
  for index in [2..16]
    asciiValue = trk[index].charCodeAt 0
    if asciiValue>=48 && asciiValue<=57
      num = parseInt trk[index], 10
    else
      num = (asciiValue - 63) % 10

    num = num * 2 unless index % 2 == 0
    sum += num

  checkdigit = if sum % 10 > 0 then 10 - sum % 10 else 0
  return [true, true] if checkdigit == parseInt trk[17], 10
  [false, false]


_checkDigit = (trk, multipliers, mod) ->
  midx = 0
  sum = 0
  for index in [0..trk.length-2]
    sum += parseInt(trk[index], 10) * multipliers[midx]
    midx = if midx is multipliers.length-1 then 0 else midx + 1
  if mod==11
    checkdigit = sum % 11
    checkdigit = 0 if checkdigit is 10
  if mod==10
    checkdigit = 0
    checkdigit = (10 - sum % 10) if (sum % 10) > 0
  checkdigit is parseInt trk[trk.length-1]


_confirmUpsFreight = (trk) ->
  firstChar = "#{(trk.charCodeAt(0) - 63) % 10}"
  remaining = trk[1..]
  trk = "#{firstChar}#{remaining}"
  return [true, true] if _checkDigit trk, [3,1,7], 10
  [false, false]


_confirmFedex12 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1,7], 11
  [false, false]


_confirmFedexDoorTag = (trk) ->
  return [true, true] if _checkDigit trk.match(/^DT(\d{12})$/)[1], [3,1,7], 11
  [false, false]


_confirmFedexSmartPost = (trk) ->
  if _checkDigit "91#{trk}", [3,1], 10
    return [true, false]
  [false, false]


_confirmFedex15 = (trk) ->
  return [true, false] if _checkDigit trk, [1,3], 10
  [false, false]


_confirmFedex20 = (trk) ->
  if _checkDigit trk, [3,1,7], 11
    return [true, false]
  else
    alteredTrk = "92#{trk}"
    if _checkDigit alteredTrk, [3,1], 10
      return [true, false]
  [false, false]


_confirmUsps20 = (trk) ->
  if _checkDigit trk, [3,1], 10
    return [true, false]
  [false, false]


_confirmFedex9622 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1,7], 11
  return [true, false] if _checkDigit trk[7..], [1,3], 10
  [false, false]


_confirmUsps22 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1], 10
  [false, false]


_confirmUsps26 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1], 10
  [false, false]


_confirmUsps420Zip = (trk) ->
  return [true, false] if _checkDigit trk.match(/^420\d{5}(\d{22})$/)[1], [3,1], 10
  [false, false]


_confirmUsps420ZipPlus4 = (trk) ->
  if _checkDigit trk.match(/^420\d{9}(\d{22})$/)[1], [3,1], 10
    return [true, false]
  else
    if _checkDigit trk.match(/^420\d{5}(\d{26})$/)[1], [3,1], 10
      return [true, false]
  [false, false]


_confirmCanadaPost16 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1], 10
  [false, false]

_confirmA1International = (trk) ->
  return [true, false] if (trk.length is 9) or (trk.length is 13)
  [false, false]


CARRIERS = [
  {name: 'ups', regex: /^1Z[0-9A-Z]{16}$/, confirm: _confirmUps}
  {name: 'ups', regex: /^(H|T|J|K|F|W|M|Q|A)\d{10}$/, confirm: _confirmUpsFreight}
  {name: 'amazon', regex: /^1\d{2}-\d{7}-\d{7}:\d{13}$/}
  {name: 'fedex', regex: /^\d{12}$/, confirm: _confirmFedex12}
  {name: 'fedex', regex: /^\d{15}$/, confirm: _confirmFedex15}
  {name: 'fedex', regex: /^\d{20}$/, confirm: _confirmFedex20}
  {name: 'usps', regex: /^\d{20}$/, confirm: _confirmUsps20}
  {name: 'usps', regex: /^02\d{18}$/, confirm: _confirmFedexSmartPost}
  {name: 'fedex', regex: /^02\d{18}$/, confirm: _confirmFedexSmartPost}
  {name: 'fedex', regex: /^DT\d{12}$/, confirm: _confirmFedexDoorTag}
  {name: 'fedex', regex: /^927489\d{16}$/}
  {name: 'fedex', regex: /^926129\d{16}$/}
  {name: 'upsmi', regex: /^927489\d{16}$/}
  {name: 'upsmi', regex: /^926129\d{16}$/}
  {name: 'upsmi', regex: /^927489\d{20}$/}
  {name: 'fedex', regex: /^96\d{20}$/, confirm: _confirmFedex9622}
  {name: 'usps', regex: /^927489\d{16}$/}
  {name: 'usps', regex: /^926129\d{16}$/}
  {name: 'fedex', regex: /^7489\d{16}$/}
  {name: 'fedex', regex: /^6129\d{16}$/}
  {name: 'usps', regex: /^(91|92|93|94|95|96)\d{20}$/, confirm: _confirmUsps22}
  {name: 'usps', regex: /^\d{26}$/, confirm: _confirmUsps26}
  {name: 'usps', regex: /^420\d{27}$/, confirm: _confirmUsps420Zip}
  {name: 'usps', regex: /^420\d{31}$/, confirm: _confirmUsps420ZipPlus4}
  {name: 'dhlgm', regex: /^420\d{27}$/, confirm: _confirmUsps420Zip}
  {name: 'dhlgm', regex: /^420\d{31}$/, confirm: _confirmUsps420ZipPlus4}
  {name: 'dhlgm', regex: /^94748\d{17}$/, confirm: _confirmUsps22}
  {name: 'dhlgm', regex: /^93612\d{17}$/, confirm: _confirmUsps22}
  {name: 'dhlgm', regex: /^GM\d{16}/}
  {name: 'usps', regex: /^[A-Z]{2}\d{9}[A-Z]{2}$/}
  {name: 'canadapost', regex: /^\d{16}$/, confirm: _confirmCanadaPost16}
  {name: 'lasership', regex: /^L[A-Z]\d{8}$/}
  {name: 'lasership', regex: /^1LS\d{12}/}
  {name: 'lasership', regex: /^Q\d{8}[A-Z]/}
  {name: 'ontrac', regex: /^(C|D)\d{14}$/}
  {name: 'prestige', regex: /^P[A-Z]{1}\d{8}/}
  {name: 'a1intl', regex: /^AZ.\d+/, confirm: _confirmA1International}
]


module.exports = (trk) ->
  carriers = []
  trk = _preprocess trk

  CARRIERS.every (c) ->
    if trk.match(c.regex)
      if c.confirm?
        [good, stop] = c.confirm(trk)
        carriers.push c.name if good
        return !stop
      carriers.push c.name
      return true
    true

  uniq carriers
