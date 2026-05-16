/* FinCalcHub — Roth IRA Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { projectRothIRA, eligibleLimit } = require('../../js/calc/roth-ira-calculator.js');

let passed = 0;

// Case 1 — Full eligibility
(function case1() {
  assert.equal(eligibleLimit(50000, 'single', 30), 7000,
    'Case 1: expected 7000, got ' + eligibleLimit(50000, 'single', 30));
  console.log('OK Case 1 — Full eligibility');
  passed++;
})();

// Case 2 — Catch-up at 50+
(function case2() {
  assert.equal(eligibleLimit(50000, 'single', 55), 8000,
    'Case 2: expected 8000, got ' + eligibleLimit(50000, 'single', 55));
  console.log('OK Case 2 — Catch-up bump');
  passed++;
})();

// Case 3 — Mid-phase-out single
(function case3() {
  const v = eligibleLimit(157500, 'single', 30);
  assert.ok(Math.abs(v - 3500) <= 10,
    'Case 3: expected ~3500 (±10), got ' + v);
  console.log('OK Case 3 — Mid-phase-out single');
  passed++;
})();

// Case 4 — Above phase-out
(function case4() {
  assert.equal(eligibleLimit(200000, 'single', 30), 0,
    'Case 4: expected 0, got ' + eligibleLimit(200000, 'single', 30));
  console.log('OK Case 4 — Above phase-out');
  passed++;
})();

// Case 5 — MFJ boundary (start = full)
(function case5() {
  assert.equal(eligibleLimit(236000, 'mfj', 40), 7000,
    'Case 5: expected 7000 at MFJ start, got ' + eligibleLimit(236000, 'mfj', 40));
  console.log('OK Case 5 — MFJ boundary');
  passed++;
})();

// Case 6 — $200 floor
(function case6() {
  assert.equal(eligibleLimit(164900, 'single', 30), 200,
    'Case 6: expected 200 floor, got ' + eligibleLimit(164900, 'single', 30));
  console.log('OK Case 6 — $200 floor');
  passed++;
})();

// Case 7 — Compounding sanity
(function case7() {
  const R = projectRothIRA({
    currentBalance: 10000, annualContrib: 0, expectedReturn: 7,
    currentAge: 30, retireAge: 60, magi: 50000, filingStatus: 'single',
  });
  assert.ok(Math.abs(R.finalBalance - 76123) < 5,
    'Case 7: expected ~76123, got ' + R.finalBalance);
  console.log('OK Case 7 — Compounding sanity');
  passed++;
})();

// Case 8 — Tax-saved positive
(function case8() {
  const R = projectRothIRA({
    currentBalance: 0, annualContrib: 7000, expectedReturn: 7,
    currentAge: 30, retireAge: 60, magi: 50000, filingStatus: 'single',
  });
  assert.ok(R.taxSavedVsTaxable > 0,
    'Case 8: expected taxSavedVsTaxable > 0, got ' + R.taxSavedVsTaxable);
  console.log('OK Case 8 — Tax-saved positive');
  passed++;
})();

console.log(passed + ' of 8 passed');
