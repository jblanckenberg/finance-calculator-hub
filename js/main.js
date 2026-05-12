/* FinCalcHub — Shared Utilities */

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
