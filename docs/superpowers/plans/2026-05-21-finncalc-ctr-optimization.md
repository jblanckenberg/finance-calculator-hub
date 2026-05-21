# FinCalc CTR Optimization — Implementation Plan

> Spec: `docs/superpowers/specs/2026-05-21-finncalc-ctr-optimization-design.md`
> Branch: `ctr-optimization-2026-05-21` (off `seo-remediation-2026-05-21` HEAD `0354b29`)
> Predecessor: `2026-05-21-finncalc-seo-remediation.md` (structural fixes shipped + deployed)

**Goal:** lift CTR on 30 top high-impression-low-CTR queries to at least halfway between current and position-baseline. Industry benchmark: 30-80% CTR uplift on rewritten queries.

**Input:** `C:\FIN_CALC_SITE\finncalc.com-Performance-on-Search-2026-05-21.xlsx` (GSC 90-day export, multi-sheet XLSX).

**EXECUTION POLICY:** same as predecessor — do NOT run `_build/generate.py`. Hand-edit source + rendered HTML via `*_rendered.py` patchers.

---

## Task 1 — Build the CTR-gap targeter

**Why:** convert raw GSC data into a prioritised list of queries worth rewriting. Without this, we'd be guessing.

**Files:**
- Create: `_build/scripts/audit_ctr_gaps.py`
- Create: `_build/data/ctr_targets.csv` (output)
- Create: `_build/tests/test_ctr_targeter.py`

**Steps:**

1. Write `audit_ctr_gaps.py`:
   ```python
   """Read GSC Queries sheet → output top-30 CTR-gap targets sorted by clicks-on-table."""
   import csv, sys
   from pathlib import Path
   import openpyxl

   REPO = Path(__file__).resolve().parents[2]
   GSC_XLSX = Path(r"C:\FIN_CALC_SITE\finncalc.com-Performance-on-Search-2026-05-21.xlsx")
   OUT = REPO / "_build" / "data" / "ctr_targets.csv"

   BASELINE_CTR = {1:0.276, 2:0.158, 3:0.110, 4:0.084, 5:0.063,
                   6:0.049, 7:0.039, 8:0.033, 9:0.028, 10:0.024}
   def baseline(pos):
       if pos <= 10: return BASELINE_CTR[int(round(pos))]
       if pos <= 20: return 0.010
       return 0.0  # beyond pos 20 = ranking problem, not CTR problem

   MIN_IMPRESSIONS = 100  # 90-day floor; ~1/day
   MAX_POS = 20

   def main() -> int:
       wb = openpyxl.load_workbook(GSC_XLSX, read_only=True, data_only=True)
       ws = wb["Queries"]
       rows = list(ws.iter_rows(min_row=2, values_only=True))
       wb.close()
       targets = []
       for query, clicks, impressions, ctr, position in rows:
           if not query or impressions is None or position is None:
               continue
           if impressions < MIN_IMPRESSIONS or position > MAX_POS:
               continue
           ctr_val = float(ctr or 0)
           base = baseline(float(position))
           gap = base - ctr_val
           if gap <= 0:
               continue  # already at or above baseline
           opportunity = impressions * gap  # weekly clicks on the table
           targets.append((query, int(impressions), ctr_val, float(position), base, opportunity))
       targets.sort(key=lambda t: t[5], reverse=True)
       targets = targets[:30]
       OUT.parent.mkdir(parents=True, exist_ok=True)
       with OUT.open("w", encoding="utf-8", newline="") as f:
           w = csv.writer(f)
           w.writerow(["query", "impressions", "ctr", "position", "baseline_ctr", "opportunity_clicks"])
           w.writerows(targets)
       print(f"Wrote {len(targets)} targets to {OUT.relative_to(REPO)}")
       for t in targets[:10]:
           print(f"  [{t[5]:6.1f} clicks/90d on table] '{t[0]}' pos={t[3]:.1f} ctr={t[2]:.3%} → baseline {t[4]:.1%}")
       return 0 if targets else 1

   if __name__ == "__main__":
       sys.exit(main())
   ```

2. Test: assert auditor against a small synthetic XLSX fixture, confirm sorting + filtering.

3. Run it. Eyeball the top-30 output. If fewer than 30 targets surface (small site, sparse data), proceed with whatever count exists.

4. Commit: `feat(ctr): GSC-driven CTR-gap targeter (Task 1)`

---

## Task 2 — Map queries to landing URLs

**Why:** GSC's default export doesn't pair queries to URLs. Need to know which finncalc URL each rewrite targets.

