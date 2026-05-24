/* FinCalcHub — FIRE Number Calculator tests
 * Classic 25× rule, conservative SWR, inflation, contribution solver,
 * surplus path, monthly-contribution-needed, validation.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcFireNumber } = require('../../js/calc/fire-number.js');

let passed = 0;

// Case 1 — Classic 25× rule. $40k expenses at 4% SWR → $1M FIRE number.
(function case1() {
  const R = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 4,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(!R.error, 'Case 1: no error');
  assert.equal(R.fireNumber, 1000000, 'Case 1: $1M FIRE number');
  assert.equal(R.multipleOfExpenses, 25, 'Case 1: 25× rule at 4% SWR');
  console.log('OK Case 1 — Classic 25× rule: $40k × 25 = $1M at 4% SWR');
  passed++;
})();

// Case 2 — 3% conservative SWR. $40k at 3% → $1.333M (33.33×).
(function case2() {
  const R = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 3,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(!R.error, 'Case 2: no error');
  assert.ok(R.fireNumber > 1333000 && R.fireNumber < 1334000,
    'Case 2: ≈ $1.333M, got ' + R.fireNumber);
  assert.ok(Math.abs(R.multipleOfExpenses - 33.33) < 0.01,
    'Case 2: 33.33× at 3% SWR, got ' + R.multipleOfExpenses);
  console.log('OK Case 2 — 3% conservative SWR: ≈$1.333M (33.33×)');
  passed++;
})();

// Case 3 — Inflation adjustment. $1M today @ 3% inflation × 20 yrs ≈ $1.806M.
// 1.03^20 ≈ 1.8061
(function case3() {
  const R = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 4,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(!R.error, 'Case 3: no error');
  assert.ok(R.fireNumberInflationAdjusted > 1800000 && R.fireNumberInflationAdjusted < 1815000,
    'Case 3: 20yr inflation-adjusted target ≈ $1.806M, got ' + R.fireNumberInflationAdjusted);
  console.log('OK Case 3 — Inflation adjustment: $1M → ≈$1.806M over 20yr @ 3%');
  passed++;
})();

// Case 4 — Years at current rate, $0 savings, $1k/mo, 7% return.
// Target $1M (no inflation drift on RHS); historically this is ~28-32 years.
// With inflation drift on target, expect 30-40 years.
(function case4() {
  const R = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 4,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 1000,
    expectedReturnPct: 7,
  });
  assert.ok(!R.error, 'Case 4: no error');
  assert.ok(R.yearsAtCurrentRate !== null, 'Case 4: should reach FIRE eventually');
  assert.ok(R.yearsAtCurrentRate > 25 && R.yearsAtCurrentRate < 50,
    'Case 4: years to FIRE in plausible 25-50yr band, got ' + R.yearsAtCurrentRate);
  // Also at the target year (20), they're short — surplus is negative.
  assert.ok(R.surplusOrGap < 0, 'Case 4: $1k/mo for 20yr from $0 falls short of $1.8M');
  console.log('OK Case 4 — Years at current rate: $0 + $1k/mo @ 7% → ' + R.yearsAtCurrentRate + ' yrs');
  passed++;
})();

// Case 5 — Surplus when ahead. $500k current + $3k/mo @ 7% × 20yr should
// blow past $1.806M target.
// Future value ≈ 500k × 1.07^20 + 3000 × 12 × (1.07^20 - 1) / 0.07
//             ≈ 500k × 3.8697 + 36000 × 40.995
//             ≈ 1,934,827 + 1,475,840 ≈ $3.41M
// Easily > $1.806M target.
(function case5() {
  const R = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 4,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 500000,
    monthlyContribution: 3000,
    expectedReturnPct: 7,
  });
  assert.ok(!R.error, 'Case 5: no error');
  assert.ok(R.surplusOrGap > 0,
    'Case 5: high savings + contribution → positive surplus, got ' + R.surplusOrGap);
  assert.ok(R.surplusOrGap > 1000000,
    'Case 5: surplus should be substantial (>$1M), got ' + R.surplusOrGap);
  assert.equal(R.monthlyContribNeeded, 0, 'Case 5: contribution needed = 0 (already over)');
  // Should reach FIRE well before 20 years.
  assert.ok(R.yearsAtCurrentRate < 20,
    'Case 5: ahead of plan reaches FIRE before yearsToFire, got ' + R.yearsAtCurrentRate);
  console.log('OK Case 5 — Surplus when ahead: $500k + $3k/mo → +$' +
    Math.round(R.surplusOrGap).toLocaleString() + ' surplus');
  passed++;
})();

// Case 6 — Monthly contribution needed. $50k current, 20 yrs to FIRE, 7%
// return, target $1.806M inflation-adjusted.
// Needed FV after $50k growth: $1.806M - 50k × 3.8697 = $1.806M - $193k = $1.613M
// annualNeeded = $1.613M × 0.07 / (3.8697 - 1) = $1.613M × 0.07 / 2.8697 ≈ $39,344
// monthlyNeeded ≈ $3,279
(function case6() {
  const R = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 4,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 50000,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(!R.error, 'Case 6: no error');
  assert.ok(R.monthlyContribNeeded > 3000 && R.monthlyContribNeeded < 3600,
    'Case 6: monthly needed ≈ $3,279, got ' + R.monthlyContribNeeded);
  console.log('OK Case 6 — Monthly contrib needed: $50k start, 20yr → $' +
    Math.round(R.monthlyContribNeeded) + '/mo');
  passed++;
})();

// Case 7 — Validation: zero expenses errors
(function case7() {
  const zeroExp = calcFireNumber({
    annualExpenses: 0,
    withdrawalRatePct: 4,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(zeroExp.error && /positive/i.test(zeroExp.error),
    'Case 7a: zero annualExpenses errors');

  const lowSwr = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 1,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(lowSwr.error && /withdrawal/i.test(lowSwr.error),
    'Case 7b: SWR=1 (below 2) errors');

  const highSwr = calcFireNumber({
    annualExpenses: 40000,
    withdrawalRatePct: 12,
    inflationPct: 3,
    yearsToFire: 20,
    currentSavings: 0,
    monthlyContribution: 0,
    expectedReturnPct: 7,
  });
  assert.ok(highSwr.error && /withdrawal/i.test(highSwr.error),
    'Case 7c: SWR=12 (above 8) errors');
  console.log('OK Case 7 — Validation: expenses>0, SWR 2-8%');
  passed++;
})();

// Case 8 — Defaults applied when keys absent. annualExpenses required;
// all other fields default to 4% SWR / 3% inflation / 20 yrs / $0 / 7%.
(function case8() {
  const R = calcFireNumber({ annualExpenses: 40000 });
  assert.ok(!R.error, 'Case 8: defaults case has no error');
  assert.equal(R.fireNumber, 1000000, 'Case 8: defaults give 4% SWR → $1M');
  assert.equal(R.multipleOfExpenses, 25, 'Case 8: defaults give 25× rule');
  console.log('OK Case 8 — Defaults: 4% SWR / 3% inflation / 20yr / 7% return');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
