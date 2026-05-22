"""Inject a 6-link <section class="related-calculators"> block into every
rendered calculator + variant index.html.

Per SEO Ranking Recovery Plan §3.5 (C2): pages with more internal links rank
higher. Every calculator + variant page now exposes 6 contextually-related
calculators above the footer ad slot.

Relation source
---------------
* Calculator pages: read `related: [<slug>, ...]` from
  `_build/data/calculators.json[<slug>]` (curated editorial choice, 6 slugs).
* Variant pages: inherit the parent calculator's `related` array
  (variants.json has `additionalProperties: false`, so we don't store the
  array there — variants always reflect their parent).

Scope guard
-----------
Walks the repo root looking for `<dir>/index.html`. A page is in-scope only
if its URL path matches a known calculator slug (`/<slug>/`) or a known
variant path (`/<parent>/<variant>/`). Hub pages, blog posts, About, Contact,
authors/, etc. are skipped — they aren't calculator detail pages.

Insertion
---------
Block is inserted BEFORE the `<!-- Ad slot footer` comment. If that anchor
is missing, falls back to BEFORE `</main>`. If neither exists, the page is
out-of-scope and is skipped.

Idempotency
-----------
On re-run, an existing `<section class="related-calculators">…</section>` is
REPLACED with the freshly-rendered block. If the existing block byte-matches
the new block, the file is not rewritten (true no-op). This lets a future
edit to a calculator's `related` array propagate cleanly without needing
manual deletion of stale blocks.

Exclusion list mirrors the C1 patcher: node_modules, .git, _build, .venv,
.pytest_cache, .idea.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

CALCULATORS_PATH = REPO / "_build" / "data" / "calculators.json"
VARIANTS_PATH = REPO / "_build" / "data" / "variants.json"

RELATED_BLOCK_RE = re.compile(
    r'<section[^>]*class="related-calculators"[^>]*>.*?</section>\s*',
    re.IGNORECASE | re.DOTALL,
)
AD_FOOTER_ANCHOR_RE = re.compile(
    r'<!--\s*Ad slot footer',
    re.IGNORECASE,
)
MAIN_CLOSE_RE = re.compile(r'</main>', re.IGNORECASE)


def _iter_rendered_pages() -> list[Path]:
    pages: list[Path] = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


def _url_path(page: Path) -> str:
    """Convert `<repo>/foo/bar/index.html` -> `/foo/bar/`."""
    rel = page.relative_to(REPO).parent.as_posix()
    if rel in ("", "."):
        return "/"
    return f"/{rel}/"


def _build_url_to_calc_slug(calculators: dict, variants: dict) -> dict[str, str]:
    """Map every in-scope URL path to its parent calculator slug.
    `/<slug>/` -> `<slug>`; `/<parent>/<variant>/` -> `<parent>`. The parent
    slug is the lookup key for the `related` array.
    """
    mapping: dict[str, str] = {}
    for slug in calculators:
        mapping[f"/{slug}/"] = slug
    for parent_slug, variant_map in variants.items():
        if parent_slug not in calculators:
            # Variant without a parent calculator entry — unexpected, skip.
            continue
        for variant_slug in variant_map:
            mapping[f"/{parent_slug}/{variant_slug}/"] = parent_slug
    return mapping


def _render_block(related_slugs: list[str], calculators: dict) -> str:
    """Render the <section class="related-calculators">…</section> HTML using
    string templating (no Jinja runtime). Matches the partial template
    structure 1:1 so the rendered output is what a future generate.py run
    would produce.
    """
    items: list[str] = []
    for rel_slug in related_slugs:
        rel = calculators[rel_slug]
        name = html.escape(rel.get("name", ""))
        subtitle = html.escape(rel.get("subtitle", ""))
        url = f"/{rel_slug}/"
        items.append(
            f'      <li><a href="{url}">{name}</a> — {subtitle}</li>'
        )
    items_html = "\n".join(items)
    return (
        '<section class="related-calculators" aria-labelledby="related-calculators-heading">\n'
        '  <div class="container">\n'
        '    <h2 id="related-calculators-heading">Related calculators</h2>\n'
        '    <ul>\n'
        f'{items_html}\n'
        '    </ul>\n'
        '  </div>\n'
        '</section>\n'
    )


def _insert_or_replace(text: str, block: str) -> tuple[str, str]:
    """Insert or replace the related-calculators block in `text`.
    Returns (new_text, status) where status is one of:
      - "inserted"
      - "replaced"
      - "unchanged"   (block byte-matches existing — no write needed)
      - "no-anchor"   (no insertion point found — skip page)
    """
    existing = RELATED_BLOCK_RE.search(text)
    if existing:
        if existing.group(0).rstrip() == block.rstrip():
            return text, "unchanged"
        new_text = text[: existing.start()] + block + text[existing.end():]
        return new_text, "replaced"

    # No existing block — insert at anchor.
    anchor = AD_FOOTER_ANCHOR_RE.search(text)
    if anchor is None:
        anchor = MAIN_CLOSE_RE.search(text)
    if anchor is None:
        return text, "no-anchor"

    insertion_pos = anchor.start()
    new_text = text[:insertion_pos] + block + "\n" + text[insertion_pos:]
    return new_text, "inserted"


def main() -> int:
    calculators = json.loads(CALCULATORS_PATH.read_text(encoding="utf-8"))
    variants = json.loads(VARIANTS_PATH.read_text(encoding="utf-8"))
    url_to_parent = _build_url_to_calc_slug(calculators, variants)

    n_updated = 0
    n_current = 0
    n_skipped = 0
    n_no_anchor = 0

    for page in _iter_rendered_pages():
        url = _url_path(page)
        parent_slug = url_to_parent.get(url)
        if parent_slug is None:
            # Out of scope: not a calculator or variant page.
            n_skipped += 1
            continue

        related_slugs = calculators[parent_slug].get("related")
        if not related_slugs or len(related_slugs) != 6:
            print(f"  WARN: {url} parent {parent_slug!r} has no/invalid related array — skipping")
            n_skipped += 1
            continue

        block = _render_block(related_slugs, calculators)
        text = page.read_text(encoding="utf-8")
        new_text, status = _insert_or_replace(text, block)

        if status == "no-anchor":
            print(f"  SKIP no-anchor: {page.relative_to(REPO).as_posix()}")
            n_no_anchor += 1
            continue
        if status == "unchanged":
            n_current += 1
            continue

        page.write_text(new_text, encoding="utf-8")
        n_updated += 1
        print(f"  {status}: {page.relative_to(REPO).as_posix()}")

    print(
        f"\n{n_updated} updated, {n_current} already-current, "
        f"{n_skipped} skipped (out of scope), {n_no_anchor} skipped (no anchor)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
