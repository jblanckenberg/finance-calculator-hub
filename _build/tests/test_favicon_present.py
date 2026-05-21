from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HEAD_META = REPO / "_build" / "templates" / "partials" / "head_meta.html"


def test_head_meta_has_favicon_ico():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'rel="icon"' in text, "head_meta.html must declare <link rel=icon>"
    assert "/favicon.ico" in text, "head_meta.html must reference /favicon.ico"


def test_head_meta_has_apple_touch_icon():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'rel="apple-touch-icon"' in text, "head_meta.html must declare apple-touch-icon"


def test_head_meta_has_svg_icon():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'type="image/svg+xml"' in text, "head_meta.html must declare an SVG icon"


def test_head_meta_has_manifest_link():
    text = HEAD_META.read_text(encoding="utf-8")
    assert "/site.webmanifest" in text, "head_meta.html must reference /site.webmanifest"
