/* FinCalcHub — State Paycheck shared calc tests */
'use strict';

const assert = require('node:assert/strict');
const { calcStatePaycheck, applyBrackets, FEDERAL_BRACKETS_2026 } = require('../../js/calc/state-paycheck.js');

let passed = 0;

// Case 1 — applyBrackets utility on a known progressive case
// $50k single 2026: 10% on first $11,925 = $1,192.50 + 12% on ($48,475 − $11,925) = $4,386.00
// + 22% on ($50,000 − $48,475) = $335.50 → total ~$5,914
(function case1() {
  const tax = applyBrackets(50000, FEDERAL_BRACKETS_2026.single);
  assert.ok(tax > 5900 && tax < 5920, 'Case 1: $50k single ~$5,914, got ' + tax);
  console.log('OK Case 1 — applyBrackets known case');
  passed++;
})();

// Case 2 — Texas $80k single, no state tax, no deferrals
// Standard deduction $15k → federal taxable $65k
// Federal: 10%×11925 + 12%×(48475−11925) + 22%×(65000−48475) = 1192.50 + 4386 + 3635.50 = 9214
// SS: 6.2% × $80k = $4,960; Medicare: 1.45% × $80k = $1,160; addl Medicare: 0
// Total tax: ~$15,334; effective ~19.2%
(function case2() {
  const R = calcStatePaycheck({ grossAnnual: 80000, filingStatus: 'single', state: 'TX' });
  assert.ok(!R.error, 'Case 2: no error');
  assert.equal(R.stateTax, 0, 'Case 2: TX has no state tax');
  assert.equal(R.stateDisability, 0, 'Case 2: TX has no SDI');
  assert.ok(R.federalIncomeTax > 9200 && R.federalIncomeTax < 9230,
    'Case 2: federal ~$9,214, got ' + R.federalIncomeTax);
  assert.equal(R.socialSecurity, 4960, 'Case 2: SS $4,960');
  assert.equal(R.medicare, 1160, 'Case 2: Medicare $1,160');
  assert.ok(R.effectiveTaxRatePct > 19 && R.effectiveTaxRatePct < 19.5,
    'Case 2: effective ~19.2%, got ' + R.effectiveTaxRatePct);
  console.log('OK Case 2 — Texas $80k single baseline');
  passed++;
})();

// Case 3 — California $80k single
// Same federal + FICA as Texas but ADD CA state tax + SDI
// CA taxable income: $80k − $5,540 std = $74,460
// 1%×10756 + 2%×(25499-10756) + 4%×(40245-25499) + 6%×(55866-40245)
//   + 8%×(70606-55866) + 9.3%×(74460-70606)
// = 107.56 + 294.86 + 589.84 + 937.26 + 1179.20 + 358.42 = ~3,467
// CA SDI: 1.1% × $80k = $880
(function case3() {
  const R = calcStatePaycheck({ grossAnnual: 80000, filingStatus: 'single', state: 'CA' });
  assert.ok(R.stateTax > 3400 && R.stateTax < 3500,
    'Case 3: CA state tax ~$3,467, got ' + R.stateTax);
  assert.equal(R.stateDisability, 880, 'Case 3: CA SDI $880');
  assert.ok(R.effectiveTaxRatePct > 24 && R.effectiveTaxRatePct < 25,
    'Case 3: effective ~24.6%, got ' + R.effectiveTaxRatePct);
  console.log('OK Case 3 — California $80k single');
  passed++;
})();

// Case 4 — Social Security cap honored
// $300k single TX: SS only on first $176,100 = $176100 × 6.2% = $10,918.20
(function case4() {
  const R = calcStatePaycheck({ grossAnnual: 300000, filingStatus: 'single', state: 'TX' });
  assert.ok(Math.abs(R.socialSecurity - 10918.20) < 1,
    'Case 4: SS capped at wage base, got ' + R.socialSecurity);
  console.log('OK Case 4 — SS wage base cap');
  passed++;
})();

