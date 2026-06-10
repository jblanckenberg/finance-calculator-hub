"""Reference implementation regression: retirement drawdown (simple variant).

Source: Trinity Study (Cooley/Hubbard/Walz, 1998) underpins the "4% rule";
Bengen's 1994 paper is the original SAFEMAX analysis. This implementation
is the simple end-of-year withdrawal variant used in most calculator UIs.

Model:
    balance_{t+1} = balance_t * (1 + annual_return) - annual_withdrawal

Withdrawal happens at the end of each year after that year's growth.
"""
from __future__ import annotations

import math

import pytest


def drawdown_balance(
    starting_balance: float,
    annual_withdrawal: float,
    annual_return: float,
    years: int,
) -> float:
    """Return the ending balance after `years` of growth-then-withdrawal."""
    balance = starting_balance
    for _ in range(years):
        balance = balance * (1 + annual_return) - annual_withdrawal
    return balance


@pytest.mark.parametrize(
    "balance, withdrawal, rate, years, expected_ending",
    [
        # $1M, $40k/yr (4% rule), 5% return, 30 years
        # 4% rule is meant to preserve principal across typical 30-year retirement
        (1_000_000.0, 40_000.0, 0.05, 30, 1_664_388.48),
        # $1M, $100k/yr (10% rate), 5% return, 15 years -> exhausted (negative)
        (1_000_000.0, 100_000.0, 0.05, 15, -78_928.18),
        # $500k, $25k/yr (5% rate), 6% return, 25 years
        (500_000.0, 25_000.0, 0.06, 25, 774_322.56),
        # No withdrawal, just compounding: $1M @ 5% for 10 years
        (1_000_000.0, 0.0, 0.05, 10, 1_628_894.63),
        # No growth, equal withdrawal: $300k withdrawn $30k/yr over 10 yrs = $0
        (300_000.0, 30_000.0, 0.0, 10, 0.0),
    ],
)
def test_drawdown_balance(
    balance: float, withdrawal: float, rate: float, years: int, expected_ending: float
) -> None:
    # abs=1.0 tolerance because iterative compounding can accumulate small float error.
    assert drawdown_balance(balance, withdrawal, rate, years) == pytest.approx(
        expected_ending, abs=1.0
    )


def test_100_pct_withdrawal_exhausts_in_one_year() -> None:
    """Edge case: a 100% withdrawal with 0% return empties the account in 1 year."""
    assert drawdown_balance(100_000.0, 100_000.0, 0.0, 1) == pytest.approx(0.0, abs=0.01)


def test_4_percent_rule_preserves_principal_approximately() -> None:
    """Classic 4% rule test: $1M, $40k/yr at 5% real return over 30 yrs
    should leave principal intact (or growing)."""
    ending = drawdown_balance(1_000_000.0, 40_000.0, 0.05, 30)
    assert ending >= 1_000_000.0, "4% rule at 5% real return should preserve principal"


def test_zero_balance_with_withdrawal_goes_negative() -> None:
    """Edge case: starting from $0 with any withdrawal immediately goes negative."""
    result = drawdown_balance(0.0, 1000.0, 0.05, 1)
    assert result < 0, "withdrawing from zero balance must go negative"
    # 0 * 1.05 - 1000 = -1000
    assert result == pytest.approx(-1000.0, abs=0.01)
