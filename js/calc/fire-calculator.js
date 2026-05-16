/* FinCalcHub — FIRE (Financial Independence Retire Early) Calculator */
(function(){
  'use strict';

  var TIER_MULTIPLIER = {
    lean:    0.7,
    regular: 1.0,
    fat:     2.0,
    coast:   1.0,
  };

  var COAST_TARGET_AGE = 65;

  function projectFIRE(p) {
    var pv      = Math.max(0, +p.currentSavings || 0);
    var income  = Math.max(0, +p.annualIncome || 0);
    var spend   = Math.max(0, +p.annualSpending || 0);
    var r       = (+p.expectedReturn || 0) / 100;
    var swr     = Math.max(0.1, +p.swr || 4) / 100;
    var tier    = p.fireType || 'regular';
    var mult    = TIER_MULTIPLIER[tier] || 1.0;
    var age     = +p.currentAge || 30;

    var annualSavings = income - spend;
    var savingsRate   = income > 0 ? (annualSavings / income) : 0;
    var fiNumber      = spend * mult / swr;

    var yearsToFI = null, alreadyFI = false;
    if (pv >= fiNumber) {
      yearsToFI = 0;
      alreadyFI = true;
    } else if (annualSavings <= 0) {
      yearsToFI = null;
    } else if (r === 0) {
      yearsToFI = (fiNumber - pv) / annualSavings;
    } else {
      var num = Math.log((fiNumber * r + annualSavings) / (pv * r + annualSavings));
      var den = Math.log(1 + r);
      yearsToFI = num / den;
      if (!isFinite(yearsToFI) || yearsToFI < 0) yearsToFI = null;
    }

    var ageAtFI = (yearsToFI !== null) ? age + yearsToFI : null;

    var yearsToTarget = Math.max(0, COAST_TARGET_AGE - age);
    var coastNumber   = fiNumber / Math.pow(1 + r, yearsToTarget);

    var schedule = [];
    var balance  = pv;
    var maxYears = yearsToFI !== null ? Math.ceil(yearsToFI) : 50;
    for (var y = 1; y <= Math.min(maxYears, 60); y++) {
      balance = (balance + annualSavings) * (1 + r);
      schedule.push({
        year: y, age: age + y,
        balance: Math.round(balance),
        percentToFI: Math.min(100, Math.round(balance / fiNumber * 1000) / 10),
      });
      if (balance >= fiNumber) break;
    }

    return {
      fiNumber:    fiNumber,
      yearsToFI:   yearsToFI,
      ageAtFI:     ageAtFI,
      savingsRate: savingsRate,
      coastNumber: coastNumber,
      alreadyFI:   alreadyFI,
      schedule:    schedule,
      error:       (annualSavings <= 0 && pv < fiNumber)
                     ? 'Spending equals or exceeds income — increase income or cut spending'
                     : undefined,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_FIRE = { project: projectFIRE, TIER_MULTIPLIER: TIER_MULTIPLIER };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectFIRE, TIER_MULTIPLIER, COAST_TARGET_AGE };
  }
})();
