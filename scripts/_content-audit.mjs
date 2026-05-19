// Phase 1 content audit for the AdSense "Low value content" remediation.
// Produces a per-page visible-word-count table sorted ascending, flags
// everything under 1,200 visible words, and analyses near-duplication
// between regional variants (uk/us/za) and their parent calculator page.
//
// Run from C:/FIN_CALC_SITE/Finance_Calculator_Hub:
//   node scripts/_content-audit.mjs
//
// Output: writes the audit to
// C:/BizProfitCalc/_plans/2026-05-19-finncalc-content-audit.md

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = "C:/FIN_CALC_SITE/Finance_Calculator_Hub";
const REPORT = "C:/BizProfitCalc/_plans/2026-05-19-finncalc-content-audit.md";
const THRESHOLD = 1200;

// Directories we don't audit (build artefacts, embeds, etc.)
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
  "seo_keyword_research",
]);

async function* walkHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkHtml(p);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield p;
  }
}

// Strip everything that isn't visible body prose:
// - <head> block (metadata, JSON-LD)
// - <script> and <style> blocks (analytics, schema, css)
// - all HTML tags
// - HTML entities normalised to spaces
// - collapse whitespace
function extractVisible(html) {
  let s = html;
  // Drop head completely
  s = s.replace(/<head[\s\S]*?<\/head>/gi, " ");
  // Drop script / style / noscript blocks
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Drop header + footer chrome (consistent across every page; not "content")
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  // Drop remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  // Drop HTML entities
  s = s.replace(/&[#\w]+;/g, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .match(/[a-z][a-z'\-]*/g) || [];
}

function uniqueWords(arr) {
  return new Set(arr);
}

const pages = [];

for await (const file of walkHtml(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const html = await readFile(file, "utf8");
  const text = extractVisible(html);
  const tokens = tokenize(text);
  pages.push({
    rel,
    chars: text.length,
    words: tokens.length,
    uniqueWordCount: uniqueWords(tokens).size,
    tokens,
  });
}

pages.sort((a, b) => a.words - b.words);

// ---------- Regional variant near-duplicate analysis ----------
// For each parent calc with regional variants, measure: how many words
// in the variant DON'T appear in the parent? Higher = more regional
// uniqueness.

const FAMILIES = [
  { base: "compound-interest", regions: ["uk", "us"] },
  { base: "mortgage", regions: ["uk", "us"] },
  { base: "retirement-savings", regions: ["uk", "us"] },
  { base: "take-home-pay", regions: ["uk", "us", "za"] },
  { base: "investment-growth", regions: ["uk"] },
  { base: "inflation-impact", regions: ["uk"] },
];

const familyReports = [];

for (const fam of FAMILIES) {
  const parentRel = `${fam.base}/index.html`;
  const parent = pages.find((p) => p.rel === parentRel);
  if (!parent) continue;

  const variants = [];
  for (const r of fam.regions) {
    const vRel = `${fam.base}/${r}/index.html`;
    const v = pages.find((p) => p.rel === vRel);
    if (!v) continue;

    const parentVocab = uniqueWords(parent.tokens);
    const variantVocab = uniqueWords(v.tokens);
    const uniqueInVariant = [...variantVocab].filter(
      (w) => !parentVocab.has(w),
    );
    const overlapPct =
      variantVocab.size > 0
        ? (
            ([...variantVocab].filter((w) => parentVocab.has(w)).length /
              variantVocab.size) *
            100
          ).toFixed(0)
        : "0";

    variants.push({
      region: r,
      rel: vRel,
      words: v.words,
      uniqueWordsVsParent: uniqueInVariant.length,
      vocabularyOverlapPct: overlapPct,
    });
  }

  familyReports.push({
    base: fam.base,
    parentWords: parent.words,
    parentRel,
    variants,
  });
}

// ---------- Compose markdown report ----------

const today = new Date().toISOString().slice(0, 10);
const underThreshold = pages.filter((p) => p.words < THRESHOLD);

let md = `# finncalc content audit — Phase 1 of AdSense remediation\n\n`;
md += `**Date:** ${today}\n`;
md += `**Threshold:** ${THRESHOLD} visible words per page (the floor AdSense's "low value content" check is most likely measuring against)\n`;
md += `**Pages audited:** ${pages.length}\n`;
md += `**Pages under threshold:** ${underThreshold.length}\n\n`;

md += `## Summary\n\n`;
md += `${underThreshold.length} of ${pages.length} pages fall below the 1,200-visible-word floor. `;
md += `These are the most likely contributors to AdSense's "Low value content" verdict and the priority targets for Phase 2 content padding.\n\n`;

md += `## All pages by visible word count (ascending)\n\n`;
md += `| Page | Visible words | Unique vocabulary |\n`;
md += `|---|--:|--:|\n`;
for (const p of pages) {
  const flag = p.words < THRESHOLD ? " ⚠️" : "";
  md += `| \`/${p.rel.replace(/\/index\.html$/, "/").replace(/^index\.html$/, "")}\`${flag} | ${p.words} | ${p.uniqueWordCount} |\n`;
}

md += `\n## Pages under the 1,200-word threshold (Phase 2 priorities)\n\n`;
if (underThreshold.length === 0) {
  md += `_None — every page exceeds the threshold._\n\n`;
} else {
  md += `| Page | Visible words | Padding needed |\n`;
  md += `|---|--:|--:|\n`;
  for (const p of underThreshold) {
    md += `| \`/${p.rel.replace(/\/index\.html$/, "/").replace(/^index\.html$/, "")}\` | ${p.words} | ${THRESHOLD - p.words} |\n`;
  }
}

md += `\n## Regional variant duplicate analysis (Phase 3 targets)\n\n`;
md += `For each hreflang family, the vocabulary overlap % shows how much of the variant's word set already appears in the parent. **High overlap (≥85%) = near-duplicate** and a likely AdSense red flag. Target: ≤75% overlap, or equivalently 300+ unique-vs-parent words.\n\n`;

for (const fam of familyReports) {
  md += `### \`${fam.base}\`\n\n`;
  md += `Parent: \`/${fam.parentRel.replace(/\/index\.html$/, "/")}\` — ${fam.parentWords} visible words.\n\n`;
  md += `| Region | Visible words | Unique vs parent | Vocabulary overlap |\n`;
  md += `|---|--:|--:|--:|\n`;
  for (const v of fam.variants) {
    const flag = Number(v.vocabularyOverlapPct) >= 85 ? " ⚠️" : "";
    md += `| ${v.region} | ${v.words} | ${v.uniqueWordsVsParent} | ${v.vocabularyOverlapPct}%${flag} |\n`;
  }
  md += `\n`;
}

md += `## Recommended Phase 2 + Phase 3 order\n\n`;
md += `1. **Phase 2 — thin pages first.** Pad each under-threshold page to ≥1,300 visible words (1,200 floor + buffer). Same pattern that worked for buscalctools: add a "Worked example" + "Common mistakes" + "When to use" trio per page.\n`;
md += `2. **Phase 3 — region variant differentiation.** Add 300-500 words of region-specific content to each variant flagged with ≥85% vocabulary overlap. Topics already drafted in the remediation plan (UK ISA wrappers, US 401k flowchart, SA medical-tax-credit, etc.).\n`;
md += `3. **Phase 4 — methodology depth on top calcs.** Add a "Methodology & sources" block to the 6 highest-traffic pages.\n\n`;
md += `Phases 2-4 produce ~10-13 hours of content writing across the site. Then deploy + wait 24-48h for re-crawl, then resubmit to AdSense.\n`;

await writeFile(REPORT, md, "utf8");
console.log(`Wrote audit to ${REPORT}`);
console.log(`Pages audited: ${pages.length}`);
console.log(`Pages under ${THRESHOLD} words: ${underThreshold.length}`);
