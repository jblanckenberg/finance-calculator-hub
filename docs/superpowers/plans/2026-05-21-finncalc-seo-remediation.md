# FinCalc SEO Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 10 issues in `finncalc.com-seo-report-21-05-26.pdf` so the next 60-day post-launch re-audit hits a composite score ≥75 (vs current 21) with technical ≥92 (vs 84) and a measurable organic footprint.

**Architecture:** FinCalc is a static site built by `_build/generate.py` from Jinja templates (`_build/templates/_base.html`, `calculator.html`, `variant.html`, `comparison.html`) and per-slug body HTML (`_build/bodies/<slug>.html`). Data lives in `_build/data/calculators.json` + `variants.json`. Fixes are at three levels: (a) data JSON for title length + per-page meta, (b) Jinja templates + partials for sitewide changes (favicon, async CSS, semantic wrapper), (c) per-slug body files for duplicate H1 + parse errors + image alts. Each task ends with a build (`python _build/generate.py`) + a regression check.

**Tech Stack:** Python 3 · Jinja2 · pytest · static HTML / CSS / JS · Cloudflare Pages.

**Out-of-scope reminders:** This plan does not write new content, does not change calculator math, does not redesign the site. It is mechanical compliance fixes — no creative changes.

---

## File Map

**Modify:**
- `_build/data/calculators.json` — trim 13 over-length titles (≤60 chars)
- `_build/data/variants.json` — trim title-suffix combos that overflow
- `_build/templates/partials/head_meta.html` — add favicon links + convert main.css to async pattern + inline critical CSS block
- `_build/templates/_base.html` — wrap body content in `<main>` for DOM root cleanup; remove `<h1>` from body-rendered content if found
- `_build/bodies/401k-calculator.html` — strip leading duplicate `<h1>`
- `_build/bodies/compound-interest.html` — strip leading duplicate `<h1>`
- `_build/bodies/debt-snowball-calculator.html` — strip leading duplicate `<h1>`
- `_build/bodies/emergency-fund.html` — strip leading duplicate `<h1>`
- `_build/bodies/fire-calculator.html` — strip leading duplicate `<h1>`
- `_build/bodies/isa-calculator.html` — strip leading duplicate `<h1>`
- `_build/bodies/loan-payoff.html` — strip leading duplicate `<h1>`
- `_build/bodies/mortgage.html` — strip leading duplicate `<h1>`
- `_build/bodies/roth-ira-calculator.html` — strip leading duplicate `<h1>`
- `_build/bodies/take-home-pay.html` — strip leading duplicate `<h1>`
- `_build/bodies/tfsa-calculator.html` — strip leading duplicate `<h1>`
- Image-alt-missing body files (35 pages — discovered in Task 7)

**Create:**
- `_build/scripts/strip_duplicate_h1.py` — idempotent body-file H1 stripper with audit log
- `_build/scripts/validate_html.py` — W3C-style validator wrapper to find the shared parser-error component
- `_build/scripts/audit_titles.py` — title-length auditor that prints offenders to stdout
- `_build/scripts/audit_image_alts.py` — image-alt auditor that prints offending `<img>` per file
- `_build/tests/test_no_duplicate_h1.py` — assert rendered pages contain exactly one `<h1>`
- `_build/tests/test_title_length.py` — assert every rendered title is 40-60 chars
- `_build/tests/test_favicon_present.py` — assert head_meta renders icon links
- `_build/tests/test_main_wrapper.py` — assert rendered pages have a `<main>` element
- `_build/tests/test_image_alt_coverage.py` — assert no `<img>` lacks `alt` in any body file
- `docs/superpowers/plans/2026-05-21-finncalc-seo-remediation-log.md` — operator action log for sitemap submission + DataForSEO Backlinks subscription + post-deploy verification

**Out-of-scope deliverables (operator action items):**
- Submit `https://finncalc.com/sitemap.xml` to GSC + Bing Webmaster + Yandex Webmaster
- Activate DataForSEO Backlinks subscription at https://app.dataforseo.com/backlinks-subscription
- Verify `site:finncalc.com` returns indexed pages in Google
- 60-day re-run of `/seo-audit https://finncalc.com/` for delta confirmation

---

## Task 1: Strip duplicate `<h1>` from body files

**Files:**
- Create: `_build/scripts/strip_duplicate_h1.py`
- Create: `_build/tests/test_no_duplicate_h1.py`
- Modify: 11 files under `_build/bodies/` (the 11 with `<h1>` per `grep -c '<h1' _build/bodies/*.html | grep -v ':0$' | wc -l`)

**Why:** `_build/templates/_base.html:25` already renders `<h1>{{ h1 }}</h1>` from `calculators.json["h1"]`. 11 body files (and downstream variant pages = 22 total per the audit) prepend a redundant `<h1>` line. Removing the body-file H1 (rather than the template H1) keeps the canonical H1 source in `calculators.json`, where it's already used for `<title>` + schema.org `name`.

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_no_duplicate_h1.py
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
BODIES = REPO / "_build" / "bodies"
H1 = re.compile(r"<h1\b", re.IGNORECASE)


