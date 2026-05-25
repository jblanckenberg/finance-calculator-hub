/* FinCalcHub — Refinance Calculator module
 *
 * Pure-function refinance decision engine. Powers the
 * /refinance-calculator/ page. Answers the only question that matters for a
 * refi: "Should I do it — what's my break-even, and how much do I actually
 * save (or lose) over the life of the loan?"
 *
 * Model:
 *   - Current loan monthly payment: standard amortised P&I on the remaining
 *     balance over the years left, M = P·i(1+i)^n / ((1+i)^n − 1).
 *   - New loan monthly payment: same formula on the NEW principal (the
 *     remaining balance, plus closing costs if rolled in) over the NEW term.
 *   - Monthly savings = current payment − new payment (positive = lower bill).
 *   - Break-even months = upfront cash / monthly savings — how long the lower
 *     payment takes to recoup the cash you spent refinancing. Upfront cash is
 *     the closing costs UNLESS they're rolled into the loan (then it's 0, so a
 *     payment-lowering rolled-in refi breaks even immediately). If the new
 *     payment is not lower (monthlySavings ≤ 0) there is no break-even (null).
 *   - Lifetime cost: total remaining payments on the current loan vs total
 *     payments on the new loan (plus upfront closing costs if NOT rolled in).
 *
 * KEY TEACHING POINT — the term-reset trap:
 *   Extending a loan with (say) 22 years remaining into a fresh 30-year term
 *   can LOWER the monthly payment while RAISING the lifetime cost, because the
 *   clock restarts and you pay interest for 8 extra years. lifetimeSavings is
 *   reported with its true sign — it can be NEGATIVE even when monthlySavings
 *   is positive. The calculator never papers over this.
 *
 * Assumptions intentionally NOT modelled:
 *   - PMI / escrow / taxes / insurance (this is P&I only)
 *   - Cash-out proceeds beyond rolling closing costs in
 *   - Points buy-down beyond what the entered new rate already reflects
 *   - The opportunity cost of paying closing costs in cash vs investing it
 *   - extraMonthlyPayment is captured but treated as display-only (see below)
 */
