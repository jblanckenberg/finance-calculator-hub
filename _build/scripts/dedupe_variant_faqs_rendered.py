"""Replace each variant page's inherited (parent) FAQ with a variant-specific
FAQ, in-place on the rendered HTML.

WHY: variant pages (e.g. /compound-interest/uk/) reuse their parent calculator's
body verbatim, including the parent's FAQ block. That repeats the same ~10 Q&As
across the parent and every variant — a Google AdSense "low value content"
(duplicate content) signal. This script swaps in the unique per-variant FAQ
authored in `_build/data/variants.json` ("faq" array per variant) and injects a
matching FAQPage JSON-LD (variants previously had none).

This is a *_rendered.py patcher: per the repo execution policy, sitewide/template
changes are mirrored in-place on the deployed rendered HTML rather than via
`generate.py` (templates have drifted from the rendered tree). The equivalent
source-side change lives in `_build/generate.py` (build_faq_html / render_variant)
and `_build/templates/variant.html`.

Idempotent: re-running replaces the single `<div class="faq">` line again and
removes any previously injected marker block before re-adding it.

Usage:
    python _build/scripts/dedupe_variant_faqs_rendered.py            # dry-run
    python _build/scripts/dedupe_variant_faqs_rendered.py --apply    # write
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
VARIANTS = REPO / "_build" / "data" / "variants.json"
MARKER = "<!-- variant-faq-dedup -->"


def build_faq_html(faq: list[dict]) -> str:
    parts = ['<div class="faq"><h2>Frequently Asked Questions</h2>']
    for item in faq:
        q = html.escape(item["q"])
        a = html.escape(item["a"])
        parts.append(
            f'<div class="faq-item"><div class="faq-q">{q}</div>'
            f'<div class="faq-a">{a}</div></div>'
        )
    parts.append("</div>")
    return "".join(parts)


def build_faq_ld(faq: list[dict]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["q"],
                "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
            }
            for item in faq
        ],
    }


def patch_file(path: Path, faq: list[dict]) -> tuple[bool, str]:
    text = path.read_text(encoding="utf-8")

    # Remove our own previously injected (marked) FAQPage schema — idempotency.
    text = re.sub(
        re.escape(MARKER) + r'<script type="application/ld\+json">.*?</script>\s*',
        "",
        text,
        flags=re.DOTALL,
    )
    # Remove any OTHER FAQPage JSON-LD on this variant — e.g. a parent-FAQ
    # schema injected here by an earlier SEO task — so exactly one (the
    # variant's) remains and the duplicate FAQ is gone from schema too. Tempered
    # so it never spans into a neighbouring (non-FAQPage) ld+json block.
    text = re.sub(
        r'[ \t]*<script type="application/ld\+json">'
        r'(?:(?!</script>).)*?"FAQPage".*?</script>\s*',
        "",
        text,
        flags=re.DOTALL,
    )

    lines = text.split("\n")
    # Drop any leftover marker line (defensive).
    lines = [ln for ln in lines if MARKER not in ln]

    faq_idx = next((i for i, ln in enumerate(lines) if '<div class="faq">' in ln), None)
    if faq_idx is None:
        return False, "no <div class=\"faq\"> block found"
    if lines[faq_idx].count('<div class="faq">') != 1:
        return False, "ambiguous: multiple faq divs on one line"

    indent = lines[faq_idx][: len(lines[faq_idx]) - len(lines[faq_idx].lstrip())]
    lines[faq_idx] = indent + build_faq_html(faq)

    schema = json.dumps(build_faq_ld(faq), ensure_ascii=False)
    lines.insert(
        faq_idx + 1,
        f'{indent}{MARKER}<script type="application/ld+json">{schema}</script>',
    )

    new_text = "\n".join(lines)
    if new_text == text:
        return False, "unchanged"
    path.write_text(new_text, encoding="utf-8")
    return True, "patched"


def main() -> int:
    apply = "--apply" in sys.argv
    variants = json.loads(VARIANTS.read_text(encoding="utf-8"))

    total = changed = missing = skipped = 0
    for parent, vmap in variants.items():
        for vslug, vdata in vmap.items():
            faq = vdata.get("faq")
            if not faq:
                continue
            total += 1
            page = REPO / parent / vslug / "index.html"
            if not page.exists():
                print(f"[miss] {parent}/{vslug}: no rendered page")
                missing += 1
                continue
            if not apply:
                text = page.read_text(encoding="utf-8")
                has = '<div class="faq">' in text
                print(f"[dry ] {parent}/{vslug}: {'would patch' if has else 'NO FAQ DIV'}")
                continue
            ok, msg = patch_file(page, faq)
            if ok:
                changed += 1
            else:
                skipped += 1
                print(f"[skip] {parent}/{vslug}: {msg}")

    if apply:
        print(f"[apply] patched {changed}/{total} variant pages "
              f"({missing} missing, {skipped} skipped)")
    else:
        print(f"[dry-run] {total} variant pages with faq; use --apply to write")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
