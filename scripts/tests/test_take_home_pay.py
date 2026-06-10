"""Reference implementation regression: take-home pay (federal income tax brackets).

Source: IRS Rev. Proc. 2023-34 — 2024 federal income tax brackets (single filer).
Wiki: C:\\websites\\_shared\\wiki\\formulas\\tax-and-retirement.md
Standard deduction (single, 2024): $14,600.

2024 Single-filer brackets:
- 10% on income up to $11,600
- 12% from $11,601 to $47,150
- 22% from $47,151 to $100,525
- 24% from $100,526 to $191,950
- 32% from $191,951 to $243,725
- 35% from $243,726 to $609,350
- 37% above $609,350

This test does not include FICA (Social Security 6.2% + Medicare 1.45%) or state tax.
It locks the federal bracket math used by FinnCalc's take-home pay calculator.
"""
from __future__ import annotations

import pytest

# IRS Rev. Proc. 2023-34 (single filer, 2024)
BRACKETS_2024_SINGLE = [
    (11_600, 0.10),
    (47_150, 0.12),
    (100_525, 0.22),
    (191_950, 0.24),
    (243_725, 0.32),
    (609_350, 0.35),
    (float("inf"), 0.37),
]

STANDARD_DEDUCTION_2024_SINGLE = 14_600


def federal_income_tax(taxable_income: float) -> float:
    """Return 2024 federal income tax for a single filer given taxable income.

    Bracket math is applied marginally - each tier's rate applies only to the
    portion of income within that tier.
    """
    if taxable_income <= 0:
        return 0.0
    tax = 0.0
    prev_top = 0.0
    for top, rate in BRACKETS_2024_SINGLE:
        if taxable_income <= top:
            tax += (taxable_income - prev_top) * rate
            return tax
        tax += (top - prev_top) * rate
        prev_top = top
    return tax


def take_home_pay_federal_only(gross_income: float) -> float:
    """Return take-home pay considering only federal income tax + standard deduction.

    Does NOT include FICA, state tax, or pre-tax deductions.
    """
    taxable = max(0.0, gross_income - STANDARD_DEDUCTION_2024_SINGLE)
    return gross_income - federal_income_tax(taxable)


@pytest.mark.parametrize(
    "taxable_income, expected_tax",
    [
        (0, 0.0),                # zero income, zero tax
        (11_600, 1_160.00),      # exactly at top of 10% bracket
        (35_400, 4_016.00),      # $50k gross minus standard deduction; matches IRS tables
        (50_000, 6_053.00),      # standard 12%/22% boundary case
        (100_000, 17_053.00),    # spans 10/12/22 brackets
        (200_000, 41_686.50),    # spans into 24% bracket
        (700_000, 217_187.75),   # hits top 37% bracket
    ],
)
def test_federal_income_tax(taxable_income: float, expected_tax: float) -> None:
    assert federal_income_tax(taxable_income) == pytest.approx(expected_tax, abs=0.05)


def test_take_home_50k_gross() -> None:
    """$50,000 gross - $14,600 standard deduction = $35,400 taxable; tax = $4,016.
    Take-home (federal only) = $50,000 - $4,016 = $45,984."""
    assert take_home_pay_federal_only(50_000) == pytest.approx(45_984.0, abs=0.05)


def test_zero_income_zero_tax() -> None:
    """Edge case: $0 income = $0 tax = $0 take-home."""
    assert federal_income_tax(0) == 0.0
    assert take_home_pay_federal_only(0) == 0.0


def test_negative_income_treated_as_zero() -> None:
    """Edge case: negative income (rare; could happen with business loss) -> no tax."""
    assert federal_income_tax(-5_000) == 0.0


def test_top_bracket_above_609350() -> None:
    """Edge case: income above the $609,350 boundary hits the 37% top bracket on the excess."""
    # $700,000 - $609,350 = $90,650 taxed at 37%
    # Tax up to $609,350 (computed from brackets above) + 90,650 * 0.37
    # We already test the absolute number; here we verify the marginal rate above the cap.
    tax_at_cap = federal_income_tax(609_350)
    tax_above = federal_income_tax(700_000) - tax_at_cap
    assert tax_above == pytest.approx(90_650 * 0.37, abs=0.05)
