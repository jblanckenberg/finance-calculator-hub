"""
kpi_etl.py â€” Weekly KPI ETL: Google Search Console -> Notion

Pulls weekly organic-search KPIs (clicks, impressions, CTR, avg position)
from configured GSC properties and appends a formatted summary to the
'Weekly KPI Reviews' Notion page.

Usage:
    python scripts/kpi_etl.py
    python scripts/kpi_etl.py --dry-run
    python scripts/kpi_etl.py --week 2026-05-18   # force a specific week start (Monday)

Prerequisites:
    1. Run authorize_gsc.py ONCE to create scripts/.gsc_token.json
    2. NOTION_TOKEN env var set to your Notion internal integration secret
       (follow step 5 in BC-KPI-ETL Setup Guide.docx)
    3. 'Weekly KPI Reviews' Notion page shared with the BC-KPI-ETL integration
"""

import argparse
import json
import logging
import os
import sys
from datetime import date, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths  (all relative to the Finance_Calculator_Hub root)
# ---------------------------------------------------------------------------
ROOT        = Path(__file__).resolve().parent.parent   # Finance_Calculator_Hub/
SCRIPTS_DIR = ROOT / "scripts"
TOKEN_FILE  = SCRIPTS_DIR / ".gsc_token.json"
CLIENT_FILE = SCRIPTS_DIR / ".gsc_oauth_client.json"
LOG_DIR     = ROOT / "logs"
LOG_FILE    = LOG_DIR / "kpi_etl.log"
STATE_FILE  = LOG_DIR / "kpi_etl_state.json"

LOG_DIR.mkdir(parents=True, exist_ok=True)

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config â€” update PROPERTIES to match your actual GSC property URLs
# ---------------------------------------------------------------------------
DEFAULT_PROPERTIES = [
    "sc-domain:finncalc.com",
    "sc-domain:buscalctools.com",
]
NOTION_PAGE_TITLE = "Weekly KPI Reviews"
TOP_PAGES_COUNT   = 5

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def get_gsc_service():
    """Return an authenticated GSC searchconsole v1 service object using stored OAuth token."""
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    if not TOKEN_FILE.exists():
        log.error(
            "OAuth token not found: %s\n"
            "Run this first:  python scripts/authorize_gsc.py",
            TOKEN_FILE,
        )
        sys.exit(1)

    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    # Auto-refresh the token if expired
    if creds.expired and creds.refresh_token:
        log.info("OAuth token expired â€” refreshing...")
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
        log.info("Token refreshed and saved.")

    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def get_notion_client():
    """Return a Notion client using the NOTION_TOKEN env var."""
    from notion_client import Client

    token = os.environ.get("NOTION_TOKEN")
    if not token:
        raise EnvironmentError(
            "NOTION_TOKEN environment variable is not set.\n"
            "Set it with:\n"
            "  [Environment]::SetEnvironmentVariable('NOTION_TOKEN', 'your_token', 'User')\n"
            "Then restart PowerShell and re-run this script."
        )
    return Client(auth=token)


# ---------------------------------------------------------------------------
# GSC helpers
# ---------------------------------------------------------------------------

def last_monday() -> date:
    """Return the Monday of the previous calendar week (never today)."""
    today = date.today()
    days_back = today.weekday() + 7 if today.weekday() == 0 else today.weekday()
    return today - timedelta(days=days_back)


def fetch_gsc_aggregate(service, site_url: str, start: date, end: date) -> dict:
    """Fetch site-wide aggregate KPIs for a date range."""
    resp = (
        service.searchanalytics()
        .query(
            siteUrl=site_url,
            body={
                "startDate": start.isoformat(),
                "endDate":   end.isoformat(),
                "dimensions": [],
                "rowLimit":   1,
            },
        )
        .execute()
    )
    rows = resp.get("rows", [])
    if not rows:
        return {"clicks": 0, "impressions": 0, "ctr": 0.0, "position": 0.0}
    r = rows[0]
    return {
        "clicks":      int(r.get("clicks", 0)),
        "impressions": int(r.get("impressions", 0)),
        "ctr":         round(r.get("ctr", 0.0) * 100, 2),
        "position":    round(r.get("position", 0.0), 1),
    }


