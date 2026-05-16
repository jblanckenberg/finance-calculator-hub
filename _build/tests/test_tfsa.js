'use strict';
const assert = require('node:assert/strict');
const { projectTFSA, ANNUAL_LIMIT, LIFETIME_LIMIT } = require('../../js/calc/tfsa-calculator.js');

// 1: Standard 20yr max contrib
(function(){
  const R = projectTFSA({currentBalance:0, lifetimeContribSoFar:0, annualContrib:36000, years:20, expectedReturn:7, currentAge:30});
  assert.equal(R.totalContrib, 500000, 'totalContrib should equal R500,000');
  // Cap is hit in year 14, leaving ~6 years of pure compounding on the R500k stack — lands ~R1.25m.
  assert.ok(R.finalBalance > 1200000, 'finalBalance should exceed R1.2m, got ' + R.finalBalance);
  console.log('OK 1');
})();

// 2: Annual cap enforced + excess flag
(function(){
  const R = projectTFSA({annualContrib:50000, years:1, lifetimeContribSoFar:0, currentBalance:0, expectedReturn:0, currentAge:30});
  assert.equal(R.schedule[0].contribution, 36000, 'annual cap should clamp contribution to 36000');
  assert.equal(R.warnExcess, true, 'warnExcess should be true for 50000 input');
  console.log('OK 2');
})();

// 3: Lifetime cap year
(function(){
  const R = projectTFSA({currentBalance:0, lifetimeContribSoFar:0, annualContrib:36000, years:20, expectedReturn:0, currentAge:30});
  assert.equal(R.yearCapHit, 14, 'cap should be hit in year 14, got ' + R.yearCapHit);
  console.log('OK 3');
})();

// 4: Already at lifetime cap
(function(){
  const R = projectTFSA({lifetimeContribSoFar:500000, annualContrib:36000, years:10, currentBalance:0, expectedReturn:0, currentAge:30});
  assert.equal(R.totalContrib, 0, 'no new contributions when already at cap');
  assert.ok(R.schedule.every(s => s.contribution === 0), 'every scheduled contribution should be 0');
  console.log('OK 4');
})();

// 5: Partial last contribution
(function(){
  const R = projectTFSA({lifetimeContribSoFar:480000, annualContrib:36000, years:2, currentBalance:0, expectedReturn:0, currentAge:30});
  assert.equal(R.schedule[0].contribution, 20000, 'first-year contribution should clip to remaining 20000');
  assert.equal(R.schedule[1].contribution, 0, 'second-year contribution should be 0');
  console.log('OK 5');
})();

// 6: Compounding only
(function(){
  const R = projectTFSA({annualContrib:0, currentBalance:100000, expectedReturn:7, years:10, lifetimeContribSoFar:0, currentAge:30});
  assert.ok(Math.abs(R.finalBalance - 196715) < 5, 'finalBalance ~196715, got ' + R.finalBalance);
  console.log('OK 6');
})();

// 7: Zero years
(function(){
  const R = projectTFSA({years:0, currentBalance:12345, lifetimeContribSoFar:0, annualContrib:36000, expectedReturn:7, currentAge:30});
  assert.equal(R.finalBalance, 12345, 'zero years should preserve starting balance');
  assert.equal(R.schedule.length, 0, 'schedule should be empty');
  console.log('OK 7');
})();

// 8: Excess flag (above 36k)
(function(){
  const R = projectTFSA({annualContrib:40000, years:1, lifetimeContribSoFar:0, currentBalance:0, expectedReturn:0, currentAge:30});
  assert.equal(R.warnExcess, true, 'warnExcess should be true for 40000 input');
  console.log('OK 8');
})();

// 9: Below annual + lifetime mid-year
(function(){
  const R = projectTFSA({lifetimeContribSoFar:490000, annualContrib:20000, years:2, currentBalance:0, expectedReturn:0, currentAge:30});
  assert.equal(R.schedule[0].contribution, 10000, 'first-year contribution should clip to remaining 10000');
  assert.equal(R.schedule[1].contribution, 0, 'second-year contribution should be 0');
  console.log('OK 9');
})();

console.log('9 of 9 passed');
