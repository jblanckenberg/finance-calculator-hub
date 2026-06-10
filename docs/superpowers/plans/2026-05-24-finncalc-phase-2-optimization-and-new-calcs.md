# finncalc.com — Phase 2: Existing-Page Optimization + 4 Curated New Calcs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the existing 27-calc surface area via a keyword-driven metadata + schema sweep, then ship 4 curated new calculators from the remaining P1 long tail.

**Architecture:** Two parallel workstreams — (1) port the buscalctools Phase-2 toolchain pattern to finncalc's `calculators.json` + rendered-patcher model, then sweep all 27 calc pages for title/meta/schema gaps; (2) ship 4 new calcs (Dividend, Roth IRA Conversion, FIRE Number, Simple Interest) using the proven Phase 1 1-module-1-page pattern. All work obeys the EXECUTION POLICY (generate.py wipes variant-page schema additions — revert collateral, run injectors).

**Tech Stack:** Python+Jinja static site, pytest, Node `assert/strict` for JS calc modules, BeautifulSoup-free regex patchers (matches existing `inject_*_rendered.py` style), DataForSEO CSV `C:\FIN_CALC_SITE\keywords\finncalc_keywords.csv` (181 rows) as the keyword source-of-truth.

**Estimated effort:** 28-32 hours (4-6h toolchain + 4h optimization sweep + 2h geo + 20h four new calcs).

**Output:** 4 stacked PRs — Phase 2A (toolchain), Phase 2B (sweep + geo), Phase 2C-2F (one per new calc).

---

## Pre-flight constraints (read once before any task)

These are derived from the project's CLAUDE.md, MEMORY.md, and the lessons that surfaced during Phase 1:

1. **EXECUTION POLICY (no naked generate.py).** `generate.py --apply` rewrites every `<slug>/index.html` from `_build/bodies/*.html` + `_build/data/calculators.json`. Variant pages (e.g. `compound-interest/uk/index.html`) had their HowTo/FAQPage schemas added by `_build/scripts/inject_*_rendered.py` AFTER generate.py — so any naked `generate.py --apply` wipes those schemas and breaks ~84 tests.
   **Correct sequence for any data/body change:** edit source → `python _build/generate.py --apply` → `git status --short | grep "^ M" | awk '{print $2}' | grep -v "^_build/" | grep -v "^<new-page>/" | xargs git checkout --` → `python _build/scripts/inject_related_calculators_rendered.py && python _build/scripts/inject_author_schema_rendered.py && python _build/scripts/inject_favicon_rendered.py && python _build/scripts/inject_geo_targeting_rendered.py`.
2. **Bash `rm` is blocked** on Windows in this harness. Use PowerShell `Remove-Item` or `git rm` for tracked files.
3. **PowerShell 5.1 syntax only** when shelling to PowerShell (no PS7-only operators).
4. **Title length cap: 60 chars.** Several Phase 1 PRs had to retry because a title hit 62-65 chars. Check before commit.
5. **Two-stage review per task** when running under subagent-driven-development: spec-reviewer first, then code-quality-reviewer.
6. **Stack each phase as one PR** based on the previous phase's branch. Operator merges in order.
7. **Test invocation:** `python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py` (html5lib not installed; the ignore is the established pattern from Phase 1).
8. **Last green baseline (post-Phase 1E):** **1202 pytest pass, 111 skipped, 0 fail.** Any regression vs that number must be diagnosed before commit.

---

## File Structure

### Phase 2A — Toolchain (new files)
| File | Responsibility |
|---|---|
| `_build/data/keyword_page_map.json` | Generated: `{slug: {primary, secondaries, vol, cluster}}` for all 27 calc slugs. Authoritative output of 2A.1. |
| `_build/scripts/build_keyword_page_map.py` | Reads `C:/FIN_CALC_SITE/keywords/finncalc_keywords.csv`, joins each row to the best-fit calc slug via cluster + slug-token match, writes `keyword_page_map.json`. Conservative: slug match always beats cluster match (per buscalctools Phase 2 lesson). |
| `_build/tests/test_build_keyword_page_map.py` | Asserts every calc slug gets a primary keyword, no off-topic primaries, idempotent. |
| `_build/scripts/audit_schema_coverage.py` | Scans every calculator + variant rendered page; reports which `@type` schemas are present/missing (WebApplication, HowTo, FAQPage, Article, BreadcrumbList, Organization, Person). Pure read-only; emits a JSON report. |
| `_build/tests/test_audit_schema_coverage.py` | Smoke test that the auditor parses every page without error and returns the expected shape. |
| `_build/scripts/patch_calculators_json.py` | Reads `keyword_page_map.json`, updates `calculators.json` entries' `title` + `description` + `metaDescription` only when (a) the new value is materially better (uses primary kw) AND (b) the new title ≤60 chars. Idempotent. Dry-run by default. |
| `_build/tests/test_patch_calculators_json.py` | Asserts patcher is idempotent, respects 60-char cap, refuses overwrites that would drop existing primary kw. |
| `_build/scripts/patch_meta_rendered.py` | Extends the existing `patch_titles_rendered.py` pattern to also push `<meta name="description">`, `og:description`, `twitter:description` from `calculators.json` into rendered HTML. Idempotent. |
| `_build/tests/test_patch_meta_rendered.py` | Asserts the patcher updates all three description tags + is idempotent on a second pass. |

### Phase 2B — Optimization sweep (no new files, edits only)
- Edits: `_build/data/calculators.json` (title + description updates for ~10-15 underoptimized entries)
- Edits: `<slug>/index.html` for each affected calc + variant page (driven by the patchers)
- Operator action: Review schema-coverage report, fill any gaps (likely 0-2 pages)

### Phase 2C — Geo disambiguation (body source edits)
| File | Change |
|---|---|
| `_build/bodies/mortgage.html` | Add callout block linking to `/mortgage-repayment-calculator/` + `/mortgage-overpayment-calculator/` for UK readers |
| `_build/bodies/take-home-pay.html` | Add state-specific callout linking to `/texas-paycheck-calculator/` + `/california-paycheck-calculator/` |
| `_build/bodies/sa-tax-calculator.html` | Add monthly-PAYE callout linking to `/paye-calculator/` |