**Files:**
- Create: `_build/scripts/map_queries_to_urls.py`
- Create: `_build/data/ctr_targets_with_urls.csv` (output)

**Steps:**

1. Read both `Queries` and `Pages` sheets from the XLSX. Build a {URL → impressions, position} map from the Pages sheet.

2. For each target query, find the most likely landing URL by:
   - (a) keyword-in-slug match (e.g. query `mortgage calculator uk` matches `/mortgage/uk/`)
   - (b) ranked-position alignment — if the page's position matches the query's position (±2), high confidence
   - (c) for ambiguous cases: fall back to DataForSEO `serp_organic_live_advanced` filtered to `site:finncalc.com`

3. Save augmented CSV with new column `landing_url`. Flag low-confidence mappings as `?`.

4. Commit: `feat(ctr): query → URL mapper (Task 2)`

---

## Task 3 — Snippet audit (current state)

**Why:** know what we're rewriting AGAINST.

**Files:**
- Create: `_build/scripts/audit_current_snippets.py`
- Create: `_build/data/ctr_targets_enriched.csv`

**Steps:**

1. For each (query, landing_url) row, read the rendered HTML at `<landing_url>/index.html` and extract:
   - `<title>` (raw)
   - `<meta name="description" content="...">`
   - `<meta property="og:description" content="...">`
   - `<meta name="twitter:description" content="...">`
   - Word count of meta description; length of title

2. Categorise the gap per row:
   - `title-weak` — title is generic or missing keyword
   - `description-weak` — description is generic / missing benefit verb / too short / too long
   - `both-weak` — both
   - `missing-rich-snippet` — no FAQ/HowTo JSON-LD on a page that should have one

3. Commit: `feat(ctr): current-snippet auditor (Task 3)`

---

## Task 4 — Competitor SERP pull (high-leverage)

**Why:** see WHAT IS WINNING those queries today. Don't blind-copy; do learn the patterns competitors use.

**Files:**
- Create: `_build/scripts/pull_competitor_snippets.py`
- Create: `_build/data/competitor_snippets.csv`

**Steps:**

1. For the top 10 targets (by `opportunity_clicks`), call DataForSEO `serp_organic_live_advanced` with the query + region (US/UK/SA per the GSC `Countries` sheet).

2. Capture top-3 organic results per query: title, description, URL. Save to CSV.

3. Commit: `feat(ctr): competitor SERP snippet puller (Task 4)`

(Optional skip if DataForSEO Backlinks subscription budget is tight — Task 5 can proceed without competitor data, just slower.)

---

## Task 5 — Generate the rewrites

**Why:** the actual creative work. Output 30 new (title, description) pairs.

**Files:**
- Create: `_build/data/rewrites_proposed.csv` — staging file before applying

**Steps:**

1. Dispatch sub-agent with full context: the enriched targets CSV + competitor snippets (if Task 4 ran) + the rewrite rules. Sub-agent produces a CSV with columns: `query`, `landing_url`, `current_title`, `current_description`, `new_title`, `new_description`, `rationale`.

2. Spec-compliance reviewer: assert each new title ≤60 chars, each new description in 140-155, primary keyword present in both.

3. Operator approval gate — show first 5 rewrites in chat for sign-off before applying. Adjust style if needed.

4. Commit the proposed-rewrites CSV: `feat(ctr): 30 proposed title+description rewrites (Task 5)`.

