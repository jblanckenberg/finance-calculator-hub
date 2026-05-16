/* FinCalcHub — 401(k) Calculator */
(function(){
  'use strict';

  // IRS 2026 limits — bump every January (verify per IRS Notice 2025-67)
  var EMPLOYEE_LIMIT_BASE     = 23500;
  var EMPLOYEE_LIMIT_CATCHUP  = 7500;
  var TOTAL_ADDITIONS_LIMIT   = 70000;
  var CATCHUP_AGE             = 50;

  function project401k(p) {
    var balance     = Math.max(0, p.currentBalance || 0);
    var startSalary = Math.max(0, p.salary || 0);
    var years       = Math.max(0, (p.retireAge || 65) - (p.currentAge || 35));
    var r           = (p.expectedReturn || 0) / 100;
    var g           = (p.salaryGrowth || 0) / 100;

    var totalEmp = 0, totalMatch = 0, overLimit = 0;
    var schedule = [];

    for (var y = 0; y < years; y++) {
      var age      = (p.currentAge || 35) + y;
      var salary_y = startSalary * Math.pow(1 + g, y);
      var empRaw   = salary_y * ((p.contribPct || 0) / 100);
      var empCap   = EMPLOYEE_LIMIT_BASE + (age >= CATCHUP_AGE ? EMPLOYEE_LIMIT_CATCHUP : 0);
      var employee = Math.min(empRaw, empCap);
      if (empRaw > empCap) overLimit++;

      var matchEligible = Math.min(salary_y * ((p.matchCapPct || 0) / 100), employee);
      var employer      = matchEligible * ((p.matchPct || 0) / 100);

      var totalCap = TOTAL_ADDITIONS_LIMIT + (age >= CATCHUP_AGE ? EMPLOYEE_LIMIT_CATCHUP : 0);
      if (employee + employer > totalCap) {
        employer = Math.max(0, totalCap - employee);
      }

      balance = balance * (1 + r) + (employee + employer) * (1 + r / 2);

      totalEmp   += employee;
      totalMatch += employer;
      schedule.push({
        year: y + 1, age: age + 1,
        salary: Math.round(salary_y),
        employee: Math.round(employee),
        employer: Math.round(employer),
        balance: Math.round(balance),
      });
    }

    return {
      finalBalance:   balance,
      totalEmployee:  totalEmp,
      totalEmployer:  totalMatch,
      totalGrowth:    balance - (p.currentBalance || 0) - totalEmp - totalMatch,
      yearsOverLimit: overLimit,
      schedule:       schedule,
    };
  }

  if (typeof window !== 'undefined') {
    window.FCH_401k = { project: project401k };
  }

  // Node test export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { project401k, EMPLOYEE_LIMIT_BASE, EMPLOYEE_LIMIT_CATCHUP, TOTAL_ADDITIONS_LIMIT, CATCHUP_AGE };
  }
})();
