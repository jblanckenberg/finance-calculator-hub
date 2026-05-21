"""Assert every rendered index.html contains the favicon link tags."""
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}


def _rendered_pages() -> list[Path]:
    pages = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_rendered_page_has_icon_link(page):
    text = page.read_text(encoding="utf-8")
    # head must contain at least an icon ref and a manifest link
    assert "/favicon.ico" in text, f"{page.relative_to(REPO)} missing /favicon.ico link"
    assert "/site.webmanifest" in text, f"{page.relative_to(REPO)} missing /site.webmanifest link"
