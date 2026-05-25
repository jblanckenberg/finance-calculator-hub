/* FinCalcHub — Simple Interest Calculator tests
 * Textbook I=P·r·t cases, sub-year horizons, compound-equivalent comparison,
 * multi-decade DGI lesson, zero-rate edge, validation.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcSimpleInterest } = require('../../js/calc/simple-interest.js');

let passed = 0;

// Case 1 — Textbook: $1,000 @ 5% × 2 years
// I = 1000 × 0.05 × 2 = $100; total = $1,100
(function case1() {
  const R = calcSimpleInterest({
    principal: 1000,
    ratePct: 5,
    years: 2,
    frequency: 'annual',
  });
  assert.ok(!R.error, 'Case 1: no error');
  assert.equal(R.interest, 100, 'Case 1: interest = $100');
  assert.equal(R.total, 1100, 'Case 1: total = $1,100');
  assert.equal(R.annualInterest, 50, 'Case 1: annual interest = $50');
  console.log('OK Case 1 — Textbook $1,000 × 5% × 2yr = $100 interest');
  passed++;
})();

// Case 2 — Sub-year: $1,000 @ 6% × 6 months (0.5 yr) = $30
(function case2() {
  const R = calcSimpleInterest({
    principal: 1000,
    ratePct: 6,
    years: 0.5,
    frequency: 'monthly',
  });
  assert.ok(!R.error, 'Case 2: no error');
  assert.equal(R.interest, 30, 'Case 2: $30 interest on half-year');
  assert.equal(R.total, 1030, 'Case 2: total = $1,030');
  assert.equal(R.monthlyInterest, 5, 'Case 2: monthly = $5 (over 6 months)');
  console.log('OK Case 2 — Sub-year: $1,000 × 6% × 0.5yr = $30');
  passed++;
})();

// Case 3 — Comparison to compound: $10,000 @ 5% × 10 yrs
// Simple: 10000 × 0.05 × 10 = $5,000
// Compound (monthly): 10000 × (1 + 0.05/12)^120 - 10000 ≈ $6,470
// Spread ≈ $1,470 — the headline DGI/compound lesson
(function case3() {
  const R = calcSimpleInterest({
    principal: 10000,
    ratePct: 5,
    years: 10,
    frequency: 'annual',
  });
  assert.ok(!R.error, 'Case 3: no error');
  assert.equal(R.interest, 5000, 'Case 3: simple interest = $5,000');
  assert.ok(R.compoundInterestEquivalent > 6400 && R.compoundInterestEquivalent < 6550,
    'Case 3: compound equivalent ≈ $6,470, got ' + R.compoundInterestEquivalent);
  assert.ok(R.spread > 1400 && R.spread < 1550,
    'Case 3: spread ≈ $1,470, got ' + R.spread);
  console.log('OK Case 3 — Compound spread: $10k×5%×10yr → simple $5k, compound ≈ $' +
    Math.round(R.compoundInterestEquivalent) + ' (spread $' + Math.round(R.spread) + ')');
  passed++;
})();

// Case 4 — Multi-decade DGI lesson: $1,000 @ 5% × 30 yrs
// Simple: 1000 × 0.05 × 30 = $1,500
// Compound (monthly): 1000 × (1 + 0.05/12)^360 - 1000 ≈ $3,467
// Spread ≈ $1,967 — compound > 2× simple over 30yr
(function case4() {
  const R = calcSimpleInterest({
    principal: 1000,
    ratePct: 5,
    years: 30,
    frequency: 'annual',
  });
  assert.ok(!R.error, 'Case 4: no error');
  assert.equal(R.interest, 1500, 'Case 4: simple = $1,500');
  assert.ok(R.compoundInterestEquivalent > 3400 && R.compoundInterestEquivalent < 3550,
    'Case 4: compound ≈ $3,467, got ' + R.compoundInterestEquivalent);
  assert.ok(R.compoundInterestEquivalent > 2 * R.interest,
    'Case 4: 30yr compound > 2× simple, got compound ' + R.compoundInterestEquivalent +
    ' vs simple ' + R.interest);
  console.log('OK Case 4 — Multi-decade DGI: $1k×5%×30yr → simple $1.5k, compound ≈ $' +
    Math.round(R.compoundInterestEquivalent));
  passed++;
})();

// Case 5 — Zero rate: interest = 0, total = principal, spread = 0
(function case5() {
  const R = calcSimpleInterest({
    principal: 5000,
    ratePct: 0,
    years: 5,
    frequency: 'annual',
  });
  assert.ok(!R.error, 'Case 5: no error');
  assert.equal(R.interest, 0, 'Case 5: 0% → 0 interest');
  assert.equal(R.total, 5000, 'Case 5: total = principal');
  assert.equal(R.spread, 0, 'Case 5: 0% → 0 spread');
  console.log('OK Case 5 — Zero rate: interest = 0, total = principal');
  passed++;
})();

// Case 6 — Validation: zero / negative principal, negative years
(function case6() {
  const zero = calcSimpleInterest({
    principal: 0, ratePct: 5, years: 2, frequency: 'annual',
  });
  assert.ok(zero.error && /positive/i.test(zero.error),
    'Case 6a: zero principal errors');

  const neg = calcSimpleInterest({
    principal: -1000, ratePct: 5, years: 2, frequency: 'annual',
  });
  assert.ok(neg.error && /positive/i.test(neg.error),
    'Case 6b: negative principal errors');

  const negYears = calcSimpleInterest({
    principal: 1000, ratePct: 5, years: -1, frequency: 'annual',
  });
  assert.ok(negYears.error && /years/i.test(negYears.error),
    'Case 6c: negative years errors');

  const badFreq = calcSimpleInterest({
    principal: 1000, ratePct: 5, years: 2, frequency: 'daily',
  });
  assert.ok(badFreq.error && /frequency/i.test(badFreq.error),
    'Case 6d: unknown frequency errors');

  console.log('OK Case 6 — Validation: principal>0, years>0, valid frequency');
  passed++;
})();

// Case 7 — Frequency is display-only: same dollar totals across choices
// $5,000 @ 4% × 3yr should yield interest = $600 regardless of frequency
(function case7() {
  const annual = calcSimpleInterest({
    principal: 5000, ratePct: 4, years: 3, frequency: 'annual',
  });
  const monthly = calcSimpleInterest({
    principal: 5000, ratePct: 4, years: 3, frequency: 'monthly',
  });
  const quarterly = calcSimpleInterest({
    principal: 5000, ratePct: 4, years: 3, frequency: 'quarterly',
  });
  assert.equal(annual.interest, 600);
  assert.equal(monthly.interest, 600);
  assert.equal(quarterly.interest, 600);
  assert.equal(annual.interest, monthly.interest);
  assert.equal(annual.interest, quarterly.interest);
  console.log('OK Case 7 — Frequency is display-only: totals match across annual/monthly/quarterly');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