def fetch_top_pages(service, site_url: str, start: date, end: date, n: int = 5) -> list:
    """Fetch top N pages by clicks."""
    resp = (
        service.searchanalytics()
        .query(
            siteUrl=site_url,
            body={
                "startDate": start.isoformat(),
                "endDate":   end.isoformat(),
                "dimensions": ["page"],
                "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
                "rowLimit": n,
            },
        )
        .execute()
    )
    rows = resp.get("rows", [])
    return [
        {
            "page":        r["keys"][0],
            "clicks":      int(r.get("clicks", 0)),
            "impressions": int(r.get("impressions", 0)),
            "ctr":         round(r.get("ctr", 0.0) * 100, 2),
            "position":    round(r.get("position", 0.0), 1),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Notion helpers
# ---------------------------------------------------------------------------

def find_notion_page(client, title: str) -> str:
    """Search for a page by exact title and return its page ID."""
    results = client.search(
        query=title,
        filter={"property": "object", "value": "page"},
    ).get("results", [])

    for r in results:
        props = r.get("properties", {})
        for key in ("title", "Name"):
            if key in props:
                plain = "".join(
                    t.get("plain_text", "")
                    for t in props[key].get("title", [])
                )
                if plain.strip() == title:
                    log.info("Found Notion page '%s' -- ID: %s", title, r["id"])
                    return r["id"]

    raise ValueError(
        "Notion page '" + title + "' not found.\n"
        "Check that:\n"
        "  1. The page is titled exactly '" + title + "'\n"
        "  2. The BC-KPI-ETL integration is connected to it (page ... menu > Connections)"
    )


def week_block_exists(client, page_id: str, week_label: str) -> bool:
    """Return True if a heading for this week already exists (idempotency guard)."""
    children = client.blocks.children.list(block_id=page_id).get("results", [])
    for block in children:
        for btype in ("heading_1", "heading_2", "heading_3"):
            if block.get("type") == btype:
                text = "".join(
                    t.get("plain_text", "")
                    for t in block[btype].get("rich_text", [])
                )
                if week_label in text:
                    return True
    return False


def _rt(content: str, bold: bool = False) -> dict:
    obj = {"type": "text", "text": {"content": content}}
    if bold:
        obj["annotations"] = {"bold": True}
    return obj


def build_kpi_blocks(week_label: str, properties_data: list) -> list:
    blocks = [
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {"rich_text": [_rt("Week of " + week_label)]},
        },
        {"object": "block", "type": "divider", "divider": {}},
    ]

    for pd in properties_data:
        site = pd["site_url"]
        blocks.append({
            "object": "block",
            "type": "heading_3",
            "heading_3": {"rich_text": [_rt(site)]},
        })

        if pd.get("error"):
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [_rt("ERROR: " + pd["error"])]},
            })
        else:
            k = pd["kpis"]
            summary = (
                "Clicks: " + str(k["clicks"]) + "   |   "
                "Impressions: " + str(k["impressions"]) + "   |   "
                "CTR: " + str(k["ctr"]) + "%   |   "
                "Avg Position: " + str(k["position"])
            )
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [_rt(summary)]},
            })

            if pd["top_pages"]:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {"rich_text": [_rt("Top Pages by Clicks:", bold=True)]},
                })
                for pg in pd["top_pages"]:
                    line = (
                        "  " + pg["page"] + "\n"
                        "    Clicks: " + str(pg["clicks"]) + "  |  "
                        "CTR: " + str(pg["ctr"]) + "%  |  "
                        "Position: " + str(pg["position"])
                    )
                    blocks.append({
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {"rich_text": [_rt(line)]},
                    })

        blocks.append({"object": "block", "type": "divider", "divider": {}})

    return blocks


def append_to_notion(client, page_id: str, blocks: list) -> None:
    batch_size = 100
    for i in range(0, len(blocks), batch_size):
        client.blocks.children.append(
            block_id=page_id,
            children=blocks[i : i + batch_size],
        )


# ---------------------------------------------------------------------------
# State (idempotency)
# ---------------------------------------------------------------------------

def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"processed_weeks": []}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Weekly KPI ETL: Google Search Console -> Notion"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch data and log without writing to Notion.")
    parser.add_argument("--week", type=str, default=None, metavar="YYYY-MM-DD",
                        help="Week start date (Monday). Defaults to last Monday.")
    parser.add_argument("--properties", nargs="+", default=DEFAULT_PROPERTIES,
                        metavar="URL", help="GSC property URLs to include.")
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    if args.week:
        week_start = date.fromisoformat(args.week)
        if week_start.weekday() != 0:
            log.error("--week must be a Monday. '%s' is a %s.",
                      args.week, week_start.strftime("%A"))
            sys.exit(1)
    else:
        week_start = last_monday()

    week_end   = week_start + timedelta(days=6)
    week_label = week_start.isoformat() + " to " + week_end.isoformat()
    log.info("KPI ETL starting | week: %s | dry_run: %s", week_label, args.dry_run)

    state = load_state()
    if week_label in state["processed_weeks"] and not args.dry_run:
        log.info("Week '%s' already processed. Skipping.", week_label)
        return

    try:
        gsc = get_gsc_service()
        log.info("GSC authentication OK")
    except SystemExit:
        raise
    except Exception as exc:
        log.error("GSC authentication failed: %s", exc)
        sys.exit(1)

    properties_data = []
    for site_url in args.properties:
        log.info("Fetching data for %s", site_url)
        try:
            kpis      = fetch_gsc_aggregate(gsc, site_url, week_start, week_end)
            top_pages = fetch_top_pages(gsc, site_url, week_start, week_end, n=TOP_PAGES_COUNT)
            properties_data.append({"site_url": site_url, "kpis": kpis, "top_pages": top_pages})
            log.info("  clicks=%d  impressions=%d  ctr=%.2f%%  position=%.1f",
                     kpis["clicks"], kpis["impressions"], kpis["ctr"], kpis["position"])
        except Exception as exc:
            log.error("Failed for %s: %s", site_url, exc)
            properties_data.append(
                {"site_url": site_url, "kpis": {}, "top_pages": [], "error": str(exc)}
            )

    if args.dry_run:
        log.info("DRY RUN complete -- Notion write skipped.")
        return

    try:
        notion  = get_notion_client()
        page_id = find_notion_page(notion, NOTION_PAGE_TITLE)
    except Exception as exc:
        log.error("Notion initialisation failed: %s", exc)
        sys.exit(1)

    if week_block_exists(notion, page_id, week_label):
        log.warning("Block for week '%s' already exists in Notion. Skipping.", week_label)
        return

    blocks = build_kpi_blocks(week_label, properties_data)
    log.info("Writing %d blocks to Notion page '%s'", len(blocks), NOTION_PAGE_TITLE)
    try:
        append_to_notion(notion, page_id, blocks)
        log.info("Notion write complete.")
    except Exception as exc:
        log.error("Notion write failed: %s", exc)
        sys.exit(1)

    state["processed_weeks"].append(week_label)
    save_state(state)
    log.info("ETL finished successfully for week %s.", week_label)


if __name__ == "__main__":
    main()