### Phase 2D — Dividend Calculator (new files)
| File | Responsibility |
|---|---|
| `js/calc/dividend.js` | Pure-function dividend calc: shares × DPS × frequency, optional DRIP compounding, taxable vs tax-free wrapper modeling |
| `_build/tests/test_dividend.js` | Node `assert/strict` cases (≥8) |
| `_build/bodies/dividend-calculator.html` | Interactive form + inline glue JS |
| `_build/data/calculators.json` | New entry (full FAQ + scenarios + schemas + sources + related + keyConcepts) |
| `_build/test_calculators_data.py` | EXPECTED_SLUGS 27 → 28 |
| `_build/tests/test_related_calculators.py` | CALC_PAGES count 27 → 28 |
| `dividend-calculator/index.html` | Generated, then injectors applied (per EXECUTION POLICY) |

### Phase 2E — Roth IRA Conversion Calculator (same file pattern as 2D)
- `js/calc/roth-ira-conversion.js`
- `_build/tests/test_roth_ira_conversion.js`
- `_build/bodies/roth-ira-conversion-calculator.html`
- `roth-ira-conversion-calculator/index.html`
- Plus the same calculators.json + test-count bumps (28 → 29)

### Phase 2F — FIRE Number + Simple Interest (combined PR, two related calcs)
- `js/calc/fire-number.js` + `js/calc/simple-interest.js`
- `_build/tests/test_fire_number.js` + `_build/tests/test_simple_interest.js`
- `_build/bodies/fire-number-calculator.html` + `_build/bodies/simple-interest-calculator.html`
- Plus calculators.json + test-count bumps (29 → 31)

---

## Phase 2A — Toolchain

Goal: produce reusable scripts that turn the keyword CSV into actionable on-page changes. Mirrors buscalctools Phase 2 (#33-#34) but adapted to finncalc's `calculators.json` + rendered-patcher model. Estimated 4-6h.

### Task 2A.1: Build the keyword-page map

**Files:**
- Create: `_build/scripts/build_keyword_page_map.py`
- Create: `_build/tests/test_build_keyword_page_map.py`
- Output: `_build/data/keyword_page_map.json`

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_build_keyword_page_map.py
from pathlib import Path
import json
import importlib.util

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "build_keyword_page_map.py"
OUTPUT = REPO / "_build" / "data" / "keyword_page_map.json"

spec = importlib.util.spec_from_file_location("build_keyword_page_map", SCRIPT)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

CSV_PATH = Path("C:/FIN_CALC_SITE/keywords/finncalc_keywords.csv")
CALCS = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))

def test_map_covers_every_calc_slug():
    result = mod.build_map(CSV_PATH, CALCS)
    for slug in CALCS:
        assert slug in result, f"No keyword mapped to {slug}"
        assert result[slug].get("primary"), f"{slug} has empty primary kw"

def test_slug_match_beats_cluster_match():
    """If a keyword's slug-tokens appear in the slug, that overrides any
    cluster-only assignment. Lesson from buscalctools Phase 2."""
    result = mod.build_map(CSV_PATH, CALCS)
    # paye-calculator must NOT receive a non-paye keyword as primary even
    # if cluster=tax overlaps with sa-tax-calculator's cluster.
    assert "paye" in result["paye-calculator"]["primary"].lower()

def test_no_duplicate_primaries():
    result = mod.build_map(CSV_PATH, CALCS)
    primaries = [v["primary"] for v in result.values()]
    assert len(primaries) == len(set(primaries)), "Same primary assigned to multiple slugs"

def test_idempotent():
    a = mod.build_map(CSV_PATH, CALCS)
    b = mod.build_map(CSV_PATH, CALCS)
    assert a == b
```

- [ ] **Step 2: Run it (expect failure: ModuleNotFoundError)**

```powershell
python -m pytest _build/tests/test_build_keyword_page_map.py -v
```
Expected: collection error (script doesn't exist yet).

- [ ] **Step 3: Implement `build_keyword_page_map.py`**

```python
"""Map every calc slug in calculators.json to its best primary keyword
plus up to 5 secondaries, sourced from finncalc_keywords.csv.

Matching precedence (lesson from buscalctools Phase 2):
1. Exact slug-token match in the keyword wins over cluster match.
2. Within slug-match candidates, highest volume wins.
3. If no slug-match, fall back to cluster-name match.
4. Skip stop-tokens (calculator, rate, of, for, the, a).
"""
import csv
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
STOP_TOKENS = {"calculator", "rate", "of", "for", "the", "a", "an"}

# Map calc-slug → cluster name in the keyword CSV. Keep this list explicit
# so a new calc forces a conscious mapping update.
SLUG_TO_CLUSTER = {
    "compound-interest": "investment_growth",
    "mortgage": "mortgage",
    "take-home-pay": "tax",
    "retirement-savings": "retirement_planning",
    "investment-growth": "investment_growth",
    "savings-goal": "savings_budget",
    "inflation-impact": "investment_growth",
    "net-worth": "savings_budget",
    "loan-payoff": "debt_loans",
    "credit-card-payoff": "debt_loans",
    "emergency-fund": "savings_budget",
    "sa-tax-calculator": "tax",
    "401k-calculator": "retirement_accounts",
    "roth-ira-calculator": "retirement_accounts",
    "student-loan-calculator": "debt_loans",
    "debt-snowball-calculator": "debt_loans",
    "fire-calculator": "retirement_planning",
    "isa-calculator": "retirement_accounts",
    "tfsa-calculator": "retirement_accounts",
    "coast-fire-calculator": "retirement_planning",
    "401k-withdrawal-calculator": "retirement_accounts",
    "401k-tax-calculator": "retirement_accounts",
    "mortgage-repayment-calculator": "mortgage",
    "mortgage-overpayment-calculator": "mortgage",
    "texas-paycheck-calculator": "tax",
    "california-paycheck-calculator": "tax",
    "paye-calculator": "tax",
}

def _tokens(s: str) -> set[str]:
    return {t for t in re.split(r"[\s\-]+", s.lower()) if t and t not in STOP_TOKENS}

def _slug_match_score(slug: str, kw: str) -> int:
    """Count how many non-stop tokens of `slug` appear in `kw`."""
    return len(_tokens(slug) & _tokens(kw))

