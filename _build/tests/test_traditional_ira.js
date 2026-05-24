/* FinCalcHub — Traditional IRA Calculator tests
 * Baseline contribution + growth, catch-up contribution math, deduction
 * tax value, withdrawal tax, Roth-equivalent comparison flips across
 * the four rate regimes, validation, zero-growth identity.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcTraditionalIra } = require('../../js/calc/traditional-ira.js');

let passed = 0;

// Case 1 — Baseline: 30yo, $7k/yr, retire 65, 7% return, 22% flat rates.
// FV of annuity = 7000 × ((1.07^35 - 1) / 0.07) ≈ $967,658.
// Trad net-after-tax = ~$754k. With flat rates, Roth equivalent matches.
(function case1() {
  const R = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(!R.error, 'Case 1: no error, got ' + R.error);
  assert.equal(R.yearsOfContributions, 35, 'Case 1: 35 years');
  assert.ok(R.balanceAtRetirement > 900000 && R.balanceAtRetirement < 1050000,
    'Case 1: balance ≈ $968k, got ' + R.balanceAtRetirement);
  assert.equal(R.totalContributions, 7000 * 35, 'Case 1: $245k total contrib');
  console.log('OK Case 1 — Baseline 30→65 $7k @ 7% → ~$1M pot');
  passed++;
})();

// Case 2 — Catch-up contribution age 50+: 55yo, $8k/yr, retire 65 (10yr).
// FV = 8000 × ((1.07^10 - 1)/0.07) ≈ 8000 × 13.8164 ≈ $110,531.
// Far smaller than Case 1's 35-year horizon.
(function case2() {
  const R = calcTraditionalIra({
    currentAge: 55,
    retirementAge: 65,
    annualContribution: 8000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(!R.error, 'Case 2: no error, got ' + R.error);
  assert.equal(R.yearsOfContributions, 10);
  assert.ok(R.balanceAtRetirement > 100000 && R.balanceAtRetirement < 120000,
    'Case 2: catch-up 10yr pot ≈ $110k, got ' + R.balanceAtRetirement);
  assert.equal(R.totalContributions, 80000, 'Case 2: $80k total contrib (10yrs × $8k)');
  console.log('OK Case 2 — Catch-up 55→65 $8k @ 7% → ~$110k pot');
  passed++;
})();

// Case 3 — Tax deduction value: $7k contribution × 22% rate × 35 years
// = $245,000 × 22% = $53,900 lifetime deduction value.
(function case3() {
  const R = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(!R.error, 'Case 3: no error');
  assert.equal(R.totalDeductionTaxSaved, 245000 * 0.22,
    'Case 3: lifetime deduction tax saved = $53,900');
  // Per-year sanity: $7k × 22% = $1,540
  assert.equal(R.totalDeductionTaxSaved / R.yearsOfContributions, 7000 * 0.22,
    'Case 3: per-year deduction = $1,540');
  console.log('OK Case 3 — Tax deduction = totalContrib × marginalRate');
  passed++;
})();

// Case 4 — Withdrawal tax at retirement: balance × retirement rate.
// $968k × 22% ≈ $213k tax on lump-sum-equivalent withdrawal.
(function case4() {
  const R = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(!R.error, 'Case 4: no error');
  const expectedTax = R.balanceAtRetirement * 0.22;
  assert.ok(Math.abs(R.withdrawalTaxAtRetirement - expectedTax) < 0.5,
    'Case 4: withdrawal tax = balance × retireRate, got ' + R.withdrawalTaxAtRetirement);
  assert.ok(Math.abs(R.netAfterTaxAtRetirement - (R.balanceAtRetirement - R.withdrawalTaxAtRetirement)) < 0.5,
    'Case 4: net after tax = balance - withdrawal tax');
  console.log('OK Case 4 — Withdrawal tax = balance × retirementRate');
  passed++;
})();

// Case 5 — Flat rates: Trad netAfterTax ≈ Roth equivalent (mathematical
// identity when currentRate = retirementRate, since
//   netAfterTax = balance × (1 - rate)
//              = [annual × growthFactor] × (1 - rate)
//   roth equiv = [annual × (1 - rate)] × growthFactor
// → both equal annual × (1 - rate) × growthFactor.
// Recommendation should be "Roughly equal" (within 2%).
(function case5() {
  const R = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(!R.error, 'Case 5: no error');
  assert.ok(Math.abs(R.netAfterTaxAtRetirement - R.roth401kEquivalent) < 1,
    'Case 5: flat-rate identity netAfterTax ≈ rothEquivalent, got trad=' +
    R.netAfterTaxAtRetirement + ' roth=' + R.roth401kEquivalent);
  assert.equal(R.recommendation, 'Roughly equal',
    'Case 5: flat rates → "Roughly equal", got "' + R.recommendation + '"');
  console.log('OK Case 5 — Flat rates: Trad net ≈ Roth → "Roughly equal"');
  passed++;
})();

// Case 6 — Roth wins: current 22%, retirement 32%, 30 years.
// Trad balance × (1 - 0.32) = balance × 0.68
// Roth balance = (annual × 0.78) × growthFactor
// → Roth > Trad → recommendation = "Roth wins"
(function case6() {
  const R = calcTraditionalIra({
    currentAge: 35,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 32,
  });
  assert.ok(!R.error, 'Case 6: no error');
  assert.ok(R.roth401kEquivalent > R.netAfterTaxAtRetirement,
    'Case 6: Roth equivalent > Trad net, got roth=' + R.roth401kEquivalent +
    ' trad=' + R.netAfterTaxAtRetirement);
  assert.equal(R.recommendation, 'Roth wins',
    'Case 6: lower current rate → "Roth wins", got "' + R.recommendation + '"');
  console.log('OK Case 6 — Current 22% / retire 32% → Roth wins');
  passed++;
})();

// Case 7 — Traditional wins: current 32%, retirement 12%, 30 years.
// Trad balance × (1 - 0.12) = balance × 0.88
// Roth balance = (annual × 0.68) × growthFactor
// → Trad > Roth → recommendation = "Traditional wins"
(function case7() {
  const R = calcTraditionalIra({
    currentAge: 35,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 0,
    expectedReturnPct: 7,
    currentMarginalRatePct: 32,
    retirementMarginalRatePct: 12,
  });
  assert.ok(!R.error, 'Case 7: no error');
  assert.ok(R.netAfterTaxAtRetirement > R.roth401kEquivalent,
    'Case 7: Trad net > Roth equivalent, got trad=' + R.netAfterTaxAtRetirement +
    ' roth=' + R.roth401kEquivalent);
  assert.equal(R.recommendation, 'Traditional wins',
    'Case 7: higher current rate → "Traditional wins", got "' + R.recommendation + '"');
  console.log('OK Case 7 — Current 32% / retire 12% → Traditional wins');
  passed++;
})();

// Case 8 — Validation: contribution > $8k, retirementAge ≤ currentAge,
// out-of-range ages, negative balance.
(function case8() {
  const bad1 = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 10000,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  const bad2 = calcTraditionalIra({
    currentAge: 65,
    retirementAge: 65,
    annualContribution: 7000,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  const bad3 = calcTraditionalIra({
    currentAge: 75,
    retirementAge: 85,
    annualContribution: 7000,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  const bad4 = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: -1000,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(bad1.error && /limit|8,000|catch-up/i.test(bad1.error),
    'Case 8a: contribution > $8k errors, got: ' + bad1.error);
  assert.ok(bad2.error && /greater than current age/i.test(bad2.error),
    'Case 8b: retirement ≤ current age errors');
  assert.ok(bad3.error && /18-72|active accumulation/i.test(bad3.error),
    'Case 8c: age > 72 errors (RMDs start at 73)');
  assert.ok(bad4.error && /balance/i.test(bad4.error),
    'Case 8d: negative balance errors');
  console.log('OK Case 8 — Validation: contribution cap, age order, age cap, balance');
  passed++;
})();

// Case 9 — Zero-growth case: expectedReturnPct = 0 → balance equals
// currentBalance + totalContributions exactly. No compounding, just
// the sum of contributions plus the seed.
(function case9() {
  const R = calcTraditionalIra({
    currentAge: 30,
    retirementAge: 65,
    annualContribution: 7000,
    currentBalance: 10000,
    expectedReturnPct: 0,
    currentMarginalRatePct: 22,
    retirementMarginalRatePct: 22,
  });
  assert.ok(!R.error, 'Case 9: no error');
  const expectedBalance = 10000 + 7000 * 35; // 10000 + 245000 = 255000
  assert.equal(R.balanceAtRetirement, expectedBalance,
    'Case 9: zero-growth identity, expected ' + expectedBalance + ' got ' + R.balanceAtRetirement);
  assert.equal(R.totalGrowth, 0, 'Case 9: zero growth → growth = 0');
  console.log('OK Case 9 — Zero growth: balance = seed + contributions exactly');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
