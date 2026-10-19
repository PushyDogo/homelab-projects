from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal


@dataclass(frozen=True)
class Transaction:
    bank: str
    account_type: Literal["bank", "credit_card"]
    account: str | None         # trailing digits as shown in the SMS; None if not stated
    direction: Literal["debit", "credit"]   # from the account's point of view
    amount: Decimal
    currency: str
    txn_date: date
    channel: str                # "upi", "card", "imps", "autopay", "bill", "ach", ...
    counterparty: str | None    # raw merchant/payee/info text; normalised later
    reference: str | None       # UPI/IMPS/RRN reference number
    balance: Decimal | None     # available balance or credit limit, when stated
    template: str               # name of the template that matched


@dataclass(frozen=True)
class ParseResult:
    status: Literal["parsed", "ignored", "unknown"]
    transaction: Transaction | None = None
    reason: str | None = None   # for "ignored": why the message isn't a transaction