@pytest.mark.parametrize("body_path", sorted(BODIES.glob("*.html")), ids=lambda p: p.name)
def test_body_file_has_no_h1(body_path):
    """Body files must not contain <h1> — _base.html renders it from calculators.json."""
    text = body_path.read_text(encoding="utf-8")
    assert not H1.search(text), (
        f"{body_path.name} contains <h1> — base template already renders one. "
        "Remove the leading <h1> from this body file."
    )
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd C:/FIN_CALC_SITE/Finance_Calculator_Hub
python -m pytest _build/tests/test_no_duplicate_h1.py -v
```

Expected: 11 FAILs (one per body file currently containing `<h1>`).

- [ ] **Step 3: Write the stripper script**

```python
# _build/scripts/strip_duplicate_h1.py
"""Strip leading <h1>...</h1> from body files. Idempotent."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BODIES = REPO / "_build" / "bodies"
# Match the first <h1>...</h1> in a body file (one-line in practice; tolerate
# multi-line just in case).
H1_LEADING = re.compile(
    r"^\s*<h1\b[^>]*>.*?</h1>\s*\n?",
    re.IGNORECASE | re.DOTALL,
)


def strip_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    cleaned = H1_LEADING.sub("", original, count=1)
    if cleaned == original:
        return False
    path.write_text(cleaned, encoding="utf-8")
    return True


def main() -> int:
    changed = []
    for body in sorted(BODIES.glob("*.html")):
        if strip_file(body):
            changed.append(body.name)
    if changed:
        print(f"Stripped <h1> from {len(changed)} body files:")
        for name in changed:
            print(f"  - {name}")
    else:
        print("No body files contained a leading <h1>. Nothing to change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run the stripper**

```bash
python _build/scripts/strip_duplicate_h1.py
```

Expected output:
```
Stripped <h1> from 11 body files:
  - 401k-calculator.html
  - compound-interest.html
  - debt-snowball-calculator.html
  - emergency-fund.html
  - fire-calculator.html
  - isa-calculator.html
  - loan-payoff.html
  - mortgage.html
  - roth-ira-calculator.html
  - take-home-pay.html
  - tfsa-calculator.html
```

- [ ] **Step 5: Re-run the test to verify it passes**

```bash
python -m pytest _build/tests/test_no_duplicate_h1.py -v
```

Expected: all 19 body-file parametrise cases PASS.

- [ ] **Step 6: Re-run the stripper to verify idempotency**

```bash
python _build/scripts/strip_duplicate_h1.py
```

Expected: `No body files contained a leading <h1>. Nothing to change.`

- [ ] **Step 7: Rebuild and spot-check one rendered page**

```bash
python _build/generate.py
grep -c '<h1' emergency-fund/index.html
```

Expected: `1` (was `2`).

- [ ] **Step 8: Commit**

```bash
git add _build/bodies/*.html _build/scripts/strip_duplicate_h1.py _build/tests/test_no_duplicate_h1.py
git commit -m "fix(seo): strip duplicate <h1> from body files (audit HIGH)

Body files for 11 calculators prepended <h1>...</h1> while
_base.html:25 already renders <h1>{{ h1 }}</h1> from
calculators.json. Removed the body-file H1 so the JSON-driven
H1 is the SSOT. Fixes audit HIGH-priority issue on 22 calculator
pages (11 base + 11 variant)."
```

---

## Task 2: Add favicon + icon links to head_meta

**Files:**
- Create: `_build/tests/test_favicon_present.py`
- Modify: `_build/templates/partials/head_meta.html`

**Why:** `head_meta.html` has zero `<link rel="icon">` tags. The favicon files already exist at the repo root (`favicon.ico`, `finncalc.svg`, `finncalc_256.png`, `finncalc_512.png`, `finncalc_1024.png`) — just need to reference them. Trivial sitewide fix; audit reports "LOW" but it's free.

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_favicon_present.py
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HEAD_META = REPO / "_build" / "templates" / "partials" / "head_meta.html"


def test_head_meta_has_favicon_ico():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'rel="icon"' in text, "head_meta.html must declare <link rel=icon>"
    assert "/favicon.ico" in text, "head_meta.html must reference /favicon.ico"


def test_head_meta_has_apple_touch_icon():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'rel="apple-touch-icon"' in text, "head_meta.html must declare apple-touch-icon"


def test_head_meta_has_svg_icon():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'type="image/svg+xml"' in text, "head_meta.html must declare an SVG icon"
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m pytest _build/tests/test_favicon_present.py -v
```

Expected: all 3 FAIL.

- [ ] **Step 3: Add the icon links**

Edit `_build/templates/partials/head_meta.html`. After the `<link rel="canonical">` line, insert:

```jinja
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" href="/finncalc.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/finncalc_256.png">
  <link rel="manifest" href="/site.webmanifest">
```

Then create `_build/scripts/write_manifest.py` and the manifest file (one-shot, run once, kept in repo):

```python
# _build/scripts/write_manifest.py
"""Write a minimal PWA manifest. Run once; the file lives at repo root."""
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "site.webmanifest"

DATA = {
    "name": "FinCalcHub",
    "short_name": "FinCalc",
    "icons": [
        {"src": "/finncalc_256.png", "sizes": "256x256", "type": "image/png"},
        {"src": "/finncalc_512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "/finncalc_1024.png", "sizes": "1024x1024", "type": "image/png"},
    ],
    "theme_color": "#1B3A5C",
    "background_color": "#ffffff",
    "display": "browser",
    "start_url": "/",
}

if __name__ == "__main__":
    MANIFEST.write_text(json.dumps(DATA, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST}")
```

Run it:
```bash
python _build/scripts/write_manifest.py
```

- [ ] **Step 4: Re-run the test to verify it passes**

```bash
python -m pytest _build/tests/test_favicon_present.py -v
```

Expected: all 3 PASS.

- [ ] **Step 5: Rebuild and verify the rendered head**

```bash
python _build/generate.py
grep -E 'rel="icon"|apple-touch-icon|manifest' emergency-fund/index.html
```

Expected: 4 lines (icon ico, icon svg, apple-touch-icon, manifest).

- [ ] **Step 6: Commit**

```bash
git add _build/templates/partials/head_meta.html _build/scripts/write_manifest.py _build/tests/test_favicon_present.py site.webmanifest
git commit -m "fix(seo): add favicon + icon links + PWA manifest (audit LOW)

Sitewide head_meta.html had no rel=icon tag despite all favicon
assets existing at repo root. Added .ico + svg + apple-touch-icon
+ webmanifest references. Fixes audit LOW-priority issue on
59/59 pages."
```

---

## Task 3: Trim title tags over 65 characters

**Files:**
- Create: `_build/scripts/audit_titles.py`
- Create: `_build/tests/test_title_length.py`
- Modify: `_build/data/calculators.json` (offending rows)
- Modify: `_build/data/variants.json` (if any variants overflow)

**Why:** 13 pages exceed Google's mobile title-truncation threshold (~60 chars). The audit calls out `/personal-finance-calculators/` (71), `/student-loan-calculator/` (80), `/debt-snowball-calculator/` (76). Titles are owned by `calculators.json["title"]` and `variants.json["title"]`.

- [ ] **Step 1: Write the auditor**

```python
# _build/scripts/audit_titles.py
"""Print every title in calculators.json + variants.json with length > 60."""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"
LIMIT = 60


def audit(data: list[dict], source: str) -> list[tuple[str, int, str]]:
    offenders = []
    for entry in data:
        title = entry.get("title", "")
        if len(title) > LIMIT:
            slug = entry.get("slug") or entry.get("id") or "?"
            offenders.append((slug, len(title), title))
    if offenders:
        print(f"\n{source} — {len(offenders)} titles >{LIMIT} chars:")
        for slug, length, title in offenders:
            print(f"  [{length}] {slug}: {title}")
    return offenders


def main() -> int:
    calcs = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    variants = json.loads((DATA / "variants.json").read_text(encoding="utf-8"))
    bad_c = audit(calcs if isinstance(calcs, list) else calcs.get("calculators", []), "calculators.json")
    bad_v = audit(variants if isinstance(variants, list) else variants.get("variants", []), "variants.json")
    total = len(bad_c) + len(bad_v)
    print(f"\nTotal offenders: {total}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run the auditor to confirm the 13 offenders**

```bash
python _build/scripts/audit_titles.py
```

Expected: exit code 1, list of titles with their byte lengths.

- [ ] **Step 3: Write the failing test**

```python
# _build/tests/test_title_length.py
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"
LIMIT_MAX = 60
LIMIT_MIN = 30  # Google may treat <30 as low-info; warn floor.


def _load(name: str) -> list[dict]:
    raw = json.loads((DATA / name).read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw
    return raw.get("calculators") or raw.get("variants") or []


@pytest.mark.parametrize("entry", _load("calculators.json"), ids=lambda e: e.get("slug", "?"))
def test_calculator_title_length(entry):
    title = entry["title"]
    assert LIMIT_MIN <= len(title) <= LIMIT_MAX, (
        f"Title length {len(title)} out of band [{LIMIT_MIN}, {LIMIT_MAX}]: {title!r}"
    )


@pytest.mark.parametrize("entry", _load("variants.json"), ids=lambda e: e.get("slug", "?"))
def test_variant_title_length(entry):
    title = entry["title"]
    assert LIMIT_MIN <= len(title) <= LIMIT_MAX, (
        f"Variant title length {len(title)} out of band: {title!r}"
    )
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
python -m pytest _build/tests/test_title_length.py -v
```

Expected: ≥13 FAIL.

- [ ] **Step 5: Edit `calculators.json` (and `variants.json` if needed) to bring offenders to ≤60 chars**

Trimming rules (apply in this order until ≤60):
1. Drop the trailing ` | FinCalcHub` suffix entirely on titles that already contain "Calculator".
2. Replace em dash ` — ` separator with shorter ` – ` (en dash) or `: `.
3. Drop redundant year qualifiers (e.g. "2024-25") if a 12-month-old article.
4. Drop parenthetical "(US, UK, South Africa)" or similar tri-region hints — keep one.

Example rewrites the engineer must produce (audit-named offenders):
- `/personal-finance-calculators/` (71) → `Personal Finance Calculators — Free & UK/US/SA Ready` (54)
- `/student-loan-calculator/` (80) → `Student Loan Calculator — Payoff Date & Total Cost` (51)
- `/debt-snowball-calculator/` (76) → `Debt Snowball Calculator — Build Your Payoff Plan` (49)
- `/glossary/` (68) → `Personal Finance Glossary — Plain-English Definitions` (54)
- `/compound-interest/` (66) → `Compound Interest Calculator — Daily / Monthly / Yearly` (55)
- `/mortgage/` (68) → `Mortgage Calculator UK / US — Repayment + Affordability` (55)  *(verify after move; data already shows 56)*
- `/tax/` (68) → `Tax Calculator Hub — UK, US & South Africa` (43)
- `/fire-calculator/` (67) → `FIRE Calculator — Financial Independence Age & Number` (54)
- `/investment-growth/uk/` (66) → `Investment Growth Calculator UK — Future Value` (48)
- `/blog/4-percent-rule-retirement/` (68) → `4% Rule Explained — Safe Retirement Withdrawal Rate` (51)
- `/blog/compound-interest-explained/` (69) → `Compound Interest Explained — How It Builds Wealth` (50)
- `/blog/401k-contribution-paycheck/` (70) → `401(k) Contribution Per Paycheck — How to Decide` (48)
- `/blog/what-is-paye-south-africa/` (70) → `What Is PAYE? South Africa Tax Explained Simply` (47)
- `/blog/salary-after-tax/` (68) → `Salary After Tax — Take-Home Pay UK, US, SA` (44)
- `/blog/what-is-401k-employer-match/` (66) → `What Is 401(k) Employer Match? — Free Money Guide` (49)

If the audit-implied source for any of the above is a markdown / html page outside `calculators.json` / `variants.json` (e.g. blog posts where titles live in front-matter or `<title>` literals in body HTML), update those source files instead — the test above only covers JSON; the engineer must add a second test fixture for blog titles if blog source files are touched. Discover them with:

```bash
python _build/scripts/audit_titles.py
grep -rln '<title>' blog/ glossary/ tax/ | head
```

- [ ] **Step 6: Re-run the auditor — expect 0 offenders**

```bash
python _build/scripts/audit_titles.py
```

Expected: `Total offenders: 0`, exit 0.

- [ ] **Step 7: Re-run the test — expect all PASS**

```bash
python -m pytest _build/tests/test_title_length.py -v
```

- [ ] **Step 8: Rebuild + spot-check rendered titles**

```bash
python _build/generate.py
grep -hoP '<title>[^<]+</title>' personal-finance-calculators/index.html student-loan-calculator/index.html debt-snowball-calculator/index.html
```

Expected: every printed line ≤67 chars (60 + the `<title></title>` wrapping = 67).

- [ ] **Step 9: Commit**

```bash
git add _build/data/calculators.json _build/data/variants.json _build/scripts/audit_titles.py _build/tests/test_title_length.py
git commit -m "fix(seo): trim 13 over-length titles to <=60 chars (audit MEDIUM)

Per audit, 13 pages had <title> >65 chars causing Google mobile
truncation. Updated calculators.json + variants.json + the
relevant blog source files. Added audit_titles.py + parametrised
pytest gate so future titles can't drift past 60."
```

---

## Task 4: Convert blocking CSS to async + add preconnect

**Files:**
- Modify: `_build/templates/partials/head_meta.html`
- Create: `_build/tests/test_async_css.py`

**Why:** `head_meta.html` line 29 (`<link rel="stylesheet" href="/css/main.css">`) is a synchronous render-blocking stylesheet on every page. 6 calculator pages cross 3s dom_complete. The preload-then-swap pattern eliminates the blocking call without breaking unstyled-content flash on cached visits.

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_async_css.py
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HEAD_META = REPO / "_build" / "templates" / "partials" / "head_meta.html"


def test_main_css_uses_preload_pattern():
    text = HEAD_META.read_text(encoding="utf-8")
    # Either preload+onload swap OR media=print + onload swap
    has_preload = 'rel="preload" as="style"' in text and "/css/main.css" in text
    has_print_swap = "media=\"print\"" in text and "onload=\"this.media='all'" in text
    assert has_preload or has_print_swap, (
        "main.css must be loaded async (preload+onload or media=print swap)"
    )


def test_noscript_fallback_present():
    text = HEAD_META.read_text(encoding="utf-8")
    assert "<noscript>" in text and "/css/main.css" in text, (
        "Async CSS requires a <noscript> fallback so non-JS clients still get styles"
    )
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m pytest _build/tests/test_async_css.py -v
```

Expected: 2 FAILs.

- [ ] **Step 3: Edit `_build/templates/partials/head_meta.html`**

Replace the existing two stylesheet lines (`<link rel="stylesheet" href="/css/main.css">` and `<link rel="stylesheet" href="/css/print.css" media="print">`) with:

```jinja
  <link rel="preconnect" href="https://finncalc.com" crossorigin>
  <link rel="preload" as="style" href="/css/main.css" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/main.css"></noscript>
  <link rel="stylesheet" href="/css/print.css" media="print">
```

- [ ] **Step 4: Re-run the test to verify it passes**

```bash
python -m pytest _build/tests/test_async_css.py -v
```

Expected: PASS.

- [ ] **Step 5: Rebuild + manual smoke (visually check no flash of unstyled content)**

```bash
python _build/generate.py
```

Open `emergency-fund/index.html` in a browser. Confirm:
- Page renders styled (CSS swap completed)
- View-source shows `rel="preload" as="style"` + the `<noscript>` fallback
- Lighthouse Performance "Eliminate render-blocking resources" improves from "Failed" to "Passed" (or "Opportunity" reduces)

- [ ] **Step 6: Commit**

```bash
git add _build/templates/partials/head_meta.html _build/tests/test_async_css.py
git commit -m "fix(seo): async-load main.css via preload+onload swap (audit HIGH)

Sitewide head_meta.html loaded /css/main.css synchronously,
making it render-blocking on all 59 pages. Switched to
preload-then-swap with a <noscript> fallback for non-JS clients.
Added preconnect hint. Fixes audit HIGH-priority issue on
59/59 pages."
```

---

## Task 5: Wrap body in `<main>` to cut DOM root direct children

**Files:**
- Modify: `_build/templates/_base.html`
- Create: `_build/tests/test_main_wrapper.py`

**Why:** Audit reports DOM root has >60 direct children sitewide. `_base.html` currently has many top-level `<div class="container">` blocks as direct `<body>` children. Wrapping the page-content blocks in `<main>` collapses them to one direct child + the header/footer = 3 direct children of `<body>`.

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_main_wrapper.py
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BASE = REPO / "_build" / "templates" / "_base.html"


def test_base_template_has_main_element():
    text = BASE.read_text(encoding="utf-8")
    assert "<main" in text and "</main>" in text, "_base.html must wrap content in <main>"


def test_main_wraps_block_body_main():
    """The {% block body_main %} content must be inside <main>."""
    text = BASE.read_text(encoding="utf-8")
    main_open = text.find("<main")
    block = text.find("{% block body_main %}")
    main_close = text.find("</main>")
    assert -1 < main_open < block < main_close, (
        "<main> must open before and close after {% block body_main %}"
    )
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
python -m pytest _build/tests/test_main_wrapper.py -v
```

Expected: 2 FAILs.

- [ ] **Step 3: Edit `_build/templates/_base.html`**

Wrap the content between `{% include "partials/header.html" %}` and `{% include "partials/footer.html" %}` with `<main id="content">` / `</main>`. The hero block, top ad slot, `{% block body_main %}`, editorial trailer, and footer ad slot all go inside `<main>`. The `<style>` block stays before `</main>` close. Skip-link target `id="content"` is the accessibility bonus.

The diff is two added lines:

```jinja
{% include "partials/header.html" %}

<main id="content">
<!-- Ad slot top (leaderboard above H1) -->
...
[everything currently between header.html and footer.html includes stays here unchanged]
...
</main>

{% include "partials/footer.html" %}
```

- [ ] **Step 4: Re-run the test to verify it passes**

```bash
python -m pytest _build/tests/test_main_wrapper.py -v
```

Expected: PASS.

- [ ] **Step 5: Rebuild and count direct children of `<body>`**

```bash
python _build/generate.py
python -c "
from pathlib import Path
import re
html = Path('emergency-fund/index.html').read_text(encoding='utf-8')
m = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
body = m.group(1)
# crude direct-child count: top-level tags (won't count nested)
direct = re.findall(r'^<\w[^>]*>', body, re.MULTILINE)
print(f'Approx direct children: {len(direct)}')
"
```

Expected: ≤ 10 (was >60).

- [ ] **Step 6: Commit**

```bash
git add _build/templates/_base.html _build/tests/test_main_wrapper.py
git commit -m "fix(seo): wrap page content in <main> for DOM hygiene (audit LOW)

_base.html had many top-level <div> blocks as direct children
of <body>, tripping the >60-direct-children DOM warning sitewide.
Wrapped everything between header and footer in <main id=content>.
Bonus: skip-link target for accessibility."
```

---

## Task 6: Diagnose + fix shared HTML parse errors

**Files:**
- Create: `_build/scripts/validate_html.py`
- Modify: whichever component the validator fingers (the audit suggests a single shared component affecting 17 pages; common suspects: a partial under `_build/templates/partials/`, or markup inside `_build/bodies/` body files for blog posts)

**Why:** Audit reports `'token cannot be inserted here'` parse error on 17 of 59 pages — specifically blog posts + `/budget/`, `/compound-interest/`, `/stamp-duty-calculator/`, `/take-home-pay/`, `/debt-snowball-calculator/`, `/savings-goal/house-deposit/`. The W3C validator will pinpoint the offending byte range; the fix is then a localised template/component edit.

- [ ] **Step 1: Write the validator wrapper**

```python
# _build/scripts/validate_html.py
"""Run html5lib-tolerant parser over rendered pages and surface errors.

