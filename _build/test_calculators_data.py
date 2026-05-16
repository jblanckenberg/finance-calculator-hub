import json
from pathlib import Path
import jsonschema

DATA = Path(__file__).resolve().parent / "data" / "calculators.json"
SCHEMA = Path(__file__).resolve().parent / "data" / "schema.json"

EXPECTED_SLUGS = {
    "compound-interest", "mortgage", "take-home-pay", "retirement-savings",
    "investment-growth", "savings-goal", "inflation-impact", "net-worth",
    "loan-payoff", "credit-card-payoff", "emergency-fund", "sa-tax-calculator",
}

def test_calculators_file_exists():
    assert DATA.exists(), f"missing {DATA}"

def test_calculators_has_all_12():
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
