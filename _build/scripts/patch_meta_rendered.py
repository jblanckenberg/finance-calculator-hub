"""Push <meta name="description">, og:description, twitter:description
from calculators.json description (or metaDescription if present) into
every rendered <slug>/index.html. Same pattern as patch_titles_rendered.py.
Idempotent."""
import json
import re
import sys
from html import escape
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data"

NAME_DESC = re.compile(
    r'(<meta\s+name="description"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)
OG_DESC = re.compile(
    r'(<meta\s+property="og:description"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)
TW_DESC = re.compile(
    r'(<meta\s+name="twitter:description"\s+content=")([^"]*)(")',
    re.IGNORECASE,
)


def compute_patched_html(html: str, new_desc: str) -> tuple[str, bool]:
    target = escape(new_desc, quote=True)
    changed = False

    def _sub(pat, s):
        nonlocal changed

        def repl(m):
            nonlocal changed
            if m.group(2) == target:
                return m.group(0)
            changed = True
            return f"{m.group(1)}{target}{m.group(3)}"

        return pat.sub(repl, s)

    out = _sub(NAME_DESC, html)
    out = _sub(OG_DESC, out)
    out = _sub(TW_DESC, out)
    return out, changed


def _descriptions_from_calculators() -> dict[str, str]:
    calcs = json.loads((DATA / "calculators.json").read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for slug, entry in calcs.items():
        if not isinstance(entry, dict):
            continue
        # metaDescription takes precedence (the SEO-tuned variant);
        # fall back to description.
        d = entry.get("metaDescription") or entry.get("description")
        if d:
            out[f"{slug}/index.html"] = d
    return out


def main():
    updated = 0
    skipped = 0
    for relpath, desc in _descriptions_from_calculators().items():
        page = REPO / relpath
        if not page.exists():
            skipped += 1
            continue
        old = page.read_text(encoding="utf-8")
        new, changed = compute_patched_html(old, desc)
        if changed:
            page.write_text(new, encoding="utf-8")
            updated += 1
    print(f"{updated} updated, {skipped} skipped (page not present).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
