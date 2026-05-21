"""Every calculator + variant title must fit Google's mobile truncation
threshold. Floor is set just below the shortest current title to catch
accidental over-trimming."""
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"
LIMIT_MAX = 60
LIMIT_MIN = 30  # warn floor


def _load_calculators() -> list[dict]:
    raw = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    out: list[dict] = []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if "calculators" in raw and isinstance(raw["calculators"], list):
            return raw["calculators"]
        for slug, entry in raw.items():
            if isinstance(entry, dict):
                e = dict(entry)
                e.setdefault("slug", slug)
                out.append(e)
    return out


def _load_variants() -> list[dict]:
    raw = json.loads((DATA / "variants.json").read_text(encoding="utf-8"))
    out: list[dict] = []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if "variants" in raw and isinstance(raw["variants"], list):
            return raw["variants"]
        for calc_slug, variants in raw.items():
            if not isinstance(variants, dict):
                continue
            for var_slug, entry in variants.items():
                if isinstance(entry, dict):
                    e = dict(entry)
                    e["slug"] = f"{calc_slug}/{var_slug}"
                    out.append(e)
    return out


@pytest.mark.parametrize(
    "entry",
    _load_calculators(),
    ids=lambda e: e.get("slug", "?"),
)
def test_calculator_title_length(entry):
    title = entry["title"]
    assert LIMIT_MIN <= len(title) <= LIMIT_MAX, (
        f"Title length {len(title)} out of band [{LIMIT_MIN}, {LIMIT_MAX}]: {title!r}"
    )


@pytest.mark.parametrize(
    "entry",
    _load_variants(),
    ids=lambda e: e.get("slug", "?"),
)
def test_variant_title_length(entry):
    title = entry["title"]
    assert LIMIT_MIN <= len(title) <= LIMIT_MAX, (
        f"Variant title length {len(title)} out of band: {title!r}"
    )
