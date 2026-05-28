"""Assert main.css declares font-display for Inter to prevent FOIT-driven CLS.

Both stylesheet locations must stay in sync. The rendered URL is /css/main.css;
site/css/main.css is the alternate source location the explorer pass identified
as a sibling that should mirror the rendered file.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _css_text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def test_site_css_has_font_face_swap():
    css = _css_text("site/css/main.css")
    assert "@font-face" in css, "site/css/main.css missing @font-face block"
    assert "font-display: swap" in css or "font-display: optional" in css, (
        "site/css/main.css @font-face must declare font-display: swap (or optional)"
    )


def test_root_css_has_font_face_swap():
    css = _css_text("css/main.css")
    assert "@font-face" in css, "css/main.css missing @font-face block"
    assert "font-display: swap" in css or "font-display: optional" in css, (
        "css/main.css @font-face must declare font-display: swap (or optional)"
    )


def test_all_four_weights_declared_in_both_files():
    """Inter is loaded at 400/500/600/700; both stylesheets must cover all four."""
    for rel in ("css/main.css", "site/css/main.css"):
        css = _css_text(rel)
        for weight in (400, 500, 600, 700):
            assert f"font-weight: {weight}" in css, (
                f"{rel} missing @font-face for weight {weight}"
            )
