// One-off bulk updater. Rewrites the nav + footer on every HTML page so the
// new category sub-hubs (/retirement/, /mortgage-calculators/, /tax/) are
// surfaced in the global chrome.
//
// Strategy: exact-string replacement of two known multi-line blocks (the
// nav block and the footer-links block). Both blocks are hand-copy-pasted
// into every page and identical across files, so a deterministic string
// replace is safe and reviewable. Files that don't contain the pattern
// (404, embed iframes, _build templates) are skipped.
//
// Run from C:/FIN_CALC_SITE/Finance_Calculator_Hub:
//   node scripts/_update-nav-footer.mjs

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "C:/FIN_CALC_SITE/Finance_Calculator_Hub";

// ---------- Nav: 5-item layout with the new sub-hubs ----------
// Old: All Calculators / Compound Interest / Retirement / Take-Home Pay / Mortgage
// New: All Calculators / Retirement / Mortgage / Tax / Blog
//
// Points "Retirement" at the new /retirement/ hub (was /retirement-savings/
// calc), "Mortgage" at /mortgage-calculators/ (was /mortgage/ calc), drops
// "Take-Home Pay" (subsumed by /tax/), drops "Compound Interest" (still
// reachable from /retirement/ and the home page), adds a top-level Blog link.

// finncalc HTML files use CRLF line endings (Windows convention), so the
// multi-line search/replace patterns also have to be CRLF for the exact-
// string match to succeed. Both blocks below get \r\n joins explicitly.

const NAV_OLD = [
  "<nav>",
  '    <a href="/personal-finance-calculators/">All Calculators</a>',
  '    <a href="/compound-interest/">Compound Interest</a>',
  '    <a href="/retirement-savings/">Retirement</a>',
  '    <a href="/take-home-pay/">Take-Home Pay</a>',
  '    <a href="/mortgage/">Mortgage</a>',
  "  </nav>",
].join("\r\n");

const NAV_NEW = [
  "<nav>",
  '    <a href="/personal-finance-calculators/">All Calculators</a>',
  '    <a href="/retirement/">Retirement</a>',
  '    <a href="/mortgage-calculators/">Mortgage</a>',
  '    <a href="/tax/">Tax</a>',
  '    <a href="/blog/">Blog</a>',
  "  </nav>",
].join("\r\n");

// Blog posts use a single-line minified nav (no whitespace between tags).
// Same logical layout, different physical form.
const NAV_OLD_INLINE =
  '<nav><a href="/personal-finance-calculators/">All Calculators</a><a href="/compound-interest/">Compound Interest</a><a href="/retirement-savings/">Retirement</a><a href="/take-home-pay/">Take-Home Pay</a><a href="/mortgage/">Mortgage</a></nav>';

const NAV_NEW_INLINE =
  '<nav><a href="/personal-finance-calculators/">All Calculators</a><a href="/retirement/">Retirement</a><a href="/mortgage-calculators/">Mortgage</a><a href="/tax/">Tax</a><a href="/blog/">Blog</a></nav>';

// ---------- Footer: inline 3 new hub links after "All Calculators" ----------
// Old has 8 links: All Calculators / Blog / About / Contact / Privacy / Terms /
// Cookies / Disclosure. Inject Retirement / Mortgage & Loans / Tax & Pay
// between All Calculators and Blog. 11 links total — still fits on one line at
// desktop, wraps cleanly on mobile because the existing CSS flexes.

const FOOTER_OLD =
  '<div class="footer-links"><a href="/">All Calculators</a><a href="/blog/">Blog</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cookies/">Cookies</a><a href="/disclosure/">Disclosure</a></div>';

const FOOTER_NEW =
  '<div class="footer-links"><a href="/">All Calculators</a><a href="/retirement/">Retirement</a><a href="/mortgage-calculators/">Mortgage &amp; Loans</a><a href="/tax/">Tax &amp; Pay</a><a href="/blog/">Blog</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cookies/">Cookies</a><a href="/disclosure/">Disclosure</a></div>';

// ---------- Walk + transform ----------

async function* walkHtml(dir) {
  // Skip dirs we should never modify
  const SKIP = new Set([
    "node_modules",
    ".git",
    "_build",
    "_docs",
    "fonts",
    "embed",
    "article_pipeline_brd",
    "docs",
    "screenshots",
  ]);
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkHtml(p);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      yield p;
    }
  }
}

let scanned = 0;
let navUpdated = 0;
let footerUpdated = 0;
const navMissing = [];
const footerMissing = [];

for await (const file of walkHtml(ROOT)) {
  scanned++;
  let src = await readFile(file, "utf8");
  let changed = false;

  if (src.includes(NAV_OLD)) {
    src = src.replace(NAV_OLD, NAV_NEW);
    navUpdated++;
    changed = true;
  } else if (src.includes(NAV_OLD_INLINE)) {
    src = src.replace(NAV_OLD_INLINE, NAV_NEW_INLINE);
    navUpdated++;
    changed = true;
  } else if (src.includes("<nav>") && src.includes("personal-finance-calculators")) {
    navMissing.push(file);
  }

  if (src.includes(FOOTER_OLD)) {
    src = src.replace(FOOTER_OLD, FOOTER_NEW);
    footerUpdated++;
    changed = true;
  } else if (src.includes("footer-links") && src.includes("Disclosure")) {
    footerMissing.push(file);
  }

  if (changed) await writeFile(file, src, "utf8");
}

console.log(`Scanned ${scanned} .html files`);
console.log(`  Nav updated: ${navUpdated}`);
console.log(`  Footer updated: ${footerUpdated}`);
if (navMissing.length) {
  console.log(`  Nav pattern not found (manual check) — ${navMissing.length}:`);
  for (const f of navMissing) console.log(`    ${f}`);
}
if (footerMissing.length) {
  console.log(`  Footer pattern not found (manual check) — ${footerMissing.length}:`);
  for (const f of footerMissing) console.log(`    ${f}`);
}
