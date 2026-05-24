/* FinCalcHub — Dividend Calculator tests
 * DRIP, dividend growth, tax wrappers, frequency equivalence, effective yield.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcDividend } = require('../../js/calc/dividend.js');

let passed = 0;

// Case 1 — Baseline, no DRIP, no growth, taxable
// 100 shares × $1 DPS, quarterly, 1 year, 22% tax
// → annualIncomeYear1 = $100, totalTaxPaid = $22, sharesAtEnd = 100
(function case1() {
  const R = calcDividend({
    shares: 100,
    dividendPerShare: 1,
    frequency: 'quarterly',
    years: 1,
    drip: false,
    dividendGrowthPct: 0,
    expectedSharePrice: 100,
    taxRatePct: 22,
    wrapper: 'taxable',
  });
  assert.ok(!R.error, 'Case 1: no error');
  assert.equal(R.annualIncomeYear1, 100, 'Case 1: annual income $100');
  assert.equal(R.totalTaxPaid, 22, 'Case 1: tax $22');
  assert.equal(R.sharesAtEnd, 100, 'Case 1: no DRIP → shares unchanged');
  assert.equal(R.totalDividendsReceived, 100, 'Case 1: total gross $100');
  console.log('OK Case 1 — Baseline no DRIP no growth taxable');
  passed++;
})();

// Case 2 — DRIP enabled, no growth, taxable wrapper
// 100 shares × $4 DPS, quarterly, 10 yrs, $100/share, 22% tax
// Net DPS = $4 × (1-0.22) = $3.12/yr → roughly 3.12% compounding
// → sharesAtEnd > 100, endingValue > $10,000
(function case2() {
  const R = calcDividend({
    shares: 100,
    dividendPerShare: 4,
    frequency: 'quarterly',
    years: 10,
    drip: true,
    dividendGrowthPct: 0,
    expectedSharePrice: 100,
    taxRatePct: 22,
    wrapper: 'taxable',
  });
  assert.ok(!R.error, 'Case 2: no error');
  assert.ok(R.sharesAtEnd > 100, 'Case 2: DRIP compounds shares > 100, got ' + R.sharesAtEnd);
  assert.ok(R.endingValue > 10000, 'Case 2: ending value > $10,000, got ' + R.endingValue);
  assert.ok(R.totalTaxPaid > 0, 'Case 2: taxable wrapper → tax paid');
  // Sanity: ~3.12% net compounding over 10 years on $10k → ~$13,600
  assert.ok(R.endingValue > 13000 && R.endingValue < 14500,
    'Case 2: ending value ~$13,600, got ' + R.endingValue);
  console.log('OK Case 2 — DRIP no growth taxable');
  passed++;
})();

// Case 3 — Tax wrapper = roth_ira, same setup as case 2
// → totalTaxPaid = $0, sharesAtEnd > case 2 (all dividends reinvested)
(function case3() {
  const taxable = calcDividend({
    shares: 100, dividendPerShare: 4, frequency: 'quarterly',
    years: 10, drip: true, dividendGrowthPct: 0,
    expectedSharePrice: 100, taxRatePct: 22, wrapper: 'taxable',
  });
  const roth = calcDividend({
    shares: 100, dividendPerShare: 4, frequency: 'quarterly',
    years: 10, drip: true, dividendGrowthPct: 0,
    expectedSharePrice: 100, taxRatePct: 22, wrapper: 'roth_ira',
  });
  assert.ok(!roth.error, 'Case 3: no error');
  assert.equal(roth.totalTaxPaid, 0, 'Case 3: Roth IRA → no in-account tax');
  assert.ok(roth.sharesAtEnd > taxable.sharesAtEnd,
    'Case 3: Roth ends with more shares than taxable, got Roth ' + roth.sharesAtEnd + ' vs taxable ' + taxable.sharesAtEnd);
  console.log('OK Case 3 — Roth IRA wrapper drops in-account tax');
  passed++;
})();

// Case 4 — Dividend growth 5%
// 100 shares × $1 DPS, annual, 10 yrs, no DRIP
// Year 10 DPS = $1 × 1.05^9 ≈ $1.5513
// Year 10 income ≈ $155.13 (>50% over $100 Year 1)
(function case4() {
  const R = calcDividend({
    shares: 100,
    dividendPerShare: 1,
    frequency: 'annual',
    years: 10,
    drip: false,
    dividendGrowthPct: 5,
    expectedSharePrice: 100,
    taxRatePct: 0,
    wrapper: 'taxable',
  });
  assert.ok(!R.error, 'Case 4: no error');
  assert.equal(R.annualIncomeYear1, 100, 'Case 4: Y1 income $100');
  // Total = 100 × (1.05^10 - 1) / 0.05 ≈ $1,257.79
  assert.ok(R.totalDividendsReceived > 1250 && R.totalDividendsReceived < 1260,
    'Case 4: 10yr total ~$1,257, got ' + R.totalDividendsReceived);
  console.log('OK Case 4 — Dividend growth 5%');
  passed++;
})();

// Case 5 — Quarterly vs monthly with same annual DPS
// 100 shares × $4 DPS, 1 year, no DRIP, no growth
// Quarterly: 4 × $1 payments. Monthly: 12 × $0.3333 payments.
// Annual gross income identical: $400
(function case5() {
  const q = calcDividend({
    shares: 100, dividendPerShare: 4, frequency: 'quarterly',
    years: 1, drip: false, dividendGrowthPct: 0,
    expectedSharePrice: 100, taxRatePct: 0, wrapper: 'taxable',
  });
  const m = calcDividend({
    shares: 100, dividendPerShare: 4, frequency: 'monthly',
    years: 1, drip: false, dividendGrowthPct: 0,
    expectedSharePrice: 100, taxRatePct: 0, wrapper: 'taxable',
  });
  assert.equal(q.annualIncomeYear1, 400, 'Case 5a: quarterly Y1 $400');
  assert.equal(m.annualIncomeYear1, 400, 'Case 5b: monthly Y1 $400');
  assert.equal(q.annualIncomeYear1, m.annualIncomeYear1, 'Case 5c: frequencies match without DRIP');
  console.log('OK Case 5 — Frequency equivalence (no DRIP)');
  passed++;
})();

// Case 6 — Effective yield calculation
// 100 shares × $1 DPS, $50/share → effective yield 2%
// (annual income $100 ÷ position value $5,000)
(function case6() {
  const R = calcDividend({
    shares: 100,
    dividendPerShare: 1,
    frequency: 'annual',
    years: 1,
    drip: false,
    dividendGrowthPct: 0,
    expectedSharePrice: 50,
    taxRatePct: 0,
    wrapper: 'taxable',
  });
  assert.equal(R.effectiveYieldPct, 2, 'Case 6: effective yield 2%, got ' + R.effectiveYieldPct);
  console.log('OK Case 6 — Effective yield 2%');
  passed++;
})();

// Case 7 — Invalid input: zero shares
(function case7() {
  const R = calcDividend({
    shares: 0, dividendPerShare: 1, frequency: 'quarterly',
    years: 1, drip: false, dividendGrowthPct: 0,
    expectedSharePrice: 100, taxRatePct: 0, wrapper: 'taxable',
  });
  assert.ok(R.error && R.error.length > 0, 'Case 7: zero shares errors');
  console.log('OK Case 7 — Zero shares input validation');
  passed++;
})();

// Case 8 — Invalid input: unknown wrapper
(function case8() {
  const R = calcDividend({
    shares: 100, dividendPerShare: 1, frequency: 'quarterly',
    years: 1, drip: false, dividendGrowthPct: 0,
    expectedSharePrice: 100, taxRatePct: 0, wrapper: 'sep_ira',
  });
  assert.ok(R.error && R.error.length > 0, 'Case 8: unknown wrapper errors');
  console.log('OK Case 8 — Unknown wrapper input validation');
  passed++;
})();

// Case 9 — Large position, DRIP, 30 years (sanity / no explosion)
// 1,000 shares × $4 DPS, quarterly, 30 yrs, 5% growth, Roth IRA
// Should be finite and large but not absurd
(function case9() {
  const R = calcDividend({
    shares: 1000,
    dividendPerShare: 4,
    frequency: 'quarterly',
    years: 30,
    drip: true,
    dividendGrowthPct: 5,
    expectedSharePrice: 100,
    taxRatePct: 0,
    wrapper: 'roth_ira',
  });
  assert.ok(!R.error, 'Case 9: no error');
  assert.ok(Number.isFinite(R.endingValue), 'Case 9: endingValue is finite');
  assert.ok(R.endingValue > 100000, 'Case 9: 30yr DRIP grows position substantially');
  assert.ok(R.endingValue < 100000000, 'Case 9: 30yr DRIP within sane bounds');
  assert.equal(R.totalTaxPaid, 0, 'Case 9: Roth IRA → no tax');
  console.log('OK Case 9 — Large 30yr DRIP compounding sanity');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
