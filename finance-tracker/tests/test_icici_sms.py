"""ICICI SMS parser tests. All samples are synthetic: formats match real
ICICI messages, but amounts, dates, accounts and names are made up."""

from datetime import date
from decimal import Decimal

import pytest

from finance_tracker.sms.icici import parse

# (sms, expected fields) — one case per template.
PARSED = [
    (
        "ICICI Bank Acct XX123 debited for Rs 250.00 on 05-Mar-25; ACME STORE credited. "
        "UPI:512345678901. Call 18002662 for dispute. SMS BLOCK 123 to 9215676766.",
        dict(template="upi_debit", account_type="bank", account="123", direction="debit",
             amount=Decimal("250.00"), txn_date=date(2025, 3, 5), channel="upi",
             counterparty="ACME STORE", reference="512345678901", balance=None),
    ),
    (
        "ICICI Bank Acct XX123 debited with Rs 5,000.00 on 11-Feb-26 & Acct XX987 credited."
        "IMPS:604212345678. Call 18002662 for dispute or SMS BLOCK 123 to 9215676766",
        dict(template="imps_debit", direction="debit", amount=Decimal("5000.00"),
             channel="imps", counterparty="XX987", reference="604212345678"),
    ),
    (
        "ICICI Bank Acc XX123 is debited with Rs. 349.00 on 02-Jan-24 VIN*FOOD APP . "
        "Available bal: Rs. 12,345.67. For dispute call 18002662 or SMS BLOCK 123 to 9215676766",
        dict(template="debit_card_v1", channel="card", counterparty="VIN*FOOD APP",
             amount=Decimal("349.00"), balance=Decimal("12345.67")),
    ),
    (
        "Rs. 199.00 debited from ICICI Bank Acc XX123 on 14-Jul-26 VIN*FOOD APP. Bal Rs. 8,000.00. "
        "If not you call 18002662 or SMS BLOCK 123 to 9215676766",
        dict(template="debit_card_v2", channel="card", counterparty="VIN*FOOD APP",
             txn_date=date(2026, 7, 14), balance=Decimal("8000.00")),
    ),
    (
        "Rs 1,999.00 debited from ICICI Bank Savings Account XX123 on 03-Apr-26 towards "
        "EXAMPLE LLC for Stripe AutoPay Retrieval Ref No.609312345678",
        dict(template="autopay_debit", channel="autopay", counterparty="EXAMPLE LLC",
             reference="609312345678", amount=Decimal("1999.00")),
    ),
    (
        "Your account has been successfully debited with Rs 149.00 on 04-Jan-25 towards "
        "EXAMPLE MEDIA for Subscription for EXAMPLE AutoPay, RRN 500412345678-ICICI Bank.",
        dict(template="autopay_debit_v0", channel="autopay", account=None,
             counterparty="EXAMPLE MEDIA", reference="500412345678"),
    ),
    (
        "ICICI Bank Acc XX123 debited Rs. 1,500.00 on 20-Oct-25 InfoBIL*INFT*001234567.Avl Bal "
        "Rs. 20,000.00.To dispute call 18002662 or SMS BLOCK 123 to 9215676766",
        dict(template="account_debit", channel="bill", counterparty="BIL*INFT*001234567",
             reference="001234567", balance=Decimal("20000.00")),
    ),
    (
        "ICICI Bank Acc XX123 debited Rs. 50,000.00 on 10-Jun-26 InfoTRF TO FD no..Avl Bal "
        "Rs. 1,000.00.To dispute call 18002662 or SMS BLOCK 123 to 9215676766",
        dict(template="account_debit", channel="transfer", counterparty="TRF TO FD no",
             amount=Decimal("50000.00")),
    ),
    (
        "ICICI Bank Acc XXXX123 debited with Rs 75.00 on 09-Apr-25. credit via :510912345678."
        "Call 18002662 for dispute or SMS BLOCK 123 to 9215676766",
        dict(template="account_debit_v0", channel="other", reference="510912345678"),
    ),
    (
        "Dear Customer, Acct XX123 is credited with Rs 500.00 on 21-Nov-24 from JANE DOE. "
        "UPI:432112345678-ICICI Bank.",
        dict(template="upi_credit", direction="credit", channel="upi",
             counterparty="JANE DOE", reference="432112345678"),
    ),
    (
        "ICICI Bank Account XX123 is credited with Rs 2,000.00 on 15-Mar-26 by Account linked "
        "to mobile number XXXXX12345. IMPS Ref. no. 607412345678.",
        dict(template="imps_credit", direction="credit", channel="imps",
             counterparty="Account linked to mobile number XXXXX12345", reference="607412345678"),
    ),
    (
        "ICICI Bank Acc XX123 is credited with salary of Rs. 1,00,000.00 on 31-Jul-25. "
        "Info: INF*INFT*012345678. The Avl Bal Rs. 1,50,000.00.",
        dict(template="account_credit_v1", direction="credit", channel="transfer",
             amount=Decimal("100000.00"), balance=Decimal("150000.00")),
    ),
    (
        "ICICI Bank Account XX123 credited:Rs. 42.50 on 08-Sep-26. Info ACH*EXAMPLE LTD*00001234. "
        "Available Balance is Rs. 9,999.00.",
        dict(template="account_credit_v2", direction="credit", channel="ach",
             counterparty="ACH*EXAMPLE LTD*00001234", amount=Decimal("42.50")),
    ),
    (
        "Dear Customer, Your Ac XX123 has been credited with INR 99.00 on 12-Jan-24. "
        "Info:BIL*ONL*REVERSAL-1234*SOME WALLET.",
        dict(template="account_credit_v0", direction="credit", channel="bill"),
    ),
    (
        "INR 1,234.00 spent using ICICI Bank Card XX4321 on 05-Aug-26 on EXAMPLE MART. "
        "Avl Limit: INR 1,00,000.00. If not you, call 1800 2662/SMS BLOCK 4321 to 9215676766.",
        dict(template="cc_spend_v2", account_type="credit_card", account="4321", direction="debit",
             currency="INR", channel="card", counterparty="EXAMPLE MART",
             balance=Decimal("100000.00")),
    ),
    (
        "USD 20.00 spent using ICICI Bank Card XX4321 on 01-Jun-25 on EXAMPLE SAAS. "
        "Avl Limit: INR 90,000.00. If not you, call 1800 2662/SMS BLOCK 4321 to 9215676766.",
        dict(template="cc_spend_v2", currency="USD", amount=Decimal("20.00")),
    ),
    (
        "INR 450.00 spent on ICICI Bank Card XX4321 on 12-Aug-24 at RAZ*FOOD APP. "
        "Avl Lmt: INR 50,000.00. To dispute,call 18002662/SMS BLOCK 4321 to 9215676766",
        dict(template="cc_spend_v1", account_type="credit_card", counterparty="RAZ*FOOD APP"),
    ),
    (
        "Rs 300.00 spent on ICICI Bank Card XX8765 on 02-Jul-26 at PAY*SHOP. Avl Lmt: Rs 40,000.00. "
        "To dispute, call 18002662/SMS BLOCK 8765 to 9215676766. To stop to reach call on 1800. "
        "Know more at https://example.com",
        dict(template="cc_spend_v1", account="8765", currency="INR"),
    ),
    (
        "Dear Customer, Payment of INR 10,000.00 has been received on your ICICI Bank Credit Card "
        "Account 4xxx4321 on 03-SEP-26.Thank you.",
        dict(template="cc_payment", account_type="credit_card", account="4321",
             direction="credit", channel="cc_payment", txn_date=date(2026, 9, 3)),
    ),
    (
        "EXAMPLE refund of Rs 120.00 credited to your ICICI Bank Credit Card XX4321 on 18-JUL-26.",
        dict(template="cc_credit", direction="credit", channel="refund",
             counterparty="EXAMPLE refund"),
    ),
    (
        "Payment of Rs 5,000.00 credited to ICICI Bank Credit Card XX4321 on 02-Apr-25. "
        "Updated total due Rs 0.00 minimum due Rs .00",
        dict(template="cc_credit", channel="cc_payment"),
    ),
]

