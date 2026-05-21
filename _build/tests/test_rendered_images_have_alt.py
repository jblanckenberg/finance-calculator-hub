import re
from pathlib import Path
import pytest

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
HAS_ALT = re.compile(r'\balt\s*=', re.IGNORECASE)


def _rendered_pages() -> list[Path]:
    pages = []
    for p in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        pages.append(p)
    return sorted(pages)


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_rendered_images_have_alt(page):
    text = page.read_text(encoding="utf-8")
    offenders = [t.group(0) for t in IMG_TAG.finditer(text) if not HAS_ALT.search(t.group(0))]
    assert not offenders, f"{page.relative_to(REPO)} has {len(offenders)} <img> without alt: {offenders[:2]}"
