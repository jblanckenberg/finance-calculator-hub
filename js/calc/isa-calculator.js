/* FinCalcHub — UK ISA Calculator */
(function(){
  'use strict';

  var ISA_ANNUAL_LIMIT  = 20000;   // TY2026/27
  var LISA_ANNUAL_LIMIT = 4000;
  var LISA_BONUS_RATE   = 0.25;
  var LISA_OPEN_AGE_MAX = 39;
  var LISA_CONTRIB_AGE_MAX = 50;
  var CASH_ISA_RATE     = 0.03;

  function projectISA(p) {
    var balance     = Math.max(0, +p.currentBalance || 0);
    var cashBalance = balance;
    var years       = Math.max(0, +p.years || 0);
    var r           = (+p.expectedReturn || 0) / 100;
    var rCash       = CASH_ISA_RATE;
    var isLisa      = p.isaType === 'lisa';
    var startAge    = +p.currentAge || 30;

    var lisaInvalidAge = isLisa && startAge > LISA_OPEN_AGE_MAX;

    var perYearLimit = isLisa
      ? Math.min(LISA_ANNUAL_LIMIT, ISA_ANNUAL_LIMIT)
      : ISA_ANNUAL_LIMIT;

    var schedule    = [];
    var totalContrib = 0;
    var totalBonus   = 0;

    for (var y = 0; y < years; y++) {
      var age      = startAge + y;
      var contrib  = Math.min(+p.annualContrib || 0, perYearLimit);
      if (isLisa && age >= LISA_CONTRIB_AGE_MAX) {
        contrib = 0;
      }
      var bonus    = isLisa ? contrib * LISA_BONUS_RATE : 0;

      balance     = balance * (1 + r) + (contrib + bonus) * (1 + r / 2);
      cashBalance = cashBalance * (1 + rCash) + (contrib + bonus) * (1 + rCash / 2);

      totalContrib += contrib;
      totalBonus   += bonus;

      schedule.push({
        year: y + 1, age: age + 1,
        contribution: Math.round(contrib),
        bonus:        Math.round(bonus),
        balance:      Math.round(balance),
      });
    }

    return {
      finalBalance:    balance,
      totalContrib:    totalContrib,
      totalBonus:      totalBonus,
      totalGrowth:     balance - (p.currentBalance || 0) - totalContrib - totalBonus,
      vsCashDelta:     balance - cashBalance,
      lisaInvalidAge:  lisaInvalidAge,
      schedule:        schedule,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_ISA = {
      project: projectISA,
      LIMIT: ISA_ANNUAL_LIMIT,
      LISA_LIMIT: LISA_ANNUAL_LIMIT,
      LISA_BONUS: LISA_BONUS_RATE,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectISA, ISA_ANNUAL_LIMIT, LISA_ANNUAL_LIMIT, LISA_BONUS_RATE, LISA_OPEN_AGE_MAX, LISA_CONTRIB_AGE_MAX, CASH_ISA_RATE };
  }
})();
