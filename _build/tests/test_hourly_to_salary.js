/* FinCalcHub — Hourly to Salary Calculator tests
 * Baseline conversion, PTO doesn't reduce salary, unpaid weeks
 * reduce salary, overtime adds, reverse direction round-trip,
 * effective hourly rate accounting for PTO, take-home estimate,
 * validation, high-overtime sanity.
 */
'use strict';

const assert = require('node:assert/strict');
const { calcHourlyToSalary } = require('../../js/calc/hourly-to-salary.js');

let passed = 0;

// Case 1 — Baseline: $25/hr × 40hr × 52wk = $52,000 annual.
// Weekly $1,000; biweekly $2,000; monthly $4,333.33.
(function case1() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 0,
    holidayPaidDays: 0,
    vacationPaidDays: 0,
  });
  assert.ok(!R.error, 'Case 1: no error, got ' + R.error);
  assert.equal(R.annualSalary, 52000, 'Case 1: $52k annual');
  assert.equal(R.weeklyEarnings, 1000, 'Case 1: $1k weekly');
  assert.equal(R.biweeklyEarnings, 2000, 'Case 1: $2k biweekly');
  assert.ok(Math.abs(R.monthlyEarnings - 4333.33) < 0.01,
    'Case 1: monthly ≈ $4,333.33, got ' + R.monthlyEarnings);
  console.log('OK Case 1 — Baseline $25/hr × 40hr × 52wk → $52k annual');
  passed++;
})();

// Case 2 — PTO doesn't reduce salary: same baseline + 10 holiday +
// 10 vacation. annualSalary unchanged (PTO is paid time off, part
// of the contracted 52 weeks).
(function case2() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 0,
    holidayPaidDays: 10,
    vacationPaidDays: 10,
  });
  assert.ok(!R.error, 'Case 2: no error');
  assert.equal(R.annualSalary, 52000,
    'Case 2: PTO is paid → annual salary unchanged at $52k, got ' + R.annualSalary);
  // But hours-worked should be lower (20 days × 8hr = 160 hrs less worked).
  assert.equal(R.totalAnnualHoursWorked, 40 * 52 - 20 * 8,
    'Case 2: hours worked = 2080 - 160 = 1920');
  console.log('OK Case 2 — PTO is paid → salary unchanged, hours-worked drops');
  passed++;
})();

// Case 3 — Unpaid weeks reduce salary: $25/hr × 40hr × (52-2) = $50,000.
(function case3() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 2,
    overtimeHoursPerWeek: 0,
    holidayPaidDays: 0,
    vacationPaidDays: 0,
  });
  assert.ok(!R.error, 'Case 3: no error');
  assert.equal(R.annualSalary, 50000,
    'Case 3: 2 unpaid weeks → $50k annual, got ' + R.annualSalary);
  assert.equal(R.workedWeeks, 50, 'Case 3: 50 worked weeks');
  console.log('OK Case 3 — Unpaid weeks DO reduce salary');
  passed++;
})();

// Case 4 — Overtime adds at 1.5×: $25 base + 5 OT hrs × 1.5 × 52 weeks
// = $52,000 + (25 × 5 × 1.5 × 52) = $52,000 + $9,750 = $61,750.
(function case4() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 5,
    holidayPaidDays: 0,
    vacationPaidDays: 0,
  });
  assert.ok(!R.error, 'Case 4: no error');
  assert.equal(R.annualSalary, 61750,
    'Case 4: $52k + $9.75k OT = $61,750, got ' + R.annualSalary);
  assert.equal(R.weeklyWithOvertime, 1000 + 25 * 5 * 1.5,
    'Case 4: weekly with OT = $1,187.50');
  console.log('OK Case 4 — Overtime adds at FLSA 1.5× rate');
  passed++;
})();

// Case 5 — Reverse direction round-trip: salary $52k / (40 × 52) = $25/hr.
// Must match Case 1's input.
(function case5() {
  const R = calcHourlyToSalary({
    direction: 'salary_to_hourly',
    salaryInput: 52000,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 0,
    holidayPaidDays: 0,
    vacationPaidDays: 0,
  });
  assert.ok(!R.error, 'Case 5: no error');
  assert.equal(R.hourlyRate, 25,
    'Case 5: reverse direction → $25/hr, got ' + R.hourlyRate);
  assert.equal(R.annualSalary, 52000,
    'Case 5: round-trip → $52k annual');
  assert.equal(R.direction, 'salary_to_hourly');
  console.log('OK Case 5 — Reverse direction: $52k → $25/hr (round-trip)');
  passed++;
})();

