"""One-shot helper: add `related` array (6 slugs each) to every calculator
entry in calculators.json. Idempotent — re-running is a no-op if the existing
arrays match.

Run from repo root:
    python _build/scripts/_patch_calculators_related.py

This script lives under scripts/ but is a one-shot data migration, not part
of the rendered-HTML patcher chain. Kept here for auditability / re-running.
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "_build" / "data" / "calculators.json"

RELATED: dict[str, list[str]] = {
    "compound-interest": [
        "investment-growth", "savings-goal", "retirement-savings",
        "inflation-impact", "fire-calculator", "isa-calculator",
    ],
    "mortgage": [
        "take-home-pay", "net-worth", "loan-payoff",
        "savings-goal", "emergency-fund", "inflation-impact",
    ],
    "take-home-pay": [
        "sa-tax-calculator", "401k-calculator", "isa-calculator",
        "retirement-savings", "mortgage", "net-worth",
    ],
    "retirement-savings": [
        "401k-calculator", "roth-ira-calculator", "fire-calculator",
        "compound-interest", "investment-growth", "tfsa-calculator",
    ],
    "investment-growth": [
        "compound-interest", "retirement-savings", "fire-calculator",
        "isa-calculator", "tfsa-calculator", "inflation-impact",
    ],
    "savings-goal": [
        "emergency-fund", "compound-interest", "investment-growth",
        "mortgage", "inflation-impact", "isa-calculator",
    ],
    "inflation-impact": [
        "compound-interest", "investment-growth", "retirement-savings",
        "fire-calculator", "savings-goal", "net-worth",
    ],
    "net-worth": [
        "retirement-savings", "mortgage", "debt-snowball-calculator",
        "emergency-fund", "investment-growth", "fire-calculator",
    ],
    "loan-payoff": [
        "credit-card-payoff", "debt-snowball-calculator", "student-loan-calculator",
        "mortgage", "net-worth", "emergency-fund",
    ],
    "credit-card-payoff": [
        "debt-snowball-calculator", "loan-payoff", "student-loan-calculator",
        "emergency-fund", "net-worth", "take-home-pay",
    ],
    "emergency-fund": [
        "savings-goal", "net-worth", "credit-card-payoff",
        "debt-snowball-calculator", "take-home-pay", "investment-growth",
    ],
    "sa-tax-calculator": [
        "take-home-pay", "tfsa-calculator", "retirement-savings",
        "net-worth", "investment-growth", "inflation-impact",
    ],
    "401k-calculator": [
        "roth-ira-calculator", "retirement-savings", "fire-calculator",
        "take-home-pay", "investment-growth", "compound-interest",
    ],
    "roth-ira-calculator": [
        "401k-calculator", "retirement-savings", "fire-calculator",
        "investment-growth", "isa-calculator", "compound-interest",
    ],
    "student-loan-calculator": [
        "loan-payoff", "credit-card-payoff", "debt-snowball-calculator",
        "take-home-pay", "net-worth", "emergency-fund",
    ],
    "debt-snowball-calculator": [
        "credit-card-payoff", "loan-payoff", "student-loan-calculator",
        "emergency-fund", "net-worth", "take-home-pay",
    ],
    "fire-calculator": [
        "retirement-savings", "investment-growth", "compound-interest",
        "401k-calculator", "roth-ira-calculator", "net-worth",
    ],
    "isa-calculator": [
        "tfsa-calculator", "investment-growth", "compound-interest",
        "retirement-savings", "savings-goal", "inflation-impact",
    ],
    "tfsa-calculator": [
        "isa-calculator", "sa-tax-calculator", "retirement-savings",
        "investment-growth", "compound-interest", "savings-goal",
    ],
}


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    # Validation
    slugs = set(data.keys())
    rel_slugs = set(RELATED.keys())
    assert slugs == rel_slugs, f"slug mismatch: missing={slugs - rel_slugs}, extra={rel_slugs - slugs}"
    for slug, rel in RELATED.items():
        assert len(rel) == 6, f"{slug}: {len(rel)} relations (expected 6)"
        assert len(set(rel)) == 6, f"{slug}: duplicate relations"
        assert slug not in rel, f"{slug}: self-reference"
        for r in rel:
            assert r in slugs, f"{slug}: unknown related slug {r!r}"

    changed = 0
    for slug, calc in data.items():
        new_rel = RELATED[slug]
        if calc.get("related") != new_rel:
            calc["related"] = new_rel
            changed += 1

    DATA.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Updated {changed} calculator entries with `related` arrays.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
