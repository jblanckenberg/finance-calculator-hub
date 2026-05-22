"""Print every title in calculators.json + variants.json + extra_titles.json
with length > 60."""
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"
LIMIT = 60


def _iter_calculators(raw):
    """calculators.json is a dict keyed by slug; tolerate a list too."""
    if isinstance(raw, list):
        for entry in raw:
            yield entry
        return
    if isinstance(raw, dict):
        # Either {"calculators": [...]} envelope or {slug: {...}, ...}
        if "calculators" in raw and isinstance(raw["calculators"], list):
            for entry in raw["calculators"]:
                yield entry
            return
        for slug, entry in raw.items():
            if isinstance(entry, dict):
                entry = dict(entry)
                entry.setdefault("slug", slug)
                yield entry


def _iter_variants(raw):
    """variants.json is a dict keyed by calculator slug -> dict of variant slug -> entry."""
    if isinstance(raw, list):
        for entry in raw:
            yield entry
        return
    if isinstance(raw, dict):
        if "variants" in raw and isinstance(raw["variants"], list):
            for entry in raw["variants"]:
                yield entry
            return
        for calc_slug, variants in raw.items():
            if not isinstance(variants, dict):
                continue
            for var_slug, entry in variants.items():
                if isinstance(entry, dict):
                    entry = dict(entry)
                    # Always namespace with the parent calc slug so the auditor
                    # can disambiguate (variants reuse short slugs like "uk").
                    entry["slug"] = f"{calc_slug}/{var_slug}"
                    yield entry


def audit(entries, source: str) -> list[tuple[str, int, str]]:
    offenders = []
    for entry in entries:
        title = entry.get("title", "")
        if len(title) > LIMIT:
            slug = entry.get("slug") or entry.get("id") or "?"
            offenders.append((slug, len(title), title))
    if offenders:
        print(f"\n{source} -- {len(offenders)} titles >{LIMIT} chars:")
        for slug, length, title in offenders:
            print(f"  [{length}] {slug}: {title}")
    return offenders


def _iter_extra_titles(raw):
    """extra_titles.json is a flat {rendered_path: title} map."""
    if isinstance(raw, dict):
        for path, title in raw.items():
            yield {"slug": path, "title": title}


def main() -> int:
    calcs_raw = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    variants_raw = json.loads((DATA / "variants.json").read_text(encoding="utf-8"))
    extra_raw = json.loads((DATA / "extra_titles.json").read_text(encoding="utf-8"))
    bad_c = audit(list(_iter_calculators(calcs_raw)), "calculators.json")
    bad_v = audit(list(_iter_variants(variants_raw)), "variants.json")
    bad_e = audit(list(_iter_extra_titles(extra_raw)), "extra_titles.json")
    total = len(bad_c) + len(bad_v) + len(bad_e)
    print(f"\nTotal offenders: {total}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
