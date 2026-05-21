"""Propagate trimmed titles from calculators.json + variants.json into
rendered <title>, og:title, twitter:title meta tags on every affected
index.html. Idempotent: re-running on a clean tree is a no-op.

Why this exists: operator policy forbids re-running `_build/generate.py`
(templates have drifted; rebuild churns dateModified + nav). So data-file
edits cannot reach the deployed site unless this script hand-edits the
rendered output directly. Same pattern as
`strip_duplicate_h1_rendered.py` and `inject_favicon_rendered.py`.

Source-of-truth precedence per rendered file:
1. calculators.json title (for `<slug>/index.html`)
2. variants.json title (for `<calc-slug>/<variant-slug>/index.html`)
3. extra_titles.json (blog posts, glossary, tax hub,
   personal-finance-calculators landing, etc. — pages without a
   data-file record)
"""
import json
import re
import sys
from html import escape
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}


def _load_extra_titles() -> dict[str, str]:
    """Return the {rendered_path: title} map for pages NOT in
    calculators.json / variants.json (blog posts, glossary, landing
    pages, comparison pages, etc.). Lives in _build/data/extra_titles.json
    so the auditor + tests cover it on equal footing with the other
    JSON-backed title sources."""
    return json.loads((DATA / "extra_titles.json").read_text(encoding="utf-8"))


def _load_json_titles() -> dict[str, str]:
    """Return {rendered_path: new_title} for every calculator + variant."""
    out: dict[str, str] = {}
    calcs_raw = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    if isinstance(calcs_raw, dict):
        for slug, entry in calcs_raw.items():
            if not isinstance(entry, dict):
                continue
            title = entry.get("title")
            if title:
                out[f"{slug}/index.html"] = title
    variants_raw = json.loads((DATA / "variants.json").read_text(encoding="utf-8"))
    if isinstance(variants_raw, dict):
        for calc_slug, variants in variants_raw.items():
            if not isinstance(variants, dict):
                continue
            for var_slug, entry in variants.items():
                if not isinstance(entry, dict):
                    continue
                title = entry.get("title")
                if title:
                    out[f"{calc_slug}/{var_slug}/index.html"] = title
    return out


def _build_map() -> dict[str, str]:
    """calculators/variants JSON wins; extra_titles.json fills in gaps
    without overriding."""
    m = _load_extra_titles()
    m.update(_load_json_titles())
    return m


# Regex captures: prefix, attr value or inner text, suffix. We replace only
# the middle group, preserving surrounding quotes/whitespace and other
# attrs verbatim.
_TITLE_RE = re.compile(
    r"(<title[^>]*>)([^<]*)(</title>)",
    re.IGNORECASE,
)
_OG_TITLE_RE = re.compile(
    r'(<meta\s+property="og:title"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)
_TW_TITLE_RE = re.compile(
    r'(<meta\s+name="twitter:title"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)


def _patch_one(text: str, new_title: str) -> tuple[str, int]:
    """Replace <title>, og:title, twitter:title in `text`. Returns
    (new_text, replacements_made). Idempotent — already-correct tags are
    skipped."""
    # Inner <title> text is HTML-escaped (so `&` becomes `&amp;`).
    # og:title / twitter:title content="..." is also HTML-escaped because
    # we're inside an attribute.
    #
    # NOTE on raw-vs-display length: the auditor (audit_titles.py) and
    # tests (test_title_length.py) measure JSON title length, which is
    # the post-decode DISPLAY length Google uses for mobile truncation
    # (~60 chars). HTML-entity escaping below may push the RAW HTML
    # title past 60 chars (e.g. `&` → `&amp;` adds 4). That is intentional
    # and not a regression — Google decodes entities before measuring.
    # The JSON files remain the source of truth for length compliance.
    escaped = escape(new_title, quote=True)
    count = 0

    def _sub_title(m):
        nonlocal count
        if m.group(2) == escaped:
            return m.group(0)
        count += 1
        return f"{m.group(1)}{escaped}{m.group(3)}"

    def _sub_meta(m):
        nonlocal count
        if m.group(2) == escaped:
            return m.group(0)
        count += 1
        return f"{m.group(1)}{escaped}{m.group(3)}"

    text = _TITLE_RE.sub(_sub_title, text, count=1)
    text = _OG_TITLE_RE.sub(_sub_meta, text, count=1)
    text = _TW_TITLE_RE.sub(_sub_meta, text, count=1)
    return text, count


def iter_targets() -> dict[str, str]:
    return _build_map()


def main() -> int:
    title_map = iter_targets()
    missing: list[str] = []
    changed_files: list[tuple[str, int]] = []
    total = 0

    for rel, new_title in sorted(title_map.items()):
        page = REPO / rel
        if not page.exists():
            missing.append(rel)
            continue
        # Skip excluded dirs as a belt-and-braces guard.
        if any(part in EXCLUDE_DIRS for part in page.relative_to(REPO).parts):
            continue
        text = page.read_text(encoding="utf-8")
        new_text, n = _patch_one(text, new_title)
        if n:
            page.write_text(new_text, encoding="utf-8")
            changed_files.append((rel, n))
            total += n

    if changed_files:
        print(f"Updated titles in {len(changed_files)} rendered pages "
              f"({total} tag replacements):")
        for rel, n in changed_files:
            print(f"  - {rel} ({n})")
    else:
        print("No rendered titles needed changes. Tree is clean.")

    if missing:
        print(f"\nWarning: {len(missing)} mapped paths did not exist:")
        for rel in missing:
            print(f"  ! {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
