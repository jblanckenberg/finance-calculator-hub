"""Assert every calculator + variant rendered page has a Related Calculators
block with exactly 6 links.

Source of truth: `_build/data/calculators.json[<slug>].related`. Variant
pages inherit their parent calculator's `related` array. Both are patched
into the rendered HTML by `_build/scripts/inject_related_calculators_rendered.py`.
"""
import json
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"

with (DATA / "calculators.json").open(encoding="utf-8") as f:
    CALCULATORS = json.load(f)
with (DATA / "variants.json").open(encoding="utf-8") as f:
    VARIANTS = json.load(f)

# Calculator pages: <slug>/index.html
CALC_PAGES: list[Path] = sorted(
    REPO / slug / "index.html"
    for slug in CALCULATORS
    if (REPO / slug / "index.html").exists()
)

# Variant pages: <parent_slug>/<variant_slug>/index.html
VARIANT_PAGES: list[Path] = sorted(
    REPO / parent / variant / "index.html"
    for parent, variant_map in VARIANTS.items()
    for variant in variant_map
    if (REPO / parent / variant / "index.html").exists()
)

RELATED_BLOCK = re.compile(
    r'<section[^>]*class="related-calculators"[^>]*>.*?</section>',
    re.IGNORECASE | re.DOTALL,
)
LIST_ITEM = re.compile(r'<li[^>]*>.*?</li>', re.IGNORECASE | re.DOTALL)
HREF = re.compile(r'href="(/[a-z0-9-]+/)"', re.IGNORECASE)


def _all_calc_slugs() -> set[str]:
    return set(CALCULATORS.keys())


def test_calculator_pages_exist():
    """Sanity: every calculator slug has a rendered page."""
    missing = [slug for slug in CALCULATORS if not (REPO / slug / "index.html").exists()]
    assert not missing, f"Missing rendered pages for: {missing}"
    assert len(CALC_PAGES) == 19, f"Expected 19 calculator pages, found {len(CALC_PAGES)}"


def test_variant_pages_exist():
    """Sanity: every variant entry has a rendered page."""
    expected = sum(len(vmap) for vmap in VARIANTS.values())
    assert len(VARIANT_PAGES) == expected, (
        f"Expected {expected} variant pages, found {len(VARIANT_PAGES)}"
    )


def test_every_calculator_has_related_array():
    """Source-of-truth check: every calculator entry has exactly 6 valid
    related slugs."""
    all_slugs = _all_calc_slugs()
    for slug, calc in CALCULATORS.items():
        related = calc.get("related")
        assert isinstance(related, list), f"{slug}: missing or non-list `related`"
        assert len(related) == 6, f"{slug}: {len(related)} related slugs (expected 6)"
        assert len(set(related)) == 6, f"{slug}: duplicate related slugs"
        assert slug not in related, f"{slug}: self-reference in related"
        for rel in related:
            assert rel in all_slugs, f"{slug}: unknown related slug {rel!r}"


@pytest.mark.parametrize("page", CALC_PAGES, ids=lambda p: p.relative_to(REPO).as_posix())
def test_calculator_has_related_block(page: Path):
    text = page.read_text(encoding="utf-8")
    match = RELATED_BLOCK.search(text)
    assert match, f"{page.relative_to(REPO)} missing <section class='related-calculators'>"
    items = LIST_ITEM.findall(match.group(0))
    assert len(items) == 6, (
        f"{page.relative_to(REPO)} has {len(items)} related links, expected exactly 6"
    )
    # Every <li> should link to a different calculator slug.
    hrefs = HREF.findall(match.group(0))
    assert len(hrefs) == 6, f"{page.relative_to(REPO)} <a href> count = {len(hrefs)} (expected 6)"
    assert len(set(hrefs)) == 6, f"{page.relative_to(REPO)} duplicate hrefs in block"
    # Page should not self-link.
    slug = page.relative_to(REPO).parent.as_posix()
    assert f"/{slug}/" not in hrefs, f"{page.relative_to(REPO)} self-links to itself"


@pytest.mark.parametrize("page", VARIANT_PAGES, ids=lambda p: p.relative_to(REPO).as_posix())
def test_variant_has_related_block(page: Path):
    text = page.read_text(encoding="utf-8")
    match = RELATED_BLOCK.search(text)
    assert match, f"{page.relative_to(REPO)} missing <section class='related-calculators'>"
    items = LIST_ITEM.findall(match.group(0))
    assert len(items) == 6, (
        f"{page.relative_to(REPO)} has {len(items)} related links, expected exactly 6"
    )
    hrefs = HREF.findall(match.group(0))
    assert len(hrefs) == 6
    assert len(set(hrefs)) == 6
    # Variants should inherit parent's relations; parent should not appear
    # (a variant page is itself a child of the parent, so linking back to
    # the parent's own calculator page is fine — but the variant must not
    # appear in the variant's own related list, since the related slugs are
    # parent's relations, not the variant's parent).
    # Note: we don't currently exclude the parent slug, since the parent's
    # related array doesn't include itself. So no extra assertion needed.


@pytest.mark.parametrize("page", CALC_PAGES, ids=lambda p: p.relative_to(REPO).as_posix())
def test_calculator_related_block_inside_main(page: Path):
    """The related block must sit inside <main id="content">…</main>."""
    text = page.read_text(encoding="utf-8")
    main_open = text.find('<main id="content">')
    main_close = text.find('</main>', main_open + 1)
    assert main_open != -1, f"{page.relative_to(REPO)} has no <main id='content'>"
    assert main_close != -1, f"{page.relative_to(REPO)} has no </main>"
    block_match = RELATED_BLOCK.search(text)
    assert block_match
    assert main_open < block_match.start() < main_close, (
        f"{page.relative_to(REPO)} related block is outside <main>"
    )
