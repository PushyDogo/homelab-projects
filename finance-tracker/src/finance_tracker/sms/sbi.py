"""Parse State Bank of India transaction SMS.

SBI sends alerts from several DLT headers: CBSSBI (core banking), SBIUPI,
ATMSBI (debit card), SBIINB (internet banking), SBIPSG (NEFT/RTGS) and SBIBNK.
"""

import re
from datetime import date

from . import templates as t
from .models import ParseResult

BANK = "SBI"
HEADERS = ("CBSSBI", "SBIUPI", "ATMSBI", "SBIINB", "SBIPSG", "SBIBNK")
PARSER_VERSION = 1

TEMPLATES = [
    # --- Debits ---
    t.template("account_debit", "bank", "debit", None,
               r"^Your A/C {ACCT} Debited INR {AMOUNT} on {DATE}\s*-\s*(?P<info>.+?)\.\s*Avl Balance INR {BALANCE}"),
    t.template("debit_by_transfer", "bank", "debit", "transfer",
               r"^Dear Customer, Your A/C {ACCT} has a debit by transfer of Rs\.?\s*{AMOUNT} on {DATE}\. "
               r"Avl Bal Rs\.?\s*{BALANCE}"),
    t.template("upi_debit", "bank", "debit", "upi",
               r"^Dear UPI user A/C {ACCT} debited by {AMOUNT} on date {DATE} trf to (?P<party>.+?) Refno (?P<ref>\d+)"),
    # Debit card alerts name the card, not the account; the sync attributes them to the SBI account.
    t.template("debit_card", "bank", "debit", "card",
               r"^Dear Customer, transaction number (?P<ref>\d+) for Rs\.?\s*{AMOUNT} by SBI Debit Card X\d+ "
               r"done at (?P<party>\S+) on {DATE} at .*?available balance is Rs\.?\s*{BALANCE}"),
    # --- Credits ---
    t.template("account_credit", "bank", "credit", None,
               r"^Your A/C {ACCT} Credited INR {AMOUNT} on {DATE}\s*-\s*(?P<info>.+?)\.\s*Avl Bal INR {BALANCE}"),
    t.template("td_closure_credit", "bank", "credit", "transfer",
               r"^Dear Customer, Your A/C {ACCT} Credited\.? INR {AMOUNT} on {DATE} on account of (?P<info>.+?)\.?\s*-SBI"),
    t.template("imps_credit", "bank", "credit", "imps",
               r"^Dear Customer, Your a/c no\. {ACCT} is credited by Rs\.?\s*{AMOUNT} on {DATE} by "
               r"(?P<party>a/c linked to mobile .+?)\s*\(IMPS Ref no\s*(?P<ref>\d+)\)"),
    t.template("neft_rtgs_credit", "bank", "credit", None,
               r"^Dear Customer, INR {AMOUNT} credited to your A/c No {ACCT} on {DATE} through (?P<rail>RTGS|NEFT) "
               r"with UTR (?P<ref>\S+) by (?P<party>.+?), INFO:",
               channel_fn=lambda groups: groups["rail"].lower()),
]

IGNORED = [
    # SBI notifies income-tax refunds on behalf of the refund banker, even when the
    # money lands in another bank; that bank's own credit SMS records it.
    ("it_refund_notice", re.compile(r"An IT Refund amount of Rs")),
    ("fd_opened", re.compile(r"TDR/STDR No .* has been created")),
]


def parse(body: str, received: date | None = None) -> ParseResult:
    return t.parse(BANK, TEMPLATES, IGNORED, body, received)
