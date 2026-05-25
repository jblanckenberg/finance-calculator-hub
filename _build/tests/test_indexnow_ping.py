"""Tests for scripts/indexnow_ping.py path-to-URL filtering.

The --all walk must never submit non-public URLs: build sources under
_build/, tooling/deps dirs, or noindex embed/* widgets.
"""
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "scripts" / "indexnow_ping.py"

spec = importlib.util.spec_from_file_location("indexnow_ping", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_build_sources_excluded():
    """_build/ Jinja sources are not deployed — must return None."""
    assert mod.path_to_url("_build/bodies/dividend-calculator.html") is None
    assert mod.path_to_url("_build/templates/calculator.html") is None
    assert mod.path_to_url("_build/templates/partials/head_meta.html") is None


def test_embed_widgets_excluded():
    """embed/* are noindex,nofollow — must not be submitted to IndexNow."""
    assert mod.path_to_url("embed/mortgage/index.html") is None
    assert mod.path_to_url("embed/compound-interest/index.html") is None


def test_tooling_dirs_excluded():
    assert mod.path_to_url("scripts/indexnow_ping.py") is None
    assert mod.path_to_url("docs/superpowers/plans/x.html") is None
    assert mod.path_to_url("node_modules/pkg/readme.html") is None


def test_public_calc_pages_included():
    """Real public calc pages must still convert to canonical URLs."""
    assert mod.path_to_url("dividend-calculator/index.html") == "https://finncalc.com/dividend-calculator/"
    assert mod.path_to_url("refinance-calculator/index.html") == "https://finncalc.com/refinance-calculator/"
    assert mod.path_to_url("index.html") == "https://finncalc.com/"
    # Backslash paths (Windows git diff) normalise correctly.
    assert mod.path_to_url("paye-calculator\\index.html") == "https://finncalc.com/paye-calculator/"


def test_blog_and_compare_pages_included():
    assert mod.path_to_url("blog/how-much-to-retire-at-55/index.html") == "https://finncalc.com/blog/how-much-to-retire-at-55/"
    assert mod.path_to_url("compare/30-year-vs-15-year-mortgage/index.html") == "https://finncalc.com/compare/30-year-vs-15-year-mortgage/"


def test_existing_exclusions_still_apply():
    """Pre-existing EXCLUDE_PATHS + suffix rules are untouched."""
    assert mod.path_to_url("404.html") is None
    assert mod.path_to_url("privacy/index.html") is None
    assert mod.path_to_url("search/index.html") is None
    assert mod.path_to_url("sitemap.xml") is None
    assert mod.path_to_url("assets/logo.png") is None


def test_gather_all_emits_no_build_or_embed_urls():
    """Integration: a real --all walk must contain zero _build/ or embed/ URLs."""
    urls = mod.gather_all()
    assert urls, "gather_all returned nothing — walk is broken"
    assert not any("/_build/" in u for u in urls), "build-source URL leaked into --all"
    assert not any(u.startswith("https://finncalc.com/embed/") for u in urls), "embed widget leaked into --all"
    # Sanity: the new calc pages are present.
    assert "https://finncalc.com/refinance-calculator/" in urls
