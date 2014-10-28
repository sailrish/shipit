{upperCase} = require 'change-case'

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


_confirmFedex12 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1,7], 11
  [false, false]


_confirmFedexDoorTag = (trk) ->
  return [true, true] if _checkDigit trk.match(/^DT(\d{12})$/)[1], [3,1,7], 11
  [false, false]


_confirmFedex15 = (trk) ->
  return [true, false] if _checkDigit trk, [1,3], 11
  [false, false]


_confirmFedex20 = (trk) ->
  return [true, false] if _checkDigit trk, [3,1,7], 11
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
  return [true, false] if _checkDigit trk.match(/^420\d{9}(\d{22})$/)[1], [3,1], 10
  [false, false]


CARRIERS = [
  {name: 'ups', regex: /^1Z[0-9A-Z]{16}$/i, confirm: _confirmUps}
  {name: 'amazon', regex: /^1\d{2}-\d{7}-\d{7}:\d{13}$/}
  {name: 'fedex', regex: /^\d{12}$/, confirm: _confirmFedex12}
  {name: 'fedex', regex: /^\d{15}$/, confirm: _confirmFedex15}
  {name: 'fedex', regex: /^\d{20}$/, confirm: _confirmFedex20}
  {name: 'fedex', regex: /^DT\d{12}$/, confirm: _confirmFedexDoorTag}
  {name: 'fedex', regex: /^927489\d{16}$/}
  {name: 'fedex', regex: /^926129\d{16}$/}
  {name: 'usps', regex: /^927489\d{16}$/}
  {name: 'usps', regex: /^926129\d{16}$/}
  {name: 'fedex', regex: /^7489\d{16}$/}
  {name: 'fedex', regex: /^6129\d{16}$/}
  {name: 'usps', regex: /^(91|92|93|94|95|96)\d{20}$/, confirm: _confirmUsps22}
  {name: 'usps', regex: /^\d{26}$/, confirm: _confirmUsps26}
  {name: 'usps', regex: /^420\d{27}$/, confirm: _confirmUsps420Zip}
  {name: 'usps', regex: /^420\d{31}$/, confirm: _confirmUsps420ZipPlus4}
  {name: 'usps', regex: /^[A-Z]{2}\d{9}[A-Z]{2}$/}
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

  carriers
