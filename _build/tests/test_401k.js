/* FinCalcHub — 401(k) Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { project401k } = require('../../js/calc/401k-calculator.js');

let passed = 0;

// Case 1 — Zero return baseline
(function case1() {
  const R = project401k({
    salary: 100000, contribPct: 10, matchPct: 0, matchCapPct: 0,
    currentBalance: 0, currentAge: 35, retireAge: 65,
    expectedReturn: 0, salaryGrowth: 0,
  });
  assert.equal(Math.round(R.finalBalance), 300000,
    'Case 1: expected finalBalance == 300000, got ' + R.finalBalance);
  console.log('OK Case 1 — Zero return baseline');
  passed++;
})();

// Case 2 — Full match
(function case2() {
  const R = project401k({
    salary: 100000, contribPct: 6, matchPct: 100, matchCapPct: 6,
    currentBalance: 0, currentAge: 35, retireAge: 65,
    expectedReturn: 0, salaryGrowth: 0,
  });
  assert.equal(Math.round(R.totalEmployer), 180000,
    'Case 2: expected totalEmployer == 180000, got ' + R.totalEmployer);
  console.log('OK Case 2 — Full match');
  passed++;
})();

// Case 3 — Hits IRS limit
(function case3() {
  const R = project401k({
    salary: 400000, contribPct: 10, matchPct: 0, matchCapPct: 0,
    currentBalance: 0, currentAge: 30, retireAge: 31,
    expectedReturn: 0, salaryGrowth: 0,
  });
  assert.equal(R.yearsOverLimit, 1,
    'Case 3: expected yearsOverLimit == 1, got ' + R.yearsOverLimit);
  console.log('OK Case 3 — Hits IRS limit');
  passed++;
})();

// Case 4 — Catch-up raises cap at 50 (raw $40k -> capped at $31k at age 50; age 49 capped at $23.5k)
(function case4() {
  const R = project401k({
    salary: 400000, contribPct: 10, matchPct: 0, matchCapPct: 0,
    currentBalance: 0, currentAge: 49, retireAge: 52,
    expectedReturn: 0, salaryGrowth: 0,
  });
  // y=0 → age 49 → no catch-up, capped at 23500
  assert.equal(R.schedule[0].employee, 23500,
    'Case 4a: expected schedule[0].employee == 23500 (age 49, no catch-up), got ' + R.schedule[0].employee);
  // y=1 → age 50 → catch-up applies, capped at 31000
  assert.equal(R.schedule[1].employee, 31000,
    'Case 4b: expected schedule[1].employee == 31000 (age 50, catch-up), got ' + R.schedule[1].employee);
  console.log('OK Case 4 — Catch-up raises cap at 50');
  passed++;
})();

// Case 5 — Compounding sanity
(function case5() {
  const R = project401k({
    salary: 0, contribPct: 0, matchPct: 0, matchCapPct: 0,
    currentBalance: 10000, currentAge: 35, retireAge: 65,
    expectedReturn: 7, salaryGrowth: 0,
  });
  assert.ok(Math.abs(R.finalBalance - 76123) < 5,
    'Case 5: expected |finalBalance - 76123| < 5, got ' + R.finalBalance);
  console.log('OK Case 5 — Compounding sanity');
  passed++;
})();

// Case 6 — Total additions cap
(function case6() {
  const R = project401k({
    salary: 500000, contribPct: 10, matchPct: 200, matchCapPct: 10,
    currentBalance: 0, currentAge: 30, retireAge: 31,
    expectedReturn: 0, salaryGrowth: 0,
  });
  const sum = R.schedule[0].employee + R.schedule[0].employer;
  assert.ok(sum <= 70000,
    'Case 6: expected employee+employer <= 70000, got ' + sum);
  console.log('OK Case 6 — Total additions cap');
  passed++;
})();

// Case 7 — retireAge <= currentAge
(function case7() {
  const R = project401k({
    salary: 100000, contribPct: 10, matchPct: 0, matchCapPct: 0,
    currentBalance: 12345, currentAge: 65, retireAge: 65,
    expectedReturn: 7, salaryGrowth: 0,
  });
  assert.equal(R.finalBalance, 12345,
    'Case 7: expected finalBalance === 12345, got ' + R.finalBalance);
  assert.equal(R.schedule.length, 0,
    'Case 7: expected schedule.length === 0, got ' + R.schedule.length);
  console.log('OK Case 7 — retireAge <= currentAge');
  passed++;
})();

console.log(passed + ' of 7 passed');
