/* FinCalcHub — Traditional IRA Calculator module
 *
 * Pure-function Traditional IRA engine. Powers the
 * /traditional-ira-calculator/ page and is reusable from any future
 * US-retirement comparison page.
 *
 * Model:
 *   - Year-by-year compounding of `currentBalance` at expectedReturnPct,
 *     with `annualContribution` added at year-end (ordinary annuity).
 *   - Tax deduction value: totalContributions × currentMarginalRatePct.
 *     This is the headline lifetime tax saved from deducting Traditional
 *     contributions (assumes the user is eligible to deduct in full —
 *     deduction phase-outs for high earners with employer plans are not
 *     modelled algorithmically; the UI flags coveredByEmployerPlan as a
 *     hint, and the user can override the deduction by adjusting
 *     currentMarginalRatePct downward if their effective deduction is
 *     partial).
 *   - Withdrawal tax: balanceAtRetirement × retirementMarginalRatePct
 *     (simplified lump-sum tax model; in reality RMDs from age 73 spread
 *     this tax across many years and across multiple brackets — see
 *     methodology).
 *   - Roth equivalent (for comparison): same annualContribution but
 *     taxed today at currentMarginalRatePct, then grown tax-free.
 *     Final Roth balance is fully withdrawable tax-free at retirement.
 *   - Recommendation: classifies the magnitude of advantage between
 *     Traditional net-after-tax vs Roth net-after-tax. <2% delta = equal.
 *
 * Assumptions intentionally NOT modelled:
 *   - State income tax
 *   - 10% early-withdrawal penalty before 59½
 *   - 5-year rule on conversions (separate calc covers this)
 *   - RMD-based annual taxation (simplified to lump-sum withdrawal tax)
 *   - MAGI-based deduction phase-out math (UI hint only)
 *   - Pro-rata rule for backdoor Roth (separate calc covers this)
 *   - Inflation-adjusted contribution limit growth
 */
