/* FinCalcHub — US State Paycheck shared calc module
 *
 * Powers state-specific paycheck calculators (Texas, California, and any
 * future state) from a single config-driven engine. Each state's tax
 * profile is one entry in STATE_CONFIG.
 *
 * Federal model:
 *   - 2026 IRS brackets, single + married-filing-jointly
 *   - Standard deduction $15,000 single, $30,000 married
 *   - FICA: 6.2% Social Security up to $176,100 wage base; 1.45% Medicare
 *     on all wages; +0.9% additional Medicare above $200k single / $250k MFJ
 *   - Pre-tax 401(k) + HSA reduce federal taxable wages (NOT FICA wages)
 *
 * State model (per STATE_CONFIG entry):
 *   - brackets[]: progressive marginal brackets, applied to taxable wages
 *     after the state's standard deduction (state-specific, default 0)
 *   - sdiPct + sdiCap: state disability insurance (CA only currently)
 *   - additionalRules: free-form notes surfaced in UI
 */
(function () {
  'use strict';

  // 2026 IRS federal brackets. Each tuple = [rate%, upper-bound] where
  // the LAST upper-bound is Infinity (the top bracket has no ceiling).
  var FEDERAL_BRACKETS_2026 = {
    single: [
      [10, 11925], [12, 48475], [22, 103350], [24, 197300],
      [32, 250525], [35, 626350], [37, Infinity],
    ],
    married: [
      [10, 23850], [12, 96950], [22, 206700], [24, 394600],
      [32, 501050], [35, 751600], [37, Infinity],
    ],
  };

  var STANDARD_DEDUCTION_2026 = { single: 15000, married: 30000 };

  // FICA: Social Security taxable up to wage base, Medicare on all wages,
  // additional Medicare 0.9% above threshold (paid by employee only).
  var FICA_2026 = {
    socialSecurityRatePct: 6.2,
    socialSecurityWageBase: 176100,
    medicareRatePct: 1.45,
    additionalMedicareRatePct: 0.9,
    additionalMedicareThreshold: { single: 200000, married: 250000 },
  };

  // State tax profiles. To add a state, drop a new entry here -- nothing
  // else in the engine changes.
  var STATE_CONFIG = {
    TX: {
      name: 'Texas',
      hasIncomeTax: false,
      brackets: [],
      standardDeduction: 0,
      sdiPct: 0,
      sdiCap: 0,
      notes: 'Texas has no state income tax. Federal + FICA only.',
    },
    CA: {
      name: 'California',
      hasIncomeTax: true,
      // 2026 California single brackets (Franchise Tax Board). MFJ brackets
      // are roughly 2x single -- simplification for v1, refine later if needed.
      brackets: [
        [1, 10756], [2, 25499], [4, 40245], [6, 55866], [8, 70606],
        [9.3, 360659], [10.3, 432787], [11.3, 721314], [12.3, Infinity],
      ],
      standardDeduction: 5540, // 2026 single; ~$11,080 married
      sdiPct: 1.1,
      sdiCap: 153164, // 2024 cap, updated annually
      notes: 'California has the most progressive state tax bracket in the US, plus 1.1% SDI on wages up to ~$153k.',
    },
    FL: { name: 'Florida', hasIncomeTax: false, brackets: [], standardDeduction: 0, sdiPct: 0, sdiCap: 0, notes: 'No state income tax.' },
    NV: { name: 'Nevada', hasIncomeTax: false, brackets: [], standardDeduction: 0, sdiPct: 0, sdiCap: 0, notes: 'No state income tax.' },
    WA: { name: 'Washington', hasIncomeTax: false, brackets: [], standardDeduction: 0, sdiPct: 0, sdiCap: 0, notes: 'No broad income tax. 7% on capital gains above $250k.' },
  };

  // Apply progressive marginal brackets to a taxable income. Returns the
  // total tax owed across all brackets the income spans.
  function applyBrackets(taxableIncome, brackets) {
    if (taxableIncome <= 0 || !brackets || brackets.length === 0) return 0;
    var tax = 0;
    var prevCeiling = 0;
    for (var i = 0; i < brackets.length; i++) {
      var rate = brackets[i][0];
      var ceiling = brackets[i][1];
      var bracketTop = Math.min(taxableIncome, ceiling);
      if (bracketTop > prevCeiling) {
        tax += (bracketTop - prevCeiling) * (rate / 100);
      }
      if (taxableIncome <= ceiling) break;
      prevCeiling = ceiling;
    }
    return tax;
  }

  function calcStatePaycheck(p) {
    var grossAnnual = +p.grossAnnual || 0;
    var filingStatus = p.filingStatus === 'married' ? 'married' : 'single';
    var state = (p.state || 'TX').toUpperCase();
    var contribution401kPct = +p.contribution401kPct || 0;
    var contributionHsaAnnual = +p.contributionHsaAnnual || 0;
    var payPeriodsPerYear = p.payPeriodsPerYear ? +p.payPeriodsPerYear : 12;

    if (grossAnnual <= 0) return { error: 'Enter a positive annual gross salary.' };
    if (contribution401kPct < 0 || contribution401kPct > 100) {
      return { error: '401(k) contribution must be 0–100% of salary.' };
    }
    if (contributionHsaAnnual < 0 || contributionHsaAnnual > 10000) {
      return { error: 'HSA contribution must be 0–$10,000 per year.' };
    }
    var stateCfg = STATE_CONFIG[state];
    if (!stateCfg) return { error: 'Unsupported state: ' + state };

    var preTax401k = grossAnnual * (contribution401kPct / 100);
    var preTaxHsa = contributionHsaAnnual;
    var totalPreTax = preTax401k + preTaxHsa;

    // FICA wages = gross MINUS HSA (HSA reduces FICA wages) but NOT 401k
    // (401k is pre-federal-tax but post-FICA -- a common mistake in DIY calcs).
    var ficaWages = Math.max(0, grossAnnual - preTaxHsa);
    var socialSecurity = Math.min(ficaWages, FICA_2026.socialSecurityWageBase) * (FICA_2026.socialSecurityRatePct / 100);
    var medicare = ficaWages * (FICA_2026.medicareRatePct / 100);
    var addlMedicareThreshold = FICA_2026.additionalMedicareThreshold[filingStatus];
    var additionalMedicare = Math.max(0, ficaWages - addlMedicareThreshold) * (FICA_2026.additionalMedicareRatePct / 100);
    var totalFica = socialSecurity + medicare + additionalMedicare;

    // Federal taxable income = gross - pre-tax (401k + HSA) - standard deduction
    var federalTaxableWages = Math.max(0, grossAnnual - totalPreTax);
    var federalTaxableIncome = Math.max(0, federalTaxableWages - STANDARD_DEDUCTION_2026[filingStatus]);
    var federalIncomeTax = applyBrackets(federalTaxableIncome, FEDERAL_BRACKETS_2026[filingStatus]);

    // State taxable income = gross - pre-tax - state standard deduction
    // (state generally doesn't recognise 401k pre-tax for purposes of state
    // withholding for most states; CA specifically conforms to federal pre-tax
    // for 401k. v1 model: subtract pre-tax then apply state std deduction.)
    var stateTax = 0;
    if (stateCfg.hasIncomeTax) {
      var stateTaxableIncome = Math.max(0, federalTaxableWages - stateCfg.standardDeduction);
      stateTax = applyBrackets(stateTaxableIncome, stateCfg.brackets);
    }

    // State disability insurance (CA SDI etc.)
    var stateDisability = stateCfg.sdiPct > 0
      ? Math.min(ficaWages, stateCfg.sdiCap) * (stateCfg.sdiPct / 100)
      : 0;

    var totalTax = federalIncomeTax + totalFica + stateTax + stateDisability;
    var netAnnual = grossAnnual - totalTax - totalPreTax;
    var grossPerPeriod = grossAnnual / payPeriodsPerYear;
    var netPerPeriod = netAnnual / payPeriodsPerYear;
    var effectiveTaxRatePct = (totalTax / grossAnnual) * 100;

    return {
      grossAnnual: Math.round(grossAnnual * 100) / 100,
      grossPerPeriod: Math.round(grossPerPeriod * 100) / 100,
      preTax401k: Math.round(preTax401k * 100) / 100,
      preTaxHsa: Math.round(preTaxHsa * 100) / 100,
      federalIncomeTax: Math.round(federalIncomeTax * 100) / 100,
      socialSecurity: Math.round(socialSecurity * 100) / 100,
      medicare: Math.round(medicare * 100) / 100,
      additionalMedicare: Math.round(additionalMedicare * 100) / 100,
      totalFica: Math.round(totalFica * 100) / 100,
      stateTax: Math.round(stateTax * 100) / 100,
      stateDisability: Math.round(stateDisability * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      netAnnual: Math.round(netAnnual * 100) / 100,
      netPerPeriod: Math.round(netPerPeriod * 100) / 100,
      effectiveTaxRatePct: Math.round(effectiveTaxRatePct * 10) / 10,
      stateName: stateCfg.name,
      stateNotes: stateCfg.notes,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_STATE_PAYCHECK = { calc: calcStatePaycheck, STATE_CONFIG: STATE_CONFIG };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcStatePaycheck: calcStatePaycheck,
      applyBrackets: applyBrackets,
      STATE_CONFIG: STATE_CONFIG,
      FEDERAL_BRACKETS_2026: FEDERAL_BRACKETS_2026,
      FICA_2026: FICA_2026,
    };
  }
})();
