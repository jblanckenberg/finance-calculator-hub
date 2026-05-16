"""Tests for the comparison page renderer (generate_comparisons.py)."""
from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest

# _build/conftest.py inserts _build/ onto sys.path, so this import resolves.
from generate_comparisons import (
    build_article_ld,
    build_breadcrumb_ld,
    build_faq_ld,
    load_author,
    load_data,
    load_schema,
    render_all,
    render_one,
)

BUILD_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BUILD_DIR / "data" / "comparisons.json"
SCHEMA_FILE = BUILD_DIR / "schemas" / "comparison.schema.json"


def test_comparisons_data_validates_against_schema():
    data = load_data()
    schema = load_schema()
    assert "comparisons" in data
    assert len(data["comparisons"]) >= 4
    for c in data["comparisons"]:
        jsonschema.validate(instance=c, schema=schema)


def test_render_compound_interest_vs_simple_interest_emits_all_jsonld_and_embed(tmp_path):
    data = load_data()
    author = load_author()
    target = next(c for c in data["comparisons"] if c["slug"] == "compound-interest-vs-simple-interest")
    html = render_one(target, author)
    # Article JSON-LD
    assert '"@type": "Article"' in html
    assert '"datePublished": "2026-05-16"' in html
    assert author["name"] in html
    # FAQ JSON-LD
    assert '"@type": "FAQPage"' in html
    # Breadcrumb JSON-LD
    assert '"@type": "BreadcrumbList"' in html
    # Embed partial (iframe mode)
    assert 'data-comparison-embed="compound-interest"' in html
    assert 'src="/embed/compound-interest/"' in html
    # Canonical + meta come from _base.html partials
    assert '<link rel="canonical" href="https://finncalc.com/compare/compound-interest-vs-simple-interest/">' in html
    # FAQ items rendered in body
    assert "Is compound interest always better than simple interest?" in html


def test_render_30_year_vs_15_year_mortgage_iframe_embed_present():
    data = load_data()
    author = load_author()
    target = next(c for c in data["comparisons"] if c["slug"] == "30-year-vs-15-year-mortgage")
    html = render_one(target, author)
    assert '"@type": "Article"' in html
    assert '"@type": "FAQPage"' in html
    assert '"@type": "BreadcrumbList"' in html
    assert 'data-comparison-embed="mortgage"' in html
    assert 'src="/embed/mortgage/"' in html


def test_render_draft_uses_link_embed_not_iframe():
    data = load_data()
    author = load_author()
    target = next(c for c in data["comparisons"] if c["slug"] == "roth-ira-vs-traditional-ira")
    html = render_one(target, author)
    assert 'data-comparison-embed="roth-ira-calculator"' in html
    # Link mode = no iframe; uses btn-calc anchor
    assert 'src="/embed/' not in html
    assert 'btn-calc' in html
    # Draft pages are noindex
    assert 'content="noindex, follow"' in html


def test_render_all_dry_run_writes_nothing(tmp_path, monkeypatch):
    # Redirect ROOT_DIR so any accidental write would go to a sandbox we can inspect.
    import generate_comparisons as gc
    monkeypatch.setattr(gc, "ROOT_DIR", tmp_path)
    files = gc.render_all(apply=False, root=tmp_path)
    assert files == []
    assert not (tmp_path / "compare").exists()


def test_render_all_apply_writes_only_published_by_default(tmp_path, monkeypatch):
    import generate_comparisons as gc
    monkeypatch.setattr(gc, "ROOT_DIR", tmp_path)
    files = gc.render_all(apply=True, root=tmp_path)
    assert len(files) == 2
    slugs = {f.parent.name for f in files}
    assert slugs == {"compound-interest-vs-simple-interest", "30-year-vs-15-year-mortgage"}
    for f in files:
        assert f.exists()
        body = f.read_text(encoding="utf-8")
        assert '"@type": "Article"' in body