def build_map(csv_path: Path, calcs: dict) -> dict:
    rows = list(csv.DictReader(csv_path.open(encoding="utf-8")))
    # First pass: per slug, find candidates by slug-token match.
    result: dict = {}
    used_kws: set[str] = set()
    for slug in calcs:
        candidates = []
        for r in rows:
            if r["keyword"] in used_kws:
                continue
            score = _slug_match_score(slug, r["keyword"])
            if score >= 1:
                candidates.append((score, int(r["search_volume"] or 0), r))
        if candidates:
            # Highest score, then highest volume.
            candidates.sort(key=lambda t: (-t[0], -t[1]))
            primary_row = candidates[0][2]
        else:
            # Fall back to cluster match.
            cluster = SLUG_TO_CLUSTER.get(slug)
            cluster_rows = [r for r in rows if r["cluster"] == cluster and r["keyword"] not in used_kws]
            cluster_rows.sort(key=lambda r: -int(r["search_volume"] or 0))
            primary_row = cluster_rows[0] if cluster_rows else None
        if not primary_row:
            result[slug] = {"primary": "", "secondaries": [], "cluster": SLUG_TO_CLUSTER.get(slug, "")}
            continue
        used_kws.add(primary_row["keyword"])
        # Collect up to 5 secondaries from the same cluster (still slug-related preferred).
        sec_pool = [r for r in rows
                    if r["cluster"] == primary_row["cluster"]
                    and r["keyword"] not in used_kws
                    and r["keyword"] != primary_row["keyword"]]
        sec_pool.sort(key=lambda r: (-_slug_match_score(slug, r["keyword"]), -int(r["search_volume"] or 0)))
        secondaries = [r["keyword"] for r in sec_pool[:5]]
        for s in secondaries:
            used_kws.add(s)
        result[slug] = {
            "primary": primary_row["keyword"],
            "secondaries": secondaries,
            "volume": int(primary_row["search_volume"] or 0),
            "difficulty": int(primary_row["difficulty"] or 0),
            "cluster": primary_row["cluster"],
            "geo": primary_row["geo"],
        }
    return result

def main():
    csv_path = Path("C:/FIN_CALC_SITE/keywords/finncalc_keywords.csv")
    calcs = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))
    result = build_map(csv_path, calcs)
    out = REPO / "_build/data/keyword_page_map.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out} — {len(result)} slugs mapped.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests until green**

```powershell
python -m pytest _build/tests/test_build_keyword_page_map.py -v
```
Expected: 4/4 pass.

- [ ] **Step 5: Run the script, eyeball the output**

```powershell
python _build/scripts/build_keyword_page_map.py
python -c "import json; d=json.load(open('_build/data/keyword_page_map.json',encoding='utf-8')); [print(s, '->', d[s]['primary'], d[s].get('volume'), 'KD', d[s].get('difficulty')) for s in d]"
```
Expected: each slug shows a sensible primary keyword. If any slug shows an off-topic primary (e.g. paye-calculator → "salary calculator"), STOP — adjust SLUG_TO_CLUSTER or the scoring heuristic.

- [ ] **Step 6: Commit**

```powershell
git add _build/scripts/build_keyword_page_map.py _build/tests/test_build_keyword_page_map.py _build/data/keyword_page_map.json
git commit -m "feat(seo-tooling): keyword-page map builder (slug-match precedence)"
```

### Task 2A.2: Build the schema coverage auditor

**Files:**
- Create: `_build/scripts/audit_schema_coverage.py`
- Create: `_build/tests/test_audit_schema_coverage.py`
- Output (when run): `_build/data/schema_coverage_report.json`

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_audit_schema_coverage.py
import json
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "audit_schema_coverage.py"

spec = importlib.util.spec_from_file_location("audit_schema_coverage", SCRIPT)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

EXPECTED_TYPES = {"WebApplication", "HowTo", "FAQPage", "Article",
                  "BreadcrumbList", "Organization", "Person"}

def test_auditor_parses_every_calc_page():
    report = mod.audit_all()
    calcs = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))
    for slug in calcs:
        assert slug in report, f"Auditor skipped {slug}"
        assert "types_present" in report[slug]
        assert "types_missing" in report[slug]

def test_known_complete_page_reports_no_gaps():
    """paye-calculator was shipped with full schema coverage in Phase 1E
    — it must report zero missing types as a known-good baseline."""
    report = mod.audit_all()
    assert report["paye-calculator"]["types_missing"] == [], \
        f"Baseline page paye-calculator should have full coverage; missing: {report['paye-calculator']['types_missing']}"
```

- [ ] **Step 2: Run it (expect ModuleNotFoundError)**

```powershell
python -m pytest _build/tests/test_audit_schema_coverage.py -v
```

- [ ] **Step 3: Implement `audit_schema_coverage.py`**

```python
"""Scan every calculator + variant rendered page; report which JSON-LD
schemas are present and which are missing. Pure read-only.

EXPECTED_TYPES is the contract every calc page should meet. Any page
showing missing types is a gap — fix in Phase 2B."""
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXPECTED_TYPES = {"WebApplication", "HowTo", "FAQPage", "Article",
                  "BreadcrumbList", "Organization", "Person"}

TYPE_RE = re.compile(r'"@type"\s*:\s*"([A-Za-z]+)"')

def audit_one(html: str) -> dict:
    types = set(TYPE_RE.findall(html))
    return {
        "types_present": sorted(types & EXPECTED_TYPES),
        "types_missing": sorted(EXPECTED_TYPES - types),
        "extra_types": sorted(types - EXPECTED_TYPES),
    }

def audit_all() -> dict:
    calcs = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))
    out: dict = {}
    for slug in calcs:
        page = REPO / slug / "index.html"
        if not page.exists():
            out[slug] = {"error": "missing page"}
            continue
        out[slug] = audit_one(page.read_text(encoding="utf-8"))
    return out

def main():
    report = audit_all()
    out = REPO / "_build/data/schema_coverage_report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    gaps = {s: r for s, r in report.items() if r.get("types_missing")}
    print(f"Wrote {out}.")
    print(f"{len(gaps)}/{len(report)} pages have missing schema types.")
    for slug, r in gaps.items():
        print(f"  {slug}: missing {r['types_missing']}")
    return 0

if __name__ == "__main__":
    import sys; sys.exit(main())
