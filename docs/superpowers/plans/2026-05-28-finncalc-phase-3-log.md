# FinnCalc Phase 3 — Operator Log

Plan: `docs/superpowers/plans/2026-05-28-finncalc-phase-3-cwv-and-content-cluster.md`

## Retire-at-55 article — pre-edit state (2026-05-28)

File audited: `blog/how-much-to-retire-at-55/index.html`

### Title tag
- Current `<title>`: `How Much Do You Need to Retire at 55? | FinCalcHub`
- Character count: **50** (within the 50-60 standard, but the trim target shortens it further to align with the cluster naming convention used for `at-60` / `at-62` / `at-65` siblings)

### Meta description
- Current `<meta name="description">`: `Find out exactly how much you need saved to retire at 55, how the 4% rule changes for a longer retirement, and how to bridge the gap to pension access.`
- Character count: **151** (within the 150-160 standard — no change required by Task 2.2)

### Structured data present
- `Article` JSON-LD: **YES** (line 40 — `dateModified: 2026-05-19`, `datePublished: 2024-06-15`)
- `BreadcrumbList` JSON-LD: **YES** (line 76)
- `Person` JSON-LD (author): **YES** (line 78)
- `FAQPage` JSON-LD: **NO** — neither `"@type":"FAQPage"` nor `"@type": "FAQPage"` found. There is a prose H2 "FAQ" section (line 194) but no schema markup wrapping it.
- `HowTo` JSON-LD: **NO** — not present.

### Internal links — calculator targets
- `/retirement-savings/`: **YES** — three references (top CTA box L108, mid-article CTA box L146, "Actionable Next Steps" link L187, related-calculators grid L205)
- `/fire-calculator/`: **NO** — not linked. The FIRE movement section (L138-145) discusses Lean/Fat/Barista/Coast FIRE in prose but does not link out to the FIRE calculator.
- `/coast-fire-calculator/`: **NO** — not linked. Coast FIRE is mentioned in the FIRE list item (L144) but not linked.
- `/retirement-drawdown-calculator/`: **NO** — not linked (will be added via the new related-calc CTA paragraph).

### Internal links — age-series siblings
- `/blog/how-much-to-retire-at-60/`: **NO** — sibling article does not exist yet (created in Phase 3 Task 3.x).
- `/blog/how-much-to-retire-at-62/`: **NO** — sibling article does not exist yet.
- `/blog/how-much-to-retire-at-65/`: **NO** — sibling article does not exist yet.

### Other notable structural observations
- Article wrap class: `.article-wrap` (L103), max-width 740px.
- Two CTA boxes already present: top (L105-109, `data-fc-calc-cta="top"`) and mid (L146).
- Three `<figure>` blocks (hero L112, mid L156, bottom L175).
- Related-calculators grid block at L205 (post-`</div>` for `.article-wrap`).
- `</head>` closes at L97.
- Existing FAQ section is an H2 (L194) followed by four `<p><strong>Q?</strong> A.</p>` paragraphs (L195-198). The Step 4 FAQPage JSON-LD adds 8 Q&As that don't perfectly mirror the prose FAQ (8 vs 4) — acceptable per the plan; the schema is for SERP enrichment.
- The "Practical Steps" `<ol>` (L147-154) and "Actionable Next Steps" `<ol>` (L185-192) are HowTo-shaped but no HowTo schema was added in this task (out of scope for 2.2).

### Insertion points planned
1. **Title trim** — replace L6.
2. **FAQPage JSON-LD** — insert immediately before `</head>` (after L96 noscript, before L97).
3. **Related-calc CTA paragraph** — insert after the first major section ("Pension Access Gap" closing `</p>` at L134) so it follows the first big topic block.
4. **Age-series cross-link block** — insert after "Sources and Methodology" `</p>` (L201), before `</div>` (L203) closing `.article-wrap`.
5. **dateModified bump** — `2026-05-19` → `2026-05-28` inside the Article JSON-LD on L40.

## CWV baseline — 2026-05-28 (operator-supplied via PageSpeed Insights)

PSI source: Lighthouse 13.3.0, HeadlessChromium 146.0.7680.177 (emulated Moto G Power, Slow 4G).

### Mobile (finncalc.com homepage) — captured 2026-05-28 15:13 GMT+2

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Performance score | 37/100 | ≥90 good | **poor** |
| FCP | 4.2 s | ≤1.8s good / ≤3.0s NI / >3.0s poor | poor |
| LCP | 4.4 s | ≤2.5s good / ≤4.0s NI / >4.0s poor | **poor** (borderline) |
| TBT | 7,270 ms | ≤200ms good | **severe** |
| CLS | **0** | ≤0.1 good | **good** |
| SI | 12.9 s | ≤3.4s good | poor |

Accessibility: 96/100. Best Practices: 100/100. SEO: 100/100.

### Desktop (finncalc.com homepage) — captured 2026-05-28 15:19 GMT+2

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Performance score | **99/100** | ≥90 good | **excellent** |
| FCP | 0.3 s | ≤1.8s good | excellent |
| LCP | 0.7 s | ≤2.5s good | excellent |
| TBT | 90 ms | ≤200ms good | good |
| CLS | **0** | ≤0.1 good | good |
| SI | 0.7 s | ≤3.4s good | excellent |

