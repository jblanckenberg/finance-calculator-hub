"""Inject favicon / icon links into the <head> of every rendered index.html.
Idempotent: re-running on a clean tree is a no-op.

Insertion point: after the existing <link rel="canonical" ...> line. If a
canonical link is absent (shouldn't happen — every page in this repo has one),
fall back to inserting before the closing </head>.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

ICON_BLOCK = (
    '  <link rel="icon" href="/favicon.ico" sizes="any">\n'
    '  <link rel="icon" href="/finncalc.svg" type="image/svg+xml">\n'
)

CANONICAL = re.compile(r'(<link\s+rel="canonical"[^>]*>\s*\n)', re.IGNORECASE)
HEAD_CLOSE = re.compile(r"(\s*</head>)", re.IGNORECASE)
HAS_FAVICON = re.compile(r'rel="icon"[^>]*href="/favicon\.ico"', re.IGNORECASE)

STALE_LINES = [
    re.compile(r'  <link rel="apple-touch-icon" href="/finncalc_256\.png">\n', re.IGNORECASE),
    re.compile(r'  <link rel="manifest" href="/site\.webmanifest">\n', re.IGNORECASE),
]


def cleanup_stale_lines(text: str) -> tuple[str, bool]:
    changed = False
    for pat in STALE_LINES:
        new_text, n = pat.subn("", text)
        if n:
            text = new_text
            changed = True
    return text, changed


def inject(text: str) -> tuple[str, bool]:
    if HAS_FAVICON.search(text):
        return text, False
    new_text, n = CANONICAL.subn(lambda m: m.group(1) + ICON_BLOCK, text, count=1)
    if n == 0:
        new_text, n = HEAD_CLOSE.subn(lambda m: ICON_BLOCK + m.group(1), text, count=1)
    if n == 0:
        return text, False
    return new_text, True


def iter_rendered_pages() -> list[Path]:
    pages = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


def main() -> int:
    changed = []
    for page in iter_rendered_pages():
        text = page.read_text(encoding="utf-8")
        text, c1 = cleanup_stale_lines(text)
        text, c2 = inject(text)
        if c1 or c2:
            page.write_text(text, encoding="utf-8")
            changed.append(page.relative_to(REPO))
    if changed:
        print(f"Updated favicon block in {len(changed)} rendered pages:")
        for rel in changed[:10]:
            print(f"  - {rel.as_posix()}")
        if len(changed) > 10:
            print(f"  ... +{len(changed) - 10} more")
    else:
        print("All rendered pages already contain favicon block. Nothing to change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
