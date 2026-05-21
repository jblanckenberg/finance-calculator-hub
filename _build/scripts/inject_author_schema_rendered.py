"""Inject Schema.org Person `author` + `reviewedBy` markup into every rendered
index.html that already declares JSON-LD.

Approach (Option A from the C1 plan): we modify existing JSON-LD blocks rather
than emit a separate `MainEntity -> author` shim. Concretely:

  1. Emit a standalone Person JSON-LD block (the canonical Person node, @id
     `https://finncalc.com/authors/james-blanckenberg/#person`) as a new
     <script type="application/ld+json"> block placed after the last existing
     JSON-LD block in <head>. Presence of this block is the idempotency marker.
  2. Augment the WebApplication block (calculator pages) with `author` +
     `reviewedBy` properties referencing the Person @id.
  3. Augment the Article block (every page that emits one) with `author` (set
     if absent, normalised to the canonical @id if a non-canonical author @id
     is already present) and `reviewedBy` (always added if absent).

Why Option A over B: the existing JSON-LD on every page is a single-line valid
JSON document, trivially parseable + re-emittable. Modifying it in place gives
Google a clean, self-contained block per @type rather than a disconnected
mainEntity shim, which is what the SEO Recovery Plan §3.4 actually calls for.

YMYL note: every page that emits JSON-LD on finncalc.com is a calculator or
finance blog post — all YMYL — so `reviewedBy` is added unconditionally on every
augmented block. The reviewer is the same Person; in a future world a separate
reviewer profile can be swapped in here.

Idempotency: a page is considered already-patched if a top-level JSON-LD block
with `@type: Person` and `@id` containing `james-blanckenberg/#person` is
present. Re-running on a clean tree is a no-op.

Exclusion list: node_modules, .git, _build, .venv, .pytest_cache, .idea.
Scope guard: pages without any <script type="application/ld+json"> are skipped
entirely (these are raw fragments / verification stubs / embed iframes).
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {"node_modules", ".git", "_build", ".venv", ".pytest_cache", ".idea"}

AUTHOR_PATH = REPO / "_build" / "data" / "author.json"

JSON_LD_BLOCK = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
HEAD_CLOSE = re.compile(r"</head>", re.IGNORECASE)


def _load_author() -> dict:
    return json.loads(AUTHOR_PATH.read_text(encoding="utf-8"))


def _person_ld(author: dict) -> dict:
    """Canonical Person node for cross-page @id reference."""
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": author["id"],
        "name": author["name"],
        "jobTitle": author.get("jobTitle", ""),
        "url": author.get("url", ""),
        "sameAs": author.get("sameAs", []),
    }


def _person_ref(author: dict) -> dict:
    """Short Person reference for embedding in author / reviewedBy on other
    blocks. We include `@type` + `@id` + `name` so consumers that don't follow
    the @id graph still see the human-readable name inline."""
    return {
        "@type": "Person",
        "@id": author["id"],
        "name": author["name"],
    }


def _iter_rendered_pages() -> list[Path]:
    pages: list[Path] = []
    for path in REPO.rglob("index.html"):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(REPO).parts):
            continue
        pages.append(path)
    return sorted(pages)


def _has_canonical_person_block(text: str, author: dict) -> bool:
    """Detect whether the page already declares a top-level Person block with
    the canonical @id. Used as the idempotency marker."""
    canonical_id = author["id"]
    for match in JSON_LD_BLOCK.finditer(text):
        try:
            obj = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("@type") == "Person" and obj.get("@id") == canonical_id:
            return True
    return False


def _augment_existing_blocks(text: str, author: dict) -> tuple[str, bool]:
    """Add `author` + `reviewedBy` to WebApplication / Article blocks if absent
    or non-canonical. Returns (new_text, changed)."""
    changed = False
    person_ref = _person_ref(author)
    canonical_id = author["id"]

    def _replace(match: re.Match) -> str:
        nonlocal changed
        raw = match.group(1)
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return match.group(0)
        if not isinstance(obj, dict):
            return match.group(0)
        ld_type = obj.get("@type")
        if ld_type not in ("WebApplication", "Article"):
            return match.group(0)
        local_changed = False
        # Normalise / add author
        existing_author = obj.get("author")
        needs_author = True
        if isinstance(existing_author, dict):
            if existing_author.get("@id") == canonical_id:
                needs_author = False
        if needs_author:
            obj["author"] = dict(person_ref)
            local_changed = True
        # Add reviewedBy (always, if absent)
        existing_reviewed = obj.get("reviewedBy")
        needs_reviewed = True
        if isinstance(existing_reviewed, dict):
            if existing_reviewed.get("@id") == canonical_id:
                needs_reviewed = False
        if needs_reviewed:
            obj["reviewedBy"] = dict(person_ref)
            local_changed = True
        if not local_changed:
            return match.group(0)
        changed = True
        # Match the existing in-line JSON serialisation style: compact, no
        # whitespace between separators, sorted keys (matches generate.py
        # output via `json.dumps(..., sort_keys=True)`-style emission).
        return f'<script type="application/ld+json">{json.dumps(obj, sort_keys=True, ensure_ascii=False)}</script>'

    new_text = JSON_LD_BLOCK.sub(_replace, text)
    return new_text, changed


def _inject_person_block(text: str, author: dict) -> tuple[str, bool]:
    """Insert a standalone Person JSON-LD block. Placement: immediately after
    the last existing JSON-LD block in <head>, before </head>. Falls back to
    just-before-</head> if matching fails."""
    person_block = (
        '<script type="application/ld+json">'
        + json.dumps(_person_ld(author), sort_keys=True, ensure_ascii=False)
        + '</script>'
    )
    matches = list(JSON_LD_BLOCK.finditer(text))
    if not matches:
        return text, False
    last = matches[-1]
    insertion = last.end()
    new_text = text[:insertion] + "\n" + person_block + text[insertion:]
    return new_text, True


def patch(text: str, author: dict) -> tuple[str, bool]:
    if _has_canonical_person_block(text, author):
        return text, False
    # Scope guard: skip pages without any JSON-LD
    if not JSON_LD_BLOCK.search(text):
        return text, False
    text, augmented = _augment_existing_blocks(text, author)
    text, injected = _inject_person_block(text, author)
    return text, augmented or injected


def main() -> int:
    author = _load_author()
    changed: list[Path] = []
    skipped_no_ld = 0
    for page in _iter_rendered_pages():
        text = page.read_text(encoding="utf-8")
        if not JSON_LD_BLOCK.search(text):
            skipped_no_ld += 1
            continue
        new_text, did_change = patch(text, author)
        if did_change:
            page.write_text(new_text, encoding="utf-8")
            changed.append(page.relative_to(REPO))
            print(f"  patched: {page.relative_to(REPO).as_posix()}")
    if changed:
        print(f"\nUpdated author schema on {len(changed)} rendered pages.")
    else:
        print("No changes. (All in-scope rendered pages already declare a canonical Person block.)")
    print(f"Skipped {skipped_no_ld} pages with no JSON-LD (out of scope).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
