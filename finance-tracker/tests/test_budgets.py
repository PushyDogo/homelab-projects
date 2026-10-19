"""Rolling budget tests (synthetic data only)."""

import json
from datetime import date

import pytest

from finance_tracker import budgets, db

KEY = "ab" * 32


@pytest.fixture
def conn(tmp_path):
    connection = db.connect(tmp_path / "b.db", KEY)
    connection.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (1, 'ICICI', 'bank', '0123')")
    yield connection
    connection.close()


def category(conn, name, percent, keywords, start="2026-07", goal=None):
    conn.execute("INSERT INTO budget_categories (name, percent, keywords, start_month, goal_minor, created_at) "
                 "VALUES (?, ?, ?, ?, ?, 'now')", (name, percent, json.dumps(keywords), start, goal))


def txn(conn, rupees, day, counterparty, kind="expense", category_=None):
    digest = f"h{conn.execute('SELECT count(*) FROM processed_messages').fetchone()[0]}"
    conn.execute("INSERT INTO processed_messages VALUES (?, 'sms', 'ICICIT', '2026-01-01T00:00:00', 'x', "
                 "'parsed', NULL, 1, 'now')", (digest,))
    conn.execute(
        "INSERT INTO transactions (account_id, bank, direction, amount_minor, currency, txn_date, channel, counterparty, "
        "template, message_hash, created_at, kind, category) VALUES (1, 'ICICI', ?, ?, 'INR', ?, 'upi', ?, 't', ?, 'now', ?, ?)",
        ("credit" if kind in ("refund", "income") else "debit", rupees * 100, day, counterparty, digest, kind, category_))


def test_longest_keyword_wins_and_rules_category_matches():
    food = budgets.Category(1, "Food", 5, ["Swiggy"], "2026-07")
    groceries = budgets.Category(2, "Groceries", 5, ["Instamart"], "2026-07")
    rent = budgets.Category(3, "Rent", 25, ["category:Rent"], "2026-07")
    cats = [food, groceries, rent]
    assert budgets.match(cats, "RSP*SWIGGY INSTAMART", None) is groceries
    assert budgets.match(cats, "PYU*Swiggy Food", None) is food
    assert budgets.match(cats, "XX551", "Rent") is rent
    assert budgets.match(cats, "SOMEONE", None) is None


def test_unused_allocation_rolls_over_and_refunds_return(conn):
    category(conn, "Food", 5, ["Swiggy"], start="2026-07")
    txn(conn, 3000, "2026-07-10", "Swiggy")            # July: 5,000 allocated, 3,000 spent
    txn(conn, 7000, "2026-08-12", "Swiggy")            # August: 5,000 more, 7,000 spent
    txn(conn, 500, "2026-08-13", "CAS*Swiggy refund", kind="refund")
    txn(conn, 999, "2026-06-30", "Swiggy")             # before the start month: ignored
    txn(conn, 10000, "2026-08-01", "Swiggy", kind="transfer")   # never budget spending
    report = budgets.report(conn, date(2026, 9, 15), income_base=100000_00)
    status = report.statuses[0]
    assert status.monthly == 5000_00 and status.months == 3
    assert status.allocated == 15000_00
    assert status.spent == (3000 + 7000 - 500) * 100
    assert status.balance == (15000 - 9500) * 100
    assert [h["balance"] for h in status.history] == [2000_00, 500_00, 5500_00]


def test_goal_months_and_unbudgeted_spend(conn):
    category(conn, "Games", 2, ["Steam"], start="2026-09", goal=10000_00)
    txn(conn, 1200, "2026-09-03", "BAHADUR SHAHI")
    report = budgets.report(conn, date(2026, 9, 15), income_base=100000_00)
    status = report.statuses[0]
    assert status.balance == 2000_00
    assert status.months_to_goal == 4          # 8,000 short at 2,000 a month
    assert report.unbudgeted_this_month == 1200_00
    assert report.unbudgeted_merchants == [("BAHADUR SHAHI", 1200_00)]
    assert report.allocated_percent == 2


