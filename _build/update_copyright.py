"""One-shot sweep to replace hardcoded copyright + dated SEO strings.

Replaced by Phase 2 generator (templates make this script obsolete) but kept
in repo as the historical fix script."""
from pathlib import Path

OLD_YEAR = 2024
NEW_YEAR = 2026

EXCLUDES = frozenset({"node_modules", ".git", "__pycache__"})

REPLACEMENTS = (
    (f"© {OLD_YEAR} FinCalcHub", f"© {NEW_YEAR} FinCalcHub"),
    (f"Calculator {OLD_YEAR} — USA", f"Calculator {NEW_YEAR} — USA"),
)

def sweep(root: Path, dry_run: bool = True) -> int:
    """Return the count of files that contain at least one replacement target."""
    hits = 0
    for html in root.rglob("*.html"):
        if any(part in EXCLUDES for part in html.parts):
            continue
        text = html.read_text(encoding="utf-8")
        new_text = text
        for old, new in REPLACEMENTS:
            new_text = new_text.replace(old, new)
        if new_text != text:
            hits += 1
            if not dry_run:
                html.write_text(new_text, encoding="utf-8")
    return hits

if __name__ == "__main__":
    import sys
    root = Path(__file__).resolve().parent.parent
    dry = "--apply" not in sys.argv
    n = sweep(root, dry_run=dry)
    mode = "dry-run" if dry else "apply"
    print(f"[{mode}] would touch {n} files")
