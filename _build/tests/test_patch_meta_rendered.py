"""Tests for the rendered meta-description patcher."""
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "patch_meta_rendered.py"
spec = importlib.util.spec_from_file_location("patch_meta_rendered", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_updates_all_three_description_tags():
    html = (
        '<head>'
        '<meta name="description" content="OLD">'
        '<meta property="og:description" content="OLD">'
        '<meta name="twitter:description" content="OLD">'
        '</head>'
    )
    out, changed = mod.compute_patched_html(html, "NEW description text.")
    assert changed
    assert out.count("NEW description text.") == 3


def test_idempotent_second_pass():
    html = (
        '<meta name="description" content="X.">'
        '<meta property="og:description" content="X.">'
        '<meta name="twitter:description" content="X.">'
    )
    first, _ = mod.compute_patched_html(html, "X.")
    second, changed = mod.compute_patched_html(first, "X.")
    assert changed is False
    assert second == first


def test_html_escapes_quotes_in_description():
    html = '<meta name="description" content="OLD">'
    out, changed = mod.compute_patched_html(html, 'New "quoted" desc')
    assert changed
    # Quotes should be HTML-escaped so the attribute remains valid
    assert '&quot;' in out
    assert '"quoted"' not in out  # Raw quotes would break the attribute


def test_missing_meta_tag_is_left_alone():
    """If a page has none of the three meta tags, the patcher should
    leave it unchanged (no exception)."""
    html = '<head><title>No metas here</title></head>'
    out, changed = mod.compute_patched_html(html, "Some desc.")
    assert changed is False
    assert out == html


def test_partial_meta_set_only_patches_present_tags():
    """If only name=description is present, only that one is updated;
    the absent og/twitter are not injected."""
    html = '<meta name="description" content="OLD">'
    out, changed = mod.compute_patched_html(html, "NEW.")
    assert changed
    assert 'NEW.' in out
    assert 'og:description' not in out
    assert 'twitter:description' not in out