Uses html5lib (already in requirements indirectly via jinja's tests, or
install separately) to mimic browser-like parsing and report all parse
errors per file.
"""
import sys
from pathlib import Path

import html5lib

REPO = Path(__file__).resolve().parents[2]

AUDIT_PAGES = [
    "blog/index.html",
    "budget/index.html",
    "compound-interest/index.html",
    "stamp-duty-calculator/index.html",
    "take-home-pay/index.html",
    "debt-snowball-calculator/index.html",
    "savings-goal/house-deposit/index.html",
    "blog/50-30-20-budget-rule/index.html",
    "blog/how-much-house-can-i-afford/index.html",
    "blog/how-much-is-stamp-duty-uk/index.html",
    "blog/how-much-to-save-for-retirement-at-35/index.html",
    "blog/how-to-create-a-monthly-budget/index.html",
    "blog/pay-off-loan-early/index.html",
    "blog/save-for-house-deposit/index.html",
    "blog/south-africa-tax-guide-2024/index.html",
    "blog/uk-personal-allowance-2024-25/index.html",
    "blog/what-is-401k-employer-match/index.html",
    "blog/what-is-paye-south-africa/index.html",
    "blog/debt-avalanche-vs-snowball/index.html",
]


def validate(rel_path: str) -> list[str]:
    full = REPO / rel_path
    if not full.exists():
        return [f"FILE_MISSING: {rel_path}"]
    parser = html5lib.HTMLParser(strict=False)
    try:
        parser.parse(full.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"PARSE_EXCEPTION: {exc}"]
    return [str(e) for e in parser.errors]


def main() -> int:
    overall = 0
    for page in AUDIT_PAGES:
        errors = validate(page)
        if errors:
            overall = 1
            print(f"\n{page} — {len(errors)} parse errors:")
            for err in errors[:5]:  # cap noise
                print(f"  {err}")
            if len(errors) > 5:
                print(f"  ... +{len(errors) - 5} more")
    return overall


if __name__ == "__main__":
    sys.exit(main())
```

Add `html5lib` to `_build/requirements.txt` if not already present.

- [ ] **Step 2: Run the validator and capture the dominant error pattern**

```bash
pip install html5lib
python _build/scripts/validate_html.py | tee _build/parse_errors_pre.log
```

Expected: dozens of lines. Look for the most common `(line, col, code)` triple — that's the single shared component bug.

- [ ] **Step 3: Find the source component**

```bash
# If the dominant error mentions "Unexpected start tag" or similar:
grep -rln "<<\|< /\|</ \|<< " _build/templates/partials/ _build/bodies/ 2>/dev/null
# Or look at the line/col reported by validator against a known-affected
# rendered page; back-trace to its source template or body file.
head -n <reported_line> blog/50-30-20-budget-rule/index.html | tail -20
```

- [ ] **Step 4: Apply the fix to the shared source component**

This step is conditional on what the validator finds — possible fixes:
- Mis-nested `<p>` inside `<p>` in a partial → close the outer `<p>` first
- Unescaped `<` inside text (e.g. `R < 250`) → replace with `&lt;`
- Self-closing void element with `/` in HTML5 (e.g. `<br/>`) — harmless, but the parser may flag if combined with unquoted attrs
- Missing closing tag on a partial that's only included on blog pages (e.g. `partials/key_concepts.html` if it has a stray tag)

Whatever the validator names is the file to edit. Add the file path here when known.

- [ ] **Step 5: Rebuild and re-run the validator**

```bash
python _build/generate.py
python _build/scripts/validate_html.py | tee _build/parse_errors_post.log
diff _build/parse_errors_pre.log _build/parse_errors_post.log
```

Expected: `parse_errors_post.log` empty (or only pre-existing low-severity warnings that DataForSEO doesn't flag).

- [ ] **Step 6: Add a test gate so the regression can't recur**

```python
# _build/tests/test_html_parses_clean.py
import pytest
from pathlib import Path
import html5lib

REPO = Path(__file__).resolve().parents[2]

PAGES = [
    "blog/index.html",
    "budget/index.html",
    "compound-interest/index.html",
    "stamp-duty-calculator/index.html",
    "take-home-pay/index.html",
    "debt-snowball-calculator/index.html",
    "savings-goal/house-deposit/index.html",
    "blog/50-30-20-budget-rule/index.html",
    "blog/how-much-house-can-i-afford/index.html",
    "blog/how-much-is-stamp-duty-uk/index.html",
    "blog/how-much-to-save-for-retirement-at-35/index.html",
    "blog/how-to-create-a-monthly-budget/index.html",
    "blog/pay-off-loan-early/index.html",
    "blog/save-for-house-deposit/index.html",
    "blog/south-africa-tax-guide-2024/index.html",
    "blog/uk-personal-allowance-2024-25/index.html",
    "blog/what-is-401k-employer-match/index.html",
    "blog/what-is-paye-south-africa/index.html",
    "blog/debt-avalanche-vs-snowball/index.html",
]


@pytest.mark.parametrize("rel", PAGES, ids=lambda p: p.replace("/", "_"))
def test_page_parses_clean(rel):
    path = REPO / rel
    if not path.exists():
        pytest.skip(f"{rel} not yet built — run _build/generate.py")
    parser = html5lib.HTMLParser(strict=False)
    parser.parse(path.read_text(encoding="utf-8"))
    errors = list(parser.errors)
    assert not errors, f"{rel} has {len(errors)} parse errors: {errors[:3]}"
```

- [ ] **Step 7: Run the test — expect PASS**

```bash
python -m pytest _build/tests/test_html_parses_clean.py -v
```

- [ ] **Step 8: Commit**

```bash
git add _build/scripts/validate_html.py _build/tests/test_html_parses_clean.py _build/requirements.txt <component_file>
git commit -m "fix(seo): fix shared HTML parse error on 17 pages (audit MEDIUM)

DataForSEO crawler reported 'token cannot be inserted here'
parse errors on 17/59 pages — root caused to <COMPONENT> via
html5lib validator. Fixed the mis-nested markup and added a
parametrised pytest gate so the regression can't recur."
```

---

## Task 7: Add missing `alt` attributes to images

**Files:**
- Create: `_build/scripts/audit_image_alts.py`
- Create: `_build/tests/test_image_alt_coverage.py`
- Modify: body files + blog source files that contain `<img>` without `alt`

**Why:** 35 of 59 pages have at least one `<img>` lacking an `alt` attribute. Image search and WCAG suffer. The fix is per-image text. Cannot auto-generate semantically meaningful alts — engineer must read each img's surrounding context.

- [ ] **Step 1: Write the auditor**

```python
# _build/scripts/audit_image_alts.py
"""List every <img> across body and blog HTML that lacks an alt attribute."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
GLOB_ROOTS = ["_build/bodies", "blog"]
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
HAS_ALT = re.compile(r'\balt\s*=', re.IGNORECASE)


