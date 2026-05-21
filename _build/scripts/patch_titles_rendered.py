"""Propagate trimmed titles from calculators.json + variants.json into
rendered <title>, og:title, twitter:title meta tags on every affected
index.html. Idempotent: re-running on a clean tree is a no-op.

Why this exists: operator policy forbids re-running `_build/generate.py`
(templates have drifted; rebuild churns dateModified + nav). So data-file
edits cannot reach the deployed site unless this script hand-edits the
rendered output directly. Same pattern as
`strip_duplicate_h1_rendered.py` and `inject_favicon_rendered.py`.

Source-of-truth precedence per rendered file:
1. calculators.json title (for `<slug>/index.html`)
2. variants.json title (for `<calc-slug>/<variant-slug>/index.html`)
3. EXTRA_TITLES hardcoded map below (blog posts, glossary, tax hub,
   personal-finance-calculators landing, etc. — pages without a
   data-file record)
"""
import json
import re
import sys
from html import escape
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

# Hardcoded titles for rendered pages that DON'T live in calculators.json /
# variants.json. Keys are repo-relative paths to an index.html. Values are
# the desired NEW <title> string (<=60 chars), unescaped (the patcher will
# html-escape ampersands etc. when writing into HTML).
EXTRA_TITLES: dict[str, str] = {
    # Top-level landing + hub pages
    "index.html": "Free Financial Calculators — USA, UK, South Africa",
    "personal-finance-calculators/index.html": "Personal Finance Calculators — USA, UK & SA",
    "mortgage-calculators/index.html": "Mortgage & Loan Calculators — USA, UK, SA",
    "tax/index.html": "Tax & Take-Home Pay Calculators — USA, UK, SA",
    "glossary/index.html": "Personal Finance Glossary — USA, UK, SA Terms",
    "take-home-pay-comparison/index.html": "Take-Home Pay Comparison: USA vs UK vs SA",

    # Additional calculator pages NOT in calculators.json
    "catch-up-contribution-calculator/index.html":
        "Catch-Up Contribution Calculator — 2026 401(k) & IRA",
    "dividend-reinvestment-calculator/index.html":
        "Dividend Reinvestment Calculator — DRIP Compounding",
    "retirement-drawdown-calculator/index.html":
        "Retirement Drawdown Calculator — How Long It Lasts",
    "savings-vs-investing-calculator/index.html":
        "Savings vs Investing Calculator — HYSA vs Index Fund",
    "social-security-break-even-calculator/index.html":
        "Social Security Break-Even — 62 vs 67 vs 70",

    # Author page
    "authors/james-blanckenberg/index.html":
        "James Blanckenberg — Founder & Editor, FinCalcHub",

    # Editorial / policy
    "editorial-policy/index.html":
        "Editorial Policy — Our Research & Review Process",

    # Comparison pages
    "compare/30-year-vs-15-year-mortgage/index.html":
        "30-Year vs 15-Year Mortgage: Which Saves More?",
    "compare/compound-interest-vs-simple-interest/index.html":
        "Compound vs Simple Interest: Which Grows Faster?",

    # Blog index + posts
    "blog/index.html":
        "Personal Finance Blog — Tips, Guides & Calculators",
    "blog/4-percent-rule-retirement/index.html":
        "4% Rule for Retirement — Does It Still Work?",
    "blog/401k-contribution-paycheck/index.html":
        "401(k) Contribution Per Paycheck — How to Decide",
    "blog/average-net-worth-by-age/index.html":
        "Average Net Worth by Age (USA, UK & SA)",
    "blog/build-wealth-in-your-30s/index.html":
        "How to Build Wealth in Your 30s — 7 Moves",
    "blog/compound-interest-explained/index.html":
        "Compound Interest Explained — How It Builds Wealth",
    "blog/debt-avalanche-vs-snowball/index.html":
        "Debt Avalanche vs Snowball — Which Pays Off Faster?",
    "blog/how-much-to-save-each-month/index.html":
        "How Much Should You Save Each Month? By Age",
    "blog/how-to-create-a-monthly-budget/index.html":
        "How to Create a Monthly Budget That Works",
    "blog/pay-off-credit-card-debt/index.html":
        "Pay Off Credit Card Debt Fast — Step-by-Step",
    "blog/salary-after-tax/index.html":
        "Salary After Tax — Take-Home Pay UK, US, SA",
    "blog/uk-state-pension-guide/index.html":
        "UK State Pension — How Much Will You Get?",
    "blog/what-is-401k-employer-match/index.html":
        "What Is 401(k) Employer Match? — Free Money Guide",
    "blog/what-is-paye-south-africa/index.html":
        "What Is PAYE? South Africa Tax Explained Simply",
}


