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
  return [false, false]


CARRIERS = [
  {name: 'ups', regex: /^1Z[0-9A-Z]{16}$/i, confirm: _confirmUps}
  {name: 'amazon', regex: /^1\d{2}-\d{7}-\d{7}:\d{13}$/}
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
      return false
    true

  carriers
