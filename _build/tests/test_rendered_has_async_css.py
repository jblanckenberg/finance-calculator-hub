import re
from pathlib import Path
import pytest

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}


def _rendered_pages() -> list[Path]:
    pages = []
    for p in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        pages.append(p)
    return sorted(pages)


SYNC_BARE = re.compile(r'<link\s+rel="stylesheet"\s+href="/css/main\.css"(?![^>]*media=)', re.IGNORECASE)
# The async pattern wraps a sync stylesheet inside <noscript>...</noscript> as a
# non-JS fallback. That occurrence is NOT render-blocking, so we mask noscript
# blocks out before scanning for the bare render-blocker.
NOSCRIPT_BLOCK = re.compile(r"<noscript>.*?</noscript>", re.IGNORECASE | re.DOTALL)


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_page_has_preload_main_css(page):
    text = page.read_text(encoding="utf-8")
    if "/css/main.css" not in text:
        pytest.skip(f"{page.relative_to(REPO)} doesn't load main.css — out of scope")
    assert 'rel="preload" as="style"' in text and "/css/main.css" in text, (
        f"{page.relative_to(REPO)} missing preload of /css/main.css"
    )


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_page_has_noscript_fallback(page):
    text = page.read_text(encoding="utf-8")
    if "/css/main.css" not in text:
        pytest.skip(f"{page.relative_to(REPO)} doesn't load main.css — out of scope")
    assert "<noscript>" in text, f"{page.relative_to(REPO)} missing noscript fallback"


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_page_no_bare_sync_main_css(page):
    text = page.read_text(encoding="utf-8")
    # Bare sync (no media attr) main.css link is the render-blocker we just removed.
    # The <noscript> fallback wraps a sync <link> intentionally; mask noscript
    # blocks before scanning so the fallback isn't mis-flagged.
    masked = NOSCRIPT_BLOCK.sub("", text)
    assert not SYNC_BARE.search(masked), (
        f"{page.relative_to(REPO)} still has bare sync <link rel=stylesheet href=/css/main.css>"
    )
