/* FinCalcHub — Take-Home Pay Calculator (USA / UK / SA, tax year 2026).
   Brackets and thresholds sourced from IRS Notice 25-67, HMRC published rates,
   and SARS budget review. Extracted from inline body to support `defer` load
   and reduce render-blocking script on /take-home-pay/ (audit MEDIUM). */

function _bracketTax(taxable, bands){
  // bands = [{ upTo: amount-or-Infinity, rate: 0.xx }, ...] — applied progressively.
  var tax = 0, last = 0;
  for(var i = 0; i < bands.length; i++){
    var top = bands[i].upTo;
    var chunk = Math.max(0, Math.min(taxable, top) - last);
    tax += chunk * bands[i].rate;
    last = top;
    if(taxable <= top) break;
  }
  return tax;
}

function calculate(){
  var salary  = parseFloat(document.getElementById('salary').value) || 0;
  var payFreq = parseInt(document.getElementById('payFreq').value, 10) || 12;
  var region  = (typeof currentRegion !== 'undefined') ? currentRegion : 'USA';
  var fmt     = (typeof formatMoney === 'function') ? formatMoney : function(v){ return '$' + Math.round(v).toLocaleString('en-US'); };

  var lines = []; // [{label, annual}]
  var fedTax = 0, stateTax = 0, ssTax = 0, medicareTax = 0;
  var niTax = 0, ukIncomeTax = 0, ukPensionAnnual = 0, ukStudentTax = 0;
  var saPaye = 0, saUif = 0, saRaAnnual = 0;
  var pretax401k = 0, pretaxOther = 0;
  var totalDeductions = 0, takeHome = 0;

  if(region === 'USA'){
    var filing      = document.getElementById('filingStatus').value;
    var stateRate   = parseFloat(document.getElementById('stateSelect').value) || 0;
    var contrib401k = (parseFloat(document.getElementById('contrib401k').value) || 0) / 100;
    pretaxOther     = parseFloat(document.getElementById('pretaxOther').value) || 0;
    pretax401k      = salary * contrib401k;

    // 2026 federal brackets (IRS Rev. Proc. 25-32 / Notice 25-67)
    var brackets = {
      single: [
        { upTo: 11925,    rate: 0.10 },
        { upTo: 48475,    rate: 0.12 },
        { upTo: 103350,   rate: 0.22 },
        { upTo: 197300,   rate: 0.24 },
        { upTo: 250525,   rate: 0.32 },
        { upTo: 626350,   rate: 0.35 },
        { upTo: Infinity, rate: 0.37 }
      ],
      married: [
        { upTo: 23850,    rate: 0.10 },
        { upTo: 96950,    rate: 0.12 },
        { upTo: 206700,   rate: 0.22 },
        { upTo: 394600,   rate: 0.24 },
        { upTo: 501050,   rate: 0.32 },
        { upTo: 751600,   rate: 0.35 },
        { upTo: Infinity, rate: 0.37 }
      ],
      hoh: [
        { upTo: 17000,    rate: 0.10 },
        { upTo: 64850,    rate: 0.12 },
        { upTo: 103350,   rate: 0.22 },
        { upTo: 197300,   rate: 0.24 },
        { upTo: 250500,   rate: 0.32 },
        { upTo: 626350,   rate: 0.35 },
        { upTo: Infinity, rate: 0.37 }
      ]
    };
    var stdDed = { single: 16100, married: 32200, hoh: 24150 };
    var taxable = Math.max(0, salary - pretax401k - pretaxOther - (stdDed[filing] || stdDed.single));
    fedTax = _bracketTax(taxable, brackets[filing] || brackets.single);

    // FICA — Social Security 6.2% to $184,500 wage base (2026 SSA),
    // Medicare 1.45% all wages + 0.9% above $200k.
    ssTax = Math.min(salary, 184500) * 0.062;
    medicareTax = salary * 0.0145 + Math.max(0, salary - 200000) * 0.009;

    // State income tax — applied to salary minus pre-tax 401(k) (rough proxy).
    stateTax = Math.max(0, salary - pretax401k) * stateRate;

    totalDeductions = fedTax + stateTax + ssTax + medicareTax + pretax401k + pretaxOther;
    takeHome        = salary - totalDeductions;

    lines.push({ label: 'Federal income tax',  v: fedTax });
    lines.push({ label: 'State income tax',    v: stateTax });
    lines.push({ label: 'Social Security (6.2%)', v: ssTax });
    lines.push({ label: 'Medicare (1.45% + 0.9% addl)', v: medicareTax });
    if(pretax401k > 0)  lines.push({ label: '401(k) contribution',     v: pretax401k });
    if(pretaxOther > 0) lines.push({ label: 'Other pre-tax deductions', v: pretaxOther });

  } else if(region === 'UK'){
    var pensionPct = (parseFloat(document.getElementById('ukPension').value) || 0) / 100;
    var loanPlan   = parseInt(document.getElementById('ukStudentLoan').value, 10) || 0;
    ukPensionAnnual = salary * pensionPct;
    var afterPension = salary - ukPensionAnnual;

    // UK 2026/27: personal allowance £12,570 (frozen). Tapered £1-for-£2 above
    // £100,000, fully gone at £125,140. Bands: 20% to £50,270, 40% to £125,140,
    // 45% above. We apply taper on the gross-of-pension income.
    var personalAllowance = 12570;
    if(salary > 100000){
      personalAllowance = Math.max(0, 12570 - (salary - 100000) / 2);
    }
    var taxable = Math.max(0, afterPension - personalAllowance);
    // Bands are measured from £0 of taxable above PA; HMRC publishes them as:
    // 20% on first £37,700, 40% on next £87,440 (to £125,140-PA = £112,570),
    // 45% above. We re-express as upTo cumulative figures.
    var ukBands = [
      { upTo: 37700,    rate: 0.20 },  // basic-rate band width
      { upTo: 112570,   rate: 0.40 },  // higher-rate band width
      { upTo: Infinity, rate: 0.45 }
    ];
    ukIncomeTax = _bracketTax(taxable, ukBands);

    // National Insurance 2026/27: 8% on £12,570–£50,270, 2% above.
    var niBands = [
      { upTo: 12570,    rate: 0.00 },
      { upTo: 50270,    rate: 0.08 },
      { upTo: Infinity, rate: 0.02 }
    ];
    niTax = _bracketTax(salary, niBands);

    // Student loan repayments (employee-side, post-tax for the user view).
    var slPlans = {
      0: { threshold: Infinity, rate: 0 },
      1: { threshold: 24990,    rate: 0.09 },
      2: { threshold: 27295,    rate: 0.09 },
      4: { threshold: 31395,    rate: 0.09 }
    };
    var sl = slPlans[loanPlan] || slPlans[0];
    ukStudentTax = Math.max(0, salary - sl.threshold) * sl.rate;

    totalDeductions = ukIncomeTax + niTax + ukStudentTax + ukPensionAnnual;
    takeHome        = salary - totalDeductions;

    lines.push({ label: 'Income tax (PAYE)',           v: ukIncomeTax });
    lines.push({ label: 'National Insurance (Class 1)', v: niTax });
    if(ukStudentTax > 0) lines.push({ label: 'Student loan repayment', v: ukStudentTax });
    if(ukPensionAnnual > 0) lines.push({ label: 'Pension contribution', v: ukPensionAnnual });

  } else if(region === 'SA'){
    var saAge = parseInt(document.getElementById('saAge').value, 10) || 1;
    var saMed = parseInt(document.getElementById('saMedical').value, 10) || 0;
    var saRaMonthly = parseFloat(document.getElementById('saRA').value) || 0;
    saRaAnnual = saRaMonthly * 12;

    // RA deduction capped at 27.5% of remuneration or R350k.
    var raDed = Math.min(saRaAnnual, salary * 0.275, 350000);
    var taxable = Math.max(0, salary - raDed);

    // SARS 2026/27 brackets (from sa-tax-calculator page)
    var saBands = [
      { upTo: 245100,   rate: 0.18 },
      { upTo: 370500,   rate: 0.26 },
      { upTo: 512800,   rate: 0.31 },
      { upTo: 673000,   rate: 0.36 },
      { upTo: 857900,   rate: 0.39 },
      { upTo: 1878600,  rate: 0.41 },
      { upTo: Infinity, rate: 0.45 }
    ];
    var grossTax = _bracketTax(taxable, saBands);

    // Rebates: primary 18,450, secondary +10,140 (65+), tertiary +3,386 (75+) — SARS 2026/27
    var rebate = 18450;
    if(saAge >= 2) rebate += 10140;
    if(saAge >= 3) rebate += 3386;

    // Medical scheme fees tax credit (annualised). 2026/27: R376 main, R376 1st dep, R254 each extra.
    var medCredit = 0;
    if(saMed >= 1) medCredit += 376 * 12;
    if(saMed >= 2) medCredit += 376 * 12;
    if(saMed > 2)  medCredit += 254 * 12 * (saMed - 2);

    saPaye = Math.max(0, grossTax - rebate - medCredit);

    // UIF: 1% capped at R177.12/month
    saUif = Math.min(salary * 0.01, 177.12 * 12);

    totalDeductions = saPaye + saUif + saRaAnnual;
    takeHome        = salary - totalDeductions;

    lines.push({ label: 'PAYE (income tax)',  v: saPaye });
    lines.push({ label: 'UIF (1%, capped)',   v: saUif });
    if(medCredit > 0) lines.push({ label: 'Medical aid credit (applied)', v: -medCredit });
    if(saRaAnnual > 0) lines.push({ label: 'RA contribution', v: saRaAnnual });
  }

  var effective = salary > 0 ? (totalDeductions / salary) * 100 : 0;
  var perPeriod = payFreq > 0 ? takeHome / payFreq : 0;

  document.getElementById('r-takehome').textContent         = fmt(takeHome);
  document.getElementById('r-perperiod').textContent        = fmt(perPeriod);
  document.getElementById('r-effective').textContent        = (Math.round(effective * 10) / 10) + '%';
  document.getElementById('r-total-deductions').textContent = fmt(totalDeductions);

  var rows = lines.map(function(l){
    return '<tr><td>' + l.label + '</td><td class="td-right">' + fmt(l.v) + '</td><td class="td-right">' + fmt(payFreq > 0 ? l.v / payFreq : 0) + '</td></tr>';
  }).join('');
  rows += '<tr><td><strong>Take-home</strong></td><td class="td-right"><strong>' + fmt(takeHome) + '</strong></td><td class="td-right"><strong>' + fmt(perPeriod) + '</strong></td></tr>';
  document.getElementById('breakdown-body').innerHTML = rows;

  var results = document.getElementById('results');
  if(results) results.classList.add('show');
}
document.addEventListener('DOMContentLoaded', function(){
  if(typeof calculate === 'function') calculate();
});
