"""HDFC, SBI and IndusInd SMS parser tests. Formats match real messages;
amounts, dates, accounts and names are made up."""

from datetime import date
from decimal import Decimal

import pytest

from finance_tracker.sms import hdfc, indusind, sbi
from finance_tracker.sms.templates import channel_from_text, parse_date

RECEIVED = date(2026, 9, 1)

PARSED = [
    # --- HDFC ---
    (hdfc, "Sent Rs.930.00 From HDFC Bank A/C *1234 To JSN PETROL PUMP On 12/09/26 Ref 123456789012 "
           "Not You? Call 18002586161/SMS BLOCK UPI to 7308080808",
     dict(template="upi_sent", account="1234", direction="debit", amount=Decimal("930.00"),
          txn_date=date(2026, 9, 12), channel="upi", counterparty="JSN PETROL PUMP", reference="123456789012")),
    (hdfc, "Money Sent-INR 1,00,000.00 From HDFC Bank A/c XX1234 on 06-01-24 To A/c xxxxxxxx9876 "
           "IMPS Ref-400612345678 Avl bal:INR 3,033.40 Not you?Call 18002586161",
     dict(template="imps_sent", channel="imps", amount=Decimal("100000.00"), txn_date=date(2024, 1, 6),
          balance=Decimal("3033.40"))),
    (hdfc, "UPDATE: INR 6,00,000.00 debited from HDFC Bank XX1234 on 29-JUN-24. Info: FD through "
           "NET-XXXXXXXXXX0087:JANE DOE. Avl bal:INR 63,780.20",
     dict(template="account_debit", counterparty="FD through NET-XXXXXXXXXX0087:JANE DOE",
          txn_date=date(2024, 6, 29))),
    (hdfc, "Payment Successful! Rs. 75,000.00 from A/c XX1234 to CBDTTAX via HDFC Bank NetBanking. "
           "Not you?Call 18002586161",
     dict(template="netbanking_payment", channel="bill", counterparty="CBDTTAX", txn_date=RECEIVED)),
    (hdfc, "Thanks for paying Rs.60,000.00 from A/c XXXX1234 to CBDTTAX via HDFC Bank NetBanking. "
           "Call 18002586161 if txn not done by you.",
     dict(template="netbanking_payment", amount=Decimal("60000.00"))),
    (hdfc, "Update! INR 3,25,768.00 deposited in HDFC Bank A/c XX1234 on 30-JUL-26 for NEFT Cr-CITI0000004-"
           "EXAMPLE CORP PVT LTD-Jane Doe-CITIN26123456.Avl bal INR 4,56,759.60. Cheque deposits in A/C "
           "are subject to clearing",
     dict(template="deposit", direction="credit", channel="neft", txn_date=date(2026, 7, 30),
          balance=Decimal("456759.60"))),
    (hdfc, "Update! INR 60,682.80 deposited in HDFC Bank A/c XX1234 on 28-JUN-24 for int. auto_redemption "
           "XXXXXXXXXX7075.Avl bal INR 63,780.20. Cheque deposits in A/C are subject to clearing",
     dict(template="deposit", channel="interest", counterparty="int. auto_redemption XXXXXXXXXX7075")),
    (hdfc, "Money Received - INR 25,000.00 in your HDFC Bank A/c xx1234 on 05-01-25 by A/c linked to mobile "
           "no xx0000 (IMPS Ref No. 500512345678) Avl bal: INR 70,218.90",
     dict(template="imps_received", direction="credit", channel="imps", reference="500512345678",
          counterparty="A/c linked to mobile no xx0000")),
    (hdfc, "Received! INR 25,000.00 in HDFC Bank A/c xx1234 On 22-06-26 For IMPS -JANE DOE- 617312345678 "
           "Avl bal INR 86,987.60",
     dict(template="imps_received_v2", counterparty="JANE DOE", reference="617312345678")),
    # --- SBI ---
    (sbi, "Your A/C XXXXX596354 Debited INR 14,00,000.00 on 09/03/25 -Transferred to Mr. JaneDoe. "
          "Avl Balance INR 2,001.00-SBI",
     dict(template="account_debit", account="596354", direction="debit", channel="transfer",
          counterparty="Transferred to Mr. JaneDoe", txn_date=date(2025, 3, 9), balance=Decimal("2001.00"))),
    (sbi, "Your A/C XXXXX763836 Credited INR 14,00,000.00 on 09/03/25 -Deposit by transfer from Mr. JaneDoe. "
          "Avl Bal INR 14,00,000.00-SBI",
     dict(template="account_credit", direction="credit", counterparty="Deposit by transfer from Mr. JaneDoe")),
    (sbi, "Dear Customer, Your A/C XXXXX763836 has a debit by transfer of Rs 15,15,583.00 on 27/05/26. "
          "Avl Bal Rs 0.00.-SBI",
     dict(template="debit_by_transfer", channel="transfer", balance=Decimal("0.00"))),
    (sbi, "Dear Customer, Your A/C XXXXX596354 Credited. INR 10,82,512.00 on 29/05/26 on account of "
          "Closure of TD A/c XXXXX122548.-SBI",
     dict(template="td_closure_credit", counterparty="Closure of TD A/c XXXXX122548")),
    (sbi, "Dear UPI user A/C X6354 debited by 1.0 on date 12Sep26 trf to JOHN DOE Refno 625512345678 "
          "If not u? call-1800111109 for other services-18001234-SBI",
     dict(template="upi_debit", account="6354", txn_date=date(2026, 9, 12), counterparty="JOHN DOE")),
    (sbi, "Dear Customer, transaction number 123456 for Rs.322.00 by SBI Debit Card X1234 done at 89106499 "
          "on 17Jul26 at 10:11:12. Your updated available balance is Rs.7,486.00. If not done by you, forward "
          "this SMS to 7400165218/ call 1800111109/9449112211 to block card. GOI helpline for cyber fraud 1930.",
     dict(template="debit_card", account=None, channel="card", balance=Decimal("7486.00"))),
    (sbi, "Dear Customer, Your a/c no. XXXXXXXX6354 is credited by Rs.1.00 on 18-03-25 by a/c linked to "
          "mobile 0XXXXXX000-JANE DOE (IMPS Ref no 507712345678).If not done by you, call 1800111109. -SBI",
     dict(template="imps_credit", counterparty="a/c linked to mobile 0XXXXXX000-JANE DOE")),
    (sbi, "Dear Customer, INR 10,00,000.00 credited to your A/c No XX6354 on 19/03/2025 through RTGS with "
          "UTR INDBR32025031900338350 by JANE DOES/O JOHN HOUSE NO 1, INFO: TRANSFER-SBI",
     dict(template="neft_rtgs_credit", channel="rtgs", txn_date=date(2025, 3, 19),
          counterparty="JANE DOES/O JOHN HOUSE NO 1")),
    # --- IndusInd ---
    (indusind, "Your IndusInd Account 1234XXXXX4879 has been debited for INR 10,00,000.00 towards "
               "R/INDBR32025031900338350/SBIN/JANE DOE. Call 18602677777 to report issue-IndusInd Bank",
     dict(template="account_debit", account="4879", channel="rtgs", txn_date=RECEIVED,
          counterparty="R/INDBR32025031900338350/SBIN/JANE DOE")),
    (indusind, "Your IndusInd Account XXXXXXXX4879 has been credited for INR 4,779.76 towards "
               "N/CITIN26717120682/CITI0100000/PAYPAL PAYMENTS PVT. Call 18602677777 to report issue-IndusInd Bank",
     dict(template="account_credit", direction="credit", channel="neft")),
    (indusind, "A/C *XX4879 debited by Rs 1.00 towards someone-1@okicici. RRN:625512345678. Avl Bal:11,789.00. "
               "Not you? Call 18602677777 - IndusInd bank",
     dict(template="upi_debit", counterparty="someone-1@okicici", balance=Decimal("11789.00"))),
    (indusind, "Your account XXXXXXX4879 debited with Rs. 25,000.00 on 22-06-26 and account XXXXXXX1234/Jane Doe "
               "will be credited.(IMPS Ref no. 617312345678). Call 18602677777 to report issue - IndusInd Bank",
     dict(template="imps_debit", counterparty="XXXXXXX1234/Jane Doe", txn_date=date(2026, 6, 22))),
    (indusind, "Net interest INR 5,123.00 paid on your IndusInd Deposit No 2012***3456 on 31/03/26. "
               "Call 18602677777 for assistance - IndusInd Bank",
     dict(template="fd_interest", direction="credit", channel="interest", account=None)),
]

