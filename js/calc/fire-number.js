/* FinCalcHub — FIRE Number Calculator module
 *
 * Pure-function FIRE-number engine. Powers the /fire-number-calculator/
 * page. Distinct from /fire-calculator/ (full projection): this one
 * focuses on the single-number target.
 *
 * Model:
 *   - Core: fireNumber = annualExpenses / (withdrawalRatePct / 100)
 *     (Trinity Study / Bengen 1994 — the classic "25× rule" at 4% SWR)
 *   - fireNumberInflationAdjusted = fireNumber × (1 + inflationPct/100)^yearsToFire
 *     (the future-rand target — what the FIRE number is in tomorrow's money)
 *   - currentProjectedAt = currentSavings × (1+r)^t
 *                          + monthlyContribution × 12 × ((1+r)^t - 1) / r
 *     (future value of current savings + ongoing contributions)
 *   - yearsAtCurrentRate: bisection solve for the t at which
 *     currentProjectedAt(t) = fireNumberInflationAdjustedAt(t).
 *     Note the target also drifts with inflation, so we equate the two
 *     time-dependent expressions instead of a flat target.
 *   - monthlyContribNeeded: closed-form solve for the monthly contribution
 *     that hits fireNumberInflationAdjusted at yearsToFire given
 *     currentSavings and expectedReturnPct.
 *   - surplusOrGap = currentProjectedAt(yearsToFire) - fireNumberInflationAdjusted
 *     (positive = ahead of plan; negative = gap)
 *   - multipleOfExpenses = fireNumber / annualExpenses (25 at SWR=4%)
 */
(function () {
  'use strict';

  function calcFireNumber(p) {
    var annualExpenses = +p.annualExpenses || 0;
    var withdrawalRatePct = (p.withdrawalRatePct === undefined || p.withdrawalRatePct === null || p.withdrawalRatePct === '')
      ? 4
      : +p.withdrawalRatePct;
    var inflationPct = (p.inflationPct === undefined || p.inflationPct === null || p.inflationPct === '')
      ? 3
      : +p.inflationPct;
    var yearsToFire = (p.yearsToFire === undefined || p.yearsToFire === null || p.yearsToFire === '')
      ? 20
      : +p.yearsToFire;
    var currentSavings = +p.currentSavings || 0;
    var monthlyContribution = +p.monthlyContribution || 0;
    var expectedReturnPct = (p.expectedReturnPct === undefined || p.expectedReturnPct === null || p.expectedReturnPct === '')
      ? 7
      : +p.expectedReturnPct;

    if (annualExpenses <= 0) {
      return { error: 'Enter positive annual expenses.' };
    }
    if (withdrawalRatePct < 2 || withdrawalRatePct > 8) {
      return { error: 'Safe withdrawal rate must be between 2% and 8%.' };
    }
    if (inflationPct < 0 || inflationPct > 15) {
      return { error: 'Inflation must be between 0% and 15%.' };
    }
    if (yearsToFire < 1 || yearsToFire > 60) {
      return { error: 'Years to FIRE must be between 1 and 60.' };
    }
    if (currentSavings < 0) {
      return { error: 'Current savings cannot be negative.' };
    }
    if (monthlyContribution < 0) {
      return { error: 'Monthly contribution cannot be negative.' };
    }
    if (expectedReturnPct < 0 || expectedReturnPct > 15) {
      return { error: 'Expected return must be between 0% and 15%.' };
    }

    var swr = withdrawalRatePct / 100;
    var infl = inflationPct / 100;
    var r = expectedReturnPct / 100;

    var fireNumber = annualExpenses / swr;
    var fireNumberInflationAdjusted = fireNumber * Math.pow(1 + infl, yearsToFire);
    var multipleOfExpenses = fireNumber / annualExpenses;

    // Future value of current savings + monthly contributions at year t
    // FV = currentSavings × (1+r)^t + annualContrib × ((1+r)^t - 1) / r
    function projectedAt(t) {
      var growth = Math.pow(1 + r, t);
      var annualContrib = monthlyContribution * 12;
      if (r === 0) {
        return currentSavings + annualContrib * t;
      }
      return currentSavings * growth + annualContrib * (growth - 1) / r;
    }

    function inflatedTargetAt(t) {
      return fireNumber * Math.pow(1 + infl, t);
    }

    var currentProjectedAtTarget = projectedAt(yearsToFire);
    var surplusOrGap = currentProjectedAtTarget - fireNumberInflationAdjusted;

    // Bisection solve for yearsAtCurrentRate: find t where projectedAt(t) =
    // inflatedTargetAt(t). Search range 0-100 years. If even 100 years
    // doesn't reach the target, return null (Infinity-equivalent for display).
    var yearsAtCurrentRate = null;
    var lo = 0;
    var hi = 100;
    var fLo = projectedAt(lo) - inflatedTargetAt(lo);
    var fHi = projectedAt(hi) - inflatedTargetAt(hi);
    if (fLo >= 0) {
      // Already at FIRE
      yearsAtCurrentRate = 0;
    } else if (fHi < 0) {
      // Even 100 years doesn't reach FIRE
      yearsAtCurrentRate = null;
    } else {
      for (var i = 0; i < 100; i++) {
        var mid = (lo + hi) / 2;
        var fMid = projectedAt(mid) - inflatedTargetAt(mid);
        if (Math.abs(fMid) < 1) break;
        if (fMid < 0) lo = mid;
        else hi = mid;
      }
      yearsAtCurrentRate = (lo + hi) / 2;
    }

    // Required monthly contribution to hit fireNumberInflationAdjusted at
    // yearsToFire. Solve:
    //   fireNumberInflationAdjusted = currentSavings × (1+r)^t
    //                                 + annualContrib × ((1+r)^t - 1) / r
    // → annualContrib = (target - currentSavings × (1+r)^t) × r / ((1+r)^t - 1)
    var monthlyContribNeeded;
    var growthT = Math.pow(1 + r, yearsToFire);
    var gapAtT = fireNumberInflationAdjusted - currentSavings * growthT;
    if (gapAtT <= 0) {
      monthlyContribNeeded = 0;
    } else if (r === 0) {
      monthlyContribNeeded = gapAtT / (yearsToFire * 12);
    } else {
      var annualNeeded = gapAtT * r / (growthT - 1);
      monthlyContribNeeded = annualNeeded / 12;
    }

    return {
      fireNumber: round2(fireNumber),
      fireNumberInflationAdjusted: round2(fireNumberInflationAdjusted),
      multipleOfExpenses: Math.round(multipleOfExpenses * 100) / 100,
      yearsAtCurrentRate: yearsAtCurrentRate === null ? null : Math.round(yearsAtCurrentRate * 10) / 10,
      monthlyContribNeeded: round2(monthlyContribNeeded),
      currentProjectedAtTarget: round2(currentProjectedAtTarget),
      surplusOrGap: round2(surplusOrGap),
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_FIRE_NUMBER = {
      calc: calcFireNumber,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcFireNumber: calcFireNumber,
    };
  }
})();
