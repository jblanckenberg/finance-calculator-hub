"""
authorize_gsc.py — One-time OAuth 2.0 authorization for Google Search Console.

Run this ONCE from a terminal on your local machine (not on a server).
It opens a browser, you sign in with the Google account that owns your
GSC properties, grant access, and the token is saved to
scripts/.gsc_token.json for use by kpi_etl.py on all future runs.

Usage:
    python scripts/authorize_gsc.py
"""

import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
CLIENT_FILE = SCRIPTS_DIR / ".gsc_oauth_client.json"
TOKEN_FILE  = SCRIPTS_DIR / ".gsc_token.json"

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def main():
    if not CLIENT_FILE.exists():
        print(
            f"ERROR: OAuth client file not found: {CLIENT_FILE}\n"
            "Download it from GCP -> APIs & Services -> Credentials -> "
            "your OAuth 2.0 Client ID -> Download JSON.\n"
            "Save it as: " + str(CLIENT_FILE)
        )
        sys.exit(1)

    from google_auth_oauthlib.flow import InstalledAppFlow

    print("Opening browser for authorization...")
    print("Sign in with the Google account that OWNS your Search Console properties.")
    print()

    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_FILE), scopes=SCOPES)
    creds = flow.run_local_server(port=0)

    TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    print()
    print(f"Authorization complete. Token saved to: {TOKEN_FILE}")
    print("You can now run: python scripts/kpi_etl.py --dry-run")


if __name__ == "__main__":
    main()
