"""Jinja2-based static site generator for FinCalcHub.

Reads:
  data/calculators.json
  data/variants.json
  bodies/<slug>.html        (per-calc raw body — extracted during migration)

Writes:
  <slug>/index.html                  for each calculator
  <slug>/<variant_slug>/index.html   for each variant
"""
from __future__ import annotations

import datetime as _dt
import html as _html
import json
import re as _re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from jinja2 import Environment, FileSystemLoader, select_autoescape

SITE_URL = "https://finncalc.com"

OPERATOR_STUB_PREFIX = "[OPERATOR_TO_FILL:"

_BOLD_RE = _re.compile(r"\*\*([^*]+)\*\*")


def is_operator_stub(intro: str) -> bool:
    return intro.startswith(OPERATOR_STUB_PREFIX)

def paragraphs_from(text: str) -> list[str]:
    return [p.strip() for p in text.split("\n\n") if p.strip()]

def _inline(text: str) -> str:
    """Escape HTML then convert **bold** to <strong>."""
    escaped = _html.escape(text)
    return _BOLD_RE.sub(r"<strong>\1</strong>", escaped)

def render_intro_html(intro: str) -> str:
    """Convert minimal-markdown intro to safe HTML.

    - Splits paragraphs on \\n\\n.
    - Any paragraph whose every non-empty line begins with '- ' becomes a <ul>.
    - Other paragraphs become <p>.
    - **bold** spans inside any text become <strong>.
    - All other content is HTML-escaped (safe to pass through Jinja `| safe`).
    """
    out_parts: list[str] = []
    for para in paragraphs_from(intro):
        lines = [l.strip() for l in para.split("\n") if l.strip()]
        is_list = bool(lines) and all(l.startswith("- ") for l in lines)
        if is_list:
            items = "\n".join(f"  <li>{_inline(l[2:])}</li>" for l in lines)
            out_parts.append(f"<ul>\n{items}\n</ul>")
        else:
            out_parts.append(f"<p>{_inline(para)}</p>")
    return "\n".join(out_parts)

def build_web_application_ld(
    *, slug: str, name: str, description: str, parent_slug: str | None
) -> dict:
    """Emits the SoftwareApplication / WebApplication JSON-LD object."""
    if parent_slug is None:
        url = f"{SITE_URL}/{slug}/"
        ld: dict = {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": name,
            "description": description,
            "url": url,
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web Browser",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        }
        return ld
    parent_url = f"{SITE_URL}/{parent_slug}/"
    url = f"{parent_url}{slug}/"
    return {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": name,
        "description": description,
        "url": url,
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web Browser",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "isPartOf": {"@type": "WebApplication", "@id": parent_url},
    }

def build_breadcrumb_ld(*, items: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": label, "item": url}
            for i, (label, url) in enumerate(items)
        ],
    }

def build_faq_ld(faq: Iterable[dict]) -> dict:
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


