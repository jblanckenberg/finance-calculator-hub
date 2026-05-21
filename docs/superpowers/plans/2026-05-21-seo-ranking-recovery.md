# FinCalc + BusCalc SEO Ranking Recovery — Master Plan

> **Source:** `C:\FIN_CALC_SITE\SEO_Ranking_Recovery_Plan.docx` (v1.0, 2026-05-21, James Blanckenberg)
> **Branch:** `seo-ranking-recovery-2026-05-21` (off `seo-remediation-2026-05-21` HEAD `0354b29`)
> **Successor to:** `2026-05-21-finncalc-seo-remediation.md` (technical fixes shipped) — now subsumed under Phase 1
> **Defers:** `2026-05-21-finncalc-ctr-optimization.md` (premature — see Phase 5)
> **Scope:** BOTH finncalc.com AND buscalctools.com (treated as a pair throughout)

## Diagnostic correction

Earlier this session I dispatched a CTR optimisation plan against finncalc.com's GSC data, treating "high impressions, low clicks" as a snippet-rewriting problem. The recovery doc reframes it correctly:

**The issue is RANK POSITION, not CTR.** Position 80 gets ~0% CTR even with a perfect title.

GSC 3-month baseline:

| Site | Clicks | Impressions | Avg Position | Verdict |
|---|---|---|---|---|
| buscalctools.com | 1 | 660 | ~56 | Page 6 |
| finncalc.com | 7 | 4,373 | ~81 | Page 9 |

Root causes (in order of impact):
1. **New site sandbox** — both launched within last month. Google requires 3-6 months to trust new domains.
2. **Zero backlinks** — single biggest ranking factor for new sites.
3. **Extreme keyword competition** — targeting head terms ("mortgage calculator", "business calculator") owned by NerdWallet / Bankrate / MoneySavingExpert / GOV.UK. Unreachable in 6-12 months.
4. **Geographic targeting drift** — finncalc has 3,869 UK impressions at position 84. UK pages not strongly enough geo-targeted.
5. **Thin E-E-A-T signals** — no author bylines visible to Google, no reviewedBy markup, no review schema on calculators.

Realistic timeline: **3-6 months**. Anyone promising faster is selling something.

## The 4 (+1) phases

| Phase | Window | Theme | Owner |
|---|---|---|---|
| **1** | Weeks 1-2 | Foundation Fixes | Mix: operator dashboards + code work |
| **2** | Weeks 2-6 | Long-Tail Keyword Pivot | Code work (build 20+ new pages) |
| **3** | Weeks 4-12 | Backlink Building | Operator-led (directories, HARO, Reddit, embeds) |
| **4** | Ongoing | Content Depth on Existing Pages | Code work (10x audit + deepen) |
| **5** | Month 3+ | CTR Optimisation | Code work — see deferred `2026-05-21-finncalc-ctr-optimization.md` |

---

## Phase 1 — Foundation Fixes (Weeks 1-2)

Quick wins + technical fixes that don't move rank directly but prevent Phase 2-3 investment from being wasted.

### Task 1.1 — Cloudflare Crawler Hints (operator action — 10 min)

**What it does:** automates IndexNow pings to Bing/Yandex on every page change.

**Operator steps:**
1. Cloudflare dashboard → buscalctools.com → Cache → Crawler Hints → toggle ON.
2. Repeat for finncalc.com.

**Verify:** within 48h, Bing Webmaster Tools shows increased crawl activity.

**Troubleshooting:**
- "Crawler Hints" not visible → requires Cloudflare proxy (orange cloud) enabled on DNS records.
- No improvement after 48h → verify in Bing Webmaster Tools that IndexNow key is detected.

### Task 1.2 — Bing Webmaster Tools setup (operator action — 20 min)

**Operator steps:**
1. bing.com/webmasters → sign in with Microsoft account.
2. Add site → `https://buscalctools.com` → "Import from Google Search Console" (one click, no DNS verification).
3. Repeat for `https://finncalc.com`.
4. Submit sitemap URL for each: `https://buscalctools.com/sitemap.xml` and `https://finncalc.com/sitemap.xml`.

**Verify:** Bing Webmaster dashboard populates within 24-48h.

### Task 1.3 — Googlebot crawler verification (operator action — 5 min, PowerShell)