Accessibility: 96/100 (same contrast issues as mobile). Best Practices: 100/100. SEO: 99/100.

**Layout shift culprits panel:** 0.000 total — confirms CLS is genuinely fixed on both viewports.

**LCP element:** `<h1>Free Financial Calculators` with 250ms render delay. Healthy.

### Cross-viewport diagnosis

Desktop is excellent (99/100). Mobile is poor (37/100) **only because of third-party JavaScript execution time on slower CPUs**:
- Long main-thread tasks: GTM (134ms + 72ms + 62ms = 268ms cumulative), AdSense (98ms), FundingChoices (68ms)
- 254 KiB unused JS across Google Ads, GTM, FundingChoices
- Mobile CPU throttling (Moto G Power, Slow 4G) compounds it

The mobile Performance score is **NOT** a finncalc code issue — it's a third-party JS issue. The site itself is fast; the ad/analytics stack is heavy on mobile CPUs.

## Decision: Phase 1 CSS work — REVISED SCOPE (2026-05-28)

The prior CLS=0.718 has **resolved itself** — current CLS is 0 on mobile. The Phase 1 plan's CLS-fix tasks are unnecessary:

- **Task 1.1 (CLS-risk audit script + failing test):** SKIPPED — no CLS to audit.
- **Task 1.2 (add intrinsic width/height to flagged images):** SKIPPED — not driving any CLS.
- **Task 1.4 (reserve hero + card-grid heights):** SKIPPED — no layout shift to prevent.
- **Task 1.3 (font-display: swap):** PROCEEDING — still good hygiene and helps FCP/LCP render delay.
- **Task 1.5 (operator re-verify):** RETARGETED — re-verify after Task 1.3 + the content changes land.

### New performance findings exposed by this PSI run (out of original plan scope)

The performance score is now bottlenecked by **JavaScript and third-party scripts**, not layout:

1. **LCP element render delay = 6,890 ms** on a `<p>` element (banner copy). The bytes arrive fast (TTFB 0ms in this trace); the JS execution blocks render.
2. **TBT = 7,270 ms** — severe. Dominated by:
   - Google Ads / AdSense (`pagead2.googlesyndication.com`): 226 KiB transfer, 156 KiB unused
   - Google Tag Manager (`gtag/js`): 154 KiB transfer, 63 KiB unused
   - Google FundingChoices CMP: 69 KiB transfer, 35 KiB unused
   - Microsoft Clarity: 25 KiB
   - Cloudflare RUM beacon: 12 KiB
   - **Total unused JS savings available: 254 KiB**
3. **Accessibility contrast (96/100):** several elements fail WCAG AA contrast — accent-color links (`var(--accent)` on `var(--bg)`), section labels, footer disclaimer text, cookie banner copy.

### Recommended follow-up plan (separate from current Phase 3)

A new plan should address the JS-bound performance issues:
- Defer/lazy-load Ads + GTM until interaction
- Move Clarity behind a consent gate (it's currently always-on)
- Audit FundingChoices CMP — can it lazy-load?
- Revisit the LCP element — if it's a banner `<p>`, why is render delayed 6.9s? Likely waiting on JS to hydrate or unblock paint.
- Bump accent-color contrast (`#1E88E5` on white) by darkening to meet 4.5:1 AA threshold.

This is out of scope for the current Phase 3 plan (which targets CWV CLS + content); flagging for the next iteration.

## Phase 3 — Execution summary (2026-05-28)

| Task | Status | Detail |
|---|---|---|
| P0 | ✅ done | PSI mobile + desktop captured |
| P1.1 | ✅ skipped | CLS = 0 — no audit needed |
| P1.2 | ✅ skipped | No CLS to fix |
| P1.3 | ✅ done | `@font-face` with `font-display: swap` synced to `site/css/main.css` (already in `css/main.css`). 3 tests pass. |
| P1.4 | ✅ skipped | No CLS to fix |
| P1.5 | ⏳ pending | Re-verify after deploy |
| P2.1 | ✅ done | Pre-edit state recorded above |
| P2.2 | ✅ done | Title `50 → 48` chars, FAQPage JSON-LD added (8 Q&As), age-series cross-links + calculator CTAs added, `dateModified: 2026-05-19 → 2026-05-28`. 6/6 tests pass. |
| P3.1 | ✅ done | retire-at-60 published — **5,117 words**. 11/11 tests pass. |
| P3.2 | ✅ done | retire-at-62 published — **4,487 words** (SS early-claim angle). 11/11 tests pass. |
| P3.3 | ✅ done | retire-at-65 published — **5,153 words** (Medicare angle). 11/11 tests pass. |
| P3.4 | ✅ done | Cross-link contract verified across all 4 articles. |
| P4.1 | ✅ done | sitemap.xml: added 3 new URLs with `lastmod: 2026-05-28`, bumped retire-at-55 lastmod. XML well-formed. |
| P4.2 | ⏳ pending operator | Deploy + GSC indexing + 60-day re-audit calendar entry |

**Total new content:** 14,757 words across 3 new articles + retire-at-55 expansion.
**Total tests added:** 42 new test cases, all green.
**Files changed:** 2 (retire-at-55/index.html, sitemap.xml). Files created: 7 (4 test files + 3 article files; .jpg image files pending operator).