```

- [ ] **Step 4: Run tests + run the auditor**

```powershell
python -m pytest _build/tests/test_audit_schema_coverage.py -v
python _build/scripts/audit_schema_coverage.py
```
Expected: 2/2 tests pass. Auditor prints a gaps list. Capture the gaps for Phase 2B.

- [ ] **Step 5: Commit**

```powershell
git add _build/scripts/audit_schema_coverage.py _build/tests/test_audit_schema_coverage.py _build/data/schema_coverage_report.json
git commit -m "feat(seo-tooling): schema coverage auditor (read-only)"
```

### Task 2A.3: Build the calculators.json metadata patcher

**Files:**
- Create: `_build/scripts/patch_calculators_json.py`
- Create: `_build/tests/test_patch_calculators_json.py`

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_patch_calculators_json.py
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "patch_calculators_json.py"
spec = importlib.util.spec_from_file_location("patch_calculators_json", SCRIPT)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

def test_skips_when_primary_already_in_title():
    entry = {"title": "Dividend Calculator: Monthly Income from Stocks", "description": "X.", "metaDescription": "X."}
    kw = {"primary": "dividend calculator", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    assert changed is False, "Should not patch when primary already present"

def test_inserts_primary_into_description_if_missing():
    entry = {"title": "Compound Interest", "description": "Calculate growth over time.", "metaDescription": "Calculate growth over time."}
    kw = {"primary": "compound interest formula", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    assert changed is True
    assert "compound interest formula" in patched["description"].lower()

def test_refuses_title_over_60_chars():
    entry = {"title": "X" * 50, "description": "Y.", "metaDescription": "Y."}
    kw = {"primary": "very long primary keyword phrase here", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    # Even if we'd want to rewrite title, the new title must stay <= 60 chars
    assert len(patched["title"]) <= 60

def test_idempotent():
    entry = {"title": "Dividend Calculator", "description": "Generic.", "metaDescription": "Generic."}
    kw = {"primary": "dividend calculator", "secondaries": []}
    a, _ = mod.patch_entry(entry, kw)
    b, changed = mod.patch_entry(a, kw)
    assert changed is False
```

- [ ] **Step 2: Run (expect failure)**

```powershell
python -m pytest _build/tests/test_patch_calculators_json.py -v
```

- [ ] **Step 3: Implement `patch_calculators_json.py`**

```python
"""Patch calculators.json entries by inserting the primary keyword into
title (if it fits <=60 chars) and description / metaDescription (if missing).
Conservative: never overwrite a description that already contains the
primary keyword; never produce a title > 60 chars.

Run dry-run by default. Pass --apply to write."""
import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAX_TITLE = 60

def patch_entry(entry: dict, kw: dict) -> tuple[dict, bool]:
    """Return (patched_entry, changed_bool)."""
    out = deepcopy(entry)
    primary = (kw.get("primary") or "").strip()
    if not primary:
        return out, False
    changed = False
    pl = primary.lower()
    # Description / metaDescription: insert primary kw if missing.
    for field in ("description", "metaDescription"):
        cur = (out.get(field) or "").strip()
        if cur and pl not in cur.lower():
            # Prepend "Free {primary}. " if descriptive room; else append.
            new = f"Free {primary}. {cur}" if len(f"Free {primary}. {cur}") <= 160 else f"{cur} ({primary})"
            if new != cur:
                out[field] = new
                changed = True
    # Title: only rewrite if (a) primary kw missing AND (b) new title fits <=60.
    cur_title = (out.get("title") or "").strip()
    if cur_title and pl not in cur_title.lower():
        candidate = f"{primary.title()}: {cur_title}" if len(f"{primary.title()}: {cur_title}") <= MAX_TITLE else cur_title
        if candidate != cur_title and len(candidate) <= MAX_TITLE:
            out["title"] = candidate
            changed = True
    return out, changed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = ap.parse_args()

    calcs_path = REPO / "_build/data/calculators.json"
    map_path = REPO / "_build/data/keyword_page_map.json"
    calcs = json.loads(calcs_path.read_text(encoding="utf-8"))
    kwmap = json.loads(map_path.read_text(encoding="utf-8"))

    diffs: list[str] = []
    new_calcs = {}
    for slug, entry in calcs.items():
        kw = kwmap.get(slug, {})
        patched, changed = patch_entry(entry, kw)
        new_calcs[slug] = patched
        if changed:
            diffs.append(slug)

    if not diffs:
        print("No changes proposed.")
        return 0
    print(f"{len(diffs)} entries would change:")
    for slug in diffs:
        print(f"  {slug}: title='{new_calcs[slug]['title']}'")
    if args.apply:
        calcs_path.write_text(json.dumps(new_calcs, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {calcs_path}.")
    else:
        print("(dry-run; pass --apply to write)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Tests pass**

```powershell
python -m pytest _build/tests/test_patch_calculators_json.py -v
```

- [ ] **Step 5: Dry-run + visual review**

```powershell
python _build/scripts/patch_calculators_json.py
```
Expected: a list of proposed changes (likely 5-12 entries). If any proposed change looks bad (e.g. title now contradicts page content), STOP — refine `patch_entry` until proposals are all safe.

- [ ] **Step 6: Commit (without --apply yet — that's Phase 2B)**

```powershell
git add _build/scripts/patch_calculators_json.py _build/tests/test_patch_calculators_json.py
git commit -m "feat(seo-tooling): calculators.json metadata patcher (idempotent, 60-char cap, dry-run default)"
```

### Task 2A.4: Build the rendered meta-description patcher

**Files:**
- Create: `_build/scripts/patch_meta_rendered.py`
- Create: `_build/tests/test_patch_meta_rendered.py`

This mirrors `patch_titles_rendered.py` but for `<meta name="description">`, `og:description`, `twitter:description`. After 2A.3 updates `calculators.json`, the existing `patch_titles_rendered.py` will push titles to rendered HTML; this new script pushes descriptions.

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_patch_meta_rendered.py
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "patch_meta_rendered.py"
spec = importlib.util.spec_from_file_location("patch_meta_rendered", SCRIPT)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

def test_updates_all_three_description_tags():
    html = '''
    <head>
    <meta name="description" content="OLD">
    <meta property="og:description" content="OLD">
    <meta name="twitter:description" content="OLD">
    </head>'''
    out, changed = mod.compute_patched_html(html, "NEW description text.")
    assert changed
    assert out.count("NEW description text.") == 3

def test_idempotent():
    html = '<meta name="description" content="X."><meta property="og:description" content="X."><meta name="twitter:description" content="X.">'
    first, _ = mod.compute_patched_html(html, "X.")
    second, changed = mod.compute_patched_html(first, "X.")
    assert changed is False
```

