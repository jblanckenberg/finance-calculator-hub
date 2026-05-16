"""Extract the per-calc body content from each existing calc page.

The extractor finds the first `<div class="container" style="padding-top:0">` that
contains the calculator form (signal: it contains either `id="principal"`,
`<button class="btn-calc"`, or a known calc input id) and returns everything from
that point through the last `</div><!-- /container -->` (excluding the global
footer + cross-link block we now template).

This is a one-shot migration: the produced bodies/<slug>.html files are committed
and become the source of truth for body content. Future edits go to bodies/, not
to the rendered <slug>/index.html (which is regenerated).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent / "bodies"

BODY_START_RE = re.compile(
    r'<!-- Calculator -->\s*<div class="container"',
    re.IGNORECASE,
)
BODY_END_RE = re.compile(
    r'</div><!-- /container -->',
    re.IGNORECASE,
)

# Fallback markers for slugs that lack the canonical `<!-- Calculator -->` +
# `</div><!-- /container -->` annotations. These 11 of 12 pages open the calc
# region with a bare `<div class="container">` and close it with a `</div>` that
# sits immediately before either the "From the Blog" sibling block or the
# global `<footer>`. We slice to that sentinel and walk back to the matching
# `</div>`.
FALLBACK_START_RE = re.compile(r'<div class="container">', re.IGNORECASE)
FALLBACK_END_SENTINELS = (
    '<div class="related" style="margin-top:32px"',
    '<footer>',
    '<footer ',
)

SLUGS = (
    "compound-interest", "mortgage", "take-home-pay", "retirement-savings",
    "investment-growth", "savings-goal", "inflation-impact", "net-worth",
    "loan-payoff", "credit-card-payoff", "emergency-fund", "sa-tax-calculator",
)

def extract_body(html: str) -> str:
    start = BODY_START_RE.search(html)
    if start:
        body_region = html[start.start():]
        end_match = list(BODY_END_RE.finditer(body_region))
        if end_match:
            return body_region[: end_match[-1].end()]
        # Canonical start matched but no canonical end — fall through to fallback.

    # Fallback: locate the first bare `<div class="container">` and slice up to
    # the closing `</div>` that sits immediately before the first sibling
    # sentinel (From-the-Blog block or global footer).
    fb_start = FALLBACK_START_RE.search(html)
    if not fb_start:
        # Last-ditch: legacy hero-comment marker without container attrs.
        hero_idx = html.find('<!-- Calculator -->')
        if hero_idx == -1:
            raise ValueError("could not locate calculator body marker")
        body_region = html[hero_idx:]
        end_match = list(BODY_END_RE.finditer(body_region))
        if not end_match:
            raise ValueError("could not locate body end marker")
        return body_region[: end_match[-1].end()]

    sentinel_idx = -1
    for needle in FALLBACK_END_SENTINELS:
        idx = html.find(needle, fb_start.end())
        if idx != -1 and (sentinel_idx == -1 or idx < sentinel_idx):
            sentinel_idx = idx
    if sentinel_idx == -1:
        raise ValueError("could not locate body end marker (no sentinel)")
    close_idx = html.rfind('</div>', fb_start.end(), sentinel_idx)
    if close_idx == -1:
        raise ValueError("could not locate body end marker (no closing div)")
    return html[fb_start.start() : close_idx + len('</div>')]

def main(dry_run: bool = True) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for slug in SLUGS:
        src = ROOT / slug / "index.html"
        if not src.exists():
            continue
        body = extract_body(src.read_text(encoding="utf-8"))
        target = OUT_DIR / f"{slug}.html"
        if dry_run:
            print(f"[dry-run] would write {target.relative_to(ROOT)} ({len(body)} chars)")
        else:
            target.write_text(body, encoding="utf-8")
            written += 1
    return written

if __name__ == "__main__":
    import sys
    dry = "--apply" not in sys.argv
    n = main(dry_run=dry)
    if dry:
        print("[dry-run] (use --apply to write)")
    else:
        print(f"[apply] wrote {n} body files")
