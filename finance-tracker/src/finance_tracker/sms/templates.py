"""Shared machinery for bank SMS parsers.

A bank parser is a list of `Template`s (one regex per SMS format) plus a list
of patterns for money-mentioning messages that aren't transactions. Patterns
use these tokens:

  {AMOUNT} {BALANCE}  1,23,456.78 or .50
  {DATE}              05-Mar-25, 05/03/25, 05-03-2025, 08Sep26
  {ACCT}              masked account/card number: XX1234, XXXX1234, 1234XXXXX5678, *XX12, X1234
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from .models import ParseResult, Transaction

_TOKENS = {
    "{AMOUNT}": r"(?P<amount>\d[\d,]*(?:\.\d+)?|\.\d+)",
    "{BALANCE}": r"(?P<balance>-?\d[\d,]*(?:\.\d+)?|\.\d+)",
    "{DATE}": r"(?P<date>\d{1,2}[-/]?(?:[A-Za-z]{3}|\d{1,2})[-/]?\d{2}(?:\d{2})?)",
    "{ACCT}": r"(?:\d+)?[Xx*]+(?P<account>\d+)",
}

_MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
_DATE_PARTS = re.compile(r"(\d{1,2})[-/]?([A-Za-z]{3}|\d{1,2})[-/]?(\d{4}|\d{2})")

# Keywords in free-text "Info"/"towards" fields, checked in order.
_CHANNEL_KEYWORDS = [
    ("NEFT", "neft"), ("RTGS", "rtgs"), ("IMPS", "imps"), ("UPI", "upi"), ("ACH", "ach"),
    ("BIL", "bill"), ("INFT", "transfer"), ("INF", "transfer"), ("TRF", "transfer"), ("TPT", "transfer"),
    ("Transfer", "transfer"), ("MMT", "imps"), ("interest", "interest"), ("int.", "interest"),
]


def compile_pattern(pattern: str) -> re.Pattern:
    for token, regex in _TOKENS.items():
        pattern = pattern.replace(token, regex)
    return re.compile(pattern)


@dataclass(frozen=True)
class Template:
    name: str
    account_type: str
    direction: str
    # Fixed channel, or None to derive it from the matched info/party text.
    channel: str | None
    pattern: re.Pattern
    # Optional hook for templates whose channel depends on the match (e.g. refunds).
    channel_fn: Callable[[dict], str] | None = None


def template(name, account_type, direction, channel, pattern, channel_fn=None) -> Template:
    return Template(name, account_type, direction, channel, compile_pattern(pattern), channel_fn)


def parse_date(text: str) -> date:
    match = _DATE_PARTS.fullmatch(text)
    if not match:
        raise ValueError(f"unrecognised date {text!r}")
    day, month, year = match.groups()
    month_num = int(month) if month.isdigit() else _MONTHS[month.lower()]
    year_num = int(year)
    return date(year_num + 2000 if year_num < 100 else year_num, month_num, int(day))


def amount(text: str) -> Decimal:
    return Decimal(text.replace(",", ""))


def channel_from_text(text: str | None) -> str:
    if not text:
        return "other"
    for keyword, channel in _CHANNEL_KEYWORDS:
        if keyword.isupper():
            if re.search(rf"(?<![A-Za-z]){re.escape(keyword)}(?![A-Za-z])", text):
                return channel
        elif keyword.lower() in text.lower():
            return channel
    return "other"


def parse(bank: str, templates: list[Template], ignored: list[tuple[str, re.Pattern]],
          body: str, received: date | None = None) -> ParseResult:
    """Match `body` against a bank's templates. `received` fills in formats without a date."""
    text = " ".join(body.split())
    for tmpl in templates:
        match = tmpl.pattern.search(text)
        if match:
            try:
                return ParseResult("parsed", transaction=_build(bank, tmpl, match, received))
            except ValueError:
                continue  # e.g. an impossible date; try later templates, then fall through
    for reason, pattern in ignored:
        if pattern.search(text):
            return ParseResult("ignored", reason=reason)
    if MONEY_WORDS.search(text):
        return ParseResult("unknown")
    return ParseResult("ignored", reason="informational")


MONEY_WORDS = re.compile(r"\b(debited|credited|spent|deposited)\b", re.I)


def _build(bank: str, tmpl: Template, match: re.Match, received: date | None) -> Transaction:
    groups = match.groupdict()
    info = groups.get("info")
    what = groups.get("what")
    counterparty = groups.get("party") or info or what

    if tmpl.channel:
        channel = tmpl.channel
    elif tmpl.channel_fn:
        channel = tmpl.channel_fn(groups)
    else:
        channel = channel_from_text(info or counterparty)

    reference = groups.get("ref")
    if reference is None and info:
        trailing = re.search(r"\*(\d{6,})$", info)
        reference = trailing.group(1) if trailing else None

    currency = groups.get("currency") or "INR"
    if currency.startswith("Rs"):
        currency = "INR"

    if groups.get("date"):
        txn_date = parse_date(groups["date"])
    elif received:
        txn_date = received
    else:
        raise ValueError("SMS has no date and no received date was given")

    balance = groups.get("balance")
    account = groups.get("account")
    return Transaction(
        bank=bank,
        account_type=tmpl.account_type,
        account=re.search(r"\d+$", account).group() if account else None,
        direction=tmpl.direction,
        amount=amount(groups["amount"]),
        currency=currency,
        txn_date=txn_date,
        channel=channel,
        counterparty=counterparty.strip(" .-") if counterparty else None,
        reference=reference,
        balance=amount(balance) if balance else None,
        template=tmpl.name,
    )
