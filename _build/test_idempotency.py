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

def test_render_includes_og_image_meta():
    out = _render_compound_interest()
    assert 'property="og:image" content="https://finncalc.com/og-image.png"' in out
    assert 'property="og:image:width" content="1200"' in out

def test_render_includes_twitter_card_meta():
    out = _render_compound_interest()
    assert 'name="twitter:card" content="summary_large_image"' in out

def test_render_includes_adsense_lazy_loader():
    out = _render_compound_interest()
    assert "adsbygoogle.js" in out
    assert "IntersectionObserver" in out


def test_render_emits_four_adsbygoogle_ins_blocks():
    """FC Task 1.3 — four manual AdSense placements: top, results, edu, footer.

    Confirms every calc page renders all four <ins class="adsbygoogle">
    blocks (one per slot) so AdSense fills them based on consent state."""
    out = _render_compound_interest()
    assert out.count('class="adsbygoogle"') == 4


def test_render_includes_each_adsense_slot_id_once():
    """Each of the four slot IDs must appear exactly once per page so we
    don't accidentally double-render a slot via overlapping template paths."""
    out = _render_compound_interest()
    for slot_id in ("4461919959", "7963163804", "1620134192", "5980987973"):
        assert out.count(f'data-ad-slot="{slot_id}"') == 1, f"slot {slot_id} not rendered exactly once"


def test_render_includes_adsense_client_id():
    out = _render_compound_interest()
    assert 'data-ad-client="ca-pub-5092336325075679"' in out


def test_render_footer_slot_is_desktop_only():
    """Footer leaderboard must be wrapped in the hidden-on-mobile container
    so we don't violate AdSense policy on mobile (no anchor-style sticky)."""
    out = _render_compound_interest()
    assert "ad-footer-desktop" in out
    assert "@media (min-width: 768px)" in out
