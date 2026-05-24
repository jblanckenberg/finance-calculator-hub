/* FinCalcHub — UK Pension Calculator module
 *
 * Pure-function UK pension engine. Powers the /pension-calculator-uk/ page
 * and is reusable from any future UK-retirement page.
 *
 * Model:
 *   - Year-by-year salary growth at salaryGrowthPct.
 *   - Each year's contribution = (employeePct + employerPct) × salary_that_year
 *     + personalContributionAnnual (held flat).
 *   - Workplace + SIPP pot compounds at expectedReturnPct, contributions
 *     added at year-end (ordinary annuity).
 *   - Tax relief: UK basic-rate relief grossed up. A £80 net employee/SIPP
 *     contribution becomes £100 in the pension, so relief = 25% of net.
 *     This calculator quotes the "headline" employee + personal contribution
 *     as GROSS (i.e. the salary % is the gross figure that lands in the
 *     pension), and reports tax relief as 25% × net = 20% × gross of those
 *     contributions for display. Higher-rate (40%) and additional-rate (45%)
 *     extra relief is simplified out — see methodology.
 *   - State Pension: triple-lock inflated 2.5%/yr (conservative floor).
 *     Annual = weekly × 52. Only added if includeStatePension AND
 *     claimStatePensionAge ≥ statePensionAge (which we take as 67 per the
 *     2026/27 cohort).
 *   - Combined annual income = 4% safe-withdrawal of pension pot
 *     + state pension annual (inflated to retirement).
 *
 * Assumptions intentionally NOT modelled:
 *   - Higher-rate / additional-rate marginal tax relief above 20% basic
 *   - Annual Allowance taper for high earners (£60k → £10k taper)
 *   - 25% tax-free lump sum mechanics (the pot figure is pre-decumulation)
 *   - Salary sacrifice NI savings
 *   - State Pension qualifying-years gating (assumes 35 qualifying years)
 *   - Deferral uplift (+5.8%/yr after state pension age)
 */
