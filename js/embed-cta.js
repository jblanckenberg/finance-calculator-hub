/* FC embed-CTA: renders a copy-snippet <details> block into a target slot.
   Mounted on the 4 top-FC calc pages by appending a <div id="embed-cta-slot"
   data-slug="..."></div> + <script src="/js/embed-cta.js" defer> just above
   the footer in each page. */
(function () {
  var slot = document.getElementById("embed-cta-slot");
  if (!slot) return;
  var slug = slot.getAttribute("data-slug");
  if (!slug) return;

  var snippet =
    '<div id="fch-embed-' + slug + '"></div>\n' +
    '<script async src="https://finncalc.com/js/embed/' + slug + '.js"></' + 'script>';

  // Build markup
  var details = document.createElement("details");
  details.style.cssText =
    "margin:32px 0;padding:20px;background:#f8f9fa;border-radius:8px;border-left:4px solid #1B3A5C";

  var summary = document.createElement("summary");
  summary.style.cssText = "cursor:pointer;font-weight:600;color:#1B3A5C";
  summary.textContent = "Embed this calculator on your site (free)";
  details.appendChild(summary);

  var p = document.createElement("p");
  p.style.cssText = "margin-top:12px;font-size:14px;color:#1A1A2E";
  p.innerHTML =
    "Copy and paste the snippet below into any HTML page. The calculator " +
    "loads in an auto-resizing iframe with no setup required. A small " +
    "<em>Powered by FinCalcHub</em> credit appears below the calculator — " +
    "please leave it in place.";
  details.appendChild(p);

  var pre = document.createElement("pre");
  pre.style.cssText =
    "margin-top:12px;padding:12px;background:#fff;border:1px solid #D1D9E0;border-radius:6px;overflow-x:auto;font-family:Menlo,monospace;font-size:12px;color:#1A1A2E";
  pre.textContent = snippet;
  details.appendChild(pre);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Copy embed code";
  btn.style.cssText =
    "margin-top:12px;padding:8px 16px;background:#1B3A5C;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer";
  btn.addEventListener("click", function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(snippet).then(function () {
      btn.textContent = "Copied!";
      setTimeout(function () {
        btn.textContent = "Copy embed code";
      }, 2500);
      if (window.plausible) {
        window.plausible("Embed CTA Click", { props: { slug: slug } });
      }
    });
  });
  details.appendChild(btn);

  slot.appendChild(details);
})();
