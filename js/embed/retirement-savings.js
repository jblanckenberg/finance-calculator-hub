/* FC embed retirement-savings — built from _shared.js + _entry_retirement-savings.js */
(function() {
/* FC embed shared boot — inlined into each per-slug bundle by build_fc_embeds.py.
   Builds iframe + Powered-by anchor + postMessage resize listener. */
function fchEmbedBoot(opts) {
  var containerId = "fch-embed-" + opts.slug;
  var container = document.getElementById(containerId);
  if (!container) {
    if (window.console) console.warn("[FC embed] container #" + containerId + " not found");
    return;
  }
  if (container.getAttribute("data-fch-mounted") === "1") return;
  container.setAttribute("data-fch-mounted", "1");

  var origin = "https://finncalc.com"; // replaced by build_fc_embeds.py

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed/" + opts.slug + "/";
  iframe.title = opts.label;
  iframe.loading = "lazy";
  iframe.style.cssText =
    "width:100%;border:0;display:block;height:600px;background:#fff;";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  );
  container.appendChild(iframe);

  // Powered-by anchor — sibling of iframe, on host page (DOFOLLOW backlink).
  var credit = document.createElement("p");
  credit.style.cssText =
    "font-size:11px;color:#666;text-align:right;margin:6px 0 0 0;font-family:system-ui,sans-serif;";
  credit.appendChild(document.createTextNode("⚡ "));
  var link = document.createElement("a");
  link.href = origin + "/" + opts.slug + "/?utm_source=embed&utm_medium=widget&utm_campaign=" + encodeURIComponent(opts.slug);
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Powered by " + opts.brand;
  link.style.color = "#1E88E5";
  link.style.textDecoration = "none";
  credit.appendChild(link);
  container.appendChild(credit);

  window.addEventListener("message", function (event) {
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== origin) return;
    var data = event.data;
    if (!data || data.type !== "bct-embed-resize") return;
    if (data.slug !== opts.slug) return;
    if (typeof data.height !== "number" || !isFinite(data.height)) return;
    var h = Math.max(200, Math.min(4000, Math.floor(data.height)));
    iframe.style.height = h + "px";
  });
}

fchEmbedBoot({ slug: "retirement-savings", brand: "FinCalcHub", label: "Retirement Savings Calculator" });

})();
