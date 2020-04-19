/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const _checkDigit = function(trk, multipliers, mod) {
  let checkdigit;
  let midx = 0;
  let sum = 0;
  for (let index = 0, end = trk.length-2, asc = 0 <= end; asc ? index <= end : index >= end; asc ? index++ : index--) {
    sum += parseInt(trk[index], 10) * multipliers[midx];
    midx = midx === (multipliers.length-1) ? 0 : midx + 1;
  }
  if (mod===11) {
    checkdigit = sum % 11;
    if (checkdigit === 10) { checkdigit = 0; }
  }
  if (mod===10) {
    checkdigit = 0;
    if ((sum % 10) > 0) { checkdigit = (10 - (sum % 10)); }
  }
  return checkdigit === parseInt(trk[trk.length-1]);
};


export default _checkDigit;
