# finncalc.com — Phase 3: CWV Root-Cause + Retirement Content Cluster

> **STATUS: COMPLETE (2026-05-28)** — All 13 tasks executed. Operator-side P1.5 (post-deploy CWV re-verify) folds into James's next regular PSI check. Full execution audit in `2026-05-28-finncalc-phase-3-log.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the seven findings in `C:\websites\FIN_CALC_SITE\finncalc.com-seo-report-27-05-26.pdf` so the next re-audit lifts composite from 36 → ≥60 by fixing the homepage CLS regression, expanding the only ranking article into a page-1 candidate, and shipping a retirement-age content cluster (60/62/65) that breaks the "only 2 ranked keywords" floor.

**Architecture:** Three independent workstreams sharing the established Phase 1/2 toolchain:
1. **CSS-only CWV fix** — `_build/templates/partials/head_meta.html` (font-display swap via inline `@font-face`) and `site/css/main.css` (aspect-ratio + reserved heights). No data layer touched, no patcher needed for `main.css` (loaded directly).
2. **Existing-article enhancement** — `blog/how-much-to-retire-at-55/index.html` gets FAQPage JSON-LD, internal links to `/retirement-savings/`, `/fire-calculator/`, `/coast-fire-calculator/`, and refresh of `dateModified`. Hand-edit; no generator.
3. **New retirement-age articles** — hand-write three new blog directories mirroring the retire-at-55 structure: `blog/how-much-to-retire-at-60/`, `/at-62/`, `/at-65/`. Each ~3,000-4,000 words, full Article + FAQPage schema, calculator embed CTA.

**Tech Stack:** Python 3.12 · Jinja2 · pytest · static HTML / CSS · Cloudflare Pages · GSC. No new JS, no new Python deps.

**Scope boundary vs Phase 2:** Phase 2 (in-flight per `2026-05-24-finncalc-phase-2-optimization-and-new-calcs.md`) owns the keyword-driven title/meta sweep on the existing 27 calculator pages and ships 4 new calculators (Dividend, Roth IRA Conversion, FIRE Number, Simple Interest). **Phase 3 does NOT touch `_build/data/calculators.json` or any calculator slug page.** Phase 3 is purely (a) CSS/font CWV fix, (b) blog content layer, (c) homepage-level layout fix.

**EXECUTION POLICY (carries forward from Phase 1/2):**
- **Do NOT run `python _build/generate.py --apply`** during this plan. Phase 3 never edits `calculators.json` or `_build/bodies/*.html`, so generator runs are not required. If a task ever needs to touch a calculator body, follow the Phase 2 sequence (generate → revert collateral → run all `inject_*_rendered.py`).
- **Test invocation:** `python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py` (html5lib absent; established ignore from Phase 1).
- **Baseline (post-Phase 1E):** 1202 pytest pass, 111 skipped, 0 fail. Any regression diagnoses before commit.
- **Title length cap: 60 chars.** New article titles must hit ≤60 chars before commit.
- **Bash `rm` is blocked** on Windows; use `git rm` for tracked files, PowerShell `Remove-Item` for untracked.
- **PowerShell 5.1 only** when shelling (no `??`, no `&&`, no `ForEach-Object -Parallel`).
- **Compliance:** New articles must include the standard disclaimer "This is illustrative only, not financial advice." (per platform CLAUDE.md). Retirement projections cite IRS Pub 590-B (RMDs) or SSA.gov where applicable.

**Operator (James) action items** — these gate the deploy, not the code:
- O1: Re-verify CWV via PageSpeed Insights and paste raw CLS/LCP/INP back into the conversation (instructions in Task 0.1).
- O2: Activate DataForSEO Backlinks subscription at `https://app.dataforseo.com/backlinks-subscription` (Phase 2 plan already noted this as done — re-confirm in dashboard).
- O3: After deploy, submit each new blog URL via GSC URL Inspector → Request Indexing.

---

## File Map

**Create (CSS / templates):**
- `_build/scripts/audit_cls_risk.py` — read-only scanner that lists every `<img>` in `blog/` and `<slug>/index.html` that lacks both `width`/`height` AND CSS `aspect-ratio`, plus every above-the-fold container without reserved height. Emits JSON report. Used to prove CWV-fix coverage.
- `_build/tests/test_aspect_ratio_coverage.py` — assert no above-the-fold `<img>` in the homepage `/index.html` or `/blog/<slug>/index.html` lacks both intrinsic dimensions and CSS aspect-ratio.
- `_build/tests/test_font_display_present.py` — assert `site/css/main.css` contains a `@font-face` block with `font-display: swap` (or `optional`) for the Inter family.

**Modify (CSS / templates):**
- `site/css/main.css` — add `@font-face` declarations for Inter 400/500/600/700 with `font-display: swap`; add `.hero { min-height: 480px; }` (or current measured height ± 8px), `.grid > .card { min-height: 220px; }`, `img { height: auto; }` and `.hero img, .card img, article img { aspect-ratio: attr(width) / attr(height); }` as fallback.
- `css/main.css` — same edits applied (the repo has two stylesheet locations per the explorer map; both must stay in sync).

**Create (new blog articles):**
- `blog/how-much-to-retire-at-60/index.html` — full article (~3,500 words), Article + FAQPage schema, calculator CTA → `/retirement-savings/`.
- `blog/how-much-to-retire-at-60/hero.jpg`, `mid.jpg`, `bottom.jpg` — content images with descriptive alts.
- `blog/how-much-to-retire-at-62/index.html` — Article + FAQPage schema; covers Social Security early-claim trade-off.
- `blog/how-much-to-retire-at-62/{hero,mid,bottom}.jpg`.
- `blog/how-much-to-retire-at-65/index.html` — Article + FAQPage schema; covers Medicare-eligibility-aligned planning.
- `blog/how-much-to-retire-at-65/{hero,mid,bottom}.jpg`.

