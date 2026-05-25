/* FinCalcHub — Future Value Calculator module
 *
 * Pure-function time-value-of-money (TVM) engine. Powers the
 * /future-value-calculator/ page. Computes the future value of a lump
 * sum invested today AND/OR a series of recurring payments (an annuity),
 * with the FV formula shown explicitly for the teaching feature.
 *
 * Model:
 *   - Lump sum future value: FV = PV × (1 + r/n)^(n×t)
 *       PV = presentValue, r = annualRate, n = compoundingPerYear, t = years.
 *       The lump sum compounds at its own frequency (compoundingPerYear).
 *   - Annuity future value: FV = PMT × [((1 + i)^N − 1) / i]
 *       i = periodic rate = annualRate / contributionFrequency,
 *       N = total periods = contributionFrequency × years,
 *       PMT = payment per period.
 *       Annuity-due (paymentTiming "begin") multiplies by (1 + i) because
 *       every cash flow lands one period earlier and earns one extra
 *       period of compounding.
 *       The annuity compounds at the contribution frequency, modelled with
 *       its own periodic rate so the two streams are each internally
 *       correct (they need not share a frequency).
 *   - Zero-rate handling: when i = 0, the annuity FV collapses to PMT × N
 *       (no division by zero) and the lump sum FV equals PV.
 *   - Effective annual rate (EAR) is derived from the nominal annual rate
 *     and the lump-sum compounding frequency: ((1 + r/n)^n − 1) × 100.
 *
 * Assumptions intentionally NOT modelled:
 *   - Taxes on growth or contributions (this is a gross TVM calculator)
 *   - Inflation adjustment (use the Inflation Impact calculator for real
 *     purchasing power)
 *   - Variable / non-constant returns or contributions
 *   - Contributions indexed to inflation or salary growth
 */
(function () {
  'use strict';

  function calcFutureValue(p) {
    var presentValue = (p.presentValue === undefined || p.presentValue === null || p.presentValue === '')
      ? 10000
      : +p.presentValue;
    var payment = (p.payment === undefined || p.payment === null || p.payment === '')
      ? 0
      : +p.payment;
    var annualRatePct = (p.annualRatePct === undefined || p.annualRatePct === null || p.annualRatePct === '')
      ? 7
      : +p.annualRatePct;
    var years = (p.years === undefined || p.years === null || p.years === '')
      ? 10
      : +p.years;
    var compoundingPerYear = (p.compoundingPerYear === undefined || p.compoundingPerYear === null || p.compoundingPerYear === '')
      ? 12
      : +p.compoundingPerYear;
    var paymentTiming = (p.paymentTiming === 'begin') ? 'begin' : 'end';
    var contributionFrequency = (p.contributionFrequency === undefined || p.contributionFrequency === null || p.contributionFrequency === '')
      ? 12
      : +p.contributionFrequency;

    if (isNaN(presentValue) || presentValue < 0) {
      return { error: 'Present value (lump sum) cannot be negative.' };
    }
    if (isNaN(payment) || payment < 0) {
      return { error: 'Recurring payment cannot be negative.' };
    }
    if (presentValue <= 0 && payment <= 0) {
      return { error: 'Enter a present value, a recurring payment, or both — at least one must be greater than zero.' };
    }
    if (isNaN(years) || years < 0.5 || years > 100) {
      return { error: 'Years must be between 0.5 and 100.' };
    }
    if (isNaN(annualRatePct) || annualRatePct < -20 || annualRatePct > 50) {
      return { error: 'Annual rate must be between -20% and 50%.' };
    }
    if (compoundingPerYear <= 0) {
      return { error: 'Compounding frequency must be at least once per year.' };
    }
    if (contributionFrequency <= 0) {
      return { error: 'Contribution frequency must be at least once per year.' };
    }

    var r = annualRatePct / 100;
    var n = compoundingPerYear;

    // --- Lump sum future value: PV × (1 + r/n)^(n×t) ---
    var futureValueLumpSum = presentValue * Math.pow(1 + r / n, n * years);

    // --- Annuity future value ---
    var i = r / contributionFrequency;          // periodic rate
    var N = contributionFrequency * years;      // total payment periods
    var futureValueAnnuity;
    if (i === 0) {
      // Zero-rate: no compounding, FV is just the sum of payments.
      futureValueAnnuity = payment * N;
    } else {
      var annuityFactor = (Math.pow(1 + i, N) - 1) / i;
      futureValueAnnuity = payment * annuityFactor;
      if (paymentTiming === 'begin') {
        // Annuity-due: every payment compounds one extra period.
        futureValueAnnuity = futureValueAnnuity * (1 + i);
      }
    }

    var futureValueTotal = futureValueLumpSum + futureValueAnnuity;
    var totalContributions = presentValue + (payment * contributionFrequency * years);
    var totalInterestEarned = futureValueTotal - totalContributions;

    // Effective annual rate from the nominal rate at the lump-sum
    // compounding frequency.
    var effectiveAnnualRatePct = (Math.pow(1 + r / n, n) - 1) * 100;

    // "Show the math" teaching string: FV lump-sum formula with the
    // user's numbers substituted.
    var formula = 'FV = ' + fmtNum(presentValue) + ' × (1 + ' + trimNum(r) + '/' + n + ')^(' +
      n + '×' + trimNum(years) + ') = ' + fmtMoney(futureValueLumpSum);

    return {
      futureValueLumpSum: round2(futureValueLumpSum),
      futureValueAnnuity: round2(futureValueAnnuity),
      futureValueTotal: round2(futureValueTotal),
      totalContributions: round2(totalContributions),
      totalInterestEarned: round2(totalInterestEarned),
      effectiveAnnualRatePct: round4(effectiveAnnualRatePct),
      formula: formula,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }
  function round4(v) { return Math.round(v * 10000) / 10000; }
  function fmtNum(v) {
    return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function fmtMoney(v) {
    return '$' + (Math.round(v * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Trim trailing zeros from a plain number for the formula string.
  function trimNum(v) {
    return parseFloat(v.toFixed(6)).toString();
  }

  if (typeof window !== 'undefined') {
    window.FCH_FUTURE_VALUE = {
      calc: calcFutureValue,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcFutureValue: calcFutureValue,
    };
  }
})();
