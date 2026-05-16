# `_build/` — FinCalcHub Static Site Generator

A Python 3.12 + Jinja2 pipeline that renders the entire FC HTML tree from a small JSON data model + a shared template set. Introduced in Phase 2 to kill the 42-file footer-sweep problem permanently and to enable per-calc variant pages (programmatic SEO) without hand-editing every file.

## Quick reference

```bash
# Install deps (first time only; the global etsy venv has these already)
python -m pip install -r _build/requirements.txt

# Run every test
pytest _build -v

# Dry-run: see what would change
python _build/generate.py

# Apply: regenerate all 12 calc + 15 variant pages
python _build/generate.py --apply

# Regenerate sitemap.xml from the rendered tree
python _build/update_sitemap.py --apply

# One-shot copyright sweep (legacy — superseded by templates after Phase 2)
python _build/update_copyright.py --apply
```

## File layout

```
_build/
├── README.md                       this file
├── requirements.txt                pinned deps (jinja2 / pytest / jsonschema)
├── conftest.py                     pytest sys.path bootstrap
├── generate.py                     Jinja2 Renderer + write_all() CLI
├── extract_bodies.py               one-shot migration: per-calc body extraction
├── update_sitemap.py               walk rendered tree → sitemap.xml
├── update_copyright.py             legacy one-shot copyright sweep
├── data/
│   ├── schema.json                 JSON-Schema for calculators.json + variants.json
│   ├── calculators.json            12 calc entries (metadata only — no body HTML)
│   └── variants.json               15 variant entries (operator stubs)
├── templates/
│   ├── _base.html                  root layout (head/header/footer/scripts)
│   ├── calculator.html             per-calc page (extends _base)
│   ├── variant.html                per-variant page (extends _base, prepends intro)
│   └── partials/                   head_meta, head_schema, header, footer,
│                                    analytics, ad_slot
├── bodies/
│   └── <slug>.html                 per-calc body content (form + FAQ + related)
├── fixtures/
│   ├── calculators_min.json        minimal renderer test fixture
│   ├── variants_min.json           minimal renderer test fixture
│   └── expected/                   golden files for idempotency checks
└── test_*.py                       pytest suite (38 tests across 8 files)
```

## Data flow

```
data/calculators.json ─┐
data/variants.json ────┼─► generate.py (Renderer) ─► <slug>/index.html
bodies/<slug>.html ────┘                              <slug>/<variant>/index.html
templates/* ───────────┘
```

## Adding a calculator

1. Add the new entry to `data/calculators.json` (slug, name, title, description, h1, subtitle, optional formula/voiceAnswer/faq).
2. Hand-author the calc body at `bodies/<slug>.html` (form, results, FAQ, related-cards — everything between the hero and footer).
3. Run `python _build/generate.py --apply` — `<slug>/index.html` appears.
4. Run `python _build/update_sitemap.py --apply` — sitemap.xml picks it up.
5. Add tests if the body has new patterns.

## Adding a variant

1. Add the new entry to `data/variants.json` under the parent calc key (slug, kind, label, h1Suffix, title, description, intro stub, hreflangCountry).
2. Run `python _build/generate.py --apply` — `<parent>/<variant>/index.html` appears with the operator-todo badge + `robots: noindex,follow`.
3. Operator replaces the `intro` `[OPERATOR_TO_FILL: ...]` marker with real prose.
4. Re-run `--apply`; the page auto-flips to `index,follow`.
5. Run `python _build/update_sitemap.py --apply`.

## Editing the global header/footer

Edit `templates/partials/header.html` or `templates/partials/footer.html`, then re-run `python _build/generate.py --apply`. All 27 pages get the change in one shot.

## Idempotency contract

`pytest _build/test_idempotency.py` enforces invariants the generator must preserve for `compound-interest/`: canonical URL, Plausible script, Clarity script, BC cross-link, breadcrumb JSON-LD, calculator form inputs (`#principal`, `#rate`, `#years`), footer copyright with the current year, OG image meta, Twitter card meta, AdSense lazy-loader. Add more invariants here as Phase 4 calcs land.

## What this generator does NOT do

- It does not edit pages outside the 12 calc slugs + 15 variants (blog posts, about, contact, legal pages stay hand-maintained).
- It does not generate calculator JS — that lives in `js/calc/<slug>.js` or inline on the body. Bodies are opaque HTML strings.
- It does not deploy. Push to `main`; Cloudflare Pages auto-builds.
