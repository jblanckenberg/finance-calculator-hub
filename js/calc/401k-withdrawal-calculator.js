/* FinCalcHub — 401(k) Withdrawal Calculator
 *
 * Computes the NET amount you'll receive from a 401(k) withdrawal after
 * federal income tax (using marginal bracket), state tax, and the 10%
 * early-withdrawal penalty when applicable.
 *
 * The same function powers both /401k-withdrawal-calculator/ (net-focused
 * UI) and /401k-tax-calculator/ (tax-focused UI). They differ only in
 * which numbers the page emphasises.
 *
 * Early-withdrawal penalty rules (IRC §72(t)):
 *   - Default: 10% additional federal penalty if age < 59.5
 *   - Rule of 55 exemption: penalty waived if you separated from employer
 *     in the calendar year you turned 55 or later (50 for public safety)
 *   - Hardship / disability / SEPP (§72(t)(2)) — flagged as exempt by
 *     the caller via `hardshipExempt: true`
 *
 * Federal tax uses a simplified marginal-rate model. For users wanting
 * full bracket breakdown, the page links to take-home-pay calculator
 * which does the full schedule.
 */
(function () {
  'use strict';

  var EARLY_WITHDRAWAL_PENALTY_PCT = 10;
  var RULE_OF_55_AGE = 55;
  var EARLY_WITHDRAWAL_AGE = 59.5;

  function calc401kWithdrawal(p) {
    var withdrawalAmount   = +p.withdrawalAmount || 0;
    var federalBracketPct  = +p.federalBracketPct || 0;
    var stateTaxPct        = +p.stateTaxPct || 0;
    var age                = +p.age || 0;
    var ruleOf55Exempt     = !!p.ruleOf55Exempt;
    var hardshipExempt     = !!p.hardshipExempt;
    var currentBalance     = +p.currentBalance || 0;

    if (withdrawalAmount <= 0) {
      return { error: 'Enter a positive withdrawal amount.' };
    }
    if (federalBracketPct < 0 || federalBracketPct > 50) {
      return { error: 'Federal bracket must be between 0% and 50%.' };
    }
    if (stateTaxPct < 0 || stateTaxPct > 20) {
      return { error: 'State tax must be between 0% and 20%.' };
    }
    if (age <= 0 || age > 120) {
      return { error: 'Enter a valid age.' };
    }
    if (currentBalance > 0 && withdrawalAmount > currentBalance) {
      return { error: 'Withdrawal exceeds account balance.' };
    }

    // Early-withdrawal penalty applies if you're under 59.5 AND not exempt.
    var penaltyApplies = age < EARLY_WITHDRAWAL_AGE && !ruleOf55Exempt && !hardshipExempt;
    // Rule of 55 only kicks in at age 55+ and requires separation from the
    // sponsoring employer in the year you turned 55 or later. If the caller
    // claims the exemption but the age doesn't qualify, treat as ineligible.
    if (ruleOf55Exempt && age < RULE_OF_55_AGE) {
      penaltyApplies = age < EARLY_WITHDRAWAL_AGE;
    }

    var federalTax = withdrawalAmount * (federalBracketPct / 100);
    var stateTax = withdrawalAmount * (stateTaxPct / 100);
    var earlyPenalty = penaltyApplies ? withdrawalAmount * (EARLY_WITHDRAWAL_PENALTY_PCT / 100) : 0;
    var totalTax = federalTax + stateTax + earlyPenalty;
    var net = withdrawalAmount - totalTax;
    var effectiveTaxRatePct = (totalTax / withdrawalAmount) * 100;

    return {
      gross: withdrawalAmount,
      federalTax: Math.round(federalTax * 100) / 100,
      stateTax: Math.round(stateTax * 100) / 100,
      earlyPenalty: Math.round(earlyPenalty * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      net: Math.round(net * 100) / 100,
      effectiveTaxRatePct: Math.round(effectiveTaxRatePct * 10) / 10,
      penaltyApplies: penaltyApplies,
      remainingBalance: currentBalance > 0 ? Math.round((currentBalance - withdrawalAmount) * 100) / 100 : null,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_401K_WITHDRAWAL = { calc: calc401kWithdrawal };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calc401kWithdrawal: calc401kWithdrawal,
      EARLY_WITHDRAWAL_PENALTY_PCT: EARLY_WITHDRAWAL_PENALTY_PCT,
      EARLY_WITHDRAWAL_AGE: EARLY_WITHDRAWAL_AGE,
      RULE_OF_55_AGE: RULE_OF_55_AGE,
    };
  }
})();
