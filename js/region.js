/* FinCalcHub — Region Toggle (USA / UK / SA) */
function detectDefaultRegion() {
  var saved = localStorage.getItem('preferred_region');
  if (saved) return saved;
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.indexOf('Africa') !== -1) return 'SA';
    if (tz === 'Europe/London' || tz === 'Europe/Belfast' || tz === 'Europe/Dublin') return 'UK';
    var lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (lang === 'en-za' || lang.indexOf('af') === 0 || lang.indexOf('zu') === 0 || lang.indexOf('xh') === 0) return 'SA';
    if (lang === 'en-gb') return 'UK';
  } catch(e) {}
  return 'USA';
}
var currentRegion = detectDefaultRegion();

function setRegion(region) {
  currentRegion = region;
  ['USA','UK','SA'].forEach(function(r) {
    var btn = document.getElementById('btn-' + r);
    if (btn) btn.classList.toggle('active', r === region);
  });
  document.querySelectorAll('[data-region]').forEach(function(el) {
    var regions = el.getAttribute('data-region').split(',');
    el.style.display = regions.indexOf(region) !== -1 ? '' : 'none';
  });
  localStorage.setItem('preferred_region', region);
  var results = document.getElementById('results');
  if (results && results.classList.contains('show')) {
    if (typeof calculate === 'function') calculate();
  }
}

function formatMoney(value) {
  var symbols = { USA: '$', UK: '£', SA: 'R' };
  var locales  = { USA: 'en-US', UK: 'en-GB', SA: 'en-ZA' };
  var sym = symbols[currentRegion] || '$';
  var loc = locales[currentRegion] || 'en-US';
  var abs = Math.abs(Math.round(value));
  var formatted = abs.toLocaleString(loc);
  return (value < 0 ? '-' : '') + sym + formatted;
}

function formatPct(value) {
  return (Math.round(value * 10) / 10) + '%';
}

document.addEventListener('DOMContentLoaded', function() {
  setRegion(currentRegion);
});
