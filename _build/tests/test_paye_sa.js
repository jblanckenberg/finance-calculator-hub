/* FinCalcHub — South African PAYE calculator tests
 * SARS 2026/27 brackets, UIF, age rebates, medical credit, RA cap.
 */
'use strict';

const assert = require('node:assert/strict');
const {
  calcPayeSa,
  applyBrackets,
  ageRebate,
  medicalCreditAnnual,
  REBATES_2026_27,
} = require('../../js/calc/paye-sa.js');

let passed = 0;

// Case 1 — applyBrackets utility on a known SARS 2026/27 case
// R500,000 taxable: 18% on first R245,100 = R44,118
//   + 26% on (R370,500 - R245,100) = R32,604
//   + 31% on (R500,000 - R370,500) = R40,145
//   → total = R116,867
(function case1() {
  const tax = applyBrackets(500000);
  assert.ok(Math.abs(tax - 116867) < 1, 'Case 1: R500k taxable ~R116,867, got ' + tax);
  console.log('OK Case 1 — applyBrackets at R500k taxable');
  passed++;
})();

// Case 2 — Baseline R500,000 gross, under 65, no medical, no RA
// Gross tax: R116,867 (from Case 1)
// Less primary rebate R17,235 = R99,632 PAYE
// UIF: 1% of R500k/12 = R416.67/mo, capped at R177.12/mo → R2,125.44/yr
// Net: R500,000 − R99,632 − R2,125.44 = R398,242.56
(function case2() {
  const R = calcPayeSa({ grossSalary: 500000, ageBand: 1, medicalMembers: 0, raContributionMonthly: 0 });
  assert.ok(!R.error, 'Case 2: no error');
  assert.ok(Math.abs(R.grossTax - 116867) < 1, 'Case 2: gross tax ~R116,867, got ' + R.grossTax);
  assert.equal(R.rebate, 17235, 'Case 2: primary rebate R17,235');
  assert.ok(Math.abs(R.payeAnnual - 99632) < 1, 'Case 2: PAYE ~R99,632, got ' + R.payeAnnual);
  assert.ok(Math.abs(R.uifAnnual - 2125.44) < 0.1, 'Case 2: UIF capped at R2,125.44, got ' + R.uifAnnual);
  assert.ok(Math.abs(R.netAnnual - 398242.56) < 1, 'Case 2: net ~R398,242.56, got ' + R.netAnnual);
  console.log('OK Case 2 — R500k baseline');
  passed++;
})();

// Case 3 — Monthly input mode: R40,000/month should equal R480,000/yr behaviour
(function case3() {
  const annual = calcPayeSa({ grossSalary: 480000, inputFrequency: 'annual', ageBand: 1 });
  const monthly = calcPayeSa({ grossSalary: 40000, inputFrequency: 'monthly', ageBand: 1 });
  assert.equal(annual.payeAnnual, monthly.payeAnnual, 'Case 3: annual & monthly inputs match');
  assert.equal(annual.grossAnnual, monthly.grossAnnual, 'Case 3: grossAnnual matches');
  console.log('OK Case 3 — monthly input mode equivalence');
  passed++;
})();

// Case 4 — UIF cap honored on high salary
// R2,000,000/yr → R166,666.67/mo. 1% = R1,666.67/mo, BUT capped at R177.12/mo
// → R2,125.44/yr (same cap as on R500k)
(function case4() {
  const R = calcPayeSa({ grossSalary: 2000000, ageBand: 1 });
  assert.ok(Math.abs(R.uifAnnual - 2125.44) < 0.1, 'Case 4: UIF cap holds at R2,125.44, got ' + R.uifAnnual);
  console.log('OK Case 4 — UIF cap on R2m salary');
  passed++;
})();

// Case 5 — UIF NOT capped on low salary
// R120,000/yr → R10,000/mo. 1% = R100/mo (below R177.12 cap)
// → R1,200/yr
(function case5() {
  const R = calcPayeSa({ grossSalary: 120000, ageBand: 1 });
  assert.equal(R.uifAnnual, 1200, 'Case 5: UIF uncapped on low income, got ' + R.uifAnnual);
  console.log('OK Case 5 — UIF uncapped on R120k salary');
  passed++;
})();