def audit_file(path: Path) -> list[str]:
    offenders = []
    text = path.read_text(encoding="utf-8")
    for match in IMG_TAG.finditer(text):
        tag = match.group(0)
        if not HAS_ALT.search(tag):
            offenders.append(tag)
    return offenders


def main() -> int:
    total = 0
    for root in GLOB_ROOTS:
        base = REPO / root
        if not base.exists():
            continue
        for html in base.rglob("*.html"):
            offenders = audit_file(html)
            if offenders:
                print(f"\n{html.relative_to(REPO)} — {len(offenders)} <img> without alt:")
                for tag in offenders:
                    print(f"  {tag[:120]}")
                total += len(offenders)
    print(f"\nTotal <img> tags missing alt: {total}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run the auditor to enumerate offenders**

```bash
python _build/scripts/audit_image_alts.py | tee _build/image_alt_audit.log
```

Expected: list of `<img>` tags grouped by file.

- [ ] **Step 3: Add `alt` attribute to each offending `<img>`**

For each entry in the audit log, edit the source file (`_build/bodies/<slug>.html` for calculator pages, `blog/<post>/index.html` for blog posts) and add an `alt` describing the image. Conventions:
- Calculator screenshot → `alt="<calculator name> showing <key result>"`
- Author headshot → `alt="<author name>, <jobTitle>"`
- Generic decorative image → `alt=""` (empty alt is valid for purely decorative)
- Chart / graph → `alt="<x-axis> vs <y-axis> for <data subject>"`

- [ ] **Step 4: Re-run the auditor — expect 0 offenders**

```bash
python _build/scripts/audit_image_alts.py
```

Expected: `Total <img> tags missing alt: 0`, exit 0.

- [ ] **Step 5: Write + run a regression test**

```python
# _build/tests/test_image_alt_coverage.py
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
BODIES = REPO / "_build" / "bodies"
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
HAS_ALT = re.compile(r'\balt\s*=', re.IGNORECASE)


@pytest.mark.parametrize("body", sorted(BODIES.glob("*.html")), ids=lambda p: p.name)
def test_body_images_have_alt(body):
    text = body.read_text(encoding="utf-8")
    offenders = [t.group(0) for t in IMG_TAG.finditer(text) if not HAS_ALT.search(t.group(0))]
    assert not offenders, f"{body.name} has {len(offenders)} <img> without alt: {offenders[:2]}"
```

```bash
python -m pytest _build/tests/test_image_alt_coverage.py -v
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add _build/bodies/*.html blog/**/*.html _build/scripts/audit_image_alts.py _build/tests/test_image_alt_coverage.py
git commit -m "fix(seo): add alt text to all <img> across body + blog (audit MEDIUM)

35 of 59 pages had at least one <img> missing alt — fixed each
with context-appropriate text per WCAG. Added auditor +
parametrised pytest gate so future <img> additions can't ship
without alt."
```

---

## Task 8: Defer / lazy-load heavy widgets on 6 slow pages

**Files:**
- Modify: `_build/templates/_base.html` (universal `defer` on JS already in place — verify)
- Modify: relevant body files for the 6 named pages
- Optionally: `_build/templates/partials/key_concepts.html` + `_build/templates/partials/try_scenarios.html` (lazy-load via IntersectionObserver in `js/main.js`)

**Why:** 6 calculator pages cross 3s dom_complete: `/take-home-pay/`, `/blog/how-much-house-can-i-afford/` (5.8s — worst), `/debt-snowball-calculator/`, `/savings-goal/house-deposit/`, `/blog/uk-personal-allowance-2024-25/`, `/blog/what-is-paye-south-africa/`. Two levers: defer/async heavy widget JS, lazy-load below-the-fold FAQ + examples.

- [ ] **Step 1: Inventory the JS each slow page actually loads**

```bash
for page in take-home-pay/index.html debt-snowball-calculator/index.html savings-goal/house-deposit/index.html blog/how-much-house-can-i-afford/index.html blog/uk-personal-allowance-2024-25/index.html blog/what-is-paye-south-africa/index.html; do
  echo "=== $page ==="
  grep -E '<script' "$page" | head -10
done
```

Note which scripts are inline vs external, and which are common across the 6.

- [ ] **Step 2: For each external `<script>` not currently `defer`/`async`, add `defer`**

`_base.html` already has `defer` on `cookie-consent.js`, `analytics-events.js`, `newsletter.js`. The two unflagged ones are `<script src="/js/region.js"></script>` and `<script src="/js/main.js"></script>` at lines 55-56 — they're at end of body so technically not render-blocking, BUT the audit DOES flag a blocking script. Likely culprit: an inline `<script>` inside a body file (e.g. heavy calculator widget bootstrap). Convert any inline calculator-bootstrap scripts to deferred external files:

For each affected body file (e.g. `_build/bodies/take-home-pay.html`), find `<script>...</script>` blocks larger than ~50 lines and move them to `js/widgets/<slug>.js`, replacing in-body with `<script src="/js/widgets/<slug>.js" defer></script>`.

- [ ] **Step 3: Add `loading="lazy"` to images below the fold in slow pages**

For each slow page, identify `<img>` tags after the first 600px of content (typically in FAQ / Try Scenarios / Key Concepts blocks) and add `loading="lazy"`:

```html
<img src="..." alt="..." loading="lazy" decoding="async">
```

- [ ] **Step 4: Add `content-visibility: auto` CSS for below-the-fold sections**

In `_build/templates/partials/key_concepts.html` and `_build/templates/partials/try_scenarios.html`, wrap the root element with:

```html
<section style="content-visibility:auto;contain-intrinsic-size:600px">...
```

This tells the browser to skip rendering work for sections off-screen.

- [ ] **Step 5: Rebuild and re-measure**

```bash
python _build/generate.py
```

Manual smoke (operator runs Lighthouse locally or via PageSpeed Insights against the deployed branch):

```
Open chrome://devtools, Network tab, throttling = Slow 4G
Load take-home-pay/index.html → record DOMContentLoaded
Repeat for the other 5 pages
```

Expected: each below 3.0s (was 3.2 - 5.8s).

- [ ] **Step 6: Commit**

```bash
git add _build/bodies/take-home-pay.html _build/bodies/debt-snowball-calculator.html blog/how-much-house-can-i-afford/index.html blog/uk-personal-allowance-2024-25/index.html blog/what-is-paye-south-africa/index.html js/widgets/ _build/templates/partials/key_concepts.html _build/templates/partials/try_scenarios.html
git commit -m "fix(seo): defer widget JS + lazy-load below-the-fold (audit MEDIUM)

6 calculator pages crossed 3s dom_complete. Extracted inline
widget bootstrap to js/widgets/<slug>.js with defer, added
loading=lazy to below-the-fold imgs, and wrapped Try Scenarios
+ Key Concepts in content-visibility:auto to skip off-screen
layout work."
```

---

## Task 9: Operator action items — sitemap + Backlinks subscription

**Files:**
- Create: `docs/superpowers/plans/2026-05-21-finncalc-seo-remediation-log.md` — running operator action log

**Why:** Two CRITICAL audit items are dashboard-only actions Claude cannot perform: (a) submit sitemap to Search Console + Bing + Yandex, (b) activate DataForSEO Backlinks subscription. Plus a third operator step: confirm Google has crawled at least 50% of pages before scheduling re-audit.

- [ ] **Step 1: Create the operator log file**

```markdown
# FinCalc SEO Remediation — Operator Action Log

**Plan reference:** `2026-05-21-finncalc-seo-remediation.md`

## Phase A — Indexation (run AFTER code tasks 1-8 deploy to Cloudflare Pages)

- [ ] Verify `site:finncalc.com` returns ≥10 indexed pages on Google → if 0, escalate to Phase B
- [ ] Confirm sitemap URL: open https://finncalc.com/sitemap.xml in browser; ensure ≥59 `<url>` entries
- [ ] Google Search Console → Sitemaps → Add new sitemap → `sitemap.xml` → Submit
- [ ] GSC → Inspect URL → paste `https://finncalc.com/` → click "Request Indexing"
- [ ] GSC → Inspect URL for each of the 6 priority calculator pages (emergency-fund, take-home-pay, mortgage, retirement-savings, investment-growth, compound-interest) → "Request Indexing"
- [ ] Bing Webmaster Tools → Sitemaps → Submit `https://finncalc.com/sitemap.xml`
- [ ] Yandex Webmaster → Sitemap files → Add `https://finncalc.com/sitemap.xml`
- [ ] Cloudflare cache purge for the entire site after deploy:
  - URL: https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache
  - Token: see `C:\FIN_CALC_SITE\Cloudflare token.txt`
  - Body: `{"purge_everything": true}`

## Phase B — Authority (run AFTER Phase A)

- [ ] Open https://app.dataforseo.com/backlinks-subscription
- [ ] Select Backlinks subscription tier (Basic $XX/mo is sufficient for monthly audits)
- [ ] Confirm subscription active → DataForSEO dashboard → API Access → "Backlinks" service shows "Active"
- [ ] Re-run `/seo-audit https://finncalc.com/` from `C:\etsy_image_generation` — Authority pillar should now return real data (composite jumps ~+15 from filling that 0)

## Phase C — Re-audit (run 60 days after Phase A completes)

- [ ] GSC → Performance → confirm impressions >0 across at least 5 queries
- [ ] `/seo-audit https://finncalc.com/` — expect composite ≥75, technical ≥92
- [ ] If composite still <70: dispatch `seo-content` subagent to identify weak topic clusters from real ranking data and write briefs

## Phase D — Plausible + Beehiiv (deferred follow-up)

- [ ] Provision Plausible project at https://plausible.io/sites for `finncalc.com`
- [ ] Provision Beehiiv publication for `finncalc.com`
- [ ] Add Plausible script tag to head_meta.html (PSEUDO: same pattern as BC site)
```

- [ ] **Step 2: Commit the log**

```bash
git add docs/superpowers/plans/2026-05-21-finncalc-seo-remediation-log.md
git commit -m "docs(seo): operator action log for indexation + backlinks subscription

Both CRITICAL audit items are dashboard-only operator actions.
Logged the exact steps so the indexation + Authority-pillar
re-measurement can happen async."
```

---

## Task 10: Final regression suite + reference data refresh

**Files:**
- Modify: `_build/tests/conftest.py` (if needed to register new test discovery)
- Create: `_build/scripts/full_seo_regression.sh` (or `.ps1` for Windows)

**Why:** Run every new gate end-to-end against a fresh build to confirm no fix regressed another. Also refreshes the local Screaming Frog CSVs the operator keeps for offline reference.

- [ ] **Step 1: Create the regression runner**

```powershell
# _build/scripts/full_seo_regression.ps1
$ErrorActionPreference = "Stop"
$REPO = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $REPO

Write-Host "=== 1. Rebuild ===" -ForegroundColor Cyan
python _build/generate.py

Write-Host "=== 2. Audit titles ===" -ForegroundColor Cyan
python _build/scripts/audit_titles.py

Write-Host "=== 3. Audit image alts ===" -ForegroundColor Cyan
python _build/scripts/audit_image_alts.py

Write-Host "=== 4. Validate HTML ===" -ForegroundColor Cyan
python _build/scripts/validate_html.py

Write-Host "=== 5. Strip-h1 idempotency check ===" -ForegroundColor Cyan
python _build/scripts/strip_duplicate_h1.py

Write-Host "=== 6. Full pytest suite ===" -ForegroundColor Cyan
python -m pytest _build/tests/ -v

Write-Host "`nAll SEO regression gates green." -ForegroundColor Green
```

- [ ] **Step 2: Run it**

```powershell
powershell -ExecutionPolicy Bypass -File _build/scripts/full_seo_regression.ps1
```

Expected: every section exits 0, final pytest summary shows all green.

- [ ] **Step 3: Spot-check 3 representative rendered pages in browser**

Open `emergency-fund/index.html`, `take-home-pay/index.html`, `blog/how-much-house-can-i-afford/index.html` locally. Confirm:
- One H1
- Favicon shows in browser tab
- Page renders without flash of unstyled content
- No console errors

- [ ] **Step 4: Commit the runner**

```bash
git add _build/scripts/full_seo_regression.ps1
git commit -m "chore(seo): add full regression runner for the 2026-05-21 remediation

Single PowerShell script chains every new gate so the operator
can re-validate the site state in one command after future
edits."
```

- [ ] **Step 5: Final push + Cloudflare deploy**

```bash
git push origin main
```

Cloudflare Pages auto-builds on push. After deploy:
```bash
# Cloudflare cache purge — see operator log Phase A
```

- [ ] **Step 6: Tag the milestone**

```bash
git tag seo-remediation-2026-05-21
git push --tags
```

---

## Acceptance Checklist (post-merge)

A separate operator session should walk this checklist on the deployed site:

- [ ] `curl -s https://finncalc.com/emergency-fund/ | grep -c '<h1'` returns `1`
- [ ] `curl -s https://finncalc.com/ | grep -c 'rel="icon"'` returns `≥1`
- [ ] `curl -s https://finncalc.com/student-loan-calculator/ | grep -oP '<title>[^<]+' | awk '{print length}'` returns `≤67`
- [ ] PageSpeed Insights Performance score on `/take-home-pay/` ≥ 75 (was unmeasured / likely 50s due to 3.2s dom_complete)
- [ ] All 5 dashboard tasks in `2026-05-21-finncalc-seo-remediation-log.md` Phase A checked off
- [ ] DataForSEO Backlinks subscription Active → `/seo-audit https://finncalc.com/` Authority pillar returns non-zero score
- [ ] 60-day re-audit (scheduled in operator's calendar) composite score ≥75
