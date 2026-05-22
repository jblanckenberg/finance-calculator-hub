"""Run html5lib-tolerant parser over rendered pages and surface errors.

Uses html5lib (already in requirements) to mimic browser-like parsing and report
all parse errors per file. Targets the 17 pages flagged by the 2026-05-21 audit
plus optionally all rendered pages (--all).
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
            print(f"\n{page} - {len(errors)} parse errors:")
            for err in errors[:5]:
                print(f"  {err}")
            if len(errors) > 5:
                print(f"  ... +{len(errors) - 5} more")
    return overall


if __name__ == "__main__":
    sys.exit(main())
