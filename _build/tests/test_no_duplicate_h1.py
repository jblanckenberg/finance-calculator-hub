import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
BODIES = REPO / "_build" / "bodies"
H1 = re.compile(r"<h1\b", re.IGNORECASE)


@pytest.mark.parametrize("body_path", sorted(BODIES.glob("*.html")), ids=lambda p: p.name)
def test_body_file_has_no_h1(body_path):
    """Body files must not contain <h1> — _base.html renders it from calculators.json."""
    text = body_path.read_text(encoding="utf-8")
    assert not H1.search(text), (
        f"{body_path.name} contains <h1> — base template already renders one. "
        "Remove the leading <h1> from this body file."
    )