- [ ] **Step 2: Run (expect ModuleNotFoundError)**

```powershell
python -m pytest _build/tests/test_patch_meta_rendered.py -v
```

- [ ] **Step 3: Implement `patch_meta_rendered.py`**

```python
"""Push <meta name="description">, og:description, twitter:description
from calculators.json `description` (or `metaDescription` if present) into
every rendered <slug>/index.html. Same pattern as patch_titles_rendered.py.
Idempotent."""
import json
import re
import sys
from html import escape
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"

NAME_DESC = re.compile(r'(<meta\s+name="description"\s+content=")([^"]*)(")', re.IGNORECASE)
OG_DESC = re.compile(r'(<meta\s+property="og:description"\s+content=")([^"]*)(")', re.IGNORECASE)
TW_DESC = re.compile(r'(<meta\s+name="twitter:description"\s+content=")([^"]*)(")', re.IGNORECASE)

def compute_patched_html(html: str, new_desc: str) -> tuple[str, bool]:
    target = escape(new_desc, quote=True)
    changed = False
    def _sub(pat, s):
        nonlocal changed
        def repl(m):
            nonlocal changed
            if m.group(2) == target:
                return m.group(0)
            changed = True
            return f"{m.group(1)}{target}{m.group(3)}"
        return pat.sub(repl, s)
    out = _sub(NAME_DESC, html)
    out = _sub(OG_DESC, out)
    out = _sub(TW_DESC, out)
    return out, changed

def _descriptions_from_calculators() -> dict[str, str]:
    calcs = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for slug, entry in calcs.items():
        if not isinstance(entry, dict):
            continue
        # metaDescription takes precedence (it's the SEO-tuned variant);
        # fall back to description.
        d = entry.get("metaDescription") or entry.get("description")
        if d:
            out[f"{slug}/index.html"] = d
    return out

def main():
    updated = 0
    skipped = 0
    for relpath, desc in _descriptions_from_calculators().items():
        page = REPO / relpath
        if not page.exists():
            skipped += 1
            continue
        old = page.read_text(encoding="utf-8")
        new, changed = compute_patched_html(old, desc)
        if changed:
            page.write_text(new, encoding="utf-8")
            updated += 1
    print(f"{updated} updated, {skipped} skipped (page not present).")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Tests pass**

```powershell
python -m pytest _build/tests/test_patch_meta_rendered.py -v
```

- [ ] **Step 5: Smoke run on the current tree (should be no-op since calculators.json hasn't been patched yet)**

```powershell
python _build/scripts/patch_meta_rendered.py
```
Expected: "0 updated" (or close to it — only differences would be if any rendered page drifted from JSON).

- [ ] **Step 6: Commit + open Phase 2A PR**

```powershell
git add _build/scripts/patch_meta_rendered.py _build/tests/test_patch_meta_rendered.py
git commit -m "feat(seo-tooling): rendered meta-description patcher (idempotent)"
git push -u origin feature/finncalc-phase-2a-toolchain-2026-05-24
gh pr create --base feature/finncalc-phase-1e-paye-sa-2026-05-24 --head feature/finncalc-phase-2a-toolchain-2026-05-24 \
  --title "feat(seo-tooling): Phase 2A — keyword + schema + metadata toolchain" \
  --body "Ports the buscalctools Phase 2 toolchain pattern to finncalc."
```

---

## Phase 2B — Optimization sweep

Goal: apply the toolchain to all 27 calc pages. Estimated 4h.

### Task 2B.1: Apply the calculators.json patcher

**Files:** edits to `_build/data/calculators.json` only.

- [ ] **Step 1: Branch off Phase 2A**

```powershell
git checkout -b feature/finncalc-phase-2b-optimization-sweep-2026-05-24
```

- [ ] **Step 2: Re-build the keyword-page-map (in case calculators.json changed)**

```powershell
python _build/scripts/build_keyword_page_map.py
```

- [ ] **Step 3: Dry-run, capture proposals**

```powershell
python _build/scripts/patch_calculators_json.py
```
Read every proposed change. STOP if any look wrong; refine and re-run.

- [ ] **Step 4: Apply**

```powershell
python _build/scripts/patch_calculators_json.py --apply
```

- [ ] **Step 5: Propagate to rendered HTML via existing + new patchers**

```powershell
python _build/scripts/patch_titles_rendered.py
python _build/scripts/patch_meta_rendered.py
```

- [ ] **Step 6: Run full test suite to confirm no regression**

```powershell
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```
Expected: **1202 passed** (the Phase 1E baseline) or higher (toolchain tests added Phase 2A tests). Any failure here means the patcher introduced a contract violation — diagnose before commit.

- [ ] **Step 7: Commit (toolchain + sweep separately for clean bisect)**

```powershell
git add _build/data/calculators.json _build/data/keyword_page_map.json <changed slug>/index.html
git commit -m "content(seo): apply primary-keyword metadata sweep across 27 calc pages

Source: _build/data/keyword_page_map.json (built from finncalc_keywords.csv)
Pages touched: <slug list from patcher output>"
```

### Task 2B.2: Fix any schema gaps surfaced

- [ ] **Step 1: Re-run the auditor on the patched tree**

```powershell
python _build/scripts/audit_schema_coverage.py
```

- [ ] **Step 2: For each page with `types_missing`, diagnose**

The likely gap categories:
- **Article / WebPage** missing → `generate.py` template issue; check `_build/templates/calculator.html.j2`
- **HowTo / FAQPage** missing → entry in `calculators.json` lacks `schemaHowTo` or `faq` — add it
- **Person / Organization** missing → re-run `inject_author_schema_rendered.py`

- [ ] **Step 3: Fix the smallest possible scope per gap**

If a page is missing FAQPage, add a `faq` array (3-5 entries) to its calculators.json entry, re-run generate.py + revert collateral + injectors per EXECUTION POLICY. Test count expected: still 1202 (or +N for any new related-calc parameterised tests added because of the fix).

- [ ] **Step 4: Commit each gap fix as its own commit**

### Task 2B.3: Geo disambiguation pass

**Files:**
- Edit: `_build/bodies/mortgage.html` — add UK callout block linking to `/mortgage-repayment-calculator/` + `/mortgage-overpayment-calculator/`
- Edit: `_build/bodies/take-home-pay.html` — add state callout linking to `/texas-paycheck-calculator/` + `/california-paycheck-calculator/`
- Edit: `_build/bodies/sa-tax-calculator.html` — add monthly-PAYE callout linking to `/paye-calculator/`

- [ ] **Step 1: Edit `_build/bodies/mortgage.html`**

Insert immediately after the existing `<div class="container">` opener (so the callout appears above the calculator):

```html
<div class="callout-region" style="background:#eef5ff;border-left:4px solid #1B3A5C;padding:12px 16px;margin:0 0 16px;border-radius:4px">
  <strong>UK reader?</strong> See our <a href="/mortgage-repayment-calculator/">UK mortgage repayment calculator</a> for monthly-arrears CMHC-correct UK conventions, or the <a href="/mortgage-overpayment-calculator/">overpayment calculator</a> for the 10% ERC-free rule.