(No code changes to data files YET — that's Task 6.)

---

## Task 6 — Apply the rewrites

**Why:** propagate the new titles + descriptions to the source data + rendered HTML.

**Files:**
- Modify: `_build/data/calculators.json`, `variants.json`, `extra_titles.json`
- Create: `_build/data/descriptions.json` (new — meta descriptions, same shape as extra_titles.json: `{rendered_path: description}`)
- Create: `_build/scripts/patch_titles_and_descriptions_rendered.py` — clone + extend the Task 3 patcher
- Create: `_build/tests/test_meta_description_length.py`

**Steps:**

1. Load `rewrites_proposed.csv`. For each row, update the relevant JSON data file:
   - If query's URL maps to a calculator slug → update `calculators.json[slug].title` + add `calculators.json[slug].description`
   - Variant pages → `variants.json`
   - Blog / glossary / hub pages → `extra_titles.json` + `descriptions.json`

2. Clone `patch_titles_rendered.py` to a new combined patcher that ALSO replaces:
   - `<meta name="description" content="...">`
   - `<meta property="og:description" content="...">`
   - `<meta name="twitter:description" content="...">`

   Same idempotency guard (skip if all four meta tags already match the JSON value).

3. Write `test_meta_description_length.py`: parametrise over every entry in `calculators.json` + `variants.json` + `extra_titles.json` + `descriptions.json`; assert `50 ≤ len(description) ≤ 160`.

4. Run the patcher twice (idempotency); run all tests.

5. Commit: `fix(ctr): apply 30 title+description rewrites + meta-length gate (Task 6)`

---

## Task 7 — Structured data gaps

**Why:** rich-result expansion in SERP = visual area gain = CTR boost, independent of title.

**Files:**
- Create: `_build/scripts/audit_structured_data.py`
- Modify: `_build/templates/partials/head_schema.html`
- Create: `_build/tests/test_structured_data.py`

**Steps:**

1. Audit current emitted JSON-LD across all rendered pages (read each `<script type="application/ld+json">` block). Categorise by schema type. Find pages missing FAQPage / HowTo / Article where appropriate.

2. Extend `head_schema.html` (Jinja template) to emit:
   - `FAQPage` when the page's body contains an FAQ section (extract Q&A pairs from a `data-faq` attribute or known classname pattern)
   - `HowTo` on calculator pages — derive steps from existing instructional copy
   - `Article` on blog posts — populate `headline`, `datePublished`, `author`, `image`

3. Because the template change won't propagate without `generate.py`, write `_build/scripts/inject_structured_data_rendered.py` to add the JSON-LD blocks to rendered HTML for the 30 target pages (scope-guarded to landing URLs from Task 2).

4. Test gate: each calculator page has ≥2 JSON-LD blocks; each blog post has at least Article schema.

5. Commit: `feat(ctr): FAQ + HowTo + Article schema gaps (Task 7)`

---

## Task 8 — Re-measurement framework

**Why:** so the operator can quantify the impact at the 60-day mark.

**Files:**
- Create: `_build/scripts/track_ctr_delta.py`

**Steps:**

1. Script accepts two GSC XLSX paths (before / after). Reads `Queries` sheets from both. Outer-joins on query.

2. For each target query (those in `ctr_targets.csv`), report:
   - clicks_before, clicks_after, delta_clicks
   - ctr_before, ctr_after, delta_ctr
   - position_before, position_after, position_change
   - New baseline_ctr at after-position

3. Aggregate: total recovered clicks, % targets that moved toward baseline.

4. Output to stdout + `_build/data/ctr_delta_<timestamp>.csv`.

5. Commit: `feat(ctr): 60-day CTR delta tracker (Task 8)`

---

## Task 9 — Wrap-up + regression runner

**Why:** lock the new gates into `full_seo_regression.ps1` so future operator runs catch CTR-regression.

**Files:**
- Modify: `_build/scripts/full_seo_regression.ps1`

**Steps:**

1. Add new sections to the runner:
   - `Section "X. CTR-gap audit (against latest GSC export)"` → `python _build/scripts/audit_ctr_gaps.py` (will exit non-zero if NEW gaps appear)
   - `Section "X. Meta description length audit"` → `python -m pytest _build/tests/test_meta_description_length.py -q`
   - `Section "X. Structured-data presence"` → `python -m pytest _build/tests/test_structured_data.py -q`

2. Run the extended runner end-to-end. Expect all green.

3. Commit: `chore(ctr): extend regression runner with CTR + meta + schema gates (Task 9)`

---

## Operator action items (out of code scope)

After all 9 tasks ship + branch is pushed + Cloudflare auto-deploys:

1. `python scripts/indexnow_ping.py --all` — nudge Bing/Yandex to recrawl + reindex the new snippets fast
2. Wait 60 days
3. Export fresh GSC Performance for finncalc.com (same 90-day window) → save to `_build/data/gsc_finncalc_90d_post.xlsx`
4. `python _build/scripts/track_ctr_delta.py _build/data/gsc_finncalc_90d.xlsx _build/data/gsc_finncalc_90d_post.xlsx` and review the per-query CTR delta

## Done state

- Branch `ctr-optimization-2026-05-21` has ~9-12 commits
- All test gates green
- 30 rewrites in production
- Operator log entry appended to `2026-05-21-finncalc-seo-remediation-log.md` with the CTR-optimization commit list + 60-day re-export instructions
- buscalctools.com queued as Phase 2 (different stack — Next.js — simpler application because `next-seo` handles meta tags at build time without needing a rendered patcher)
