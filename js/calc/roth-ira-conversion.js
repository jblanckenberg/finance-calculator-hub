/* FinCalcHub — Roth IRA Conversion Calculator module
 *
 * Pure-function Roth-conversion engine. Powers the
 * /roth-ira-conversion-calculator/ page and is reusable from any future
 * conversion-strategy page.
 *
 * Model:
 *   - Conversion tax = conversionAmount × currentMarginalRatePct%
 *   - If `taxPaidFromConversion` is true the tax is taken out of the
 *     converted amount (less tax-efficient — only that net amount enters
 *     the Roth). If false, the user pays the tax from outside funds and
 *     the full conversion amount enters the Roth (preferred path).
 *   - Roth grows tax-free: amountInRoth × (1 + r)^years
 *   - Traditional alternative: leave the same conversionAmount in the
 *     Traditional IRA, grow it tax-deferred, then pay
 *     retirementMarginalRatePct% on the full balance at withdrawal.
 *   - Net advantage = rothValueAtRetirement - traditionalValueAfterTax.
 *     Positive → Roth wins. Negative → Traditional wins.
 *   - Break-even retirement rate: the retirementMarginalRatePct that
 *     makes net advantage = 0 (solved algebraically).
 *
 * Assumptions intentionally NOT modelled:
 *   - State income tax
 *   - 5-year-rule withdrawal penalty
 *   - Pro-rata rule (mixed deductible / nondeductible contributions)
 *   - Share-price growth distinct from expectedReturnPct
 *   - IRMAA / ACA cliff effects from the conversion year's income spike
 */
(function () {
  'use strict';

  function calcRothConversion(p) {
    var conversionAmount = +p.conversionAmount || 0;
    var currentAge = +p.currentAge || 0;
    var retirementAge = +p.retirementAge || 0;
    var currentMarginalRatePct = +p.currentMarginalRatePct || 0;
    var retirementMarginalRatePct = +p.retirementMarginalRatePct || 0;
    var expectedReturnPct = (p.expectedReturnPct === undefined || p.expectedReturnPct === null || p.expectedReturnPct === '')
      ? 7
      : +p.expectedReturnPct;
    var taxPaidFromConversion = !!p.taxPaidFromConversion;

    if (conversionAmount <= 0) {
      return { error: 'Enter a positive conversion amount.' };
    }
    if (currentAge < 18 || currentAge > 100) {
      return { error: 'Current age must be 18-100.' };
    }
    if (retirementAge > 100) {
      return { error: 'Retirement age must be 100 or less.' };
    }
    if (retirementAge <= currentAge) {
      return { error: 'Retirement age must be greater than current age.' };
    }
    if (currentMarginalRatePct < 0 || currentMarginalRatePct > 50) {
      return { error: 'Current marginal tax rate must be 0-50%.' };
    }
    if (retirementMarginalRatePct < 0 || retirementMarginalRatePct > 50) {
      return { error: 'Retirement marginal tax rate must be 0-50%.' };
    }
    if (expectedReturnPct < -5 || expectedReturnPct > 15) {
      return { error: 'Expected return must be between -5% and 15%.' };
    }

    var currentRate = currentMarginalRatePct / 100;
    var retireRate = retirementMarginalRatePct / 100;
    var r = expectedReturnPct / 100;
    var yearsToRetirement = retirementAge - currentAge;
    var growthFactor = Math.pow(1 + r, yearsToRetirement);

    var conversionTax = conversionAmount * currentRate;
    var amountInRoth = taxPaidFromConversion
      ? (conversionAmount - conversionTax)
      : conversionAmount;

    var rothValueAtRetirement = amountInRoth * growthFactor;
    var traditionalValueGross = conversionAmount * growthFactor;
    var traditionalValueAfterTax = traditionalValueGross * (1 - retireRate);

    var netAdvantage = rothValueAtRetirement - traditionalValueAfterTax;

    // Break-even retirement marginal rate: the retirementMarginalRatePct
    // at which netAdvantage = 0.
    //   rothValueAtRetirement = traditionalValueGross × (1 - breakRate)
    //   breakRate = 1 - (rothValueAtRetirement / traditionalValueGross)
    //             = 1 - (amountInRoth / conversionAmount)
    // (growthFactor cancels). Clamp to [0, 100] for display.
    var breakEvenRetirementRatePct;
    if (traditionalValueGross > 0) {
      var breakRate = 1 - (amountInRoth / conversionAmount);
      breakEvenRetirementRatePct = breakRate * 100;
    } else {
      breakEvenRetirementRatePct = 0;
    }

    // Recommendation: classify by magnitude of advantage relative to
    // Traditional after-tax value. <2% delta = "Roughly equal".
    var recommendation;
    var pivot = Math.abs(traditionalValueAfterTax) > 0
      ? netAdvantage / Math.abs(traditionalValueAfterTax)
      : 0;
    if (pivot > 0.02) {
      recommendation = 'Convert';
    } else if (pivot < -0.02) {
      recommendation = "Don't convert";
    } else {
      recommendation = 'Roughly equal';
    }

    return {
      conversionTax: round2(conversionTax),
      amountInRoth: round2(amountInRoth),
      yearsToRetirement: yearsToRetirement,
      rothValueAtRetirement: round2(rothValueAtRetirement),
      traditionalValueGross: round2(traditionalValueGross),
      traditionalValueAfterTax: round2(traditionalValueAfterTax),
      netAdvantage: round2(netAdvantage),
      breakEvenRetirementRatePct: Math.round(breakEvenRetirementRatePct * 100) / 100,
      recommendation: recommendation,
    };
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  if (typeof window !== 'undefined') {
    window.FCH_ROTH_CONVERSION = {
      calc: calcRothConversion,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      calcRothConversion: calcRothConversion,
    };
  }
})();