</div>
```

- [ ] **Step 2: Edit `_build/bodies/take-home-pay.html`** — same pattern, callout linking to TX + CA paycheck calculators.

- [ ] **Step 3: Edit `_build/bodies/sa-tax-calculator.html`** — callout linking to `/paye-calculator/` for monthly-PAYE focus.

- [ ] **Step 4: Re-run generate.py + revert collateral + injectors (EXECUTION POLICY)**

```powershell
python _build/generate.py --apply
git status --short | grep "^ M" | awk '{print $2}' | grep -v "^_build/" | grep -v "^mortgage/index.html$" | grep -v "^take-home-pay/index.html$" | grep -v "^sa-tax-calculator/index.html$" | xargs git checkout --
python _build/scripts/inject_related_calculators_rendered.py
python _build/scripts/inject_author_schema_rendered.py
python _build/scripts/inject_favicon_rendered.py
python _build/scripts/inject_geo_targeting_rendered.py
```

- [ ] **Step 5: Test suite green**

```powershell
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```

- [ ] **Step 6: Commit + open Phase 2B PR**

```powershell
git add _build/bodies/mortgage.html _build/bodies/take-home-pay.html _build/bodies/sa-tax-calculator.html mortgage/index.html take-home-pay/index.html sa-tax-calculator/index.html
git commit -m "content(seo): geo-region disambiguation callouts (UK mortgage, US state, SA PAYE)"
git push -u origin feature/finncalc-phase-2b-optimization-sweep-2026-05-24
gh pr create --base feature/finncalc-phase-2a-toolchain-2026-05-24 --head feature/finncalc-phase-2b-optimization-sweep-2026-05-24 \
  --title "content(seo): Phase 2B — metadata sweep + geo disambiguation" \
  --body "Applies the 2A toolchain across all 27 calc pages + adds geo callouts."
```

---

## Phase 2C — Dividend Calculator

Target: `dividend calculator` 33,100 vol KD 16 (P1, investment_growth cluster).

**Reference implementation:** mirror the Coast FIRE / Texas Paycheck patterns from Phase 1. Single module, single page, full schemas.

### Task 2C.1: Branch + write the calc module

**Files:** `js/calc/dividend.js`

- [ ] **Step 1: Branch off Phase 2B**

```powershell
git checkout -b feature/finncalc-phase-2c-dividend-calculator-2026-05-24
```

- [ ] **Step 2: Write the calc module**

Functions to expose:
- `calcDividend({shares, dividendPerShare, frequency, drip, growthPct, years, taxRatePct, wrapper})` returning `{annualIncome, monthlyIncome, totalValue, totalDividendsReceived, totalTaxPaid, sharesAtEnd, ...}`
- `STOCK_FREQUENCIES = {quarterly: 4, monthly: 12, semiannual: 2, annual: 1}` — most US/UK common-stock dividends are quarterly
- DRIP modelling: each dividend payment buys fractional new shares at the same price, those new shares pay dividends going forward (compounds)
- Wrapper modelling: `taxable` (full tax), `roth_ira` (0%), `traditional_ira` (deferred, treat as 0% in-account), `tfsa` (0%), `isa` (0%), `taxable_qualified` (15% LTCG-style fallback)
- Growth modelling: `dividendPerShare` grows at `growthPct` per year (dividend growth — different from share-price growth)

Reuse the dual-export pattern (CommonJS + window-global) from `js/calc/paye-sa.js`.

- [ ] **Step 3: Write 8+ test cases in `_build/tests/test_dividend.js`**

Cases to cover:
1. Baseline: 100 shares × $1 quarterly dividend, no DRIP, no growth, taxable → $400/yr, monthly $33.33
2. DRIP enabled: same setup over 20 years → significantly more shares than start
3. Tax wrapper Roth IRA: 0% tax, all income reinvested if DRIP
4. Dividend growth: 5% annual growth → cumulative income > flat baseline
5. Quarterly vs monthly frequency: same annual amount, just split differently
6. Invalid input: zero shares, negative DPS, growth > 100%

- [ ] **Step 4: Run tests**

```powershell
node _build/tests/test_dividend.js
```
Expected: all cases pass.

- [ ] **Step 5: Commit**

```powershell
git add js/calc/dividend.js _build/tests/test_dividend.js
git commit -m "feat(dividend): pure-function dividend calc module (DRIP, growth, wrappers)"
```

### Task 2C.2: Write the body + calculators.json entry

**Files:**
- `_build/bodies/dividend-calculator.html`
- `_build/data/calculators.json` (new entry)
- `_build/test_calculators_data.py` (EXPECTED_SLUGS 27 → 28)
- `_build/tests/test_related_calculators.py` (CALC_PAGES count 27 → 28)

- [ ] **Step 1: Write `_build/bodies/dividend-calculator.html`**

Mirror the texas-paycheck-calculator structure:
- Card header with calc tagline
- Form: shares, DPS, frequency, DRIP toggle, dividend growth %, years, wrapper select, tax rate (only if wrapper=taxable)
- Results grid: annual income, monthly income, total dividends over period, total value at end, total tax paid, shares at end
- Methodology section with sources (IRS Pub 550 for taxable; HMRC SI Income; SARS Dividend Tax)
- FAQ block (8 questions covering: what is a dividend, what is DRIP, qualified vs ordinary, tax in IRA, ex-dividend date, yield vs growth, when paid, dividend coverage ratio)
- Related calcs block (will be auto-injected)

- [ ] **Step 2: Add the calculators.json entry**

Follow the texas-paycheck-calculator template — fields needed: `slug`, `name`, `title` (max 60 chars; suggested: "Dividend Calculator: DRIP, Growth, Tax Wrappers" = 50 chars), `description`, `h1`, `subtitle`, `metaDescription`, `regions`, `primaryKeyword: "dividend calculator"`, `schemaWebApp`, `schemaHowTo`, `faq` (8 entries), `sources`, `related`, `scenarios`, `keyConcepts`.

`related` array (must be 6 distinct slugs from CALCULATORS, no self-reference):
```
["compound-interest", "investment-growth", "roth-ira-calculator", "tfsa-calculator", "fire-calculator", "retirement-savings"]
```

- [ ] **Step 3: Bump test counts**

```python
# _build/test_calculators_data.py — add "dividend-calculator" to EXPECTED_SLUGS
# _build/tests/test_related_calculators.py — bump CALC_PAGES count 27 -> 28
```

- [ ] **Step 4: Generate + revert collateral + injectors**

```powershell
python _build/generate.py --apply
git status --short | grep "^ M" | awk '{print $2}' | grep -v "^_build/" | grep -v "^dividend-calculator/" | xargs git checkout --
python _build/scripts/inject_related_calculators_rendered.py
python _build/scripts/inject_author_schema_rendered.py
python _build/scripts/inject_favicon_rendered.py
python _build/scripts/inject_geo_targeting_rendered.py
```

- [ ] **Step 5: Sanity-check rendered page**

```powershell
grep -c "FAQPage\|HowTo\|WebApplication\|related-calculators" dividend-calculator/index.html
```
Expected: ≥4.

- [ ] **Step 6: Test suite green**

```powershell
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
node _build/tests/test_dividend.js
```
Expected: 1204 pytest pass (1202 prev + 2 from CALC_PAGES bump + test_related_calc parameterised); 8+ JS cases.

- [ ] **Step 7: Commit + open PR**

```powershell
git add js/calc/dividend.js _build/tests/test_dividend.js _build/bodies/dividend-calculator.html _build/data/calculators.json _build/test_calculators_data.py _build/tests/test_related_calculators.py dividend-calculator/
git commit -m "feat(dividend-calculator): Phase 2C — Dividend Calculator (33,100 vol)"
git push -u origin feature/finncalc-phase-2c-dividend-calculator-2026-05-24
gh pr create --base feature/finncalc-phase-2b-optimization-sweep-2026-05-24 --head feature/finncalc-phase-2c-dividend-calculator-2026-05-24 \
  --title "feat(dividend-calculator): Phase 2C — Dividend Calculator" \
  --body "Targets 'dividend calculator' (33,100 vol, KD 16)."
