/* FinCalcHub — 401(k) Withdrawal Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { calc401kWithdrawal } = require('../../js/calc/401k-withdrawal-calculator.js');

let passed = 0;

// Case 1 — Standard retirement-age withdrawal (no penalty)
// $50k withdrawal at 22% federal + 5% state at age 65
// Federal: 11000; State: 2500; Penalty: 0; Net: 36500
(function case1() {
  const R = calc401kWithdrawal({
    withdrawalAmount: 50000,
    federalBracketPct: 22,
    stateTaxPct: 5,
    age: 65,
  });
  assert.ok(!R.error, 'Case 1: no error');
  assert.equal(R.federalTax, 11000, 'Case 1: federal tax');
  assert.equal(R.stateTax, 2500, 'Case 1: state tax');
  assert.equal(R.earlyPenalty, 0, 'Case 1: no penalty at retirement age');
  assert.equal(R.net, 36500, 'Case 1: net');
  assert.equal(R.penaltyApplies, false, 'Case 1: penalty does not apply');
  console.log('OK Case 1 — Standard retirement withdrawal');
  passed++;
})();

// Case 2 — Early withdrawal at age 45 (10% penalty applies)
// $50k withdrawal at 22% + 5% + 10% penalty
// Federal: 11000; State: 2500; Penalty: 5000; Net: 31500
(function case2() {
  const R = calc401kWithdrawal({
    withdrawalAmount: 50000,
    federalBracketPct: 22,
    stateTaxPct: 5,
    age: 45,
  });
  assert.equal(R.earlyPenalty, 5000, 'Case 2: 10% penalty applies at 45');
  assert.equal(R.net, 31500, 'Case 2: net after penalty');
  assert.equal(R.penaltyApplies, true, 'Case 2: penalty applies');
  assert.equal(R.effectiveTaxRatePct, 37, 'Case 2: effective rate 37%');
  console.log('OK Case 2 — Early withdrawal with penalty');
  passed++;
})();

// Case 3 — Rule of 55 exemption (age 57, separated from employer)
// $50k at 22% + 5% but NO penalty due to rule of 55
// Net: 36500 (same as case 1)
(function case3() {
  const R = calc401kWithdrawal({
    withdrawalAmount: 50000,
    federalBracketPct: 22,
    stateTaxPct: 5,
    age: 57,
    ruleOf55Exempt: true,
  });
  assert.equal(R.earlyPenalty, 0, 'Case 3: rule of 55 waives penalty');
  assert.equal(R.net, 36500, 'Case 3: net matches no-penalty case');
  assert.equal(R.penaltyApplies, false, 'Case 3: penalty does not apply with exemption');
  console.log('OK Case 3 — Rule of 55 exemption');
  passed++;
})();

// Case 4 — Hardship exemption at any age
(function case4() {
  const R = calc401kWithdrawal({
    withdrawalAmount: 20000,
    federalBracketPct: 12,
    stateTaxPct: 0,
    age: 35,
    hardshipExempt: true,
  });
  assert.equal(R.earlyPenalty, 0, 'Case 4: hardship waives penalty');
  assert.equal(R.federalTax, 2400, 'Case 4: federal tax still due');
  console.log('OK Case 4 — Hardship exemption');
  passed++;
})();

// Case 5 — Texas resident (0% state tax)
(function case5() {
  const R = calc401kWithdrawal({
    withdrawalAmount: 30000,
    federalBracketPct: 22,
    stateTaxPct: 0,
    age: 65,
  });
  assert.equal(R.stateTax, 0, 'Case 5: zero state tax');
  assert.equal(R.federalTax, 6600, 'Case 5: federal tax only');
  assert.equal(R.net, 23400, 'Case 5: net');
  console.log('OK Case 5 — Texas (no state tax)');
  passed++;
})();

// Case 6 — Remaining balance after withdrawal
(function case6() {
  const R = calc401kWithdrawal({
    withdrawalAmount: 20000,
    federalBracketPct: 22,
    stateTaxPct: 5,
    age: 65,
    currentBalance: 100000,
  });
  assert.equal(R.remainingBalance, 80000, 'Case 6: remaining balance');
  console.log('OK Case 6 — Remaining balance');
  passed++;
})();

// Case 7 — Input validation
(function case7() {
  assert.ok(calc401kWithdrawal({ withdrawalAmount: 0 }).error, 'Case 7a: zero amount errors');
  assert.ok(calc401kWithdrawal({ withdrawalAmount: -1 }).error, 'Case 7b: negative amount errors');
  assert.ok(calc401kWithdrawal({ withdrawalAmount: 1000, federalBracketPct: 60 }).error,
    'Case 7c: federal bracket >50% errors');
  assert.ok(calc401kWithdrawal({ withdrawalAmount: 1000, federalBracketPct: 22, stateTaxPct: 25 }).error,
    'Case 7d: state tax >20% errors');
  assert.ok(calc401kWithdrawal({ withdrawalAmount: 1000, federalBracketPct: 22, stateTaxPct: 5, age: 0 }).error,
    'Case 7e: age 0 errors');
  assert.ok(calc401kWithdrawal({ withdrawalAmount: 100000, federalBracketPct: 22, stateTaxPct: 5, age: 65, currentBalance: 50000 }).error,
    'Case 7f: withdrawal > balance errors');
  console.log('OK Case 7 — Input validation');
  passed++;
})();

// Case 8 — Effective tax rate calculation
(function case8() {
  // 32% federal + 8% state + 10% penalty = 50% effective rate
  const R = calc401kWithdrawal({
    withdrawalAmount: 100000,
    federalBracketPct: 32,
    stateTaxPct: 8,
    age: 50,
  });
  assert.equal(R.effectiveTaxRatePct, 50, 'Case 8: effective rate 50%');
  assert.equal(R.net, 50000, 'Case 8: net is half');
  console.log('OK Case 8 — High-tax + penalty effective rate');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