def _load_json_titles() -> dict[str, str]:
    """Return {rendered_path: new_title} for every calculator + variant."""
    out: dict[str, str] = {}
    calcs_raw = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    if isinstance(calcs_raw, dict):
        for slug, entry in calcs_raw.items():
            if not isinstance(entry, dict):
                continue
            title = entry.get("title")
            if title:
                out[f"{slug}/index.html"] = title
    variants_raw = json.loads((DATA / "variants.json").read_text(encoding="utf-8"))
    if isinstance(variants_raw, dict):
        for calc_slug, variants in variants_raw.items():
            if not isinstance(variants, dict):
                continue
            for var_slug, entry in variants.items():
                if not isinstance(entry, dict):
                    continue
                title = entry.get("title")
                if title:
                    out[f"{calc_slug}/{var_slug}/index.html"] = title
    return out


def _build_map() -> dict[str, str]:
    """JSON map wins; EXTRA_TITLES fills in gaps without overriding."""
    m = dict(EXTRA_TITLES)
    m.update(_load_json_titles())
    return m


# Regex captures: prefix, attr value or inner text, suffix. We replace only
# the middle group, preserving surrounding quotes/whitespace and other
# attrs verbatim.
_TITLE_RE = re.compile(
    r"(<title[^>]*>)([^<]*)(</title>)",
    re.IGNORECASE,
)
_OG_TITLE_RE = re.compile(
    r'(<meta\s+property="og:title"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)
_TW_TITLE_RE = re.compile(
    r'(<meta\s+name="twitter:title"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)


def _patch_one(text: str, new_title: str) -> tuple[str, int]:
    """Replace <title>, og:title, twitter:title in `text`. Returns
    (new_text, replacements_made). Idempotent — already-correct tags are
    skipped."""
    # Inner <title> text is HTML-escaped (so `&` becomes `&amp;`).
    # og:title / twitter:title content="..." is also HTML-escaped because
    # we're inside an attribute.
    escaped = escape(new_title, quote=True)
    count = 0

    def _sub_title(m):
        nonlocal count
        if m.group(2) == escaped:
            return m.group(0)
        count += 1
        return f"{m.group(1)}{escaped}{m.group(3)}"

    def _sub_meta(m):
        nonlocal count
        if m.group(2) == escaped:
            return m.group(0)
        count += 1
        return f"{m.group(1)}{escaped}{m.group(3)}"

    text = _TITLE_RE.sub(_sub_title, text, count=1)
    text = _OG_TITLE_RE.sub(_sub_meta, text, count=1)
    text = _TW_TITLE_RE.sub(_sub_meta, text, count=1)
    return text, count


def iter_targets() -> dict[str, str]:
    return _build_map()


def main() -> int:
    title_map = iter_targets()
    missing: list[str] = []
    changed_files: list[tuple[str, int]] = []
    total = 0

    for rel, new_title in sorted(title_map.items()):
        page = REPO / rel
        if not page.exists():
            missing.append(rel)
            continue
        # Skip excluded dirs as a belt-and-braces guard.
        if any(part in EXCLUDE_DIRS for part in page.relative_to(REPO).parts):
            continue
        text = page.read_text(encoding="utf-8")
        new_text, n = _patch_one(text, new_title)
        if n:
            page.write_text(new_text, encoding="utf-8")
            changed_files.append((rel, n))
            total += n

    if changed_files:
        print(f"Updated titles in {len(changed_files)} rendered pages "
              f"({total} tag replacements):")
        for rel, n in changed_files:
            print(f"  - {rel} ({n})")
    else:
        print("No rendered titles needed changes. Tree is clean.")

    if missing:
        print(f"\nWarning: {len(missing)} mapped paths did not exist:")
        for rel in missing:
            print(f"  ! {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