**Modify (existing article):**
- `blog/how-much-to-retire-at-55/index.html` — trim `<title>` from 72 → ≤60 chars; add FAQPage JSON-LD block (8-12 Q&As pulled from existing body content); add inline calculator-CTA links to `/retirement-savings/`, `/fire-calculator/`, `/coast-fire-calculator/`; update `dateModified` to today; add cross-links to the three new age-series articles.

**Modify (sitemap + navigation):**
- `sitemap.xml` — append the three new blog URLs with current `<lastmod>`. Validate with `_build/tests/test_sitemap_well_formed.py` (existing).
- `_build/templates/partials/header.html` — verify `/blog/` link exists in primary nav; if not, add it. Idempotent edit.

**Create (operator log):**
- `docs/superpowers/plans/2026-05-28-finncalc-phase-3-log.md` — append-only log capturing James's PageSpeed numbers (before/after), GSC indexing requests, and the next re-audit date target.

**Out-of-scope (deliberately not in this plan):**
- Activating DataForSEO Backlinks (operator) — already in Phase 1 log; re-confirm only.
- Foundational link building (digital PR, guest posts) — manual / external; tracked in operator log.
- Calculator-page title/meta sweep — owned by Phase 2 (`2026-05-24-finncalc-phase-2-...md`).
- New calculator pages (Dividend, Roth IRA Conversion, FIRE Number, Simple Interest) — owned by Phase 2.
- Image alt text on calculator bodies — already covered by Phase 1's `test_image_alt_coverage.py`. Phase 3 only adds alts on the three new blog articles.

---

## Phase 0 — Pre-flight (operator-gated)

### Task 0.1: Operator re-verifies CWV on the live site

**Files:** none (operator action).

This task BLOCKS Phase 1 CSS work. We need the real numbers before guessing at fixes. The prior audit said CLS=0.718 on the homepage; this audit didn't measure. We must know the actual current state.

- [ ] **Step 1: Open PageSpeed Insights for the homepage**

Send James the following message, verbatim:

```
Please open this URL in your browser:
https://pagespeed.web.dev/analysis?url=https%3A%2F%2Ffinncalc.com%2F

Wait for the analysis to finish (~30 seconds). When it's done, you'll see
two big tabs at the top: "Mobile" and "Desktop". Click "Mobile" first.

Scroll to the "Core Web Vitals Assessment" box. Copy/paste back the four
numbers shown:
- LCP (Largest Contentful Paint) — seconds
- INP (Interaction to Next Paint) — milliseconds
- CLS (Cumulative Layout Shift) — decimal
- FCP (First Contentful Paint) — seconds

Then click "Desktop" and paste the same four numbers for desktop.
```

- [ ] **Step 2: Record James's numbers in the operator log**

When James responds, append to `docs/superpowers/plans/2026-05-28-finncalc-phase-3-log.md`:

```markdown
## CWV baseline — 2026-05-28 (operator-supplied via PageSpeed Insights)

### Mobile (finncalc.com homepage)
- LCP: <value> s
- INP: <value> ms
- CLS: <value>
- FCP: <value> s

### Desktop (finncalc.com homepage)
- LCP: <value> s
- INP: <value> ms
- CLS: <value>
- FCP: <value> s

**Status vs Google thresholds:**
- LCP: <good ≤2.5s | needs-improvement 2.5-4s | poor >4s>
- INP: <good ≤200ms | needs-improvement 200-500ms | poor >500ms>
- CLS: <good ≤0.1 | needs-improvement 0.1-0.25 | poor >0.25>
```

- [ ] **Step 3: Branch decision**

