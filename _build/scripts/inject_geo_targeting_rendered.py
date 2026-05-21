"""Inject hreflang link tags + Schema.org `areaServed` Country signals into the
inventoried set of geo-targeted rendered pages.

Why (SEO Recovery Plan §4.5 + §10): finncalc has 3,869 UK impressions at avg
position 84. Google is showing UK pages to UK searchers but ranking them deep
because the geo signals are too weak. Explicit `hreflang` + `areaServed` is the
single highest-leverage Phase 1 action by expected ranking impact.

Approach (Option B from the C3 plan): hardcode the locale map per page path
here. The set of geo-targeted pages on finncalc is small (~20) and essentially
static, so encoding it as data in the script keeps the change self-contained
and easy to review. The data is mirrored in `_build/templates/partials/
head_meta.html` + `_build/templates/partials/head_schema.html` + `_build/
generate.py` for forward-compatibility (next full re-render of the site stays
aligned with the patcher output).

What it does, per in-scope page:
  1. Inject `<link rel="alternate" hreflang="..." href="...">` tags in <head>
     immediately after the existing <link rel="canonical">. For pages whose
     cluster includes localised siblings, emits all siblings + an x-default
     pointing at the parent. For standalone single-locale pages (UK/ZA blog
     posts, sa-tax-calculator, etc.), emits a single self-referencing hreflang.
  2. Augment the existing WebApplication or Article JSON-LD block with an
     `areaServed: { "@type": "Country", "name": "..." }` property.

Idempotency: if the page already declares the exact expected hreflang block
AND the expected areaServed Country, it's skipped. If the hreflang block is
present but stale, it's replaced. If areaServed is present but the country
name is different, it's overwritten.

Scope guard: only the explicitly inventoried paths from the C3 plan are
touched. Everything else is skipped.

Reference patterns:
  - `inject_author_schema_rendered.py` (C1) for the JSON-LD augmentation idiom
  - `inject_favicon_rendered.py` (favicon) for the link-tag injection pattern
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE_URL = "https://finncalc.com"

# Schema.org Country names per locale code.
COUNTRY_NAME = {
    "en-GB": "United Kingdom",
    "en-US": "United States",
    "en-ZA": "South Africa",
}

# A "cluster" describes a parent calculator page + its localised siblings. The
# parent page (no locale of its own) acts as the x-default. Every variant
# emits hreflang tags for itself + its siblings + x-default(parent).
#
# Each entry: parent_slug -> { locale -> variant_url_subpath }
# The parent itself appears under the synthetic "x-default" key (treated like
# a locale for cluster lookup; not emitted as hreflang="x-default" itself but
# as href targets).
CLUSTERS: dict[str, dict[str, str]] = {
    "compound-interest": {
        "en-GB": "compound-interest/uk/",
        "en-US": "compound-interest/us/",
        # No /za/ for this family
    },
    "inflation-impact": {
        "en-GB": "inflation-impact/uk/",
    },
    "investment-growth": {
        "en-GB": "investment-growth/uk/",
    },
    "mortgage": {
        "en-GB": "mortgage/uk/",
        "en-US": "mortgage/us/",
    },
    "retirement-savings": {
        "en-GB": "retirement-savings/uk/",
        "en-US": "retirement-savings/us/",
    },
    "take-home-pay": {
        "en-GB": "take-home-pay/uk/",
        "en-US": "take-home-pay/us/",
        "en-ZA": "take-home-pay/za/",
    },
}

# Per-page locale assignment. Built up below from the clusters + standalone
# single-locale pages (UK/ZA blog posts and country-specific calculators with
# no localised siblings).
#
# Each entry: rel_path -> {
#   "locale":       "en-GB" | "en-US" | "en-ZA",
#   "cluster":      parent_slug (str) or None for standalone single-locale,
#   "self_path":    URL path of this page (relative to SITE_URL, no leading /),
#   "schema_type":  "WebApplication" | "Article",
# }

PAGES: dict[str, dict[str, object]] = {}

# 1. Variant calculator pages (one entry per locale per cluster).
for parent_slug, locales in CLUSTERS.items():
    for locale, sub in locales.items():
        rel_html = sub.rstrip("/") + "/index.html"
        PAGES[rel_html] = {
            "locale": locale,
            "cluster": parent_slug,
            "self_path": sub,
            "schema_type": "WebApplication",
        }

# 2. Standalone country-specific calculator pages (no localised siblings,
#    so the page itself is the only hreflang tag emitted).
STANDALONE_CALCS: list[tuple[str, str]] = [
    ("isa-calculator/index.html", "en-GB"),
    ("sa-tax-calculator/index.html", "en-ZA"),
    ("stamp-duty-calculator/index.html", "en-GB"),
    ("tfsa-calculator/index.html", "en-ZA"),
]
for rel_html, locale in STANDALONE_CALCS:
    PAGES[rel_html] = {
        "locale": locale,
        "cluster": None,
        "self_path": rel_html[: -len("index.html")],
        "schema_type": "WebApplication",
    }

# 3. Country-themed blog posts (Article schema).
BLOG_POSTS: list[tuple[str, str]] = [
    ("blog/how-much-is-stamp-duty-uk/index.html", "en-GB"),
    ("blog/uk-national-insurance-explained/index.html", "en-GB"),
    ("blog/uk-personal-allowance-2024-25/index.html", "en-GB"),
    ("blog/uk-state-pension-guide/index.html", "en-GB"),
    ("blog/how-much-tax-on-r500000-south-africa/index.html", "en-ZA"),
    ("blog/retirement-planning-south-africa/index.html", "en-ZA"),
    ("blog/south-africa-tax-guide-2024/index.html", "en-ZA"),
    ("blog/what-is-paye-south-africa/index.html", "en-ZA"),
]
for rel_html, locale in BLOG_POSTS:
    PAGES[rel_html] = {
        "locale": locale,
        "cluster": None,
        "self_path": rel_html[: -len("index.html")],
        "schema_type": "Article",
    }


# Regex helpers (rendered HTML uses mixed indentation depending on page age,
# so the patterns are lenient on leading whitespace).

CANONICAL_LINE = re.compile(
    r'^([ \t]*)<link\s+rel="canonical"[^>]*>\s*\n',
    re.IGNORECASE | re.MULTILINE,
)

# Match the legacy hreflang block (any contiguous run of <link rel="alternate"
# hreflang="..."> lines, optionally with trailing whitespace and " />" or ">"
# self-closing variants).
HREFLANG_BLOCK = re.compile(
    r'(?:[ \t]*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*/?>\s*\n)+',
    re.IGNORECASE,
)

JSON_LD_BLOCK = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)


def _build_hreflang_block(page_meta: dict, indent: str) -> str:
    """Emit hreflang tags for one page in the order:
       en-GB, en-US, en-ZA (the variants present in the cluster, by locale),
       x-default (parent)."""
    cluster_name = page_meta["cluster"]
    if cluster_name and cluster_name in CLUSTERS:
        locales = CLUSTERS[cluster_name]
        lines: list[str] = []
        for locale_key in ("en-GB", "en-US", "en-ZA"):
            if locale_key in locales:
                href = f"{SITE_URL}/{locales[locale_key]}"
                lines.append(
                    f'{indent}<link rel="alternate" hreflang="{locale_key}" href="{href}">\n'
                )
        # x-default → parent
        parent_href = f"{SITE_URL}/{cluster_name}/"
        lines.append(
            f'{indent}<link rel="alternate" hreflang="x-default" href="{parent_href}">\n'
        )
        return "".join(lines)
    # Standalone single-locale page (no siblings)
    locale = page_meta["locale"]
    href = f"{SITE_URL}/{page_meta['self_path']}"
    return f'{indent}<link rel="alternate" hreflang="{locale}" href="{href}">\n'


def _existing_hreflang_block(text: str) -> tuple[int, int] | None:
    """Locate the contiguous run of hreflang lines if present. Returns the
    span (start, end) into `text` of the block, or None."""
    match = HREFLANG_BLOCK.search(text)
    if not match:
        return None
    return match.span()


def _inject_hreflang(text: str, page_meta: dict) -> tuple[str, bool]:
    """Insert (or replace) the hreflang block after <link rel=canonical>.
    Returns (new_text, changed)."""
    canonical_match = CANONICAL_LINE.search(text)
    if not canonical_match:
        # Should not happen on inventoried pages, but degrade gracefully.
        return text, False
    indent = canonical_match.group(1)
    desired = _build_hreflang_block(page_meta, indent)

    span = _existing_hreflang_block(text)
    if span is not None:
        start, end = span
        # Replace the legacy block in place. Only mark as changed if the
        # serialised text actually differs.
        current = text[start:end]
        if current == desired:
            return text, False
        new_text = text[:start] + desired + text[end:]
        return new_text, True

    # No existing block — insert immediately after canonical line.
    insertion = canonical_match.end()
    new_text = text[:insertion] + desired + text[insertion:]
    return new_text, True


def _augment_schema(text: str, page_meta: dict) -> tuple[str, bool]:
    """Add or normalise `areaServed: Country` on the page's WebApplication or
    Article JSON-LD block. Returns (new_text, changed)."""
    target_type = page_meta["schema_type"]
    country_name = COUNTRY_NAME[page_meta["locale"]]
    desired_area = {"@type": "Country", "name": country_name}
    changed = False

    def _replace(match: re.Match) -> str:
        nonlocal changed
        raw = match.group(1)
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return match.group(0)
        if not isinstance(obj, dict):
            return match.group(0)
        if obj.get("@type") != target_type:
            return match.group(0)
        existing = obj.get("areaServed")
        if isinstance(existing, dict) and existing.get("@type") == "Country" and existing.get("name") == country_name:
            return match.group(0)
        obj["areaServed"] = dict(desired_area)
        changed = True
        # Match the in-line serialisation style used elsewhere on the page
        # (compact, sorted keys — same as generate.py via `tojson` filter and
        # the C1 patcher).
        return (
            '<script type="application/ld+json">'
            + json.dumps(obj, sort_keys=True, ensure_ascii=False)
            + '</script>'
        )

    new_text = JSON_LD_BLOCK.sub(_replace, text)
    return new_text, changed


def patch_one(path: Path, page_meta: dict) -> tuple[bool, bool]:
    """Apply both patches to a single page. Returns (hreflang_changed,
    schema_changed)."""
    text = path.read_text(encoding="utf-8")
    text, hreflang_changed = _inject_hreflang(text, page_meta)
    text, schema_changed = _augment_schema(text, page_meta)
    if hreflang_changed or schema_changed:
        path.write_text(text, encoding="utf-8")
    return hreflang_changed, schema_changed


def main() -> int:
    updated: list[str] = []
    already_current: list[str] = []
    out_of_scope_skipped = 0
    missing: list[str] = []

    for rel, page_meta in PAGES.items():
        path = REPO / rel
        if not path.exists():
            missing.append(rel)
            continue
        href_c, sch_c = patch_one(path, page_meta)
        if href_c or sch_c:
            tags = []
            if href_c:
                tags.append("hreflang")
            if sch_c:
                tags.append("areaServed")
            print(f"  patched ({'+'.join(tags)}): {rel}")
            updated.append(rel)
        else:
            already_current.append(rel)

    # We don't enumerate the whole tree because the scope is the explicit
    # PAGES list — anything else is out-of-scope by definition. The count
    # here is informational: it's the number of inventoried paths that
    # didn't need a change.
    print()
    print(
        f"{len(updated)} updated, {len(already_current)} already-current, "
        f"{len(missing)} missing (out of scope or path not present)."
    )
    if missing:
        for rel in missing:
            print(f"  [skip] missing: {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
