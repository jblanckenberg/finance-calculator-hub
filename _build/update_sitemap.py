"""Walk the rendered FC tree and emit sitemap.xml."""
from __future__ import annotations

import datetime as _dt
from pathlib import Path

EXCLUDES = frozenset({"node_modules", ".git", "__pycache__", "_build", "fonts", "img", "js", "css", "site"})
DEFAULT_BASE = "https://finncalc.com"

def _url_from(html_path: Path, root: Path, base: str) -> str:
    rel = html_path.relative_to(root).parent.as_posix()
    if rel == ".":
        return f"{base}/"
    return f"{base}/{rel}/"

def _is_variant_url(url: str, base: str) -> bool:
    """Variant URL = /calc/variant/. Exactly two non-empty segments after base."""
    suffix = url[len(base):].strip("/")
    parts = [p for p in suffix.split("/") if p]
    return len(parts) == 2

def _collect(root: Path) -> list[Path]:
    out: list[Path] = []
    for p in root.rglob("index.html"):
        rel_parts = p.relative_to(root).parts
        if any(part in EXCLUDES for part in rel_parts):
            continue
        out.append(p)
    return sorted(out)

def build_sitemap(*, root: Path, base_url: str = DEFAULT_BASE) -> str:
    today = _dt.date.today().isoformat()
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for html in _collect(root):
        url = _url_from(html, root, base_url)
        priority = "0.7" if _is_variant_url(url, base_url) else ("1.0" if url == f"{base_url}/" else "0.8")
        parts.extend([
            "  <url>",
            f"    <loc>{url}</loc>",
            f"    <lastmod>{today}</lastmod>",
            "    <changefreq>monthly</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ])
    parts.append("</urlset>")
    return "\n".join(parts) + "\n"

def write_sitemap(*, root: Path, base_url: str = DEFAULT_BASE) -> int:
    xml = build_sitemap(root=root, base_url=base_url)
    target = root / "sitemap.xml"
    target.write_text(xml, encoding="utf-8")
    return xml.count("<url>")

if __name__ == "__main__":
    import sys
    root = Path(__file__).resolve().parent.parent
    if "--apply" in sys.argv:
        n = write_sitemap(root=root)
        print(f"[apply] wrote sitemap.xml with {n} URLs")
    else:
        n = build_sitemap(root=root).count("<url>")
        print(f"[dry-run] sitemap would contain {n} URLs")
