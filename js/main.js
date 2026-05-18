/* FinCalcHub — Shared Utilities */

/* Try-these-scenarios loader.
 *
 * The blueprint Try-these-scenarios section links to ?param=value... URLs that
 * pre-fill the calculator above. On every calc page we read the query string,
 * set matching inputs by id, fire an input/change event so any inline change
 * listeners run, then call calculate() once if it's defined.
 *
 * Conservative: only acts on inputs that already exist with a matching id, so
 * any param that doesn't map is silently ignored (no false-positive writes).
 */
function applyScenarioFromURL() {
  try {
    var params = new URLSearchParams(window.location.search);
    if (!params || !params.toString()) return;
    var anyApplied = false;
    params.forEach(function(value, key) {
      var el = document.getElementById(key);
      if (!el) return;
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        el.value = value;
        var evt = (tag === 'select') ? 'change' : 'input';
        try { el.dispatchEvent(new Event(evt, { bubbles: true })); } catch (e) {}
        anyApplied = true;
      }
    });
    if (anyApplied && typeof calculate === 'function') {
      try { calculate(); } catch (e) {}
    }
  } catch (e) { /* never block the page on a malformed URL */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyScenarioFromURL);
} else {
  applyScenarioFromURL();
}

// If no calculate() function exists on this page, hide try-scenarios block
// (clicking a scenario would populate inputs but the results wouldn't recompute,
// which is misleading. This is a defensive guard until the underlying calc JS
// is restored on the affected pages — see _docs/calc-functions-missing.md)
document.addEventListener("DOMContentLoaded", function() {
  if (typeof calculate !== "function") {
    var ts = document.querySelector(".try-scenarios");
    if (ts) ts.style.display = "none";
  }
});

function saveToFile() {
  var h1 = document.querySelector('h1');
  var calcName = h1 ? h1.textContent : 'Calculator';
  var date = new Date().toLocaleDateString();
  var lines = [];
  lines.push('==========================================');
  lines.push(calcName + ' — Results');
  lines.push('Date: ' + date + '   Region: ' + (window.currentRegion || 'USA'));
  lines.push('==========================================');
  lines.push('');
  lines.push('INPUTS');
  lines.push('------');
  document.querySelectorAll('.form-group').forEach(function(g) {
    var lbl = g.querySelector('label');
    var inp = g.querySelector('input, select');
    if (lbl && inp && inp.value && g.style.display !== 'none') {
      var labelText = lbl.textContent.replace(/\s+/g, ' ').trim();
      lines.push(labelText + ': ' + inp.value);
    }
  });
  lines.push('');
  lines.push('RESULTS');
  lines.push('-------');
  document.querySelectorAll('.result-item').forEach(function(item) {
    var val   = item.querySelector('.result-value');
    var label = item.querySelector('.result-label');
    if (val && label) {
      lines.push(label.textContent.trim() + ': ' + val.textContent.trim());
    }
  });
  var breakdown = document.querySelector('.breakdown-table');
  if (breakdown) {
    lines.push('');
    lines.push('BREAKDOWN');
    lines.push('---------');
    breakdown.querySelectorAll('tr').forEach(function(row) {
      var cells = row.querySelectorAll('th, td');
      if (cells.length >= 2) {
        var rowText = [];
        cells.forEach(function(c) { rowText.push(c.textContent.trim()); });
        lines.push(rowText.join('   |   '));
      }
    });
  }
  lines.push('');
  lines.push('------------------------------------------');
  lines.push('FinCalcHub.com — Free Financial Calculators');
  lines.push('For information only. Not financial advice.');
  var content = lines.join('\n');
  var blob = new Blob([content], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = calcName.replace(/\s+/g, '-').toLowerCase() + '-results.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
