# Design — Content-Gap Quick Wins (Wave 6)

> **Source:** `docs/content-gap-analysis.md` (Wave 5, 2026-05-12).
> **Decided build order:** stamp duty → 3-region take-home comparison → SA-tax landing.
> **Owner:** James Blanckenberg. **Date:** 2026-05-13.

## Purpose

Ship the three remaining "quick wins" identified in the content-gap analysis. Glossary (#1) is already live; this spec covers #2, #3, and the supporting SA-region landing page.

Each page is an isolated commit so any one can be reverted or iterated on without disturbing the others.

## Out of scope

- Tier 2 items (first-time buyer suite, pension calculators, cross-region salary comparison content) — separate Wave 7.
- Tier 3 items (city pages, data study, embeddable widget) — long-horizon.
- Tier 4 items (generic compound interest / retirement / US credit-card content) — explicit "do not fight" per the gap doc.
- Refreshing the existing `take-home-pay/` page's 2024 tax brackets to 2025/2026 figures. **Flagged** — current page uses 2024 brackets in body copy + FAQ. This is a known accuracy gap but a separate concern from "build new pages". I'll note it in the commit message for the comparison page (which has to read the same brackets) so it can be addressed in a follow-up.
- New shared tax module / JS extraction. We replicate bracket constants per page to match the codebase's "static HTML, vanilla JS, no build" pattern. If brackets later get tedious to keep in sync, that's a Wave 8 refactor.

## Architecture (shared across all 3 pages)

Each new calculator follows the existing pattern at `compound-interest/index.html` and `take-home-pay/index.html`:

- **One file per page:** `<slug>/index.html` containing HTML + page-local `<script>` for the calc.
- **Shared assets:** `/css/main.css`, `/css/print.css`, `/js/region.js` (region toggle + `formatMoney`), `/js/main.js`, `/js/analytics-events.js`, `/js/cookie-consent.js`.
- **Page head boilerplate matches existing calculators:** charset, theme-color, viewport, title, meta description, canonical, OG tags, font preload, stylesheets, GA4 (`G-5FSP8WRB3C`), AdSense placeholder.
- **Two JSON-LD blocks per page:** `WebApplication` (the calculator) + `FAQPage` (5+ Q&As, per Phase 5.7 of the SEO checklist).
- **No new dependencies.** No build step. Open the HTML, it works.
- **Sitemap:** add a `<url>` entry to `sitemap.xml` for each new page, with `<lastmod>` set to the commit date.
- **Internal linking:** each new page links to its supporting blog post (already in the repo) and to 2–3 related calculators in a "Related calculators" section, matching the pattern in existing pages.
- **Accessibility:** labels for every input, `aria-live="polite"` on results region, keyboard-navigable, no colour-only signals — same as existing pages.

## Page 1 — `/stamp-duty-calculator/`

### URL & metadata
- **Path:** `stamp-duty-calculator/index.html`
- **Title:** `UK Stamp Duty Calculator 2026 (SDLT) | FinCalcHub`
- **Description:** `Free UK stamp duty calculator (SDLT) for 2026. Standard rates, first-time buyer relief, second-home surcharge, non-UK-resident surcharge. England & NI.`
- **Canonical:** `https://finncalc.com/stamp-duty-calculator/`
- **Scope:** SDLT (England + Northern Ireland) only. Scotland (LBTT) and Wales (LTT) are out of scope for v1 — they have different bands and a "UK stamp duty" search rarely surfaces them in the top 3. A future page can address LBTT/LTT if traffic justifies.

### Inputs
- Property price (£) — number input, min 0.
- Buyer type — radio: `Standard purchase` / `First-time buyer` / `Additional property (second home / buy-to-let)`.
- Non-UK resident — checkbox (adds +2% surcharge on top of the selected buyer-type rate).

### Math — SDLT bands (April 2025 onwards)

| Band | Rate (standard) |
|---|---|
| £0 – £125,000 | 0% |
| £125,001 – £250,000 | 2% |
| £250,001 – £925,000 | 5% |
| £925,001 – £1,500,000 | 10% |
| Over £1,500,000 | 12% |

**First-time-buyer relief** (purchase ≤ £500,000): 0% to £300,000, 5% on £300,001 – £500,000. Above £500,000, standard rates apply (no relief).

**Additional-property surcharge:** +5% on every band (since 31 Oct 2024).

**Non-UK-resident surcharge:** +2% on every band, stacks on top of the additional-property surcharge if both apply.

**Calculation logic:**

```
total = 0
for each band:
  taxable_in_band = clamp(price - band_lower, 0, band_upper - band_lower)
  total += taxable_in_band * effective_rate
```

`effective_rate` for each band = base rate + (5% if additional property) + (2% if non-UK resident). First-time-buyer is a different band set entirely (only applies to standard purchases ≤ £500k).

**Verification:** Before shipping, I'll cross-check three representative figures against gov.uk's SDLT calculator (£250k standard, £500k first-time-buyer, £750k additional property + non-resident). If any discrepancy >£1, the page does not ship.

### Output
- Total SDLT due (£, formatted).
- Effective rate (% of price).
- Banded breakdown (per-band amount) — collapsible.

### FAQ topics (5)
1. What is UK stamp duty (SDLT)?
2. When do you pay stamp duty?
3. Is there stamp duty for first-time buyers?
4. Do I pay extra stamp duty on a second home?
5. Does this calculator cover Scotland or Wales? (Answer: no — links to gov.uk LBTT / LTT pages.)

### Internal links
- Outbound: `blog/how-much-is-stamp-duty-uk/`, `blog/how-much-house-can-i-afford/`, `mortgage/`.
- Inbound (added in same commit): `mortgage/index.html` gains a "See: stamp duty calculator" link in its FAQ; `blog/how-much-is-stamp-duty-uk/index.html` gains a CTA at the top linking to the new tool.

### Schema
- `WebApplication` (name, description, url, applicationCategory: `FinanceApplication`, price 0 GBP).
- `FAQPage` (the 5 questions above).
- `BreadcrumbList` (Home → Stamp Duty Calculator).

## Page 2 — `/take-home-pay-comparison/`

### URL & metadata
- **Path:** `take-home-pay-comparison/index.html`
- **Title:** `Take-Home Pay Comparison: USA vs UK vs South Africa | FinCalcHub`
- **Description:** `Compare net salary across the USA, UK, and South Africa side-by-side at the same gross income. Free, no signup. Updated for 2025/2026 tax brackets.`
- **Canonical:** `https://finncalc.com/take-home-pay-comparison/`

### Inputs
- Gross annual income (one number) — entered once.
- Display currency — radio: `USD` / `GBP` / `ZAR` / `Show each in its own currency`. Default: "Show each in its own currency".
- Optional: PPP-adjusted toggle. **Decision: NO PPP for v1.** Purchasing-power adjustment opens up arguments over which PPP source to use, and the gap-doc framing is "what would my paycheck look like" not "what would my life cost". A separate `/cost-of-living-comparison/` page (Tier 1, future Wave) is the right home for PPP.
- If "Show each in its own currency": user enters one number; we treat that number as if it were the gross salary in each region's currency. (So `100,000` = $100,000 in USA, £100,000 in UK, R100,000 in SA — *not* a converted value.) This is the only interpretation that's both useful and doesn't require live FX rates. Made explicit in the page copy.
- If a target currency is picked: input gross in that currency, we convert to the other two using a published FX snapshot (hard-coded with `lastmod` date — no live rate API).

### Math
- Three independent tax calculations, one per region. Logic is **lifted from the existing `take-home-pay/index.html`** but kept page-local (no shared module — see "out of scope").
- Brackets used: **2025/2026** for each region. (US federal 2025; UK 2025/26 with frozen personal allowance + NI rates; SA 2025/26 SARS tables.) This page is the canary for the bracket-refresh follow-up flagged above — its constants will be cited correctly and the page copy will name "2025/26 brackets" in plain text + the FAQ.
- Each region's calc produces: gross, total tax, NI/FICA/UIF, net pay (annual + monthly).
- Output table: 3 columns side-by-side, with a "biggest take-home" callout.

### FAQ topics (6)
1. How can I compare salaries across countries?
2. Why is take-home pay so different between the US, UK, and South Africa?
3. Does this calculator account for state taxes or city taxes?
4. What about health insurance / NHS / medical aid?
5. Are these 2025/2026 tax brackets?
6. Can I compare two specific states or cities? (Answer: no — links to `take-home-pay/` for state-level US detail.)

### Internal links
- Outbound: `take-home-pay/`, `blog/salary-after-tax/`, `blog/south-africa-tax-guide-2024/`, `blog/uk-personal-allowance-2024-25/`.
- Inbound: `take-home-pay/index.html` gains a "Compare across 3 countries" link in its intro.

### Schema
- `WebApplication`, `FAQPage`, `BreadcrumbList` — same pattern.

### Risk note
This page is the headline differentiator from the gap analysis ("zero competitors offer this"). Worth a careful Lighthouse + mobile-render check before commit, since it's the one where layout has to handle a 3-column table on a 360px screen.

## Page 3 — `/sa-tax-calculator/`

### URL & metadata
- **Path:** `sa-tax-calculator/index.html`
- **Title:** `South Africa Tax Calculator 2025/26 (PAYE + UIF) | FinCalcHub`
- **Description:** `Free South Africa income tax calculator. SARS 2025/26 brackets, PAYE, UIF, medical-aid credits, retirement-annuity deduction. Monthly & annual.`
- **Canonical:** `https://finncalc.com/sa-tax-calculator/`

### Why a separate page from `/take-home-pay/`
- The gap analysis says SA is finncalc's "beachhead" — the SA SERP for "tax calculator south africa" has no calculator-tool competition (only SARS, accounting software, and Old Mutual).
- An SA-locked URL with SA-only copy, SA-only schema, SA-only FAQ, and a `/sa-…` slug ranks better for SA-google than a multi-region page where "South Africa" is one of three options.
- The math is largely the same as the SA branch of `/take-home-pay/`, but the page is positioned and indexed differently. **No content duplication penalty risk** because the surrounding copy, FAQ, schema, and URL are distinct.

### Inputs
- Gross annual income (R)
- Pay frequency — radio: `Monthly` / `Annual` (just changes input UX; math is the same).
- Age — radio: `Under 65` / `65–74` / `75+` (controls the SARS age-based rebates).
- Retirement annuity contribution (R/yr) — optional, applies the 27.5% / R350,000 deduction cap.
- Medical aid — number of dependants (0/1/2/3+) for the medical scheme fee tax credit.

### Math — SA 2025/26 (SARS)
- Standard income tax brackets (SARS 2025/26 — verified against sars.gov.za before shipping).
- Apply primary rebate (R17,235), plus secondary (65+) and tertiary (75+) rebates as appropriate.
- Apply medical scheme fee tax credit (R364/month for first two members, R246/month for each additional — figures to be verified against the SARS 2025/26 update before shipping).
- Apply RA deduction (lesser of contribution, 27.5% of taxable income, R350,000).
- UIF: 1% of gross salary, capped at R177.12/month (monthly salary cap R17,712).

### Output
- Annual tax, monthly tax, monthly UIF, monthly net pay, effective tax rate.
- Banded breakdown.

### FAQ topics (6)
1. What is PAYE in South Africa?
2. How is South African income tax calculated?
3. What is UIF and who pays it?
4. How much tax do I pay on R500,000 / R1,000,000? (Targeted long-tail; mirrors the existing blog post.)
5. How does a Retirement Annuity reduce my tax?
6. What are SARS medical aid tax credits?

### Internal links
- Outbound: `blog/how-much-tax-on-r500000-south-africa/`, `blog/south-africa-tax-guide-2024/`, `blog/retirement-planning-south-africa/`, `blog/what-is-paye-south-africa/`, `take-home-pay/`.
- Inbound: `take-home-pay/index.html` gains "South African user? Use our SA-specific calculator" link inside the SA-region block.

### Schema
- `WebApplication`, `FAQPage`, `BreadcrumbList`.

## Build sequence

Each step is its own commit, ships independently, gets pushed to main.

1. **Commit 1 — stamp duty.** Create `stamp-duty-calculator/index.html`, update `sitemap.xml`, add internal links in `mortgage/` and `blog/how-much-is-stamp-duty-uk/`. Verify SDLT figures against gov.uk for 3 test cases. Local smoke-test in browser.
2. **Commit 2 — take-home-pay comparison.** Create `take-home-pay-comparison/index.html`, update `sitemap.xml`, add link from `take-home-pay/`. Run Lighthouse on the new page. Verify the 3-column layout on a 360px viewport before commit.
3. **Commit 3 — SA tax calculator.** Create `sa-tax-calculator/index.html`, update `sitemap.xml`, add link from `take-home-pay/`. Verify R500k and R1m totals against the existing blog post's worked example (which should agree with sars.gov.za).
4. **Post-commit-3 — IndexNow ping** (via existing GitHub Action on push to main) submits all three new URLs to Bing / Yandex. No manual action needed.

## Verification gates

Before each commit:
- [ ] Schema validates in Google's Rich Results Test (paste-and-check).
- [ ] HTML validates (W3C validator — paste page source).
- [ ] Lighthouse mobile score ≥ 90 (Performance, Accessibility, Best Practices, SEO).
- [ ] All inputs keyboard-navigable.
- [ ] Math hand-checked against 3 worked examples per page.
- [ ] No console errors on page load or calc trigger.
- [ ] All internal links resolve to existing files.

After all three commits:
- [ ] `sitemap.xml` includes all three new URLs with current `lastmod`.
- [ ] Memory updated: a `project_wave6_quickwins.md` note recording what shipped + which tax-year brackets were used.

## Open questions for review

- **None blocking.** All design choices above are stated; any pushback can revise in place.
- **Optional:** would you prefer the SA calc to be `/sa-tax-calculator/` or `/south-africa-tax-calculator/`? The shorter slug is what I've specified above (less typing in mobile address bars, matches existing pattern like `/take-home-pay/`). If you want the longer slug, say so.
