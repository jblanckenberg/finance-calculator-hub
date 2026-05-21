/* FinCalcHub — Savings Goal Calculator.
   Iterative monthly accumulation with milestone tracking. Extracted from
   inline body to support `defer` load on /savings-goal/ and all variants
   (including /savings-goal/house-deposit/) — reduces render-blocking
   script on audit-flagged slow pages (audit MEDIUM). */

function calculate(){
  var target  = parseFloat(document.getElementById('target').value)  || 0;
  var current = parseFloat(document.getElementById('current').value) || 0;
  var monthly = parseFloat(document.getElementById('monthly').value) || 0;
  var rate    = parseFloat(document.getElementById('rate').value)    || 0;

  var fmt = (typeof formatMoney === 'function') ? formatMoney : function(v){ return '$' + Math.round(v).toLocaleString('en-US'); };

  var monthlyEl   = document.getElementById('r-months');
  var dateEl      = document.getElementById('r-date');
  var contribEl   = document.getElementById('r-contrib');
  var interestEl  = document.getElementById('r-interest');
  var breakdownEl = document.getElementById('breakdown-body');

  if(target <= 0 || monthly <= 0){
    monthlyEl.textContent = '—';
    dateEl.textContent = '—';
    contribEl.textContent = fmt(0);
    interestEl.textContent = fmt(0);
    breakdownEl.innerHTML = '';
    return;
  }

  // Iterative monthly accumulation — accurate even when starting balance already
  // exceeds the target (returns 0 months) or the rate is 0 (linear pay-down).
  var balance = current;
  var months  = 0;
  var maxMonths = 12 * 100; // 100-year safety cap
  var r = (rate / 100) / 12;
  var firstHits = { '25': null, '50': null, '75': null, '100': null };

  if(balance >= target){
    months = 0;
    firstHits['100'] = 0;
  } else {
    while(balance < target && months < maxMonths){
      balance = balance * (1 + r) + monthly;
      months++;
      var pct = (balance / target) * 100;
      ['25', '50', '75', '100'].forEach(function(k){
        if(firstHits[k] === null && pct >= +k) firstHits[k] = months;
      });
    }
  }

  var totalContrib = monthly * months;
  var interest = balance - current - totalContrib;
  if(interest < 0) interest = 0;

  monthlyEl.textContent  = months + (months === 1 ? ' month' : ' months');
  contribEl.textContent  = fmt(totalContrib);
  interestEl.textContent = fmt(interest);

  // Target date: today + N months
  var d = new Date();
  d.setMonth(d.getMonth() + months);
  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  dateEl.textContent = monthNames[d.getMonth()] + ' ' + d.getFullYear();

  // Milestones
  var rows = '';
  ['25', '50', '75', '100'].forEach(function(k){
    if(firstHits[k] !== null){
      var bal = (target * (+k)) / 100;
      var md = new Date();
      md.setMonth(md.getMonth() + firstHits[k]);
      rows += '<tr><td>' + k + '% of goal</td><td class="td-right">' + fmt(bal) + '</td><td class="td-right">' + monthNames[md.getMonth()] + ' ' + md.getFullYear() + '</td></tr>';
    }
  });
  breakdownEl.innerHTML = rows;

  var results = document.getElementById('results');
  if(results) results.classList.add('show');
}
document.addEventListener('DOMContentLoaded', function(){
  if(typeof calculate === 'function') calculate();
});
