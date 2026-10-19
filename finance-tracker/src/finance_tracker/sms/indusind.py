"""Parse IndusInd Bank transaction SMS (DLT header "INDUSB")."""

import re
from datetime import date

from . import templates as t
from .models import ParseResult

BANK = "IndusInd"
HEADERS = ("INDUSB",)
PARSER_VERSION = 1


def _rail(groups: dict) -> str:
    """IndusInd prefixes transfer details with the rail: N/ NEFT, R/ RTGS."""
    info = groups.get("info") or ""
    if info.startswith("N/"):
        return "neft"
    if info.startswith("R/"):
        return "rtgs"
    return t.channel_from_text(info)


TEMPLATES = [
    # Account debit/credit alerts carry no date, so the received date is used.
    t.template("account_debit", "bank", "debit", None,
               r"^Your IndusInd Account {ACCT} has been debited for INR {AMOUNT} towards (?P<info>.+?)\s*\. Call",
               channel_fn=_rail),
    t.template("account_credit", "bank", "credit", None,
               r"^Your IndusInd Account {ACCT} has been credited for INR {AMOUNT} towards (?P<info>.+?)\s*\. Call",
               channel_fn=_rail),
    t.template("upi_debit", "bank", "debit", "upi",
               r"^A/C {ACCT} debited by Rs\.?\s*{AMOUNT} towards (?P<party>\S+?)\.\s*RRN:\s*(?P<ref>\d+)\.\s*"
               r"Avl Bal:\s*{BALANCE}"),
    t.template("imps_debit", "bank", "debit", "imps",
               r"^Your account {ACCT} debited with Rs\.?\s*{AMOUNT} on {DATE} and account (?P<party>.+?) will be "
               r"credited\.?\s*\(IMPS Ref no\.?\s*(?P<ref>\d+)\)"),
    # Interest paid out on a fixed deposit; attributed to the IndusInd savings account.
    t.template("fd_interest", "bank", "credit", "interest",
               r"^Net interest INR {AMOUNT} paid on your IndusInd Deposit No (?P<party>\S+) on {DATE}"),
]

IGNORED = [
    # Sent after an outgoing NEFT/RTGS, duplicating the account debit alert.
    ("beneficiary_confirmation", re.compile(r"credited to beneficiary A/c")),
    ("upi_notice", re.compile(r"will be debited", re.I)),
]


def parse(body: str, received: date | None = None) -> ParseResult:
    return t.parse(BANK, TEMPLATES, IGNORED, body, received)