// Case 6 — Effective hourly rate accounting for PTO.
// $52k / (40 × 52 - 20 days × 8 hr/day) = $52k / 1920 ≈ $27.08/hr.
// Effective > base $25/hr because you're paid for time you don't work.
(function case6() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 0,
    holidayPaidDays: 10,
    vacationPaidDays: 10,
  });
  assert.ok(!R.error, 'Case 6: no error');
  assert.ok(R.effectiveHourlyRate > 25,
    'Case 6: effective rate > base $25 due to PTO, got ' + R.effectiveHourlyRate);
  const expectedEff = 52000 / 1920;
  assert.ok(Math.abs(R.effectiveHourlyRate - expectedEff) < 0.01,
    'Case 6: effective rate ≈ $27.08, got ' + R.effectiveHourlyRate);
  console.log('OK Case 6 — Effective rate $' + R.effectiveHourlyRate + '/hr > base $25 (PTO factored)');
  passed++;
})();

// Case 7 — Take-home estimate: $52k × (1 - 0.22) = $40,560 annual,
// $3,380 monthly. Flat 22% combined federal income + FICA assumption.
(function case7() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 0,
    holidayPaidDays: 0,
    vacationPaidDays: 0,
  });
  assert.ok(!R.error, 'Case 7: no error');
  assert.equal(R.takeHomeEstimateAnnual, 40560,
    'Case 7: $52k × 0.78 = $40,560, got ' + R.takeHomeEstimateAnnual);
  assert.equal(R.takeHomeEstimateMonthly, round2(40560 / 12),
    'Case 7: $3,380 monthly, got ' + R.takeHomeEstimateMonthly);
  console.log('OK Case 7 — Take-home: $52k × (1 - 0.22) ≈ $40,560');
  passed++;
})();

// Case 8 — Validation: hourlyRate ≤ 0, hoursPerWeek > 80,
// salary_to_hourly with salaryInput ≤ 0.
(function case8() {
  const bad1 = calcHourlyToSalary({ hourlyRate: 0, hoursPerWeek: 40, weeksPerYear: 52 });
  const bad2 = calcHourlyToSalary({ hourlyRate: 25, hoursPerWeek: 90, weeksPerYear: 52 });
  const bad3 = calcHourlyToSalary({
    direction: 'salary_to_hourly',
    salaryInput: 0,
    hoursPerWeek: 40,
    weeksPerYear: 52,
  });
  const bad4 = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 60,
  });
  assert.ok(bad1.error && /hourly rate.*greater than 0/i.test(bad1.error),
    'Case 8a: hourlyRate ≤ 0 errors, got: ' + bad1.error);
  assert.ok(bad2.error && /hours per week.*1.*80/i.test(bad2.error),
    'Case 8b: hoursPerWeek > 80 errors, got: ' + bad2.error);
  assert.ok(bad3.error && /salary input.*greater than 0/i.test(bad3.error),
    'Case 8c: salary_to_hourly with 0 salary errors, got: ' + bad3.error);
  assert.ok(bad4.error && /unpaid weeks/i.test(bad4.error),
    'Case 8d: unpaidWeeks > 52 errors, got: ' + bad4.error);
  console.log('OK Case 8 — Validation: hourlyRate, hoursPerWeek, salaryInput, unpaidWeeks');
  passed++;
})();

// Case 9 — High overtime sanity: 40 OT hours/week.
// Base $52k + (25 × 40 × 1.5 × 52) = $52k + $78,000 = $130,000.
(function case9() {
  const R = calcHourlyToSalary({
    hourlyRate: 25,
    hoursPerWeek: 40,
    weeksPerYear: 52,
    unpaidWeeks: 0,
    overtimeHoursPerWeek: 40,
    holidayPaidDays: 0,
    vacationPaidDays: 0,
  });
  assert.ok(!R.error, 'Case 9: no error');
  assert.equal(R.annualSalary, 130000,
    'Case 9: $52k + $78k OT = $130k, got ' + R.annualSalary);
  assert.equal(R.totalAnnualHoursWorked, (40 + 40) * 52,
    'Case 9: total hours worked = 4,160 (80 hrs × 52 wk)');
  console.log('OK Case 9 — High OT (40hr/wk): $130k annual without overflow');
  passed++;
})();

function round2(v) { return Math.round(v * 100) / 100; }

console.log('\n' + passed + ' cases passed.');
