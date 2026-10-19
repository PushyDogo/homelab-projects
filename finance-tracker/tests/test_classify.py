"""Transaction classification tests (synthetic data only)."""

import pytest

from finance_tracker import db
from finance_tracker.classify import classify

KEY = "ab" * 32


@pytest.fixture
def conn(tmp_path):
    connection = db.connect(tmp_path / "test.db", KEY)
    connection.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (1, 'ICICI', 'bank', '0123')")
    connection.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (2, 'ICICI', 'credit_card', '4321')")
    yield connection
    connection.close()


def add(conn, account_id, direction, rupees, date, channel="upi", counterparty=None):
    digest = f"h{conn.execute('SELECT count(*) FROM processed_messages').fetchone()[0]}"
    conn.execute(
        "INSERT INTO processed_messages VALUES (?, 'sms', 'ICICIT', '2026-01-01T00:00:00', 'x', 'parsed', NULL, 1, 'now')",
        (digest,))
    return conn.execute(
        "INSERT INTO transactions (account_id, bank, direction, amount_minor, currency, txn_date, channel, "
        "counterparty, template, message_hash, created_at) VALUES (?, 'ICICI', ?, ?, 'INR', ?, ?, ?, 't', ?, 'now')",
        (account_id, direction, rupees * 100, date, channel, counterparty, digest),
    ).lastrowid


def kind_of(conn, txn_id):
    return conn.execute("SELECT kind, kind_rule, linked_txn_id FROM transactions WHERE id = ?", (txn_id,)).fetchone()


def test_defaults_by_direction(conn):
    spend = add(conn, 1, "debit", 250, "2026-03-05", counterparty="ACME STORE")
    salary = add(conn, 1, "credit", 100000, "2026-03-31", channel="transfer", counterparty="INF*INFT*012345")
    classify(conn)
    assert kind_of(conn, spend)[0] == "expense"
    assert kind_of(conn, salary)[0] == "income"


def test_card_bill_payment_is_a_transfer_on_both_sides(conn):
    purchase = add(conn, 2, "debit", 9140, "2026-09-01", channel="card", counterparty="SHOP")
    bank_leg = add(conn, 1, "debit", 9140, "2026-09-19", channel="bill", counterparty="BIL*INFT*FIN1")
    card_leg = add(conn, 2, "credit", 9140, "2026-09-19", channel="cc_payment")
    classify(conn)

    assert kind_of(conn, purchase)[0] == "expense"   # counted once, at purchase time
    assert kind_of(conn, bank_leg) == ("transfer", "cc_bill_payment", card_leg)
    assert kind_of(conn, card_leg) == ("transfer", "cc_bill_payment", bank_leg)


def test_card_payment_matching_respects_date_window_and_pairs_once(conn):
    too_early = add(conn, 1, "debit", 5000, "2026-09-10", channel="upi", counterparty="SOMEONE")
    first = add(conn, 1, "debit", 5000, "2026-09-18", channel="bill")
    second = add(conn, 1, "debit", 5000, "2026-09-19", channel="bill")
    card_leg = add(conn, 2, "credit", 5000, "2026-09-19", channel="cc_payment")
    classify(conn)

    assert kind_of(conn, too_early)[0] == "expense"
    assert kind_of(conn, second)[:2] == ("transfer", "cc_bill_payment")   # closest date wins
    assert kind_of(conn, first)[0] == "expense"                           # only one bank leg per payment
    assert kind_of(conn, card_leg)[2] == second


def test_card_payment_from_another_bank_is_still_a_transfer(conn):
    card_leg = add(conn, 2, "credit", 7000, "2026-09-19", channel="cc_payment")
    classify(conn)
    assert kind_of(conn, card_leg) == ("transfer", "cc_bill_payment", None)


