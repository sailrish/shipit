// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
function CheckDigit(trk: string, multipliers: number[], mod: number): boolean {
  let checkdigit: number;
  let midx = 0;
  let sum = 0;
  for (let index = 0, end = trk.length - 2, asc = end >= 0; asc ? index <= end : index >= end; asc ? index++ : index--) {
    sum += parseInt(trk[index], 10) * multipliers[midx];
    midx = midx === (multipliers.length - 1) ? 0 : midx + 1;
  }
  if (mod === 11) {
    checkdigit = sum % 11;
    if (checkdigit === 10) { checkdigit = 0; }
  }
  if (mod === 10) {
    checkdigit = 0;
    if ((sum % 10) > 0) { checkdigit = (10 - (sum % 10)); }
  }
  return checkdigit === parseInt(trk[trk.length - 1]);
}

export { CheckDigit };
