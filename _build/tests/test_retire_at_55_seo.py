"""Assert the retire-at-55 article meets Phase 3 SEO requirements:
title <=60 chars, FAQPage schema present, internal links to retirement calculators.
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
