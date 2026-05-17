"""Render comparison article pages from data/comparisons.json.

Reads:
  data/comparisons.json
  schemas/comparison.schema.json
  data/author.json
  templates/comparison.html      (extends _base.html)
  templates/comparisons/<slug>.html

Writes:
  <repo_root>/compare/<slug>/index.html   for each `status: "published"` entry

CLI:
  python _build/generate_comparisons.py            # dry-run
  python _build/generate_comparisons.py --apply    # write files
  python _build/generate_comparisons.py --include-drafts --apply
  python _build/generate_comparisons.py --only-slug compound-interest-vs-simple-interest --apply
"""
from __future__ import annotations

import datetime as _dt
import json
import sys
from pathlib import Path

import jsonschema
from jinja2 import Environment, FileSystemLoader, select_autoescape

SITE_URL = "https://finncalc.com"

# Keep in sync with generate.py — surfaces in the editorial block at the foot
# of every comparison page so the byline matches the calc pages.
LAST_REVIEWED_ISO = "2026-05-17"
LAST_REVIEWED_DISPLAY = "17 May 2026"

BUILD_DIR = Path(__file__).resolve().parent
ROOT_DIR = BUILD_DIR.parent
TEMPLATE_DIR = BUILD_DIR / "templates"
DATA_FILE = BUILD_DIR / "data" / "comparisons.json"
SCHEMA_FILE = BUILD_DIR / "schemas" / "comparison.schema.json"
AUTHOR_FILE = BUILD_DIR / "data" / "author.json"


def load_data() -> dict:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def load_schema() -> dict:
    return json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))


def load_author() -> dict:
    return json.loads(AUTHOR_FILE.read_text(encoding="utf-8"))


def validate_all(data: dict, schema: dict) -> None:
    for c in data["comparisons"]:
        jsonschema.validate(instance=c, schema=schema)


def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
        keep_trailing_newline=True,
    )


def build_article_ld(*, comparison: dict, author: dict, canonical_url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": comparison["title"],
        "description": comparison["description"],
        "datePublished": comparison["publishedDate"],
        "dateModified": comparison["updatedDate"],
        "author": {
            "@type": "Person",
            "name": author["name"],
            "jobTitle": author.get("jobTitle", ""),
            "url": author.get("url", ""),
            "sameAs": author.get("sameAs", []),
        },
        "publisher": {
            "@type": "Organization",
            "name": "FinCalcHub",
            "url": SITE_URL + "/",
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonical_url,
        },
    }


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


def build_breadcrumb_ld(*, comparison: dict, canonical_url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Comparisons", "item": f"{SITE_URL}/compare/"},
            {"@type": "ListItem", "position": 3, "name": comparison["title"], "item": canonical_url},
        ],
    }


def build_breadcrumb_html(comparison: dict) -> str:
    return (
        f'<a href="{SITE_URL}/">Home</a>'
        f' &rsaquo; <a href="{SITE_URL}/compare/">Comparisons</a>'
        f' &rsaquo; {comparison["title"]}'
    )


def render_one(comparison: dict, author: dict, *, env: Environment | None = None) -> str:
    env = env or _env()
    canonical = f"{SITE_URL}/compare/{comparison['slug']}/"
    ctx = {
        # _base.html / partials standard context
        "page_title": comparison["title"] + " | FinCalcHub",
        "page_description": comparison["description"],
        "canonical_url": canonical,
        "h1": comparison["h1"],
        "subtitle": comparison["subtitle"],
        "current_year": _dt.date.today().year,
        "breadcrumb_html": build_breadcrumb_html(comparison),
        "robots": "index, follow" if comparison["status"] == "published" else "noindex, follow",
        # head_schema.html JSON-LD vars left None so the calculator-style blocks are skipped
        "web_application_ld": None,
        "faq_ld": None,
        "breadcrumb_ld": None,
        "howto_ld": None,
        # editorial block (rendered by _base.html)
        "last_reviewed_iso": LAST_REVIEWED_ISO,
        "last_reviewed_display": LAST_REVIEWED_DISPLAY,
        # comparison-specific
        "comparison": comparison,
        "author": author,
        "article_ld": build_article_ld(comparison=comparison, author=author, canonical_url=canonical),
        "comparison_faq_ld": build_faq_ld(comparison["faq"]),
        "comparison_breadcrumb_ld": build_breadcrumb_ld(comparison=comparison, canonical_url=canonical),
    }
    tpl = env.get_template("comparison.html")
    return tpl.render(**ctx)


def write_one(comparison: dict, html: str, *, root: Path | None = None) -> Path:
    root = root or ROOT_DIR
    target = root / "compare" / comparison["slug"] / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")
    return target


def render_all(
    *,
    apply: bool = True,
    only_slug: str | None = None,
    include_drafts: bool = False,
    root: Path | None = None,
) -> list[Path]:
    data = load_data()
    validate_all(data, load_schema())
    author = load_author()
    env = _env()
    written: list[Path] = []
    skipped_drafts: list[str] = []
    for c in data["comparisons"]:
        if only_slug and c["slug"] != only_slug:
            continue
        if c["status"] != "published" and not include_drafts:
            skipped_drafts.append(c["slug"])
            continue
        html = render_one(c, author, env=env)
        if apply:
            target = write_one(c, html, root=root)
            written.append(target)
        else:
            print(f"[dry-run] would write compare/{c['slug']}/index.html ({len(html)} chars)")
    if skipped_drafts:
        print(f"[info] skipped drafts: {', '.join(skipped_drafts)}")
    return written


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    include_drafts = "--include-drafts" in sys.argv
    only_slug: str | None = None
    if "--only-slug" in sys.argv:
        idx = sys.argv.index("--only-slug")
        if idx + 1 < len(sys.argv):
            only_slug = sys.argv[idx + 1]
    files = render_all(apply=apply, only_slug=only_slug, include_drafts=include_drafts)
    if apply:
        print(f"[apply] wrote {len(files)} comparison files")
    else:
        print("[dry-run] (use --apply to write)")
