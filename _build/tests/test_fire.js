/* FinCalcHub — FIRE Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { projectFIRE } = require('../../js/calc/fire-calculator.js');

let passed = 0;

// Case 1 — Already FI
(function case1() {
  const R = projectFIRE({
    currentSavings: 2000000, annualSpending: 40000, annualIncome: 100000,
    swr: 4, fireType: 'regular', currentAge: 30,
  });
  assert.equal(R.alreadyFI, true, 'Case 1: alreadyFI should be true');
  assert.equal(R.yearsToFI, 0, 'Case 1: yearsToFI should be 0');
  console.log('OK Case 1 — Already FI');
  passed++;
})();

// Case 2 — Standard 25× target
(function case2() {
  const R = projectFIRE({
    annualSpending: 40000, swr: 4, fireType: 'regular',
    annualIncome: 100000, currentSavings: 0, currentAge: 30,
  });
  assert.equal(R.fiNumber, 1000000, 'Case 2: fiNumber should be 1000000, got ' + R.fiNumber);
  console.log('OK Case 2 — Standard 25× target');
  passed++;
})();

// Case 3 — Lean tier
(function case3() {
  const R = projectFIRE({
    annualSpending: 40000, swr: 4, fireType: 'lean',
    annualIncome: 100000, currentSavings: 0, currentAge: 30,
  });
  assert.equal(R.fiNumber, 700000, 'Case 3: fiNumber should be 700000, got ' + R.fiNumber);
  console.log('OK Case 3 — Lean tier');
  passed++;
})();

// Case 4 — Fat tier
(function case4() {
  const R = projectFIRE({
    annualSpending: 40000, swr: 4, fireType: 'fat',
    annualIncome: 100000, currentSavings: 0, currentAge: 30,
  });
  assert.equal(R.fiNumber, 2000000, 'Case 4: fiNumber should be 2000000, got ' + R.fiNumber);
  console.log('OK Case 4 — Fat tier');
  passed++;
})();

// Case 5 — 3% SWR raises target
(function case5() {
  const R = projectFIRE({
    annualSpending: 40000, swr: 3, fireType: 'regular',
    annualIncome: 100000, currentSavings: 0, currentAge: 30,
  });
  assert.ok(Math.abs(R.fiNumber - 1333333) < 1,
    'Case 5: expected fiNumber ≈ 1333333, got ' + R.fiNumber);
  console.log('OK Case 5 — 3% SWR raises target');
  passed++;
})();

// Case 6 — Negative savings → null + error
(function case6() {
  const R = projectFIRE({
    annualIncome: 30000, annualSpending: 40000, currentSavings: 0,
    swr: 4, fireType: 'regular', currentAge: 30,
  });
  assert.equal(R.yearsToFI, null, 'Case 6: yearsToFI should be null');
  assert.ok(R.error, 'Case 6: error should be truthy');
  console.log('OK Case 6 — Negative savings → null + error');
  passed++;
})();

// Case 7 — Closed-form years sanity
(function case7() {
  const R = projectFIRE({
    currentSavings: 100000, annualIncome: 80000, annualSpending: 40000,
    expectedReturn: 5, swr: 4, fireType: 'regular', currentAge: 30,
  });
  assert.ok(R.yearsToFI >= 12 && R.yearsToFI <= 16,
    'Case 7: expected yearsToFI in [12,16], got ' + R.yearsToFI);
  console.log('OK Case 7 — Closed-form years sanity');
  passed++;
})();

// Case 8 — Coast FIRE math
(function case8() {
  const R = projectFIRE({
    currentAge: 30, annualSpending: 40000, swr: 4, fireType: 'regular',
    expectedReturn: 5, annualIncome: 50000, currentSavings: 0,
  });
  const expected = 1000000 / Math.pow(1.05, 35);
  assert.ok(Math.abs(R.coastNumber - expected) < 1,
    'Case 8: expected coastNumber ≈ ' + expected + ', got ' + R.coastNumber);
  console.log('OK Case 8 — Coast FIRE math');
  passed++;
})();

// Case 9 — Zero return linear
(function case9() {
  const R = projectFIRE({
    currentSavings: 0, annualIncome: 90000, annualSpending: 40000,
    expectedReturn: 0, swr: 4, fireType: 'regular', currentAge: 30,
  });
  assert.ok(Math.abs(R.yearsToFI - 20) < 0.001,
    'Case 9: expected yearsToFI ≈ 20, got ' + R.yearsToFI);
  console.log('OK Case 9 — Zero return linear');
  passed++;
})();

console.log(passed + ' of 9 passed');