@dataclass
class Renderer:
    template_dir: Path

    def __post_init__(self) -> None:
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(["html"]),
            keep_trailing_newline=True,
        )

    def _common_ctx(self, *, page_title: str, page_description: str, canonical_url: str, h1: str, subtitle: str, breadcrumb_items: list[tuple[str, str]]) -> dict:
        crumbs_html_parts: list[str] = []
        for i, (label, url) in enumerate(breadcrumb_items):
            if i == 0:
                crumbs_html_parts.append(f'<a href="{url}">{label}</a>')
            elif i < len(breadcrumb_items) - 1:
                crumbs_html_parts.append(f' › <a href="{url}">{label}</a>')
            else:
                crumbs_html_parts.append(f" › {label}")
        return {
            "page_title": page_title,
            "page_description": page_description,
            "canonical_url": canonical_url,
            "h1": h1,
            "subtitle": subtitle,
            "current_year": _dt.date.today().year,
            "breadcrumb_html": "".join(crumbs_html_parts),
        }

    def render_calculator(self, *, slug: str, data: dict, body_html: str) -> str:
        canonical = f"{SITE_URL}/{slug}/"
        ctx = self._common_ctx(
            page_title=data["title"],
            page_description=data["description"],
            canonical_url=canonical,
            h1=data["h1"],
            subtitle=data["subtitle"],
            breadcrumb_items=[("Home", f"{SITE_URL}/"), (data["name"], canonical)],
        )
        ctx["robots"] = "index, follow"
        ctx["web_application_ld"] = build_web_application_ld(
            slug=slug, name=data["name"], description=data["description"], parent_slug=None,
        )
        ctx["breadcrumb_ld"] = build_breadcrumb_ld(items=[
            ("Home", f"{SITE_URL}/"), (data["name"], canonical),
        ])
        ctx["faq_ld"] = build_faq_ld(data["faq"]) if data.get("faq") else None
        ctx["howto_ld"] = None
        ctx["body_html"] = body_html
        tpl = self.env.get_template("calculator.html")
        return tpl.render(**ctx)

    def render_variant(self, *, parent_slug: str, parent_data: dict, variant_data: dict, body_html: str) -> str:
        canonical = f"{SITE_URL}/{parent_slug}/{variant_data['slug']}/"
        h1 = f"{parent_data['h1']}{variant_data['h1Suffix']}"
        intro = variant_data["intro"]
        stub = is_operator_stub(intro)
        ctx = self._common_ctx(
            page_title=variant_data["title"],
            page_description=variant_data["description"],
            canonical_url=canonical,
            h1=h1,
            subtitle=parent_data["subtitle"],
            breadcrumb_items=[
                ("Home", f"{SITE_URL}/"),
                (parent_data["name"], f"{SITE_URL}/{parent_slug}/"),
                (variant_data["label"], canonical),
            ],
        )
        ctx["robots"] = "noindex, follow" if stub else "index, follow"
        ctx["web_application_ld"] = build_web_application_ld(
            slug=variant_data["slug"],
            name=variant_data["title"].replace(" | FinCalcHub", ""),
            description=variant_data["description"],
            parent_slug=parent_slug,
        )
        ctx["breadcrumb_ld"] = build_breadcrumb_ld(items=[
            ("Home", f"{SITE_URL}/"),
            (parent_data["name"], f"{SITE_URL}/{parent_slug}/"),
            (variant_data["label"], canonical),
        ])
        ctx["faq_ld"] = None
        ctx["howto_ld"] = None
        ctx["body_html"] = body_html
        ctx["intro"] = intro
        ctx["intro_is_stub"] = stub
        ctx["intro_paragraphs"] = paragraphs_from(intro) if not stub else []
        ctx["intro_html"] = render_intro_html(intro) if not stub else ""
        tpl = self.env.get_template("variant.html")
        return tpl.render(**ctx)


def write_all(*, apply: bool, root: Path | None = None) -> int:
    """Write every calculator + variant page. Returns count of files written (apply) or N/A (dry-run)."""
    root = root or Path(__file__).resolve().parent.parent
    build_dir = Path(__file__).resolve().parent
    renderer = Renderer(template_dir=build_dir / "templates")
    calcs = json.loads((build_dir / "data" / "calculators.json").read_text(encoding="utf-8"))
    variants = json.loads((build_dir / "data" / "variants.json").read_text(encoding="utf-8"))

    written = 0
    for slug, data in calcs.items():
        body_path = build_dir / "bodies" / f"{slug}.html"
        if not body_path.exists():
            print(f"[skip] no body file for {slug}")
            continue
        body_html = body_path.read_text(encoding="utf-8")
        out = renderer.render_calculator(slug=slug, data=data, body_html=body_html)
        target = root / slug / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        if apply:
            target.write_text(out, encoding="utf-8")
            written += 1
        else:
            print(f"[dry-run] would write {target.relative_to(root)} ({len(out)} chars)")

    for parent_slug, variant_map in variants.items():
        parent_data = calcs.get(parent_slug)
        if parent_data is None:
            print(f"[skip] variant for unknown calc {parent_slug}")
            continue
        body_path = build_dir / "bodies" / f"{parent_slug}.html"
        if not body_path.exists():
            print(f"[skip] no parent body for {parent_slug}")
            continue
        body_html = body_path.read_text(encoding="utf-8")
        for variant_slug, variant_data in variant_map.items():
            out = renderer.render_variant(
                parent_slug=parent_slug,
                parent_data=parent_data,
                variant_data=variant_data,
                body_html=body_html,
            )
            target = root / parent_slug / variant_slug / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            if apply:
                target.write_text(out, encoding="utf-8")
                written += 1
            else:
                print(f"[dry-run] would write {target.relative_to(root)} ({len(out)} chars)")

    return written


if __name__ == "__main__":
    import sys
    apply = "--apply" in sys.argv
    n = write_all(apply=apply)
    if apply:
        print(f"[apply] wrote {n} files")
    else:
        print("[dry-run] (use --apply to write)")
