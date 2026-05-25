/* FinCalcHub — Future Value Calculator tests
 * Lump-sum compounding, ordinary annuity FV, combined lump + annuity,
 * annuity-due exceeding ordinary, zero-rate division-by-zero guard,
 * total-interest identity, EAR-from-nominal, validation, and daily
 * compounding edge.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcFutureValue } = require('../../js/calc/future-value.js');

let passed = 0;

// Case 1 — Lump sum only: PV=$10,000, 7%, 10yr, monthly compounding.
// FV = 10000 × (1 + 0.07/12)^120 ≈ $20,096.61. No payment → annuity = 0.
(function case1() {
  const R = calcFutureValue({
    presentValue: 10000,
    payment: 0,
    annualRatePct: 7,
    years: 10,
    compoundingPerYear: 12,
    contributionFrequency: 12,
  });
  assert.ok(!R.error, 'Case 1: no error, got ' + R.error);
  const expected = 10000 * Math.pow(1 + 0.07 / 12, 120);
  assert.ok(Math.abs(R.futureValueLumpSum - expected) < 0.01,
    'Case 1: lump FV = 10000×(1+0.07/12)^120, got ' + R.futureValueLumpSum);
  assert.ok(R.futureValueLumpSum > 20000 && R.futureValueLumpSum < 20200,
    'Case 1: lump FV ≈ $20,097, got ' + R.futureValueLumpSum);
  assert.equal(R.futureValueAnnuity, 0, 'Case 1: no payment → annuity FV = 0');
  assert.equal(R.futureValueTotal, R.futureValueLumpSum, 'Case 1: total = lump only');
  console.log('OK Case 1 — Lump sum only $10k @ 7% 10yr monthly → ~$20,097');
  passed++;
})();

// Case 2 — Annuity only: PMT=$500/mo, 7%, 10yr, end timing.
// i = 0.07/12, N = 120. FV = 500 × ((1+i)^120 − 1)/i ≈ $86,542.40.
(function case2() {
  const R = calcFutureValue({
    presentValue: 0,
    payment: 500,
    annualRatePct: 7,
    years: 10,
    compoundingPerYear: 12,
    contributionFrequency: 12,
    paymentTiming: 'end',
  });
  assert.ok(!R.error, 'Case 2: no error, got ' + R.error);
  const i = 0.07 / 12;
  const expected = 500 * ((Math.pow(1 + i, 120) - 1) / i);
  assert.ok(Math.abs(R.futureValueAnnuity - expected) < 0.01,
    'Case 2: annuity FV = standard ordinary formula, got ' + R.futureValueAnnuity);
  assert.ok(R.futureValueAnnuity > 86000 && R.futureValueAnnuity < 87000,
    'Case 2: annuity FV ≈ $86,542, got ' + R.futureValueAnnuity);
  assert.equal(R.futureValueLumpSum, 0, 'Case 2: no PV → lump FV = 0');
  console.log('OK Case 2 — Annuity only $500/mo @ 7% 10yr → ~$86,542');
  passed++;
})();

// Case 3 — Combined: both PV and PMT set → total = lump + annuity.
(function case3() {
  const R = calcFutureValue({
    presentValue: 10000,
    payment: 500,
    annualRatePct: 7,
    years: 10,
    compoundingPerYear: 12,
    contributionFrequency: 12,
  });
  assert.ok(!R.error, 'Case 3: no error, got ' + R.error);
  assert.ok(R.futureValueLumpSum > 0 && R.futureValueAnnuity > 0,
    'Case 3: both components positive');
  // Components are each rounded to cents independently, so summing them can
  // differ from the separately-rounded total by up to one cent.
  assert.ok(Math.abs(R.futureValueTotal - (R.futureValueLumpSum + R.futureValueAnnuity)) < 0.02,
    'Case 3: total = lump + annuity (±1 cent rounding), got ' + R.futureValueTotal);
  console.log('OK Case 3 — Combined: total = lump + annuity');
  passed++;
})();

// Case 4 — Annuity-due > ordinary: same inputs, begin timing.
// FV(due) = FV(ordinary) × (1 + i), strictly greater for i > 0.
(function case4() {
  const base = {
    presentValue: 0,
    payment: 500,
    annualRatePct: 7,
    years: 10,
    compoundingPerYear: 12,
    contributionFrequency: 12,
  };
  const ordinary = calcFutureValue(Object.assign({}, base, { paymentTiming: 'end' }));
  const due = calcFutureValue(Object.assign({}, base, { paymentTiming: 'begin' }));
  assert.ok(!ordinary.error && !due.error, 'Case 4: no error');
  assert.ok(due.futureValueAnnuity > ordinary.futureValueAnnuity,
    'Case 4: annuity-due > ordinary, got due=' + due.futureValueAnnuity +
    ' ordinary=' + ordinary.futureValueAnnuity);
  const i = 0.07 / 12;
  const expectedDue = ordinary.futureValueAnnuity * (1 + i);
  assert.ok(Math.abs(due.futureValueAnnuity - expectedDue) < 0.05,
    'Case 4: due = ordinary × (1+i), got ' + due.futureValueAnnuity +
    ' expected ' + expectedDue);
  console.log('OK Case 4 — Annuity-due = ordinary × (1+i), strictly greater');
  passed++;
})();

// Case 5 — Zero rate: 0% → FV lump = PV, FV annuity = PMT × N. No NaN/Inf.
(function case5() {
  const R = calcFutureValue({
    presentValue: 10000,
    payment: 500,
    annualRatePct: 0,
    years: 10,
    compoundingPerYear: 12,
    contributionFrequency: 12,
  });
  assert.ok(!R.error, 'Case 5: no error, got ' + R.error);
  assert.equal(R.futureValueLumpSum, 10000, 'Case 5: zero-rate lump = PV');
  assert.equal(R.futureValueAnnuity, 500 * 12 * 10, 'Case 5: zero-rate annuity = PMT × N = 60000');
  assert.ok(isFinite(R.futureValueTotal) && !isNaN(R.futureValueTotal),
    'Case 5: total is finite (no division by zero)');
  assert.equal(R.totalInterestEarned, 0, 'Case 5: zero rate → zero interest');
  console.log('OK Case 5 — Zero rate: lump=PV, annuity=PMT×N, no NaN/Infinity');
  passed++;
})();

// Case 6 — Total interest identity: totalInterestEarned = FV − contributions.
(function case6() {
  const R = calcFutureValue({
    presentValue: 25000,
    payment: 300,
    annualRatePct: 6,
    years: 20,
    compoundingPerYear: 12,
    contributionFrequency: 12,
  });
  assert.ok(!R.error, 'Case 6: no error, got ' + R.error);
  const expectedContrib = 25000 + 300 * 12 * 20;
  assert.equal(R.totalContributions, expectedContrib,
    'Case 6: totalContributions = PV + PMT×freq×years, got ' + R.totalContributions);
  assert.ok(Math.abs(R.totalInterestEarned - (R.futureValueTotal - R.totalContributions)) < 0.01,
    'Case 6: interest = FV total − contributions, got ' + R.totalInterestEarned);
  console.log('OK Case 6 — totalInterest = FV total − totalContributions');
  passed++;
})();

// Case 7 — EAR from nominal: 7% nominal monthly → EAR ≈ 7.229%.
// EAR = ((1 + 0.07/12)^12 − 1) × 100.
(function case7() {
  const R = calcFutureValue({
    presentValue: 10000,
    payment: 0,
    annualRatePct: 7,
    years: 10,
    compoundingPerYear: 12,
    contributionFrequency: 12,
  });
  assert.ok(!R.error, 'Case 7: no error');
  const expectedEar = (Math.pow(1 + 0.07 / 12, 12) - 1) * 100;
  assert.ok(Math.abs(R.effectiveAnnualRatePct - expectedEar) < 0.001,
    'Case 7: EAR formula, got ' + R.effectiveAnnualRatePct);
  assert.ok(Math.abs(R.effectiveAnnualRatePct - 7.229) < 0.01,
    'Case 7: EAR ≈ 7.229%, got ' + R.effectiveAnnualRatePct);
  console.log('OK Case 7 — 7% nominal monthly → EAR ≈ 7.229%');
  passed++;
})();

// Case 8 — Validation: both PV and PMT zero → error; years > 100 → error;
// rate < -20 → error; negative PV → error.
(function case8() {
  const bad1 = calcFutureValue({ presentValue: 0, payment: 0, annualRatePct: 7, years: 10 });
  const bad2 = calcFutureValue({ presentValue: 10000, payment: 0, annualRatePct: 7, years: 101 });
  const bad3 = calcFutureValue({ presentValue: 10000, payment: 0, annualRatePct: -25, years: 10 });
  const bad4 = calcFutureValue({ presentValue: -500, payment: 0, annualRatePct: 7, years: 10 });
  assert.ok(bad1.error && /at least one|greater than zero/i.test(bad1.error),
    'Case 8a: both zero errors, got: ' + bad1.error);
  assert.ok(bad2.error && /years/i.test(bad2.error),
    'Case 8b: years > 100 errors, got: ' + bad2.error);
  assert.ok(bad3.error && /rate/i.test(bad3.error),
    'Case 8c: rate < -20 errors, got: ' + bad3.error);
  assert.ok(bad4.error && /present value|negative/i.test(bad4.error),
    'Case 8d: negative PV errors, got: ' + bad4.error);
  console.log('OK Case 8 — Validation: both-zero, years cap, rate floor, negative PV');
  passed++;
})();

// Case 9 — Daily compounding produces FV slightly above monthly.
(function case9() {
  const monthly = calcFutureValue({
    presentValue: 10000, payment: 0, annualRatePct: 7, years: 10,
    compoundingPerYear: 12, contributionFrequency: 12,
  });
  const daily = calcFutureValue({
    presentValue: 10000, payment: 0, annualRatePct: 7, years: 10,
    compoundingPerYear: 365, contributionFrequency: 12,
  });
  assert.ok(!monthly.error && !daily.error, 'Case 9: no error');
  assert.ok(daily.futureValueLumpSum > monthly.futureValueLumpSum,
    'Case 9: daily compounding > monthly, got daily=' + daily.futureValueLumpSum +
    ' monthly=' + monthly.futureValueLumpSum);
  // Difference should be small (more frequent compounding, modest gain).
  assert.ok((daily.futureValueLumpSum - monthly.futureValueLumpSum) < 100,
    'Case 9: daily-vs-monthly gain is modest (<$100), got $' +
    (daily.futureValueLumpSum - monthly.futureValueLumpSum).toFixed(2));
  console.log('OK Case 9 — Daily compounding slightly exceeds monthly');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
