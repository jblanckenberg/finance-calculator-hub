"""One-shot insertion of the newsletter <slot> div and the JS script tag."""
from pathlib import Path

SCRIPT_TAG = '<script src="/js/newsletter.js" defer></script>'
SLOT_DIV = '<div id="newsletter-slot"></div>'

EXCLUDES = frozenset({"node_modules", ".git", "__pycache__"})

def inject(root: Path, dry_run: bool = True) -> dict:
    """Return counts: {'script': N, 'slot': M}."""
    counts = {"script": 0, "slot": 0}
    for html in root.rglob("*.html"):
        if any(part in EXCLUDES for part in html.parts):
            continue
        text = html.read_text(encoding="utf-8")
        new_text = text
        # 1) Script tag in <head>
        if "</head>" in new_text and SCRIPT_TAG not in new_text:
            new_text = new_text.replace(
                "</head>",
                f"  {SCRIPT_TAG}\n</head>",
                1,
            )
            counts["script"] += 1
        # 2) Slot div immediately before footer-cross-link
        if (
            '<div class="footer-cross-link"' in new_text
            and SLOT_DIV not in new_text
        ):
            new_text = new_text.replace(
                '<div class="footer-cross-link"',
                f'{SLOT_DIV}\n      <div class="footer-cross-link"',
                1,
            )
            counts["slot"] += 1
        if new_text != text and not dry_run:
            html.write_text(new_text, encoding="utf-8")
    return counts

if __name__ == "__main__":
    import sys
    root = Path(__file__).resolve().parent.parent
    dry = "--apply" not in sys.argv
    counts = inject(root, dry_run=dry)
    mode = "dry-run" if dry else "apply"
    print(f"[{mode}] script={counts['script']} slot={counts['slot']}")
