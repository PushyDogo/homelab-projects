"""Parse ICICI Bank transaction SMS (DLT header "ICICIT").

Each template below corresponds to one SMS format observed in real exports.
ICICI has changed formats over time (e.g. debit card alerts in early 2025,
credit card alerts three times since 2024), so older templates stay in place
to parse historical messages.
"""

import re
from datetime import date

from . import templates as t
from .models import ParseResult

BANK = "ICICI"
HEADER = "ICICIT"
HEADERS = (HEADER,)
# Bump when templates change so stored "unknown" messages are re-parsed.
PARSER_VERSION = 2


def _credit_channel(groups: dict) -> str:
    what = (groups.get("what") or "").lower()
    if "refund" in what:
        return "refund"
    if "payment" in what:
        return "cc_payment"
    return "cc_credit"


TEMPLATES = [
    # --- Bank account debits ---
    t.template("upi_debit", "bank", "debit", "upi",
               r"^ICICI Bank Acct {ACCT} debited for Rs\.? {AMOUNT} on {DATE}; (?P<party>.+?) credited\. UPI:\s*(?P<ref>\d+)"),
    t.template("imps_debit", "bank", "debit", "imps",
               r"^ICICI Bank Acct {ACCT} debited with Rs\.? {AMOUNT} on {DATE} & Acct (?P<party>X+\d+) credited\.\s*IMPS:\s*(?P<ref>\d+)"),
    t.template("debit_card_v1", "bank", "debit", "card",
               r"^ICICI Bank Acc {ACCT} is debited with Rs\.? {AMOUNT} on {DATE} (?P<party>.+?)\s*\.\s*Available bal: Rs\.? {BALANCE}"),
    t.template("debit_card_v2", "bank", "debit", "card",
               r"^Rs\.? {AMOUNT} debited from ICICI Bank Acc {ACCT} on {DATE} (?P<party>.+?)\s*\.\s*Bal Rs\.? {BALANCE}"),
    t.template("autopay_debit", "bank", "debit", "autopay",
               r"^Rs\.? {AMOUNT} debited from ICICI Bank \w+ Account {ACCT} on {DATE} towards (?P<party>.+?) for .+?Ref No\.?\s*(?P<ref>\d+)"),
    t.template("autopay_debit_v0", "bank", "debit", "autopay",
               r"^Your account has been successfully debited with Rs\.? {AMOUNT} on {DATE} towards (?P<party>.+?) for .+?RRN\s*(?P<ref>\d+)"),
    t.template("account_debit", "bank", "debit", None,
               r"^ICICI Bank Acc {ACCT} debited Rs\.? {AMOUNT} on {DATE} (?:Info)?\s*(?P<info>.+?)\.+\s*Avl Bal Rs\.? {BALANCE}"),
    t.template("account_debit_v0", "bank", "debit", "other",
               r"^ICICI Bank Acc {ACCT} debited with Rs\.? {AMOUNT} on {DATE}\. credit via\s*:\s*(?P<ref>\d+)"),
    # --- Bank account credits ---
    t.template("upi_credit", "bank", "credit", "upi",
               r"^Dear Customer, Acct {ACCT} is credited with Rs\.? {AMOUNT} on {DATE} from (?P<party>.+?)\s*\. UPI:\s*(?P<ref>\d+)"),
    t.template("imps_credit", "bank", "credit", "imps",
               r"^ICICI Bank Account {ACCT} is credited with Rs\.? {AMOUNT} on {DATE} by (?P<party>.+?)\. IMPS Ref\. no\.\s*(?P<ref>\d+)"),
    t.template("account_credit_v1", "bank", "credit", None,
               r"^ICICI Bank Acc {ACCT} is credited with (?:\w+ of )?Rs\.? {AMOUNT} on {DATE}\. Info:\s*(?P<info>.+?)\. The Avl Bal Rs\.? {BALANCE}"),
    t.template("account_credit_v2", "bank", "credit", None,
               r"^ICICI Bank Account {ACCT} credited:\s*Rs\.? {AMOUNT} on {DATE}\. Info\s*(?P<info>.+?)\. Available Balance is Rs\.? {BALANCE}"),
    t.template("account_credit_v0", "bank", "credit", None,
               r"^Dear Customer, Your Ac {ACCT} has been credited with INR {AMOUNT} on {DATE}\. Info:\s*(?P<info>.+?)\.?$"),
    # --- Credit card ---
    t.template("cc_spend_v2", "credit_card", "debit", "card",
               r"^(?P<currency>[A-Z]{3}|Rs\.?)\s*{AMOUNT} spent using ICICI Bank Card {ACCT} on {DATE} on (?P<party>.+?)\s*\.+\s*Avl Limit: (?:INR|Rs\.?) {BALANCE}"),
    t.template("cc_spend_v1", "credit_card", "debit", "card",
               r"^(?P<currency>[A-Z]{3}|Rs\.?)\s*{AMOUNT} spent on ICICI Bank Card {ACCT} on {DATE} at (?P<party>.+?)\s*\.\s*Avl Lmt: (?:INR|Rs\.?) {BALANCE}"),
    t.template("cc_payment", "credit_card", "credit", "cc_payment",
               r"^(?:Dear Customer, )?Payment of (?:INR|Rs\.?) {AMOUNT} has been .*?ICICI Bank Credit Card (?:Account )?(?P<account>[\dXx]+).*? on {DATE}"),
    t.template("cc_credit", "credit_card", "credit", None,
               r"^(?P<what>.+?) of Rs\.? {AMOUNT} credited to (?:your )?ICICI Bank Credit Card {ACCT} on {DATE}",
               channel_fn=_credit_channel),
]

# Messages that mention money but are not completed transactions.
IGNORED = [
    ("upcoming_debit", re.compile(r"\b(will|to) be debited", re.I)),
    ("cc_statement", re.compile(r"Statement is sent to")),
    ("fd_opened", re.compile(r"Deposit Acct X+\d+ for Rs")),
    ("declined", re.compile(r"unable to confirm txn", re.I)),
    ("cc_balance_refund", re.compile(r"^Refund of Rs\.? [\d,.]+ from ICICI Bank Credit Card")),
    ("mandate_notice", re.compile(r"To manage your")),
]


def parse(body: str, received: date | None = None) -> ParseResult:
    return t.parse(BANK, TEMPLATES, IGNORED, body, received)
