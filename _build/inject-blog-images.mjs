// Inject 3 <figure class="article-figure"> blocks into each finncalc blog
// article's index.html using credits from blog/_credits.json.
//   hero    — immediately AFTER the <div class="article-meta"> ... </div> block
//   mid     — before the H2 at floor(n / 2)
//   bottom  — before the H2 at floor(n * 0.75), backing off if it lands on
//             a clearly-final heading.
//
// Idempotent: skips files that already contain <figure class="article-figure">.

import fs from "node:fs/promises";
import path from "node:path";

const FINAL_HEADING_HINTS = [
  "bottom line",
  "key takeaways",
  "summary",
  "conclusion",
  "next step",
  "actionable next",
  "ready to",
  "wrap-up",
  "wrap up",
  "sources",
  "faq",
];

function figureHtml(meta, priority) {
  const altSafe = String(meta.alt).replace(/"/g, "&quot;");
  const loading = priority ? "eager" : "lazy";
  const fp = priority ? ` fetchpriority="high"` : "";
  return `    <figure class="article-figure">
      <img src="${meta.src}" alt="${altSafe}" width="940" height="650" loading="${loading}"${fp} decoding="async">
      <figcaption>Photo by <a href="${meta.url}" rel="noopener nofollow">${meta.name}</a> on <a href="https://www.pexels.com" rel="noopener nofollow">Pexels</a></figcaption>
    </figure>`;
}

function injectIntoHtml(html, slug, per) {
  if (html.includes('<figure class="article-figure">')) return null;

  // 1. Hero — find <div class="article-meta"> then the FIRST </div> after it.
  //    Safer than a regex (the article-meta div contains <a> tags but no
  //    nested divs, so the first </div> is the correct one).
  const metaOpen = '<div class="article-meta">';
  const openIdx = html.indexOf(metaOpen);
  if (openIdx === -1) throw new Error(`${slug}: no <div class="article-meta">`);
  const closeIdx = html.indexOf("</div>", openIdx);
  if (closeIdx === -1) throw new Error(`${slug}: no </div> after article-meta`);
  const afterMeta = closeIdx + "</div>".length;
  const heroBlock = "\n\n" + figureHtml(per.hero, true) + "\n";
  html = html.slice(0, afterMeta) + heroBlock + html.slice(afterMeta);

  // 2. Find every <h2> position. Use a global regex with `m` so `^` matches
  //    start of a line. Capture the leading whitespace so we know it's on
  //    its own line (defensive: skip H2s that appear mid-line).
  const h2Re = /(^|\n)([ \t]*)<h2[^>]*>([^<]*)<\/h2>/g;
  const h2s = [];
  let mm;
  while ((mm = h2Re.exec(html)) !== null) {
    // Insert position is right BEFORE the leading whitespace + <h2>.
    // mm.index points to the matched `^` or `\n`. We want to insert
    // AT the start of the line that contains the <h2>.
    const lineStart = mm[1] === "\n" ? mm.index + 1 : 0;
    h2s.push({ insertAt: lineStart, title: mm[3] });
  }
  if (h2s.length < 3) {
    throw new Error(`${slug}: only ${h2s.length} H2`);
  }

  // 3. Pick mid and bottom heading indexes, backing off final headings.
  const n = h2s.length;
  const midI = Math.max(1, Math.floor(n / 2));
  let botI = Math.max(midI + 1, Math.floor(n * 0.75));
  const isFinal = (title) =>
    FINAL_HEADING_HINTS.some((h) => title.toLowerCase().includes(h));
  while (botI < n && isFinal(h2s[botI].title)) {
    botI--;
    if (botI <= midI) {
      botI = midI + 1;
      break;
    }
  }
  // Also back off mid if it landed on a final-ish heading.
  let m = midI;
  while (m > 1 && isFinal(h2s[m].title)) m--;

  // 4. Insert bottom first (higher offset) to preserve earlier offsets.
  const inserts = [
    { i: h2s[botI].insertAt, block: figureHtml(per.bottom, false) + "\n\n" },
    { i: h2s[m].insertAt, block: figureHtml(per.mid, false) + "\n\n" },
  ];
  inserts.sort((a, b) => b.i - a.i);
  for (const ins of inserts) {
    html = html.slice(0, ins.i) + ins.block + html.slice(ins.i);
  }

  // 5. Update Article schema's image array to include the hero (best for SEO).
  const imgFieldRe = /"image"\s*:\s*\[[^\]]*\]/;
  if (imgFieldRe.test(html)) {
    const heroAbs = `https://finncalc.com${per.hero.src}`;
    html = html.replace(imgFieldRe, `"image": [${JSON.stringify(heroAbs)}]`);
  }
  return html;
}

async function main() {
  const credits = JSON.parse(
    await fs.readFile("blog/_credits.json", "utf8"),
  );
  let edited = 0,
    skipped = 0,
    failed = 0;
  for (const [slug, per] of Object.entries(credits)) {
    if (!per.hero || !per.mid || !per.bottom) {
      console.warn(`  ! ${slug}: incomplete credits`);
      failed++;
      continue;
    }
    const file = path.join("blog", slug, "index.html");
    let html;
    try {
      html = await fs.readFile(file, "utf8");
    } catch {
      console.warn(`  ! ${slug}: no index.html`);
      failed++;
      continue;
    }
    try {
      const updated = injectIntoHtml(html, slug, per);
      if (updated === null) {
        console.log(`  skip ${slug} (already has figures)`);
        skipped++;
        continue;
      }
      await fs.writeFile(file, updated);
      console.log(`  ok   ${slug}`);
      edited++;
    } catch (e) {
      console.error(`  !!   ${slug}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n${edited} edited, ${skipped} skipped, ${failed} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