(function () {
  'use strict';

  var STATE_PENSION_AGE_DEFAULT = 67;

  function calcPensionUk(p) {
    var currentAge = +p.currentAge || 0;
    var retirementAge = +p.retirementAge || 0;
    var currentSalary = +p.currentSalary || 0;
    var salaryGrowthPct = (p.salaryGrowthPct === undefined || p.salaryGrowthPct === null || p.salaryGrowthPct === '')
      ? 2.5
      : +p.salaryGrowthPct;
    var currentPensionPot = +p.currentPensionPot || 0;
    var employeePensionPct = (p.employeePensionPct === undefined || p.employeePensionPct === null || p.employeePensionPct === '')
      ? 5
      : +p.employeePensionPct;
    var employerPensionPct = (p.employerPensionPct === undefined || p.employerPensionPct === null || p.employerPensionPct === '')
      ? 3
      : +p.employerPensionPct;
    var personalContributionAnnual = +p.personalContributionAnnual || 0;
    var expectedReturnPct = (p.expectedReturnPct === undefined || p.expectedReturnPct === null || p.expectedReturnPct === '')
      ? 5
      : +p.expectedReturnPct;
    var includeStatePension = p.includeStatePension === undefined ? true : !!p.includeStatePension;
    var claimStatePensionAge = (p.claimStatePensionAge === undefined || p.claimStatePensionAge === null || p.claimStatePensionAge === '')
      ? STATE_PENSION_AGE_DEFAULT
      : +p.claimStatePensionAge;
    var currentStatePensionWeekly = (p.currentStatePensionWeekly === undefined || p.currentStatePensionWeekly === null || p.currentStatePensionWeekly === '')
      ? 230
      : +p.currentStatePensionWeekly;

    if (currentAge < 18 || currentAge > 100) {
      return { error: 'Current age must be 18-100.' };
    }
    if (retirementAge > 100) {
      return { error: 'Retirement age must be 100 or less.' };
    }
    if (retirementAge <= currentAge) {
      return { error: 'Retirement age must be greater than current age.' };
    }
    if (currentSalary <= 0) {
      return { error: 'Current salary must be positive.' };
    }
    if (salaryGrowthPct < -5 || salaryGrowthPct > 15) {
      return { error: 'Salary growth must be between -5% and 15%.' };
    }
    if (currentPensionPot < 0) {
      return { error: 'Current pension pot cannot be negative.' };
    }
    if (employeePensionPct < 0 || employeePensionPct > 30) {
      return { error: 'Employee pension contribution must be 0-30%.' };
    }
    if (employerPensionPct < 0 || employerPensionPct > 30) {
      return { error: 'Employer pension contribution must be 0-30%.' };
    }
    if (personalContributionAnnual < 0) {
      return { error: 'Personal contribution cannot be negative.' };
    }
    if (expectedReturnPct < -5 || expectedReturnPct > 15) {
      return { error: 'Expected return must be between -5% and 15%.' };
    }
    if (claimStatePensionAge < 60 || claimStatePensionAge > 75) {
      return { error: 'State pension claim age must be 60-75.' };
    }
    if (currentStatePensionWeekly < 0 || currentStatePensionWeekly > 300) {
      return { error: 'State pension weekly amount must be 0-300.' };
    }

    var g = salaryGrowthPct / 100;
    var r = expectedReturnPct / 100;
    var yearsOfContributions = retirementAge - currentAge;

    var pot = currentPensionPot;
    var salary = currentSalary;
    var totalEmployerContribution = 0;
    var totalEmployeeContribution = 0;
    var totalPersonalContribution = 0;

    for (var y = 0; y < yearsOfContributions; y++) {
      var employeeContrib = salary * (employeePensionPct / 100);
      var employerContrib = salary * (employerPensionPct / 100);
      var totalYearContrib = employeeContrib + employerContrib + personalContributionAnnual;

      // Grow existing pot first, then add year-end contribution.
      pot = pot * (1 + r) + totalYearContrib;

      totalEmployeeContribution += employeeContrib;
      totalEmployerContribution += employerContrib;
      totalPersonalContribution += personalContributionAnnual;

      salary = salary * (1 + g);
    }

    // Tax relief: 25% of NET on employee + personal contributions
    // (£80 net → £100 gross; relief = £20 = 25% of £80 = 20% of £100).
    // Since employee + personal are quoted as gross here, relief = 20% gross.
    var grossEmployeeAndPersonal = totalEmployeeContribution + totalPersonalContribution;
    var totalTaxRelief = grossEmployeeAndPersonal * 0.20;

    // State pension calculation
    var statePensionAnnual = 0;
    var statePensionAnnualInflated = 0;
    if (includeStatePension && claimStatePensionAge >= STATE_PENSION_AGE_DEFAULT) {
      var statePensionAnnualBase = currentStatePensionWeekly * 52;
      statePensionAnnual = statePensionAnnualBase;
      // Triple-lock inflate at 2.5%/yr conservative floor, to retirement age
      var tripleLockGrowth = Math.pow(1.025, yearsOfContributions);
      statePensionAnnualInflated = statePensionAnnualBase * tripleLockGrowth;
    }

    // Combined annual income: 4% SWR on pot + state pension (inflated)
    var swrIncome = pot * 0.04;
    var combinedAnnualIncome = swrIncome + statePensionAnnualInflated;

    // Effective savings rate (gross headline, before relief)
    var effectiveSavingsRatePct = currentSalary > 0
      ? ((currentSalary * (employeePensionPct / 100) + personalContributionAnnual) / currentSalary) * 100
      : 0;

    return {
      pensionPotAtRetirement: round2(pot),
      statePensionAnnual: round2(statePensionAnnual),
      statePensionAnnualInflated: round2(statePensionAnnualInflated),
      combinedAnnualIncome: round2(combinedAnnualIncome),
      yearsOfContributions: yearsOfContributions,
      totalEmployerContribution: round2(totalEmployerContribution),
      totalEmployeeContribution: round2(totalEmployeeContribution),
      totalPersonalContribution: round2(totalPersonalContribution),
      totalTaxRelief: round2(totalTaxRelief),
      effectiveSavingsRatePct: Math.round(effectiveSavingsRatePct * 100) / 100,
      swrIncome: round2(swrIncome),
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_PENSION_UK = {
      calc: calcPensionUk,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcPensionUk: calcPensionUk,
    };
  }
})();