IGNORED = [
    (sbi, "Dear Customer, For PAN XXXXXX1234M, An IT Refund amount of Rs 10990 for AY-2026-27 has been "
          "credited to your account XXXXXXXXXX1234 on 10-07-26. -SBI", "it_refund_notice"),
    (sbi, "Dear Customer, TDR/STDR No XXXXX287289 for INR 800000.00 has been created on 08/08/25. "
          "Please submit form 15G/H, if eligible.", "fd_opened"),
    (indusind, "Rs. 1000000.00 credited to beneficiary A/c XXXXXXX6354 on 19-03-25 12:01:02 via RTGS. "
               "UTR INDBR32025031900338350. Call 18602677777 to report issue- IndusInd Bank",
     "beneficiary_confirmation"),
    (indusind, "UPI PIN is always used for authorization of a transaction. Amount will be debited from "
               "your account, when PIN is entered - IndusInd Bank", "upi_notice"),
    (hdfc, "FD has been Booked! You'll receive email advice shortly.", "informational"),
]


@pytest.mark.parametrize("parser, sms, expected", PARSED,
                         ids=[f"{p.BANK}-{e['template']}" for p, _, e in PARSED])
def test_parses_transaction(parser, sms, expected):
    result = parser.parse(sms, RECEIVED)
    assert result.status == "parsed", sms
    txn = result.transaction
    assert txn.bank == parser.BANK
    for field, value in expected.items():
        assert getattr(txn, field) == value, field


@pytest.mark.parametrize("parser, sms, reason", IGNORED, ids=[r for _, _, r in IGNORED])
def test_ignores_non_transactions(parser, sms, reason):
    result = parser.parse(sms, RECEIVED)
    assert (result.status, result.reason) == ("ignored", reason)


@pytest.mark.parametrize("text, expected", [
    ("05-Mar-25", date(2025, 3, 5)), ("05/03/25", date(2025, 3, 5)), ("05-03-2025", date(2025, 3, 5)),
    ("08Sep26", date(2026, 9, 8)), ("29-JUN-24", date(2024, 6, 29)),
])
def test_date_formats(text, expected):
    assert parse_date(text) == expected


def test_channel_keywords_match_whole_words():
    assert channel_from_text("INF*INFT*0123") == "transfer"
    assert channel_from_text("INFO DESK") == "other"
