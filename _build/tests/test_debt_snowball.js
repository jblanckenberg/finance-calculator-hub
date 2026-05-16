/* FinCalcHub — Debt Snowball / Avalanche Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { projectDebts, compareStrategies } = require('../../js/calc/debt-snowball-calculator.js');

let passed = 0;

// Case 1 — Single debt 0% APR
(function case1() {
  const r = projectDebts({
    debts: [{ name:'A', balance:1000, apr:0, minPmt:100 }],
    extraMonthly: 0,
    strategy: 'snowball',
  });
  assert.equal(r.months, 10, 'Case 1: expected 10 months, got ' + r.months);
  console.log('OK Case 1 — Single debt 0% APR');
  passed++;
})();

// Case 2 — Snowball clears smallest balance first
(function case2() {
  const r = projectDebts({
    debts: [
      { name:'D1', balance:500,  apr:0, minPmt:50  },
      { name:'D2', balance:5000, apr:0, minPmt:100 },
    ],
    extraMonthly: 0,
    strategy: 'snowball',
  });
  assert.equal(r.payoffOrder[0].name, 'D1',
    'Case 2: expected D1 first, got ' + (r.payoffOrder[0] && r.payoffOrder[0].name));
  console.log('OK Case 2 — Snowball clears smallest first');
  passed++;
})();

// Case 3 — Avalanche clears highest APR first
// Note: spec inputs used extraMonthly:0, but with zero extra the algorithm reduces to
// pure minimum payments and strategy has no effect on order (Big at 25% APR / $100 min
// barely covers interest, so Small naturally clears first). Adding extraMonthly:500 so
// avalanche has something to direct at the high-APR focus.
(function case3() {
  const r = projectDebts({
    debts: [
      { name:'Big',   balance:5000, apr:25, minPmt:100 },
      { name:'Small', balance:500,  apr:5,  minPmt:50  },
    ],
    extraMonthly: 500,
    strategy: 'avalanche',
  });
  assert.equal(r.payoffOrder[0].name, 'Big',
    'Case 3: expected Big first, got ' + (r.payoffOrder[0] && r.payoffOrder[0].name));
  console.log('OK Case 3 — Avalanche clears highest APR first');
  passed++;
})();

// Case 4 — Empty list
(function case4() {
  const r = projectDebts({ debts: [], extraMonthly: 0 });
  assert.equal(r.months, 0, 'Case 4: expected 0 months, got ' + r.months);
  console.log('OK Case 4 — Empty list');
  passed++;
})();

// Case 5 — Min < interest triggers error
(function case5() {
  const r = projectDebts({
    debts: [{ name:'D', balance:10000, apr:30, minPmt:10 }],
    extraMonthly: 0,
    strategy: 'snowball',
  });
  assert.ok(r.error, 'Case 5: expected truthy error, got ' + r.error);
  console.log('OK Case 5 — Min < interest triggers error');
  passed++;
})();

// Case 6 — Snowball with extra clears in <24 months
(function case6() {
  const r = projectDebts({
    debts: [
      { name:'D1', balance:5000, apr:18, minPmt:150 },
      { name:'D2', balance:2000, apr:22, minPmt:50  },
    ],
    extraMonthly: 300,
    strategy: 'snowball',
  });
  assert.ok(r.months < 24, 'Case 6: expected <24 months, got ' + r.months);
  console.log('OK Case 6 — Snowball with extra clears in <24mo');
  passed++;
})();

// Case 7 — compareStrategies returns non-negative interestDelta
(function case7() {
  const inputs = {
    debts: [
      { name:'D1', balance:5000, apr:18, minPmt:150 },
      { name:'D2', balance:2000, apr:22, minPmt:50  },
    ],
    extraMonthly: 300,
    strategy: 'snowball',
  };
  const cmp = compareStrategies(inputs);
  assert.ok(cmp.interestDelta >= 0,
    'Case 7: expected interestDelta >= 0, got ' + cmp.interestDelta);
  console.log('OK Case 7 — compare interestDelta >= 0');
  passed++;
})();

// Case 8 — Three-debt snowball order by balance (A, C, B)
(function case8() {
  const r = projectDebts({
    debts: [
      { name:'A', balance:1000, apr:10, minPmt:50  },
      { name:'B', balance:5000, apr:10, minPmt:100 },
      { name:'C', balance:3000, apr:10, minPmt:75  },
    ],
    extraMonthly: 200,
    strategy: 'snowball',
  });
  assert.equal(r.payoffOrder[0].name, 'A',
    'Case 8: expected A first, got ' + (r.payoffOrder[0] && r.payoffOrder[0].name));
  assert.equal(r.payoffOrder[1].name, 'C',
    'Case 8: expected C second, got ' + (r.payoffOrder[1] && r.payoffOrder[1].name));
  assert.equal(r.payoffOrder[2].name, 'B',
    'Case 8: expected B third, got ' + (r.payoffOrder[2] && r.payoffOrder[2].name));
  console.log('OK Case 8 — Three-debt snowball order (A, C, B)');
  passed++;
})();

console.log(passed + ' of 8 passed');
