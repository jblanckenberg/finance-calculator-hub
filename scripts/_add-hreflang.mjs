// One-off hreflang inserter. finncalc has six families where a parent
// calculator page coexists with /uk/ /us/ /za/ regional variants but
// none of them carry <link rel="alternate" hreflang="..."> tags. Without
// hreflang, Google may treat the family as near-duplicate and only
// index one — which is why GSC's "Crawled - currently not indexed"
// bucket is full of regional variant URLs.
//
// This script inserts a hreflang block (en + en-GB + en-US + en-ZA where
// they exist, plus x-default → parent) into every page in each family,
// right after the existing <link rel="canonical"> tag. Idempotent: skips
// files that already contain `hreflang="en"`.
//
// Run from C:/FIN_CALC_SITE/Finance_Calculator_Hub:
//   node scripts/_add-hreflang.mjs

import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "C:/FIN_CALC_SITE/Finance_Calculator_Hub";
const SITE = "https://finncalc.com";

// Each family: { base, regions: ["uk","us","za",...] }
// `base` is the parent slug (e.g. "compound-interest"). `regions` is the
// list of region sub-slugs that exist under it as /<base>/<region>/.
const FAMILIES = [
  { base: "compound-interest", regions: ["uk", "us"] },
  { base: "mortgage", regions: ["uk", "us"] },
  { base: "retirement-savings", regions: ["uk", "us"] },
  { base: "take-home-pay", regions: ["uk", "us", "za"] },
  { base: "investment-growth", regions: ["uk"] },
  { base: "inflation-impact", regions: ["uk"] },
];

// hreflang → URL for each region. en-GB / en-US / en-ZA are the standard
// locale codes. We also emit a plain `en` and `x-default` that both point
// at the parent (Google's recommended fallback).
const REGION_HREFLANG = {
  uk: "en-GB",
  us: "en-US",
  za: "en-ZA",
};

function buildHreflangBlock(base, regions) {
  const parent = `${SITE}/${base}/`;
  const lines = [`  <link rel="alternate" hreflang="en" href="${parent}" />`];
  for (const r of regions) {
    const tag = REGION_HREFLANG[r];
    if (!tag) continue;
    lines.push(
      `  <link rel="alternate" hreflang="${tag}" href="${SITE}/${base}/${r}/" />`,
    );
  }
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${parent}" />`);
  return lines.join("\r\n");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

let inserted = 0;
let skipped = 0;
let missing = [];

for (const fam of FAMILIES) {
  const filesInFamily = [join(ROOT, fam.base, "index.html")];
  for (const r of fam.regions) {
    filesInFamily.push(join(ROOT, fam.base, r, "index.html"));
  }

  const block = buildHreflangBlock(fam.base, fam.regions);

  for (const file of filesInFamily) {
    if (!(await exists(file))) {
      missing.push(file);
      continue;
    }
    const src = await readFile(file, "utf8");

    if (src.includes('hreflang="en"')) {
      skipped++;
      continue;
    }

    // Find the canonical line and insert the hreflang block right after it.
    const canonRe = /<link rel="canonical" href="[^"]+"[^>]*>/;
    const match = src.match(canonRe);
    if (!match) {
      console.log(`  no canonical found in: ${file}`);
      continue;
    }
    const insertAfter = match.index + match[0].length;
    const next =
      src.slice(0, insertAfter) +
      "\r\n" +
      block +
      src.slice(insertAfter);
    await writeFile(file, next, "utf8");
    inserted++;
  }
}

console.log(`hreflang blocks inserted: ${inserted}`);
console.log(`pages already had hreflang (skipped): ${skipped}`);
if (missing.length) {
  console.log(`files declared in FAMILIES but not on disk:`);
  for (const f of missing) console.log(`  ${f}`);
}
