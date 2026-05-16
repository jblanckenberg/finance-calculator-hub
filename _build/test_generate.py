import json
from pathlib import Path
import pytest

from generate import (
    Renderer,
    build_web_application_ld,
    build_breadcrumb_ld,
    build_faq_ld,
    paragraphs_from,
    is_operator_stub,
)

ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT / "fixtures"

@pytest.fixture
def renderer():
    return Renderer(template_dir=ROOT / "templates")

def test_paragraphs_from_splits_double_newline():
    assert paragraphs_from("a\n\nb\n\nc") == ["a", "b", "c"]

def test_is_operator_stub_recognises_marker():
    assert is_operator_stub("[OPERATOR_TO_FILL: x]")
    assert not is_operator_stub("Real intro paragraph...")

def test_build_web_application_ld_for_calc():
    ld = build_web_application_ld(
        slug="compound-interest",
        name="Compound Interest Calculator",
        description="x" * 60,
        parent_slug=None,
    )
    assert ld["@type"] == "WebApplication"
    assert ld["url"] == "https://finncalc.com/compound-interest/"
    assert "isPartOf" not in ld

def test_build_web_application_ld_for_variant_includes_isPartOf():
    ld = build_web_application_ld(
        slug="uk",
        name="Compound Interest UK",
        description="x" * 60,
        parent_slug="compound-interest",
    )
    assert ld["url"] == "https://finncalc.com/compound-interest/uk/"
    assert ld["isPartOf"] == {
        "@type": "WebApplication",
        "@id": "https://finncalc.com/compound-interest/",
    }

def test_breadcrumb_ld_two_levels_for_calc():
    ld = build_breadcrumb_ld(
        items=[
            ("Home", "https://finncalc.com/"),
            ("Compound Interest", "https://finncalc.com/compound-interest/"),
        ],
    )
    assert ld["@type"] == "BreadcrumbList"
    assert len(ld["itemListElement"]) == 2

def test_faq_ld_emits_question_answer_pairs():
    ld = build_faq_ld([{"q": "What?", "a": "Stuff."}])
    assert ld["@type"] == "FAQPage"
    assert ld["mainEntity"][0]["name"] == "What?"

def test_render_calculator_page_uses_min_fixture(renderer, tmp_path):
    calcs = json.loads((FIXTURES / "calculators_min.json").read_text(encoding="utf-8"))
    out = renderer.render_calculator(slug="compound-interest", data=calcs["compound-interest"], body_html="<div>BODY</div>")
    assert "<title>" in out
    assert "Compound Interest Calculator" in out
    assert "<div>BODY</div>" in out
    assert "© " in out

def test_render_variant_page_with_stub_marks_robots_noindex(renderer):
    calcs = json.loads((FIXTURES / "calculators_min.json").read_text(encoding="utf-8"))
    variants = json.loads((FIXTURES / "variants_min.json").read_text(encoding="utf-8"))
    out = renderer.render_variant(
        parent_slug="compound-interest",
        parent_data=calcs["compound-interest"],
        variant_data=variants["compound-interest"]["uk"],
        body_html="<div>BODY</div>",
    )
    assert 'name="robots" content="noindex' in out
    assert "operator-todo" in out
    assert "OPERATOR_TO_FILL" in out
