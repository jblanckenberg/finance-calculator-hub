/* FinCalcHub — Roth IRA Calculator */
(function(){
  'use strict';

  var BASE_LIMIT       = 7000;
  var CATCHUP_BUMP     = 1000;
  var CATCHUP_AGE      = 50;
  var TAX_DRAG         = 0.22;

  var PHASE_OUT = {
    single:             { start: 150000, end: 165000 },
    mfj:                { start: 236000, end: 246000 },
    mfs_living_with:    { start:      0, end:  10000 },
    mfs_living_apart:   { start: 150000, end: 165000 },
  };

  function eligibleLimit(magi, status, age) {
    var base   = BASE_LIMIT + (age >= CATCHUP_AGE ? CATCHUP_BUMP : 0);
    var window = PHASE_OUT[status] || PHASE_OUT.single;
    if (magi <= window.start) return base;
    if (magi >= window.end)   return 0;
    var reduction = (magi - window.start) / (window.end - window.start);
    var raw       = base * (1 - reduction);
    return Math.max(200, Math.floor(raw / 10) * 10);
  }

  function projectRothIRA(p) {
    var balance         = Math.max(0, p.currentBalance || 0);
    var taxableBalance  = balance;
    var years           = Math.max(0, (p.retireAge || 65) - (p.currentAge || 30));
    var r               = (p.expectedReturn || 0) / 100;
    var rTaxable        = r * (1 - TAX_DRAG);
    var schedule        = [];
    var totalContrib    = 0;
    var firstYearLimit  = eligibleLimit(p.magi || 0, p.filingStatus || 'single', p.currentAge || 30);

    for (var y = 0; y < years; y++) {
      var age   = (p.currentAge || 30) + y;
      var limit = eligibleLimit(p.magi || 0, p.filingStatus || 'single', age);
      var contribY = Math.min(p.annualContrib || 0, limit);

      balance        = balance * (1 + r) + contribY * (1 + r / 2);
      taxableBalance = taxableBalance * (1 + rTaxable) + contribY * (1 + rTaxable / 2);

      totalContrib += contribY;
      schedule.push({
        year: y + 1, age: age + 1,
        contribution: Math.round(contribY),
        balance: Math.round(balance),
      });
    }

    var label;
    if (firstYearLimit === 0) {
      label = 'Ineligible (MAGI too high)';
    } else if (firstYearLimit < (BASE_LIMIT + ((p.currentAge||0) >= CATCHUP_AGE ? CATCHUP_BUMP : 0))) {
      label = 'Reduced: $' + firstYearLimit + ' max';
    } else {
      label = 'Full ($' + firstYearLimit + ')';
    }

    return {
      finalBalance:      balance,
      totalContrib:      totalContrib,
      totalGrowth:       balance - (p.currentBalance || 0) - totalContrib,
      eligibilityLabel:  label,
      taxSavedVsTaxable: balance - taxableBalance,
      schedule:          schedule,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_RothIRA = { project: projectRothIRA, eligibleLimit: eligibleLimit };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectRothIRA, eligibleLimit, BASE_LIMIT, CATCHUP_BUMP, CATCHUP_AGE, PHASE_OUT };
  }
})();
