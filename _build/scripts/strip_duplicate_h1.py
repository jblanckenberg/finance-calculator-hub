"""Strip leading <h1>...</h1> from body files. Idempotent."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BODIES = REPO / "_build" / "bodies"
H1_LEADING = re.compile(
    r"[ \t]*<h1\b[^>]*>.*?</h1>[ \t]*\n?",
    re.IGNORECASE | re.DOTALL,
)


def strip_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    cleaned = H1_LEADING.sub("", original, count=1)
    if cleaned == original:
        return False
    path.write_text(cleaned, encoding="utf-8")
    return True


def main() -> int:
    changed = []
    for body in sorted(BODIES.glob("*.html")):
        if strip_file(body):
            changed.append(body.name)
    if changed:
        print(f"Stripped <h1> from {len(changed)} body files:")
        for name in changed:
            print(f"  - {name}")
    else:
        print("No body files contained a leading <h1>. Nothing to change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
