"""
Submit changed (or all) URLs to IndexNow.

Two modes:
  --changed  (default in CI)  read changed file paths from stdin, one per line
  --all                       walk the working tree and submit every indexable page

The verification key is hosted at /811c4bf047664bc28cc38c4a3e344b4b.txt so the
script needs no secrets. Anyone with read access can run it.

Usage (CI):
  git diff --name-only "$GITHUB_EVENT_BEFORE" "$GITHUB_SHA" \
    | python scripts/indexnow_ping.py --changed

Usage (one-shot full sweep):
  python scripts/indexnow_ping.py --all
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

HOST = 'finncalc.com'
# Key is sourced from the INDEXNOW_KEY env var (set as a GitHub Actions secret in CI).
# IndexNow keys are public by design — they're hosted at a verification file on the
# site — so the fallback below is safe and keeps local + first-time runs working.
DEFAULT_KEY = '811c4bf047664bc28cc38c4a3e344b4b'
KEY = os.environ.get('INDEXNOW_KEY') or DEFAULT_KEY
# Allow overriding the verification URL too. Defaults to /<key>.txt at the host root.
KEY_LOCATION = os.environ.get('INDEXNOW_KEY_LOCATION') or f'https://{HOST}/{KEY}.txt'
ENDPOINT = 'https://api.indexnow.org/IndexNow'
SITE = f'https://{HOST}'

REPO_ROOT = Path(__file__).resolve().parent.parent

# Paths that should never be submitted (noindex pages, assets, configs)
EXCLUDE_PATHS = {
    '404.html',
    'privacy/index.html',
    'search/index.html',
    'robots.txt',
    'sitemap.xml',
}
EXCLUDE_SUFFIXES = ('.png', '.svg', '.jpg', '.jpeg', '.webp', '.txt', '.xml', '.ico', '.css', '.js', '.yml', '.yaml')


def path_to_url(rel: str) -> str | None:
    """Convert a repo-relative file path to a public URL, or None if not indexable."""
    rel = rel.replace('\\', '/').lstrip('./').lstrip('/')
    if rel in EXCLUDE_PATHS:
        return None
    if rel.endswith(EXCLUDE_SUFFIXES):
        return None
    if not rel.endswith('.html'):
        return None
    if rel == 'index.html':
        return f'{SITE}/'
    if rel.endswith('/index.html'):
        return f'{SITE}/{rel[:-len("index.html")]}'
    # Any other .html (e.g. 404.html caught above, anything else gets the file path)
    return f'{SITE}/{rel}'


def gather_changed(stream) -> list[str]:
    urls: list[str] = []
    for line in stream:
        rel = line.strip()
        if not rel:
            continue
        url = path_to_url(rel)
        if url and url not in urls:
            urls.append(url)
    return urls


def gather_all() -> list[str]:
    urls: list[str] = []
    for p in REPO_ROOT.rglob('*.html'):
        rel = p.relative_to(REPO_ROOT).as_posix()
        url = path_to_url(rel)
        if url and url not in urls:
            urls.append(url)
    return urls


def submit(urls: list[str], dry_run: bool = False) -> int:
    payload = {
        'host': HOST,
        'key': KEY,
        'keyLocation': KEY_LOCATION,
        'urlList': urls,
    }
    body = json.dumps(payload).encode('utf-8')

    print(f'IndexNow payload: {len(urls)} URLs', flush=True)
    for u in urls:
        print(f'  - {u}', flush=True)

    if dry_run:
        print('Dry run — not posting.', flush=True)
        return 0

    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={'Content-Type': 'application/json; charset=utf-8'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f'HTTP {resp.status} {resp.reason}', flush=True)
            return 0 if resp.status in (200, 202) else 1
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode('utf-8', errors='replace')
        print(f'HTTP {e.code} {e.reason} — {body_txt}', flush=True)
        # 422 = at least one URL didn't belong to the host; usually still a 200 logically
        return 0 if e.code in (200, 202) else 1
    except Exception as e:
        print(f'Request failed: {e}', flush=True)
        return 2


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--changed', action='store_true', help='Read changed paths from stdin (default)')
    g.add_argument('--all', action='store_true', help='Walk the tree and submit every indexable page')
    ap.add_argument('--dry-run', action='store_true', help='Print what would be submitted, do not POST')
    args = ap.parse_args()

    if args.all:
        urls = gather_all()
    else:
        urls = gather_changed(sys.stdin)

    if not urls:
        print('No indexable URLs to submit — exiting.', flush=True)
        return 0

    # IndexNow caps at 10,000 URLs per request; chunk if needed
    rc = 0
    for i in range(0, len(urls), 10000):
        chunk = urls[i:i + 10000]
        if submit(chunk, dry_run=args.dry_run) != 0:
            rc = 1
    return rc


if __name__ == '__main__':
    sys.exit(main())
