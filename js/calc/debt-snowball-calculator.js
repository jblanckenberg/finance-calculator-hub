/* FinCalcHub — Debt Snowball / Avalanche Calculator */
(function(){
  'use strict';

  function projectDebts(p) {
    var strategy  = p.strategy || 'snowball';
    var debts     = (p.debts || []).map(function(d){
      return {
        name: d.name || 'Debt',
        balance: Math.max(0, +d.balance || 0),
        apr: Math.max(0, +d.apr || 0),
        minPmt: Math.max(0, +d.minPmt || 0),
        cleared: false,
        monthCleared: 0,
      };
    }).filter(function(d){ return d.balance > 0; });

    if (debts.length === 0) {
      return { months:0, payoffDate:new Date(), totalInterest:0, payoffOrder:[], schedule:[] };
    }

    function focusOrder(remaining) {
      var sorted = remaining.slice();
      if (strategy === 'avalanche') {
        sorted.sort(function(a,b){ return b.apr - a.apr; });
      } else {
        sorted.sort(function(a,b){ return a.balance - b.balance; });
      }
      return sorted;
    }

    var totalInterest = 0;
    var months        = 0;
    var schedule      = [];
    var payoffOrder   = [];
    var freedPmt      = 0;
    var extra         = Math.max(0, +p.extraMonthly || 0);

    while (debts.some(function(d){ return !d.cleared; }) && months < 600) {
      months++;
      debts.forEach(function(d){
        if (!d.cleared) {
          var i = d.balance * (d.apr / 1200);
          d.balance += i;
          totalInterest += i;
        }
      });

      var remainingExtra = extra + freedPmt;
      debts.forEach(function(d){
        if (d.cleared) return;
        var pay = Math.min(d.minPmt, d.balance);
        d.balance -= pay;
      });

      var focus = focusOrder(debts.filter(function(d){ return !d.cleared && d.balance > 0; }));
      for (var i = 0; i < focus.length && remainingExtra > 0.005; i++) {
        var d = focus[i];
        var pay = Math.min(remainingExtra, d.balance);
        d.balance -= pay;
        remainingExtra -= pay;
        if (d.balance <= 0.005) {
          d.balance = 0;
        }
      }

      debts.forEach(function(d){
        if (!d.cleared && d.balance <= 0.005) {
          d.cleared = true;
          d.monthCleared = months;
          freedPmt += d.minPmt;
          payoffOrder.push({ name: d.name, monthCleared: months });
        }
      });

      if (months <= 36) {
        var totalRemaining = debts.reduce(function(s,d){ return s + d.balance; }, 0);
        schedule.push({
          month: months,
          totalBalance: Math.round(totalRemaining),
        });
      }
    }

    var now = new Date();
    var payoff = new Date(now.getFullYear(), now.getMonth() + months, 1);
    return {
      months:        months,
      payoffDate:    payoff,
      totalInterest: totalInterest,
      payoffOrder:   payoffOrder,
      schedule:      schedule,
      error:         months >= 600 ? 'Total minimum payments do not cover interest — increase extra or minimums' : undefined,
    };
  }

  function compareStrategies(p) {
    var snow = projectDebts(Object.assign({}, p, { strategy: 'snowball' }));
    var aval = projectDebts(Object.assign({}, p, { strategy: 'avalanche' }));
    return {
      snowball:    snow,
      avalanche:   aval,
      interestDelta: snow.totalInterest - aval.totalInterest,
      monthDelta:    snow.months - aval.months,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_DebtSnowball = { project: projectDebts, compare: compareStrategies };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectDebts, compareStrategies };
  }
})();
