/* FinCalcHub — Simple Interest Calculator module
 *
 * Pure-function simple-interest engine. Powers the /simple-interest-calculator/
 * page. Distinct from /compound-interest/: simple interest = I = P × r × t.
 * The interest does NOT compound — each period earns the same dollar amount.
 *
 * Model:
 *   - interest = principal × (ratePct/100) × years     (the I = P × r × t formula)
 *   - total = principal + interest
 *   - monthlyInterest = interest / (years × 12)
 *   - annualInterest = interest / years
 *   - compoundInterestEquivalent: same principal under monthly compounding
 *       FV = P × (1 + r/12)^(12·t); interest = FV - P
 *   - spread = compoundInterestEquivalent - interest (the "missed" gain by
 *     being on simple vs compound — the DGI / compound-interest lesson)
 *   - effectiveAprPct: same as ratePct for simple interest (just display)
 *   - frequency is display-only — for simple interest the totals are
 *     identical regardless of payout cadence.
 */
(function () {
  'use strict';

  var FREQUENCY_KEYS = ['annual', 'monthly', 'quarterly'];

  function calcSimpleInterest(p) {
    var principal = +p.principal || 0;
    var ratePct = +p.ratePct || 0;
    var years = +p.years || 0;
    var frequency = (p.frequency || 'annual').toLowerCase();

    if (principal <= 0) {
      return { error: 'Enter a positive principal.' };
    }
    if (ratePct < 0 || ratePct > 100) {
      return { error: 'Interest rate must be between 0% and 100%.' };
    }
    if (years <= 0 || years > 100) {
      return { error: 'Years must be between 0 and 100.' };
    }
    if (FREQUENCY_KEYS.indexOf(frequency) === -1) {
      return { error: 'Frequency must be annual, monthly, or quarterly.' };
    }

    var r = ratePct / 100;

    // I = P × r × t
    var interest = principal * r * years;
    var total = principal + interest;
    var annualInterest = interest / years;
    var monthlyInterest = interest / (years * 12);

    // Compound-interest equivalent (monthly compounding) — for the teach moment
    var compoundInterestEquivalent;
    if (r === 0) {
      compoundInterestEquivalent = 0;
    } else {
      var compoundedFv = principal * Math.pow(1 + r / 12, 12 * years);
      compoundInterestEquivalent = compoundedFv - principal;
    }
    var spread = compoundInterestEquivalent - interest;

    return {
      interest: round2(interest),
      total: round2(total),
      annualInterest: round2(annualInterest),
      monthlyInterest: round2(monthlyInterest),
      compoundInterestEquivalent: round2(compoundInterestEquivalent),
      spread: round2(spread),
      effectiveAprPct: Math.round(ratePct * 100) / 100,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_SIMPLE_INTEREST = {
      calc: calcSimpleInterest,
      FREQUENCY_KEYS: FREQUENCY_KEYS,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcSimpleInterest: calcSimpleInterest,
      FREQUENCY_KEYS: FREQUENCY_KEYS,
    };
  }
})();
