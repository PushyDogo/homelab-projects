"""Transaction filter tests: period shortcuts, budget and search filtering."""

from datetime import date

import pytest

from finance_tracker.budgets import Category
from finance_tracker.ui.data import NO_BUDGET, period_range, tag_and_filter


@pytest.mark.parametrize("period, expected", [
    ("all", (None, None)),
    ("this_month", ("2026-01-01", "2026-01-20")),
    ("last_month", ("2025-12-01", "2025-12-31")),          # crosses a year boundary
    ("last_3_months", ("2025-11-01", "2026-01-20")),
    ("last_12_months", ("2025-02-01", "2026-01-20")),
    ("this_year", ("2026-01-01", "2026-01-20")),
])
def test_period_shortcuts(period, expected):
    assert period_range(period, date(2026, 1, 20)) == expected


def test_last_month_handles_short_months():
    assert period_range("last_month", date(2026, 3, 31)) == ("2026-02-01", "2026-02-28")


def rows():
    return [
        {"counterparty": "PYU*Swiggy Food", "kind": "expense", "category": None, "reference": None, "account": "ICICI"},
        {"counterparty": "RSP*SWIGGY INSTAMART", "kind": "expense", "category": None, "reference": None, "account": "ICICI"},
        {"counterparty": "CAS*Swiggy refund", "kind": "refund", "category": None, "reference": None, "account": "ICICI"},
        {"counterparty": "Swiggy", "kind": "transfer", "category": None, "reference": None, "account": "ICICI"},
        {"counterparty": "XX551", "kind": "expense", "category": "Rent", "reference": "5097", "account": "ICICI"},
        {"counterparty": "BAHADUR SHAHI", "kind": "expense", "category": None, "reference": None, "account": "ICICI"},
    ]


CATEGORIES = [Category(1, "Food", 5, ["Swiggy"], "2026-07"), Category(2, "Groceries", 5, ["Instamart"], "2026-07"),
              Category(3, "Rent", 25, ["category:Rent"], "2026-07")]


def test_budget_filter_matches_what_the_budget_counts():
    food = tag_and_filter(rows(), CATEGORIES, budget="1")
    assert [r["counterparty"] for r in food] == ["PYU*Swiggy Food", "CAS*Swiggy refund"]   # not the transfer
    assert [r["counterparty"] for r in tag_and_filter(rows(), CATEGORIES, budget="3")] == ["XX551"]


def test_not_in_any_budget_and_budget_labels():
    tagged = tag_and_filter(rows(), CATEGORIES)
    assert [r["budget"] for r in tagged] == ["Food", "Groceries", "Food", None, "Rent", None]
    assert [r["counterparty"] for r in tag_and_filter(rows(), CATEGORIES, budget=NO_BUDGET)] == ["BAHADUR SHAHI"]


def test_search_covers_payee_budget_category_and_reference():
    assert len(tag_and_filter(rows(), CATEGORIES, search="swiggy")) == 4
    assert [r["counterparty"] for r in tag_and_filter(rows(), CATEGORIES, search="groceries")] == ["RSP*SWIGGY INSTAMART"]
    assert [r["counterparty"] for r in tag_and_filter(rows(), CATEGORIES, search="rent")] == ["XX551"]
    assert [r["counterparty"] for r in tag_and_filter(rows(), CATEGORIES, search="5097")] == ["XX551"]


def test_expense_category_filter_matches_the_overview_chart():
    grouped = [Category(1, "Food", 5, ["Swiggy"], "2026-07", group_id=10),
               Category(2, "Groceries", 5, ["Instamart"], "2026-07", group_id=10),
               Category(3, "Rent", 25, ["category:Rent"], "2026-07")]
    groups = {10: "Eating"}
    tagged = tag_and_filter(rows(), grouped, groups=groups)
    assert [r["group"] for r in tagged] == ["Eating", "Eating", "Eating", None, "Rent", "Other"]
    eating = tag_and_filter(rows(), grouped, groups=groups, group="Eating")
    assert [r["counterparty"] for r in eating] == ["PYU*Swiggy Food", "RSP*SWIGGY INSTAMART", "CAS*Swiggy refund"]
    assert [r["counterparty"] for r in tag_and_filter(rows(), grouped, groups=groups, group="Other")] == ["BAHADUR SHAHI"]
