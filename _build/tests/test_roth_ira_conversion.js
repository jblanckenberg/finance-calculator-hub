/* FinCalcHub — Roth IRA Conversion Calculator tests
 * Convert-vs-Traditional break-even math, tax-paid-from-conversion edge,
 * rate differential cases, break-even rate, long-horizon scaling, validation.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcRothConversion } = require('../../js/calc/roth-ira-conversion.js');

let passed = 0;

// Case 1 — Baseline tax-rate-flat (22% now, 22% retire, 7% return, 30 yrs,
// tax paid from OUTSIDE funds). Roth wins because the same $50k that would
// have been taxed at withdrawal in the Traditional grew tax-free in the Roth.
// Math:
//   conversionAmount $50,000, growthFactor 1.07^30 ≈ 7.6123
//   rothValueAtRetirement   = 50,000 × 7.6123 ≈ 380,613
//   traditionalValueGross   = 50,000 × 7.6123 ≈ 380,613
//   traditionalValueAfterTax = 380,613 × 0.78 ≈ 296,878
//   netAdvantage ≈ +83,735 (Roth wins)
(function case1() {
  const R = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  assert.ok(!R.error, 'Case 1: no error');
  assert.equal(R.conversionTax, 11000, 'Case 1: conversion tax $11,000');
  assert.equal(R.amountInRoth, 50000, 'Case 1: full $50k enters Roth');
  assert.equal(R.yearsToRetirement, 30, 'Case 1: 30 years');
  assert.ok(R.rothValueAtRetirement > 380000 && R.rothValueAtRetirement < 381000,
    'Case 1: Roth ≈ $380,613, got ' + R.rothValueAtRetirement);
  assert.ok(R.traditionalValueAfterTax > 296000 && R.traditionalValueAfterTax < 298000,
    'Case 1: Trad after-tax ≈ $296,878, got ' + R.traditionalValueAfterTax);
  assert.ok(R.netAdvantage > 83000 && R.netAdvantage < 84000,
    'Case 1: net advantage ≈ +$83,735, got ' + R.netAdvantage);
  assert.equal(R.recommendation, 'Convert', 'Case 1: recommendation Convert');
  console.log('OK Case 1 — Baseline 22%/22% tax-from-outside → Roth wins');
  passed++;
})();

// Case 2 — Same setup but `taxPaidFromConversion=true`. The $11k tax comes
// out of the converted amount, so $39k enters the Roth.
//   amountInRoth = $39,000
//   rothValueAtRetirement = 39,000 × 7.6123 ≈ 296,878
//   traditionalValueAfterTax ≈ 296,878 (same as Case 1)
//   netAdvantage ≈ 0 → Roughly equal
(function case2() {
  const R = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: true,
  });
  assert.ok(!R.error, 'Case 2: no error');
  assert.equal(R.amountInRoth, 39000, 'Case 2: $39k enters Roth after tax-from-conversion');
  assert.ok(Math.abs(R.netAdvantage) < 1, 'Case 2: net advantage ≈ 0, got ' + R.netAdvantage);
  assert.equal(R.recommendation, 'Roughly equal',
    'Case 2: recommendation Roughly equal');
  console.log('OK Case 2 — Tax-from-conversion at flat rate → Roughly equal');
  passed++;
})();

// Case 3 — Lower retirement marginal rate (22% now, 12% retire). Traditional
// wins because future tax is cheaper than current tax.
//   amountInRoth = $50,000 (outside funds)
//   rothValue ≈ $380,613
//   traditionalValueAfterTax = $380,613 × 0.88 ≈ $334,939
//   netAdvantage = $380,613 - $334,939 ≈ +$45,674
// Wait — Roth still wins here because the tax was already prepaid for FREE
// (paid from outside funds). Let's recompute: if taxPaidFromConversion=true,
//   amountInRoth = $39,000 → Roth = 39,000 × 7.6123 ≈ $296,878
//   Trad after-tax = $334,939
//   netAdvantage ≈ -$38,061 (Traditional wins)
// Use that scenario instead.
(function case3() {
  const R = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 12,
    expectedReturnPct: 7,
    taxPaidFromConversion: true,
  });
  assert.ok(!R.error, 'Case 3: no error');
  assert.ok(R.netAdvantage < 0,
    'Case 3: lower retirement rate + tax-from-conversion → Traditional wins, got netAdvantage ' + R.netAdvantage);
  assert.equal(R.recommendation, "Don't convert",
    'Case 3: recommendation Don\'t convert');
  console.log("OK Case 3 — Lower retirement rate (22→12%) + tax-from-conversion → Don't convert");
  passed++;
})();

// Case 4 — Higher retirement marginal rate (22% now, 32% retire).
// Roth wins bigger than Case 1 because we dodge a higher future tax.
//   rothValue ≈ $380,613
//   traditionalValueAfterTax = $380,613 × 0.68 ≈ $258,817
//   netAdvantage ≈ +$121,796 (much bigger than Case 1's $83k)
(function case4() {
  const R = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 32,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  const case1Ref = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  assert.ok(!R.error, 'Case 4: no error');
  assert.ok(R.netAdvantage > case1Ref.netAdvantage,
    'Case 4: higher retire-rate → bigger Roth advantage than flat-rate baseline; ' +
    R.netAdvantage + ' vs ' + case1Ref.netAdvantage);
  assert.equal(R.recommendation, 'Convert', 'Case 4: recommendation Convert');
  console.log('OK Case 4 — Higher retirement rate (22→32%) → Roth wins bigger');
  passed++;
})();

// Case 5 — Break-even rate sanity. With taxPaidFromConversion=true and
// currentRate=22%, the break-even retirement rate is the rate at which
// amountInRoth/conversionAmount = 1 - breakRate, i.e. breakRate = currentRate.
// Algebraically: breakEvenRetirementRatePct ≈ 22% (same as current rate).
(function case5() {
  const R = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: true,
  });
  assert.ok(!R.error, 'Case 5: no error');
  // Break-even should land at 22% when currentRate=22% and tax-from-conversion.
  assert.ok(Math.abs(R.breakEvenRetirementRatePct - 22) < 0.5,
    'Case 5: break-even ≈ 22%, got ' + R.breakEvenRetirementRatePct);
  console.log('OK Case 5 — Break-even rate matches currentRate (tax-from-conversion)');
  passed++;
})();

// Case 6 — Long horizon amplifies the advantage. 40 yrs vs 10 yrs at higher
// retirement rate. Both should favour Roth; the 40-yr advantage should be
// substantially bigger in dollar terms.
(function case6() {
  const short = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 55,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 32,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  const long = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 25,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 32,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  assert.ok(!short.error && !long.error, 'Case 6: no error');
  assert.equal(short.yearsToRetirement, 10);
  assert.equal(long.yearsToRetirement, 40);
  assert.ok(long.netAdvantage > short.netAdvantage * 5,
    'Case 6: 40yr advantage should dominate 10yr by >5×, got long=' + long.netAdvantage +
    ' short=' + short.netAdvantage);
  console.log('OK Case 6 — Long horizon scales the Roth advantage');
  passed++;
})();

// Case 7 — Validation: retirementAge ≤ currentAge errors
(function case7() {
  const R = calcRothConversion({
    conversionAmount: 50000,
    currentAge: 65,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  assert.ok(R.error && /greater than current age/i.test(R.error),
    'Case 7: retirementAge ≤ currentAge errors, got ' + R.error);
  console.log('OK Case 7 — retirementAge ≤ currentAge validation');
  passed++;
})();

// Case 8 — Validation: zero / negative conversion amount errors
(function case8() {
  const zero = calcRothConversion({
    conversionAmount: 0,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  const negative = calcRothConversion({
    conversionAmount: -1000,
    currentAge: 35,
    retirementAge: 65,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  assert.ok(zero.error && /positive/i.test(zero.error),
    'Case 8a: zero conversionAmount errors');
  assert.ok(negative.error && /positive/i.test(negative.error),
    'Case 8b: negative conversionAmount errors');
  console.log('OK Case 8 — Conversion amount must be positive');
  passed++;
})();

// Case 9 — Backdoor Roth scenario: high currentRate (35%) on smaller
// conversion ($20k), tax paid from outside (the textbook backdoor pattern),
// long horizon. Math should be finite and Roth-favourable.
(function case9() {
  const R = calcRothConversion({
    conversionAmount: 20000,
    currentAge: 40,
    retirementAge: 65,
    currentMarginalRatePct: 35,
    retirementMarginalRatePct: 24,
    expectedReturnPct: 7,
    taxPaidFromConversion: false,
  });
  assert.ok(!R.error, 'Case 9: no error');
  assert.ok(Number.isFinite(R.rothValueAtRetirement), 'Case 9: finite');
  assert.equal(R.conversionTax, 7000, 'Case 9: tax = $20k × 35% = $7,000');
  assert.equal(R.amountInRoth, 20000, 'Case 9: full $20k enters Roth');
  // At current=35%, retire=24%, tax-from-outside → Roth still wins because
  // the $7k tax prepayment was for "free" (outside money).
  assert.ok(R.netAdvantage > 0, 'Case 9: Roth wins via outside-fund tax');
  assert.equal(R.recommendation, 'Convert', 'Case 9: recommendation Convert');
  console.log('OK Case 9 — Backdoor Roth scenario (high rate, outside funds)');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
