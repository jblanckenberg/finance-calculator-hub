/* FinCalcHub — Student Loan Repayment Calculator */
(function(){
  'use strict';

  var UK_PLANS = {
    plan1:  { threshold: 26065, rate: 9, writeOff: 25 },
    plan2:  { threshold: 28470, rate: 9, writeOff: 30 },
    plan4:  { threshold: 32745, rate: 9, writeOff: 30 },
    plan5:  { threshold: 25000, rate: 9, writeOff: 40 },
    plan9:  { threshold: 21000, rate: 6, writeOff: 30 },
  };

  function projectUSA(p) {
    var balance   = Math.max(0, p.loanBalance || 0);
    var apr       = (p.interestRate || 0) / 100;
    var i         = apr / 12;
    var termY     = p.termYears || 10;
    var extra     = Math.max(0, p.extraPmt || 0);
    var n         = termY * 12;
    var pslf      = (p.plan === 'pslf');

    var basePmt = (i > 0)
      ? balance * i * Math.pow(1+i, n) / (Math.pow(1+i, n) - 1)
      : balance / n;

    var pmt        = basePmt + extra;
    if (!isFinite(pmt) || isNaN(pmt)) {
      return { error: 'Monthly payment too low to cover interest' };
    }
    var totalInt   = 0, totalPaid = 0;
    var months     = 0;
    var schedule   = [];
    var yearInt    = 0, yearPrin = 0, yearPaid = 0;
    var written    = 0;

    while (balance > 0.005 && months < 600) {
      var intM = balance * i;
      var prinM = Math.min(pmt - intM, balance);
      if (prinM <= 0 && i > 0) {
        return { error: 'Monthly payment too low to cover interest' };
      }
      balance  -= prinM;
      totalInt += intM;
      totalPaid+= (intM + prinM);
      yearInt  += intM;
      yearPrin += prinM;
      yearPaid += (intM + prinM);
      months++;

      if (months % 12 === 0) {
        schedule.push({
          year:    months/12,
          payment: Math.round(yearPaid),
          interest:Math.round(yearInt),
          principal:Math.round(yearPrin),
          balance: Math.round(Math.max(0, balance)),
        });
        yearInt = yearPrin = yearPaid = 0;
      }

      if (pslf && months >= 120 && balance > 0) {
        written = balance;
        balance = 0;
        break;
      }
    }
    if (months % 12 !== 0) {
      schedule.push({
        year:    Math.ceil(months/12),
        payment: Math.round(yearPaid),
        interest:Math.round(yearInt),
        principal:Math.round(yearPrin),
        balance: Math.round(Math.max(0, balance)),
      });
    }

    var savedVsBase = 0;
    if (extra > 0) {
      var nx = projectUSA(Object.assign({}, p, { extraPmt: 0 }));
      if (!nx.error) savedVsBase = nx.totalInterest - totalInt;
    }

    var now    = new Date();
    var payoff = new Date(now.getFullYear(), now.getMonth() + months, 1);
    return {
      totalPaid:    totalPaid,
      totalInterest:totalInt,
      monthlyPmt:   pmt,
      months:       months,
      payoffDate:   payoff,
      writtenOff:   written,
      savedVsBase:  savedVsBase,
      schedule:     schedule,
    };
  }

  function projectUK(p) {
    var plan      = UK_PLANS[p.plan] || UK_PLANS.plan2;
    var balance   = Math.max(0, p.loanBalance || 0);
    var rate      = (p.interestRate || 0) / 100;
    var salary0   = Math.max(0, p.salary || 0);
    var growth    = (p.salaryGrowth || 0) / 100;

    var schedule  = [], totalInt = 0, totalPaid = 0;
    var written   = 0, paidOff = false;
    var years     = plan.writeOff;

    for (var y = 0; y < years; y++) {
      var salary_y = salary0 * Math.pow(1 + growth, y);
      var annPay   = Math.max(0, (salary_y - plan.threshold) * (plan.rate / 100));
      var intY     = balance * rate;
      var actualPay= Math.min(annPay, balance + intY);
      balance      = balance + intY - actualPay;
      totalInt    += intY;
      totalPaid   += actualPay;

      schedule.push({
        year:     y + 1,
        salary:   Math.round(salary_y),
        payment:  Math.round(actualPay),
        interest: Math.round(intY),
        principal:Math.round(actualPay - intY),
        balance:  Math.round(Math.max(0, balance)),
      });

      if (balance <= 0.005) {
        paidOff = true;
        break;
      }
    }

    if (!paidOff && balance > 0) {
      written = balance;
      balance = 0;
    }

    var monthlyAvg = totalPaid / Math.max(1, schedule.length * 12);
    var now        = new Date();
    var endDate    = new Date(now.getFullYear() + schedule.length, now.getMonth(), 1);

    return {
      totalPaid:    totalPaid,
      totalInterest:totalInt,
      monthlyPmt:   monthlyAvg,
      payoffDate:   endDate,
      writtenOff:   written,
      paidOff:      paidOff,
      savedVsBase:  written,
      schedule:     schedule,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_StudentLoan = {
      projectUSA: projectUSA,
      projectUK:  projectUK,
      UK_PLANS:   UK_PLANS,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectUSA, projectUK, UK_PLANS };
  }
})();
