"""Tests for the keyword-page map builder.

The algorithm requires a perfect slug-match (all non-stop tokens must
appear in the keyword) plus an optional geo bonus. Slugs with no good
corpus match get an empty primary, which is the SAFE default."""
from pathlib import Path
import json
import importlib.util

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "_build" / "scripts" / "build_keyword_page_map.py"
CSV_PATH = Path("C:/FIN_CALC_SITE/keywords/finncalc_keywords.csv")

spec = importlib.util.spec_from_file_location("build_keyword_page_map", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CALCS = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))


def test_every_slug_appears_in_map():
    """Map covers all slugs (primary may be empty for slugs without
    corpus coverage - empty is the safe default)."""
    result = mod.build_map(CSV_PATH, CALCS)
    for slug in CALCS:
        assert slug in result, f"No entry for {slug}"
        assert "primary" in result[slug]
        assert "secondaries" in result[slug]


def test_known_good_primaries_assigned():
    """Slugs we built the corpus around must get sensible primaries."""
    result = mod.build_map(CSV_PATH, CALCS)
    must_contain = {
        "paye-calculator": "paye",
        "texas-paycheck-calculator": "texas",
        "california-paycheck-calculator": "california",
        "coast-fire-calculator": "coast fire",
        "fire-calculator": "fire",
        "mortgage-repayment-calculator": "repayment",
        "mortgage-overpayment-calculator": "overpayment",
        "compound-interest": "compound interest",
        "sa-tax-calculator": "tax",
        "take-home-pay": "take home pay",
    }
    for slug, needle in must_contain.items():
        primary = result[slug]["primary"].lower()
        assert primary, f"{slug} got empty primary"
        assert needle in primary, f"{slug} primary should contain '{needle}', got '{primary}'"


def test_no_off_topic_primaries():
    """Slugs without specific corpus coverage must NOT get a wrong-topic
    primary (no cross-cluster pollution)."""
    result = mod.build_map(CSV_PATH, CALCS)
    must_not_contain = [
        ("isa-calculator", "ira"),     # ISA must not get IRA keywords
        ("tfsa-calculator", "ira"),
        ("tfsa-calculator", "roth"),
        ("401k-tax-calculator", "uk"), # 401k-tax must not get UK tax kws
    ]
    for slug, badword in must_not_contain:
        primary = result[slug].get("primary", "")
        if primary:
            assert badword not in primary.lower(), (
                f"{slug} got off-topic primary: '{primary}'"
            )


def test_no_duplicate_primaries():
    result = mod.build_map(CSV_PATH, CALCS)
    primaries = [v["primary"] for v in result.values() if v["primary"]]
    assert len(primaries) == len(set(primaries)), "Same primary assigned to multiple slugs"


def test_idempotent():
    a = mod.build_map(CSV_PATH, CALCS)
    b = mod.build_map(CSV_PATH, CALCS)
    assert a == b


def test_secondaries_from_same_cluster():
    """Secondaries (when present) should come from the same cluster as
    the primary."""
    result = mod.build_map(CSV_PATH, CALCS)
    import csv as _csv
    rows = list(_csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    kw_to_cluster = {r["keyword"]: r["cluster"] for r in rows}
    for slug, entry in result.items():
        if not entry["primary"]:
            continue
        primary_cluster = kw_to_cluster.get(entry["primary"])
        for sec in entry["secondaries"]:
            assert kw_to_cluster.get(sec) == primary_cluster, (
                f"{slug}: secondary '{sec}' is in cluster "
                f"{kw_to_cluster.get(sec)}, expected {primary_cluster}"
            )
