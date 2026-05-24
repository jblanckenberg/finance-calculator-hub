/* FinCalcHub — Hourly to Salary Calculator module
 *
 * Pure-function wage-rate conversion. Powers the
 * /hourly-to-salary-calculator/ page. Distinct from /take-home-pay/
 * (multi-region tax modelling) — this module is purely about wage
 * rate conversion (hourly <-> salary) with overtime, PTO, and a rough
 * take-home preview.
 *
 * Model:
 *   - Annual salary = base × hoursPerWeek × (weeksPerYear - unpaidWeeks)
 *                     + overtime hours × base × 1.5 × workedWeeks
 *   - FLSA convention: overtime above 40hr/wk paid at 1.5× base rate.
 *   - Holiday + vacation days are PAID PTO — they are part of the
 *     contracted weeksPerYear, so they DO NOT reduce annualSalary.
 *     They DO reduce hours actually worked, which raises the
 *     effective hourly rate (annualSalary / hoursActuallyWorked).
 *   - Unpaid weeks (sabbatical, unpaid leave) DO reduce annualSalary
 *     and hours worked symmetrically.
 *   - Take-home estimate: flat 22% combined federal income + FICA
 *     assumption. Intentionally rough — page links to
 *     /take-home-pay/ for precise multi-region tax modelling.
 *
 * Direction:
 *   - "hourly_to_salary" (default): given hourlyRate, derive salary
 *     and breakdowns.
 *   - "salary_to_hourly": given salaryInput, derive the implied base
 *     hourly rate that, at the given hoursPerWeek and worked weeks,
 *     produces that salary. Overtime then layers on top using the
 *     derived base.
 */
