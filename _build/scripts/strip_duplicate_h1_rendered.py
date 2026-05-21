"""Surgically strip the SECOND <h1>...</h1> block from any rendered HTML file
that has more than one. Idempotent: re-running is a no-op once clean.

Why this exists: the source body files were de-H1'd in commit 67c2340, but
the deployed rendered HTML in this repo wasn't regenerated (Jinja rebuild
introduces unrelated drift — operator policy is hand-edit only). This
script applies the same fix directly to rendered output.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}
# Match an entire <h1>...</h1> block (non-greedy, may span lines).
H1_BLOCK = re.compile(r"<h1\b[^>]*>.*?</h1>\s*", re.IGNORECASE | re.DOTALL)


def strip_second_h1(text: str) -> tuple[str, bool]:
    """Remove the second <h1>...</h1> block. Returns (new_text, changed)."""
    matches = list(H1_BLOCK.finditer(text))
    if len(matches) < 2:
        return text, False
    second = matches[1]
    new_text = text[: second.start()] + text[second.end():]
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
        new_text, did_change = strip_second_h1(text)
        if did_change:
            page.write_text(new_text, encoding="utf-8")
            changed.append(page.relative_to(REPO))
    if changed:
        print(f"Stripped duplicate <h1> from {len(changed)} rendered pages:")
        for rel in changed:
            print(f"  - {rel.as_posix()}")
    else:
        print("No rendered pages had duplicate <h1>. Nothing to change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
