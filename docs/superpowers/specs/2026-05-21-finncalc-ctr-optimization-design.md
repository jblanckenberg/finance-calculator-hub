# FinCalc CTR Optimization — Design

**Date:** 2026-05-21
**Branch:** `ctr-optimization-2026-05-21` (off `seo-remediation-2026-05-21`)
**Predecessor:** `2026-05-21-finncalc-seo-remediation-design.md` (closed all 10 structural audit issues)

## Problem

GSC Performance export (90-day window ending 2026-05-21) shows finncalc.com is in the textbook "high impressions, low CTR" state:

- 3,465 desktop impressions vs 6 clicks → **0.17% sitewide CTR** (typical baseline for an indexed site this size is 1.5-3%)
- Many queries reach positions 5-20 but bleed nearly all clicks to competing snippets
- Sample: `mortgage calculator` returned 70 impressions, 0 clicks, position 81.5 — too deep to rank-fix immediately, but illustrates the discoverability paradox: Google shows us, users don't click

The 10-task structural remediation that just shipped (composite 21 → expected ≥75 in 60 days) fixed how the SITE renders — favicon, async CSS, `<main>` wrapper, title length, HTML errors, image alts, defer JS, etc. None of those moves the CTR needle directly. CTR is a SERP-level lever: title text, meta description text, structured-data rich-result expansion.

## Goal

For the top-30 queries where finncalc.com gets impressions but underperforms the position-baseline CTR, rewrite titles + meta descriptions + add structured data so click-through closes to baseline.

**Success criterion:** in the 60-day GSC re-export, the rewritten queries' average CTR moves at least halfway from current to position-baseline. E.g., a position-7 query at 0% CTR should reach ≥2% (baseline is 3.9%).

## Input

- `C:\FIN_CALC_SITE\finncalc.com-Performance-on-Search-2026-05-21.xlsx` — GSC Performance export, 90 days, multi-sheet:
  - `Queries` (1001 rows): query → clicks/impressions/CTR/position
  - `Pages` (36 rows): URL → clicks/impressions/CTR/position
  - `Devices`, `Countries`, `Filters` — context only

Note: GSC's standard export does NOT include the `Query × Page` join. We'll heuristically map each target query to its likely landing URL by (a) keyword-in-slug overlap and (b) the `Pages` sheet's top-impression URLs. Where ambiguous, fall back to a SERP lookup via DataForSEO.

## Scope

- **In scope:** the top 30 "CTR gap" queries on finncalc.com. Title + meta description rewrites. Structured data (FAQ + HowTo + Article) where missing.
- **Out of scope:** new ranking work (no new content creation, no backlink-building, no keyword expansion). This is purely CTR — not impressions.
- **Out of scope this sprint:** buscalctools.com (Next.js stack, queued as Phase 2 after lessons land).

## Approach

7 tasks, mirroring the Tasks 3-10 shape from the predecessor plan. Each task = auditor/script + test gate + commit. Subagent-driven-development for execution.

### Task 1 — CTR-gap targeter
Read the XLSX `Queries` sheet via openpyxl. Filter to queries where `impressions ≥ 100`, `position ≤ 20`, `CTR < baseline_for_position`. Sort by `impressions × (baseline_CTR − actual_CTR)` = weekly clicks left on the table. Output top 30 to `_build/data/ctr_targets.csv`.

Baseline CTR by position (Advanced Web Ranking 2024 data):

| Pos | Baseline | Pos | Baseline |
|---|---|---|---|
| 1 | 27.6% | 6 | 4.9% |
| 2 | 15.8% | 7 | 3.9% |
| 3 | 11.0% | 8 | 3.3% |
| 4 | 8.4% | 9 | 2.8% |
| 5 | 6.3% | 10 | 2.4% |
| | | 11-20 | 1.0% |

### Task 2 — Map queries to landing URLs
For each of the 30 targets, determine which finncalc URL ranks for that query. Two-step:
1. Match against the GSC `Pages` sheet via keyword-in-slug overlap (e.g. query `"mortgage calculator uk"` → `https://finncalc.com/mortgage/uk/`).
2. For queries with no obvious match, fall back to a DataForSEO `serp_organic_live_advanced` lookup, filtered to `site:finncalc.com`.

Save to `_build/data/ctr_targets_with_urls.csv`.

### Task 3 — Snippet audit (current state)
For each target URL, read the rendered HTML, extract `<title>`, `<meta name="description">`, `<meta property="og:description">`, `<meta name="twitter:description">`. Save to `_build/data/ctr_targets_enriched.csv`. Tag each row with a gap category: `title-weak` / `description-weak` / `both-weak` / `missing-rich-snippet`.

### Task 4 — Competitor SERP pull (high-leverage but optional)
For the top 10 targets (by missed-clicks), pull live SERP via DataForSEO `serp_organic_live_advanced` and capture top-3 competitor titles + descriptions. Save to `_build/data/competitor_snippets.csv`. Used as inspiration during rewrites — NOT for blind copying.