def test_fd_and_investment_rules(conn):
    booking = add(conn, 1, "debit", 2500000, "2026-04-01", channel="transfer", counterparty="TRF TO FD no")
    closure = add(conn, 1, "credit", 1107000, "2026-01-26", channel="other",
                  counterparty="252213006283 FD clos 26-01-2")
    proceeds = add(conn, 1, "credit", 1000000, "2026-02-01", channel="other",
                   counterparty="252213008126: Closure Procee")
    stocks = add(conn, 1, "debit", 20000, "2026-05-02", counterparty="Indian Clearing")
    classify(conn)
    assert kind_of(conn, booking)[:2] == ("transfer", "fd_booking")
    assert kind_of(conn, closure)[:2] == ("transfer", "fd_closure")
    assert kind_of(conn, proceeds)[:2] == ("transfer", "fd_closure")
    assert kind_of(conn, stocks)[:2] == ("transfer", "investment")


def test_refunds(conn):
    refund = add(conn, 2, "credit", 120, "2026-07-18", channel="refund", counterparty="EXAMPLE refund")
    classify(conn)
    assert kind_of(conn, refund)[:2] == ("refund", "refund")


def test_classification_is_recomputed(conn):
    txn = add(conn, 1, "debit", 100, "2026-01-01", counterparty="TRF TO FD no")
    classify(conn)
    conn.execute("UPDATE transactions SET counterparty = 'ACME' WHERE id = ?", (txn,))
    classify(conn)
    assert kind_of(conn, txn) == ("expense", None, None)


# --- multi-bank rules ---------------------------------------------------------

OWNER = ["Jane Doe"]


@pytest.fixture
def banks(conn):
    conn.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (3, 'HDFC', 'bank', '1234')")
    conn.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (4, 'SBI', 'bank', '596354')")
    conn.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (5, 'SBI', 'bank', '763836')")
    return conn


def test_owner_named_as_debit_recipient_is_a_transfer(banks):
    out = add(banks, 4, "debit", 1400000, "2025-03-09", channel="transfer",
              counterparty="Transferred to Mr. JaneDoe")
    other = add(banks, 4, "debit", 500, "2025-03-09", counterparty="Transferred to Mr. JohnSmith")
    classify(banks, OWNER)
    assert kind_of(banks, out)[:2] == ("transfer", "own_transfer")
    assert kind_of(banks, other)[0] == "expense"


def test_owner_as_credit_beneficiary_stays_income(banks):
    salary = add(banks, 3, "credit", 325768, "2026-07-30", channel="neft",
                 counterparty="NEFT Cr-CITI0000004-EXAMPLE CORP PVT LTD-Jane Doe-CITIN26123456")
    from_self = add(banks, 3, "credit", 1000000, "2026-05-30", channel="neft",
                    counterparty="NEFT Cr-INDB0000006-JANE DOE-Jane Doe-INDBH30057433")
    from_family = add(banks, 3, "credit", 700000, "2024-12-28", channel="rtgs",
                      counterparty="RTGS Cr-ICIC0002522-JOHN DOE-Jane doe-ICICR12024")
    by_transfer = add(banks, 5, "credit", 1400000, "2025-03-09", channel="transfer",
                      counterparty="Deposit by transfer from Mr. JaneDoe")
    classify(banks, OWNER)
    assert kind_of(banks, salary)[0] == "income"
    assert kind_of(banks, from_family)[0] == "income"
    assert kind_of(banks, from_self)[:2] == ("transfer", "own_transfer")
    assert kind_of(banks, by_transfer)[:2] == ("transfer", "own_transfer")


def test_same_amount_between_own_accounts_is_paired(banks):
    debit = add(banks, 1, "debit", 500000, "2025-03-18", channel="imps", counterparty="IMPS/507721779192")
    credit = add(banks, 3, "credit", 500000, "2025-03-18", channel="imps",
                 counterparty="A/c linked to mobile no xx2940")
    unrelated = add(banks, 3, "credit", 500000, "2025-04-18", channel="imps", counterparty="SOMEONE")
    classify(banks, OWNER)
    assert kind_of(banks, debit) == ("transfer", "own_transfer", credit)
    assert kind_of(banks, credit) == ("transfer", "own_transfer", debit)
    assert kind_of(banks, unrelated)[0] == "income"


