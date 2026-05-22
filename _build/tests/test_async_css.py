from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HEAD_META = REPO / "_build" / "templates" / "partials" / "head_meta.html"


def test_main_css_uses_preload_pattern():
    text = HEAD_META.read_text(encoding="utf-8")
    has_preload = 'rel="preload" as="style"' in text and "/css/main.css" in text
    has_print_swap = 'media="print"' in text and "onload=\"this.media='all'" in text
    assert has_preload or has_print_swap, (
        "main.css must be loaded async (preload+onload or media=print swap)"
    )


def test_noscript_fallback_present():
    text = HEAD_META.read_text(encoding="utf-8")
    assert "<noscript>" in text and "/css/main.css" in text, (
        "Async CSS requires a <noscript> fallback so non-JS clients still get styles"
    )


def test_preconnect_present():
    text = HEAD_META.read_text(encoding="utf-8")
    assert 'rel="preconnect"' in text and "finncalc.com" in text, (
        "head_meta must declare preconnect to https://finncalc.com"
    )