(function () {
  'use strict';

  // Standard amortised monthly payment. i = monthly rate (decimal),
  // n = total months. Zero-rate falls back to principal / n (no div-by-zero).
  function monthlyPayment(principal, monthlyRate, totalMonths) {
    if (totalMonths <= 0) return 0;
    if (monthlyRate === 0) return principal / totalMonths;
    var pow = Math.pow(1 + monthlyRate, totalMonths);
    return principal * (monthlyRate * pow) / (pow - 1);
  }

  function calcRefinance(p) {
    var currentBalance = num(p.currentBalance);
    var currentRatePct = num(p.currentRatePct);
    var currentRemainingYears = num(p.currentRemainingYears);
    var newRatePct = num(p.newRatePct);
    var newTermYears = num(p.newTermYears);
    var closingCosts = (p.closingCosts === undefined || p.closingCosts === null || p.closingCosts === '')
      ? 0 : num(p.closingCosts);
    var rollCostsIntoLoan = !!p.rollCostsIntoLoan;
    var extraMonthlyPayment = (p.extraMonthlyPayment === undefined || p.extraMonthlyPayment === null || p.extraMonthlyPayment === '')
      ? 0 : num(p.extraMonthlyPayment);

    // --- Validation ---
    if (isNaN(currentBalance) || currentBalance <= 0) {
      return { error: 'Enter a current loan balance greater than zero.' };
    }
    if (isNaN(currentRatePct) || currentRatePct < 0 || currentRatePct > 30) {
      return { error: 'Current rate must be between 0% and 30%.' };
    }
    if (isNaN(currentRemainingYears) || currentRemainingYears < 0.5 || currentRemainingYears > 40) {
      return { error: 'Years remaining on the current loan must be between 0.5 and 40.' };
    }
    if (isNaN(newRatePct) || newRatePct < 0 || newRatePct > 30) {
      return { error: 'New rate must be between 0% and 30%.' };
    }
    if (isNaN(newTermYears) || newTermYears < 1 || newTermYears > 40) {
      return { error: 'New loan term must be between 1 and 40 years.' };
    }
    if (isNaN(closingCosts) || closingCosts < 0) {
      return { error: 'Closing costs cannot be negative.' };
    }
    if (isNaN(extraMonthlyPayment) || extraMonthlyPayment < 0) {
      return { error: 'Extra monthly payment cannot be negative.' };
    }

    var currentMonthlyRate = (currentRatePct / 100) / 12;
    var newMonthlyRate = (newRatePct / 100) / 12;
    var currentMonths = Math.round(currentRemainingYears * 12);
    var newMonths = Math.round(newTermYears * 12);

    // New principal: roll closing costs in, or leave them to be paid upfront.
    var newPrincipal = currentBalance + (rollCostsIntoLoan ? closingCosts : 0);

    var currentMonthlyPayment = monthlyPayment(currentBalance, currentMonthlyRate, currentMonths);
    var newMonthlyPayment = monthlyPayment(newPrincipal, newMonthlyRate, newMonths);

    var monthlySavings = currentMonthlyPayment - newMonthlyPayment;

    // Break-even: months for the monthly saving to recoup the UPFRONT cash you
    // spent refinancing. Rolling costs into the loan means no upfront cash, so
    // a payment-lowering rolled-in refi breaks even immediately (0 months).
    // No saving (or higher payment) → no break-even at all (null).
    var upfrontCash = rollCostsIntoLoan ? 0 : closingCosts;
    var breakEvenMonths = null;
    if (monthlySavings > 0) {
      breakEvenMonths = upfrontCash > 0 ? (upfrontCash / monthlySavings) : 0;
    }

    // --- Lifetime cost ---
    // Current loan: the remaining scheduled payments.
    var totalCostCurrent = currentMonthlyPayment * currentMonths;
    // New loan: all payments over the new term, plus upfront cash if costs
    // were NOT rolled in (if rolled in, they're already inside the payments).
    var totalCostNew = newMonthlyPayment * newMonths + (rollCostsIntoLoan ? 0 : closingCosts);

    var lifetimeSavings = totalCostCurrent - totalCostNew;

    // --- Interest portions ---
    // Interest on the current loan = remaining payments − remaining principal.
    var interestCurrent = totalCostCurrent - currentBalance;
    // Interest on the new loan = (payments over term) − new principal. Closing
    // costs rolled in are principal, not interest, so they don't inflate this.
    var interestNew = (newMonthlyPayment * newMonths) - newPrincipal;
    var interestSavings = interestCurrent - interestNew;

    // --- Recommendation ---
    var recommendation;
    if (monthlySavings <= 0) {
      // New payment is not lower — the headline reason to refi is gone.
      recommendation = 'Refinancing costs more overall (longer term)';
    } else if (lifetimeSavings < 0) {
      // Lower monthly, but you pay more across the life of the loan.
      recommendation = 'Refinancing costs more overall (longer term)';
    } else if (breakEvenMonths !== null && breakEvenMonths > 60) {
      // It pays off eventually, but it takes more than 5 years to recoup costs.
      recommendation = 'Break-even too long — reconsider';
    } else {
      recommendation = 'Refinance saves you money';
    }

    return {
      currentMonthlyPayment: round2(currentMonthlyPayment),
      newMonthlyPayment: round2(newMonthlyPayment),
      monthlySavings: round2(monthlySavings),
      breakEvenMonths: breakEvenMonths === null ? null : round1(breakEvenMonths),
      totalCostCurrent: round2(totalCostCurrent),
      totalCostNew: round2(totalCostNew),
      lifetimeSavings: round2(lifetimeSavings),
      interestSavings: round2(interestSavings),
      newPrincipal: round2(newPrincipal),
      recommendation: recommendation,
      // Display-only: not folded into the lifetime math above. Surfaced so the
      // UI can note that extra principal would shorten the new loan further.
      extraMonthlyPayment: round2(extraMonthlyPayment),
    };
  }

  function num(v) {
    return (v === undefined || v === null || v === '') ? NaN : +v;
  }
  function round2(v) { return Math.round(v * 100) / 100; }
  function round1(v) { return Math.round(v * 10) / 10; }

  if (typeof window !== 'undefined') {
    window.FCH_REFINANCE = {
      calc: calcRefinance,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcRefinance: calcRefinance,
      monthlyPayment: monthlyPayment,
    };
  }
})();
