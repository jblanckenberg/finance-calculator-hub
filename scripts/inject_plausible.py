"""Idempotent injection of the Plausible analytics tag into every page <head>."""
from pathlib import Path

SNIPPET = '<script defer data-domain="finncalc.com" src="https://plausible.io/js/script.js"></script>'

EXCLUDES = frozenset({"node_modules", ".git", "__pycache__"})

def inject(root: Path, dry_run: bool = True) -> int:
    hits = 0
    for html in root.rglob("*.html"):
        if any(part in EXCLUDES for part in html.parts):
            continue
        text = html.read_text(encoding="utf-8")
        if SNIPPET in text:
            continue
        if "</head>" not in text:
            continue
        new_text = text.replace("</head>", f"  {SNIPPET}\n</head>", 1)
        if new_text != text:
            hits += 1
            if not dry_run:
                html.write_text(new_text, encoding="utf-8")
    return hits

if __name__ == "__main__":
    import sys
    root = Path(__file__).resolve().parent.parent
    dry = "--apply" not in sys.argv
    n = inject(root, dry_run=dry)
    mode = "dry-run" if dry else "apply"
    print(f"[{mode}] injected into {n} files")
