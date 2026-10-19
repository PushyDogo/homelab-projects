"""Reconstruct fixed deposits from bank SMS.

Each bank announces FDs differently, so each has its own patterns; they are
all merged into `FixedDeposit` records keyed by (bank, deposit number):

  ICICI     "Deposit Acct XX5733 for Rs.400000.00 has been opened on 23-Dec-23"
            "... debited Rs. 4,00,000.00 on 23-Dec-23 InfoTRF TO FD no." (booking; used when
            the "opened" SMS never arrived, as happens occasionally)
            "... credited:Rs. 4,33,884.00 on 23-Mar-25. Info 252213005733 FD clos"
  HDFC      "INR 6,00,000.00 debited ... on 29-JUN-24. Info: FD through NET-XXXXXXXXXX0087"
            "INR 6,00,000.00 deposited ... on 26-JAN-26 for Prin and Int auto_redeem XXXXXXXXXX0087"
            "INR 64,480.00 deposited ... for int. auto_redemption XXXXXXXXXX0087"
  SBI       "TDR/STDR No XXXXX763836 for INR 14,00,000.00 has been created on 09/03/25"
            "TDR/STDR no. XXXXX763836 dated 09/03/25 maturing on 27/05/26"
            "Credited. INR 10,82,512.00 on 29/05/26 on account of Closure of TD A/c XXXXX122548"
            "Your A/C XXXXX763836 has a debit by transfer of Rs 15,15,583.00 on 27/05/26. Avl Bal Rs 0.00"
  IndusInd  "Your IndusInd FD 301***170862 has been booked"
            "Your FD 301***170862 for INR 779,451.00 has been renewed for 18 Months @ 7% from 24/05/26"
            "Net interest INR 5,123.00 paid on your IndusInd Deposit No 301***170862 on 31/03/26"

Amounts are in paise. Missing facts stay None rather than being guessed.
"""

import re
from dataclasses import dataclass, field
from datetime import date, datetime

from .sms.templates import amount, parse_date

AMOUNT = r"([\d,]+(?:\.\d+)?)"
DATE = r"(\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{2,4})"


@dataclass
class FixedDeposit:
    bank: str
    number: str                      # as printed by the bank (masked)
    principal: int | None = None     # paise
    opened_on: date | None = None
    maturity_on: date | None = None
    closed_on: date | None = None
    payout: int | None = None        # amount paid out at closure, paise
    interest_paid: int = 0           # interest paid out while open (e.g. monthly payouts), paise
    rate: str | None = None          # e.g. "7%", when the bank states it
    renewed_on: date | None = None
    last_interest_on: date | None = None
    notes: list[str] = field(default_factory=list)
    adjustment_id: int | None = None   # set when added or corrected by hand

    @property
    def is_closed(self) -> bool:
        return self.closed_on is not None

    @property
    def digits(self) -> str:
        return re.sub(r"\D", "", self.number)

    @property
    def interest(self) -> int | None:
        """Total interest earned: payouts plus (closure payout − principal) when both are known."""
        total = self.interest_paid
        if self.payout is not None and self.principal is not None:
            total += max(self.payout - self.principal, 0)
        return total or None


def _minor(text: str) -> int:
    return int(amount(text) * 100)


def _date(text: str) -> date:
    return parse_date(text.rstrip("."))


class _Book:
    """Collects FDs, merging records whose numbers end with each other's digits."""

    def __init__(self):
        self.deposits: list[FixedDeposit] = []

    def get(self, bank: str, number: str) -> FixedDeposit:
        digits = re.sub(r"\D", "", number)
        for fd in self.deposits:
            if fd.bank == bank and (fd.number == number or (
                    len(digits) >= 4 and len(fd.digits) >= 4
                    and (fd.digits.endswith(digits) or digits.endswith(fd.digits)))):
                if len(number) > len(fd.number) and "*" not in number:
                    fd.number = number
                return fd
        fd = FixedDeposit(bank=bank, number=number)
        self.deposits.append(fd)
        return fd


