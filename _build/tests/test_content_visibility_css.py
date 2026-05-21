"""Lock the Task 8 spec-required content-visibility:auto declaration.

Below-the-fold partials key_concepts and try_scenarios get the
content-visibility paint-saving optimization via a CSS rule in the
sitewide stylesheet (cleaner than editing each partial and propagating
through 30+ rendered calc pages). This test ensures the rule does not
silently disappear.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAIN_CSS = REPO / "css" / "main.css"


def test_main_css_exists():
    assert MAIN_CSS.is_file(), f"sitewide stylesheet missing at {MAIN_CSS}"


def test_content_visibility_declared():
    text = MAIN_CSS.read_text(encoding="utf-8")
    assert (
        "content-visibility: auto" in text or "content-visibility:auto" in text
    ), "main.css must declare content-visibility:auto for below-fold sections"


def test_contain_intrinsic_size_paired():
    """content-visibility:auto without contain-intrinsic-size can cause
    scrollbar jumps when sections paint. The pairing is the canonical
    safe pattern — fail if it ever drifts apart."""
    text = MAIN_CSS.read_text(encoding="utf-8")
    assert "contain-intrinsic-size" in text, (
        "main.css must pair content-visibility:auto with contain-intrinsic-size"
    )


def test_targets_below_fold_sections():
    text = MAIN_CSS.read_text(encoding="utf-8")
    assert ".key-concepts" in text, "main.css must target .key-concepts"
    assert ".try-scenarios" in text, "main.css must target .try-scenarios"
