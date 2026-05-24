/* FinCalcHub — Dividend Calculator module
 *
 * Pure-function dividend / DRIP engine. Powers the /dividend-calculator/
 * page and is reusable from any future dividend-income page.
 *
 * Model:
 *   - Dividend income at any cadence (quarterly default, monthly,
 *     semi-annual, annual)
 *   - DRIP (Dividend Reinvestment Plan) compounds fractional shares at
 *     each payment using a flat assumed share price
 *   - Dividend growth applied annually (e.g., 5% for a dividend-aristocrat)
 *   - Tax wrappers: taxable (taxRatePct applied), roth_ira / traditional_ira /
 *     tfsa / isa (0% in-account — IRA withdrawal tax not modelled here)
 *   - Share price is held flat for clarity; share-price growth lives in the
 *     /investment-growth/ calculator
 */
(function () {
  'use strict';

  var FREQUENCY_MAP = {
    annual: 1,
    semiannual: 2,
    quarterly: 4,
    monthly: 12,
  };

  var WRAPPER_TAX = {
    taxable: true,        // taxRatePct applied to each payment
    roth_ira: false,      // 0% in-account
    traditional_ira: false, // 0% in-account; withdrawal tax not modelled
    tfsa: false,          // 0% in-account (SA)
    isa: false,           // 0% in-account (UK)
  };

  function calcDividend(p) {
    var shares = +p.shares || 0;
    var dividendPerShare = +p.dividendPerShare || 0;
    var frequencyKey = (p.frequency || 'quarterly').toLowerCase();
    var years = +p.years || 0;
    var drip = !!p.drip;
    var dividendGrowthPct = +p.dividendGrowthPct || 0;
    var expectedSharePrice = +p.expectedSharePrice || 100;
    var taxRatePct = +p.taxRatePct || 0;
    var wrapper = (p.wrapper || 'taxable').toLowerCase();

    if (shares <= 0) return { error: 'Enter a positive number of shares.' };
    if (dividendPerShare <= 0) return { error: 'Enter a positive dividend per share.' };
    if (years < 1 || years > 50) return { error: 'Investment horizon must be 1-50 years.' };
    if (dividendGrowthPct < -50 || dividendGrowthPct > 50) {
      return { error: 'Dividend growth rate must be between -50% and +50%.' };
    }
    if (taxRatePct < 0 || taxRatePct > 50) {
      return { error: 'Tax rate must be 0-50%.' };
    }
    if (expectedSharePrice <= 0) return { error: 'Share price must be positive.' };
    if (!Object.prototype.hasOwnProperty.call(FREQUENCY_MAP, frequencyKey)) {
      return { error: 'Frequency must be quarterly, monthly, semiannual, or annual.' };
    }
    if (!Object.prototype.hasOwnProperty.call(WRAPPER_TAX, wrapper)) {
      return { error: 'Wrapper must be taxable, roth_ira, traditional_ira, tfsa, or isa.' };
    }

    var paymentsPerYear = FREQUENCY_MAP[frequencyKey];
    var taxApplies = WRAPPER_TAX[wrapper];
    var effectiveTaxRate = taxApplies ? (taxRatePct / 100) : 0;
    var growth = dividendGrowthPct / 100;

    var currentShares = shares;
    var currentDps = dividendPerShare; // annual DPS for current year
    var totalDividendsReceived = 0;
    var totalTaxPaid = 0;
    var annualIncomeYear1 = 0;

    for (var year = 1; year <= years; year++) {
      var dpsThisYear = currentDps;
      var perPaymentDps = dpsThisYear / paymentsPerYear;
      var grossYear = 0;
      var taxYear = 0;

      for (var pay = 0; pay < paymentsPerYear; pay++) {
        var gross = currentShares * perPaymentDps;
        var tax = gross * effectiveTaxRate;
        var net = gross - tax;
        grossYear += gross;
        taxYear += tax;
        if (drip && expectedSharePrice > 0) {
          // Buy fractional shares with the net payment.
          currentShares += net / expectedSharePrice;
        }
      }

      totalDividendsReceived += grossYear;
      totalTaxPaid += taxYear;
      if (year === 1) annualIncomeYear1 = grossYear;

      // Grow next year's DPS.
      currentDps = currentDps * (1 + growth);
    }

    var sharesAtEnd = currentShares;
    var endingValue = sharesAtEnd * expectedSharePrice;
    var initialPositionValue = shares * expectedSharePrice;
    var effectiveYieldPct = initialPositionValue > 0
      ? (annualIncomeYear1 / initialPositionValue) * 100
      : 0;
    var monthlyIncomeYear1 = annualIncomeYear1 / 12;

    return {
      annualIncomeYear1: round2(annualIncomeYear1),
      monthlyIncomeYear1: round2(monthlyIncomeYear1),
      totalDividendsReceived: round2(totalDividendsReceived),
      totalTaxPaid: round2(totalTaxPaid),
      sharesAtEnd: round4(sharesAtEnd),
      endingValue: round2(endingValue),
      effectiveYieldPct: Math.round(effectiveYieldPct * 100) / 100,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }
  function round4(v) { return Math.round(v * 10000) / 10000; }

  if (typeof window !== 'undefined') {
    window.FCH_DIVIDEND = {
      calc: calcDividend,
      FREQUENCY_MAP: FREQUENCY_MAP,
      WRAPPER_TAX: WRAPPER_TAX,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcDividend: calcDividend,
      FREQUENCY_MAP: FREQUENCY_MAP,
      WRAPPER_TAX: WRAPPER_TAX,
    };
  }
})();
