"""Insert comparison page URLs into the hand-maintained sitemap.xml.

Strategy (Scenario B — sitemap is hand-maintained, not regenerated):
  - Read data/comparisons.json
  - Build URL set for: /compare/ (index) + each published /compare/<slug>/
  - For each missing URL, insert a <url> block before the closing </urlset>
  - Idempotent: skips URLs already present
  - Default = dry-run; pass --apply to write

CLI:
  python _build/update_sitemap_comparisons.py
  python _build/update_sitemap_comparisons.py --apply
"""
from __future__ import annotations

import datetime as _dt
import json
import sys
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
ROOT_DIR = BUILD_DIR.parent
DATA_FILE = BUILD_DIR / "data" / "comparisons.json"
SITEMAP_FILE = ROOT_DIR / "sitemap.xml"

SITE_URL = "https://finncalc.com"


def planned_urls(data: dict) -> list[tuple[str, str]]:
    """Return [(url, priority)] for the comparisons index + every published comparison."""
    out: list[tuple[str, str]] = [(f"{SITE_URL}/compare/", "0.8")]
    for c in data["comparisons"]:
        if c.get("status") != "published":
            continue
        out.append((f"{SITE_URL}/compare/{c['slug']}/", "0.8"))
    return out


def _block(url: str, priority: str, today: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{url}</loc>\n"
        f"    <lastmod>{today}</lastmod>\n"
        "    <changefreq>monthly</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>\n"
    )


def update_sitemap(*, apply: bool) -> tuple[list[str], list[str]]:
    """Return (added_urls, already_present_urls)."""
    if not SITEMAP_FILE.exists():
        raise SystemExit(f"sitemap not found at {SITEMAP_FILE}")
    sitemap_text = SITEMAP_FILE.read_text(encoding="utf-8")
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    today = _dt.date.today().isoformat()

    added: list[str] = []
    present: list[str] = []
    new_text = sitemap_text
    for url, priority in planned_urls(data):
        if f"<loc>{url}</loc>" in new_text:
            present.append(url)
            continue
        block = _block(url, priority, today)
        if "</urlset>" not in new_text:
            raise SystemExit("malformed sitemap: missing </urlset>")
        new_text = new_text.replace("</urlset>", block + "</urlset>")
        added.append(url)

    if apply and added:
        SITEMAP_FILE.write_text(new_text, encoding="utf-8")
    return added, present


if __name__ == "__main__":
    apply = "--apply" in sys.argv
    added, present = update_sitemap(apply=apply)
    if apply:
        print(f"[apply] sitemap.xml: added {len(added)} URL(s), {len(present)} already present")
    else:
        print(f"[dry-run] would add {len(added)} URL(s), {len(present)} already present")
    for u in added:
        print(f"  + {u}")
    for u in present:
        print(f"  = {u} (already present)")
