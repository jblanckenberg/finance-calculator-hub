/* FinCalcHub cookie consent (lightweight, no dependencies) */
(function () {
  'use strict';
  var COOKIE_NAME = 'fc_consent';
  var COOKIE_DAYS = 365;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function applyConsent(state) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state
      });
    }
  }
  function build() {
    var banner = document.createElement('div');
    banner.className = 'fc-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<p>We use cookies for anonymous analytics and ad personalisation. Essential cookies (such as your region preference) are always on. See our <a href="/cookies/">cookie policy</a> for details.</p>' +
      '<div class="fc-cookie-actions">' +
        '<button type="button" class="fc-accept">Accept all</button>' +
        '<button type="button" class="fc-decline">Essential only</button>' +
      '</div>';
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('show'); });

    banner.querySelector('.fc-accept').addEventListener('click', function () {
      setCookie(COOKIE_NAME, 'granted', COOKIE_DAYS);
      applyConsent('granted');
      banner.remove();
    });
    banner.querySelector('.fc-decline').addEventListener('click', function () {
      setCookie(COOKIE_NAME, 'denied', COOKIE_DAYS);
      applyConsent('denied');
      banner.remove();
    });
  }

  // Set GA4 Consent Mode v2 defaults BEFORE any tag fires
  if (typeof window.gtag === 'function') {
    var existing = getCookie(COOKIE_NAME);
    var defaultState = existing === 'granted' ? 'granted' : 'denied';
    window.gtag('consent', 'default', {
      ad_storage: defaultState,
      ad_user_data: defaultState,
      ad_personalization: defaultState,
      analytics_storage: defaultState,
      wait_for_update: 500
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!getCookie(COOKIE_NAME)) build();
  });
})();
