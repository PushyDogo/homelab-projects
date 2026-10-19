"""Read-only queries backing the UI. Amounts stay in minor units (paise)."""

from contextlib import contextmanager
from datetime import date, timedelta
from pathlib import Path

from .. import db

_db_path: Path | None = None


def configure(path: Path | None) -> None:
    global _db_path
    _db_path = path


@contextmanager
def _connection():
    conn = db.open_default(_db_path)
    try:
        yield conn
    finally:
        conn.close()


def _rows(conn, sql, params=()):
    cursor = conn.execute(sql, params)
    names = [c[0] for c in cursor.description]
    return [dict(zip(names, row)) for row in cursor.fetchall()]


# e.g. "SBI Bank ·6354", "SBI FD ·3836", "ICICI Card ·7004" (banks show varying digits; use the last four).
ACCOUNT_LABEL = ("a.bank || ' ' || CASE WHEN a.is_deposit THEN 'FD' WHEN a.account_type = 'bank' THEN 'Bank' "
                 "ELSE 'Card' END || ' ·' || substr(a.suffix, -4)")


# Amount counted once per transfer: the credit side of a linked pair counts as zero.
_ONCE = "(CASE WHEN linked_txn_id IS NOT NULL AND direction = 'credit' THEN 0 ELSE amount_minor END)"


def overview() -> dict:
    """Headline numbers. Spend = expenses − refunds; transfers are excluded throughout."""
    from .. import budgets

    month_start = date.today().replace(day=1).isoformat()
    with _connection() as conn:
        (txn_count, first, last) = conn.execute(
            "SELECT count(*), min(txn_date), max(txn_date) FROM transactions").fetchone()
        month = dict(conn.execute(
            "SELECT kind, sum(amount_minor) FROM transactions "
            "WHERE currency = 'INR' AND txn_date >= ? GROUP BY kind", (month_start,)).fetchall())
        spend, spend_labels = budgets.spend_by_label(conn, "")
        group_names = [g.name for g in budgets.load_groups(conn)]
        income = dict(conn.execute(
            "SELECT substr(txn_date, 1, 7), sum(amount_minor) FROM transactions "
            "WHERE currency = 'INR' AND kind = 'income' GROUP BY 1").fetchall())
        # A paired transfer (e.g. savings → FD) is one movement; count its debit side only.
        # FDs are summarised from the FD records (see fixed_deposits), not from money movements.
        transfers = _rows(conn, f"""
            SELECT kind_rule AS rule, sum({_ONCE} > 0) AS count, sum({_ONCE}) AS total,
                   sum(CASE WHEN txn_date >= ? THEN {_ONCE} ELSE 0 END) AS this_month
            FROM transactions WHERE kind = 'transfer' AND currency = 'INR'
              AND coalesce(kind_rule, '') NOT IN ('fd_booking', 'fd_closure')
            GROUP BY kind_rule ORDER BY total DESC
        """, (month_start,))
        top_expenses = _rows(conn, """
            SELECT coalesce(counterparty, 'Unknown') AS counterparty, count(*) AS count, sum(amount_minor) AS total
            FROM transactions WHERE kind = 'expense' AND currency = 'INR' AND txn_date >= ?
            GROUP BY 1 ORDER BY total DESC LIMIT 8
        """, (month_start,))
        sync_row = conn.execute(
            "SELECT updated_at, export_name FROM sync_state WHERE source = 'sms'").fetchone()
        statuses = dict(conn.execute(
            "SELECT status, count(*) FROM processed_messages GROUP BY status").fetchall())
    return {
        "txn_count": txn_count, "first": first, "last": last,
        "month_spend": month.get("expense", 0) - month.get("refund", 0),
        "month_income": month.get("income", 0),
        "month_transfers": month.get("transfer", 0),
        "spend": spend,               # {month: {expense category: paise}}
        "spend_labels": spend_labels,
        "group_names": group_names,   # every expense category, for stable colours
        "income": income,             # {month: paise}
        "transfers": transfers,
        "top_expenses": top_expenses,
        "sync": {"updated_at": sync_row[0], "export": sync_row[1]} if sync_row else None,
        "statuses": statuses,
    }


