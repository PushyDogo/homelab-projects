"""Parse HDFC Bank transaction SMS (DLT header "HDFCBK")."""

import re
from datetime import date

from . import templates as t
from .models import ParseResult

BANK = "HDFC"
HEADERS = ("HDFCBK",)
PARSER_VERSION = 1

TEMPLATES = [
    # --- Debits ---
    t.template("upi_sent", "bank", "debit", "upi",
               r"^Sent Rs\.?\s*{AMOUNT} From HDFC Bank A/C {ACCT} To (?P<party>.+?) On {DATE} Ref (?P<ref>\d+)"),
    t.template("imps_sent", "bank", "debit", "imps",
               r"^Money Sent-INR {AMOUNT} From HDFC Bank A/c {ACCT} on {DATE} To (?P<party>A/c \S+) "
               r"IMPS Ref-(?P<ref>\d+) Avl bal:\s*INR {BALANCE}"),
    t.template("account_debit", "bank", "debit", None,
               r"^UPDATE: INR {AMOUNT} debited from HDFC Bank {ACCT} on {DATE}\. Info:\s*(?P<info>.+?)\.\s*"
               r"Avl bal:\s*INR {BALANCE}"),
    # NetBanking bill/tax payments; these SMS carry no date, so the received date is used.
    t.template("netbanking_payment", "bank", "debit", "bill",
               r"^(?:Payment Successful! |Thanks for paying )Rs\.?\s*{AMOUNT} from A/c {ACCT} to (?P<party>\S+) "
               r"via HDFC Bank NetBanking"),
    # --- Credits ---
    t.template("deposit", "bank", "credit", None,
               r"^Update! INR {AMOUNT} deposited in HDFC Bank A/c {ACCT} on {DATE} for (?P<info>.+?)\.\s*"
               r"Avl bal INR {BALANCE}"),
    t.template("imps_received", "bank", "credit", "imps",
               r"^Money Received - INR {AMOUNT} in your HDFC Bank A/c {ACCT} on {DATE} by "
               r"(?P<party>A/c linked to mobile no \S+) \(IMPS Ref No\.?\s*(?P<ref>\d+)\) Avl bal:\s*INR {BALANCE}"),
    t.template("imps_received_v2", "bank", "credit", "imps",
               r"^Received! INR {AMOUNT} in HDFC Bank A/c {ACCT} On {DATE} For IMPS\s*-\s*(?P<party>.+?)\s*-\s*"
               r"(?P<ref>\d+) Avl bal INR {BALANCE}"),
]

IGNORED: list[tuple[str, re.Pattern]] = []


def parse(body: str, received: date | None = None) -> ParseResult:
    return t.parse(BANK, TEMPLATES, IGNORED, body, received)
