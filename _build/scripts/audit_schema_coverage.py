"""Scan every calculator + variant rendered page; report which JSON-LD
schemas are present and which are missing. Pure read-only.

EXPECTED_TYPES is the contract every calc page should meet. Any page
showing missing types is a gap - fix in Phase 2B."""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXPECTED_TYPES = {"WebApplication", "HowTo", "FAQPage", "Article",
                  "BreadcrumbList", "Organization", "Person"}

TYPE_RE = re.compile(r'"@type"\s*:\s*"([A-Za-z]+)"')


def audit_one(html: str) -> dict:
    types = set(TYPE_RE.findall(html))
    return {
        "types_present": sorted(types & EXPECTED_TYPES),
        "types_missing": sorted(EXPECTED_TYPES - types),
        "extra_types": sorted(types - EXPECTED_TYPES),
    }


def audit_all() -> dict:
    calcs = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))
    out: dict = {}
    for slug in calcs:
        page = REPO / slug / "index.html"
        if not page.exists():
            out[slug] = {"error": "missing page"}
            continue
        out[slug] = audit_one(page.read_text(encoding="utf-8"))
    return out


def main():
    report = audit_all()
    out = REPO / "_build/data/schema_coverage_report.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    gaps = {s: r for s, r in report.items() if r.get("types_missing")}
    print(f"Wrote {out}.")
    print(f"{len(gaps)}/{len(report)} pages have missing schema types.")
    for slug, r in gaps.items():
        print(f"  {slug}: missing {r['types_missing']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
