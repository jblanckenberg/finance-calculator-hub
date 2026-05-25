"""Tests for the calculators.json metadata patcher."""
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "patch_calculators_json.py"
spec = importlib.util.spec_from_file_location("patch_calculators_json", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_no_op_when_primary_empty():
    """Slugs with empty primary (no good corpus match) must not be touched."""
    entry = {"title": "X Calc", "description": "Y.", "metaDescription": "Y."}
    kw = {"primary": "", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    assert changed is False
    assert patched == entry


def test_skips_when_primary_already_in_title():
    entry = {
        "title": "Dividend Calculator: Monthly Income from Stocks",
        "description": "X with dividend calculator.",
        "metaDescription": "X with dividend calculator.",
    }
    kw = {"primary": "dividend calculator", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    assert changed is False, "Should not patch when primary already in all fields"


def test_inserts_primary_into_description_if_missing():
    entry = {
        "title": "Compound Interest",
        "description": "Calculate growth over time.",
        "metaDescription": "Calculate growth over time.",
    }
    kw = {"primary": "compound interest formula", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    assert changed is True
    assert "compound interest formula" in patched["description"].lower()
    assert "compound interest formula" in patched["metaDescription"].lower()


def test_refuses_title_over_60_chars():
    entry = {
        "title": "Existing Title That Is Already Long" + "X" * 10,
        "description": "Y.",
        "metaDescription": "Y.",
    }
    kw = {"primary": "very long primary keyword phrase here", "secondaries": []}
    patched, _ = mod.patch_entry(entry, kw)
    assert len(patched["title"]) <= 60, (
        f"Title must stay <=60 chars, got {len(patched['title'])}"
    )


def test_refuses_description_over_160_chars():
    long_desc = "X" * 150
    entry = {
        "title": "Y",
        "description": long_desc,
        "metaDescription": long_desc,
    }
    kw = {"primary": "very long primary keyword", "secondaries": []}
    patched, _ = mod.patch_entry(entry, kw)
    assert len(patched["description"]) <= 160
    assert len(patched["metaDescription"]) <= 160


def test_idempotent():
    entry = {
        "title": "Dividend Calculator",
        "description": "Generic.",
        "metaDescription": "Generic.",
    }
    kw = {"primary": "dividend calculator", "secondaries": []}
    a, _ = mod.patch_entry(entry, kw)
    b, changed = mod.patch_entry(a, kw)
    assert changed is False, "Second pass should be a no-op"


def test_patch_title_prepends_primary():
    """When primary is missing from title and there's room, prepend it
    with a colon separator."""
    entry = {
        "title": "Best Tool",
        "description": "Y.",
        "metaDescription": "Y.",
    }
    kw = {"primary": "dividend calculator", "secondaries": []}
    patched, changed = mod.patch_entry(entry, kw)
    assert changed is True
    assert "dividend calculator" in patched["title"].lower()
    assert len(patched["title"]) <= 60
