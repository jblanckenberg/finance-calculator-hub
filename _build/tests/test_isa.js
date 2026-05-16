/* FinCalcHub — UK ISA Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { projectISA } = require('../../js/calc/isa-calculator.js');

let passed = 0;

// Case 1 — Standard S&S 20yr 6%
(function case1() {
  const R = projectISA({
    currentBalance: 0, annualContrib: 5000, years: 20,
    expectedReturn: 6, isaType: 'stocks_shares', currentAge: 30,
  });
  assert.ok(Math.abs(R.finalBalance - 195000) < 10000,
    'Case 1: expected ~195000 (±10000, rough check), got ' + R.finalBalance);
  console.log('OK Case 1 — Standard S&S 20yr 6%');
  passed++;
})();

// Case 2 — Annual cap kicks in
(function case2() {
  const R = projectISA({
    annualContrib: 30000, years: 1, expectedReturn: 0,
    isaType: 'stocks_shares', currentBalance: 0, currentAge: 30,
  });
  assert.equal(R.schedule[0].contribution, 20000,
    'Case 2: expected 20000, got ' + R.schedule[0].contribution);
  console.log('OK Case 2 — Annual cap kicks in');
  passed++;
})();

// Case 3 — LISA bonus 25%
(function case3() {
  const R = projectISA({
    isaType: 'lisa', annualContrib: 4000, years: 10,
    expectedReturn: 0, currentBalance: 0, currentAge: 25,
  });
  assert.equal(R.totalBonus, 10000,
    'Case 3: expected 10000, got ' + R.totalBonus);
  console.log('OK Case 3 — LISA bonus 25%');
  passed++;
})();

// Case 4 — LISA cap at £4000
(function case4() {
  const R = projectISA({
    isaType: 'lisa', annualContrib: 10000, years: 1,
    expectedReturn: 0, currentBalance: 0, currentAge: 25,
  });
  assert.equal(R.schedule[0].contribution, 4000,
    'Case 4: expected 4000, got ' + R.schedule[0].contribution);
  console.log('OK Case 4 — LISA cap at £4000');
  passed++;
})();

// Case 5 — LISA opened too late
(function case5() {
  const R = projectISA({
    isaType: 'lisa', annualContrib: 4000, years: 1,
    expectedReturn: 0, currentBalance: 0, currentAge: 45,
  });
  assert.equal(R.lisaInvalidAge, true,
    'Case 5: expected lisaInvalidAge=true, got ' + R.lisaInvalidAge);
  console.log('OK Case 5 — LISA opened too late');
  passed++;
})();

// Case 6 — LISA stops contribs at 50
(function case6() {
  const R = projectISA({
    isaType: 'lisa', annualContrib: 4000, years: 3,
    expectedReturn: 0, currentBalance: 0, currentAge: 49,
  });
  assert.equal(R.schedule[1].contribution, 0,
    'Case 6: expected schedule[1].contribution=0 (age 50), got ' + R.schedule[1].contribution);
  console.log('OK Case 6 — LISA stops contribs at 50');
  passed++;
})();

// Case 7 — vs cash positive when S&S
(function case7() {
  const R = projectISA({
    isaType: 'stocks_shares', expectedReturn: 6, annualContrib: 5000,
    years: 20, currentBalance: 0, currentAge: 30,
  });
  assert.ok(R.vsCashDelta > 0,
    'Case 7: expected vsCashDelta > 0, got ' + R.vsCashDelta);
  console.log('OK Case 7 — vs cash positive when S&S');
  passed++;
})();

// Case 8 — Cash ISA roughly matches benchmark
(function case8() {
  const R = projectISA({
    isaType: 'cash', expectedReturn: 3, annualContrib: 5000,
    years: 20, currentBalance: 0, currentAge: 30,
  });
  assert.ok(Math.abs(R.vsCashDelta) < 1,
    'Case 8: expected |vsCashDelta| < 1, got ' + R.vsCashDelta);
  console.log('OK Case 8 — Cash ISA roughly matches benchmark');
  passed++;
})();

// Case 9 — Zero years
(function case9() {
  const R = projectISA({
    isaType: 'stocks_shares', years: 0, currentBalance: 12345,
    annualContrib: 5000, expectedReturn: 6, currentAge: 30,
  });
  assert.equal(R.finalBalance, 12345,
    'Case 9: expected finalBalance=12345, got ' + R.finalBalance);
  assert.equal(R.schedule.length, 0,
    'Case 9: expected schedule.length=0, got ' + R.schedule.length);
  console.log('OK Case 9 — Zero years');
  passed++;
})();

console.log(passed + ' of 9 passed');
