"""Reference implementation regression: mortgage amortisation (constant payment).

Source: CFPB standard definition.
Wiki: C:\\websites\\_shared\\wiki\\formulas\\financial-fundamentals.md#mortgage-amortisation
Canonical equation:
    PMT = P * [i(1+i)^n] / [(1+i)^n - 1]
where P=principal, i=monthly rate (annual/12), n=total payments (years*12).

Special case: zero rate => PMT = P / (years * 12).
"""
from __future__ import annotations

import pytest


def monthly_payment(principal: float, annual_rate: float, years: int) -> float:
    """Return the constant monthly mortgage payment using the CFPB formula."""
    if annual_rate == 0:
        return principal / (years * 12)
    i = annual_rate / 12
    n = years * 12
    return principal * (i * (1 + i) ** n) / ((1 + i) ** n - 1)


@pytest.mark.parametrize(
    "principal, rate, years, expected",
    [
        (200000, 0.06, 30, 1199.10),  # standard 30-year fixed; CFPB sample
        (100000, 0.05, 15, 790.79),
        (250000, 0.07, 30, 1663.26),
        (300000, 0.045, 30, 1520.06),
        (150000, 0.0375, 15, 1090.83),
    ],
)
def test_monthly_payment(principal: float, rate: float, years: int, expected: float) -> None:
    assert monthly_payment(principal, rate, years) == pytest.approx(expected, abs=0.05)


def test_zero_rate_uses_principal_over_n_months() -> None:
    """Edge case: 0% loan => simple division over the loan term."""
    assert monthly_payment(120000, 0.0, 30) == pytest.approx(120000 / 360, abs=0.01)
