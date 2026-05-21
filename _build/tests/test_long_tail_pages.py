"""Assert each Phase 2 long-tail page exists with required schemas + content sections."""
import json
import re
from pathlib import Path
import pytest

REPO = Path(__file__).resolve().parents[2]

# Phase 2 long-tail pages — populated as each ships.
LONG_TAIL_PAGES = {
    "mortgage/with-tax-and-insurance/index.html": {
        "h1": "UK Mortgage Calculator with Tax",
        "title_contains": "Tax & Insurance",
        "hreflang": "en-GB",
        "area_served": "United Kingdom",
        "schema_types": ["WebApplication", "BreadcrumbList", "Person", "FAQPage", "HowTo"],
        "min_word_count": 1500,
    },
    "retirement-savings/retire-at-55/index.html": {
        "h1": "How Much Do I Need to Retire at 55",
        "title_contains": "Retire at 55",
        "hreflang": "en-GB",
        "area_served": "United Kingdom",
        "schema_types": ["WebApplication", "BreadcrumbList", "Person", "FAQPage", "HowTo"],
        "min_word_count": 1500,
    },
}

JSON_LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.IGNORECASE | re.DOTALL)


@pytest.mark.parametrize("rel,spec", LONG_TAIL_PAGES.items(), ids=lambda x: x if isinstance(x, str) else None)
def test_page_meets_long_tail_spec(rel, spec):
    path = REPO / rel
    assert path.exists(), f"{rel} does not exist"
    text = path.read_text(encoding="utf-8")
    # H1 substring
    assert f"<h1>{spec['h1']}" in text or f"<h1 " in text and spec['h1'] in text, f"H1 missing/wrong in {rel}"
    # Title contains expected fragment
    assert spec["title_contains"] in text, f"<title> missing '{spec['title_contains']}' in {rel}"
    # hreflang declared
    assert f'hreflang="{spec["hreflang"]}"' in text, f"hreflang {spec['hreflang']} missing in {rel}"
    # areaServed Country in some JSON-LD block
    found_area_served = False
    found_schema_types = set()
    for match in JSON_LD.finditer(text):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            found_schema_types.add(item.get("@type", ""))
            area = item.get("areaServed")
            if isinstance(area, dict) and area.get("name") == spec["area_served"]:
                found_area_served = True
    assert found_area_served, f"areaServed='{spec['area_served']}' not found in any JSON-LD block of {rel}"
    missing_types = set(spec["schema_types"]) - found_schema_types
    assert not missing_types, f"{rel} missing schema types: {missing_types}"
    # Word count of visible body text
    body_match = re.search(r'<body[^>]*>(.*?)</body>', text, re.DOTALL)
    assert body_match, f"No <body> in {rel}"
    body_text = re.sub(r'<[^>]+>', ' ', body_match.group(1))
    word_count = len(body_text.split())
    assert word_count >= spec["min_word_count"], f"{rel} word count {word_count} < {spec['min_word_count']}"