IGNORED = [
    ("Your account will be debited with Rs 1,999.00 on 03-Dec-25 towards EXAMPLE LLC for "
     "AutoPay Stripe, RRN 612345678901-ICICI Bank.", "upcoming_debit"),
    ("Payment of INR 1,999.00 towards Merchant EXAMPLE LLC to be debited from ICICI Bank Credit "
     "Card 4321 as per Standing Instruction AbCdEf, is due by 03/10/26. To cancel this debit, "
     "visit https://example.com", "upcoming_debit"),
    ("ICICI Bank Credit Card XX4321 Statement is sent to ja******@example.com. Total of Rs "
     "5,000.00 or minimum of Rs 250.00 is due by 05-OCT-26.", "cc_statement"),
    ("Dear Customer, your ICICI BANK Deposit Acct XX999 for Rs.50,000.00 has been opened on "
     "10-Jun-26. The deposit advice will be updated on Net Banking within 1 wkg day.", "fd_opened"),
    ("We're unable to confirm txn of INR 500.00 on ICICI Bank Credit Card XX4321 on 01-MAR-26. "
     "To dispute call 18002662 or 04071403333 if not in India", "declined"),
    ("Refund of Rs 100.00 from ICICI Bank Credit Card XX4321 to Savings Account XX123 has been "
     "successfully transferred.", "cc_balance_refund"),
    ("Get pre-approved offers on your ICICI Bank account. Visit https://example.com", "informational"),
]


@pytest.mark.parametrize("sms, expected", PARSED, ids=[e["template"] for _, e in PARSED])
def test_parses_transaction(sms, expected):
    result = parse(sms)
    assert result.status == "parsed"
    txn = result.transaction
    assert txn.bank == "ICICI"
    for field, value in expected.items():
        assert getattr(txn, field) == value, field


@pytest.mark.parametrize("sms, reason", IGNORED, ids=[r for _, r in IGNORED])
def test_ignores_non_transactions(sms, reason):
    result = parse(sms)
    assert result.status == "ignored"
    assert result.reason == reason


def test_unrecognised_money_message_is_unknown():
    assert parse("Rs 10 got debited somehow from ICICI Bank").status == "unknown"


def test_whitespace_is_normalised():
    sms = ("ICICI Bank Acct XX123 debited for Rs 250.00 on 05-Mar-25;\nACME   STORE credited. "
           "UPI:512345678901.")
    assert parse(sms).transaction.counterparty == "ACME STORE"
