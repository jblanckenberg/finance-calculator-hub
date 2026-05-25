"""Assert each page renders the correct per-region `og:locale` meta tag.

Backstop for the og:locale patching in
`_build/scripts/inject_geo_targeting_rendered.py` (Phase 6). The head_meta
partial hardcodes `en_US`; the injector overwrites it per page so UK pages
declare `en_GB` and SA pages declare `en_ZA`. og:locale uses underscores
(`en_GB`), not the hyphenated BCP-47 form used by hreflang.
"""
import json
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]

OG_LOCALE = re.compile(
    r'<meta\s+property="og:locale"\s+content="([^"]+)"',
    re.IGNORECASE,
)

# UK-only and SA-only calculator slugs (regions == ["UK"] / ["SA"] in
# calculators.json). These are the pages whose og:locale must NOT be the
# default en_US.
UK_ONLY_SLUGS = [
    "isa-calculator",
    "mortgage-overpayment-calculator",
    "mortgage-repayment-calculator",
    "pension-calculator-uk",
    "stamp-duty-calculator",
]
SA_ONLY_SLUGS = [
    "paye-calculator",
    "tfsa-calculator",
    "sa-tax-calculator",
]
# US / multi-region calculators keep the default en_US.
US_OR_MULTI_SLUGS = [
    "dividend-calculator",
    "fire-calculator",
    "401k-calculator",
    "refinance-calculator",
    "simple-interest-calculator",
]


def _og_locale_of(rel: str) -> str | None:
    path = REPO / rel
    if not path.exists():
        return "__MISSING__"
    m = OG_LOCALE.search(path.read_text(encoding="utf-8"))
    return m.group(1) if m else None


@pytest.mark.parametrize("slug", UK_ONLY_SLUGS)
def test_uk_only_slug_is_en_GB(slug):
    val = _og_locale_of(f"{slug}/index.html")
    if val == "__MISSING__":
        pytest.skip(f"{slug} not present")
    assert val == "en_GB", f"{slug} og:locale should be en_GB, got {val!r}"


@pytest.mark.parametrize("slug", SA_ONLY_SLUGS)
def test_sa_only_slug_is_en_ZA(slug):
    val = _og_locale_of(f"{slug}/index.html")
    if val == "__MISSING__":
        pytest.skip(f"{slug} not present")
    assert val == "en_ZA", f"{slug} og:locale should be en_ZA, got {val!r}"


@pytest.mark.parametrize("slug", US_OR_MULTI_SLUGS)
def test_us_or_multi_region_slug_is_en_US(slug):
    val = _og_locale_of(f"{slug}/index.html")
    if val == "__MISSING__":
        pytest.skip(f"{slug} not present")
    assert val == "en_US", f"{slug} og:locale should be en_US, got {val!r}"


def test_uk_cluster_variant_is_en_GB():
    """A cluster /uk/ variant page declares en_GB (overrides template default)."""
    val = _og_locale_of("take-home-pay/uk/index.html")
    if val == "__MISSING__":
        pytest.skip("take-home-pay/uk not present")
    assert val == "en_GB", f"take-home-pay/uk og:locale should be en_GB, got {val!r}"


def test_za_cluster_variant_is_en_ZA():
    val = _og_locale_of("take-home-pay/za/index.html")
    if val == "__MISSING__":
        pytest.skip("take-home-pay/za not present")
    assert val == "en_ZA", f"take-home-pay/za og:locale should be en_ZA, got {val!r}"


def test_no_calculator_page_missing_og_locale():
    """Every top-level calculator page that ships an OG block declares an
    og:locale. (Minimal /embed/ widget pages have no OG block at all and are
    intentionally excluded.)"""
    calc_data = json.loads(
        (REPO / "_build" / "data" / "calculators.json").read_text(encoding="utf-8")
    )
    missing = []
    for slug in calc_data:
        path = REPO / slug / "index.html"
        if not path.exists():
            continue
        html = path.read_text(encoding="utf-8")
        if 'property="og:title"' not in html:
            continue  # no OG block on this layout
        if not OG_LOCALE.search(html):
            missing.append(slug)
    assert not missing, f"calculator pages missing og:locale: {missing}"


def test_og_locale_uses_underscore_not_hyphen():
    """og:locale must use the underscore form (en_GB) not BCP-47 (en-GB)."""
    val = _og_locale_of("pension-calculator-uk/index.html")
    if val in (None, "__MISSING__"):
        pytest.skip("pension-calculator-uk not present / no tag")
    assert "_" in val and "-" not in val, (
        f"og:locale must use underscore form, got {val!r}"
    )
