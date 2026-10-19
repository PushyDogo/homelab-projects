"""Net worth at a date: what you own.

  bank         latest SMS-reported balance of each bank account (not deposits)
  fds          principal of fixed deposits open on that date (unknown amounts skipped)
  ppf          PPF balance from hand-entered entries
  investments  latest broker snapshot taken on or before that date (holdings + cash)

Credit card balances aren't subtracted: card purchases are already counted as
spending when they happen, and paying the bill moves money out of the bank.

Everything is recomputed from stored data, so any date can be evaluated;
`history()` evaluates the last N month-ends.
"""

from dataclasses import dataclass
from datetime import date, timedelta

from . import deposits, ppf


@dataclass(frozen=True)
class NetWorth:
    as_of: date
    bank: int           # all amounts in paise
    fds: int
    ppf: int
    investments: int
    has_investments: bool   # a broker snapshot existed by this date

    @property
    def total(self) -> int:
        return self.bank + self.fds + self.ppf + self.investments


class Calculator:
    """Loads everything once, then evaluates any number of dates."""

    def __init__(self, conn):
        self.balances = conn.execute(
            """
            SELECT t.account_id, t.txn_date, t.balance_minor FROM transactions t
            JOIN accounts a ON a.id = t.account_id
            JOIN processed_messages m ON m.hash = t.message_hash
            WHERE a.account_type = 'bank' AND a.is_deposit = 0 AND t.balance_minor IS NOT NULL
              AND t.currency = 'INR'
            -- Same-day transactions are ordered by when their SMS arrived.
            ORDER BY t.txn_date, m.received_at, t.id
            """
        ).fetchall()
        self.fds = [fd for fd in deposits.load(conn) if fd.principal]
        self.ppf_entries = [dict(zip(("id", "entry_date", "entry_type", "amount_minor"), row)) for row in conn.execute(
            "SELECT id, entry_date, entry_type, amount_minor FROM ppf_entries").fetchall()]
        self.snapshots = conn.execute(
            """
            SELECT s.fetched_at, coalesce(s.cash_minor, 0) + coalesce(
                (SELECT round(sum(h.quantity * h.last_price) * 100) FROM investment_holdings h
                 WHERE h.snapshot_id = s.id), 0)
            FROM investment_snapshots s ORDER BY s.fetched_at
            """
        ).fetchall()

    def at(self, as_of: date) -> NetWorth:
        day = as_of.isoformat()

        latest = {}
        for account_id, txn_date, balance in self.balances:
            if txn_date <= day:
                latest[account_id] = balance
        bank = sum(latest.values())

        fds = sum(fd.principal for fd in self.fds
                  if (fd.opened_on is None or fd.opened_on <= as_of)
                  and (fd.closed_on is None or fd.closed_on > as_of)
                  and (fd.opened_on is not None or fd.closed_on is not None))

        entries = [e for e in self.ppf_entries if e["entry_date"] <= day]
        ppf_summary = ppf.summarise(entries, as_of)
        ppf_balance = ppf_summary.balance if ppf_summary else 0

        snapshot_values = [value for fetched_at, value in self.snapshots if fetched_at[:10] <= day]
        investments = int(snapshot_values[-1]) if snapshot_values else 0

        return NetWorth(as_of, bank, fds, ppf_balance, investments, bool(snapshot_values))


def month_ends(today: date, months: int = 12) -> list[date]:
    """The last `months` month-ends, with the current month represented by today."""
    ends = [today]
    first = today.replace(day=1)
    for _ in range(months - 1):
        first_prev = (first - timedelta(days=1)).replace(day=1)
        ends.append(first - timedelta(days=1))
        first = first_prev
    return sorted(ends)


def history(conn, today: date, months: int = 12) -> list[NetWorth]:
    calculator = Calculator(conn)
    return [calculator.at(d) for d in month_ends(today, months)]
