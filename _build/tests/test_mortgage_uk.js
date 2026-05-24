/* FinCalcHub — UK Mortgage shared calc tests */
'use strict';

const assert = require('node:assert/strict');
const { calcMortgagePayment, calcOverpayment, monthlyPaymentFormula } = require('../../js/calc/mortgage-uk.js');

let passed = 0;

// Case 1 — Textbook UK 25yr £200k at 5%: ~£1,169.18/mo
(function case1() {
  const R = calcMortgagePayment({ balance: 200000, ratePct: 5, termYears: 25 });
  assert.ok(!R.error, 'Case 1: no error');
  assert.ok(R.monthlyPayment > 1168 && R.monthlyPayment < 1171,
    'Case 1: ~£1169/mo, got ' + R.monthlyPayment);
  assert.equal(R.monthsToPayoff, 300, 'Case 1: 300 months');
  console.log('OK Case 1 — Textbook 25yr £200k @ 5%');
  passed++;
})();

// Case 2 — Zero-rate edge case
// £120k / 360 months = £333.33/mo, total paid = principal
(function case2() {
  const R = calcMortgagePayment({ balance: 120000, ratePct: 0, termYears: 30 });
  assert.ok(R.monthlyPayment > 333 && R.monthlyPayment < 334,
    'Case 2: zero-rate flat, got ' + R.monthlyPayment);
  // Floating-point and per-month rounding can cause ~£1 drift; assert near-zero.
  assert.ok(Math.abs(R.totalInterest) < 1, 'Case 2: ~zero interest, got ' + R.totalInterest);
  console.log('OK Case 2 — Zero-rate');
  passed++;
})();

// Case 3 — 5-year fixed shows balance at end of fixed period
(function case3() {
  const R = calcMortgagePayment({ balance: 200000, ratePct: 5, termYears: 25, fixedYears: 5 });
  // After 60 months at ~£1169/mo with 5% interest, balance should be ~£177k
  assert.ok(R.balanceAtFixedEnd > 175000 && R.balanceAtFixedEnd < 180000,
    'Case 3: balance after 5y fixed ~£177k, got ' + R.balanceAtFixedEnd);
  console.log('OK Case 3 — 5-year fixed balance');
  passed++;
})();

// Case 4 — Monthly £200 overpayment shortens 25yr term
(function case4() {
  const R = calcOverpayment({
    balance: 200000, ratePct: 5, termYears: 25,
    monthlyOverpayment: 200, lumpSum: 0,
  });
  assert.ok(!R.error, 'Case 4: no error');
  assert.equal(R.baselineMonths, 300, 'Case 4: baseline 300 months');
  assert.ok(R.monthsSaved > 30, 'Case 4: saves >30 months, got ' + R.monthsSaved);
  assert.ok(R.interestSaved > 10000, 'Case 4: saves >£10k interest, got ' + R.interestSaved);
  console.log('OK Case 4 — Monthly £200 overpayment');
  passed++;
})();

// Case 5 — Lump sum + monthly overpayment combined
(function case5() {
  const R = calcOverpayment({
    balance: 200000, ratePct: 5, termYears: 25,
    monthlyOverpayment: 100, lumpSum: 10000,
  });
  assert.ok(R.monthsSaved > 30, 'Case 5: combined overpay saves >30 months');
  assert.ok(R.interestSaved > 15000, 'Case 5: saves >£15k interest, got ' + R.interestSaved);
  console.log('OK Case 5 — Lump + monthly combined');
  passed++;
})();

// Case 6 — Zero overpayment returns baseline (idempotent)
(function case6() {
  const R = calcOverpayment({
    balance: 200000, ratePct: 5, termYears: 25,
    monthlyOverpayment: 0, lumpSum: 0,
  });
  assert.equal(R.monthsSaved, 0, 'Case 6: no overpay -> 0 months saved');
  assert.equal(R.interestSaved, 0, 'Case 6: no overpay -> 0 interest saved');
  console.log('OK Case 6 — Zero overpayment idempotent');
  passed++;
})();

// Case 7 — Monthly payment formula direct
(function case7() {
  // £100,000 at 6%/yr (0.5%/mo) for 360 months = ~£599.55
  const pmt = monthlyPaymentFormula(100000, 0.005, 360);
  assert.ok(pmt > 599 && pmt < 600, 'Case 7: ~£599.55/mo, got ' + pmt);
  console.log('OK Case 7 — monthlyPaymentFormula');
  passed++;
})();

// Case 8 — Input validation
(function case8() {
  assert.ok(calcMortgagePayment({ balance: 0, ratePct: 5, termYears: 25 }).error, 'Case 8a: zero balance errors');
  assert.ok(calcMortgagePayment({ balance: 200000, ratePct: -1, termYears: 25 }).error, 'Case 8b: negative rate errors');
  assert.ok(calcMortgagePayment({ balance: 200000, ratePct: 35, termYears: 25 }).error, 'Case 8c: rate >30% errors');
  assert.ok(calcMortgagePayment({ balance: 200000, ratePct: 5, termYears: 0 }).error, 'Case 8d: zero term errors');
  assert.ok(calcMortgagePayment({ balance: 200000, ratePct: 5, termYears: 25, fixedYears: 30 }).error,
    'Case 8e: fixed > term errors');
  assert.ok(calcOverpayment({ balance: 200000, ratePct: 5, termYears: 25, monthlyOverpayment: -1 }).error,
    'Case 8f: negative overpay errors');
  assert.ok(calcOverpayment({ balance: 200000, ratePct: 5, termYears: 25, lumpSum: 300000 }).error,
    'Case 8g: lump > balance errors');
  console.log('OK Case 8 — Input validation');
  passed++;
})();

// Case 9 — Large lump sum pays off mortgage early
(function case9() {
  const R = calcOverpayment({
    balance: 200000, ratePct: 5, termYears: 25,
    monthlyOverpayment: 0, lumpSum: 195000,
  });
  assert.ok(R.newMonths < 60, 'Case 9: large lump pays off fast, got ' + R.newMonths + ' months');
  console.log('OK Case 9 — Large lump sum');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