```

---

## Phase 2D — Roth IRA Conversion Calculator

Target: `roth ira conversion calculator` 1,600 vol KD 10 (anchored on `ira roth conversion calculator` 1,300 vol KD 4 — exceptional ranking opportunity). Combined cluster volume ~6,800.

Strategically distinct from existing `/roth-ira-calculator/` (contribution-focused). This page models a CONVERSION: taking pre-tax 401k / traditional IRA money and paying ordinary income tax now to convert it to Roth, then projecting tax-free growth.

### Task 2D.1: Branch + write the calc module

**Files:** `js/calc/roth-ira-conversion.js`

- [ ] **Step 1: Branch off Phase 2C**

```powershell
git checkout -b feature/finncalc-phase-2d-roth-ira-conversion-2026-05-24
```

- [ ] **Step 2: Write the module**

Exposed function:
- `calcRothConversion({conversionAmount, currentAge, retirementAge, currentMarginalRatePct, retirementMarginalRatePct, expectedReturnPct, taxPaidFromConversion})` returning `{conversionTax, postConversionAmount, valueAtRetirementRoth, valueAtRetirementTraditional, breakEvenAge, taxSavings, ...}`

Logic:
- Conversion tax = `conversionAmount × currentMarginalRatePct%`
- If `taxPaidFromConversion=true`: amount transferring to Roth = `conversionAmount - conversionTax` (taxes paid from the converted amount — less tax-efficient)
- If `taxPaidFromConversion=false`: amount transferring to Roth = `conversionAmount` (taxes paid from outside funds — preferred, captures full conversion in tax shelter)
- Project both scenarios (Roth tax-free vs Traditional tax-deferred) to retirement age at `expectedReturnPct`
- Traditional retirement value is taxed at `retirementMarginalRatePct%` when withdrawn
- Break-even: number of years until Roth > Traditional after-tax

- [ ] **Step 3: Write 8+ test cases**

Cases:
1. $50k conversion, 22% now, 22% retire, 7% return, 30 yrs, taxes from outside: Roth $380k vs Traditional $380k × 78% = $297k after retirement tax → Roth wins by ~$83k
2. Same setup but `taxPaidFromConversion=true`: Roth converts to $39k → grows to $297k → Roth and Traditional tie
3. Lower retirement tax rate (12% vs 22% now): Traditional wins (savings rate arbitrage)
4. Higher retirement tax rate: Roth wins bigger
5. Invalid inputs: negative conversion, retirement age ≤ current age

- [ ] **Step 4: Run tests**

```powershell
node _build/tests/test_roth_ira_conversion.js
```

- [ ] **Step 5: Commit**

```powershell
git add js/calc/roth-ira-conversion.js _build/tests/test_roth_ira_conversion.js
git commit -m "feat(roth-ira-conversion): pure-function Roth conversion projection module"
```

### Task 2D.2: Body + calculators.json + propagate

Same shape as Task 2C.2. Title cap: 60 chars (suggested: "Roth IRA Conversion Calculator: Pay Now or Later?" = 49 chars).

- [ ] Steps 1-7 mirror 2C.2 with substituted slug `roth-ira-conversion-calculator`.

`related` array suggestion:
```
["roth-ira-calculator", "401k-calculator", "401k-withdrawal-calculator", "401k-tax-calculator", "fire-calculator", "retirement-savings"]
```

- [ ] **Final step: PR stacked on 2C**

---

## Phase 2E — FIRE Number + Simple Interest (combined PR)

These two calcs are smaller scope (well-bounded math, narrower keyword corpus) so they ship together in one PR.

### Phase 2E.1 — FIRE Number Calculator

Target: `fire number calculator` 1,300 vol KD 11 (P1, retirement_planning). Distinct from existing `/fire-calculator/` (full FIRE projection) — this is the single-number "what's my FIRE target" computation: `FIRE_number = annual_expenses / safe_withdrawal_rate`.

**Files (additive only):**
- `js/calc/fire-number.js` — exposes `calcFireNumber({annualExpenses, withdrawalRatePct, inflationPct, yearsToFire, currentSavings, monthlyContribution, returnPct})` returning `{fireNumber, fireNumberInflationAdjusted, monthlyContribNeeded, yearsAtCurrentRate, surplusOrGap}`
- `_build/tests/test_fire_number.js` — 6+ cases
- `_build/bodies/fire-number-calculator.html`
- calculators.json entry

### Phase 2E.2 — Simple Interest Calculator

Target: `simple interest calculator` 40,500 vol KD 23 (P1, investment_growth). Distinct from `/compound-interest/` — pedagogically valuable, often taught in school finance.

**Files (additive only):**
- `js/calc/simple-interest.js` — exposes `calcSimpleInterest({principal, ratePct, years, frequency})` returning `{interest, total, comparison_vs_compound}` (showing the spread between simple and compound is the unique value)
- `_build/tests/test_simple_interest.js` — 6+ cases including the formula `I = P × r × t`
- `_build/bodies/simple-interest-calculator.html`
- calculators.json entry

### Combined Phase 2E flow

- [ ] **Step 1: Branch off Phase 2D**

```powershell
git checkout -b feature/finncalc-phase-2e-fire-number-and-simple-interest-2026-05-24
```

- [ ] **Step 2-4: Build, test, body for fire-number** (mirror 2C.1 + 2C.2)
- [ ] **Step 5-7: Build, test, body for simple-interest** (mirror 2C.1 + 2C.2)
- [ ] **Step 8: Bump test counts together** (EXPECTED_SLUGS 29 → 31, CALC_PAGES 29 → 31)
- [ ] **Step 9: Generate + revert + injectors** (one pass for both new pages)
- [ ] **Step 10: Test suite green** (expected: 1208 pytest pass — 1204 + 2 + 2)
- [ ] **Step 11: Commit + PR stacked on 2D**

```powershell
git commit -m "feat(fire-number,simple-interest): Phase 2E — paired retirement + education calcs"
git push -u origin feature/finncalc-phase-2e-fire-number-and-simple-interest-2026-05-24
gh pr create --base feature/finncalc-phase-2d-roth-ira-conversion-2026-05-24 --head feature/finncalc-phase-2e-fire-number-and-simple-interest-2026-05-24 \
  --title "feat: Phase 2E — FIRE Number + Simple Interest calculators" \
  --body "Closes Plan B Phase 2 with two well-bounded final calcs."