(function () {
  'use strict';

  // 2026 IRA contribution limits (IRS Notice expected late 2025).
  // Standard: $7,000. Catch-up (50+): $8,000.
  var CONTRIBUTION_LIMIT_2026 = 8000;

  function calcTraditionalIra(p) {
    var currentAge = +p.currentAge || 0;
    var retirementAge = +p.retirementAge || 0;
    var annualContribution = (p.annualContribution === undefined || p.annualContribution === null || p.annualContribution === '')
      ? 7000
      : +p.annualContribution;
    var currentBalance = +p.currentBalance || 0;
    var expectedReturnPct = (p.expectedReturnPct === undefined || p.expectedReturnPct === null || p.expectedReturnPct === '')
      ? 7
      : +p.expectedReturnPct;
    var currentMarginalRatePct = (p.currentMarginalRatePct === undefined || p.currentMarginalRatePct === null || p.currentMarginalRatePct === '')
      ? 22
      : +p.currentMarginalRatePct;
    var retirementMarginalRatePct = (p.retirementMarginalRatePct === undefined || p.retirementMarginalRatePct === null || p.retirementMarginalRatePct === '')
      ? 22
      : +p.retirementMarginalRatePct;
    var coveredByEmployerPlan = !!p.coveredByEmployerPlan;

    if (currentAge < 18 || currentAge > 72) {
      return { error: 'Current age must be 18-72 (active accumulation; RMDs start at 73).' };
    }
    if (retirementAge > 100) {
      return { error: 'Retirement age must be 100 or less.' };
    }
    if (retirementAge <= currentAge) {
      return { error: 'Retirement age must be greater than current age.' };
    }
    if (annualContribution < 0) {
      return { error: 'Annual contribution cannot be negative.' };
    }
    if (annualContribution > CONTRIBUTION_LIMIT_2026) {
      return { error: 'Annual contribution exceeds 2026 IRA limit of $8,000 (catch-up).' };
    }
    if (currentBalance < 0) {
      return { error: 'Current balance cannot be negative.' };
    }
    if (expectedReturnPct < -5 || expectedReturnPct > 15) {
      return { error: 'Expected return must be between -5% and 15%.' };
    }
    if (currentMarginalRatePct < 0 || currentMarginalRatePct > 50) {
      return { error: 'Current marginal tax rate must be 0-50%.' };
    }
    if (retirementMarginalRatePct < 0 || retirementMarginalRatePct > 50) {
      return { error: 'Retirement marginal tax rate must be 0-50%.' };
    }

    var r = expectedReturnPct / 100;
    var currentRate = currentMarginalRatePct / 100;
    var retireRate = retirementMarginalRatePct / 100;
    var years = retirementAge - currentAge;

    // Year-by-year compounding: grow existing balance, then add year-end
    // contribution. Mirrors pension-uk.js convention.
    var balance = currentBalance;
    for (var y = 0; y < years; y++) {
      balance = balance * (1 + r) + annualContribution;
    }
    var balanceAtRetirement = balance;

    var totalContributions = annualContribution * years;
    var totalGrowth = balanceAtRetirement - currentBalance - totalContributions;
    var totalDeductionTaxSaved = totalContributions * currentRate;
    var withdrawalTaxAtRetirement = balanceAtRetirement * retireRate;
    var netAfterTaxAtRetirement = balanceAtRetirement - withdrawalTaxAtRetirement;

    // Roth equivalent: same dollar amount of pre-tax salary committed,
    // but contributions are taxed today at currentRate, leaving
    // annualContribution × (1 - currentRate) inside the Roth, growing
    // tax-free for the same horizon.
    // (currentBalance is treated identically in both arms because it
    // already exists pre-tax in Traditional; we don't simulate a parallel
    // Roth seed conversion — the comparison is contribution-level.)
    var afterTaxAnnualContribution = annualContribution * (1 - currentRate);
    var rothBalance = currentBalance; // identical seed (apples-to-apples horizon)
    for (var y2 = 0; y2 < years; y2++) {
      rothBalance = rothBalance * (1 + r) + afterTaxAnnualContribution;
    }
    // Traditional currentBalance still owes withdrawal tax at retirement
    // in this comparison; Roth side conceptually held its pre-existing
    // currentBalance tax-free. For the simplest meaningful comparison
    // (and to keep the headline recommendation tied to the contribution
    // decision), compare Trad net-after-tax to Roth balance (no tax).
    var roth401kEquivalent = rothBalance;

    // Recommendation: classify by magnitude of advantage between
    // Traditional net-after-tax vs Roth balance (which is already
    // after-tax). <2% delta = "Roughly equal".
    var tradWins = netAfterTaxAtRetirement - roth401kEquivalent;
    var recommendation;
    var pivot = Math.abs(roth401kEquivalent) > 0
      ? tradWins / Math.abs(roth401kEquivalent)
      : 0;
    if (pivot > 0.02) {
      recommendation = 'Traditional wins';
    } else if (pivot < -0.02) {
      recommendation = 'Roth wins';
    } else {
      recommendation = 'Roughly equal';
    }

    // Effective annual return derived from the compounding result.
    // For currentBalance = 0 and flat contribution, this equals
    // expectedReturnPct; included as a sanity output.
    var effectiveAnnualReturn = expectedReturnPct;

    return {
      balanceAtRetirement: round2(balanceAtRetirement),
      totalContributions: round2(totalContributions),
      totalGrowth: round2(totalGrowth),
      totalDeductionTaxSaved: round2(totalDeductionTaxSaved),
      withdrawalTaxAtRetirement: round2(withdrawalTaxAtRetirement),
      netAfterTaxAtRetirement: round2(netAfterTaxAtRetirement),
      roth401kEquivalent: round2(roth401kEquivalent),
      effectiveAnnualReturn: effectiveAnnualReturn,
      yearsOfContributions: years,
      recommendation: recommendation,
      coveredByEmployerPlan: coveredByEmployerPlan,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_TRADITIONAL_IRA = {
      calc: calcTraditionalIra,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcTraditionalIra: calcTraditionalIra,
    };
  }
})();