_PATTERNS = [
    ("ICICI", "opened", re.compile(rf"Deposit Acct (X+\d+) for Rs\.?\s*{AMOUNT} has been opened on {DATE}")),
    ("ICICI", "booked", re.compile(rf"debited Rs\.?\s*{AMOUNT} on {DATE}\s*(?:Info)?TRF TO FD")),
    ("ICICI", "closed", re.compile(rf"credited:\s*Rs\.?\s*{AMOUNT} on {DATE}\. Info (\d+):? (?:FD clos|Closure Procee)")),
    ("HDFC", "opened", re.compile(rf"INR {AMOUNT} debited from HDFC Bank X+\d+ on {DATE}\. Info: FD through NET-(X+\d+)")),
    ("HDFC", "closed", re.compile(rf"INR {AMOUNT} deposited in HDFC Bank A/c X+\d+ on {DATE} for Prin and Int auto.?redeem (X+\d+)")),
    ("HDFC", "interest", re.compile(rf"INR {AMOUNT} deposited in HDFC Bank A/c X+\d+ on {DATE} for int\. auto_redemption\s+(X+\d+)")),
    ("SBI", "opened", re.compile(rf"TDR/STDR No (X+\d+) for INR {AMOUNT} has been created on {DATE}")),
    ("SBI", "maturity", re.compile(rf"TDR/STDR no\. (X+\d+) dated {DATE} maturing on {DATE}")),
    ("SBI", "closed", re.compile(rf"Credited\.? INR {AMOUNT} on {DATE} on account of Closure of TD A/c (X+\d+)")),
    ("SBI", "drained", re.compile(rf"Your A/C (X+\d+) has a debit by transfer of Rs\.?\s*{AMOUNT} on {DATE}\. Avl Bal Rs\.?\s*0\.00")),
    ("IndusInd", "booked", re.compile(r"Your IndusInd FD (\S+) has been booked")),
    ("IndusInd", "renewed", re.compile(
        rf"Your FD (\S+) for INR {AMOUNT} has been renewed for (\d+) Months\s*@\s*([\d.]+%) from {DATE}")),
    ("IndusInd", "interest", re.compile(rf"Net interest INR {AMOUNT} paid on your IndusInd Deposit No (\S+) on {DATE}")),
]


def build(messages) -> list[FixedDeposit]:
    """`messages`: iterable of (received_at ISO string, body), in any order."""
    book = _Book()
    sbi_deposit_numbers = set()
    rows = sorted(messages)
    for received_at, body in rows:
        text = " ".join(body.split())
        if m := re.search(r"TDR/STDR No (X+\d+)", text):
            sbi_deposit_numbers.add(re.sub(r"\D", "", m.group(1)))
    icici_bookings = []
    for received_at, body in rows:
        text = " ".join(body.split())
        received = datetime.fromisoformat(received_at).date()
        for bank, event, pattern in _PATTERNS:
            m = pattern.search(text)
            if m:
                if (bank, event) == ("ICICI", "booked"):
                    icici_bookings.append((_minor(m.group(1)), _date(m.group(2))))
                else:
                    _apply(book, bank, event, m.groups(), received, sbi_deposit_numbers)
                break
    _add_unannounced_icici_fds(book, icici_bookings)
    return sorted(book.deposits, key=lambda fd: (fd.is_closed, fd.bank, fd.opened_on or date.min))


def _add_unannounced_icici_fds(book: _Book, bookings: list[tuple[int, date]]) -> None:
    """ICICI "TRF TO FD" debits with no matching "Deposit Acct … opened" SMS are FDs we'd otherwise miss."""
    announced = [fd for fd in book.deposits if fd.bank == "ICICI" and fd.opened_on]
    for principal, booked_on in bookings:
        match = next((fd for fd in announced if fd.principal == principal
                      and abs((fd.opened_on - booked_on).days) <= 1), None)
        if match:
            announced.remove(match)
            continue
        fd = FixedDeposit(bank="ICICI", number=f"booked {booked_on:%d %b %Y}", principal=principal, opened_on=booked_on)
        fd.notes.append("No 'opened' SMS, so its number is unknown")
        # Its closure SMS will carry a number we've never seen: adopt the earliest such closure
        # after the booking whose payout is plausible (principal to principal + 30%).
        orphan = next((c for c in sorted(book.deposits, key=lambda c: c.closed_on or date.max)
                       if c.bank == "ICICI" and c.opened_on is None and c.principal is None and c.closed_on
                       and c.closed_on > booked_on and principal <= (c.payout or 0) <= principal * 1.3), None)
        if orphan:
            fd.number, fd.closed_on, fd.payout = orphan.number, orphan.closed_on, orphan.payout
            book.deposits.remove(orphan)
        book.deposits.append(fd)


