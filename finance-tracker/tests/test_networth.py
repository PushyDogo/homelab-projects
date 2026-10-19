"""Net worth tests on a synthetic database."""

from datetime import date

import pytest

from finance_tracker import db, investments, kite, networth


@pytest.fixture
def conn(tmp_path):
    connection = db.connect(tmp_path / "nw.db", "ab" * 32)
    connection.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (1, 'ICICI', 'bank', '0123')")
    connection.execute("INSERT INTO accounts (id, bank, account_type, suffix) VALUES (2, 'ICICI', 'credit_card', '4321')")
    yield connection
    connection.close()


def message(conn, received_at, body, status="ignored"):
    digest = f"m{conn.execute('SELECT count(*) FROM processed_messages').fetchone()[0]}"
    conn.execute("INSERT INTO processed_messages VALUES (?, 'sms', 'ICICIT', ?, ?, ?, NULL, 1, 'now')",
                 (digest, received_at, body, status))
    return digest


def txn(conn, account_id, direction, rupees, txn_date, received_at, balance=None, channel="upi"):
    digest = message(conn, received_at, f"txn {received_at}", "parsed")
    conn.execute(
        "INSERT INTO transactions (account_id, bank, direction, amount_minor, currency, txn_date, channel, "
        "balance_minor, template, message_hash, created_at) VALUES (?, 'ICICI', ?, ?, 'INR', ?, ?, ?, 't', ?, 'now')",
        (account_id, direction, rupees * 100, txn_date, channel,
         balance * 100 if balance is not None else None, digest))


def test_net_worth_components(conn):
    # Same day: an FD payout lands, then money leaves for a new FD. The later SMS wins.
    txn(conn, 1, "credit", 1100000, "2026-06-26", "2026-06-26T10:00:00", balance=3100000)
    txn(conn, 1, "debit", 2500000, "2026-06-26", "2026-06-26T11:00:00", balance=600000)
    message(conn, "2026-06-26T11:05:00", "Dear Customer, your ICICI BANK Deposit Acct XX8324 for Rs.2500000.00 "
                                         "has been opened on 26-Jun-26. The deposit advice will be updated.")
    # Card activity doesn't change net worth (purchases already count as spending).
    txn(conn, 2, "debit", 2000, "2026-07-25", "2026-07-25T12:00:00", channel="card")
    conn.execute("INSERT INTO ppf_entries (entry_date, entry_type, amount_minor, created_at) "
                 "VALUES ('2026-04-01', 'balance', 50000000, 'now')")
    investments.store_snapshot(conn, "zerodha", kite.Portfolio(
        [kite.Holding("equity", "X", None, "NSE", None, 10, 100.0, 150.0, None)], cash=500.0))

    calc = networth.Calculator(conn)
    june = calc.at(date(2026, 6, 30))
    assert june.bank == 600000 * 100
    assert june.fds == 2500000 * 100
    assert june.ppf == 50000000
    assert june.investments == 0 and not june.has_investments
    assert calc.at(date(2026, 7, 31)).total == june.total

    today = calc.at(date.today())
    assert today.investments == (10 * 150 + 500) * 100 and today.has_investments
    assert today.total == today.bank + today.fds + today.ppf + today.investments


def test_month_ends():
    ends = networth.month_ends(date(2026, 3, 15), 4)
    assert ends == [date(2025, 12, 31), date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 15)]
