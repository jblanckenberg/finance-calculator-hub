"""Build the 4 FC embed bundles by concatenating _shared.js + _entry_<slug>.js,
then substituting the EMBED_ORIGIN placeholder. Output → js/embed/<slug>.js.

Vanilla-JS, no minifier. Bundles are tiny (~2-3 KB unminified, ~1.5 KB
gzipped) so the lack of a minifier is a non-issue. Cloudflare Pages
Brotli-compresses on serve."""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "js" / "embed"

SLUGS = [
    "compound-interest",
    "mortgage",
    "retirement-savings",
    "take-home-pay",
]

ORIGIN = os.environ.get("FC_EMBED_ORIGIN", "https://finncalc.com").rstrip("/")


def build_one(slug: str) -> Path:
    shared = (SRC / "_shared.js").read_text(encoding="utf-8")
    entry = (SRC / f"_entry_{slug}.js").read_text(encoding="utf-8")
    bundle = (
        f"/* FC embed {slug} — built from _shared.js + _entry_{slug}.js */\n"
        f"(function() {{\n{shared}\n{entry}\n}})();\n"
    )
    bundle = bundle.replace("__EMBED_ORIGIN__", ORIGIN)
    out = SRC / f"{slug}.js"
    out.write_text(bundle, encoding="utf-8")
    return out


def main() -> int:
    for slug in SLUGS:
        out = build_one(slug)
        size = out.stat().st_size
        print(f"[build_fc_embeds] {out.relative_to(ROOT)} ({size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
