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
    assert words >= 2800, f"article has {words} words; target >=2800"


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
