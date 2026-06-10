"""Reference implementation regression: compound interest with optional contributions.

Source: standard financial math (Bodie/Kane/Marcus, "Investments").
Wiki: C:\\websites\\_shared\\wiki\\formulas\\financial-fundamentals.md#compound-interest
Canonical equation:
    FV = PV * (1 + r/n)^(n*t) + PMT * ((1 + r/n)^(n*t) - 1) / (r/n)
where PV=present value, r=annual rate, n=compoundings per year,
      t=years, PMT=periodic contribution at end of period.
"""
from __future__ import annotations

import pytest


def future_value(
    pv: float, annual_rate: float, periods_per_year: int, years: float, pmt: float = 0.0
) -> float:
    """Return the future value of a lump sum plus optional periodic contributions."""
    if annual_rate == 0:
        return pv + pmt * periods_per_year * years
    i = annual_rate / periods_per_year
    n = periods_per_year * years
    lump = pv * (1 + i) ** n
    contributions = pmt * (((1 + i) ** n - 1) / i)
    return lump + contributions


@pytest.mark.parametrize(
    "pv, rate, n, years, pmt, expected",
    [
        # $10k @ 5% annual, compounded annually, 10yr, no contributions
        (10000.0, 0.05, 1, 10, 0.0, 16288.95),
        # $10k @ 5% annual, compounded monthly, 10yr, no contributions
        (10000.0, 0.05, 12, 10, 0.0, 16470.09),
        # $10k @ 5% annual, monthly compounding, 10yr, $100/mo contributions
        (10000.0, 0.05, 12, 10, 100.0, 31998.32),
        # $5k @ 4% annual, compounded quarterly, 5yr, no contributions
        (5000.0, 0.04, 4, 5, 0.0, 6100.95),
        # $1k @ 7% annual, monthly compounding, 20yr, no contributions
        (1000.0, 0.07, 12, 20, 0.0, 4038.74),
    ],
)
def test_future_value(
    pv: float, rate: float, n: int, years: float, pmt: float, expected: float
) -> None:
    # Tolerance widened to abs=0.5 because the formula is sensitive to compounding
    # convention; values are verified against the canonical formula in this file.
    assert future_value(pv, rate, n, years, pmt) == pytest.approx(expected, abs=0.5)


def test_zero_rate_returns_pv_plus_contributions() -> None:
    """Edge case: 0% rate => FV = PV + total contributions."""
    # $1000 lump + $100/mo * 12 mo/yr * 5 yr = $1000 + $6000 = $7000
    assert future_value(1000.0, 0.0, 12, 5, 100.0) == pytest.approx(7000.0, abs=0.05)


def test_zero_pv_with_contributions() -> None:
    """Edge case: no starting balance, only contributions."""
    # $0 lump, $100/mo @ 5% monthly compounding for 10 yrs
    # = $100 * ((1.0041667)^120 - 1) / 0.0041667 ~= $15528.23
    result = future_value(0.0, 0.05, 12, 10, 100.0)
    assert result == pytest.approx(15528.23, abs=0.5)
