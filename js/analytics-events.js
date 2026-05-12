/* FinCalcHub — GA4 calculator-completion event tracker.
 *
 * Fires `calculator_completed` once per page when the results panel becomes
 * visible (calculator pages add the .show class to #results after compute).
 * Captures the calculator slug from the URL and the user's selected region.
 *
 * No dependencies; safe to load on pages that don't have a #results element.
 */
(function () {
  'use strict';

  function fired() {
    if (typeof window.gtag !== 'function') return;
    var path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    var slug = path.split('/')[0] || 'home';
    var region = 'unknown';
    try {
      var m = document.cookie.match(/(?:^|;\s*)fc_region=([^;]+)/);
      if (m) region = decodeURIComponent(m[1]);
      else {
        var active = document.querySelector('.region-btn.active');
        if (active) region = (active.id || '').replace(/^btn-/, '') || 'unknown';
      }
    } catch (e) { /* ignore */ }

    window.gtag('event', 'calculator_completed', {
      calculator: slug,
      region: region,
      page_location: window.location.href
    });
  }

  function watch() {
    var results = document.getElementById('results');
    if (!results) return;
    var done = false;

    function check() {
      if (done) return;
      if (results.classList.contains('show')) {
        done = true;
        fired();
        if (observer) observer.disconnect();
      }
    }

    // Initial check (some calcs auto-show on load)
    check();
    if (done) return;

    var observer = new MutationObserver(check);
    observer.observe(results, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
})();