def test_named_transfers_on_both_sides_get_linked(banks):
    debit = add(banks, 4, "debit", 1400000, "2025-03-09", channel="transfer",
                counterparty="Transferred to Mr. JaneDoe")
    credit = add(banks, 5, "credit", 1400000, "2025-03-09", channel="transfer",
                 counterparty="Deposit by transfer from Mr. JaneDoe")
    classify(banks, OWNER)
    assert kind_of(banks, debit)[2] == credit


def test_fd_rules_cover_hdfc_and_sbi(banks):
    booking = add(banks, 3, "debit", 600000, "2024-06-29", channel="other",
                  counterparty="FD through NET-XXXXXXXXXX0087:JANE DOE")
    maturity = add(banks, 3, "credit", 600000, "2026-01-26", channel="other",
                   counterparty="Prin and Int auto redeem XXXXXXXXXX0087")
    interest = add(banks, 3, "credit", 64480, "2026-01-26", channel="interest",
                   counterparty="int. auto_redemption XXXXXXXXXX0087")
    td_closure = add(banks, 4, "credit", 1082512, "2026-05-29", channel="transfer",
                     counterparty="Closure of TD A/c XXXXX122548")
    classify(banks, OWNER)
    assert kind_of(banks, booking)[:2] == ("transfer", "fd_booking")
    assert kind_of(banks, maturity)[:2] == ("transfer", "fd_closure")
    assert kind_of(banks, interest)[0] == "income"
    assert kind_of(banks, td_closure)[:2] == ("transfer", "fd_closure")


def test_sbi_term_deposit_accounts_are_flagged(banks):
    banks.execute("INSERT INTO processed_messages VALUES ('td1', 'sms', 'CBSSBI', '2025-03-09T00:00:00', "
                  "'Dear Customer, TDR/STDR No XXXXX763836 for INR 1400000.00 has been created on 09/03/25.', "
                  "'ignored', 'fd_opened', 1, 'now')")
    classify(banks, OWNER)
    flags = dict((i, (d, c)) for i, d, c in banks.execute("SELECT id, is_deposit, is_closed FROM accounts"))
    assert flags[5] == (1, 0)
    assert flags[4] == (0, 0)


def test_account_less_transactions_go_to_the_main_account(banks):
    for _ in range(3):
        add(banks, 4, "debit", 10, "2026-01-01")
    add(banks, 5, "credit", 100, "2026-01-01")
    card = add(banks, None, "debit", 322, "2026-07-17", channel="card")
    banks.execute("UPDATE transactions SET bank = 'SBI' WHERE id = ?", (card,))
    classify(banks, OWNER)
    assert banks.execute("SELECT account_id FROM transactions WHERE id = ?", (card,)).fetchone()[0] == 4


def test_debit_to_another_own_account_is_a_transfer(banks):
    to_own = add(banks, 3, "debit", 100000, "2024-01-06", channel="imps", counterparty="A/c xxxxxxxx6354")
    to_other = add(banks, 1, "debit", 35000, "2026-08-09", channel="imps", counterparty="XX551")
    classify(banks, OWNER)
    assert kind_of(banks, to_own)[:2] == ("transfer", "own_transfer")
    assert kind_of(banks, to_other)[0] == "expense"


# --- user rules and deposits ----------------------------------------------------

from decimal import Decimal

from finance_tracker.config import Rule


def test_user_rules_set_kind_and_category(banks):
    tax = add(banks, 1, "debit", 300000, "2026-08-08", channel="other", counterparty="GIB*002071751")
    rent = add(banks, 1, "debit", 35000, "2026-08-09", channel="imps", counterparty="XX551")
    small_gift = add(banks, 4, "credit", 30000, "2026-01-01", counterparty="Deposit by transfer from Mr. JOHNDOE")
    big_gift = add(banks, 4, "credit", 1000000, "2025-03-09", counterparty="Deposit by transfer from Mr. JOHNDOE")
    rules = [
        Rule("Tax", ("gib*",), direction="debit", category="Tax"),
        Rule("Rent", ("XX551",), category="Rent"),
        Rule("Parents' money", ("JOHNDOE",), direction="credit", min_amount=Decimal(100000),
             kind="transfer", category="Family funds"),
    ]
    classify(banks, OWNER, rules)
    category = lambda i: banks.execute("SELECT category FROM transactions WHERE id = ?", (i,)).fetchone()[0]
    assert kind_of(banks, tax)[0] == "expense" and category(tax) == "Tax"
    assert kind_of(banks, rent)[0] == "expense" and category(rent) == "Rent"
    assert kind_of(banks, small_gift)[0] == "income" and category(small_gift) is None
    assert kind_of(banks, big_gift)[:2] == ("transfer", "rule:Parents' money")
    assert category(big_gift) == "Family funds"


