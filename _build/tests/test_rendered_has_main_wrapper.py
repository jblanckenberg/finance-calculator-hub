"""Assert every rendered page that uses the _base.html layout wraps
its content in <main id="content">.

Scope guard mirrors the patcher: only pages with the canonical
_base.html-derived pattern (</header> directly followed by
<div class="region-wrap"> block) are in scope. Pages without that
pattern (home, blog, embed fragments) are skipped.
"""
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


HAS_HEADER = re.compile(r"<header\b", re.IGNORECASE)
HAS_FOOTER = re.compile(r"<footer\b", re.IGNORECASE)
BASE_LAYOUT = re.compile(
    r'</header>\s*\n\s*<!-- Region Bar -->\s*\n'
    r'<div class="region-wrap">\s*\n'
    r'\s*<div class="region-bar">.*?</div>\s*\n'
    r'</div>\s*\n',
    re.IGNORECASE | re.DOTALL,
)


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_page_has_main_wrapper(page):
    text = page.read_text(encoding="utf-8")
    if not (HAS_HEADER.search(text) and HAS_FOOTER.search(text)):
        pytest.skip(f"{page.relative_to(REPO)} doesn't have full layout — out of scope")
    if not BASE_LAYOUT.search(text):
        pytest.skip(f"{page.relative_to(REPO)} doesn't use _base.html layout — out of scope")
    assert '<main id="content"' in text, f"{page.relative_to(REPO)} missing <main id=content>"
    assert "</main>" in text, f"{page.relative_to(REPO)} missing </main>"
