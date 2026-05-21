"""List every <img> across body and blog HTML that lacks an alt attribute."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
GLOB_ROOTS = ["_build/bodies", "blog"]
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
HAS_ALT = re.compile(r'\balt\s*=', re.IGNORECASE)


def audit_file(path: Path) -> list[str]:
    offenders = []
    text = path.read_text(encoding="utf-8")
    for match in IMG_TAG.finditer(text):
        tag = match.group(0)
        if not HAS_ALT.search(tag):
            offenders.append(tag)
    return offenders


def main() -> int:
    total = 0
    for root in GLOB_ROOTS:
        base = REPO / root
        if not base.exists():
            continue
        for html in base.rglob("*.html"):
            offenders = audit_file(html)
            if offenders:
                print(f"\n{html.relative_to(REPO)} - {len(offenders)} <img> without alt:")
                for tag in offenders:
                    print(f"  {tag[:120]}")
                total += len(offenders)
    print(f"\nTotal <img> tags missing alt: {total}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
