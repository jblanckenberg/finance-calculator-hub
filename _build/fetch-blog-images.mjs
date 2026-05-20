// Fetch 3 Pexels images per finncalc blog post -> blog/<slug>/{hero,mid,bottom}.jpg
// Writes blog/_credits.json for the inject step.
// Usage: node _build/fetch-blog-images.mjs

import fs from "node:fs/promises";
import path from "node:path";

const KEY =
  process.env.PEXELS_API_KEY ||
  "t0qbhdimcFEN4DlVxLDzhIGwzPRgSieU26G4j4WlQmarW5VcJ2lYAmEY";

const PLAN = {
  "401k-contribution-paycheck": [
    "401k retirement savings",
    "paycheck deduction stub",
    "retirement calculator desk",
  ],
  "4-percent-rule-retirement": [
    "retirement planning couple",
    "elderly couple beach",
    "retirement savings jar",
  ],
  "50-30-20-budget-rule": [
    "budget planning notebook",
    "money envelope cash",
    "household finances desk",
  ],
  "average-net-worth-by-age": [
    "net worth growth chart",
    "savings investment growth",
    "financial advisor desk",
  ],
  "build-wealth-in-your-30s": [
    "young professional office",
    "investment growth chart",
    "financial planning meeting",
  ],
  "compound-interest-explained": [
    "money plant growth",
    "savings jar coins",
    "growth chart finance",
  ],
  "debt-avalanche-vs-snowball": [
    "credit card debt",
    "debt freedom celebration",
    "financial paperwork pen",
  ],
  "how-inflation-affects-savings": [
    "inflation rising prices",
    "shrinking dollar money",
    "grocery shopping prices",
  ],
  "how-much-emergency-fund": [
    "piggy bank savings",
    "emergency fund jar",
    "rainy day umbrella money",
  ],
  "how-much-house-can-i-afford": [
    "house keys handover",
    "real estate buying",
    "home mortgage paperwork",
  ],
  "how-much-is-stamp-duty-uk": [
    "UK terrace houses",
    "house keys paperwork",
    "real estate UK",
  ],
  "how-much-tax-on-r500000-south-africa": [
    "south africa city skyline",
    "tax forms calculator",
    "south africa office",
  ],
  "how-much-to-retire-at-55": [
    "early retirement beach",
    "retired couple smiling",
    "retirement portfolio planning",
  ],
  "how-much-to-save-each-month": [
    "monthly savings jar",
    "budget calculator desk",
    "piggy bank money",
  ],
  "how-much-to-save-for-retirement-at-35": [
    "retirement planning chart",
    "investment growth desk",
    "financial advisor meeting",
  ],
  "how-to-create-a-monthly-budget": [
    "budget spreadsheet laptop",
    "monthly planner notebook",
    "household finance desk",
  ],
  "investment-growth-calculator-guide": [
    "stock market chart",
    "investment portfolio desk",
    "financial advisor laptop",
  ],
  "net-worth-at-40": [
    "professional office success",
    "balance sheet calculator",
    "financial growth chart",
  ],
  "pay-off-credit-card-debt": [
    "credit card scissors",
    "debt freedom celebration",
    "financial paperwork pen",
  ],
  "pay-off-loan-early": [
    "loan paperwork pen",
    "mortgage payoff celebration",
    "house keys handover",
  ],
  "rent-vs-buy": [
    "apartment rental keys",
    "house buying real estate",
    "moving boxes home",
  ],
  "retirement-planning-south-africa": [
    "south africa coastline",
    "elderly south african couple",
    "retirement savings desk",
  ],
  "salary-after-tax": [
    "payslip paperwork desk",
    "office worker laptop",
    "salary calculation desk",
  ],
  "save-for-house-deposit": [
    "piggy bank house",
    "saving for home jar",
    "real estate keys handover",
  ],
  "south-africa-tax-guide-2024": [
    "south africa city",
    "tax calculator forms",
    "south africa office worker",
  ],
  "uk-national-insurance-explained": [
    "UK payslip paperwork",
    "UK government documents",
    "UK office worker desk",
  ],
  "uk-personal-allowance-2024-25": [
    "UK currency pounds",
    "UK tax forms calculator",
    "UK office worker laptop",
  ],
  "uk-state-pension-guide": [
    "UK elderly couple",
    "retirement pension UK",
    "elderly woman tea",
  ],
  "what-is-401k-employer-match": [
    "office workers meeting",
    "retirement benefits paperwork",
    "401k savings investment",
  ],
  "what-is-paye-south-africa": [
    "south africa office worker",
    "payslip paperwork desk",
    "south africa city",
  ],
};

const POSITIONS = ["hero", "mid", "bottom"];

async function pexelsSearch(query) {
  const url =
    "https://api.pexels.com/v1/search?per_page=3&orientation=landscape&query=" +
    encodeURIComponent(query);
  const r = await fetch(url, { headers: { Authorization: KEY } });
  if (!r.ok) throw new Error(`Pexels ${r.status} for "${query}"`);
  const j = await r.json();
  return j.photos || [];
}

async function download(url, target) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(target, buf);
  return buf.length;
}

async function main() {
  const credits = {};
  const blogRoot = path.resolve("blog");
  for (const [slug, queries] of Object.entries(PLAN)) {
    const dir = path.join(blogRoot, slug);
    await fs.mkdir(dir, { recursive: true });
    credits[slug] = {};
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      const pos = POSITIONS[i];
      try {
        const photos = await pexelsSearch(q);
        if (!photos.length) {
          console.warn(`  ! no results for ${slug} ${pos}: "${q}"`);
          continue;
        }
        const p = photos[0];
        const file = path.join(dir, `${pos}.jpg`);
        const bytes = await download(p.src.large, file);
        credits[slug][pos] = {
          query: q,
          src: `/blog/${slug}/${pos}.jpg`,
          alt: p.alt || `${slug} ${pos} illustration`,
          name: p.photographer,
          url: p.photographer_url,
          bytes,
        };
        console.log(
          `  ok ${slug}/${pos}.jpg  ${Math.round(bytes / 1024)}KB  by ${p.photographer}`,
        );
      } catch (e) {
        console.error(`  ! ${slug}/${pos}: ${e.message}`);
      }
    }
  }
  await fs.writeFile(
    path.join(blogRoot, "_credits.json"),
    JSON.stringify(credits, null, 2),
  );
  console.log("\nwrote blog/_credits.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
