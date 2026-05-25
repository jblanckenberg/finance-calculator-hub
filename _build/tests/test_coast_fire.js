/* FinCalcHub — Coast FIRE Calculator tests */
'use strict';

const assert = require('node:assert/strict');
const { calcCoastFire } = require('../../js/calc/coast-fire-calculator.js');

let passed = 0;

// Case 1 — Textbook coast FIRE at traditional retirement
// $1.5M FIRE number, currently 35, coast to 65, 7% real return
// Years to grow: 30
// Coast FIRE number = 1500000 / (1.07)^30 ≈ 197,037
(function case1() {
  const R = calcCoastFire({
    fireNumber: 1_500_000,
    currentAge: 35,
    coastAge: 65,
    realReturnPct: 7,
    currentPortfolio: 0,
  });
  assert.ok(!R.error, 'Case 1: expected no error, got ' + R.error);
  assert.ok(R.coastFireNumber > 195_000 && R.coastFireNumber < 200_000,
    'Case 1: coastFireNumber ~197k, got ' + R.coastFireNumber);
  assert.equal(R.status, 'accumulating', 'Case 1: status should be accumulating');
  assert.ok(R.shortfallToCoast > 0, 'Case 1: shortfall should be positive');
  console.log('OK Case 1 — Textbook coast FIRE');
  passed++;
})();

// Case 2 — Already coasting
// Portfolio above coast FIRE number -> shortfall zero, status 'coasting'
(function case2() {
  const R = calcCoastFire({
    fireNumber: 1_500_000,
    currentAge: 35,
    coastAge: 65,
    realReturnPct: 7,
    currentPortfolio: 300_000,
  });
  assert.equal(R.shortfallToCoast, 0, 'Case 2: shortfall should be zero');
  assert.equal(R.status, 'coasting', 'Case 2: status should be coasting');
  assert.ok(R.yearsToFireIfCoasting !== null && R.yearsToFireIfCoasting < 30,
    'Case 2: yearsToFireIfCoasting should be finite + less than 30');
  console.log('OK Case 2 — Already coasting');
  passed++;
})();

// Case 3 — At or just above the coast threshold
// Coast FIRE number is ~197,037; portfolio = 200,000 -> status coasting, shortfall 0
(function case3() {
  const R = calcCoastFire({
    fireNumber: 1_500_000,
    currentAge: 35,
    coastAge: 65,
    realReturnPct: 7,
    currentPortfolio: 200_000,
  });
  assert.equal(R.shortfallToCoast, 0, 'Case 3: shortfall should be zero above threshold');
  assert.equal(R.status, 'coasting', 'Case 3: status should be coasting above threshold');
  console.log('OK Case 3 — Above threshold');
  passed++;
})();

// Case 4 — Earlier coast age tightens the requirement
// Same inputs but coast at 50 instead of 65 -> much higher coast FIRE number
(function case4() {
  const r65 = calcCoastFire({ fireNumber: 1_500_000, currentAge: 35, coastAge: 65, realReturnPct: 7 });
  const r50 = calcCoastFire({ fireNumber: 1_500_000, currentAge: 35, coastAge: 50, realReturnPct: 7 });
  assert.ok(r50.coastFireNumber > r65.coastFireNumber,
    'Case 4: earlier coast should require more capital today');
  // 15-year horizon at 7% gives ~544k coast number
  assert.ok(r50.coastFireNumber > 500_000 && r50.coastFireNumber < 600_000,
    'Case 4: 15yr coast ~544k, got ' + r50.coastFireNumber);
  console.log('OK Case 4 — Earlier coast age');
  passed++;
})();

// Case 5 — Zero return: coast FIRE equals FIRE number (no compounding)
(function case5() {
  const R = calcCoastFire({
    fireNumber: 1_000_000,
    currentAge: 30,
    coastAge: 60,
    realReturnPct: 0,
    currentPortfolio: 0,
  });
  assert.equal(R.coastFireNumber, 1_000_000, 'Case 5: zero return -> coast == FIRE');
  console.log('OK Case 5 — Zero return');
  passed++;
})();

// Case 6 — Schedule projects start -> end via the assumed coast rate
(function case6() {
  const R = calcCoastFire({
    fireNumber: 1_500_000,
    currentAge: 35,
    coastAge: 65,
    realReturnPct: 7,
    currentPortfolio: 0,
  });
  assert.ok(R.schedule.length === 31, 'Case 6: schedule should have 31 entries (years 0..30)');
  // Year-30 value should be ~fireNumber when basis = coastFireNumber
  const final = R.schedule[30].value;
  assert.ok(final > 1_400_000 && final < 1_600_000,
    'Case 6: schedule year-30 should approach FIRE number, got ' + final);
  console.log('OK Case 6 — Schedule projection');
  passed++;
})();

// Case 7 — Invalid inputs return error string, not NaN
(function case7() {
  assert.ok(calcCoastFire({ fireNumber: -1 }).error, 'Case 7a: negative FIRE returns error');
  assert.ok(calcCoastFire({ fireNumber: 1_000_000, currentAge: 70, coastAge: 65 }).error,
    'Case 7b: coast age <= current age returns error');
  assert.ok(calcCoastFire({ fireNumber: 1_000_000, currentAge: 35, coastAge: 65, realReturnPct: -1 }).error,
    'Case 7c: negative return returns error');
  console.log('OK Case 7 — Input validation');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