def _apply(book: _Book, bank: str, event: str, g: tuple, received: date, sbi_numbers: set) -> None:
    if bank == "ICICI" and event == "opened":
        fd = book.get(bank, g[0])
        fd.principal, fd.opened_on = _minor(g[1]), _date(g[2])
    elif bank == "ICICI" and event == "closed":
        fd = book.get(bank, g[2])
        fd.payout, fd.closed_on = _minor(g[0]), _date(g[1])
    elif bank == "HDFC" and event == "opened":
        fd = book.get(bank, g[2])
        fd.principal, fd.opened_on = _minor(g[0]), _date(g[1])
    elif bank == "HDFC" and event == "closed":
        # HDFC pays principal and interest as two credits; this one is the principal.
        fd = book.get(bank, g[2])
        fd.closed_on = _date(g[1])
        fd.principal = fd.principal or _minor(g[0])
        fd.payout = (fd.payout or 0) + _minor(g[0])
    elif bank == "HDFC" and event == "interest":
        fd = book.get(bank, g[2])
        fd.payout = (fd.payout or 0) + _minor(g[0])
    elif bank == "SBI" and event == "opened":
        fd = book.get(bank, g[0])
        fd.principal, fd.opened_on = _minor(g[1]), _date(g[2])
    elif bank == "SBI" and event == "maturity":
        fd = book.get(bank, g[0])
        fd.opened_on = fd.opened_on or _date(g[1])
        fd.maturity_on = _date(g[2])
    elif bank == "SBI" and event == "closed":
        fd = book.get(bank, g[2])
        fd.payout, fd.closed_on = _minor(g[0]), _date(g[1])
    elif bank == "SBI" and event == "drained":
        if re.sub(r"\D", "", g[0]) in sbi_numbers:   # only deposit numbers, not the savings account
            fd = book.get(bank, g[0])
            fd.payout, fd.closed_on = _minor(g[1]), _date(g[2])
    elif bank == "IndusInd" and event == "booked":
        fd = book.get(bank, g[0])
        fd.opened_on = fd.opened_on or received
    elif bank == "IndusInd" and event == "renewed":
        fd = book.get(bank, g[0])
        fd.principal, fd.rate, fd.renewed_on = _minor(g[1]), g[3], _date(g[4])
        fd.notes.append(f"Renewed for {g[2]} months")
    elif bank == "IndusInd" and event == "interest":
        fd = book.get(bank, g[1])
        fd.interest_paid += _minor(g[0])
        paid_on = _date(g[2])
        fd.last_interest_on = max(fd.last_interest_on or paid_on, paid_on)


def apply_adjustments(fds: list[FixedDeposit], adjustments: list[dict]) -> list[FixedDeposit]:
    """Apply hand-entered corrections (rows of fd_adjustments).

    A row whose `number` matches an SMS-derived FD at the same bank overrides the
    fields it sets; any other row adds a new FD.
    """
    fds = list(fds)
    for adj in adjustments:
        digits = re.sub(r"\D", "", adj.get("number") or "")
        target = None
        if digits:
            target = next((fd for fd in fds if fd.bank == adj["bank"] and fd.digits
                           and (fd.digits.endswith(digits) or digits.endswith(fd.digits))), None)
        if target is None:
            target = FixedDeposit(bank=adj["bank"], number=adj.get("number") or "added by hand")
            fds.append(target)
        target.adjustment_id = adj["id"]
        if adj.get("principal_minor") is not None:
            target.principal = adj["principal_minor"]
        for key in ("opened_on", "maturity_on", "closed_on"):
            if adj.get(key):
                setattr(target, key, date.fromisoformat(adj[key]))
        if adj.get("rate"):
            target.rate = adj["rate"]
        if adj.get("note"):
            target.notes.append(adj["note"])
    return fds


def load(conn) -> list[FixedDeposit]:
    """FDs from stored SMS plus hand-entered corrections."""
    fds = build(conn.execute("SELECT received_at, body FROM processed_messages").fetchall())
    cursor = conn.execute("SELECT * FROM fd_adjustments ORDER BY id")
    names = [c[0] for c in cursor.description]
    return apply_adjustments(fds, [dict(zip(names, row)) for row in cursor.fetchall()])


def is_active(fd: FixedDeposit, today: date) -> bool:
    """Open, and (for deposits only seen through interest payouts) paid interest in the last ~4 months."""
    if fd.is_closed:
        return False
    if fd.principal is None and fd.opened_on is None and fd.last_interest_on:
        return (today - fd.last_interest_on).days <= 120
    return True