def test_money_into_and_out_of_a_deposit_is_labelled_fd(banks):
    banks.execute("INSERT INTO processed_messages VALUES ('td1', 'sms', 'CBSSBI', '2025-03-09T00:00:00', "
                  "'Dear Customer, TDR/STDR No XXXXX763836 for INR 1400000.00 has been created on 09/03/25.', "
                  "'ignored', 'fd_opened', 1, 'now')")
    out_of_savings = add(banks, 4, "debit", 1400000, "2025-03-09", channel="transfer",
                         counterparty="Transferred to Mr. JaneDoe")
    into_deposit = add(banks, 5, "credit", 1400000, "2025-03-09", channel="transfer",
                       counterparty="Deposit by transfer from Mr. JaneDoe")
    out_of_deposit = add(banks, 5, "debit", 1500000, "2026-05-27", channel="transfer")
    into_savings = add(banks, 4, "credit", 1500000, "2026-05-27", channel="transfer",
                       counterparty="Deposit by transfer from Mr. JaneDoe")
    classify(banks, OWNER)
    assert kind_of(banks, into_deposit) == ("transfer", "fd_booking", out_of_savings)
    assert kind_of(banks, out_of_savings) == ("transfer", "fd_booking", into_deposit)
    assert kind_of(banks, out_of_deposit) == ("transfer", "fd_closure", into_savings)
    assert kind_of(banks, into_savings) == ("transfer", "fd_closure", out_of_deposit)


def test_bank_debit_funding_a_new_fd_is_an_fd_booking(banks):
    banks.execute("INSERT INTO processed_messages VALUES ('td9', 'sms', 'CBSSBI', '2026-06-06T10:00:00', "
                  "'Dear Customer, TDR/STDR No XXXXX519272 for INR 11,00,000.00 has been created on 06/06/26.', "
                  "'ignored', 'fd_opened', 1, 'now')")
    funding = add(banks, 4, "debit", 1100000, "2026-06-06", channel="transfer",
                  counterparty="Transferred to Mr. JaneDoe")
    banks.execute("UPDATE transactions SET bank = 'SBI' WHERE id = ?", (funding,))
    classify(banks, OWNER)
    assert kind_of(banks, funding)[:2] == ("transfer", "fd_booking")


def test_card_bill_paid_through_cred_is_a_transfer_even_when_amounts_differ(conn):
    card_leg = add(conn, 2, "credit", 4411, "2024-10-19", channel="cc_payment")
    cred = add(conn, 1, "debit", 4323, "2024-10-19", channel="upi", counterparty="CRED")
    swiggy_via_cred = add(conn, 1, "debit", 247, "2025-07-18", channel="upi", counterparty="CREDPAYSWIGGY1")
    unpaired_cred = add(conn, 1, "debit", 9331, "2025-02-16", channel="upi", counterparty="CRED Club")
    classify(conn)
    assert kind_of(conn, cred) == ("transfer", "cc_bill_payment", card_leg)
    assert kind_of(conn, card_leg)[2] == cred
    assert kind_of(conn, swiggy_via_cred)[0] == "expense"
    assert kind_of(conn, unpaired_cred)[:2] == ("transfer", "cc_bill_payment")


@pytest.mark.parametrize("payee", ["Indian Clearing", "IndianClearingC", "ICCL ZERODHA CO", "ICCL ZERODHA",
                                   "Zerodha Broking", "ZERODHA BROKING"])
def test_zerodha_payments_are_investments(conn, payee):
    txn = add(conn, 1, "debit", 10000, "2025-05-02", counterparty=payee)
    classify(conn)
    assert kind_of(conn, txn)[:2] == ("transfer", "investment")
