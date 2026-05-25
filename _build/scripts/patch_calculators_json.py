"""Patch calculators.json entries by inserting the primary keyword into
title (if it fits <=60 chars) and description / metaDescription (if
missing the keyword). Conservative:
  - Never overwrite a description that already contains the primary kw.
  - Never produce a title > 60 chars.
  - Empty primary (slug had no good corpus match) -> no-op for that slug.

Run dry-run by default. Pass --apply to write."""
import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAX_TITLE = 60
MAX_DESC = 160


def patch_entry(entry: dict, kw: dict) -> tuple[dict, bool]:
    """Return (patched_entry, changed_bool)."""
    out = deepcopy(entry)
    primary = (kw.get("primary") or "").strip()
    if not primary:
        return out, False
    changed = False
    pl = primary.lower()

    # Description / metaDescription: insert primary kw if missing.
    for field in ("description", "metaDescription"):
        cur = (out.get(field) or "").strip()
        if cur and pl not in cur.lower():
            prepend = f"Free {primary}. {cur}"
            if len(prepend) <= MAX_DESC:
                new = prepend
            else:
                # Try appending in parentheses
                append = f"{cur} ({primary})"
                new = append if len(append) <= MAX_DESC else cur
            if new != cur:
                out[field] = new
                changed = True

    # Title: only rewrite if (a) primary kw missing AND (b) new title
    # fits within MAX_TITLE.
    cur_title = (out.get("title") or "").strip()
    if cur_title and pl not in cur_title.lower():
        candidate = f"{primary.title()}: {cur_title}"
        if candidate != cur_title and len(candidate) <= MAX_TITLE:
            out["title"] = candidate
            changed = True

    return out, changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = ap.parse_args()

    calcs_path = REPO / "_build/data/calculators.json"
    map_path = REPO / "_build/data/keyword_page_map.json"
    calcs = json.loads(calcs_path.read_text(encoding="utf-8"))
    kwmap = json.loads(map_path.read_text(encoding="utf-8"))

    diffs: list[str] = []
    new_calcs = {}
    for slug, entry in calcs.items():
        kw = kwmap.get(slug, {})
        patched, changed = patch_entry(entry, kw)
        new_calcs[slug] = patched
        if changed:
            diffs.append(slug)

    if not diffs:
        print("No changes proposed.")
        return 0

    print(f"{len(diffs)} entries would change:")
    for slug in diffs:
        before_t = (calcs[slug].get("title") or "")[:80]
        after_t = (new_calcs[slug].get("title") or "")[:80]
        print(f"  {slug}:")
        print(f"    title:  {before_t!r}")
        print(f"        -> {after_t!r}")

    if args.apply:
        calcs_path.write_text(
            json.dumps(new_calcs, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"\nWrote {calcs_path}.")
    else:
        print("\n(dry-run; pass --apply to write)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
