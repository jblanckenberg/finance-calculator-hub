"""Sync visible FAQ HTML inside _build/bodies/<slug>.html with the canonical
FAQ list in _build/data/calculators.json.

Body files contain a hand-written <div class="faq">...</div> block. The JSON
faq array is the source of truth (used for FAQPage JSON-LD). This script
locates the .faq div by stack-matching <div>...</div> and rewrites its
inner HTML so the visible FAQs match the JSON.

Usage:
  python _build/sync_body_faqs.py            # dry-run (shows planned changes)
  python _build/sync_body_faqs.py --apply    # rewrite body files in place

The FAQ block keeps the existing CSS classes (.faq, .faq-item, .faq-q, .faq-a)
so the live site styling is untouched.
"""
from __future__ import annotations

import html as _html
import json
import re
import sys
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
BODIES_DIR = BUILD_DIR / "bodies"
DATA_FILE = BUILD_DIR / "data" / "calculators.json"

OPEN_FAQ = '<div class="faq">'


def find_faq_block(body: str) -> tuple[int, int] | None:
    """Return (start, end) indices of the .faq <div> ... </div> block.
    end is the index one past the closing </div>. Uses stack matching so
    nested faq-item divs are handled correctly regardless of whitespace.
    """
    start = body.find(OPEN_FAQ)
    if start == -1:
        return None
    # walk forward, tracking <div> and </div> tags
    i = start + len(OPEN_FAQ)
    depth = 1
    open_re = re.compile(r"<div\b", re.IGNORECASE)
    close_re = re.compile(r"</div>", re.IGNORECASE)
    while i < len(body) and depth > 0:
        next_open = open_re.search(body, i)
        next_close = close_re.search(body, i)
        if not next_close:
            return None
        if next_open and next_open.start() < next_close.start():
            depth += 1
            i = next_open.end()
        else:
            depth -= 1
            i = next_close.end()
    if depth != 0:
        return None
    return (start, i)


def build_faq_html(faq: list[dict]) -> str:
    """Render the FAQ list as the same block shape used in the bodies."""
    parts = ['<div class="faq"><h2>Frequently Asked Questions</h2>']
    for item in faq:
        q = _html.escape(item["q"])
        a = _html.escape(item["a"])
        parts.append(f'<div class="faq-item"><div class="faq-q">{q}</div><div class="faq-a">{a}</div></div>')
    parts.append("</div>")
    return "".join(parts)


def sync_one(slug: str, faq: list[dict], *, apply: bool) -> tuple[bool, str]:
    body_path = BODIES_DIR / f"{slug}.html"
    if not body_path.exists():
        return False, f"[skip] no body file for {slug}"
    original = body_path.read_text(encoding="utf-8")
    span = find_faq_block(original)
    if span is None:
        return False, f"[skip] no FAQ block found in {slug}.html"
    new_html = build_faq_html(faq)
    if original[span[0] : span[1]] == new_html:
        return False, f"[same] {slug} FAQ already in sync"
    updated = original[: span[0]] + new_html + original[span[1] :]
    if apply:
        body_path.write_text(updated, encoding="utf-8")
        return True, f"[wrote] {slug}.html — {len(faq)} FAQs"
    return True, f"[dry-run] would update {slug}.html — {len(faq)} FAQs (was {span[1] - span[0]} chars, new {len(new_html)} chars)"


def main(argv: list[str]) -> int:
    apply = "--apply" in argv
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    changed = 0
    for slug, calc in data.items():
        faq = calc.get("faq") or []
        if not faq:
            print(f"[skip] {slug} has no faq in JSON")
            continue
        did_change, msg = sync_one(slug, faq, apply=apply)
        print(msg)
        if did_change:
            changed += 1
    print(f"\n{'wrote' if apply else 'would update'} {changed} body file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
