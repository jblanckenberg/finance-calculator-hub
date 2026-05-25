/* FinCalcHub — UK Pension Calculator tests
 * Baseline auto-enrolment, high-earner SIPP layer, late-starter,
 * state-pension toggle, salary-growth compounding, tax-relief math,
 * effective savings rate, validation, deferral age sanity.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcPensionUk } = require('../../js/calc/pension-uk.js');

let passed = 0;

// Case 1 — Baseline: 30yo, £35k salary, retire 67, 5%+3% workplace,
// 5% return, 2.5% salary growth. Future value of a growing ordinary annuity:
//   PMT_1 = £2,800 (8% of £35k), n=37, r=0.05, g=0.025
//   FV = 2800 × ((1.05^37 - 1.025^37) / (0.05 - 0.025)) ≈ £421,400
// State pension £230/wk × 52 × 1.025^37 ≈ £11,960 × 2.508 ≈ £30,000 inflated
// Combined ≈ 4% × £421k + £30k ≈ £16.8k + £30k ≈ £46.8k/yr
(function case1() {
  const R = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!R.error, 'Case 1: no error, got ' + R.error);
  assert.equal(R.yearsOfContributions, 37, 'Case 1: 37 years');
  assert.ok(R.pensionPotAtRetirement > 400000 && R.pensionPotAtRetirement < 450000,
    'Case 1: pot ≈ £421k, got ' + R.pensionPotAtRetirement);
  assert.equal(R.statePensionAnnual, 11960, 'Case 1: state pension base £11,960/yr');
  assert.ok(R.statePensionAnnualInflated > 29000 && R.statePensionAnnualInflated < 31000,
    'Case 1: state pension inflated ≈ £30k, got ' + R.statePensionAnnualInflated);
  assert.ok(R.combinedAnnualIncome > 45000 && R.combinedAnnualIncome < 50000,
    'Case 1: combined income ≈ £46-48k, got ' + R.combinedAnnualIncome);
  console.log('OK Case 1 — Baseline 30yo £35k auto-enrolment → reasonable mid-six-figure pot');
  passed++;
})();

// Case 2 — High earner: 35yo, £100k salary, retire 60 (25 yrs),
// 10%+5% workplace, £10k personal SIPP, 5% return, 2.5% salary growth.
//   PMT_1 = £100k × 15% + £10k = £25k
//   (growing payments + fixed £10k each year)
// Approximate FV: well into 7-figure territory.
(function case2() {
  const R = calcPensionUk({
    currentAge: 35,
    retirementAge: 60,
    currentSalary: 100000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 50000,
    employeePensionPct: 10,
    employerPensionPct: 5,
    personalContributionAnnual: 10000,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!R.error, 'Case 2: no error');
  assert.ok(R.pensionPotAtRetirement >= 1000000,
    'Case 2: high earner pot should be 7-figure, got ' + R.pensionPotAtRetirement);
  console.log('OK Case 2 — High earner 35yo £100k + SIPP → 7-figure pot');
  passed++;
})();

// Case 3 — Late starter: 50yo, £40k, retire 67 (17 yrs), 5%+3%, 5% return.
// Shorter horizon = much smaller pot than Case 1 even though salary is bigger.
(function case3() {
  const late = calcPensionUk({
    currentAge: 50,
    retirementAge: 67,
    currentSalary: 40000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  const baseline = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!late.error, 'Case 3: no error');
  assert.equal(late.yearsOfContributions, 17);
  assert.ok(late.pensionPotAtRetirement < baseline.pensionPotAtRetirement,
    'Case 3: late starter pot < baseline pot, got late=' + late.pensionPotAtRetirement +
    ' baseline=' + baseline.pensionPotAtRetirement);
  console.log('OK Case 3 — Late starter (50yo) has smaller pot than 30yo baseline');
  passed++;
})();

// Case 4 — State pension toggle: verify statePensionAnnual = 0 when off.
(function case4() {
  const off = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: false,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!off.error, 'Case 4: no error');
  assert.equal(off.statePensionAnnual, 0, 'Case 4: state pension annual = 0 when off');
  assert.equal(off.statePensionAnnualInflated, 0, 'Case 4: inflated also = 0 when off');
  // Combined income should equal 4% SWR of pot only
  assert.ok(Math.abs(off.combinedAnnualIncome - off.swrIncome) < 0.5,
    'Case 4: combined income = SWR income only when state pension off');
  console.log('OK Case 4 — includeStatePension=false zeroes state-pension figures');
  passed++;
})();

// Case 5 — Salary growth compounds: 2.5% growth vs 0% growth.
// At 0% growth all contributions are flat; the growing-payments scenario
// builds bigger contributions in later years which compound less, but the
// TOTAL gross contributions are higher, so the pot should be bigger.
(function case5() {
  const grow = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  const flat = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 0,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!grow.error && !flat.error, 'Case 5: no error');
  assert.ok(grow.pensionPotAtRetirement > flat.pensionPotAtRetirement,
    'Case 5: salary growth > flat → bigger pot, got grow=' + grow.pensionPotAtRetirement +
    ' flat=' + flat.pensionPotAtRetirement);
  console.log('OK Case 5 — Salary growth 2.5% → bigger pot than 0% growth');
  passed++;
})();

// Case 6 — Tax relief math: £5k employee contribution → £1k tax relief
// (20% of gross £5k). Use a 1-year horizon and salary that produces exactly
// £5k of employee + personal contribution at year-1.
// Simplest path: currentSalary £100k, employeePct 5% → £5k employee contrib
// over 1 year. Add personal=0. Tax relief = £5k × 20% = £1k.
(function case6() {
  const R = calcPensionUk({
    currentAge: 40,
    retirementAge: 41,
    currentSalary: 100000,
    salaryGrowthPct: 0,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: false,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!R.error, 'Case 6: no error');
  assert.equal(R.totalEmployeeContribution, 5000, 'Case 6: £5k employee contribution');
  assert.equal(R.totalTaxRelief, 1000, 'Case 6: £1k tax relief (20% of £5k gross)');
  console.log('OK Case 6 — Tax relief = 20% of gross employee + personal');
  passed++;
})();

// Case 7 — Auto-enrolment effective rate: 5% employee + 0 personal → 5% effective.
// (effectiveSavingsRatePct measures employee + personal only, employer is "free")
(function case7() {
  const R = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 67,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!R.error, 'Case 7: no error');
  assert.equal(R.effectiveSavingsRatePct, 5,
    'Case 7: 5% employee + 0 personal → 5% effective rate');
  // Sanity: total employer contribution should be > 0 and reasonable
  assert.ok(R.totalEmployerContribution > 0,
    'Case 7: employer match should be > 0');
  console.log('OK Case 7 — Auto-enrolment effective rate excludes employer match');
  passed++;
})();

// Case 8 — Validation: retirementAge ≤ currentAge errors; negative salary errors.
(function case8() {
  const bad1 = calcPensionUk({
    currentAge: 65,
    retirementAge: 65,
    currentSalary: 50000,
    employeePensionPct: 5,
    employerPensionPct: 3,
  });
  const bad2 = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: -1000,
    employeePensionPct: 5,
    employerPensionPct: 3,
  });
  const bad3 = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
  });
  assert.ok(bad1.error && /greater than current age/i.test(bad1.error),
    'Case 8a: retirementAge ≤ currentAge errors');
  assert.ok(bad2.error && /salary/i.test(bad2.error),
    'Case 8b: negative salary errors');
  assert.ok(bad3.error && /salary/i.test(bad3.error),
    'Case 8c: zero salary errors');
  console.log('OK Case 8 — Validation: retirement age, salary');
  passed++;
})();

// Case 9 — State pension claim age 70 vs 67: both should pay state pension
// (no deferral uplift modelled here — claimAge ≥ statePensionAge is what
// matters). Verify the deferral case doesn't error.
(function case9() {
  const claim70 = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 70,
    currentStatePensionWeekly: 230,
  });
  assert.ok(!claim70.error, 'Case 9: no error');
  assert.ok(claim70.statePensionAnnual > 0,
    'Case 9: claim age 70 ≥ SP age 67 → state pension paid');
  // Boundary: claim 65 (below 67) → no state pension here
  const claim65 = calcPensionUk({
    currentAge: 30,
    retirementAge: 67,
    currentSalary: 35000,
    salaryGrowthPct: 2.5,
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 3,
    personalContributionAnnual: 0,
    expectedReturnPct: 5,
    includeStatePension: true,
    claimStatePensionAge: 65,
    currentStatePensionWeekly: 230,
  });
  assert.equal(claim65.statePensionAnnual, 0,
    'Case 9b: claim age 65 < SP age 67 → no state pension');
  console.log('OK Case 9 — Claim age ≥ state pension age gates the payment');
  passed++;
})();

console.log('\n' + passed + ' cases passed.');