def accounts() -> list[dict]:
    with _connection() as conn:
        return _rows(conn, f"""
            SELECT a.id, {ACCOUNT_LABEL} AS label, a.bank, a.account_type, substr(a.suffix, -4) AS suffix,
                   a.is_deposit, a.is_closed,
                   count(t.id) AS txn_count, min(t.txn_date) AS first, max(t.txn_date) AS last,
                   sum(CASE WHEN t.kind = 'expense' AND t.currency = 'INR' THEN t.amount_minor END) AS spent,
                   sum(CASE WHEN t.kind = 'income' AND t.currency = 'INR' THEN t.amount_minor END) AS income,
                   (SELECT balance_minor FROM transactions b JOIN processed_messages m ON m.hash = b.message_hash
                        WHERE b.account_id = a.id AND b.balance_minor IS NOT NULL
                        ORDER BY b.txn_date DESC, m.received_at DESC, b.id DESC LIMIT 1) AS balance,
                   (SELECT txn_date FROM transactions b WHERE b.account_id = a.id
                        AND b.balance_minor IS NOT NULL ORDER BY b.txn_date DESC LIMIT 1) AS balance_date
            FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
            GROUP BY a.id ORDER BY a.is_deposit, a.account_type, a.is_closed, count(t.id) DESC
        """)


def unassigned_count() -> int:
    with _connection() as conn:
        return conn.execute("SELECT count(*) FROM transactions WHERE account_id IS NULL").fetchone()[0]


def filter_options() -> dict:
    with _connection() as conn:
        # Fixed deposits (SBI numbers them like accounts) aren't offered as accounts.
        accounts_ = conn.execute(
            f"SELECT a.id, {ACCOUNT_LABEL} FROM accounts a WHERE a.is_deposit = 0 ORDER BY 2").fetchall()
        channels = [r[0] for r in conn.execute("SELECT DISTINCT channel FROM transactions ORDER BY 1")]
    return {"accounts": dict(accounts_), "channels": channels}


PERIODS = {
    "all": "All time",
    "this_month": "This month",
    "last_month": "Last month",
    "last_3_months": "Last 3 months",
    "last_12_months": "Last 12 months",
    "this_year": "This year",
    "custom": "Custom dates",
}
NO_BUDGET = "none"   # budget filter value for expenses that match no budget


def period_range(period: str, today: date) -> tuple[str | None, str | None]:
    """(from, to) ISO dates for a period shortcut; (None, None) means no limit."""
    first_this_month = today.replace(day=1)

    def months_back(n: int) -> date:
        year, month = first_this_month.year, first_this_month.month - n
        while month < 1:
            year, month = year - 1, month + 12
        return date(year, month, 1)

    if period == "this_month":
        return first_this_month.isoformat(), today.isoformat()
    if period == "last_month":
        start = months_back(1)
        return start.isoformat(), (first_this_month - timedelta(days=1)).isoformat()
    if period == "last_3_months":
        return months_back(2).isoformat(), today.isoformat()
    if period == "last_12_months":
        return months_back(11).isoformat(), today.isoformat()
    if period == "this_year":
        return date(today.year, 1, 1).isoformat(), today.isoformat()
    return None, None


def transactions(account_id=None, kind=None, channel=None, date_from=None, date_to=None,
                 budget=None, min_amount=None, max_amount=None, search=None, group=None) -> list[dict]:
    """Transactions matching every given filter, newest first.

    `budget` is a budget category id, or NO_BUDGET for expenses that match no budget;
    either way only expenses and refunds qualify, as those are what budgets count.
    Amounts are in paise and compare against the absolute amount. `search` matches
    (case-insensitively) the merchant/payee, reference, account, category or budget.
    `group` is an expense category name as the overview chart shows it (including
    rule categories and "Other"). Every expense and refund row gets `budget` (the
    matching budget's name) and `group` (its expense category).
    """
    from .. import budgets

    where, params = ["1"], []
    for clause, value in [("t.account_id = ?", account_id), ("t.kind = ?", kind),
                          ("t.channel = ?", channel), ("t.txn_date >= ?", date_from),
                          ("t.txn_date <= ?", date_to), ("t.amount_minor >= ?", min_amount),
                          ("t.amount_minor <= ?", max_amount)]:
        if value not in (None, ""):
            where.append(clause)
            params.append(value)
    if budget not in (None, "") or group not in (None, ""):
        where.append("t.kind IN ('expense', 'refund')")
    with _connection() as conn:
        rows = _rows(conn, f"""
            SELECT t.id, t.txn_date, coalesce({ACCOUNT_LABEL}, 'Unassigned') AS account, t.direction,
                   t.amount_minor, t.currency, t.channel, t.counterparty, t.reference,
                   t.balance_minor, t.template, t.message_hash, t.kind, t.kind_rule, t.linked_txn_id, t.category
            FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
            WHERE {' AND '.join(where)}
            ORDER BY t.txn_date DESC, t.id DESC
        """, params)
        categories = budgets.load_categories(conn)
        groups = {g.id: g.name for g in budgets.load_groups(conn)}
    return tag_and_filter(rows, categories, budget, search, groups, group)


