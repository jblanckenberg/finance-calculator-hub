/* FinCalcHub — South Africa TFSA Calculator */
(function(){
  'use strict';

  var ANNUAL_LIMIT   = 36000;
  var LIFETIME_LIMIT = 500000;
  var EXCESS_PENALTY = 0.40;

  function projectTFSA(p) {
    var balance        = Math.max(0, +p.currentBalance || 0);
    var lifetimeSoFar  = Math.max(0, +p.lifetimeContribSoFar || 0);
    var years          = Math.max(0, +p.years || 0);
    var r              = (+p.expectedReturn || 0) / 100;
    var startAge       = +p.currentAge || 30;
    var requestedAnn   = Math.max(0, +p.annualContrib || 0);

    var totalContrib   = 0;
    var schedule       = [];
    var yearCapHit     = null, ageCapHit = null;
    var warnExcess     = requestedAnn > ANNUAL_LIMIT;

    for (var y = 0; y < years; y++) {
      var age      = startAge + y;
      var rem      = LIFETIME_LIMIT - lifetimeSoFar - totalContrib;
      var contrib  = Math.min(requestedAnn, ANNUAL_LIMIT, Math.max(0, rem));

      balance      = balance * (1 + r) + contrib * (1 + r / 2);
      totalContrib += contrib;
      var cumLife  = lifetimeSoFar + totalContrib;

      schedule.push({
        year: y + 1, age: age + 1,
        contribution:       Math.round(contrib),
        cumulativeLifetime: Math.round(cumLife),
        balance:            Math.round(balance),
      });

      if (yearCapHit === null && cumLife >= LIFETIME_LIMIT) {
        yearCapHit = y + 1;
        ageCapHit  = age + 1;
      }
    }

    var lifetimeUsed = lifetimeSoFar + totalContrib;
    return {
      finalBalance:     balance,
      totalContrib:     totalContrib,
      totalGrowth:      balance - (p.currentBalance || 0) - totalContrib,
      lifetimeUsed:     lifetimeUsed,
      lifetimePctUsed:  lifetimeUsed / LIFETIME_LIMIT * 100,
      yearCapHit:       yearCapHit,
      ageCapHit:        ageCapHit,
      schedule:         schedule,
      warnExcess:       warnExcess,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_TFSA = {
      project: projectTFSA,
      ANNUAL_LIMIT: ANNUAL_LIMIT,
      LIFETIME_LIMIT: LIFETIME_LIMIT,
      EXCESS_PENALTY: EXCESS_PENALTY,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectTFSA, ANNUAL_LIMIT, LIFETIME_LIMIT, EXCESS_PENALTY };
  }
})();
