/* FinCalcHub — Refinance Calculator tests
 * Clear-win refi, break-even identity, roll-costs-into-loan, the term-reset
 * trap (lower monthly BUT higher lifetime cost), no-savings (rate up),
 * zero-rate division guard, interest-savings identity, validation, and the
 * extra-payment display-only field.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcRefinance, monthlyPayment } = require('../../js/calc/refinance.js');

let passed = 0;

// Case 1 — Clear win: $300k @ 7% with 30yr remaining → 30yr new @ 5%,
// $4k closing paid upfront. Lower payment, fast break-even, big lifetime win.
(function case1() {
  const R = calcRefinance({
    currentBalance: 300000,
    currentRatePct: 7,
    currentRemainingYears: 30,
    newRatePct: 5,
    newTermYears: 30,
    closingCosts: 4000,
    rollCostsIntoLoan: false,
  });
  assert.ok(!R.error, 'Case 1: no error, got ' + R.error);
  assert.ok(R.newMonthlyPayment < R.currentMonthlyPayment,
    'Case 1: new payment lower than current');
  assert.ok(R.monthlySavings > 0, 'Case 1: positive monthly savings, got ' + R.monthlySavings);
  assert.ok(R.breakEvenMonths !== null && R.breakEvenMonths > 0 && R.breakEvenMonths < 60,
    'Case 1: break-even is a sensible positive figure under 5yr, got ' + R.breakEvenMonths);
  assert.ok(R.lifetimeSavings > 0,
    'Case 1: same-term rate drop → positive lifetime savings, got ' + R.lifetimeSavings);
  assert.equal(R.recommendation, 'Refinance saves you money',
    'Case 1: recommendation should be a clear yes, got ' + R.recommendation);
  console.log('OK Case 1 — Clear win: $300k 7%→5% same term, payment drops, lifetime savings positive');
  passed++;
})();

// Case 2 — Break-even identity: breakEvenMonths = closingCosts / monthlySavings.
(function case2() {
  const R = calcRefinance({
    currentBalance: 250000,
    currentRatePct: 6.5,
    currentRemainingYears: 25,
    newRatePct: 5.25,
    newTermYears: 25,
    closingCosts: 5000,
    rollCostsIntoLoan: false,
  });
  assert.ok(!R.error, 'Case 2: no error, got ' + R.error);
  assert.ok(R.monthlySavings > 0, 'Case 2: needs positive savings for a break-even');
  const expected = 5000 / R.monthlySavings;
  assert.ok(Math.abs(R.breakEvenMonths - expected) < 0.1,
    'Case 2: breakEven = closing/monthlySavings = ' + expected.toFixed(2) +
    ', got ' + R.breakEvenMonths);
  console.log('OK Case 2 — Break-even = closing costs ÷ monthly savings');
  passed++;
})();

// Case 3 — Roll costs into loan: new principal = balance + closing. Higher
// payment than not-rolling, but no upfront cash (so no break-even drag).
(function case3() {
  const base = {
    currentBalance: 300000,
    currentRatePct: 7,
    currentRemainingYears: 30,
    newRatePct: 5,
    newTermYears: 30,
    closingCosts: 6000,
  };
  const rolled = calcRefinance(Object.assign({}, base, { rollCostsIntoLoan: true }));
  const upfront = calcRefinance(Object.assign({}, base, { rollCostsIntoLoan: false }));
  assert.ok(!rolled.error && !upfront.error, 'Case 3: no error');
  assert.equal(rolled.newPrincipal, 306000,
    'Case 3: rolled principal = 300000 + 6000, got ' + rolled.newPrincipal);
  assert.equal(upfront.newPrincipal, 300000,
    'Case 3: upfront principal = 300000 (costs paid in cash), got ' + upfront.newPrincipal);
  assert.ok(rolled.newMonthlyPayment > upfront.newMonthlyPayment,
    'Case 3: rolling costs in raises the payment, got rolled=' +
    rolled.newMonthlyPayment + ' upfront=' + upfront.newMonthlyPayment);
  // Rolled-in refi spends no cash today → break-even is 0 (already lower payment).
  assert.equal(rolled.breakEvenMonths, 0,
    'Case 3: no upfront cash → break-even 0, got ' + rolled.breakEvenMonths);
  console.log('OK Case 3 — Roll costs in: principal +costs, higher payment, no upfront cash');
  passed++;
})();

// Case 4 — THE TERM-RESET TRAP. $200k @ 6% with 15yr REMAINING, refi into a
// fresh 30yr @ 5%. The monthly payment DROPS (positive monthlySavings) but the
// lifetime cost RISES (negative lifetimeSavings) because the clock restarts.
// This honesty is the whole point of the calculator.
(function case4() {
  const R = calcRefinance({
    currentBalance: 200000,
    currentRatePct: 6,
    currentRemainingYears: 15,
    newRatePct: 5,
    newTermYears: 30,
    closingCosts: 3000,
    rollCostsIntoLoan: false,
  });
  assert.ok(!R.error, 'Case 4: no error, got ' + R.error);
  assert.ok(R.monthlySavings > 0,
    'Case 4: monthly payment DROPS (positive savings), got ' + R.monthlySavings);
  assert.ok(R.lifetimeSavings < 0,
    'Case 4: TRAP — lifetime cost RISES (negative savings) despite lower monthly, got ' +
    R.lifetimeSavings);
  assert.ok(R.interestSavings < 0,
    'Case 4: you pay MORE interest over the new 30yr term, got ' + R.interestSavings);
  assert.equal(R.recommendation, 'Refinancing costs more overall (longer term)',
    'Case 4: recommendation must flag the trap, got ' + R.recommendation);
  console.log('OK Case 4 — Term-reset trap: monthly DROPS +$' + R.monthlySavings +
    ' but lifetime cost RISES $' + R.lifetimeSavings + ' (honest negative)');
  passed++;
})();

// Case 5 — No savings: new rate ≥ current rate, same term. monthlySavings ≤ 0,
// no break-even (null), recommendation flags it.
(function case5() {
  const R = calcRefinance({
    currentBalance: 200000,
    currentRatePct: 5,
    currentRemainingYears: 20,
    newRatePct: 6,
    newTermYears: 20,
    closingCosts: 3000,
    rollCostsIntoLoan: false,
  });
  assert.ok(!R.error, 'Case 5: no error, got ' + R.error);
  assert.ok(R.monthlySavings <= 0,
    'Case 5: higher new rate → no monthly savings, got ' + R.monthlySavings);
  assert.equal(R.breakEvenMonths, null,
    'Case 5: no break-even when payment is not lower, got ' + R.breakEvenMonths);
  assert.ok(/costs more|reconsider/i.test(R.recommendation),
    'Case 5: recommendation should warn, got ' + R.recommendation);
  console.log('OK Case 5 — No savings: rate up → monthlySavings ≤ 0, break-even null');
  passed++;
})();

// Case 6 — Zero-rate edge: 0% loans → payment = principal / n, no NaN/Infinity.
(function case6() {
  const R = calcRefinance({
    currentBalance: 120000,
    currentRatePct: 0,
    currentRemainingYears: 10,
    newRatePct: 0,
    newTermYears: 10,
    closingCosts: 0,
    rollCostsIntoLoan: false,
  });
  assert.ok(!R.error, 'Case 6: no error, got ' + R.error);
  assert.equal(R.currentMonthlyPayment, 1000,
    'Case 6: zero-rate current = 120000/120 = 1000, got ' + R.currentMonthlyPayment);
  assert.equal(R.newMonthlyPayment, 1000,
    'Case 6: zero-rate new = 120000/120 = 1000, got ' + R.newMonthlyPayment);
  assert.ok(isFinite(R.lifetimeSavings) && !isNaN(R.lifetimeSavings),
    'Case 6: lifetime savings finite (no division by zero)');
  console.log('OK Case 6 — Zero rate: payment = principal/n, no NaN/Infinity');
  passed++;
})();

// Case 7 — Interest-savings identity for the clear-win case. interestSavings =
// (current remaining interest) − (new total interest). For a same-term rate
// drop, both must be positive and interest saved must be ≥ lifetime saved
// (lifetime includes upfront closing cost, interest does not).
(function case7() {
  const R = calcRefinance({
    currentBalance: 300000,
    currentRatePct: 7,
    currentRemainingYears: 30,
    newRatePct: 5,
    newTermYears: 30,
    closingCosts: 4000,
    rollCostsIntoLoan: false,
  });
  assert.ok(!R.error, 'Case 7: no error');
  // interestCurrent = totalCostCurrent − currentBalance
  const interestCurrent = R.totalCostCurrent - 300000;
  // interestNew = (new payment × months) − newPrincipal. Costs paid upfront so
  // newPrincipal = 300000 and the new payments contain no closing cost.
  const interestNew = (R.newMonthlyPayment * 360) - 300000;
  const expected = interestCurrent - interestNew;
  // Recomputing from the cents-rounded payment × 360 accumulates a few dollars
  // of rounding vs the module's unrounded internal payment, so allow a small
  // margin rather than a strict equality.
  assert.ok(Math.abs(R.interestSavings - expected) < 5,
    'Case 7: interestSavings ≈ interestCurrent − interestNew = ' + expected.toFixed(2) +
    ', got ' + R.interestSavings);
  assert.ok(R.interestSavings > 0, 'Case 7: same-term rate drop saves interest');
  // Interest saved exceeds lifetime saved by exactly the upfront closing cost.
  assert.ok(Math.abs((R.interestSavings - R.lifetimeSavings) - 4000) < 1,
    'Case 7: interest saved − lifetime saved = upfront closing $4000, got ' +
    (R.interestSavings - R.lifetimeSavings).toFixed(2));
  console.log('OK Case 7 — Interest savings identity, exceeds lifetime by upfront closing cost');
  passed++;
})();

// Case 8 — Validation: balance ≤ 0 errors; rate > 30 errors; bad years error.
(function case8() {
  const bad1 = calcRefinance({ currentBalance: 0, currentRatePct: 6, currentRemainingYears: 20, newRatePct: 5, newTermYears: 20 });
  const bad2 = calcRefinance({ currentBalance: 200000, currentRatePct: 35, currentRemainingYears: 20, newRatePct: 5, newTermYears: 20 });
  const bad3 = calcRefinance({ currentBalance: 200000, currentRatePct: 6, currentRemainingYears: 20, newRatePct: 5, newTermYears: 50 });
  const bad4 = calcRefinance({ currentBalance: -100, currentRatePct: 6, currentRemainingYears: 20, newRatePct: 5, newTermYears: 20 });
  assert.ok(bad1.error && /balance/i.test(bad1.error), 'Case 8a: balance ≤ 0 errors, got: ' + bad1.error);
  assert.ok(bad2.error && /rate/i.test(bad2.error), 'Case 8b: rate > 30 errors, got: ' + bad2.error);
  assert.ok(bad3.error && /term/i.test(bad3.error), 'Case 8c: term > 40 errors, got: ' + bad3.error);
  assert.ok(bad4.error && /balance/i.test(bad4.error), 'Case 8d: negative balance errors, got: ' + bad4.error);
  console.log('OK Case 8 — Validation: balance ≤ 0, rate cap, term cap, negative balance');
  passed++;
})();

// Case 9 — Extra monthly payment is captured and echoed back (display-only:
// it is NOT folded into the headline lifetime math, by design). Verify it
// round-trips and does not change the core results.
(function case9() {
  const base = {
    currentBalance: 250000,
    currentRatePct: 6.5,
    currentRemainingYears: 25,
    newRatePct: 5,
    newTermYears: 30,
    closingCosts: 4000,
    rollCostsIntoLoan: false,
  };
  const without = calcRefinance(base);
  const withExtra = calcRefinance(Object.assign({}, base, { extraMonthlyPayment: 200 }));
  assert.ok(!withExtra.error, 'Case 9: no error');
  assert.equal(withExtra.extraMonthlyPayment, 200,
    'Case 9: extra payment echoed back, got ' + withExtra.extraMonthlyPayment);
  assert.equal(withExtra.newMonthlyPayment, without.newMonthlyPayment,
    'Case 9: scheduled P&I unchanged (extra is display-only)');
  assert.equal(withExtra.lifetimeSavings, without.lifetimeSavings,
    'Case 9: lifetime math unchanged by display-only extra payment');
  console.log('OK Case 9 — Extra payment round-trips as display-only, core math unchanged');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
