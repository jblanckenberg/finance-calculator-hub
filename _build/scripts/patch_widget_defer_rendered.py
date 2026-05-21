"""Propagate widget-defer / lazy-load changes from sources into every rendered
index.html.

Why this exists: operator policy forbids re-running `_build/generate.py`
(rebuild rolls dateModified + nav). So template-level changes cannot
reach the deployed site unless this script hand-edits the rendered
output directly. Same pattern as `patch_async_css_rendered.py`,
`strip_duplicate_h1_rendered.py`, `inject_favicon_rendered.py`,
`patch_titles_rendered.py`.

Three patches:

1. Add `defer` to the universal `<script src="/js/region.js">` and
   `<script src="/js/main.js">` lines emitted by `_build/templates/_base.html`.
   These currently render-block every calculator page.

2. Replace the in-body inline Take-Home Pay calculator JS (~207 lines
   starting with `function _bracketTax(`) with a deferred reference to
   the extracted `/js/calc/take-home-pay.js`. Applies to the rendered
   `take-home-pay/index.html` only (this is the source body, no
   variants).

3. Replace the in-body inline Savings Goal calculator JS (~78 lines
   starting with `<script>\nfunction calculate(){` followed by the
   `target`/`current`/`monthly`/`rate` getElementById calls) with a
   deferred reference to `/js/calc/savings-goal.js`. Applies to the
   rendered `savings-goal/index.html` AND all variant pages that
   re-use that body via `variant.html` (e.g.
   `savings-goal/house-deposit/index.html`).

All three patches are idempotent: re-running on an already-patched page
is a no-op.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}


# ----- Patch 1: defer region.js + main.js -----------------------------------

REGION_RE = re.compile(
    r'<script\s+src="/js/region\.js"(?P<attrs>[^>]*)>\s*</script>',
    re.IGNORECASE,
)
MAIN_RE = re.compile(
    r'<script\s+src="/js/main\.js"(?P<attrs>[^>]*)>\s*</script>',
    re.IGNORECASE,
)


def _ensure_defer(match: re.Match) -> str:
    attrs = match.group("attrs") or ""
    if re.search(r'\b(defer|async)\b', attrs, re.IGNORECASE):
        # Already has defer or async — leave untouched.
        return match.group(0)
    src_attr = 'src="/js/region.js"' if 'region.js' in match.group(0) else 'src="/js/main.js"'
    return f'<script {src_attr} defer></script>'


# ----- Patch 2: extract inline take-home-pay calc JS ------------------------

# The inline block lives in the rendered take-home-pay/index.html starting
# at `<script src="/js/embed-cta.js" defer></script>\n<script>\n// Take-Home Pay`
# and runs to the closing `</script>` immediately after the
# `DOMContentLoaded` listener. We match from the embed-cta line through the
# inline block end-tag inclusively, and replace with the embed-cta line +
# a deferred external <script>.

TAKE_HOME_INLINE_RE = re.compile(
    r'<script\s+src="/js/embed-cta\.js"\s+defer></script>\s*'
    r'<script>\s*\n?// Take-Home Pay.*?</script>',
    re.IGNORECASE | re.DOTALL,
)

TAKE_HOME_REPLACEMENT = (
    '<script src="/js/embed-cta.js" defer></script>\n'
    '<script src="/js/calc/take-home-pay.js" defer></script>'
)


# ----- Patch 3: extract inline savings-goal calc JS -------------------------

# The savings-goal inline block in the rendered HTML matches the source body:
# starts with `<script>\nfunction calculate(){` followed by the four specific
# getElementById calls for target/current/monthly/rate. That signature is
# unique to the savings-goal calculator body so it won't collide with other
# calculator pages that also have `function calculate(){` (e.g. mortgage,
# loan-payoff use different IDs).

SAVINGS_GOAL_INLINE_RE = re.compile(
    r'<script>\s*\n'
    r'function calculate\(\)\{\s*\n'
    r"\s*var target\s*=\s*parseFloat\(document\.getElementById\('target'\)\.value\).*?"
    r'</script>',
    re.IGNORECASE | re.DOTALL,
)

SAVINGS_GOAL_REPLACEMENT = '<script src="/js/calc/savings-goal.js" defer></script>'


def patch(text: str, rel: str) -> tuple[str, list[str]]:
    """Apply all three patches. Returns the new text + a list of which
    patches actually changed something on this page."""
    applied: list[str] = []

    # Patch 1: defer region.js + main.js. Universal — applies to every page
    # that includes them.
    new_text, n_region = REGION_RE.subn(_ensure_defer, text)
    if n_region and new_text != text:
        applied.append(f"defer-region.js×{n_region}")
        text = new_text
    new_text, n_main = MAIN_RE.subn(_ensure_defer, text)
    if n_main and new_text != text:
        applied.append(f"defer-main.js×{n_main}")
        text = new_text

    # Patch 2: on the take-home-pay page AND its region-locked variants
    # (/take-home-pay/uk/, /us/, /za/) which re-use the same inline body.
    if rel.startswith("take-home-pay/") and rel.endswith("index.html"):
        new_text, n = TAKE_HOME_INLINE_RE.subn(TAKE_HOME_REPLACEMENT, text)
        if n and new_text != text:
            applied.append(f"extract-take-home-pay×{n}")
            text = new_text

    # Patch 3: on the savings-goal page AND any variant that re-uses its body
    # (e.g. /savings-goal/house-deposit/, /savings-goal/wedding/, etc.).
    if rel.startswith("savings-goal/") and rel.endswith("index.html"):
        new_text, n = SAVINGS_GOAL_INLINE_RE.subn(SAVINGS_GOAL_REPLACEMENT, text)
        if n and new_text != text:
            applied.append(f"extract-savings-goal×{n}")
            text = new_text

    return text, applied


def iter_rendered_pages() -> list[Path]:
    pages = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


def main() -> int:
    changed_count = 0
    for page in iter_rendered_pages():
        rel = page.relative_to(REPO).as_posix()
        text = page.read_text(encoding="utf-8")
        new_text, applied = patch(text, rel)
        if applied and new_text != text:
            page.write_text(new_text, encoding="utf-8")
            print(f"updated: {rel} [{', '.join(applied)}]")
            changed_count += 1
    if changed_count:
        print(f"\nUpdated widget-defer patterns in {changed_count} rendered pages.")
    else:
        print("All rendered pages already have widget-defer patterns. No changes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
