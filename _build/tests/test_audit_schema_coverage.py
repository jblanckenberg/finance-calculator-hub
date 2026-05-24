"""Tests for the schema coverage auditor."""
import json
import importlib.util
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "audit_schema_coverage.py"

spec = importlib.util.spec_from_file_location("audit_schema_coverage", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

EXPECTED_TYPES = {"WebApplication", "HowTo", "FAQPage", "Article",
                  "BreadcrumbList", "Organization", "Person"}


def test_auditor_parses_every_calc_page():
    report = mod.audit_all()
    calcs = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))
    for slug in calcs:
        assert slug in report, f"Auditor skipped {slug}"
        if "error" in report[slug]:
            continue
        assert "types_present" in report[slug]
        assert "types_missing" in report[slug]


def test_known_complete_page_reports_no_gaps():
    """paye-calculator was shipped with full schema coverage in Phase 1E
    -- it must report zero missing types as a known-good baseline."""
    report = mod.audit_all()
    assert "paye-calculator" in report, "paye-calculator not audited"
    assert report["paye-calculator"].get("types_missing") == [], (
        f"Baseline page paye-calculator should have full coverage; "
        f"missing: {report['paye-calculator'].get('types_missing')}"
    )


def test_audit_one_extracts_types():
    """Unit test: audit_one finds @type strings via regex."""
    html = '''
    <script>{"@type": "WebApplication", "name": "X"}</script>
    <script>{"@type": "FAQPage"}</script>
    '''
    r = mod.audit_one(html)
    assert "WebApplication" in r["types_present"]
    assert "FAQPage" in r["types_present"]
    # Should report the missing ones too
    assert "HowTo" in r["types_missing"]
    assert "Article" in r["types_missing"]
