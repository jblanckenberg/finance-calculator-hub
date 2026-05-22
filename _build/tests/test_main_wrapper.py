from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BASE = REPO / "_build" / "templates" / "_base.html"


def test_base_template_has_main_element():
    text = BASE.read_text(encoding="utf-8")
    assert "<main" in text and "</main>" in text, (
        "_base.html must wrap content in <main>"
    )


def test_main_wraps_block_body_main():
    """The {% block body_main %} content must be inside <main>."""
    text = BASE.read_text(encoding="utf-8")
    main_open = text.find("<main")
    block = text.find("{% block body_main %}")
    main_close = text.find("</main>")
    assert -1 < main_open < block < main_close, (
        "<main> must open before and close after {% block body_main %}"
    )


def test_main_has_content_id():
    """<main> should expose id='content' for skip-link accessibility."""
    text = BASE.read_text(encoding="utf-8")
    assert 'id="content"' in text, "_base.html <main> should have id='content' for skip-link target"
