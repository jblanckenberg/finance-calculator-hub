// One-off date refresher. Every .html page on finncalc was touched today
// by the global nav/footer rollout (PR #3) and the GSC index fixes (PR #4),
// so every page legitimately has a 2026-05-19 lastmod. This sends Google
// a coherent freshness signal across both the sitemap AND the per-page
// JSON-LD dateModified blocks.
//
// Run from C:/FIN_CALC_SITE/Finance_Calculator_Hub:
//   node scripts/_refresh-dates.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "C:/FIN_CALC_SITE/Finance_Calculator_Hub";
const TODAY = "2026-05-19";

// ---------- sitemap.xml ----------
const smPath = join(ROOT, "sitemap.xml");
let sm = await readFile(smPath, "utf8");
const smBefore = sm.match(/<lastmod>2026-05-\d{2}<\/lastmod>/g)?.length ?? 0;
sm = sm.replace(/<lastmod>2026-05-\d{2}<\/lastmod>/g, `<lastmod>${TODAY}</lastmod>`);
await writeFile(smPath, sm, "utf8");
console.log(`sitemap.xml: ${smBefore} <lastmod> dates → ${TODAY}`);

// ---------- per-page dateModified in JSON-LD ----------
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

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(p);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield p;
  }
}

let pagesScanned = 0;
let pagesUpdated = 0;
const dmRe = /"dateModified":\s*"2026-05-\d{2}"/g;
const dmNew = `"dateModified": "${TODAY}"`;

for await (const file of walkHtml(ROOT)) {
  pagesScanned++;
  const src = await readFile(file, "utf8");
  if (!dmRe.test(src)) continue;
  // RegExp.test moves lastIndex on /g — reset before replace
  dmRe.lastIndex = 0;
  const next = src.replace(dmRe, dmNew);
  if (next !== src) {
    await writeFile(file, next, "utf8");
    pagesUpdated++;
  }
}

console.log(`HTML pages scanned: ${pagesScanned}`);
console.log(`Pages with dateModified updated: ${pagesUpdated}`);
