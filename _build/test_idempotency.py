import json
from pathlib import Path

from generate import Renderer

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent

def _renderer():
    return Renderer(template_dir=ROOT / "templates")

def _render_compound_interest():
    calcs = json.loads((ROOT / "data" / "calculators.json").read_text(encoding="utf-8"))
    body = (ROOT / "bodies" / "compound-interest.html").read_text(encoding="utf-8")
    return _renderer().render_calculator(slug="compound-interest", data=calcs["compound-interest"], body_html=body)

def test_render_includes_compound_interest_title():
    out = _render_compound_interest()
    assert "Compound Interest Calculator (Daily, Monthly, Yearly) | FinCalcHub" in out

def test_render_includes_canonical_url():
    out = _render_compound_interest()
    assert '<link rel="canonical" href="https://finncalc.com/compound-interest/">' in out

def test_render_includes_plausible_script():
    out = _render_compound_interest()
    assert 'data-domain="finncalc.com"' in out

def test_render_includes_clarity_script():
    out = _render_compound_interest()
    assert "clarity.ms/tag" in out

def test_render_includes_cross_link_to_buscalctools():
    out = _render_compound_interest()
    assert "buscalctools.com" in out

def test_render_preserves_calculator_form_inputs():
    out = _render_compound_interest()
    assert 'id="principal"' in out
    assert 'id="rate"' in out
    assert 'id="years"' in out

def test_render_includes_breadcrumb_jsonld():
    out = _render_compound_interest()
    assert '"@type": "BreadcrumbList"' in out or '"@type":"BreadcrumbList"' in out

def test_render_emits_single_web_application_ld():
    out = _render_compound_interest()
    assert out.count('"@type": "WebApplication"') + out.count('"@type":"WebApplication"') == 1

def test_render_includes_current_year_in_footer():
    import datetime as dt
    out = _render_compound_interest()
    assert f"© {dt.date.today().year} FinCalcHub" in out
