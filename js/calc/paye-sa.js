/* FinCalcHub — South African PAYE calculator module
 *
 * Pure-function PAYE engine for the 2026/27 SARS tax year. Powers the
 * dedicated /paye-calculator/ page (monthly-first PAYE focus) and is
 * reusable from any future SA payroll page.
 *
 * Model:
 *   - SARS 2026/27 progressive brackets (18% to 45% across seven bands)
 *   - Retirement Annuity (RA) deduction capped at min(27.5% of gross, R350,000)
 *   - Primary rebate R17,235 (under 65), secondary +R9,444 (65-74),
 *     tertiary +R3,145 (75+)  [SARS 2026/27 published]
 *   - Medical scheme fees tax credit: R376 main + R376 1st dependant +
 *     R254 each additional, per month, annualised x12
 *   - UIF 1% of monthly remuneration, capped at R177.12/month
 */
(function () {
  'use strict';

  // SARS 2026/27 progressive brackets — [rate%, upper-bound]; last is Infinity.
  var SARS_BRACKETS_2026_27 = [
    [18, 245100],
    [26, 370500],
    [31, 512800],
    [36, 673000],
    [39, 857900],
    [41, 1878600],
    [45, Infinity],
  ];

  var REBATES_2026_27 = {
    primary: 17235,         // under 65
    secondary: 9444,        // additional 65 - 74
    tertiary: 3145,         // additional 75+
  };

  var MED_CREDIT_2026_27 = {
    main: 376,              // per month
    firstDependant: 376,    // per month
    additional: 254,        // per month per extra dependant beyond the first
  };

  var UIF = {
    ratePct: 1,             // employee contribution
    monthlyCap: 177.12,     // R177.12/month cap, R2,125.44/yr cap
  };

  var RA = {
    deductionRatePct: 27.5, // cap as % of remuneration
    annualCap: 350000,      // hard rand cap
  };

  // Apply SARS progressive brackets to a taxable income.
  function applyBrackets(taxableIncome) {
    if (taxableIncome <= 0) return 0;
    var tax = 0;
    var prevCeiling = 0;
    for (var i = 0; i < SARS_BRACKETS_2026_27.length; i++) {
      var rate = SARS_BRACKETS_2026_27[i][0];
      var ceiling = SARS_BRACKETS_2026_27[i][1];
      var bracketTop = Math.min(taxableIncome, ceiling);
      if (bracketTop > prevCeiling) {
        tax += (bracketTop - prevCeiling) * (rate / 100);
      }
      if (taxableIncome <= ceiling) break;
      prevCeiling = ceiling;
    }
    return tax;
  }

  function ageRebate(ageBand) {
    var r = REBATES_2026_27.primary;
    if (ageBand >= 2) r += REBATES_2026_27.secondary;
    if (ageBand >= 3) r += REBATES_2026_27.tertiary;
    return r;
  }

  function medicalCreditAnnual(members) {
    if (members <= 0) return 0;
    var monthly = MED_CREDIT_2026_27.main;
    if (members >= 2) monthly += MED_CREDIT_2026_27.firstDependant;
    if (members > 2) monthly += MED_CREDIT_2026_27.additional * (members - 2);
    return monthly * 12;
  }

  function calcPayeSa(p) {
    var grossInput = +p.grossSalary || 0;
    var inputFrequency = p.inputFrequency === 'monthly' ? 'monthly' : 'annual';
    var ageBand = +p.ageBand || 1;                  // 1 = under 65, 2 = 65-74, 3 = 75+
    var medicalMembers = +p.medicalMembers || 0;    // total members incl. self
    var raMonthly = +p.raContributionMonthly || 0;

    if (grossInput <= 0) return { error: 'Enter a positive salary in Rand.' };
    if (ageBand < 1 || ageBand > 3) return { error: 'Age band must be 1, 2, or 3.' };
    if (medicalMembers < 0 || medicalMembers > 20) {
      return { error: 'Medical scheme members must be 0-20.' };
    }
    if (raMonthly < 0) return { error: 'RA contribution cannot be negative.' };

    // Normalise to annual.
    var grossAnnual = inputFrequency === 'monthly' ? grossInput * 12 : grossInput;
    var raAnnual = raMonthly * 12;

    // RA deduction: capped at lesser of 27.5% of gross or R350,000.
    var raDeductionCap = Math.min(grossAnnual * (RA.deductionRatePct / 100), RA.annualCap);
    var raDeduction = Math.min(raAnnual, raDeductionCap);
    var raExcess = Math.max(0, raAnnual - raDeduction);  // rolls forward, no tax benefit this year

    // Taxable income.
    var taxableIncome = Math.max(0, grossAnnual - raDeduction);
    var grossTax = applyBrackets(taxableIncome);

    // Rebates reduce gross tax directly (not taxable income).
    var rebate = ageRebate(ageBand);
    var medicalCredit = medicalCreditAnnual(medicalMembers);

    var payeAnnual = Math.max(0, grossTax - rebate - medicalCredit);
    var payeMonthly = payeAnnual / 12;

    // UIF: 1% of monthly remuneration, capped at R177.12/month.
    var uifMonthly = Math.min(grossAnnual / 12 * (UIF.ratePct / 100), UIF.monthlyCap);
    var uifAnnual = uifMonthly * 12;

    // Net take-home (after PAYE + UIF + RA cash outflow).
    var netAnnual = grossAnnual - payeAnnual - uifAnnual - raAnnual;
    var netMonthly = netAnnual / 12;
    var effectiveTaxRatePct = grossAnnual > 0 ? ((payeAnnual + uifAnnual) / grossAnnual) * 100 : 0;
    var marginalRatePct = marginalBracketRate(taxableIncome);

    return {
      grossAnnual: round2(grossAnnual),
      grossMonthly: round2(grossAnnual / 12),
      raDeduction: round2(raDeduction),
      raExcess: round2(raExcess),
      taxableIncome: round2(taxableIncome),
      grossTax: round2(grossTax),
      rebate: round2(rebate),
      medicalCredit: round2(medicalCredit),
      payeAnnual: round2(payeAnnual),
      payeMonthly: round2(payeMonthly),
      uifAnnual: round2(uifAnnual),
      uifMonthly: round2(uifMonthly),
      netAnnual: round2(netAnnual),
      netMonthly: round2(netMonthly),
      effectiveTaxRatePct: Math.round(effectiveTaxRatePct * 10) / 10,
      marginalRatePct: marginalRatePct,
    };
  }

  function marginalBracketRate(taxableIncome) {
    if (taxableIncome <= 0) return 0;
    for (var i = 0; i < SARS_BRACKETS_2026_27.length; i++) {
      if (taxableIncome <= SARS_BRACKETS_2026_27[i][1]) {
        return SARS_BRACKETS_2026_27[i][0];
      }
    }
    return SARS_BRACKETS_2026_27[SARS_BRACKETS_2026_27.length - 1][0];
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_PAYE_SA = {
      calc: calcPayeSa,
      SARS_BRACKETS_2026_27: SARS_BRACKETS_2026_27,
      REBATES_2026_27: REBATES_2026_27,
      MED_CREDIT_2026_27: MED_CREDIT_2026_27,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcPayeSa: calcPayeSa,
      applyBrackets: applyBrackets,
      ageRebate: ageRebate,
      medicalCreditAnnual: medicalCreditAnnual,
      SARS_BRACKETS_2026_27: SARS_BRACKETS_2026_27,
      REBATES_2026_27: REBATES_2026_27,
      MED_CREDIT_2026_27: MED_CREDIT_2026_27,
      UIF: UIF,
      RA: RA,
    };
  }
})();