// Case 5 — Additional Medicare 0.9% above threshold (single = $200k)
// $250k single TX: additional Medicare on ($250k − $200k) × 0.9% = $450
(function case5() {
  const R = calcStatePaycheck({ grossAnnual: 250000, filingStatus: 'single', state: 'TX' });
  assert.equal(R.additionalMedicare, 450, 'Case 5: addl Medicare $450 on $50k over threshold');
  console.log('OK Case 5 — Additional Medicare');
  passed++;
})();

// Case 6 — 401(k) pre-tax reduces federal tax but NOT FICA
// $80k TX with 10% 401k → preTax401k $8,000
// Federal taxable: $80k − $8k − $15k std = $57k → less federal tax
// FICA wages unchanged: still $80k base
(function case6() {
  const noContribution = calcStatePaycheck({ grossAnnual: 80000, state: 'TX' });
  const withContribution = calcStatePaycheck({ grossAnnual: 80000, state: 'TX', contribution401kPct: 10 });
  assert.equal(withContribution.preTax401k, 8000, 'Case 6: 401k pre-tax $8k');
  assert.ok(withContribution.federalIncomeTax < noContribution.federalIncomeTax,
    'Case 6: 401k reduces federal tax');
  assert.equal(withContribution.totalFica, noContribution.totalFica,
    'Case 6: 401k does NOT reduce FICA');
  console.log('OK Case 6 — 401(k) pre-tax behaviour');
  passed++;
})();

// Case 7 — HSA reduces BOTH federal tax AND FICA (triple-tax-advantaged)
(function case7() {
  const noHsa = calcStatePaycheck({ grossAnnual: 80000, state: 'TX' });
  const withHsa = calcStatePaycheck({ grossAnnual: 80000, state: 'TX', contributionHsaAnnual: 4000 });
  assert.ok(withHsa.federalIncomeTax < noHsa.federalIncomeTax, 'Case 7: HSA reduces federal');
  assert.ok(withHsa.totalFica < noHsa.totalFica, 'Case 7: HSA also reduces FICA');
  console.log('OK Case 7 — HSA reduces federal AND FICA');
  passed++;
})();

// Case 8 — Pay period split: monthly default
(function case8() {
  const R = calcStatePaycheck({ grossAnnual: 60000, state: 'TX', payPeriodsPerYear: 12 });
  assert.equal(R.grossPerPeriod, 5000, 'Case 8: $60k / 12 = $5k/mo');
  const R26 = calcStatePaycheck({ grossAnnual: 60000, state: 'TX', payPeriodsPerYear: 26 });
  assert.ok(Math.abs(R26.grossPerPeriod - 2307.69) < 0.1, 'Case 8b: $60k / 26 ~$2,307.69');
  console.log('OK Case 8 — Pay period split');
  passed++;
})();

// Case 9 — Input validation
(function case9() {
  assert.ok(calcStatePaycheck({ grossAnnual: 0, state: 'TX' }).error, 'Case 9a: zero gross errors');
  assert.ok(calcStatePaycheck({ grossAnnual: 80000, state: 'XX' }).error, 'Case 9b: unsupported state errors');
  assert.ok(calcStatePaycheck({ grossAnnual: 80000, state: 'TX', contribution401kPct: 110 }).error,
    'Case 9c: 401k >100% errors');
  assert.ok(calcStatePaycheck({ grossAnnual: 80000, state: 'TX', contributionHsaAnnual: 50000 }).error,
    'Case 9d: HSA too high errors');
  console.log('OK Case 9 — Input validation');
  passed++;
})();

// Case 10 — California $200k single: high-income effective rate
(function case10() {
  const R = calcStatePaycheck({ grossAnnual: 200000, filingStatus: 'single', state: 'CA' });
  // CA effective tax at $200k typically lands ~32-36% including FICA + SDI
  assert.ok(R.effectiveTaxRatePct > 28 && R.effectiveTaxRatePct < 36,
    'Case 10: CA $200k effective ~32%, got ' + R.effectiveTaxRatePct);
  console.log('OK Case 10 — California $200k effective rate');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
