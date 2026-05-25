import json
from pathlib import Path
import jsonschema

DATA = Path(__file__).resolve().parent / "data" / "calculators.json"
SCHEMA = Path(__file__).resolve().parent / "data" / "schema.json"

EXPECTED_SLUGS = {
    # Phase 1-3 calcs
    "compound-interest", "mortgage", "take-home-pay", "retirement-savings",
    "investment-growth", "savings-goal", "inflation-impact", "net-worth",
    "loan-payoff", "credit-card-payoff", "emergency-fund", "sa-tax-calculator",
    # Phase 4 calcs (added 2026-05-16)
    "401k-calculator", "roth-ira-calculator", "student-loan-calculator",
    "debt-snowball-calculator", "fire-calculator", "isa-calculator",
    "tfsa-calculator",
    # 2026-05-24 Plan B keyword-gap fill
    "coast-fire-calculator",
    "401k-withdrawal-calculator",
    "401k-tax-calculator",
    "mortgage-repayment-calculator",
    "mortgage-overpayment-calculator",
    "texas-paycheck-calculator",
    "california-paycheck-calculator",
    "paye-calculator",
    "dividend-calculator",
    "roth-ira-conversion-calculator",
    "fire-number-calculator",
    "simple-interest-calculator",
    # 2026-05-24 Phase 4A: UK Pension Calculator (49,500 vol, KD 27)
    "pension-calculator-uk",
}

def test_calculators_file_exists():
    assert DATA.exists(), f"missing {DATA}"

def test_calculators_has_expected_slugs():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    assert set(data.keys()) == EXPECTED_SLUGS

def test_calculators_validate_against_schema():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    calc_schema = {**schema["definitions"]["Calculator"], "$defs": schema["definitions"]}
    for slug, calc in data.items():
        jsonschema.validate(instance=calc, schema=calc_schema)

def test_compound_interest_carries_methodology_formula():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    ci = data["compound-interest"]
    assert "formula" in ci
    assert "P(1 + r/n)" in ci["formula"]
