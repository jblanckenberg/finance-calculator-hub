# finncalc.com — Keyword-Driven Content Build-Out

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ~8 high-value calculator pages that fill keyword gaps identified in `C:\FIN_CALC_SITE\keywords\finncalc_keywords.csv` (181 keywords, 7 clusters), then keyword-optimise the ~50 existing pages via the rendered-patcher pattern. Targeting the 40 P1 keywords (vol ≥1,000 & KD ≤25) before the scheduled 2026-07-21 re-audit.

**Architecture:** Python + Jinja static site. Add new calc pages via `_build/bodies/<slug>.html` + `_build/schemas/<slug>.json` + (where needed) supporting fixtures, then run the build pipeline. Optimise existing pages via `_build/scripts/patch_<thing>_rendered.py` patchers — the pattern proven by the 2026-05-21 SEO remediation. Source of truth for keyword targets is `C:\FIN_CALC_SITE\keywords\finncalc_keywords.csv`.

**Tech Stack:** Python 3.12 + Jinja2 + html5lib (validator), pytest, the `_build/scripts/` rendered-patcher toolkit, Cloudflare Pages, GSC + Bing Webmaster.

**Context — what is already done** (per MEMORY 2026-05-21):
- 2026-05-21 SEO remediation shipped: branch `seo-remediation-2026-05-21` merged, 11 commits, 805 tests pass
- All 8 Phase A dashboard actions complete: GSC sitemap + Bing sitemap + Yandex sitemap + IndexNow ping + Cloudflare cache purge + DataForSEO Backlinks subscription
- Phase C re-audit scheduled on or around **2026-07-21** (60-day window)
- Composite SEO score moving from 21 toward target ≥75

This plan picks up from there: now that the technical SEO baseline is solid, the path to composite ≥75 is **content depth** — filling the gaps the keyword research surfaced.

**Keyword corpus highlights** (`C:\FIN_CALC_SITE\keywords\finncalc_keywords.csv`, 181 rows):
- 40 P1 / 57 P2 / 84 P3 by tier
- Geo split: 148 US · 23 UK · 10 SA (multi-region matters)
- Strongest clusters by total volume: mortgage (3.3M, UK-heavy), investment_growth (2.6M, brand-dominated), tax (2.5M, paycheck-state-specific)
- Lowest-difficulty cluster: debt_loans (avg KD 22.3) — most P1 opportunities concentrated here
- Cleanest gap: `coast fire calculator` (27,100 vol, KD 9) — site has `/fire-calculator` but no Coast FIRE variant

---

## Phase 0 — Pre-flight + Pattern Discovery

### Task 0.1: Confirm the calc-creation pattern by reading an existing calc end-to-end

- [ ] **Step 1: Read the existing `/401k-calculator` artefacts**

```bash
cat /c/FIN_CALC_SITE/Finance_Calculator_Hub/_build/bodies/401k-calculator.html
cat /c/FIN_CALC_SITE/Finance_Calculator_Hub/_build/schemas/401k-calculator.json
ls /c/FIN_CALC_SITE/Finance_Calculator_Hub/_build/fixtures/ | grep -i 401k
ls /c/FIN_CALC_SITE/Finance_Calculator_Hub/_build/tests/ | grep -i 401k
```

- [ ] **Step 2: Document the calc lifecycle in your head**