def tag_and_filter(rows: list[dict], categories: list, budget=None, search=None, groups=None,
                   group=None) -> list[dict]:
    """Label each row with its budget and expense category, then apply the filters."""
    from .. import budgets

    groups = groups or {}
    for row in rows:
        spending = row["kind"] in ("expense", "refund")
        matched = budgets.match(categories, row["counterparty"], row["category"]) if spending else None
        row["budget_id"] = matched.id if matched else None
        row["budget"] = matched.name if matched else None
        row["group"] = (budgets.spend_label(categories, groups, row["counterparty"], row["category"])
                        if spending else None)
    if budget == NO_BUDGET:
        rows = [r for r in rows if r["budget_id"] is None and r["kind"] == "expense"]
    elif budget not in (None, ""):
        rows = [r for r in rows if r["budget_id"] == int(budget) and r["kind"] in ("expense", "refund")]
    if group not in (None, ""):
        rows = [r for r in rows if r["group"] == group]
    if search and search.strip():
        needle = search.strip().lower()
        rows = [r for r in rows if any(needle in (r[f] or "").lower()
                                       for f in ("counterparty", "reference", "account", "category", "budget",
                                                 "group"))]
    return rows


def budget_options() -> dict:
    """{id: name} of budget categories, for the transactions filter."""
    from .. import budgets

    with _connection() as conn:
        return {c.id: c.name for c in budgets.load_categories(conn)}


def group_options() -> list[str]:
    """Expense category names as the overview chart shows them, for the transactions filter."""
    from .. import budgets

    with _connection() as conn:
        return budgets.spend_by_label(conn, "")[1]


def messages(status=None) -> list[dict]:
    where, params = ("WHERE status = ?", (status,)) if status else ("", ())
    with _connection() as conn:
        return _rows(conn, f"""
            SELECT hash, received_at, sender, status, reason, parser_version, body
            FROM processed_messages {where} ORDER BY received_at DESC
        """, params)


def transaction(txn_id: int) -> dict | None:
    with _connection() as conn:
        rows = _rows(conn, f"""
            SELECT t.id, t.txn_date, coalesce({ACCOUNT_LABEL}, 'Unassigned') AS account, t.direction,
                   t.amount_minor, t.currency, t.kind
            FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id WHERE t.id = ?
        """, (txn_id,))
    return rows[0] if rows else None


def message(message_hash: str) -> dict | None:
    with _connection() as conn:
        rows = _rows(conn, """
            SELECT m.hash, m.received_at, m.sender, m.status, m.reason, m.parser_version, m.body,
                   t.id AS txn_id
            FROM processed_messages m LEFT JOIN transactions t ON t.message_hash = m.hash
            WHERE m.hash = ?
        """, (message_hash,))
    return rows[0] if rows else None


# --- Deposits ------------------------------------------------------------------

def fixed_deposits() -> list:
    from .. import deposits

    with _connection() as conn:
        return deposits.load(conn)


def add_fd_adjustment(bank: str, number: str | None, principal_minor: int | None, opened_on: str | None,
                      closed_on: str | None, note: str | None) -> None:
    if not number and not principal_minor:
        raise ValueError("A new FD needs an amount")
    with _connection() as conn:
        conn.execute(
            "INSERT INTO fd_adjustments (bank, number, principal_minor, opened_on, closed_on, note, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            (bank, number or None, principal_minor, opened_on or None, closed_on or None, note or None))


def delete_fd_adjustment(adjustment_id: int) -> None:
    with _connection() as conn:
        conn.execute("DELETE FROM fd_adjustments WHERE id = ?", (adjustment_id,))


def ppf_entries() -> list[dict]:
    with _connection() as conn:
        return _rows(conn, "SELECT id, entry_date, entry_type, amount_minor, note FROM ppf_entries "
                           "ORDER BY entry_date DESC, id DESC")


def add_ppf_entry(entry_date: str, entry_type: str, amount_minor: int, note: str | None) -> None:
    if entry_type not in ("balance", "deposit", "interest") or amount_minor <= 0:
        raise ValueError("PPF entries need a type and a positive amount")
    day = date.fromisoformat(entry_date)
    if day > date.today():
        raise ValueError("PPF entries can't be in the future")
    with _connection() as conn:
        conn.execute(
            "INSERT INTO ppf_entries (entry_date, entry_type, amount_minor, note, created_at) "
            "VALUES (?, ?, ?, ?, datetime('now'))", (entry_date, entry_type, amount_minor, note or None))


def delete_ppf_entry(entry_id: int) -> None:
    with _connection() as conn:
        conn.execute("DELETE FROM ppf_entries WHERE id = ?", (entry_id,))


# --- Investments ---------------------------------------------------------------

def latest_portfolio(source: str = "zerodha") -> dict | None:
    from .. import investments

    with _connection() as conn:
        return investments.latest_snapshot(conn, source)


def store_portfolio(portfolio, source: str = "zerodha") -> None:
    from .. import investments

    with _connection() as conn:
        investments.store_snapshot(conn, source, portfolio)


# --- Net worth -----------------------------------------------------------------

def net_worth_history(months: int = 12) -> list:
    from .. import networth

    with _connection() as conn:
        return networth.history(conn, date.today(), months)


# --- Settings ------------------------------------------------------------------

def get_setting(key: str, default=None):
    import json

    with _connection() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return json.loads(row[0]) if row else default


def set_setting(key: str, value) -> None:
    import json

    with _connection() as conn:
        conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) "
            "ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            (key, json.dumps(value)))