**Why:** Cloudflare aggressive bot-fight mode can throttle Googlebot. Need to confirm 200 status.

**Operator commands (PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://buscalctools.com" -UserAgent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -Method Head | Select-Object StatusCode, Headers
Invoke-WebRequest -Uri "https://finncalc.com" -UserAgent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -Method Head | Select-Object StatusCode, Headers
```

**Expected:** StatusCode 200 on both.

**Troubleshooting:**
- 403/503/429 → Cloudflare → Security → Bots → Bot Fight Mode OFF + Super Bot Fight Mode → allow "Verified Bots".
- 200 but empty body → check Cloudflare → Security → WAF rules matching Googlebot user agent.

### Task 1.4 — Schema author + reviewedBy markup (CODE — finncalc side)

**Why:** explicit E-E-A-T signals on YMYL (Your Money Your Life) pages. Google heavily favours content with named, verifiable authors.

**Files (finncalc):**
- Modify: `_build/templates/partials/head_schema.html` — add `Person` object referencing `/authors/james-blanckenberg/` as `author` on all calculator pages; add `reviewedBy` on YMYL pages.
- Create: `_build/scripts/inject_author_schema_rendered.py` — propagate to rendered HTML via hand-edit patcher (per EXECUTION POLICY, no `_build/generate.py`).
- Create: `_build/tests/test_author_schema_present.py` — assert every calculator page has `Person` schema + every YMYL page has `reviewedBy`.

**Files (buscalc — separate branch + repo):**
- Modify: `lib/seo.ts` (or wherever `calculatorMetadata` helper lives) — verify `Person` + `reviewedBy` schema is being injected. If partially missing, complete.
- buscalc uses Next.js + next-seo, so no rendered patcher needed.

**Verify:** Google Rich Results Test (`search.google.com/test/rich-results`) — paste each URL, confirm `Person` + `reviewedBy` detected without errors.

### Task 1.5 — Internal linking — Related Calculators block (CODE)

**Why:** pages with more internal links rank higher. Forces Google to re-evaluate deeper pages.

**Files (finncalc):**
- Create or extend: `_build/templates/partials/related_calculators.html` — a 6-link "Related Calculators" block.
- Modify: `_build/templates/_base.html` — include the partial above the footer on every calculator page.
- Create: `_build/scripts/inject_related_calculators_rendered.py` — propagate to rendered HTML.
- Body-text contextual links — for each of the top-5 highest-impression pages from Phase 1 baseline (mortgage/uk, isa-calculator, take-home-pay/za, etc.), add 3-5 in-body contextual links to related calculators + blog posts.

**Files (buscalc):**
- Verify `RelatedTools.tsx` exists + renders on every calculator + relations are contextually relevant.

**Verify:** within 2-3 weeks, GSC Coverage report shows previously orphaned pages climbing.

---

## Phase 2 — Long-Tail Keyword Pivot (Weeks 2-6)

**The most important phase.** Stop trying to rank for head terms. Start ranking for specific long-tail variants Google has ALREADY decided to serve our sites for.

### Strategy

Build dedicated pages for queries with 50-500 monthly searches where we can hit position 1-3 within 4-8 weeks, capturing 30-50% CTR. Three long-tail wins beat one head-term failure.

### Task 2.1 — finncalc.com long-tail pages (10 new pages)

GSC data already shows what Google wants to serve us for. Each row below is a high-impression query with no dedicated page yet. Build one per row.

| # | Target Keyword | GSC Impressions | New URL |
|---|---|---|---|
| 1 | mortgage calculator with tax and insurance | 1+ | `/mortgage/uk/with-tax-and-insurance/` |
| 2 | mortgage calculator 5 year fixed | 1+ | `/mortgage/uk/5-year-fixed/` |
| 3 | uk rpi inflation calculator | 1+ | `/inflation-impact/uk/rpi/` |
| 4 | cash isa growth calculator | 1+ | `/isa-calculator/cash-isa-growth/` |
| 5 | how much do i need to retire at 55 | 21 | `/retirement/by-age/retire-at-55/` |
| 6 | stocks and shares isa calculator | 19 | `/isa-calculator/stocks-and-shares/` |
| 7 | bad credit home loan calculator | 1+ | `/mortgage/uk/bad-credit/` |
| 8 | first time home loan calculator | 1+ | `/mortgage/uk/first-time-buyer/` |
| 9 | sp500 calculator uk | 1+ | `/investment-growth/uk/sp500/` |
| 10 | irs compound interest calculator | 2 | `/compound-interest/usa/irs/` |

### Task 2.2 — buscalctools.com long-tail / deepening (4 actions)

| Target Keyword | Impressions | Action |
|---|---|---|
| profit margin vs markup | 28 | Deepen existing `/blog/profit-margin-vs-markup-difference` (Phase 4 also) |
| business loan repayment calculator | 18 | Add schema + variants to existing `/business-loan-calculator` |
| markup vs profit | 10 | Add as H2 section in `/blog/profit-margin-vs-markup-difference` |
| cost plus vs value based pricing | 1 (pos 11!) | Push existing `/blog/value-based-pricing-vs-cost-plus` to #1 |

### Task 2.3 — Page build template (Section 4.4 of recovery doc)

Every new long-tail page must hit this minimum spec:

- **URL:** keyword-rich, slash-separated, lowercase, hyphens.
- **H1:** exact-match target keyword (humanised).
- **Title tag:** 55-60 chars, keyword in first 30 chars, brand at end.
- **Meta description:** 150-160 chars, keyword + benefit + light CTA.
- **Content:** 1,500-2,500 words. H2s derived from Google "People Also Ask" for that keyword.
- **Calculator widget at the top** (the actual tool — primary reason users came).
- **FAQ section at the bottom** with 5-7 Q&As → populates FAQPage schema.
- **Internal links:** from minimum 3 existing pages (one of them a high-impression page from Phase 1 baseline).
- **Schema:** `WebApplication` + `HowTo` + `FAQPage` all on the same page.
- **Geo signal in copy:** explicitly mention UK / USA / ZA in H1, intro paragraph, and at least one H2.

### Task 2.4 — Geographic targeting fix — finncalc UK pages (CODE)

Data shows 3,869 UK impressions at position 84. Google IS showing us; the geo signals are too weak.

**For every existing UK-specific finncalc page:**
1. Add `hreflang` tag in `<head>`:
   ```html
   <link rel="alternate" hreflang="en-GB" href="https://finncalc.com/mortgage/uk/" />
   ```
2. Body copy: open with "UK mortgage calculator for..." not just "mortgage calculator for...". Explicit beats implicit.
3. Use £ as primary currency throughout, mention UK lenders (Nationwide, Halifax, Barclays) in context, reference UK tax rules (Stamp Duty, SDLT) where relevant.
4. Schema markup add:
   ```json
   "areaServed": { "@type": "Country", "name": "United Kingdom" }
   ```
   inside the existing `WebApplication` schema.

**Files (finncalc):**
- Modify: `_build/templates/_base.html` or `head_meta.html` partial → conditional hreflang based on page URL.
- Create: `_build/scripts/inject_hreflang_rendered.py` — rendered patcher.
- Create: `_build/tests/test_uk_pages_have_hreflang.py`.

---

## Phase 3 — Backlink Building (Weeks 4-12, operator-led)

Zero backlinks is the single largest constraint. Runs in parallel with Phase 2 starting Week 4.

### 3.1 Quick wins (Weeks 4-6) — free, high-conversion

| Tactic | What to do | Effort |
|---|---|---|
| Free directories | Submit both sites to: Crunchbase, F6S, BetaList, AlternativeTo, SaaSHub, Product Hunt, Indie Hackers, FinanceMagnates directory | Low |
| Calculator directories | Submit to: calculator.com, omnicalculator alternatives lists, Reddit r/personalfinance wiki (carefully) | Low |
| Reddit value-first | 5 questions/week on r/personalfinance, r/UKPersonalFinance, r/SouthAfrica where the calculator is the EXACT answer. Comment with answer + link as supporting evidence. | Medium |
| Quora answers | 3 high-quality answers/week. Link only when truly the best resource. | Medium |
| LinkedIn articles | 1 article/week on your LinkedIn referencing one of your calculators with a worked example. Your Deloitte / consulting network is the audience. | Medium |

### 3.2 Medium-effort (Weeks 6-10)

- **HARO / Connectively / Featured.com / Qwoted** — sign up as a finance/tax/SA-retail expert. Respond to 3 journalist queries/week. Each placement = backlink from a real publication.
- **Guest posts on SA finance blogs** — pitch 2/month: JustOneLap, Investec Focus, Finweek, BusinessTech.co.za. Topic angle: "How I built a free calculator for X" using the sites as the working example.
- **Statistics/data pages** — build one page per site that is genuinely link-worthy: e.g. "UK Average Net Worth by Age — 2026 Update" or "SA SME Profit Margin Benchmarks by Industry". These get linked by other blogs as a source.
- **Embed your calculators** — buscalctools has `/embed/` route. Reach out to 20 small finance/SME blogs offering free embeddable calculators. Each embed = 1 backlink.

### 3.3 What NOT to do

- Do NOT buy backlinks from Fiverr/Upwork (Google detects + penalises).
- Do NOT reciprocal link schemes ("I link to you if you link to me") — Google detects link patterns.
- Do NOT mass-post on forums with link in signature — flagged spam within days.
- Do NOT use PBNs (Private Blog Networks) — Google guideline violation, can de-index.

### 3.4 Tracking

- GSC → Links report (left sidebar) — check weekly.
- Ahrefs Webmaster Tools (FREE for site owners) at `ahrefs.com/webmaster-tools` — verifies via GSC.

**Target:** 20-50 referring domains by Week 8-12.

---

## Phase 4 — Content Depth on Existing Pages (Ongoing, Week 4+)

Top-impression pages are ranking deep because they're not comprehensive enough vs NerdWallet/MoneySavingExpert.

### 10x content audit (per page)

1. Google the target keyword.
2. Open top 3 ranking pages (competitors).
3. List every H2/H3 they cover that you don't.
4. Add those sections to your page, written better and more specifically (with actual numbers, examples, your own data).
5. Aim for 1.5-2x competitor word count and depth.

### Priority pages — finncalc.com (CODE)

| Page | Current Position | Target State |
|---|---|---|
| `/mortgage/uk/` | 87.9 | 5,000+ words, regional breakdowns (London/Manchester/etc), 2026 BoE rate impact section, 10+ FAQs, embedded video walkthrough |
| `/investment-growth/uk/` | 70.7 | Add S&P500/FTSE100/MSCI World comparison tables, real historical return data, inflation-adjusted scenarios |
| `/student-loan-calculator/` | 65.7 | Add UK Plan 1/2/4/5 + US federal + SA NSFAS variants in one calculator with explainer for each |
| `/isa-calculator/` | 72.2 | Split into Cash/Stocks/Lifetime/JISA variants, each with own page (overlaps Phase 2) |

### Priority pages — buscalctools.com (CODE)

| Page | Current Position | Target State |
|---|---|---|
| `/blog/cost-plus-pricing-explained` | 49.0 | 5 worked industry examples (SaaS, e-commerce, services, manufacturing, retail), comparison tables, downloadable spreadsheet |
| `/blog/profit-margin-vs-markup-difference` | 46.0 | Conversion table (every % from 5-100%), interactive calc embed at top, decision tree "which one to use when" |
| `/business-loan-calculator` | 82.2 | UK, USA, SA loan type breakdowns (SBA, BBLS aftermath, SEDA), regional interest rate context |
| `/cost-per-unit-calculator` | 50.0 | Manufacturing vs e-commerce vs services examples, COGS allocation explainer, link to break-even |

---

## Phase 5 — CTR Optimisation (DEFERRED to Month 3+)

Once average position climbs into striking distance (positions 11-30) on a meaningful number of queries, execute the CTR plan at `2026-05-21-finncalc-ctr-optimization.md`. The plan stays committed but is gated behind Phase 1-4 completion.

**Trigger condition:** at least 15 queries on finncalc and 10 on buscalctools at position ≤20 in a 90-day GSC export.

---

## Week-by-week schedule

### Week 1 — Foundation
- [ ] Enable Cloudflare Crawler Hints on both domains (Task 1.1) — 10 min
- [ ] Verify both sites in Bing Webmaster Tools, submit sitemaps (Task 1.2) — 20 min
- [ ] Run Googlebot status check PowerShell (Task 1.3) — 5 min
- [ ] Test 5 random URLs from each site in Google Rich Results Test — log any errors — 30 min
- [ ] In GSC, URL Inspection on top-10 high-impression pages → Request Indexing for each — 20 min

### Week 2 — Schema + internal linking
- [ ] Audit Person/Author schema on every calculator + blog page on both sites (Task 1.4) — 2 hours
- [ ] Add `reviewedBy` schema to YMYL pages (any tax/mortgage/retirement/investment calc) — 1 hour
- [ ] Related Calculators block on every calculator (Task 1.5) — 2 hours
- [ ] From each top-10 highest-impression page, manually add 3-5 contextual links — 2 hours

### Week 3 — First long-tail pages (finncalc)
- [ ] Build `/mortgage/uk/with-tax-and-insurance/` — 4 hours
- [ ] Build `/retirement/by-age/retire-at-55/` — 3 hours
- [ ] Build `/isa-calculator/stocks-and-shares/` — 3 hours
- [ ] Each page follows the Task 2.3 template. Submit to GSC for indexing after publish.

### Week 4 — buscalctools long-tail + backlink kick-off
- [ ] Deepen `/blog/profit-margin-vs-markup-difference` per Task 4 — 4 hours
- [ ] Submit both sites to all directories from Task 3.1 — 3 hours
- [ ] First Reddit value-first comment (not spammy) — 30 min
- [ ] Sign up for HARO / Connectively / Featured.com — 30 min

### Week 5 — Geo targeting + 2 more long-tail pages
- [ ] Add hreflang + geo schema to every `/uk/`, `/usa/`, `/za/` subfolder on finncalc (Task 2.4) — 3 hours
- [ ] Build `/mortgage/uk/5-year-fixed/` — 3 hours
- [ ] Build `/inflation-impact/uk/rpi/` — 3 hours
- [ ] Reply to 5 HARO queries — 1 hour

### Week 6 — Review + adjust
- [ ] Export new GSC (last 28 days). Compare to Week 1 baseline.
- [ ] Identify NEW striking-distance keywords (pos 11-30) → next sprint targets.
- [ ] Identify pages that CLIMBED ≥10 positions → signals what's working.
- [ ] Identify pages that DROPPED → diagnose (often: thin content vs new pages).
- [ ] Adjust Weeks 7-12 plan based on data.

### Weeks 7-12 — Compounding
- Maintain pace: 2 new long-tail pages per week.
- Continue HARO/Reddit/Quora at consistent volume (5 of each/week).
- Pitch 2 guest posts per month.
- Deepen 1 existing high-impression page per week (Phase 4 audit).
- **Week 12 target:** 24+ new long-tail pages, 20-50 backlinks, 10+ pages newly on page 1-2.

---

## Success metrics

### Leading indicators (Weeks 1-4) — move first

| Metric | Baseline (today) | Target by Week 4 |
|---|---|---|
| Pages indexed in Google | ~32 / ~35 | 60+ / 60+ |
| Striking-distance keywords (pos 11-30) | 2 / 5 | 15+ / 30+ |
| Referring domains | 0 / 0 | 5+ / 5+ |
| Bing impressions/month | Unknown | 100+ / 500+ |

### Lagging indicators (Weeks 4-12) — move 4-8 weeks after leading

| Metric | Baseline (today) | Target by Week 12 |
|---|---|---|
| Total clicks (28d) | 1 / 7 | 100+ / 300+ |
| Total impressions (28d) | 660 / 4,373 | 5,000+ / 20,000+ |
| Avg position | 56 / 81 | 35 / 40 |
| Keywords ranking on page 1 (pos 1-10) | 0 / 0 | 15+ / 25+ |
| Referring domains | 0 / 0 | 20+ / 30+ |

### The honest realistic view

Hitting Week 12 targets requires consistent execution every week. Skip 2-3 weeks → push everything out by 4-6 weeks. Google moves on its own schedule once you stop feeding it new signals.

If by Week 6 you have NOT seen at least 10 striking-distance keywords AND at least 5 backlinks → something is wrong. Most likely cause: pages being built are not high enough quality. Diagnose by comparing new pages side-by-side with top-3 ranking competitor pages for the same keyword.

---

## Tools & monitoring stack

### Required (all free)

| Tool | Purpose |
|---|---|
| Google Search Console | Already in use. Check weekly: Performance + Coverage + Links reports. |
| Bing Webmaster Tools | Mirror data for Bing. Setup in Week 1. |
| Google Rich Results Test | Validate schema markup on every new page. |
| Ahrefs Webmaster Tools | FREE for site owners. Backlink monitoring + basic keyword data. |
| Cloudflare Analytics | Real traffic (not bot-filtered like GA). Check weekly. |
| Google PageSpeed Insights | Run after each major change. Mobile score target 85+. |

### Optional but recommended

| Tool | Cost | Purpose |
|---|---|---|
| Ubersuggest | Free / $29/mo | Keyword research, content gap analysis |
| Microsoft Clarity | Free | Already on finncalc. Add to buscalctools for free heatmaps + session recordings. |
| Plausible Analytics | $9/mo | Privacy-friendly, lighter than GA4 |

### Do NOT buy yet

- Ahrefs/SEMrush paid plans ($99-$199/mo) — overkill until 50+ backlinks. Use free tools first.
- AI "SEO content writers" — produce average content. Pages need to be best-in-class, requires human research and editing.
- Paid backlink services — never. See Phase 3.3.

---

## The 3 things that matter most

If you do nothing else from this plan, do these three:

1. **Pivot from head terms to long-tail (Phase 2).** Stop chasing "mortgage calculator". Build 20+ pages targeting specific long-tail variants. Fastest visible wins (4-8 weeks).
2. **Get to 20 backlinks by Week 12 (Phase 3).** No schema fix, no content depth, no CTR rewrite outperforms 20 quality backlinks on a new domain. Make this a weekly habit.
3. **Geographic clarity (Task 2.4).** finncalc is bleeding 4,000+ UK impressions/month at page 9. Hreflang + explicit geo signals could move a third of those onto page 1-3 within 4 weeks.

**Re-evaluate at Week 6.** Export GSC again, compare to baseline. If leading indicators are moving → keep going. If flat → most likely new pages are not differentiated enough.

---

## Code-only task breakdown (what I can dispatch via subagent-driven-development)

Operator-only items above are dashboard work I cannot do. Code work I CAN dispatch on this branch:

| # | Task | Repo | Estimate |
|---|---|---|---|
| C1 | Schema author + reviewedBy markup on finncalc — `head_schema.html` + rendered patcher + test | finncalc | 1.5 h |
| C2 | Related Calculators sidebar partial + rendered patcher + test | finncalc | 2 h |
| C3 | hreflang tags on UK pages + geo `areaServed` schema + rendered patcher + test | finncalc | 2 h |
| C4 | Build long-tail page 1: `/mortgage/uk/with-tax-and-insurance/` — calculator page from scratch following Task 2.3 template | finncalc | 4 h |
| C5 | Build long-tail page 2: `/retirement/by-age/retire-at-55/` | finncalc | 3 h |
| C6 | Build long-tail page 3: `/isa-calculator/stocks-and-shares/` | finncalc | 3 h |
| C7-C13 | Build long-tail pages 4-10 (7 more pages) | finncalc | ~24 h |
| C14 | Deepen `/blog/profit-margin-vs-markup-difference` (10x audit) | buscalc | 4 h |
| C15 | Add schema + variants to `/business-loan-calculator` | buscalc | 3 h |
| C16 | Push `/blog/value-based-pricing-vs-cost-plus` to #1 (depth audit) | buscalc | 3 h |
| C17 | Deepen 4 priority finncalc pages (Phase 4) | finncalc | ~16 h |
| C18 | Deepen 4 priority buscalc pages (Phase 4) | buscalc | ~16 h |

Total code work: ~85 hours across both repos.

The operator-led work (Phase 3 backlinks, weekly outreach, HARO replies) is ~3-5h/week for 12 weeks = 36-60h.

---

## Next-action recommendation

**Right now:**
1. Operator runs Task 1.1, 1.2, 1.3 (dashboard / PowerShell, ~35 min total) — Week 1 prerequisites.
2. I dispatch C1-C3 in parallel via subagent-driven-development (schema author + related calculators + hreflang). These deliver the technical foundation without depending on new content.
3. Once C1-C3 land, operator decides which long-tail page to start with (C4 is the highest-impression target per the GSC data).

**Why this order:** Phase 1 dashboard actions need ~24-48h to propagate (Bing crawl pickup, GSC indexation). While that's settling, C1-C3 give us the technical underpinnings that future long-tail pages will inherit. Then C4 onwards is sustained page-build work, 1 page per week minimum.