// Case 6 — Age rebates stack correctly
// Under 65: R17,235 primary only
// 65-74: R17,235 + R9,444 = R26,679
// 75+: R17,235 + R9,444 + R3,145 = R29,824
(function case6() {
  assert.equal(ageRebate(1), 17235, 'Case 6a: under 65');
  assert.equal(ageRebate(2), 26679, 'Case 6b: 65-74');
  assert.equal(ageRebate(3), 29824, 'Case 6c: 75+');
  const R65 = calcPayeSa({ grossSalary: 500000, ageBand: 2 });
  const R75 = calcPayeSa({ grossSalary: 500000, ageBand: 3 });
  assert.ok(R65.payeAnnual < 99632, 'Case 6d: 65+ pays less PAYE than under 65');
  assert.ok(R75.payeAnnual < R65.payeAnnual, 'Case 6e: 75+ pays less PAYE than 65-74');
  console.log('OK Case 6 — Age rebates stack');
  passed++;
})();

// Case 7 — Medical credit calculation
// 1 member (just me): R376/mo × 12 = R4,512/yr
// 2 members: R376 + R376 = R752/mo × 12 = R9,024/yr
// 4 members: R376 + R376 + R254*2 = R1,260/mo × 12 = R15,120/yr
(function case7() {
  assert.equal(medicalCreditAnnual(0), 0, 'Case 7a: 0 members → R0');
  assert.equal(medicalCreditAnnual(1), 4512, 'Case 7b: 1 member → R4,512');
  assert.equal(medicalCreditAnnual(2), 9024, 'Case 7c: 2 members → R9,024');
  assert.equal(medicalCreditAnnual(4), 15120, 'Case 7d: 4 members → R15,120');
  console.log('OK Case 7 — Medical scheme credit');
  passed++;
})();

// Case 8 — RA deduction respects 27.5% cap
// R500k gross, R200k RA contribution: 27.5% cap = R137,500
// Effective RA deduction = R137,500 (not R200k), excess = R62,500
(function case8() {
  const R = calcPayeSa({ grossSalary: 500000, ageBand: 1, raContributionMonthly: 200000 / 12 });
  assert.equal(R.raDeduction, 137500, 'Case 8a: RA capped at 27.5% = R137,500');
  assert.ok(Math.abs(R.raExcess - 62500) < 1, 'Case 8b: RA excess R62,500');
  console.log('OK Case 8 — RA 27.5% cap');
  passed++;
})();

// Case 9 — RA deduction respects R350k hard cap on very high incomes
// R2,000,000 gross, R600k RA: 27.5% = R550k (above hard cap)
// Effective RA deduction = R350,000 hard cap, excess = R250k
(function case9() {
  const R = calcPayeSa({ grossSalary: 2000000, ageBand: 1, raContributionMonthly: 600000 / 12 });
  assert.equal(R.raDeduction, 350000, 'Case 9a: RA capped at R350k hard cap');
  assert.equal(R.raExcess, 250000, 'Case 9b: RA excess R250k');
  console.log('OK Case 9 — RA R350k hard cap');
  passed++;
})();

// Case 10 — Top-bracket marginal rate exposure
// R3,000,000 taxable → marginal 45% (above R1,878,600 threshold)
(function case10() {
  const R = calcPayeSa({ grossSalary: 3000000, ageBand: 1 });
  assert.equal(R.marginalRatePct, 45, 'Case 10: 45% top marginal rate at R3m, got ' + R.marginalRatePct);
  console.log('OK Case 10 — Top marginal rate');
  passed++;
})();

// Case 11 — Input validation
(function case11() {
  assert.ok(calcPayeSa({ grossSalary: 0 }).error, 'Case 11a: zero gross errors');
  assert.ok(calcPayeSa({ grossSalary: 500000, ageBand: 4 }).error, 'Case 11b: invalid age band errors');
  assert.ok(calcPayeSa({ grossSalary: 500000, medicalMembers: 25 }).error, 'Case 11c: too many med members errors');
  assert.ok(calcPayeSa({ grossSalary: 500000, raContributionMonthly: -100 }).error, 'Case 11d: negative RA errors');
  console.log('OK Case 11 — Input validation');
  passed++;
})();

// Case 12 — Effective rate sanity (medium salary, no shelter)
// R500k baseline: effective ~20% (PAYE + UIF) / gross
// = (99,632 + 2,125) / 500,000 = 20.35%
(function case12() {
  const R = calcPayeSa({ grossSalary: 500000, ageBand: 1 });
  assert.ok(R.effectiveTaxRatePct > 20 && R.effectiveTaxRatePct < 20.5,
    'Case 12: effective ~20.4%, got ' + R.effectiveTaxRatePct);
  console.log('OK Case 12 — Effective rate at R500k');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