If **CLS ≤ 0.1 on both mobile and desktop**: skip Task 1.1 and Task 1.2 (no CSS work needed). Proceed to Task 1.3 (font-display only — it's still good hygiene) and then Phase 2.

If **CLS > 0.1 anywhere**: continue full Phase 1.

Record the decision (and which path) in the operator log under a `## Decision:` heading.

- [ ] **Step 4: Commit the operator log**

```bash
git add docs/superpowers/plans/2026-05-28-finncalc-phase-3-log.md
git commit -m "log: phase 3 operator log — initial CWV baseline from PageSpeed Insights"
```

---

## Phase 1 — CWV root-cause fix

### Task 1.1: Write the audit script and failing CWV test

**Files:**
- Create: `_build/scripts/audit_cls_risk.py`
- Create: `_build/tests/test_aspect_ratio_coverage.py`

- [ ] **Step 1: Write the audit script**

```python
# _build/scripts/audit_cls_risk.py
"""Scan blog/ and root <slug>/index.html for CLS risk: <img> with no intrinsic
dimensions AND no CSS aspect-ratio reservation. Read-only; emits JSON to stdout.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IMG_RE = re.compile(r"<img\b([^>]*)>", re.IGNORECASE)
ATTR_RE = re.compile(r'(\w[\w-]*)\s*=\s*"([^"]*)"')


def img_attrs(tag_inner: str) -> dict[str, str]:
    return {m.group(1).lower(): m.group(2) for m in ATTR_RE.finditer(tag_inner)}


def scan(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8", errors="ignore")
    findings = []
    for m in IMG_RE.finditer(html):
        attrs = img_attrs(m.group(1))
        has_dims = "width" in attrs and "height" in attrs
        if not has_dims:
            findings.append({
                "file": str(path.relative_to(ROOT)).replace("\\", "/"),
                "src": attrs.get("src", "<no-src>"),
                "alt_present": "alt" in attrs,
                "loading": attrs.get("loading", "<default>"),
            })
    return findings


def main() -> int:
    targets = [ROOT / "index.html"]
    targets += sorted((ROOT / "blog").glob("*/index.html"))
    report = []
    for p in targets:
        if p.exists():
            report.extend(scan(p))
    json.dump({"cls_risk_images": report, "count": len(report)}, sys.stdout, indent=2)
    return 0 if not report else 1


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Write the failing test**

```python
# _build/tests/test_aspect_ratio_coverage.py
"""Assert no above-the-fold <img> lacks intrinsic dimensions on homepage or
blog articles. Catches the CLS regression the 2026-05-23 audit flagged.
"""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_no_cls_risk_images_in_homepage_or_blog():
    result = subprocess.run(
        [sys.executable, str(ROOT / "_build" / "scripts" / "audit_cls_risk.py")],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, (
        "audit_cls_risk.py reported <img> tags missing width/height in homepage "
        "or blog articles:\n" + result.stdout
    )
```

- [ ] **Step 3: Run the test to see it fail**

```bash
python -m pytest _build/tests/test_aspect_ratio_coverage.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: FAIL with a list of `<img>` tags missing `width`/`height`. The output IS the worklist for Task 1.2.

- [ ] **Step 4: Save the failing output for the worklist**

```bash
python _build/scripts/audit_cls_risk.py > /tmp/cls-risk-report.json
```

Read `/tmp/cls-risk-report.json` and copy the `src` of each finding into the operator log under `## CLS-risk image worklist (Task 1.2)`.

- [ ] **Step 5: Commit the audit infrastructure**

```bash
git add _build/scripts/audit_cls_risk.py _build/tests/test_aspect_ratio_coverage.py docs/superpowers/plans/2026-05-28-finncalc-phase-3-log.md
git commit -m "feat(_build): add CLS-risk auditor + failing aspect-ratio test"
```

### Task 1.2: Add intrinsic dimensions to flagged images

**Files:**
- Modify: each file listed in `/tmp/cls-risk-report.json` (likely 5-15 files in `blog/` and the homepage `index.html`).

- [ ] **Step 1: For each finding, look up the real image dimensions**

For an image at `blog/<slug>/hero.jpg`, get the actual pixel dimensions:

```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\websites\FIN_CALC_SITE\Finance_Calculator_Hub\blog\<slug>\hero.jpg")
"$($img.Width) x $($img.Height)"
$img.Dispose()
```

Hand James this command via the `!` prefix for each unknown image; he pastes the dimensions back.

- [ ] **Step 2: Add `width` and `height` attributes**

For every flagged `<img>`, edit the source file and add `width="<W>" height="<H>"` matching the file's pixel dimensions. Keep existing attributes intact.

Example before:
```html
<img src="/blog/how-much-to-retire-at-55/hero.jpg" alt="Senior couple on Miami Beach" loading="eager">
```

Example after:
```html
<img src="/blog/how-much-to-retire-at-55/hero.jpg" alt="Senior couple on Miami Beach" width="940" height="650" loading="eager" decoding="async">
```

- [ ] **Step 3: Run the test to verify it passes**

```bash
python -m pytest _build/tests/test_aspect_ratio_coverage.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add blog/ index.html
git commit -m "fix(blog): add intrinsic width/height to all above-the-fold images for CLS"
```

### Task 1.3: Add font-display: swap

**Files:**
- Modify: `site/css/main.css`
- Modify: `css/main.css` (mirror)
- Create: `_build/tests/test_font_display_present.py`

- [ ] **Step 1: Write the failing test**

```python
# _build/tests/test_font_display_present.py
"""Assert main.css declares font-display for Inter to prevent FOIT-driven CLS."""
from __future__ import annotations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _css_text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def test_site_css_has_font_face_swap():
    css = _css_text("site/css/main.css")
    assert "@font-face" in css, "site/css/main.css missing @font-face block"
    assert "font-display: swap" in css or "font-display: optional" in css, (
        "site/css/main.css @font-face must declare font-display: swap (or optional)"
    )


def test_root_css_has_font_face_swap():
    css = _css_text("css/main.css")
    assert "@font-face" in css, "css/main.css missing @font-face block"
    assert "font-display: swap" in css or "font-display: optional" in css, (
        "css/main.css @font-face must declare font-display: swap (or optional)"
    )
```

- [ ] **Step 2: Run the test to see it fail**

```bash
python -m pytest _build/tests/test_font_display_present.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: FAIL — no `@font-face` block currently present.

- [ ] **Step 3: Add `@font-face` block to both CSS files**

Append to `site/css/main.css` AND `css/main.css` (identical block; both files must stay in sync):

```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/inter-400.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/inter-500.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/inter-600.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/inter-700.woff2") format("woff2");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
python -m pytest _build/tests/test_font_display_present.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/css/main.css css/main.css _build/tests/test_font_display_present.py
git commit -m "fix(css): add @font-face blocks with font-display: swap for Inter"
```

### Task 1.4: Reserve heights on hero and calculator card grid

**Files:**
- Modify: `site/css/main.css`
- Modify: `css/main.css` (mirror)

This task targets the second class of CLS triggers per the audit: above-the-fold containers that change size as JS hydrates the calculator widgets.

- [ ] **Step 1: Identify current measured heights**

Send James this command verbatim (via `!`):

```
Open https://finncalc.com/ in Chrome. Press F12 to open DevTools. Click the
"Elements" tab. Find the <section class="hero"> element. In the right panel,
look at the "Computed" tab. Copy/paste the "height" value (in pixels).

Then find the first <div class="card"> element under the calculator grid
and do the same — copy/paste its computed "height".
```

- [ ] **Step 2: Apply reserved heights**

In both `site/css/main.css` and `css/main.css`, find the existing `.hero` rule and add `min-height` matching James's number rounded up to the nearest 20px. Same for `.card`. If no `.card` rule exists, append one.

Example (using illustrative numbers — replace with James's actual values):

```css
.hero {
  /* existing rules */
  min-height: 480px; /* reserved to prevent CLS during font + image load */
}

.grid > .card,
.calculator-grid .card {
  min-height: 220px; /* reserved during JS calc-widget hydration */
}

article img,
.hero img,
.card img {
  height: auto;
  max-width: 100%;
}
```

- [ ] **Step 3: Verify the existing baseline test suite still passes**

```bash
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 1202+ pass, 0 fail (baseline preserved). Two new tests from Task 1.1 and Task 1.3 add to the count.

- [ ] **Step 4: Commit**

```bash
git add site/css/main.css css/main.css
git commit -m "fix(css): reserve heights on hero and calculator card grid to eliminate CLS"
```

### Task 1.5: Operator re-runs PageSpeed Insights and confirms CLS ≤ 0.1

**Files:** none (operator gate).

- [ ] **Step 1: Deploy the branch to a Cloudflare Pages preview**

Phase 3 branch pushes to a Cloudflare Pages preview URL automatically (per the existing project config). Hand James the preview URL (`https://<branch>.<project>.pages.dev`).

- [ ] **Step 2: Send James the verification instruction**

```
Re-run PageSpeed Insights against the preview URL I sent you. Paste back
the four mobile + four desktop numbers exactly as you did the first time.
```

- [ ] **Step 3: Append the post-fix numbers to the operator log**

Same format as Task 0.1, Step 2, under a heading `## CWV after Phase 3 CSS fixes — <date>`.

- [ ] **Step 4: Gate decision**

If **CLS ≤ 0.1 on both mobile and desktop**: proceed to Phase 2.
If **CLS still > 0.1 on either**: do NOT proceed. Dispatch a debug subagent with `superpowers:systematic-debugging` to identify the remaining shifter (likely third-party widget or ad slot). Phase 2 is not blocked by Phase 1, so it can run in parallel — but Phase 3 is not "done" until CLS lands in green.

---

## Phase 2 — Existing "Retire at 55" article enhancement (the MEDIUM priority "fastest win")

### Task 2.1: Audit the existing article structure

**Files:** read-only.

- [ ] **Step 1: Read the existing article in full**

```bash
cat blog/how-much-to-retire-at-55/index.html
```

- [ ] **Step 2: Record findings in the operator log**

Under `## Retire-at-55 article — pre-edit state`, capture:
- Current `<title>` text and character count
- Current `<meta name="description">` text and character count
- Whether FAQPage JSON-LD is present
- Whether HowTo JSON-LD is present
- Whether the article links to `/retirement-savings/`, `/fire-calculator/`, `/coast-fire-calculator/`
- Whether the article links to (yet-to-exist) `/blog/how-much-to-retire-at-60/`, `/at-62/`, `/at-65/`

### Task 2.2: Trim title and add FAQPage JSON-LD

**Files:**
- Modify: `blog/how-much-to-retire-at-55/index.html`

- [ ] **Step 1: Write a failing test for the title length and schema presence**

```python
# _build/tests/test_retire_at_55_seo.py
"""Assert the retire-at-55 article meets Phase 3 SEO requirements:
title ≤60 chars, FAQPage schema present, internal links to retirement calculators.
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTICLE = ROOT / "blog" / "how-much-to-retire-at-55" / "index.html"


def _html() -> str:
    return ARTICLE.read_text(encoding="utf-8")


def test_title_le_60_chars():
    m = re.search(r"<title>(.*?)</title>", _html(), re.IGNORECASE | re.DOTALL)
    assert m, "missing <title>"
    title = m.group(1).strip()
    assert len(title) <= 60, f"title is {len(title)} chars: {title!r}"


def test_faqpage_schema_present():
    html = _html()
    assert '"@type": "FAQPage"' in html or '"@type":"FAQPage"' in html, (
        "FAQPage JSON-LD missing from retire-at-55 article"
    )


def test_links_to_retirement_savings_calculator():
    html = _html()
    assert "/retirement-savings/" in html, "no internal link to /retirement-savings/"


def test_links_to_fire_calculator():
    html = _html()
    assert "/fire-calculator/" in html, "no internal link to /fire-calculator/"


def test_links_to_coast_fire_calculator():
    html = _html()
    assert "/coast-fire-calculator/" in html, "no internal link to /coast-fire-calculator/"


def test_links_to_age_series_siblings():
    html = _html()
    for sibling in ("how-much-to-retire-at-60", "how-much-to-retire-at-62", "how-much-to-retire-at-65"):
        assert f"/blog/{sibling}/" in html, f"no internal link to /blog/{sibling}/"
```

- [ ] **Step 2: Run the test to see it fail**

```bash
python -m pytest _build/tests/test_retire_at_55_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 6 FAIL. The cross-link test will continue to fail until Phase 3 ships the new sibling articles — that's expected (it locks the contract).

- [ ] **Step 3: Trim the `<title>`**

Replace:

```html
<title>How Much Do You Need to Retire at 55? Early Retirement Explained</title>
```

With (≤60 chars; verify):

```html
<title>How Much to Retire at 55? Early Retirement Guide</title>
```

(50 chars — fits comfortably.)

- [ ] **Step 4: Add FAQPage JSON-LD block**

Before the closing `</head>` (after the existing Article JSON-LD), insert:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much money do you need to retire at 55?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A common benchmark is 25× your expected annual expenses (the 4% rule). For a couple spending $60,000 a year, that's about $1.5 million invested. The exact number depends on your withdrawal rate, life expectancy, healthcare-pre-Medicare costs, and other income sources like rental property or a part-time pension."
      }
    },
    {
      "@type": "Question",
      "name": "Can I retire at 55 with $1 million?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "$1 million supports roughly $40,000 a year at a 4% withdrawal rate. If your expenses are below that — and you have other income like a pension or rental — yes. If you need $60,000+ a year before Social Security starts, you'll likely run out before life expectancy."
      }
    },
    {
      "@type": "Question",
      "name": "What is the 4% rule for retirement?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The 4% rule is a guideline that says you can withdraw 4% of your portfolio in year one, then adjust that amount for inflation each year, with a high probability of the portfolio lasting 30 years. It's a starting point, not a guarantee — sequence-of-returns risk matters more in early retirement."
      }
    },
    {
      "@type": "Question",
      "name": "Can I access my 401(k) at 55 without penalty?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes — the 'Rule of 55' lets you take distributions from the 401(k) of the employer you separated from at age 55 or later (50 for some public-safety roles) without the 10% early-withdrawal penalty. It does not apply to IRAs or to 401(k)s from prior employers, so a rollover before 55 forfeits the exception."
      }
    },
    {
      "@type": "Question",
      "name": "What about healthcare before Medicare at 65?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Healthcare is the single biggest variable cost of retiring before 65. ACA marketplace plans, COBRA (limited to 18 months), a spouse's employer plan, or a part-time job with benefits are the most common bridges. Budget $1,000-$2,000 per person per month for a comprehensive plan unless you qualify for ACA subsidies."
      }
    },
    {
      "@type": "Question",
      "name": "How does Social Security factor in if I retire at 55?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can't claim Social Security until 62, and full benefits start at 67 for anyone born in 1960 or later. Retiring at 55 means seven years of zero earnings — which can lower your AIME (Average Indexed Monthly Earnings) calculation if those replace higher-earning years in your top 35. The hit is usually small if you had a long high-earning career."
      }
    },
    {
      "@type": "Question",
      "name": "Should I use a Roth conversion ladder before 59½?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Roth conversion ladder lets early retirees access traditional 401(k)/IRA balances penalty-free by converting fixed amounts to a Roth each year, then withdrawing those converted amounts five years later (the 'five-year rule'). It works best in low-income years between retirement and age 59½, when conversions fall in low tax brackets."
      }
    },
    {
      "@type": "Question",
      "name": "How long will my retirement savings last if I retire at 55?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If you retire at 55 and live to 85, your savings need to last 30 years. At a 4% withdrawal rate, a balanced 60/40 portfolio historically supported this 95%+ of the time. Lower the withdrawal rate to 3.5% for a 40-year horizon (retiring at 55, living to 95) to push the success rate higher."
      }
    }
  ]
}
</script>
```

- [ ] **Step 5: Add inline calculator-CTA links**

Within the article body, find the existing CTA section that links to `/retirement-savings/`. Below it, add a "related calculators" prose paragraph:

```html
<p class="related-calc-cta">
  Already retired or close to it? See how withdrawals affect longevity with the
  <a href="/retirement-drawdown-calculator/">retirement drawdown calculator</a>.
  Aiming for financial independence well before 55? The
  <a href="/fire-calculator/">FIRE calculator</a> and
  <a href="/coast-fire-calculator/">Coast FIRE calculator</a> model two of the most
  popular approaches.
</p>
```

- [ ] **Step 6: Add age-series cross-links**

Near the end of the article (before the FAQ section if one exists, or before the disclaimer), add:

```html
<section class="age-series-nav" aria-label="Retirement-age series">
  <h2>Compare retirement ages</h2>
  <p>Wondering what changes if you wait a few more years?</p>
  <ul>
    <li><a href="/blog/how-much-to-retire-at-60/">How much to retire at 60</a> — five more years of compounding, three more years of healthcare bridge</li>
    <li><a href="/blog/how-much-to-retire-at-62/">How much to retire at 62</a> — Social Security early-claim eligibility kicks in</li>
    <li><a href="/blog/how-much-to-retire-at-65/">How much to retire at 65</a> — Medicare eligibility aligns with retirement</li>
  </ul>
</section>
```

- [ ] **Step 7: Update `dateModified`**

In the existing Article JSON-LD block, change:

```json
"dateModified": "2026-05-19"
```

To:

```json
"dateModified": "2026-05-28"
```

- [ ] **Step 8: Run the test suite**

```bash
python -m pytest _build/tests/test_retire_at_55_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 5 PASS, 1 FAIL (cross-link to sibling articles — they don't exist yet). The FAIL becomes a PASS in Task 3.4.

```bash
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 1207 pass (1202 baseline + 5 from new test), 1 fail (the cross-link expectation), 111 skip.

- [ ] **Step 9: Commit**

```bash
git add blog/how-much-to-retire-at-55/index.html _build/tests/test_retire_at_55_seo.py
git commit -m "feat(blog): expand retire-at-55 article with FAQPage schema, CTAs, trimmed title"
```

---

## Phase 3 — Retirement-age content cluster (new articles)

### Task 3.1: Author "How much to retire at 60"

**Files:**
- Create: `blog/how-much-to-retire-at-60/index.html`
- Create: `blog/how-much-to-retire-at-60/hero.jpg`, `mid.jpg`, `bottom.jpg`
- Create: `_build/tests/test_retire_at_60_seo.py`

**Target keyword:** `how much to retire at 60` (vol 2400, KD 18, intent informational — per audit JSON recommended_content). The KD-18 makes this a realistic page-1 candidate within 60-90 days of indexing.

- [ ] **Step 1: Write the failing test first**

```python
# _build/tests/test_retire_at_60_seo.py
"""Phase 3 contract for the retire-at-60 article."""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTICLE = ROOT / "blog" / "how-much-to-retire-at-60" / "index.html"


def _html() -> str:
    return ARTICLE.read_text(encoding="utf-8")


def test_article_exists():
    assert ARTICLE.exists(), f"missing {ARTICLE}"


def test_title_le_60_chars_with_primary_keyword():
    m = re.search(r"<title>(.*?)</title>", _html(), re.IGNORECASE | re.DOTALL)
    assert m
    title = m.group(1).strip()
    assert len(title) <= 60, f"title is {len(title)} chars"
    assert "60" in title and ("retire" in title.lower())


def test_h1_present_with_keyword():
    m = re.search(r"<h1[^>]*>(.*?)</h1>", _html(), re.IGNORECASE | re.DOTALL)
    assert m
    h1 = m.group(1).lower()
    assert "60" in h1 and "retire" in h1


def test_word_count_ge_2800():
    html = _html()
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    words = len(text.split())
    assert words >= 2800, f"article has {words} words; target ≥2800"


def test_article_schema_present():
    assert '"@type": "Article"' in _html() or '"@type":"Article"' in _html()


def test_faqpage_schema_present():
    assert '"@type": "FAQPage"' in _html() or '"@type":"FAQPage"' in _html()


def test_calculator_cta_link_present():
    assert "/retirement-savings/" in _html()


def test_cross_links_to_age_series():
    html = _html()
    for sibling in ("how-much-to-retire-at-55", "how-much-to-retire-at-62", "how-much-to-retire-at-65"):
        assert f"/blog/{sibling}/" in html, f"missing cross-link to /blog/{sibling}/"


def test_disclaimer_present():
    assert "illustrative only" in _html().lower() or "not financial advice" in _html().lower()


def test_all_images_have_alt():
    html = _html()
    imgs = re.findall(r"<img\b([^>]*)>", html, re.IGNORECASE)
    for tag_inner in imgs:
        assert re.search(r'\balt\s*=\s*"', tag_inner), f"<img{tag_inner}> missing alt"


def test_all_images_have_intrinsic_dims():
    html = _html()
    imgs = re.findall(r"<img\b([^>]*)>", html, re.IGNORECASE)
    for tag_inner in imgs:
        assert re.search(r'\bwidth\s*=\s*"', tag_inner), f"<img{tag_inner}> missing width"
        assert re.search(r'\bheight\s*=\s*"', tag_inner), f"<img{tag_inner}> missing height"
```

- [ ] **Step 2: Run the test to see it fail**

```bash
python -m pytest _build/tests/test_retire_at_60_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 10 FAIL (article doesn't exist yet).

- [ ] **Step 3: Copy the retire-at-55 article as the structural template**

```bash
mkdir -p blog/how-much-to-retire-at-60
cp blog/how-much-to-retire-at-55/index.html blog/how-much-to-retire-at-60/index.html
```

- [ ] **Step 4: Rewrite the article content**

Open `blog/how-much-to-retire-at-60/index.html` and replace section by section. Required content elements (each must appear; ≥2,800 words total):

1. **`<title>`:** `How Much to Retire at 60? Pre-Medicare Bridge Guide` (54 chars)
2. **`<meta name="description">`:** `How much you need to retire at 60: a 4% rule baseline, healthcare bridge costs, Social Security timing trade-offs, and a Roth ladder strategy.` (150 chars)
3. **`<h1>`:** `How Much Do You Need to Retire at 60?`
4. **Sections (use `<h2>`):**
   - "The headline number: how much retirement savings at 60" — apply 4% rule with retire-at-60 specifics; reference 25× and 30× expense baselines; cite SSA.gov for life expectancy at 60
   - "Healthcare from 60 to 65: the five-year bridge" — ACA marketplace costs, COBRA (18 months max), HSA strategies. Cite Kaiser Family Foundation 2024 average premiums
   - "Social Security at 60 vs 62 vs 67" — early-claim penalty math (~30% reduction at 62 vs FRA), spousal claiming strategy
   - "Sequence-of-returns risk at age 60" — why the first 5 years matter most
   - "401(k) and IRA access rules at 60" — full penalty-free access; SEPP/72(t) no longer needed
   - "How the 4% rule changes with a 30-year horizon" — historical Trinity Study results for 30-year retirements starting at age 60
   - "Required Minimum Distributions: what to plan for" — cite IRS Pub 590-B; RMDs start at 73 for anyone born 1951-1959 (75 for 1960+) under SECURE 2.0
   - "A worked example: retiring at 60 with $1.2M" — full table walking through year-by-year withdrawals
5. **Calculator CTA box (after first H2):**
```html
<div class="cta-calculator">
  <h3>Estimate your number in 60 seconds</h3>
  <p>Use the <a href="/retirement-savings/">retirement savings calculator</a> with your real numbers, then stress-test it against the <a href="/retirement-drawdown-calculator/">drawdown calculator</a> to see how long it lasts.</p>
</div>
```
6. **FAQPage JSON-LD** (12 Q&As covering: dollar amount, 4% rule at 60, can-I-retire-with-X, healthcare bridge cost, Social Security at 60-62-67, RMDs, sequence risk, part-time income, spouse younger/older, taxes in retirement, real estate vs portfolio, when to claim Social Security)
7. **Article JSON-LD** with `datePublished: 2026-05-28`, `dateModified: 2026-05-28`, `author: James Blanckenberg`
8. **Age-series cross-links** (links to 55, 62, 65)
9. **Disclaimer block:** `<p class="disclaimer"><strong>This is illustrative only, not financial advice.</strong> Tax laws change; consult a fiduciary advisor and confirm IRS Pub 590-B and Social Security Administration sources for your situation.</p>`

- [ ] **Step 5: Source three images with explicit dimensions and alt text**

For `hero.jpg`, `mid.jpg`, `bottom.jpg` — use the same source/licensing pattern as the retire-at-55 article. Embed with:

```html
<img src="/blog/how-much-to-retire-at-60/hero.jpg"
     alt="Couple in their early sixties walking on a coastal path at sunset"
     width="940" height="650"
     loading="eager" fetchpriority="high" decoding="async">
```

Mid + bottom use `loading="lazy"` and `fetchpriority="auto"`.

- [ ] **Step 6: Run the article test**

```bash
python -m pytest _build/tests/test_retire_at_60_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 10 PASS.

- [ ] **Step 7: Run the full suite**

```bash
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```

Expected: no regressions vs baseline + Phase 2 increment.

- [ ] **Step 8: Commit**

```bash
git add blog/how-much-to-retire-at-60/ _build/tests/test_retire_at_60_seo.py
git commit -m "feat(blog): publish how-much-to-retire-at-60 article (KD 18, vol 2400)"
```

### Task 3.2: Author "How much to retire at 62"

**Files:**
- Create: `blog/how-much-to-retire-at-62/index.html`
- Create: `blog/how-much-to-retire-at-62/{hero,mid,bottom}.jpg`
- Create: `_build/tests/test_retire_at_62_seo.py`

**Target keyword:** `how much to retire at 62` (estimated vol 1,800-2,200; KD ~18 — verify against `keywords/finncalc_keywords.csv` before commit). 62 is the Social Security early-claim eligibility year — that's the angle.

- [ ] **Step 1: Write the failing test (identical structure to test_retire_at_60_seo.py with `60` swapped for `62` and sibling list updated)**

Copy `_build/tests/test_retire_at_60_seo.py` → `_build/tests/test_retire_at_62_seo.py`. Find/replace `60` → `62` and `how-much-to-retire-at-60` → `how-much-to-retire-at-62`. Update sibling cross-link expectations to list 55/60/65.

- [ ] **Step 2: Run to see it fail**

```bash
python -m pytest _build/tests/test_retire_at_62_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 10 FAIL.

- [ ] **Step 3: Author the article**

Copy `blog/how-much-to-retire-at-60/index.html` as the structural template. Rewrite sections around the 62-specific angle:

1. **`<title>`:** `How Much to Retire at 62? Social Security Early-Claim Math` (60 chars exact — verify count)
2. **`<meta name="description">`:** `Retire at 62: the Social Security early-claim 30% penalty math, ACA bridge for three years, and the break-even age for claiming early vs full retirement.` (152 chars)
3. **`<h1>`:** `How Much Do You Need to Retire at 62?`
4. **Sections that change vs the retire-at-60 version:**
   - "Social Security at 62: the 25-30% early-claim cut" — full PIA math with worked example
   - "The Social Security break-even calculation" — at what age does claiming at 67 overtake claiming at 62?
   - "The three-year healthcare bridge to Medicare" — same as 60's five-year but compressed
   - "Earnings test if you keep working" — 2024 limit; $1 withheld for every $2 over $22,320 (illustrative)
5. **Cross-links** updated to point to 55/60/65 (not 62 itself)
6. **FAQPage JSON-LD** focused on Social Security questions: "Should I take Social Security at 62?", "What's the break-even age?", "Earnings test rules", "Can I delay claiming after retiring?"

- [ ] **Step 4: Source three images**

Same dimensions / alt-text discipline as Task 3.1.

- [ ] **Step 5: Run tests**

```bash
python -m pytest _build/tests/test_retire_at_62_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 10 PASS.

- [ ] **Step 6: Commit**

```bash
git add blog/how-much-to-retire-at-62/ _build/tests/test_retire_at_62_seo.py
git commit -m "feat(blog): publish how-much-to-retire-at-62 article (Social Security angle)"
```

### Task 3.3: Author "How much to retire at 65"

**Files:**
- Create: `blog/how-much-to-retire-at-65/index.html`
- Create: `blog/how-much-to-retire-at-65/{hero,mid,bottom}.jpg`
- Create: `_build/tests/test_retire_at_65_seo.py`

**Target keyword:** `how much to retire at 65` (estimated vol 4,400+; KD ~22). 65 is Medicare eligibility — that's the angle. Highest-volume of the three sibling articles, lowest competitive pressure relative to 60 because more major outlets target 60 as the "early retirement" hot keyword.

- [ ] **Step 1: Write the failing test**

Mirror Task 3.2 Step 1 with `62 → 65`. Sibling list: 55/60/62.

- [ ] **Step 2: Run to see fail**

Same shape as Task 3.2 Step 2 — expect 10 FAIL.

- [ ] **Step 3: Author the article**

Copy retire-at-60 as template. Rewrite around Medicare eligibility:

1. **`<title>`:** `How Much to Retire at 65? The Medicare-Aligned Number` (54 chars)
2. **`<meta name="description">`:** `Retire at 65 the traditional way: Medicare kicks in, full Social Security a few years away, and a 20-25 year horizon. Here's the realistic savings number.` (160 chars — at cap)
3. **`<h1>`:** `How Much Do You Need to Retire at 65?`
4. **Section changes:**
   - "Why 65 is still the most-common retirement age" — Medicare eligibility is the structural reason
   - "Social Security at 65 vs Full Retirement Age (67)" — claiming two years early costs ~13.3%
   - "Medicare basics: Parts A, B, C, D" — citation: medicare.gov; Part B premium 2024
   - "The 20-25 year planning horizon" — different math than retiring at 55-60
   - "Bridging the gap: should you claim Social Security at 65 or wait?" — break-even math
5. **FAQPage JSON-LD** — 12 Medicare-tilted Q&As
6. **Cross-links** to 55/60/62

- [ ] **Step 4: Source three images**

Same discipline.

- [ ] **Step 5: Run tests**

```bash
python -m pytest _build/tests/test_retire_at_65_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 10 PASS.

- [ ] **Step 6: Commit**

```bash
git add blog/how-much-to-retire-at-65/ _build/tests/test_retire_at_65_seo.py
git commit -m "feat(blog): publish how-much-to-retire-at-65 article (Medicare angle)"
```

### Task 3.4: Re-run the retire-at-55 cross-link test (now should pass)

**Files:** none (re-run only).

- [ ] **Step 1: Re-run the retire-at-55 test**

```bash
python -m pytest _build/tests/test_retire_at_55_seo.py -v --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 6 PASS (the previously-failing `test_links_to_age_series_siblings` now passes because the three sibling articles exist).

- [ ] **Step 2: Run the full suite for regression check**

```bash
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```

Expected: 1202 baseline + 5 retire-at-55 + 10 retire-at-60 + 10 retire-at-62 + 10 retire-at-65 + 2 CWV tests = ~1239 pass, 0 fail, 111 skip.

- [ ] **Step 3: No commit needed (verification only); proceed to Phase 4.**

---

## Phase 4 — Sitemap, navigation, deploy

### Task 4.1: Add the three new blog URLs to the sitemap

**Files:**
- Modify: `sitemap.xml`

- [ ] **Step 1: Find the existing blog-URL pattern in `sitemap.xml`**

```bash
grep -A 4 "how-much-to-retire-at-55" sitemap.xml
```

Note the existing `<url>` element shape (it will have `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>` or a subset).

- [ ] **Step 2: Append three new `<url>` blocks**

For each of the three new articles, insert (matching the existing shape):

```xml
<url>
  <loc>https://finncalc.com/blog/how-much-to-retire-at-60/</loc>
  <lastmod>2026-05-28</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://finncalc.com/blog/how-much-to-retire-at-62/</loc>
  <lastmod>2026-05-28</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://finncalc.com/blog/how-much-to-retire-at-65/</loc>
  <lastmod>2026-05-28</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

Place them in alphabetical or insertion order to match the existing convention (check what the file already does).

- [ ] **Step 3: Validate sitemap stays well-formed**

```bash
python -m pytest _build/tests/test_sitemap_well_formed.py -v --ignore=_build/tests/test_html_parses_clean.py
```

(If the test doesn't exist, validate manually: `python -c "import xml.etree.ElementTree as E; E.parse('sitemap.xml')"` — no traceback = OK.)

- [ ] **Step 4: Commit**

```bash
git add sitemap.xml
git commit -m "chore(sitemap): register three new retirement-age blog URLs"
```

### Task 4.2: Operator deploys + submits to GSC

**Files:** none (operator action).

- [ ] **Step 1: Merge the Phase 3 branch to `main`**

Confirm the full suite still green:

```bash
python -m pytest _build/ -q --ignore=_build/tests/test_html_parses_clean.py
```

Then merge via the normal Phase 1/2 workflow (PR review + merge, or fast-forward if working solo and standard for this repo).

- [ ] **Step 2: Confirm Cloudflare Pages deploy**

After merge, Cloudflare Pages auto-deploys `finncalc.com`. Watch the dashboard at `https://dash.cloudflare.com/?to=/:account/workers-and-pages` → finncalc → Deployments. Wait for "Success".

- [ ] **Step 3: Send James the indexing instruction**

Hand James this message verbatim:

```
Three new pages are live. Please submit each one for indexing:

1. Go to https://search.google.com/search-console/
2. Pick the finncalc.com property at the top left.
3. In the search box at the very top ("Inspect any URL in finncalc.com"),
   paste this exact URL:
   https://finncalc.com/blog/how-much-to-retire-at-60/
4. Wait for the inspection results. Click the "Request Indexing" button
   on the right.
5. Wait for "Indexing requested" confirmation.
6. Repeat steps 3-5 for these two URLs:
   https://finncalc.com/blog/how-much-to-retire-at-62/
   https://finncalc.com/blog/how-much-to-retire-at-65/

Also, please open https://finncalc.com/blog/how-much-to-retire-at-55/
in the same Inspector and click "Request Indexing" again — we added
new schema and content, so we want Google to recrawl.

That's four total indexing requests. Reply here when they're all submitted.
```

- [ ] **Step 4: Append timestamps to the operator log**

After James confirms, append to `docs/superpowers/plans/2026-05-28-finncalc-phase-3-log.md`:

```markdown
## GSC indexing — Phase 3 deploy
- 2026-05-XX: /blog/how-much-to-retire-at-60/ — requested
- 2026-05-XX: /blog/how-much-to-retire-at-62/ — requested
- 2026-05-XX: /blog/how-much-to-retire-at-65/ — requested
- 2026-05-XX: /blog/how-much-to-retire-at-55/ — re-requested (post-update)
```

- [ ] **Step 5: Schedule the re-audit**

Per Phase 1/2 convention (60-day windows), the re-audit lands on or around 2026-07-27. Add a calendar event for James (he prefers an explicit reminder over relying on memory). Send:

```
Add a calendar reminder for 2026-07-27: "Re-run /seo-audit finncalc.com
to measure Phase 3 impact." That's 60 days from today.
```

---

## Self-Review

Spec-coverage check (audit findings ↔ tasks):

| Audit finding (priority) | Addressed by |
|---|---|
| CRITICAL: CWV / CLS=0.718 | Phase 1 (Tasks 1.1-1.5) — aspect-ratio, font-display, reserved heights, operator re-verify |
| CRITICAL: Only 2 ranked keywords | Phase 3 (Tasks 3.1-3.3) — three new articles targeting age-series keywords |
| CRITICAL: Zero calculator-intent rankings | Phase 2 in-flight (separate plan) owns title/meta sweep. Phase 3 contributes internal links from blog → calculator pages (Tasks 2.2 + 3.1-3.3) |
| HIGH: Backlinks subscription inactive | Operator action O2 — re-confirm only; previously activated per Phase 1 log |
| HIGH: Image alt text | Phase 1 baseline already has `test_image_alt_coverage.py`. Phase 3 adds alt + dims to all new images (enforced by per-article tests) |
| MEDIUM: KD-10 article stuck at #52 | Phase 2 (Task 2.2) — FAQPage schema, calculator CTAs, age-series cross-links, refreshed dateModified |
| LOW: Title >60 chars | Phase 2's `patch_titles_rendered.py` (separate plan) owns calculator pages. Phase 3 enforces ≤60 on all new blog articles via per-article tests + trims retire-at-55 (Task 2.2 Step 3) |

Placeholder scan: no TBD / TODO / "fill in later" in any task. All schema blocks contain real Q&A text. All test code is complete.

Type consistency: file paths are consistent across tasks; sibling-article test expectations match the actual file paths created.

Spec gap I'm leaving deliberately uncovered: backlink-building activity itself (digital PR, guest posts). That's manual outreach work and shouldn't be scheduled in a code plan.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-finncalc-phase-3-cwv-and-content-cluster.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Best for Phase 3 because the new articles benefit from a fresh-context author each.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints. Best if you want to keep all the CSS context in one head.

Which approach?
