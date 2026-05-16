/* FinCalcHub — Student Loan Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { projectUSA, projectUK } = require('../../js/calc/student-loan-calculator.js');

let passed = 0;

// Case 1 — USA standard 10yr
(function case1() {
  const R = projectUSA({ loanBalance: 30000, interestRate: 7, termYears: 10, extraPmt: 0, plan: 'standard' });
  assert.ok(Math.abs(R.monthlyPmt - 348.33) < 1,
    'Case 1: expected |monthlyPmt - 348.33| < 1, got ' + R.monthlyPmt);
  assert.ok(Math.abs(R.totalPaid - 41799) < 50,
    'Case 1: expected |totalPaid - 41799| < 50, got ' + R.totalPaid);
  console.log('OK Case 1 — USA standard 10yr');
  passed++;
})();

// Case 2 — USA zero APR
(function case2() {
  const R = projectUSA({ loanBalance: 30000, interestRate: 0, termYears: 10 });
  assert.ok(Math.abs(R.monthlyPmt - 250) < 0.01,
    'Case 2: expected |monthlyPmt - 250| < 0.01, got ' + R.monthlyPmt);
  assert.ok(R.totalInterest < 0.01,
    'Case 2: expected totalInterest < 0.01, got ' + R.totalInterest);
  console.log('OK Case 2 — USA zero APR');
  passed++;
})();

// Case 3 — USA extra saves interest
(function case3() {
  const R = projectUSA({ loanBalance: 30000, interestRate: 7, termYears: 10, extraPmt: 200 });
  assert.ok(R.savedVsBase > 5000,
    'Case 3: expected savedVsBase > 5000, got ' + R.savedVsBase);
  console.log('OK Case 3 — USA extra saves interest');
  passed++;
})();

// Case 4 — USA PSLF
(function case4() {
  const R = projectUSA({ loanBalance: 100000, interestRate: 7, termYears: 20, plan: 'pslf' });
  assert.equal(R.months, 120,
    'Case 4: expected months === 120, got ' + R.months);
  assert.ok(R.writtenOff > 50000,
    'Case 4: expected writtenOff > 50000, got ' + R.writtenOff);
  console.log('OK Case 4 — USA PSLF');
  passed++;
})();

// Case 5 — UK Plan 2 low salary (no payment)
(function case5() {
  const R = projectUK({ loanBalance: 50000, interestRate: 6, plan: 'plan2', salary: 25000, salaryGrowth: 0 });
  assert.ok(R.totalPaid < 0.01,
    'Case 5: expected totalPaid < 0.01, got ' + R.totalPaid);
  assert.ok(R.writtenOff > 50000,
    'Case 5: expected writtenOff > 50000, got ' + R.writtenOff);
  console.log('OK Case 5 — UK Plan 2 low salary');
  passed++;
})();

// Case 6 — UK Plan 2 high salary (paid off)
(function case6() {
  const R = projectUK({ loanBalance: 30000, interestRate: 6, plan: 'plan2', salary: 80000, salaryGrowth: 2 });
  assert.equal(R.paidOff, true,
    'Case 6: expected paidOff === true, got ' + R.paidOff);
  assert.ok(R.writtenOff < 0.01,
    'Case 6: expected writtenOff < 0.01, got ' + R.writtenOff);
  console.log('OK Case 6 — UK Plan 2 high salary');
  passed++;
})();

// Case 7 — UK Plan 5 (40yr)
(function case7() {
  const R = projectUK({ loanBalance: 60000, interestRate: 6, plan: 'plan5', salary: 30000, salaryGrowth: 2 });
  assert.equal(R.schedule.length, 40,
    'Case 7: expected schedule.length === 40, got ' + R.schedule.length);
  assert.ok(R.writtenOff > 0,
    'Case 7: expected writtenOff > 0, got ' + R.writtenOff);
  console.log('OK Case 7 — UK Plan 5 (40yr)');
  passed++;
})();

// Case 8 — UK Plan 9 postgrad payment
(function case8() {
  const R = projectUK({ loanBalance: 20000, interestRate: 6, plan: 'plan9', salary: 30000, salaryGrowth: 0 });
  assert.equal(R.schedule[0].payment, 540,
    'Case 8: expected schedule[0].payment === 540, got ' + R.schedule[0].payment);
  console.log('OK Case 8 — UK Plan 9 postgrad payment');
  passed++;
})();

// Case 9 — USA error case (payment < interest)
(function case9() {
  const R = projectUSA({ loanBalance: 30000, interestRate: 1000, termYears: 100 });
  assert.equal(R.error, 'Monthly payment too low to cover interest',
    'Case 9: expected error string, got ' + JSON.stringify(R));
  console.log('OK Case 9 — USA error case (payment < interest)');
  passed++;
})();

console.log(passed + ' of 9 passed');
