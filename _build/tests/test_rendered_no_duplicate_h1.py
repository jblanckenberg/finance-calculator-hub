"""Assert every rendered calculator/variant/comparison page has exactly one <h1>."""
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}
H1_RE = re.compile(r"<h1\b[^>]*>", re.IGNORECASE)


def _rendered_pages() -> list[Path]:
    pages = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: str(p.relative_to(REPO)).replace("\\", "/"))
def test_rendered_page_has_at_most_one_h1(page):
    text = page.read_text(encoding="utf-8")
    count = len(H1_RE.findall(text))
    assert count <= 1, (
        f"{page.relative_to(Path(__file__).resolve().parents[2])} has {count} <h1> tags "
        "(should be 0 or 1). Run _build/scripts/strip_duplicate_h1_rendered.py to fix."
    )