(function () {
  'use strict';

  // Rough US combined federal income + FICA assumption for the
  // headline take-home preview. Intentionally a single flat rate —
  // page links to /take-home-pay/ for state-aware precision.
  var DEFAULT_TAKEHOME_TAX_RATE = 0.22;
  var FLSA_OVERTIME_MULTIPLIER = 1.5;

  function calcHourlyToSalary(p) {
    var direction = p.direction === 'salary_to_hourly' ? 'salary_to_hourly' : 'hourly_to_salary';

    var hoursPerWeek = (p.hoursPerWeek === undefined || p.hoursPerWeek === null || p.hoursPerWeek === '')
      ? 40 : +p.hoursPerWeek;
    var weeksPerYear = (p.weeksPerYear === undefined || p.weeksPerYear === null || p.weeksPerYear === '')
      ? 52 : +p.weeksPerYear;
    var unpaidWeeks = (p.unpaidWeeks === undefined || p.unpaidWeeks === null || p.unpaidWeeks === '')
      ? 0 : +p.unpaidWeeks;
    var overtimeHoursPerWeek = (p.overtimeHoursPerWeek === undefined || p.overtimeHoursPerWeek === null || p.overtimeHoursPerWeek === '')
      ? 0 : +p.overtimeHoursPerWeek;
    var holidayPaidDays = (p.holidayPaidDays === undefined || p.holidayPaidDays === null || p.holidayPaidDays === '')
      ? 10 : +p.holidayPaidDays;
    var vacationPaidDays = (p.vacationPaidDays === undefined || p.vacationPaidDays === null || p.vacationPaidDays === '')
      ? 10 : +p.vacationPaidDays;

    if (hoursPerWeek < 1 || hoursPerWeek > 80) {
      return { error: 'Hours per week must be between 1 and 80.' };
    }
    if (weeksPerYear < 1 || weeksPerYear > 52) {
      return { error: 'Weeks per year must be between 1 and 52.' };
    }
    if (unpaidWeeks < 0 || unpaidWeeks > 52) {
      return { error: 'Unpaid weeks must be between 0 and 52.' };
    }
    if (unpaidWeeks > weeksPerYear) {
      return { error: 'Unpaid weeks cannot exceed weeks per year.' };
    }
    if (overtimeHoursPerWeek < 0 || overtimeHoursPerWeek > 40) {
      return { error: 'Overtime hours per week must be between 0 and 40.' };
    }
    if (holidayPaidDays < 0 || holidayPaidDays > 30) {
      return { error: 'Holiday days must be between 0 and 30.' };
    }
    if (vacationPaidDays < 0 || vacationPaidDays > 40) {
      return { error: 'Vacation days must be between 0 and 40.' };
    }

    var hourlyRate;
    var workedWeeks = weeksPerYear - unpaidWeeks;

    if (direction === 'salary_to_hourly') {
      var salaryInput = +p.salaryInput || 0;
      if (salaryInput <= 0) {
        return { error: 'Salary input must be greater than 0 for salary-to-hourly conversion.' };
      }
      // Derive base hourly from the regular-hours portion of the salary.
      // We assume salaryInput represents BASE salary (no overtime
      // implicit in it) so the implied hourly = salary / (hoursPerWeek × workedWeeks).
      hourlyRate = salaryInput / (hoursPerWeek * workedWeeks);
    } else {
      hourlyRate = (p.hourlyRate === undefined || p.hourlyRate === null || p.hourlyRate === '')
        ? 25 : +p.hourlyRate;
      if (hourlyRate <= 0) {
        return { error: 'Hourly rate must be greater than 0.' };
      }
    }

    // Base weekly = hourly × standard hours (no overtime).
    var weeklyEarnings = hourlyRate * hoursPerWeek;

    // Weekly with overtime layered on (only during worked weeks).
    var overtimeWeeklyPay = hourlyRate * overtimeHoursPerWeek * FLSA_OVERTIME_MULTIPLIER;
    var weeklyWithOvertime = weeklyEarnings + overtimeWeeklyPay;

    var biweeklyEarnings = weeklyEarnings * 2;

    // Annual salary: base portion (paid for all weeksPerYear minus unpaid)
    //   + overtime portion (paid only during workedWeeks).
    // PTO/holiday days are inside weeksPerYear — they're paid, so they
    // don't reduce salary. Unpaid weeks DO reduce salary.
    var baseAnnual = hourlyRate * hoursPerWeek * workedWeeks;
    var overtimeAnnual = overtimeWeeklyPay * workedWeeks;
    var annualSalary = baseAnnual + overtimeAnnual;

    var monthlyEarnings = annualSalary / 12;

    // Hours actually worked vs paid. PTO days are paid but not worked.
    var hoursPerDay = hoursPerWeek / 5;
    var ptoHoursPaid = (holidayPaidDays + vacationPaidDays) * hoursPerDay;
    var regularHoursWorked = hoursPerWeek * workedWeeks - ptoHoursPaid;
    if (regularHoursWorked < 0) regularHoursWorked = 0;
    var overtimeHoursWorked = overtimeHoursPerWeek * workedWeeks;
    var totalAnnualHoursWorked = regularHoursWorked + overtimeHoursWorked;
    var totalAnnualHoursPaid = totalAnnualHoursWorked + ptoHoursPaid;

    // Effective hourly rate = annual salary / hours actually worked.
    // Higher than base hourlyRate when PTO is positive (you get paid
    // for time you don't work).
    var effectiveHourlyRate = totalAnnualHoursWorked > 0
      ? annualSalary / totalAnnualHoursWorked
      : hourlyRate;

    var takeHomeEstimateAnnual = annualSalary * (1 - DEFAULT_TAKEHOME_TAX_RATE);
    var takeHomeEstimateMonthly = takeHomeEstimateAnnual / 12;

    return {
      direction: direction,
      hourlyRate: round2(hourlyRate),
      weeklyEarnings: round2(weeklyEarnings),
      weeklyWithOvertime: round2(weeklyWithOvertime),
      biweeklyEarnings: round2(biweeklyEarnings),
      monthlyEarnings: round2(monthlyEarnings),
      annualSalary: round2(annualSalary),
      effectiveHourlyRate: round2(effectiveHourlyRate),
      totalAnnualHoursWorked: round2(totalAnnualHoursWorked),
      totalAnnualHoursPaid: round2(totalAnnualHoursPaid),
      takeHomeEstimateAnnual: round2(takeHomeEstimateAnnual),
      takeHomeEstimateMonthly: round2(takeHomeEstimateMonthly),
      workedWeeks: workedWeeks,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_HOURLY_TO_SALARY = {
      calc: calcHourlyToSalary,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcHourlyToSalary: calcHourlyToSalary,
    };
  }
})();
