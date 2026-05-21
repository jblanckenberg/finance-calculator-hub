"""Assert every calculator + blog post rendered page declares a Person author schema."""
import json
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

JSON_LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.IGNORECASE | re.DOTALL)


def _rendered_pages() -> list[Path]:
    pages = []
    for p in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        pages.append(p)
    return sorted(pages)


def _has_person_author(text: str) -> bool:
    for match in JSON_LD.finditer(text):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") == "Person" and "james-blanckenberg" in str(item.get("@id", "")):
                return True
            author = item.get("author")
            if isinstance(author, dict) and "james-blanckenberg" in str(author.get("@id", "")):
                return True
    return False


@pytest.mark.parametrize("page", _rendered_pages(), ids=lambda p: p.relative_to(REPO).as_posix())
def test_page_has_author_schema(page):
    text = page.read_text(encoding="utf-8")
    has_existing_jsonld = bool(JSON_LD.search(text))
    if not has_existing_jsonld:
        pytest.skip(f"{page.relative_to(REPO)} has no JSON-LD — out of scope")
    assert _has_person_author(text), (
        f"{page.relative_to(REPO)} has JSON-LD but no Person author referencing james-blanckenberg"
    )
