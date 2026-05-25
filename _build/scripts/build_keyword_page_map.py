"""Map every calc slug in calculators.json to its best primary keyword
plus up to 5 secondaries, sourced from finncalc_keywords.csv.

Algorithm (revised 2026-05-24 after greedy-single-pass v1 produced bad
mappings):
  PASS 1 - primaries, MOST-SPECIFIC SLUG FIRST:
    For each slug in descending order of token-count:
      Candidates = keywords (not yet consumed) where
        slug_match_score + geo_bonus >= len(slug_tokens).
      Pick highest score, then highest volume.
      If no candidate meets the bar, primary stays empty.
        (Empty primary is the SAFE default - the patcher in 2A.3 skips
         empty primaries, so this means 'no metadata change' for that
         slug, which is correct when the corpus has no good match.)
  PASS 2 - secondaries:
    For each slug with non-empty primary, fill up to 5 secondaries from
    the same cluster, ranked by slug-match + geo bonus then volume.

Rationale for each rule:
  - SPECIFICITY-FIRST: coast-fire-calculator (2 tokens) processed before
    fire-calculator (1 token), so it claims 'coast fire calculator'
    before fire-calculator can steal it.
  - PERFECT-MATCH-REQUIRED: prevents '401k-tax-calculator' from
    grabbing 'tax calculator uk' (only 1 of 2 tokens overlap).
  - GEO-BONUS: sa-tax-calculator gets 'tax calculator' (sa) over
    'tax calculator uk' (1 of 2 + geo bonus = 2 >= required).
  - EMPTY-PRIMARY-OK: isa-calculator, tfsa-calculator, 401k-tax-calculator
    have no good corpus match - empty is correct; patcher is a no-op.
"""
import csv
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
STOP_TOKENS = {"calculator", "rate", "of", "for", "the", "a", "an"}

SLUG_TO_CLUSTER = {
    "compound-interest": "investment_growth",
    "mortgage": "mortgage",
    "take-home-pay": "tax",
    "retirement-savings": "retirement_planning",
    "investment-growth": "investment_growth",
    "savings-goal": "savings_budget",
    "inflation-impact": "investment_growth",
    "net-worth": "savings_budget",
    "loan-payoff": "debt_loans",
    "credit-card-payoff": "debt_loans",
    "emergency-fund": "savings_budget",
    "sa-tax-calculator": "tax",
    "401k-calculator": "retirement_accounts",
    "roth-ira-calculator": "retirement_accounts",
    "student-loan-calculator": "debt_loans",
    "debt-snowball-calculator": "debt_loans",
    "fire-calculator": "retirement_planning",
    "isa-calculator": "retirement_accounts",
    "tfsa-calculator": "retirement_accounts",
    "coast-fire-calculator": "retirement_planning",
    "401k-withdrawal-calculator": "retirement_accounts",
    "401k-tax-calculator": "retirement_accounts",
    "mortgage-repayment-calculator": "mortgage",
    "mortgage-overpayment-calculator": "mortgage",
    "texas-paycheck-calculator": "tax",
    "california-paycheck-calculator": "tax",
    "paye-calculator": "tax",
}

# Slug-token -> keyword-geo bonus. If slug contains any of these tokens
# AND the keyword's geo matches, score +1.
GEO_INDICATORS = {
    "sa": "sa", "za": "sa", "south-africa": "sa",
    "uk": "uk", "british": "uk", "england": "uk",
    "us": "us", "usa": "us", "america": "us",
    "texas": "us", "california": "us", "florida": "us", "nevada": "us", "washington": "us",
}


def _tokens(s: str) -> set[str]:
    return {t for t in re.split(r"[\s\-]+", s.lower()) if t and t not in STOP_TOKENS}


def _slug_match_score(slug_tokens: set[str], kw: str) -> int:
    return len(slug_tokens & _tokens(kw))


def _geo_bonus(slug: str, kw_geo: str) -> int:
    if not kw_geo:
        return 0
    parts = set(slug.lower().split("-"))
    for token, geo in GEO_INDICATORS.items():
        if token in parts and geo == kw_geo:
            return 1
    return 0


def _score(slug: str, slug_tokens: set[str], row: dict) -> int:
    return _slug_match_score(slug_tokens, row["keyword"]) + _geo_bonus(slug, row["geo"])


def build_map(csv_path: Path, calcs: dict) -> dict:
    rows = list(csv.DictReader(csv_path.open(encoding="utf-8")))
    result: dict = {
        slug: {"primary": "", "secondaries": [], "cluster": SLUG_TO_CLUSTER.get(slug, "")}
        for slug in calcs
    }
    used_kws: set[str] = set()

    # PASS 1: assign primaries, most-specific slug first.
    slugs_by_specificity = sorted(calcs, key=lambda s: -len(_tokens(s)))
    for slug in slugs_by_specificity:
        slug_tokens = _tokens(slug)
        required = len(slug_tokens)
        if required == 0:
            continue
        candidates = []
        for r in rows:
            if r["keyword"] in used_kws:
                continue
            sc = _score(slug, slug_tokens, r)
            if sc >= required:
                candidates.append((sc, int(r["search_volume"] or 0), r))
        if not candidates:
            continue
        candidates.sort(key=lambda t: (-t[0], -t[1]))
        primary_row = candidates[0][2]
        used_kws.add(primary_row["keyword"])
        result[slug].update({
            "primary": primary_row["keyword"],
            "volume": int(primary_row["search_volume"] or 0),
            "difficulty": int(primary_row["difficulty"] or 0),
            "cluster": primary_row["cluster"],
            "geo": primary_row["geo"],
        })

    # PASS 2: fill secondaries from same cluster (looser match OK).
    for slug in calcs:
        primary = result[slug]["primary"]
        if not primary:
            continue
        cluster = result[slug]["cluster"]
        slug_tokens = _tokens(slug)
        sec_pool = [
            r for r in rows
            if r["cluster"] == cluster
            and r["keyword"] not in used_kws
            and r["keyword"] != primary
        ]
        sec_pool.sort(key=lambda r: (-_score(slug, slug_tokens, r), -int(r["search_volume"] or 0)))
        secondaries = [r["keyword"] for r in sec_pool[:5]]
        for s in secondaries:
            used_kws.add(s)
        result[slug]["secondaries"] = secondaries

    return result


def main():
    csv_path = Path("C:/FIN_CALC_SITE/keywords/finncalc_keywords.csv")
    calcs = json.loads((REPO / "_build/data/calculators.json").read_text(encoding="utf-8"))
    result = build_map(csv_path, calcs)
    out = REPO / "_build/data/keyword_page_map.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    n_with_primary = sum(1 for v in result.values() if v["primary"])
    print(f"Wrote {out} - {len(result)} slugs mapped, {n_with_primary} with primary keyword.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