```

---

## Phase 2F — Re-Audit Gate

After all PRs are merged + ~30 days of crawl + indexing time.

### Task 2F.1: Re-run the SEO audit

- [ ] **Step 1: Re-run the audit**

```powershell
# In Claude Code:
/seo-audit https://finncalc.com/
```

- [ ] **Step 2: Compare composite score vs Phase 1 baseline**

Expected lifts:
- **Content score**: +5-10 (more topical coverage from 4 new calcs)
- **Keyword score**: +3-7 (metadata sweep lifted existing pages)
- **Technical score**: +2-5 (schema gap fixes)
- **Authority score**: unchanged (no link work in Phase 2)

- [ ] **Step 3: Generate the comparison report**

```powershell
/seo report-pdf finncalc.com
```

Compare to baseline at `~/.claude/skills/seo/output/finncalc.com-audit-<prior-date>.json`.

- [ ] **Step 4: Draft Phase 3 plan based on the diff**

Phase 3 candidates:
- Internal linking sweep (cross-link new calcs into existing pages' related rails)
- Backlinks subscription activation + first outreach batch
- Content depth on top 5 highest-vol pages (longer keyConcepts, more FAQ entries)

---

## Operator action items

These are out-of-scope for the implementer but required for the program to actually rank:

- [ ] Activate DataForSEO Backlinks subscription
- [ ] Merge PRs in order: Phase 2A → 2B → 2C → 2D → 2E
- [ ] After each merge, allow ~48h for Cloudflare/Google recrawl before merging the next
- [ ] After final merge, resubmit sitemap to GSC + Bing + Yandex + IndexNow ping
- [ ] Set a 30-day calendar reminder for Phase 2F re-audit

---

## Self-Review

**Spec coverage:**
- [x] Toolchain (build_keyword_page_map, audit_schema_coverage, patch_calculators_json, patch_meta_rendered) — 2A
- [x] Sweep applied to all 27 pages — 2B.1
- [x] Schema gaps closed — 2B.2
- [x] Geo disambiguation (3 pages) — 2B.3
- [x] 4 curated new calcs (Dividend, Roth Conversion, FIRE Number, Simple Interest) — 2C, 2D, 2E
- [x] Re-audit gate — 2F
- [x] EXECUTION POLICY enforced at every generate.py step
- [x] Stacked-PR sequence enables in-order merge with operator
- [x] Title 60-char cap enforced at the patcher level + repeated as a per-task reminder

**Placeholder scan:** all steps contain actual commands and code; no TBDs.

**Type consistency:**
- `build_map(csv_path, calcs) → dict` used identically in Task 2A.1 test + impl
- `compute_patched_html(html, new_desc) → (str, bool)` used identically in 2A.4 test + impl
- `patch_entry(entry, kw) → (dict, bool)` used identically in 2A.3 test + impl

**Risk register:**
1. **Keyword-page-map producing off-topic primaries**: mitigated by slug-match-beats-cluster precedence + Task 2A.1 step 5 visual review.
2. **calculators.json patcher producing bad titles**: mitigated by 60-char cap + dry-run-by-default + visual review.
3. **EXECUTION POLICY drift if implementer forgets to revert collateral**: each generate.py invocation has the revert command inlined; reviewer checks for `git status --short` cleanliness before commit.
4. **Schema auditor false negatives on variant pages**: smoke-tested against paye-calculator baseline (Task 2A.2 test 2).

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-24-finncalc-phase-2-optimization-and-new-calcs.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review (spec then quality), fast iteration. Same approach as Plan B Phase 1.

**2. Inline Execution** — task-by-task in this session with operator checkpoints.

Which approach?
