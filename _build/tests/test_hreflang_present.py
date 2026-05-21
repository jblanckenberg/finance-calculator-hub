"""Assert UK/US/ZA variant pages and country-themed blog posts declare the
correct hreflang link tags.

Backstop for `_build/scripts/inject_geo_targeting_rendered.py`. SEO Recovery
Plan §4.5 — explicit geo signals are the single highest-leverage Phase 1
ranking action.
"""
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]

# Locale-tagged variant pages (cluster siblings + standalone single-locale).
# Mirror of PAGES in _build/scripts/inject_geo_targeting_rendered.py.
LOCALE_PAGES: dict[str, list[str]] = {
    "en-GB": [
        # Variant calculator pages (cluster siblings)
        "compound-interest/uk/index.html",
        "inflation-impact/uk/index.html",
        "investment-growth/uk/index.html",
        "mortgage/uk/index.html",
        "retirement-savings/uk/index.html",
        "take-home-pay/uk/index.html",
        # Standalone single-locale UK calculators
        "isa-calculator/index.html",
        "stamp-duty-calculator/index.html",
        # UK-themed blog posts
        "blog/how-much-is-stamp-duty-uk/index.html",
        "blog/uk-national-insurance-explained/index.html",
        "blog/uk-personal-allowance-2024-25/index.html",
        "blog/uk-state-pension-guide/index.html",
    ],
    "en-US": [
        "compound-interest/us/index.html",
        "mortgage/us/index.html",
        "retirement-savings/us/index.html",
        "take-home-pay/us/index.html",
    ],
    "en-ZA": [
        # Variant calculator pages
        "take-home-pay/za/index.html",
        # Standalone single-locale ZA calculators
        "sa-tax-calculator/index.html",
        "tfsa-calculator/index.html",
        # SA-themed blog posts
        "blog/how-much-tax-on-r500000-south-africa/index.html",
        "blog/retirement-planning-south-africa/index.html",
        "blog/south-africa-tax-guide-2024/index.html",
        "blog/what-is-paye-south-africa/index.html",
    ],
}

HREFLANG = re.compile(
    r'<link\s+rel="alternate"\s+hreflang="([^"]+)"[^>]*href="([^"]+)"',
    re.IGNORECASE,
)


@pytest.mark.parametrize(
    ("locale", "rel"),
    [(locale, rel) for locale, rels in LOCALE_PAGES.items() for rel in rels],
    ids=[
        f"{locale}::{rel}"
        for locale, rels in LOCALE_PAGES.items()
        for rel in rels
    ],
)
def test_page_declares_own_hreflang(locale, rel):
    """Every locale-tagged page must declare its own hreflang link."""
    path = REPO / rel
    if not path.exists():
        pytest.skip(f"{rel} not present")
    text = path.read_text(encoding="utf-8")
    matches = HREFLANG.findall(text)
    own_locale = [m for m in matches if m[0] == locale]
    assert own_locale, (
        f"{rel} missing <link rel=alternate hreflang={locale}>"
    )


# Cluster pages must additionally declare x-default → parent.
CLUSTER_PAGES = [
    "compound-interest/uk/index.html",
    "compound-interest/us/index.html",
    "inflation-impact/uk/index.html",
    "investment-growth/uk/index.html",
    "mortgage/uk/index.html",
    "mortgage/us/index.html",
    "retirement-savings/uk/index.html",
    "retirement-savings/us/index.html",
    "take-home-pay/uk/index.html",
    "take-home-pay/us/index.html",
    "take-home-pay/za/index.html",
]


@pytest.mark.parametrize("rel", CLUSTER_PAGES)
def test_cluster_page_declares_x_default(rel):
    path = REPO / rel
    if not path.exists():
        pytest.skip(f"{rel} not present")
    text = path.read_text(encoding="utf-8")
    matches = HREFLANG.findall(text)
    x_default = [m for m in matches if m[0].lower() == "x-default"]
    assert x_default, f"{rel} missing <link rel=alternate hreflang=x-default>"


def test_head_meta_template_supports_hreflang():
    """Forward-compat: head_meta.html must consume hreflang_links context."""
    tpl = (REPO / "_build" / "templates" / "partials" / "head_meta.html").read_text(
        encoding="utf-8"
    )
    assert "hreflang_links" in tpl, "head_meta.html must reference hreflang_links"
    assert 'rel="alternate"' in tpl, "head_meta.html must emit alternate links"