### Task 5 — Rewrites
For each of the 30 targets, write a new title + meta description following these rules:

**Title rules** (≤60 chars):
- Primary keyword in first 30 chars
- Year-stamp if temporal (`2026`)
- Number where natural (`4 brackets`, `10-year`)
- Power word (`free`, `instant`, `compare`)
- Match search intent — informational queries get explainer titles, transactional queries get action verbs

**Meta description rules** (140-155 chars):
- Lead with benefit verb (`Calculate`, `Compare`, `Find out`)
- Include the primary keyword once
- Mention region/currency if relevant (UK / US / SA)
- Implicit CTA — `in seconds`, `for 2026`, `free`

Rewrites written by a sub-agent, reviewed by a spec-check sub-agent, then by code-quality reviewer.

### Task 6 — Apply rewrites
- Update `_build/data/calculators.json` + `variants.json` + `extra_titles.json` (titles)
- Create `_build/data/descriptions.json` (meta descriptions, same shape as `extra_titles.json`)
- Clone `patch_titles_rendered.py` → `patch_titles_and_descriptions_rendered.py` to ALSO patch `<meta name="description">`, `og:description`, `twitter:description` in rendered HTML
- Idempotent (re-run = no-op)
- Tests: existing title-length test + new `_build/tests/test_meta_description_length.py` (50-160 char band)

### Task 7 — Structured data gaps
Audit `_build/templates/partials/head_schema.html` — currently emits `WebSite` and `SoftwareApplication`. Add:
- `FAQPage` JSON-LD on pages with FAQ sections — auto-extract Q&A pairs from rendered HTML, emit as JSON-LD in the head
- `HowTo` JSON-LD on calculator pages — step-by-step "How to use this calculator" derived from existing instructional copy
- `Article` JSON-LD on blog posts if missing
- Test gate: `_build/tests/test_structured_data.py` asserts each calculator page has ≥2 JSON-LD blocks; each blog post has Article schema

**Why:** rich results visually expand the SERP listing → CTR boost even when title/description aren't rewritten.

### Task 8 — Re-measurement framework
`_build/scripts/track_ctr_delta.py` — accepts two GSC XLSX files (before / after) → per-query CTR delta, total clicks recovered, position changes. Operator runs this 60 days post-deploy to confirm impact.

## File map

**Create:**
- `_build/scripts/audit_ctr_gaps.py` (Task 1)
- `_build/scripts/map_queries_to_urls.py` (Task 2)
- `_build/scripts/audit_current_snippets.py` (Task 3)
- `_build/scripts/pull_competitor_snippets.py` (Task 4)
- `_build/scripts/patch_titles_and_descriptions_rendered.py` (Task 6)
- `_build/scripts/audit_structured_data.py` (Task 7)
- `_build/scripts/track_ctr_delta.py` (Task 8)
- `_build/data/descriptions.json` (Task 6)
- `_build/data/ctr_targets.csv` + `_with_urls.csv` + `_enriched.csv` + `competitor_snippets.csv` (Tasks 1-4 outputs)
- `_build/tests/test_meta_description_length.py` (Task 6)
- `_build/tests/test_structured_data.py` (Task 7)

**Modify:**
- `_build/data/calculators.json` — 30 title + description rewrites
- `_build/data/variants.json` — same
- `_build/data/extra_titles.json` — same (for blog / hub pages)
- `_build/templates/partials/head_schema.html` — add FAQPage + HowTo + Article emitters
- `_build/scripts/full_seo_regression.ps1` — chain the new gates

## EXECUTION POLICY

Same as the predecessor plan: do NOT run `_build/generate.py`. All rendered HTML changes flow through hand-edit patcher scripts. Reference patterns: the 6 existing `*_rendered.py` scripts in `_build/scripts/`.

## Operator action items (out of code scope)

After the branch deploys via Cloudflare Pages:
- `python scripts/indexnow_ping.py --all` to nudge crawlers
- 60-day re-export of GSC Performance → save to `_build/data/gsc_finncalc_90d_post.xlsx`
- Run `python _build/scripts/track_ctr_delta.py _build/data/gsc_finncalc_90d.xlsx _build/data/gsc_finncalc_90d_post.xlsx` and review the per-query delta

## Acceptance criteria (post-merge)

- `python _build/scripts/audit_ctr_gaps.py` exits 0 (no CTR-gap targets remaining at current threshold) OR returns the new list of next-30 targets
- `python -m pytest _build/ --tb=short` all green; test count up ~10-30 (new auditors + new gates)
- `_build/scripts/full_seo_regression.ps1` extended runner passes end-to-end
- 60-day GSC re-export shows average CTR on rewritten queries moves at least halfway to position-baseline
