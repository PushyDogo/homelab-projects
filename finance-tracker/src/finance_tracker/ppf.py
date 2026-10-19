"""PPF balance and interest from hand-entered entries.

PPF works differently from an FD:
  * Interest is calculated every month on the LOWEST balance between the close
    of the 5th and the end of the month. A deposit made by the 5th earns
    interest for that month; one made on the 6th only from the next month.
  * The year's interest is credited once, on 31 March (the end of the
    financial year), and compounds from then on.

Entries:
  balance   what the passbook shows on a date (e.g. an opening balance)
  deposit   money paid in
  interest  the yearly interest credit, as shown in the passbook

Withdrawals aren't modelled, so the balance never falls within a month and
the "lowest balance from the 5th" is simply the balance at the close of the 5th.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

DEFAULT_RATE = Decimal("7.1")        # % per year; the government revises it quarterly


@dataclass(frozen=True)
class PpfSummary:
    balance: int                 # paise, as the passbook would show today (credited interest only)
    as_of: date | None           # date of the latest balance entry
    deposits_this_fy: int        # paise, deposits since 1 April
    accrued_interest: int        # paise earned so far this financial year, credited on `credit_on`
    months_counted: int          # months of this financial year included in `accrued_interest`
    assumed_months: int          # of those, months before your first entry (its balance was assumed)
    credit_on: date              # 31 March of this financial year
    last_interest: dict | None   # latest 'interest' entry
    rate: Decimal


def financial_year_start(today: date) -> date:
    return date(today.year if today.month >= 4 else today.year - 1, 4, 1)


def balance_on(entries: list[dict], day: date) -> int:
    """Balance at the close of `day`: the latest balance entry, plus deposits and interest after it.

    Entries are ordered by date, then by the order they were added (`id`), so a deposit
    recorded after a same-day balance entry adds to it.
    """
    rows = sorted((e for e in entries if date.fromisoformat(e["entry_date"]) <= day),
                  key=lambda e: (e["entry_date"], e.get("id", 0)))
    balance = 0
    for e in rows:
        balance = e["amount_minor"] if e["entry_type"] == "balance" else balance + e["amount_minor"]
    return balance


def accrued_interest(entries: list[dict], today: date, rate: Decimal) -> tuple[int, int, int]:
    """Interest earned this financial year so far: (paise, months counted, months assumed).

    Each month earns rate/12 on the balance at the close of the 5th. The current
    month counts once its 5th has passed. If your first entry is an opening
    balance recorded after the year began, that balance is assumed for the
    earlier months too (they're reported as assumed).
    """
    start = financial_year_start(today)
    ordered = sorted(entries, key=lambda e: (e["entry_date"], e.get("id", 0)))
    first_date = date.fromisoformat(ordered[0]["entry_date"]) if ordered else None
    # The opening balance (earliest balance entry, if it's on the first day) stands in for earlier months.
    opening = next((e for e in ordered if e["entry_type"] == "balance"), None)
    backfill = opening["amount_minor"] if opening and opening["entry_date"] == ordered[0]["entry_date"] else 0
    total, months, assumed = Decimal(0), 0, 0
    year, month = start.year, start.month
    while (year, month) <= (today.year, today.month):
        fifth = date(year, month, 5)
        if fifth <= today:
            if first_date and fifth < first_date and backfill:
                balance, assumed = backfill, assumed + 1
            else:
                balance = balance_on(entries, fifth)
            total += Decimal(balance) * rate / 100 / 12
            months += 1
        year, month = (year, month + 1) if month < 12 else (year + 1, 1)
    return int(total), months, assumed


def summarise(entries: list[dict], today: date, rate: Decimal = DEFAULT_RATE) -> PpfSummary | None:
    """`entries`: dicts with entry_date (ISO), entry_type and amount_minor."""
    if not entries:
        return None
    start = financial_year_start(today)
    balances = sorted((e for e in entries if e["entry_type"] == "balance"), key=lambda e: e["entry_date"])
    interest = sorted((e for e in entries if e["entry_type"] == "interest"), key=lambda e: e["entry_date"])
    deposits_this_fy = sum(e["amount_minor"] for e in entries
                           if e["entry_type"] == "deposit" and date.fromisoformat(e["entry_date"]) >= start)
    accrued, months, assumed = accrued_interest(entries, today, rate)
    return PpfSummary(
        balance=balance_on(entries, today),
        as_of=date.fromisoformat(balances[-1]["entry_date"]) if balances else None,
        deposits_this_fy=deposits_this_fy,
        accrued_interest=accrued,
        months_counted=months,
        assumed_months=assumed,
        credit_on=date(start.year + 1, 3, 31),
        last_interest=interest[-1] if interest else None,
        rate=rate,
    )
