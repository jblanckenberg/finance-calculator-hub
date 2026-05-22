import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
BODIES = REPO / "_build" / "bodies"
IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
HAS_ALT = re.compile(r'\balt\s*=', re.IGNORECASE)


@pytest.mark.parametrize("body", sorted(BODIES.glob("*.html")), ids=lambda p: p.name)
def test_body_images_have_alt(body):
    text = body.read_text(encoding="utf-8")
    offenders = [t.group(0) for t in IMG_TAG.finditer(text) if not HAS_ALT.search(t.group(0))]
    assert not offenders, f"{body.name} has {len(offenders)} <img> without alt: {offenders[:2]}"
