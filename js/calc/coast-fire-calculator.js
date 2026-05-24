/* FinCalcHub — Coast FIRE Calculator
 *
 * "Coast FIRE" = the smallest amount you need invested today so that compound
 * growth alone (with ZERO further contributions) reaches your full FIRE
 * number by a chosen target retirement age.
 *
 * Distinct from fire-calculator.js which projects accumulation given an
 * ongoing savings rate. Coast FIRE asks the inverse question: "could I stop
 * saving today and still hit FIRE by 65?"
 */
(function () {
  'use strict';

  function calcCoastFire(p) {
    var fireNumber       = +p.fireNumber || 0;
    var currentAge       = +p.currentAge || 0;
    var coastAge         = +p.coastAge || 0;
    var realReturnPct    = +p.realReturnPct;
    var currentPortfolio = Math.max(0, +p.currentPortfolio || 0);

    if (!isFinite(realReturnPct)) realReturnPct = 0;

    // Guards — return error rather than NaN so the UI can show a useful message.
    if (fireNumber <= 0) return { error: 'Enter your FIRE number (target nest egg).' };
    if (currentAge <= 0) return { error: 'Enter your current age.' };
    if (coastAge <= currentAge) return { error: 'Coast age must be greater than current age.' };
    if (realReturnPct < 0) return { error: 'Real return must be 0% or higher.' };

    var years = coastAge - currentAge;
    var r = realReturnPct / 100;
    var coastFireNumber = fireNumber / Math.pow(1 + r, years);
    var shortfallToCoast = Math.max(coastFireNumber - currentPortfolio, 0);
    var multipleOfCoast = coastFireNumber > 0 ? currentPortfolio / coastFireNumber : 0;

    var status;
    var yearsToFireIfCoasting = null;
    if (currentPortfolio >= coastFireNumber) {
      status = 'coasting';
      if (r > 0 && currentPortfolio > 0) {
        yearsToFireIfCoasting = Math.log(fireNumber / currentPortfolio) / Math.log(1 + r);
      }
    } else {
      status = 'accumulating';
    }

    // Year-by-year projection at the computed coast rate, starting from the
    // CURRENT portfolio. If the user is still accumulating, this shows how
    // the portfolio would grow if it MAGICALLY reached the coast number today.
    var schedule = [];
    var basis = Math.max(currentPortfolio, coastFireNumber);
    for (var y = 0; y <= years; y++) {
      schedule.push({
        year: y,
        age: currentAge + y,
        value: Math.round(basis * Math.pow(1 + r, y)),
      });
    }

    return {
      coastFireNumber: Math.round(coastFireNumber * 100) / 100,
      shortfallToCoast: Math.round(shortfallToCoast * 100) / 100,
      multipleOfCoast: Math.round(multipleOfCoast * 100) / 100,
      status: status,
      yearsToFireIfCoasting: yearsToFireIfCoasting !== null && isFinite(yearsToFireIfCoasting)
        ? Math.round(yearsToFireIfCoasting * 10) / 10
        : null,
      schedule: schedule,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_COAST_FIRE = { calc: calcCoastFire };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcCoastFire: calcCoastFire };
  }
})();
