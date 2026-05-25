/* FinCalcHub — UK Mortgage shared calc module
 *
 * Powers /mortgage-repayment-calculator/ AND /mortgage-overpayment-calculator/.
 *
 * UK convention: monthly repayment, paid in arrears (end of month).
 * Standard amortisation formula:
 *   M = P × r(1+r)^n / ((1+r)^n − 1)
 * where P = principal, r = monthly rate, n = total months.
 *
 * Two entry points:
 *   calcMortgagePayment({balance, ratePct, termYears, fixedYears?})
 *   calcOverpayment({balance, ratePct, termYears, monthlyOverpayment, lumpSum})
 *
 * Both share the amortise() core which walks month-by-month so we can
 * accurately model lump-sum payments and report partial-period payoffs.
 */
(function () {
  'use strict';

  function monthlyPaymentFormula(principal, monthlyRate, totalMonths) {
    if (totalMonths <= 0) return 0;
    if (monthlyRate === 0) return principal / totalMonths;
    var pow = Math.pow(1 + monthlyRate, totalMonths);
    return principal * (monthlyRate * pow) / (pow - 1);
  }

  // Walk the amortisation schedule month-by-month. Returns {monthsToPayoff,
  // totalInterest, totalPaid, finalBalance, schedule}. Handles monthly
  // overpayments + a one-off lump sum applied at the start of month 1.
  function amortise(opts) {
    var balance        = +opts.balance || 0;
    var ratePct        = +opts.ratePct || 0;
    var originalMonths = +opts.originalMonths || 0;
    var monthlyOverpayment = +opts.monthlyOverpayment || 0;
    var lumpSum        = +opts.lumpSum || 0;

    var monthlyRate = (ratePct / 100) / 12;
    // The scheduled monthly payment is based on the ORIGINAL principal
    // and term -- it doesn't recompute when a lump sum is applied, which
    // matches what most UK lenders do (overpayments shorten the term).
    var basePayment = monthlyPaymentFormula(balance, monthlyRate, originalMonths);

    // Apply lump-sum at start of month 1.
    var remaining = Math.max(balance - lumpSum, 0);
    var totalInterest = 0;
    var totalPaid = lumpSum;
    var schedule = [];
    var month = 0;
    var maxMonths = originalMonths + 12; // safety cap

    while (remaining > 0.01 && month < maxMonths) {
      month++;
      var interest = remaining * monthlyRate;
      var scheduledPrincipal = basePayment - interest;
      var actualPrincipal = scheduledPrincipal + monthlyOverpayment;
      if (actualPrincipal > remaining) actualPrincipal = remaining;
      var paymentThisMonth = interest + actualPrincipal;

      totalInterest += interest;
      totalPaid += paymentThisMonth;
      remaining -= actualPrincipal;
      if (remaining < 0.01) remaining = 0;

      // Schedule kept compact -- year-end snapshots + final month.
      if (month % 12 === 0 || remaining === 0) {
        schedule.push({
          month: month,
          year: Math.ceil(month / 12),
          payment: Math.round(paymentThisMonth * 100) / 100,
          interest: Math.round(interest * 100) / 100,
          principal: Math.round(actualPrincipal * 100) / 100,
          balance: Math.round(remaining * 100) / 100,
        });
      }
    }

    return {
      monthlyPayment: Math.round(basePayment * 100) / 100,
      monthsToPayoff: month,
      yearsToPayoff: Math.round(month / 12 * 10) / 10,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      finalBalance: Math.round(remaining * 100) / 100,
      schedule: schedule,
    };
  }

  function calcMortgagePayment(p) {
    var balance = +p.balance || 0;
    var ratePct = +p.ratePct;
    var termYears = +p.termYears || 0;
    var fixedYears = p.fixedYears !== undefined && p.fixedYears !== null ? +p.fixedYears : null;

    if (balance <= 0) return { error: 'Enter a mortgage balance greater than zero.' };
    if (!isFinite(ratePct) || ratePct < 0 || ratePct > 30) return { error: 'Rate must be between 0% and 30%.' };
    if (termYears <= 0 || termYears > 40) return { error: 'Term must be between 1 and 40 years.' };
    if (fixedYears !== null && (fixedYears < 1 || fixedYears > termYears)) {
      return { error: 'Fixed-rate period must be between 1 year and the full term.' };
    }

    var totalMonths = Math.round(termYears * 12);
    var result = amortise({ balance: balance, ratePct: ratePct, originalMonths: totalMonths });

    // Balance at end of fixed period (the balloon a UK borrower faces at
    // SVR-revert time).
    var balanceAtFixedEnd = null;
    if (fixedYears !== null) {
      var fixedMonths = Math.round(fixedYears * 12);
      var snapshot = amortise({ balance: balance, ratePct: ratePct, originalMonths: totalMonths });
      // Walk the fixed period to get the balance at fixed-end.
      var monthlyRate = (ratePct / 100) / 12;
      var bal = balance;
      for (var m = 1; m <= fixedMonths && bal > 0.01; m++) {
        var i = bal * monthlyRate;
        var pmt = snapshot.monthlyPayment;
        var pri = pmt - i;
        if (pri > bal) pri = bal;
        bal -= pri;
      }
      balanceAtFixedEnd = Math.round(bal * 100) / 100;
    }

    return {
      monthlyPayment: result.monthlyPayment,
      totalInterest: result.totalInterest,
      totalPaid: result.totalPaid,
      monthsToPayoff: result.monthsToPayoff,
      yearsToPayoff: result.yearsToPayoff,
      balanceAtFixedEnd: balanceAtFixedEnd,
      schedule: result.schedule,
    };
  }

  function calcOverpayment(p) {
    var balance = +p.balance || 0;
    var ratePct = +p.ratePct;
    var termYears = +p.termYears || 0;
    var monthlyOverpayment = +p.monthlyOverpayment || 0;
    var lumpSum = +p.lumpSum || 0;

    if (balance <= 0) return { error: 'Enter a mortgage balance greater than zero.' };
    if (!isFinite(ratePct) || ratePct < 0 || ratePct > 30) return { error: 'Rate must be between 0% and 30%.' };
    if (termYears <= 0 || termYears > 40) return { error: 'Term must be between 1 and 40 years.' };
    if (monthlyOverpayment < 0 || lumpSum < 0) return { error: 'Overpayment amounts must be zero or positive.' };
    if (lumpSum > balance) return { error: 'Lump sum exceeds the mortgage balance.' };

    var totalMonths = Math.round(termYears * 12);
    var baseline = amortise({ balance: balance, ratePct: ratePct, originalMonths: totalMonths });
    var withOverpay = amortise({
      balance: balance,
      ratePct: ratePct,
      originalMonths: totalMonths,
      monthlyOverpayment: monthlyOverpayment,
      lumpSum: lumpSum,
    });

    var monthsSaved = baseline.monthsToPayoff - withOverpay.monthsToPayoff;
    var interestSaved = baseline.totalInterest - withOverpay.totalInterest;

    return {
      baselineMonthlyPayment: baseline.monthlyPayment,
      baselineTotalInterest: baseline.totalInterest,
      baselineMonths: baseline.monthsToPayoff,
      newMonthlyOutgoing: Math.round((baseline.monthlyPayment + monthlyOverpayment) * 100) / 100,
      newTotalInterest: withOverpay.totalInterest,
      newMonths: withOverpay.monthsToPayoff,
      newYears: withOverpay.yearsToPayoff,
      monthsSaved: monthsSaved,
      yearsSaved: Math.round(monthsSaved / 12 * 10) / 10,
      interestSaved: Math.round(interestSaved * 100) / 100,
      lumpSum: lumpSum,
      monthlyOverpayment: monthlyOverpayment,
      schedule: withOverpay.schedule,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_MORTGAGE_UK = { payment: calcMortgagePayment, overpayment: calcOverpayment };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcMortgagePayment: calcMortgagePayment,
      calcOverpayment: calcOverpayment,
      amortise: amortise,
      monthlyPaymentFormula: monthlyPaymentFormula,
    };
  }
})();