# --- Budgets -------------------------------------------------------------------

def budget_view() -> tuple:
    """(report, income base in use, suggested base, expense groups). Seeds the default categories on first use."""
    from .. import budgets

    today = date.today()
    with _connection() as conn:
        if not conn.execute("SELECT 1 FROM budget_categories LIMIT 1").fetchone():
            budgets.seed_defaults(conn, budgets.month_key(today))
        suggested = budgets.suggested_income_base(conn, today)
    base = get_setting("budget_income_minor") or suggested
    with _connection() as conn:
        return budgets.report(conn, today, base), base, suggested, budgets.load_groups(conn)


def set_budget_income(amount_minor: int) -> None:
    set_setting("budget_income_minor", int(amount_minor))


def save_budget_category(category_id: int | None, name: str, percent: float, keywords: list[str],
                         start_month: str, goal_minor: int | None, goal_label: str | None,
                         rollover: bool = True, group_id: int | None = None) -> None:
    import json

    name = (name or "").strip()
    if not name:
        raise ValueError("Give the category a name")
    if not 0 <= percent <= 100:
        raise ValueError("The percentage must be between 0 and 100")
    date.fromisoformat(start_month + "-01")
    keywords = [k.strip() for k in keywords if k.strip()]
    with _connection() as conn:
        clash = conn.execute("SELECT id FROM budget_categories WHERE lower(name) = lower(?) AND id != ?",
                             (name, category_id or 0)).fetchone()
        if clash:
            raise ValueError(f"There's already a category called {name!r}")
        if category_id:
            conn.execute(
                "UPDATE budget_categories SET name = ?, percent = ?, keywords = ?, start_month = ?, goal_minor = ?, "
                "goal_label = ?, rollover = ?, group_id = ? WHERE id = ?",
                (name, percent, json.dumps(keywords), start_month, goal_minor, goal_label or None, int(rollover),
                 group_id, category_id))
        else:
            (position,) = conn.execute("SELECT coalesce(max(position), 0) + 1 FROM budget_categories").fetchone()
            conn.execute(
                "INSERT INTO budget_categories (name, percent, keywords, start_month, goal_minor, goal_label, position, "
                "rollover, group_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
                (name, percent, json.dumps(keywords), start_month, goal_minor, goal_label or None, position,
                 int(rollover), group_id))


def delete_budget_category(category_id: int) -> None:
    with _connection() as conn:
        conn.execute("DELETE FROM budget_categories WHERE id = ?", (category_id,))


def save_expense_group(group_id: int | None, name: str, category_ids: list[int]) -> None:
    """Create or rename an expense category and set exactly which budget categories it holds.

    A budget category belongs to at most one expense category, so picking it here moves it.
    """
    name = (name or "").strip()
    if not name:
        raise ValueError("Give the expense category a name")
    with _connection() as conn:
        clash = conn.execute("SELECT id FROM expense_groups WHERE lower(name) = lower(?) AND id != ?",
                             (name, group_id or 0)).fetchone()
        if clash:
            raise ValueError(f"There's already an expense category called {name!r}")
        conn.execute("BEGIN")   # rename and membership change together
        if group_id:
            conn.execute("UPDATE expense_groups SET name = ? WHERE id = ?", (name, group_id))
        else:
            (position,) = conn.execute("SELECT coalesce(max(position), -1) + 1 FROM expense_groups").fetchone()
            group_id = conn.execute("INSERT INTO expense_groups (name, position, created_at) "
                                    "VALUES (?, ?, datetime('now'))", (name, position)).lastrowid
        conn.execute("UPDATE budget_categories SET group_id = NULL WHERE group_id = ?", (group_id,))
        conn.executemany("UPDATE budget_categories SET group_id = ? WHERE id = ?",
                         [(group_id, int(c)) for c in category_ids])
        conn.execute("COMMIT")


def delete_expense_group(group_id: int) -> None:
    """Its budget categories stay, ungrouped."""
    with _connection() as conn:
        conn.execute("DELETE FROM expense_groups WHERE id = ?", (group_id,))
