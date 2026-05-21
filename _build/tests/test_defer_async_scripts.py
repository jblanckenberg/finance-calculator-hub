"""Regression gate for Task 8 (audit MEDIUM: defer widget JS).

For the 6 audit-flagged slow pages (dom_complete > 3s), assert every external
<script> in the document has either `defer` or `async` so it doesn't block
HTML parsing / DOM ready. Third-party analytics that already use `async`
(Google Tag Manager) or `defer` (Plausible) satisfy the assertion as-is;
Microsoft Clarity uses dynamic injection (`async=1` on the dynamically
created <script>) so its bootstrap <script> contains no `src` attribute
and is not counted by this gate.

If this test fails, it means a new external <script src="…"> without
defer/async was added to one of the slow pages. Either add `defer` (best
default) / `async` (analytics) or extract the inline bootstrap to
`/js/calc/<slug>.js`.
"""
import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]

SLOW_PAGES = [
    "take-home-pay/index.html",
    "blog/how-much-house-can-i-afford/index.html",
    "debt-snowball-calculator/index.html",
    "savings-goal/house-deposit/index.html",
    "blog/uk-personal-allowance-2024-25/index.html",
    "blog/what-is-paye-south-africa/index.html",
]

# External <script> tag matcher: opens with `<script` and has a `src="..."`
# attribute somewhere inside the tag before the closing `>`. Matches one
# full opening tag at a time, including across line breaks (some rendered
# pages wrap tag attributes onto multiple lines).
EXTERNAL_SCRIPT = re.compile(r'<script\b[^>]*\bsrc\s*=\s*"[^"]+"[^>]*>', re.IGNORECASE | re.DOTALL)

# Permissive defer/async detector — either keyword present anywhere in the tag.
HAS_DEFER_OR_ASYNC = re.compile(r'\b(defer|async)\b', re.IGNORECASE)


@pytest.mark.parametrize("rel", SLOW_PAGES, ids=lambda p: p.replace("/", "_"))
def test_external_scripts_have_defer_or_async(rel: str) -> None:
    path = REPO / rel
    if not path.exists():
        pytest.skip(f"{rel} not present")
    text = path.read_text(encoding="utf-8")
    offenders: list[str] = []
    for tag in EXTERNAL_SCRIPT.finditer(text):
        if not HAS_DEFER_OR_ASYNC.search(tag.group(0)):
            offenders.append(tag.group(0))
    assert not offenders, (
        f"{rel} has {len(offenders)} render-blocking external scripts: "
        f"{offenders[:2]}"
    )