def test_defaults_are_conservative_and_leave_room_to_save(conn):
    budgets.seed_defaults(conn, "2026-09")
    cats = budgets.load_categories(conn)
    assert len(cats) == len(budgets.DEFAULT_CATEGORIES)
    total = sum(c.percent for c in cats)
    assert total <= 80 and 100 - total >= 20      # 50/30/20: at least 20% saved
    for name, percent, cited, _ in budgets.DEFAULT_CATEGORIES:
        assert percent == int(cited.split("–")[0])   # always the low end of the cited range


def test_suggested_income_base_is_the_median(conn):
    for month, rupees in [("2026-03", 100), ("2026-04", 400), ("2026-05", 200)]:
        txn(conn, rupees, f"{month}-15", "Salary", kind="income")
    txn(conn, 999, "2026-09-02", "Salary", kind="income")   # current month is excluded
    assert budgets.suggested_income_base(conn, date(2026, 9, 20)) == 200_00


def test_monthly_budget_resets_while_a_savings_pot_accumulates(conn):
    category(conn, "Food", 5, ["Swiggy"], start="2026-07")
    category(conn, "Groceries", 5, ["Instamart"], start="2026-07")
    conn.execute("UPDATE budget_categories SET rollover = 0 WHERE name = 'Groceries'")
    txn(conn, 1000, "2026-07-10", "Instamart")      # July: 4,000 unused
    txn(conn, 7000, "2026-08-10", "Instamart")      # August: 2,000 over
    txn(conn, 1500, "2026-09-02", "Instamart")      # September so far
    report = budgets.report(conn, date(2026, 9, 15), income_base=100000_00)
    food, groceries = report.statuses
    assert [h["balance"] for h in groceries.history] == [4000_00, -2000_00, 3500_00]   # no carry-over
    assert groceries.balance == 3500_00 and groceries.months_to_goal is None
    assert food.balance == 15000_00                                                     # 3 months saved up


def test_defaults_split_needs_and_wants(conn):
    budgets.seed_defaults(conn, "2026-09")
    monthly = {c.name for c in budgets.load_categories(conn) if not c.rollover}
    assert monthly == budgets.NEEDS


def test_defaults_put_every_category_in_an_expense_category(conn):
    budgets.seed_defaults(conn, "2026-09")
    groups = {g.id: g.name for g in budgets.load_groups(conn)}
    assert list(groups.values()) == [name for name, _ in budgets.DEFAULT_GROUPS]
    assert all(c.group_id in groups for c in budgets.load_categories(conn))


def test_spend_is_stacked_by_expense_category_with_fallbacks(conn):
    conn.execute("INSERT INTO expense_groups (id, name, position, created_at) VALUES (99, 'Eating', 9, 'now')")
    category(conn, "Delivery", 5, ["Swiggy"])
    category(conn, "Groceries", 5, ["Instamart"])
    category(conn, "Games", 2, ["Steam"])               # not in any expense category
    conn.execute("UPDATE budget_categories SET group_id = 99 WHERE name IN ('Delivery', 'Groceries')")
    txn(conn, 300, "2026-09-01", "Swiggy")
    txn(conn, 200, "2026-09-02", "RSP*SWIGGY INSTAMART")
    txn(conn, 50, "2026-09-03", "CAS*Swiggy refund", kind="refund")    # comes off Eating
    txn(conn, 5000, "2026-09-04", "CBDTTAX", category_="Tax")          # rule category, no budget
    txn(conn, 999, "2026-09-05", "Steam")                              # budget without a group → Other
    txn(conn, 100, "2026-09-06", "BAHADUR SHAHI")                      # no budget → Other
    txn(conn, 7000, "2026-09-07", "Swiggy", kind="transfer")           # never spending
    spend, order = budgets.spend_by_label(conn, "2026-09-01")
    assert spend == {"2026-09": {"Eating": 450_00, "Tax": 5000_00, "Other": 1099_00}}
    assert order == ["Eating", "Tax", "Other"]


def test_deleting_an_expense_category_keeps_its_budgets(conn):
    conn.execute("INSERT INTO expense_groups (id, name, position, created_at) VALUES (99, 'Eating', 9, 'now')")
    category(conn, "Delivery", 5, ["Swiggy"])
    conn.execute("UPDATE budget_categories SET group_id = 99")
    conn.execute("DELETE FROM expense_groups WHERE id = 99")
    assert [(c.name, c.group_id) for c in budgets.load_categories(conn)] == [("Delivery", None)]
