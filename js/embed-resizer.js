/* FinCalcHub embed resizer — posts body height to the parent window so the
   host site's iframe can auto-resize. Wire format MUST match the FC embed
   bundle's listener in js/embed/_shared.js. */
(function () {
  // Derive the slug from the URL: /embed/<slug>/ → <slug>
  var match = location.pathname.match(/\/embed\/([^/]+)\//);
  var slug = match ? match[1] : "unknown";

  var lastHeight = 0;
  function postHeight() {
    var h = document.body.scrollHeight;
    if (h === lastHeight) return;
    lastHeight = h;
    window.parent.postMessage(
      { type: "bct-embed-resize", slug: slug, height: h },
      "*"
    );
  }

  // Use the same wire `bct-embed-resize` type so a single listener
  // implementation can serve both BC and FC bundles.

  document.addEventListener("DOMContentLoaded", postHeight);
  window.addEventListener("load", postHeight);
  window.addEventListener("resize", postHeight);

  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(postHeight);
    document.addEventListener("DOMContentLoaded", function () {
      ro.observe(document.body);
    });
  } else {
    // Fallback: poll every 500 ms for clients without ResizeObserver.
    setInterval(postHeight, 500);
  }
})();
