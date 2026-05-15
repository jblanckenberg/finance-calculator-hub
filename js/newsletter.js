// js/newsletter.js — minimal Beehiiv form embed; replace BEEHIIV_FORM_URL once provisioned.
(function () {
  var BEEHIIV_FORM_URL = "https://finncalc.beehiiv.com/subscribe";
  var slot = document.getElementById("newsletter-slot");
  if (!slot) return;
  slot.innerHTML =
    '<section class="newsletter">' +
    '<h2>One short email a month</h2>' +
    '<p>New calculators, money tactics, and personal-finance numbers worth knowing. No spam.</p>' +
    '<form action="' + BEEHIIV_FORM_URL + '" method="post" target="_blank">' +
    '<label for="nl-email" class="sr-only">Email address</label>' +
    '<input id="nl-email" type="email" name="email" required placeholder="you@example.com">' +
    '<button type="submit">Subscribe</button>' +
    '</form>' +
    '</section>';
})();
