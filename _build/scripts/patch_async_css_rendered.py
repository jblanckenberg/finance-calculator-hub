"""Propagate the async-CSS pattern from head_meta.html into every rendered
index.html.

Why this exists: operator policy forbids re-running `_build/generate.py`
(rebuild rolls dateModified + nav). So template-level changes cannot
reach the deployed site unless this script hand-edits the rendered
output directly. Same pattern as `strip_duplicate_h1_rendered.py`,
`inject_favicon_rendered.py`, `patch_titles_rendered.py`.

The async block being injected (replacing the bare sync <link>):

  <link rel="preconnect" href="https://finncalc.com" crossorigin>
  <link rel="preload" as="style" href="/css/main.css" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/main.css"></noscript>

The trailing print stylesheet (media="print") is preserved unchanged.

Idempotent: a page that already has the full async block AND no bare
sync <link rel=stylesheet href=/css/main.css> is skipped. A page from a
partial earlier patcher run (any subset of preconnect/preload/noscript
plus possibly the bare sync) is normalised back to the canonical 3-line
block.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

ASYNC_BLOCK = (
    '  <link rel="preconnect" href="https://finncalc.com" crossorigin>\n'
    '  <link rel="preload" as="style" href="/css/main.css" onload="this.onload=null;this.rel=\'stylesheet\'">\n'
    '  <noscript><link rel="stylesheet" href="/css/main.css"></noscript>\n'
)

# Permissive matchers: strip the link tag (and any leading whitespace on
# its line, plus the trailing newline if present). We allow these to
# appear mid-line — `inject_favicon_rendered.py`-style cleanups have
# left some pages with glued-together tags before, and a defensive
# patcher should normalise those too.

# Bare sync stylesheet line (no media attribute) — the render-blocker.
SYNC_BARE = re.compile(
    r'[ \t]*<link\s+rel="stylesheet"\s+href="/css/main\.css"\s*/?>\n?',
    re.IGNORECASE,
)

# Preconnect to finncalc.com.
PRECONNECT = re.compile(
    r'[ \t]*<link\s+rel="preconnect"\s+href="https://finncalc\.com"[^>]*>\n?',
    re.IGNORECASE,
)

# Preload-as-style for /css/main.css with the onload swap.
PRELOAD = re.compile(
    r'[ \t]*<link\s+rel="preload"\s+as="style"\s+href="/css/main\.css"[^>]*>\n?',
    re.IGNORECASE,
)

# Noscript fallback wrapping a sync stylesheet for main.css.
NOSCRIPT = re.compile(
    r'[ \t]*<noscript><link\s+rel="stylesheet"\s+href="/css/main\.css"[^>]*></noscript>\n?',
    re.IGNORECASE,
)

# Print stylesheet line — used as anchor for inserting the async block
# when present. Match the WHOLE line including its leading newline so
# we can prepend the async block cleanly on its own lines.
PRINT_CSS_LINE = re.compile(
    r'(?P<lead>\n?)(?P<indent>[ \t]*)<link\s+rel="stylesheet"\s+href="/css/print\.css"\s+media="print"\s*/?>',
    re.IGNORECASE,
)

# Fallback insertion anchor: closing </head>. Match leading whitespace
# (including newline) plus the closing tag so we can insert before with
# clean line breaks.
HEAD_CLOSE = re.compile(r'(?P<lead>\n)(?P<indent>[ \t]*)</head>', re.IGNORECASE)


def _strip_existing(text: str) -> str:
    """Remove any pre-existing main.css preconnect / preload / noscript /
    bare-sync occurrences so we can re-insert the canonical block. Uses
    permissive (non-anchored) matchers so mid-line occurrences from any
    earlier partial patcher run are also normalised away."""
    text = PRECONNECT.sub("", text)
    text = PRELOAD.sub("", text)
    text = NOSCRIPT.sub("", text)
    text = SYNC_BARE.sub("", text)
    return text


def _has_canonical_block(text: str) -> bool:
    """Idempotency probe. Page is already canonical iff:
      - preconnect to finncalc.com is present, AND
      - preload of /css/main.css is present, AND
      - noscript fallback for /css/main.css is present, AND
      - NO bare sync <link rel=stylesheet href=/css/main.css> outside the noscript.
    The noscript line itself contains a sync stylesheet substring, so we
    test for the bare sync only AFTER masking the noscript line out."""
    if not (PRECONNECT.search(text) and PRELOAD.search(text) and NOSCRIPT.search(text)):
        return False
    # Mask the noscript line and check for any remaining bare sync.
    masked = NOSCRIPT.sub("", text)
    return SYNC_BARE.search(masked) is None


def patch(text: str) -> tuple[str, bool]:
    # Scope guard: only operate on pages that already reference
    # /css/main.css. Pages with self-contained inline <style> blocks
    # (e.g. some blog posts) must stay untouched — injecting a preload
    # there would add an HTTP connection + download for a stylesheet
    # they don't actually use.
    had_main_css = bool(re.search(r'href="/css/main\.css"', text, re.IGNORECASE))
    if not had_main_css:
        return text, False
    if _has_canonical_block(text):
        return text, False
    stripped = _strip_existing(text)
    # Prefer insertion just before the print stylesheet line.
    m = PRINT_CSS_LINE.search(stripped)
    if m:
        # Insert the async block as its own lines, then the captured
        # print line is re-emitted with its original indentation.
        insertion = f"{m.group('lead')}{ASYNC_BLOCK.rstrip(chr(10))}\n{m.group('indent')}"
        new_text = stripped[:m.start()] + insertion + stripped[m.start() + len(m.group('lead')) + len(m.group('indent')):]
        return new_text, new_text != text
    # Fallback: insert before </head> with explicit newlines so the
    # block always ends up on its own lines.
    m = HEAD_CLOSE.search(stripped)
    if m:
        insertion = f"{m.group('lead')}{ASYNC_BLOCK.rstrip(chr(10))}\n{m.group('indent')}"
        new_text = stripped[:m.start()] + insertion + stripped[m.start() + len(m.group('lead')) + len(m.group('indent')):]
        return new_text, new_text != text
    return text, False


def iter_rendered_pages() -> list[Path]:
    pages = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


def main() -> int:
    changed: list[Path] = []
    for page in iter_rendered_pages():
        text = page.read_text(encoding="utf-8")
        new_text, did_change = patch(text)
        if did_change and new_text != text:
            page.write_text(new_text, encoding="utf-8")
            rel = page.relative_to(REPO)
            print(f"updated: {rel.as_posix()}")
            changed.append(page)
    if changed:
        print(f"\nUpdated async CSS block in {len(changed)} rendered pages.")
    else:
        print("All rendered pages already have async CSS block. No changes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
