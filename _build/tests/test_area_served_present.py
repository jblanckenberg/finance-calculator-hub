"""Assert UK/US/ZA variant pages and country-themed blog posts carry an
explicit `areaServed: Country` property on their primary JSON-LD block.

Backstop for `_build/scripts/inject_geo_targeting_rendered.py`. SEO Recovery
Plan §4.5 — areaServed tells Google the page is targeted at a specific
country, complementing hreflang's "show this to en-GB users" signal with
"this calculator/article serves the UK market" semantically.
"""
import json
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]

# Country name per locale. Mirror of COUNTRY_NAME in the patcher.
COUNTRY_NAME = {
    "en-GB": "United Kingdom",
    "en-US": "United States",
    "en-ZA": "South Africa",
}

# rel_path -> (locale, schema_type)
PAGES: dict[str, tuple[str, str]] = {
    # Variant calculator pages — WebApplication
    "compound-interest/uk/index.html": ("en-GB", "WebApplication"),
    "compound-interest/us/index.html": ("en-US", "WebApplication"),
    "inflation-impact/uk/index.html": ("en-GB", "WebApplication"),
    "investment-growth/uk/index.html": ("en-GB", "WebApplication"),
    "mortgage/uk/index.html": ("en-GB", "WebApplication"),
    "mortgage/us/index.html": ("en-US", "WebApplication"),
    "retirement-savings/uk/index.html": ("en-GB", "WebApplication"),
    "retirement-savings/us/index.html": ("en-US", "WebApplication"),
    "take-home-pay/uk/index.html": ("en-GB", "WebApplication"),
    "take-home-pay/us/index.html": ("en-US", "WebApplication"),
    "take-home-pay/za/index.html": ("en-ZA", "WebApplication"),
    # Standalone single-locale calculators — WebApplication
    "isa-calculator/index.html": ("en-GB", "WebApplication"),
    "sa-tax-calculator/index.html": ("en-ZA", "WebApplication"),
    "stamp-duty-calculator/index.html": ("en-GB", "WebApplication"),
    "tfsa-calculator/index.html": ("en-ZA", "WebApplication"),
    # Country-themed blog posts — Article
    "blog/how-much-is-stamp-duty-uk/index.html": ("en-GB", "Article"),
    "blog/uk-national-insurance-explained/index.html": ("en-GB", "Article"),
    "blog/uk-personal-allowance-2024-25/index.html": ("en-GB", "Article"),
    "blog/uk-state-pension-guide/index.html": ("en-GB", "Article"),
    "blog/how-much-tax-on-r500000-south-africa/index.html": ("en-ZA", "Article"),
    "blog/retirement-planning-south-africa/index.html": ("en-ZA", "Article"),
    "blog/south-africa-tax-guide-2024/index.html": ("en-ZA", "Article"),
    "blog/what-is-paye-south-africa/index.html": ("en-ZA", "Article"),
}

JSON_LD_BLOCK = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)


@pytest.mark.parametrize(
    ("rel", "locale", "schema_type"),
    [(rel, loc, st) for rel, (loc, st) in PAGES.items()],
    ids=list(PAGES.keys()),
)
def test_page_has_area_served(rel, locale, schema_type):
    path = REPO / rel
    if not path.exists():
        pytest.skip(f"{rel} not present")
    text = path.read_text(encoding="utf-8")
    expected = COUNTRY_NAME[locale]
    for match in JSON_LD_BLOCK.finditer(text):
        try:
            obj = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        if obj.get("@type") != schema_type:
            continue
        area = obj.get("areaServed")
        assert isinstance(area, dict), (
            f"{rel}: {schema_type} block has no areaServed dict"
        )
        assert area.get("@type") == "Country", (
            f"{rel}: areaServed @type must be Country, got {area!r}"
        )
        assert area.get("name") == expected, (
            f"{rel}: areaServed.name must be {expected!r}, got {area.get('name')!r}"
        )
        return
    pytest.fail(f"{rel}: no {schema_type} JSON-LD block found")
