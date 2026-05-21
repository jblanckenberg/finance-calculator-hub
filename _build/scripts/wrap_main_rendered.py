"""Propagate the <main id="content"> wrapper from _base.html into every
rendered index.html.

Why this exists: operator policy forbids re-running `_build/generate.py`
(rebuild rolls dateModified + nav). So template-level changes cannot
reach the deployed site unless this script hand-edits the rendered
output directly. Same pattern as `patch_async_css_rendered.py`,
`strip_duplicate_h1_rendered.py`, `inject_favicon_rendered.py`,
`patch_titles_rendered.py`.

The change being injected:
  - <main id="content"> right after the rendered header.html include
    (i.e. immediately after the </div> that closes <div class="region-wrap">)
  - </main> right before the rendered footer.html include
    (i.e. immediately before <footer>)

Idempotent: a page that already has <main id="content"> AND </main>
in the expected positions is skipped.

Scope guard (lesson from Task 4): only patch pages whose layout matches
the _base.html-derived pattern -- closing </header> directly followed
(modulo whitespace + Region Bar comment) by <div class="region-wrap">.
Pages without this pattern (homepage, blog posts, blog index, embed
fragments) are skipped.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

# Pattern that identifies the end of the rendered header.html partial in
# a _base.html-derived page. The region-wrap block contains a nested
# region-bar div, so we need to match TWO </div> closers (region-bar
# then region-wrap). We anchor on the literal Region Bar comment block
# and the literal class names to be precise.
HEADER_END = re.compile(
    r'(</header>\s*\n\s*<!-- Region Bar -->\s*\n'
    r'<div class="region-wrap">\s*\n'
    r'\s*<div class="region-bar">.*?</div>\s*\n'  # closes region-bar
    r'</div>\s*\n)',                              # closes region-wrap
    re.IGNORECASE | re.DOTALL,
)

# Pattern for the rendered footer.html start.
FOOTER_START = re.compile(r'(\n)(<footer\b)', re.IGNORECASE)

# Idempotency markers.
MAIN_OPEN = '<main id="content">'
MAIN_CLOSE = "</main>"


def _has_main_wrapper(text: str) -> bool:
    """True if the page already has <main id="content"> in the right
    position (after header.html end) and </main> right before <footer>."""
    if MAIN_OPEN not in text or MAIN_CLOSE not in text:
        return False
    # Verify positional ordering: MAIN_OPEN appears after </header> and
    # MAIN_CLOSE appears before <footer>.
    header_close = text.find("</header>")
    footer_open = text.find("<footer")
    main_open = text.find(MAIN_OPEN)
    main_close = text.rfind(MAIN_CLOSE)
    if header_close < 0 or footer_open < 0 or main_open < 0 or main_close < 0:
        return False
    return header_close < main_open < main_close < footer_open


def patch(text: str) -> tuple[str, bool, str]:
    """Return (new_text, did_change, reason).

    reason is one of: "updated", "already_has_main", "no_full_layout",
    "no_base_pattern".
    """
    # Scope guard 1: full layout required (header + footer both present).
    if not (re.search(r"<header\b", text, re.IGNORECASE) and re.search(r"<footer\b", text, re.IGNORECASE)):
        return text, False, "no_full_layout"

    # Scope guard 2: must match _base.html-derived layout (</header>
    # immediately followed by region-wrap block). This skips home,
    # blog posts, blog index, and any other non-_base.html templates.
    m_header_end = HEADER_END.search(text)
    if not m_header_end:
        return text, False, "no_base_pattern"

    # Idempotency.
    if _has_main_wrapper(text):
        return text, False, "already_has_main"

    # Insert <main id="content"> immediately after the matched
    # header-end block.
    insert_open_at = m_header_end.end()
    new_text = (
        text[:insert_open_at]
        + "\n" + MAIN_OPEN + "\n"
        + text[insert_open_at:]
    )

    # Insert </main> immediately before <footer>.
    m_footer = FOOTER_START.search(new_text)
    if not m_footer:
        # Defensive: scope guard 1 said footer exists, but the precise
        # anchor with leading newline didn't match. Skip rather than
        # corrupt the file.
        return text, False, "no_footer_anchor"

    insert_close_at = m_footer.start(2)  # position of the <footer> tag itself
    new_text = (
        new_text[:insert_close_at]
        + MAIN_CLOSE + "\n\n"
        + new_text[insert_close_at:]
    )

    if new_text == text:
        return text, False, "already_has_main"
    return new_text, True, "updated"


def iter_rendered_pages() -> list[Path]:
    pages = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


def main() -> int:
    changed: list[Path] = []
    skipped_no_layout = 0
    skipped_no_pattern = 0
    skipped_already = 0
    skipped_no_footer_anchor = 0
    for page in iter_rendered_pages():
        text = page.read_text(encoding="utf-8")
        new_text, did_change, reason = patch(text)
        rel = page.relative_to(REPO)
        if did_change:
            page.write_text(new_text, encoding="utf-8")
            print(f"updated: {rel.as_posix()}")
            changed.append(page)
        else:
            if reason == "no_full_layout":
                skipped_no_layout += 1
            elif reason == "no_base_pattern":
                skipped_no_pattern += 1
            elif reason == "already_has_main":
                skipped_already += 1
            elif reason == "no_footer_anchor":
                skipped_no_footer_anchor += 1
    print(
        f"\nUpdated <main> wrapper in {len(changed)} rendered pages. "
        f"Skipped: {skipped_already} already-wrapped, "
        f"{skipped_no_pattern} non-_base layout, "
        f"{skipped_no_layout} no full layout, "
        f"{skipped_no_footer_anchor} no footer anchor."
    )
    if not changed:
        print("(No changes.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