The flow:
1. `_build/bodies/<slug>.html` — page content body (Jinja partial)
2. `_build/schemas/<slug>.json` — FAQPage JSON-LD + any Calculator schema
3. `_build/templates/calculator.html` — shared shell (already exists, don't touch)
4. Build pipeline reads bodies + schemas + renders into the top-level `<slug>/index.html`
5. Rendered-patcher scripts run after build to inject any cross-cutting concerns (favicon, author schema, related-tools rail, etc.)

- [ ] **Step 3: Confirm by running the build (or dry-run if no entry point per EXECUTION POLICY)**

Per MEMORY: "EXECUTION POLICY (no generate.py)" — there is no top-level generate.py; building happens through `_build/scripts/*` invoked in sequence per `_build/scripts/full_seo_regression.ps1`.

```powershell
.\_build\scripts\full_seo_regression.ps1 -DryRun
```

If that flag doesn't exist, read the script to learn the actual orchestration; build a fresh body for an existing slug (e.g. `compound-interest.html`) without committing, verify it picks up.

### Task 0.2: Set up the keyword-to-page join

**Files:**
- Create: `_build/scripts/build_keyword_page_map.py`
- Create: `_build/data/keyword_page_map.json` (generated)
- Test: `_build/tests/test_keyword_page_map.py`

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_keyword_page_map.py
from pathlib import Path
from _build.scripts.build_keyword_page_map import build_keyword_page_map


def test_existing_calcs_get_at_least_one_keyword():
    m = build_keyword_page_map()
    for slug in ['mortgage', '401k-calculator', 'fire-calculator', 'credit-card-payoff', 'compound-interest']:
        assert slug in m, f'{slug} should have a keyword mapping'


def test_primary_keyword_contains_slug_token():
    m = build_keyword_page_map()
    entry = m.get('fire-calculator')
    assert entry is not None
    assert 'fire' in entry['primary']['keyword'].lower()
```

- [ ] **Step 2: Run, verify fail**

```bash
cd C:\FIN_CALC_SITE\Finance_Calculator_Hub && python -m pytest _build/tests/test_keyword_page_map.py -v
```

- [ ] **Step 3: Implement**

```python
# _build/scripts/build_keyword_page_map.py
"""Build a per-page keyword targeting map from finncalc_keywords.csv.

Joins the keyword CSV (one row per keyword) against the live calc-page slugs
(directories in the site root). For each slug, picks the best-scoring keyword
(volume/difficulty ratio) as `primary` and the next 5 as `secondary`.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

KEYWORDS_CSV = Path(r'C:\FIN_CALC_SITE\keywords\finncalc_keywords.csv')
SITE_ROOT = Path(r'C:\FIN_CALC_SITE\Finance_Calculator_Hub')


def _slug_similarity(slug: str, keyword: str) -> float:
    slug_tokens = set(slug.split('-'))
    kw_tokens = set(keyword.lower().replace('-', ' ').split())
    if not slug_tokens or not kw_tokens:
        return 0.0
    overlap = len(slug_tokens & kw_tokens)
    return overlap / max(len(slug_tokens), len(kw_tokens))


def build_keyword_page_map() -> dict:
    with KEYWORDS_CSV.open(encoding='utf-8-sig') as fh:
        rows = list(csv.DictReader(fh))
    slugs = sorted(
        d.name for d in SITE_ROOT.iterdir()
        if d.is_dir() and not d.name.startswith(('.', '_', 'node_modules'))
    )
    out: dict[str, dict] = {}
    for slug in slugs:
        scored = []
        for r in rows:
            sim = _slug_similarity(slug, r['keyword'])
            if sim < 0.5:
                continue
            vol = int(r['search_volume'] or 0)
            kd = max(int(r['difficulty'] or 1), 1)
            scored.append({
                'keyword': r['keyword'],
                'volume': vol,
                'difficulty': kd,
                'intent': r['intent'],
                'geo': r.get('geo', 'us'),
                'score': vol / kd,
            })
        if not scored:
            continue
        scored.sort(key=lambda x: x['score'], reverse=True)
        out[slug] = {
            'primary': {k: scored[0][k] for k in ('keyword', 'volume', 'difficulty', 'intent', 'geo')},
            'secondary': [{k: s[k] for k in ('keyword', 'volume', 'difficulty', 'geo')} for s in scored[1:6]],
        }
    return out


def main() -> None:
    m = build_keyword_page_map()
    out_path = SITE_ROOT / '_build' / 'data' / 'keyword_page_map.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(m, indent=2), encoding='utf-8')
    print(f'Wrote {out_path} ({len(m)} pages mapped)')


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: Run + verify pass**

```bash
python -m pytest _build/tests/test_keyword_page_map.py -v
python _build/scripts/build_keyword_page_map.py
```

- [ ] **Step 5: Eyeball `_build/data/keyword_page_map.json`** — confirm every existing calc has a sensible primary keyword. Note any slug that didn't map (will need manual handling in Phase 2).

- [ ] **Step 6: Commit**

```bash
git add _build/scripts/build_keyword_page_map.py _build/tests/test_keyword_page_map.py _build/data/keyword_page_map.json
git commit -m "feat(seo): build keyword-to-page mapping from finncalc_keywords.csv"
```

---

## Phase 1 — P1 Calculator Gap-Fill

Goal: ship 8 new calculator pages targeting keywords with vol ≥1,000 AND KD ≤25 where the site has no matching page.

Estimated 25-40 hours.

### Reference implementation pattern

Each new calc page needs:

1. `_build/bodies/<slug>.html` — Jinja partial: H1, intro paragraph, calculator form (use existing form macros from `_build/templates/partials/`), output area, "How it works" section, FAQ accordion, glossary
2. `_build/schemas/<slug>.json` — FAQPage JSON-LD + (optional) BreadcrumbList override
3. `_build/fixtures/<slug>.json` — sample input/output pairs for snapshot tests
4. `_build/tests/test_<slug>.py` — pytest cases for calculation correctness + rendered HTML5 validity
5. Top-level `<slug>/` directory will be auto-created by the build pipeline; no manual file touch needed there
6. After the body+schema are in place: run the build, then run the rendered-patcher chain (favicon, related-tools, etc.) via `full_seo_regression.ps1`

### Task 1.0: Confirm the gap list

- [ ] **Step 1: Run the gap analyser**

```python
# _build/scripts/find_calc_gaps.py
"""List P1 keywords whose target slug has no existing calc page."""
import csv
from pathlib import Path

KEYWORDS_CSV = Path(r'C:\FIN_CALC_SITE\keywords\finncalc_keywords.csv')
SITE_ROOT = Path(r'C:\FIN_CALC_SITE\Finance_Calculator_Hub')

existing_slugs = {
    d.name for d in SITE_ROOT.iterdir() if d.is_dir() and not d.name.startswith(('.', '_'))
}

def slug_from_kw(kw: str) -> str:
    return kw.lower().replace(' ', '-').replace('/', '-')

with KEYWORDS_CSV.open(encoding='utf-8-sig') as fh:
    candidates = [
        r for r in csv.DictReader(fh)
        if r['priority_tier'] == 'P1' and int(r['search_volume']) >= 1000
    ]

gaps = []
for r in candidates:
    proposed = slug_from_kw(r['keyword'])
    if not any(proposed.startswith(slug) or slug.startswith(proposed) for slug in existing_slugs):
        gaps.append((proposed, r['keyword'], r['search_volume'], r['difficulty'], r['cluster'], r['geo']))

for g in sorted(gaps, key=lambda x: -int(x[2]))[:40]:
    print(f"{g[3]:>3} kd  {g[2]:>6} vol  [{g[5]}/{g[4]}]  {g[0]:40s}  ←  {g[1]}")
```

```bash
python _build/scripts/find_calc_gaps.py
```

- [ ] **Step 2: Operator reviews the gap list and confirms the 8 to build**

Initial candidate list (subject to Step 1 confirmation):

| New slug | Target keyword | Volume | KD | Geo | Cluster |
|---|---|---|---|---|---|
| `coast-fire-calculator` | coast fire calculator | 27,100 | 9 | US | retirement_planning |
| `401k-withdrawal-calculator` | 401k withdrawals calculator | 12,100 | 8 | US | retirement_accounts |
| `401k-tax-calculator` | taxes on 401k withdrawal calculator | 6,600 | 3 | US | retirement_accounts |
| `mortgage-overpayment-calculator` | mortgage overpayment calculator | 60,500 | 9 | UK | mortgage |
| `mortgage-repayment-calculator` | mortgage loan repayment calculator | 90,500 | 15 | UK | mortgage |
| `texas-paycheck-calculator` | texas paycheck calculator | 60,500 | 13 | US | tax |
| `california-paycheck-calculator` | california paycheck calculator | 49,500 | 11 | US | tax |
| `paye-calculator` | paye calculator | 14,800 | 5 | SA | tax |
| `roth-conversion-tax-calculator` | roth ira conversion tax calculator | 1,600 | 10 | US | retirement_accounts |
| `simple-interest-calculator` | simple interest calculator | 40,500 | 23 | US | investment_growth |

(11 listed; pick the 8 highest-leverage after Step 1 surfaces actual KD and volume from the CSV — do not over-commit if some duplicate existing functionality.)

- [ ] **Step 3: Branch + start the build cycle**

```bash
git checkout -b feature/finncalc-phase-1-gap-fill-2026-05-23
```

### Task 1.1: Build the Coast FIRE Calculator (worked reference)

**Files:**
- Create: `_build/bodies/coast-fire-calculator.html`
- Create: `_build/schemas/coast-fire-calculator.json`
- Create: `_build/fixtures/coast-fire-calculator.json`
- Create: `_build/tests/test_coast_fire_calculator.py`
- Modify: `_build/data/calc_registry.json` (if such a registry exists — discovered in Task 0.1)

**Target keyword:** `coast fire calculator` (27,100 vol, KD 9, US, retirement_planning). This is the highest-leverage gap in the entire CSV.

- [ ] **Step 1: Write the failing calculation test**

```python
# _build/tests/test_coast_fire_calculator.py
"""Coast FIRE: how much do I need invested NOW so that compound growth
alone (no further contributions) reaches my FIRE number by target age?"""
from _build.scripts.calculations.coast_fire import calculate_coast_fire


def test_coast_fire_number_at_traditional_retirement():
    # Need $1.5M at 65, currently 35, expect ~7% real return → coast FIRE today is about $200k
    r = calculate_coast_fire(
        fire_number=1_500_000,
        current_age=35,
        coast_age=65,
        real_return_pct=7.0,
    )
    assert 195_000 <= r['coast_fire_number'] <= 215_000


def test_coast_fire_with_existing_portfolio():
    r = calculate_coast_fire(
        fire_number=1_500_000,
        current_age=35,
        coast_age=65,
        real_return_pct=7.0,
        current_portfolio=150_000,
    )
    assert r['shortfall_to_coast'] > 0
    assert r['years_to_reach_coast'] > 0


def test_coast_fire_already_coasting():
    # Portfolio above coast FIRE number → shortfall is zero, status 'coasting'
    r = calculate_coast_fire(
        fire_number=1_500_000,
        current_age=35,
        coast_age=65,
        real_return_pct=7.0,
        current_portfolio=300_000,
    )
    assert r['shortfall_to_coast'] == 0
    assert r['status'] == 'coasting'


def test_coast_fire_rejects_invalid_input():
    import pytest
    with pytest.raises(ValueError):
        calculate_coast_fire(fire_number=-1, current_age=35, coast_age=65, real_return_pct=7.0)
    with pytest.raises(ValueError):
        calculate_coast_fire(fire_number=1_000_000, current_age=70, coast_age=65, real_return_pct=7.0)
```

- [ ] **Step 2: Run, verify fail**

```bash
python -m pytest _build/tests/test_coast_fire_calculator.py -v
```

- [ ] **Step 3: Implement the calculation**

```python
# _build/scripts/calculations/coast_fire.py
"""Coast FIRE: present value of FIRE-number target, given growth rate + time horizon."""
from __future__ import annotations


def calculate_coast_fire(
    *,
    fire_number: float,
    current_age: int,
    coast_age: int,
    real_return_pct: float,
    current_portfolio: float = 0.0,
) -> dict:
    if fire_number <= 0:
        raise ValueError('fire_number must be > 0')
    if coast_age <= current_age:
        raise ValueError('coast_age must be > current_age')
    if real_return_pct < 0:
        raise ValueError('real_return_pct must be ≥ 0')

    years = coast_age - current_age
    r = real_return_pct / 100.0
    coast_fire_number = fire_number / ((1 + r) ** years)
    shortfall = max(coast_fire_number - current_portfolio, 0.0)

    # If already coasting, how many years until portfolio compounds to FIRE number?
    if current_portfolio >= coast_fire_number:
        # Years until current_portfolio grows to fire_number
        import math
        years_to_fire = math.log(fire_number / current_portfolio) / math.log(1 + r) if r > 0 else float('inf')
        status = 'coasting'
        years_to_reach_coast = 0
    else:
        status = 'accumulating'
        years_to_fire = None
        # Years to save shortfall depends on savings rate — out of scope of this calc
        years_to_reach_coast = None

    return {
        'coast_fire_number': round(coast_fire_number, 2),
        'shortfall_to_coast': round(shortfall, 2),
        'status': status,
        'years_to_fire_if_coasting': round(years_to_fire, 1) if years_to_fire and years_to_fire != float('inf') else None,
        'years_to_reach_coast': years_to_reach_coast,
    }
```

- [ ] **Step 4: Verify unit tests pass**

```bash
python -m pytest _build/tests/test_coast_fire_calculator.py -v
```

- [ ] **Step 5: Build the body (Jinja partial)**

Read `_build/bodies/fire-calculator.html` first to copy its grammar (form macros, output panel structure, FAQ accordion):

```bash
cat /c/FIN_CALC_SITE/Finance_Calculator_Hub/_build/bodies/fire-calculator.html
```

Create `_build/bodies/coast-fire-calculator.html` matching that grammar. Inputs: `fire_number`, `current_age`, `coast_age`, `real_return_pct`, `current_portfolio`. Output panel: coast FIRE number, shortfall, status. FAQ section: 5 questions covering coast FIRE definition, vs lean FIRE, vs barista FIRE, how to choose coast age, why real return.

- [ ] **Step 6: Build the schema**

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Coast FIRE?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Coast FIRE is the amount you need invested today so that compound growth alone — with zero further contributions — reaches your full FIRE number by your target retirement age."
      }
    },
    {
      "@type": "Question",
      "name": "How is Coast FIRE different from Lean FIRE?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Lean FIRE is the dollar amount you can live on; Coast FIRE is the smaller amount you need invested today so that it grows into Lean (or full) FIRE by retirement age."
      }
    },
    {
      "@type": "Question",
      "name": "What real return should I use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Most FIRE planners use 5-7% real return (inflation-adjusted). The Trinity Study uses 4% as a conservative safe withdrawal floor; 7% is the long-run S&P 500 historical average after inflation."
      }
    },
    {
      "@type": "Question",
      "name": "What is my coast age?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your coast age is the age at which you plan to fully retire and start withdrawing from your portfolio. For traditional FIRE this is 60-65; for early-retirement FIRE it can be 40-55."
      }
    },
    {
      "@type": "Question",
      "name": "Why does the calculator subtract inflation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Coast FIRE is a real-dollar concept: your future spending needs grow with inflation, so the return rate used must already be net of inflation (i.e. real return)."
      }
    }
  ]
}
```

- [ ] **Step 7: Create fixtures**

```json
// _build/fixtures/coast-fire-calculator.json
{
  "samples": [
    {
      "input": {"fire_number": 1500000, "current_age": 35, "coast_age": 65, "real_return_pct": 7, "current_portfolio": 0},
      "expected": {"coast_fire_number": 197037.43, "status": "accumulating"}
    },
    {
      "input": {"fire_number": 1000000, "current_age": 30, "coast_age": 60, "real_return_pct": 6, "current_portfolio": 0},
      "expected": {"coast_fire_number": 174110.13, "status": "accumulating"}
    },
    {
      "input": {"fire_number": 1500000, "current_age": 35, "coast_age": 65, "real_return_pct": 7, "current_portfolio": 300000},
      "expected": {"shortfall_to_coast": 0, "status": "coasting"}
    }
  ]
}
```

- [ ] **Step 8: Run the build pipeline**

```powershell
cd C:\FIN_CALC_SITE\Finance_Calculator_Hub
.\_build\scripts\full_seo_regression.ps1
```

Confirm `<repo>\coast-fire-calculator\index.html` is produced.

- [ ] **Step 9: Validate the rendered HTML**

```bash
python _build/scripts/validate_html.py coast-fire-calculator/index.html
```

Expected: no parser errors. Per MEMORY's "JSON-LD raw-& quirk": confirm no `&` characters in JSON-LD scripts got HTML-escaped (must stay raw inside `<script type="application/ld+json">`).

- [ ] **Step 10: Commit**

```bash
git add _build/scripts/calculations/coast_fire.py _build/bodies/coast-fire-calculator.html _build/schemas/coast-fire-calculator.json _build/fixtures/coast-fire-calculator.json _build/tests/test_coast_fire_calculator.py coast-fire-calculator/
git commit -m "feat(coast-fire-calculator): ship Coast FIRE calculator (27.1K vol, KD 9 P1)

Closes content gap for keyword 'coast fire calculator' identified in
finncalc_keywords.csv (highest-leverage P1 in retirement_planning cluster)."
```

### Tasks 1.2 through 1.N: Replicate Task 1.1 for each remaining gap

For each calculator below, **replicate the 10-step structure of Task 1.1**, substituting:

#### Task 1.2 — 401(k) Withdrawal Calculator

- **Slug:** `401k-withdrawal-calculator` · **Target kw:** `401k withdrawals calculator` (12,100 vol, KD 8, US)
- **Calculation:** `calculate_401k_withdrawal({balance, withdrawal_amount, federal_bracket_pct, state_tax_pct, age, early_withdrawal})` → `{gross, federal_tax, state_tax, early_penalty_10pct?, net}`. 10% early-withdrawal penalty if `age < 59.5` and `not exempt`.
- **Tests (6):** standard 65yo withdrawal (no penalty); 50yo early (10% penalty); rule of 55 exemption (no penalty); zero state tax; balance < withdrawal throws; negative inputs throw
- **FAQ topics:** how 401k withdrawals are taxed · early withdrawal penalty · rule of 55 · RMD basics · vs IRA withdrawal rules
- **Body grammar:** mirror `_build/bodies/401k-calculator.html`

#### Task 1.3 — 401(k) Tax Calculator (variant of 1.2 — different intent)

- **Slug:** `401k-tax-calculator` · **Target kw:** `taxes on 401k withdrawal calculator` (6,600 vol, KD 3, US) — **P1 with very low difficulty**
- **Note:** Considered merging with 1.2 but the keyword intent here is "I want to know my TAX, not my net withdrawal" — different SERP intent + low KD justifies a separate page that cross-links to 1.2.
- **Calculation:** Wraps 1.2 but presents the tax-focused view (effective tax rate %, breakdown by bracket).
- **Tests (4):** standard bracket calc; mixed-bracket calc; zero state tax; high-income (top bracket) test
- **FAQ topics:** how 401k withdrawals are taxed by bracket · do I pay state tax · is the 10% penalty in addition to or instead of tax · do RMDs change the calculation · how to estimate brackets when retired

#### Task 1.4 — Mortgage Overpayment Calculator (UK)

- **Slug:** `mortgage-overpayment-calculator` · **Target kw:** `mortgage overpayment calculator` (60,500 vol, KD 9, UK)
- **Calculation:** `calculate_mortgage_overpayment({balance, rate_pct, term_years, monthly_overpayment, lump_sum})` → `{new_term_months, interest_saved, payoff_date, schedule}`
- **Tests (5):** standard £200/mo overpayment shortens 25yr to ~22yr; lump-sum + ongoing; zero overpayment returns same term; rate=0 edge; payoff inside 1 year edge
- **FAQ topics:** how overpayment works · ERC (early repayment charges) caveat · overpay vs offset · overpay vs invest · regulator (FCA) guidance link
- **Geo signals:** £ currency formatting, UK-spelling ("repayment", "fixed-rate term"), region selector defaulting to UK on this page
- **Body grammar:** mirror `_build/bodies/mortgage.html` but add a "British convention" callout

#### Task 1.5 — Mortgage Repayment Calculator (UK)

- **Slug:** `mortgage-repayment-calculator` · **Target kw:** `mortgage loan repayment calculator` (90,500 vol, KD 15, UK)
- **Calculation:** Standard amortisation but with monthly-paid-in-arrears UK convention (vs US monthly-paid-in-advance). Use the existing US `mortgage` calc as a reference; this variant should clearly note the UK convention and link to the UK over-payment calc.
- **Tests (5):** standard 25yr £200k at 5% gives monthly £1,169; 30yr term; 5yr fixed term shows balloon at fixed-end; rate 0 edge; balance 0 edge
- **FAQ topics:** UK vs US mortgage maths · standard variable rate (SVR) after fix-end · how to compare deals · APRC vs interest rate · what affects affordability
- **Internal link:** add bidirectional link with `mortgage-overpayment-calculator` (Task 1.4)

#### Task 1.6 — Texas Paycheck Calculator (US state)

- **Slug:** `texas-paycheck-calculator` · **Target kw:** `texas paycheck calculator` (60,500 vol, KD 13, US)
- **Calculation:** Federal tax + FICA only (Texas has no state income tax). Extend the existing `take-home-pay` calc with a state selector or build a Texas-specific wrapper.
- **Tests (5):** standard salary $60k = $48k net; high-earner Social-Security cap; FICA breakdown; 401k pre-tax adjustment; HSA pre-tax adjustment
- **FAQ topics:** why Texas has no state tax · what gets withheld instead (FICA, federal) · Texas franchise tax (not personal) · self-employment in TX · property-tax callout
- **Body grammar:** copy `_build/bodies/take-home-pay.html`; localise

#### Task 1.7 — California Paycheck Calculator (US state)

- **Slug:** `california-paycheck-calculator` · **Target kw:** `california paycheck calculator` (49,500 vol, KD 11, US)
- **Calculation:** Federal + FICA + California state (CA has the country's most progressive bracket). Bracket source: CA Franchise Tax Board 2026.
- **Tests (5):** standard salary lands in CA's 9.3% bracket; high-earner top bracket (12.3%+1% mental-health); 401k pre-tax; HSA pre-tax; SDI (State Disability Insurance) withholding
- **FAQ topics:** CA brackets · SDI explained · why CA net is materially lower than TX · mental health services tax · self-employment in CA

#### Task 1.8 — PAYE Calculator (South Africa)

- **Slug:** `paye-calculator` · **Target kw:** `paye calculator` (14,800 vol, KD 5, SA) — **P1**
- **Calculation:** SARS 2026 PAYE brackets + UIF (1% capped) + SDL (skills levy, payer-side). Personal age rebate (primary R17,235 / secondary R9,444 / tertiary R3,145 for 2026 tax year).
- **Tests (5):** R30k/month standard bracket; R100k/month top bracket; under-65 rebate; 65-74 secondary rebate; 75+ tertiary rebate
- **FAQ topics:** how PAYE differs from provisional tax · UIF + SDL explained · medical aid tax credit · retirement annuity tax credit · how the rebate works
- **Body grammar:** copy `_build/bodies/sa-tax-calculator.html`; cross-link to it
- **Geo signal:** R currency, SA spelling ("salaried", "remuneration"), region selector defaulting to SA

### Task 1.9: Phase 1 commit-fence — regression + sitemap

After all calc pages are built + committed:

- [ ] **Step 1: Full test suite**

```bash
python -m pytest _build/tests/ -v
```

Expected: all green (existing 805 + ~25 new = ~830). Resolve any failure before merging.

- [ ] **Step 2: Run the full SEO regression**

```powershell
.\_build\scripts\full_seo_regression.ps1
```

- [ ] **Step 3: Validate all new pages**

```bash
for slug in coast-fire-calculator 401k-withdrawal-calculator 401k-tax-calculator mortgage-overpayment-calculator mortgage-repayment-calculator texas-paycheck-calculator california-paycheck-calculator paye-calculator; do
  python _build/scripts/validate_html.py "$slug/index.html" || echo "FAIL: $slug"
done
```

- [ ] **Step 4: Sitemap regeneration**

If the sitemap is auto-built from the directory listing, confirm the 8 new pages appear:

```bash
grep -c "<loc>" sitemap.xml
```

Expected: previous count + 8.

- [ ] **Step 5: Merge + push**

```bash
git push origin feature/finncalc-phase-1-gap-fill-2026-05-23
```

---

## Phase 2 — Keyword Optimisation Sweep of Existing 50+ Pages

Goal: leverage `finncalc_keywords.csv` to refresh titles, meta descriptions, H1, and "How it works" copy on the existing 50+ calc pages. The existing pages were optimised in the 2026-05-21 remediation pass — but that pass used GSC export data, not keyword research. Re-optimising with the broader CSV will surface secondary keyword wins.

Estimated 12-18 hours.

### Task 2.1: Build the page metadata patcher

**Files:**
- Create: `_build/scripts/patch_titles_meta_rendered.py` (extends the existing `patch_titles_rendered.py`)
- Test: `_build/tests/test_patch_titles_meta.py`

Follow the same pattern as the existing rendered-patcher scripts in `_build/scripts/` (per MEMORY: this is the proven 2026-05-21 pattern). The patcher must be idempotent — second run on a patched file changes nothing.

- [ ] **Step 1: Write the failing idempotency test**

```python
# _build/tests/test_patch_titles_meta.py
from _build.scripts.patch_titles_meta_rendered import compute_patched_html

def test_keyword_inserted_into_description_when_missing():
    html = '<html><head><title>X Calc | Finncalc</title><meta name="description" content="Generic description."></head><body></body></html>'
    out, changed = compute_patched_html(html, primary_keyword='x calc', secondary_keywords=[], slug='x')
    assert changed is True
    assert 'x calc' in out.lower()

def test_idempotent_on_second_pass():
    html = '<html><head><title>X Calc | Finncalc</title><meta name="description" content="Free x calc with full breakdown."></head><body></body></html>'
    first, _ = compute_patched_html(html, primary_keyword='x calc', secondary_keywords=[], slug='x')
    second, changed = compute_patched_html(first, primary_keyword='x calc', secondary_keywords=[], slug='x')
    assert changed is False
```

- [ ] **Step 2: Implement (model after existing `patch_titles_rendered.py`)**

Read `_build/scripts/patch_titles_rendered.py` first to learn the in-place HTML manipulation pattern (likely BeautifulSoup). Reuse it. Per MEMORY's "two main.css gotcha" — make sure the patcher only touches `<head>` content, not the CSS link order.

- [ ] **Step 3: Run + verify pass**

```bash
python -m pytest _build/tests/test_patch_titles_meta.py -v
```

- [ ] **Step 4: Dry-run across all calc pages**

```bash
python _build/scripts/patch_titles_meta_rendered.py --dry-run
```

Eyeball the diffs. For each page where the patcher refuses to insert (e.g. title would exceed 60 chars), log it for manual review.

- [ ] **Step 5: Apply + validate**

```bash
python _build/scripts/patch_titles_meta_rendered.py
python _build/scripts/validate_html.py --all
```

- [ ] **Step 6: Commit**

```bash
git add _build/scripts/patch_titles_meta_rendered.py _build/tests/test_patch_titles_meta.py
git commit -m "feat(seo): patcher for primary-keyword meta insertion (idempotent)"
git add <each updated slug>/index.html
git commit -m "content(seo): apply primary-keyword meta insertion across calc pages

Source: finncalc_keywords.csv → _build/data/keyword_page_map.json
Pages touched: <list from dry-run log>"
```

### Task 2.2: Add secondary-keyword H2 sub-sections (manual pass)

For each page that has 3+ secondary keywords in the map, add (or rename) H2 sub-sections to absorb each secondary kw with 80-150 words of genuine content.

- [ ] **Step 1: Pick a page to start with** (recommend `fire-calculator` — large secondary cluster)
- [ ] **Step 2: Read the existing body**
- [ ] **Step 3: Draft 1-3 H2 expansions covering specific secondary keywords**
- [ ] **Step 4: Confirm word count + reading level**
- [ ] **Step 5: Build + validate**
- [ ] **Step 6: Commit (one page per commit so layout regressions are bisectable)**

Repeat for each page with rich secondary clusters (12-18 pages in scope).

### Task 2.3: Geo-region disambiguation pass

The CSV revealed UK + SA volume that some pages don't address. For each multi-region-relevant page (`mortgage`, `compound-interest`, `take-home-pay`), add a region selector or clear region callout linking to the dedicated regional page (the ones built in Phase 1).

- [ ] **Step 1: For `mortgage`**: add a "UK readers? See our UK mortgage repayment calculator and overpayment calculator" callout linking to Phase 1.4 + 1.5
- [ ] **Step 2: For `take-home-pay`**: add "See state-specific calculators: Texas · California" links
- [ ] **Step 3: For `sa-tax-calculator`**: add "PAYE-only? Use our dedicated PAYE calculator" link
- [ ] **Step 4: Build + validate + commit**

---

## Phase 3 — Internal Linking + Sitemap

### Task 3.1: Cross-link new Phase 1 calcs into existing pages' related rails

If `_build/scripts/inject_related_calculators_rendered.py` reads from a registry, update it to include the 8 new pages.

- [ ] **Step 1: Locate the related-tools registry**
- [ ] **Step 2: Add the 8 new slugs with their category bindings**
- [ ] **Step 3: Re-run the injector**
- [ ] **Step 4: Validate + commit**

### Task 3.2: Submit updated sitemap to search engines

(Operator action — same playbook as 2026-05-21 Phase A)

- [ ] GSC sitemap resubmit
- [ ] Bing Webmaster sitemap resubmit
- [ ] Yandex sitemap resubmit
- [ ] IndexNow ping (`scripts/indexnow_ping.py`)
- [ ] Cloudflare cache purge

---

## Phase 4 — Re-Audit Gate + Operator Actions

### Task 4.1: 60-day re-audit window

Per MEMORY 2026-05-21, the 2026-07-21 re-audit window was already booked. Phase 1+2 ship before then so the re-audit measures both:
- The 2026-05-21 technical remediation (60 days for full indexation)
- The 2026-05-23 content + keyword work (~8 weeks before re-audit)

### Task 4.2: Run the re-audit

```
/seo-audit https://finncalc.com/
```

Expected deltas from 21 baseline:
- Composite: 21 → 50-65 (target ≥75)
- Keywords: 8 new calcs × 5-15 ranked kws each = +40-120 ranked kws
- Technical: unchanged 90+ (no regressions expected)
- Content: 12 → 35-50 (8 new calcs in 7 clusters + secondary kw H2s)
- Authority: depends on Backlinks subscription activation

### Task 4.3: Diff against this plan

- [ ] Open prior audit JSON `~/.claude/skills/seo/output/finncalc.com-audit.json` (from 2026-05-21 baseline)
- [ ] Open new audit JSON
- [ ] Side-by-side compare; queue follow-ups if Phase 3 or Phase 5 is needed

---

## Self-Review

**Spec coverage check:**
- [x] Use of `finncalc_keywords.csv` → Phase 0 builds the page map; Phase 1 selects gaps; Phase 2 applies it via the patcher
- [x] Coverage of all 7 clusters → Phase 1 ships gaps in retirement_planning, retirement_accounts, mortgage, tax (4 of 7); Phase 2 + 3 cover savings_budget, investment_growth, debt_loans via secondary-kw H2 work on existing pages
- [x] Geo distribution (US/UK/SA) → Phase 1.4-1.5 (UK), 1.6-1.7 (US state), 1.8 (SA); Phase 2.3 adds region callouts on shared pages
- [x] Tech stack honoured → Python + Jinja, rendered-patcher pattern (per MEMORY), no `generate.py`, two-main.css aware, JSON-LD raw-& aware
- [x] Builds on the 2026-05-21 remediation → Phase 0 confirms patterns; Phase 4 aligns with the booked 60-day re-audit

**Placeholder scan:** all task steps include concrete code/commands. Tasks 1.2-1.8 use the "calculator card" structure — config-driven repetition of the Task 1.1 template, not placeholder.

**Type consistency:** every calculation function follows `calculate_<thing>(*, named_args) → dict` shape, returns include `status` + numeric outputs + optional `breakdown`/`shortfall`/`schedule` per calc family.
