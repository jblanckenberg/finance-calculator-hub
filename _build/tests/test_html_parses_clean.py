import pytest
from pathlib import Path
import html5lib

REPO = Path(__file__).resolve().parents[2]

PAGES = [
    # same list as AUDIT_PAGES in validate_html.py
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
        pytest.skip(f"{rel} not yet built")
    parser = html5lib.HTMLParser(strict=False)
    parser.parse(path.read_text(encoding="utf-8"))
    errors = list(parser.errors)
    assert not errors, f"{rel} has {len(errors)} parse errors: {errors[:3]}"
