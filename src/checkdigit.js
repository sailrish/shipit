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


module.exports = _checkDigit
