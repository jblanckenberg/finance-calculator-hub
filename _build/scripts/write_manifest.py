"""Write a minimal PWA manifest. One-shot; the file lives at repo root."""
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "site.webmanifest"

DATA = {
    "name": "FinCalcHub",
    "short_name": "FinCalc",
    "icons": [
        {"src": "/finncalc_256.png", "sizes": "256x256", "type": "image/png"},
        {"src": "/finncalc_512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "/finncalc_1024.png", "sizes": "1024x1024", "type": "image/png"},
    ],
    "theme_color": "#1B3A5C",
    "background_color": "#ffffff",
    "display": "browser",
    "start_url": "/",
}

if __name__ == "__main__":
    MANIFEST.write_text(json.dumps(DATA, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST}")
