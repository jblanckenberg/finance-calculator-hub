"""Reference implementation regression: 401(k) contribution limit check.

Source: IRS IR-2023-203 (2024 contribution limits).
Wiki: C:\\websites\\_shared\\wiki\\formulas\\tax-and-retirement.md

2024 limits (IRS-published):
- Employee elective deferral: $23,000
- Catch-up contribution (age 50+): $7,500
- Max employee contribution age 50+: $23,000 + $7,500 = $30,500
- Combined limit (employee + employer match + after-tax): $69,000
- Combined limit with catch-up: $76,500
"""
from __future__ import annotations

import pytest

# IRS 2024 limits (IR-2023-203)
EMPLOYEE_LIMIT_2024 = 23_000
CATCH_UP_LIMIT_2024 = 7_500
COMBINED_LIMIT_2024 = 69_000


def max_employee_contribution(age: int, year: int = 2024) -> int:
    """Return the maximum elective deferral the employee can make for the year."""
    if year != 2024:
        raise NotImplementedError("only 2024 limits implemented in this regression test")
    base = EMPLOYEE_LIMIT_2024
    if age >= 50:
        return base + CATCH_UP_LIMIT_2024
    return base


def is_employee_within_limit(contribution: float, age: int, year: int = 2024) -> bool:
    """Return True if the employee contribution is within IRS limits."""
    return contribution <= max_employee_contribution(age, year)


def is_combined_within_limit(
    employee_contribution: float,
    employer_match: float,
    age: int,
    year: int = 2024,
) -> bool:
    """Return True if employee + employer total is within the combined 415(c) limit."""
    if year != 2024:
        raise NotImplementedError("only 2024 limits implemented in this regression test")
    cap = COMBINED_LIMIT_2024
    if age >= 50:
        cap += CATCH_UP_LIMIT_2024
    return (employee_contribution + employer_match) <= cap


@pytest.mark.parametrize(
    "age, expected_max",
    [
        (25, 23_000),      # under-50
        (49, 23_000),      # still under-50
        (50, 30_500),      # catch-up kicks in
        (55, 30_500),
        (70, 30_500),
    ],
)
def test_max_employee_contribution(age: int, expected_max: int) -> None:
    assert max_employee_contribution(age, 2024) == expected_max


@pytest.mark.parametrize(
    "contribution, age, expected_ok",
    [
        (23_000, 30, True),       # exactly at limit, under 50
        (23_001, 30, False),      # $1 over
        (30_500, 55, True),       # max for 50+
        (30_501, 55, False),      # $1 over for 50+
        (15_000, 25, True),       # well under
    ],
)
def test_is_employee_within_limit(contribution: float, age: int, expected_ok: bool) -> None:
    assert is_employee_within_limit(contribution, age, 2024) is expected_ok


def test_combined_limit_employer_match_excluded_from_employee_cap() -> None:
    """Employer match doesn't count toward the $23,000 employee cap but does
    count toward the $69,000 (or $76,500 with catch-up) combined cap."""
    # Employee at max ($23k under 50) + $20k employer match = $43k total, under $69k combined
    assert is_combined_within_limit(23_000, 20_000, 35, 2024) is True
    # Employee at max + huge employer match that breaches $69k
    assert is_combined_within_limit(23_000, 50_000, 35, 2024) is False  # $73k > $69k


def test_combined_limit_with_catch_up_for_50plus() -> None:
    """Combined limit for age 50+ is $76,500."""
    # $30,500 employee + $46,000 employer = $76,500 - exactly at cap
    assert is_combined_within_limit(30_500, 46_000, 55, 2024) is True
    # $30,500 + $46,001 = $76,501 - over
    assert is_combined_within_limit(30_500, 46_001, 55, 2024) is False


def test_zero_contribution_always_within_limit() -> None:
    """Edge case: not contributing is always within limits."""
    assert is_employee_within_limit(0, 30, 2024) is True
    assert is_employee_within_limit(0, 60, 2024) is True
