"""Sync tests against a synthetic export zip and a throwaway encrypted DB."""

import json
import os
import zipfile

import pytest

from finance_tracker import db, sync
from finance_tracker.sms import icici

KEY = "ab" * 32
DAY_MS = 24 * 60 * 60 * 1000
T0 = 1_760_000_000_000  # an arbitrary fixed timestamp

UPI_DEBIT = ("ICICI Bank Acct XX123 debited for Rs 250.00 on 05-Mar-25; ACME STORE credited. "
             "UPI:512345678901. Call 18002662 for dispute.")
UPI_CREDIT = ("Dear Customer, Acct XXXX0123 is credited with Rs 500.00 on 06-Mar-25 from JANE DOE. "
              "UPI:512345678999-ICICI Bank.")
AUTOPAY = ("Your account has been successfully debited with Rs 149.00 on 07-Mar-25 towards "
           "EXAMPLE MEDIA for Subscription for EXAMPLE AutoPay, RRN 500412345678-ICICI Bank.")
PROMO = "Get pre-approved offers on your ICICI Bank account. Visit https://example.com"


def sms(body, ms, address="AX-ICICIT-S", type_="1"):
    return {"address": address, "body": body, "date": str(ms), "type": type_}


def write_export(directory, name, records, mtime_ns=None):
    path = directory / name
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("messages.ndjson", "\n".join(json.dumps(r) for r in records))
    if mtime_ns:
        os.utime(path, ns=(mtime_ns, mtime_ns))
    return path


@pytest.fixture
def conn(tmp_path):
    connection = db.connect(tmp_path / "test.db", KEY)
    yield connection
    connection.close()


@pytest.fixture
def exports(tmp_path):
    directory = tmp_path / "Messages"
    directory.mkdir()
    return directory


def count(conn, table, where="1"):
    return conn.execute(f"SELECT count(*) FROM {table} WHERE {where}").fetchone()[0]


def test_database_is_encrypted_and_needs_the_key(tmp_path):
    path = tmp_path / "enc.db"
    db.connect(path, KEY).close()
    assert b"SQLite format 3" not in path.read_bytes()[:16]
    with pytest.raises(Exception):
        db.connect(path, "cd" * 32)


def test_first_sync_stores_bank_sms_only(conn, exports):
    write_export(exports, "messages-2025-03-08.zip", [
        sms(UPI_DEBIT, T0),
        sms(UPI_CREDIT, T0 + 1),
        sms(PROMO, T0 + 2),
        sms("Your OTP is 1234", T0 + 3, address="AX-OTHERB"),     # no parser: not stored
        sms("hey, dinner tonight?", T0 + 4, address="+919999999999"),
        sms(UPI_DEBIT, T0 + 5, type_="2"),                         # sent, not received
    ])
    report = sync.sync_sms(conn, exports)

    assert report.statuses == {"parsed": 2, "ignored": 1}
    assert count(conn, "processed_messages") == 3
    assert count(conn, "processed_messages", "sender != 'ICICIT'") == 0
    assert count(conn, "transactions") == 2
    amount, date = conn.execute(
        "SELECT amount_minor, txn_date FROM transactions WHERE direction = 'debit'").fetchone()
    assert (amount, date) == (25000, "2025-03-05")


def test_account_suffixes_are_matched(conn, exports):
    write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0), sms(UPI_CREDIT, T0 + 1), sms(AUTOPAY, T0 + 2)])
    sync.sync_sms(conn, exports)

    # XX123 and XXXX0123 are one account (longer suffix kept); the autopay SMS
    # names no account and is attributed to the only ICICI bank account.
    assert conn.execute("SELECT suffix FROM accounts").fetchall() == [("0123",)]
    assert count(conn, "transactions", "account_id IS NULL") == 0


def test_unchanged_export_is_skipped(conn, exports):
    write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0)])
    sync.sync_sms(conn, exports)
    report = sync.sync_sms(conn, exports)
    assert report.skipped_reason and "unchanged" in report.skipped_reason
    assert count(conn, "transactions") == 1


def test_new_export_ingests_only_new_messages(conn, exports):
    write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0)], mtime_ns=1_000_000_000)
    sync.sync_sms(conn, exports)

    # The next export is a full snapshot containing the old message too.
    write_export(exports, "messages-b.zip", [sms(UPI_DEBIT, T0), sms(UPI_CREDIT, T0 + DAY_MS)],
                 mtime_ns=2_000_000_000)
    report = sync.sync_sms(conn, exports)

    assert report.export.name == "messages-b.zip"
    assert report.statuses == {"parsed": 1}
    assert count(conn, "transactions") == 2
    checkpoint = conn.execute("SELECT checkpoint_ms FROM sync_state").fetchone()[0]
    assert checkpoint == T0 + DAY_MS


def test_messages_older_than_overlap_window_are_not_reread(conn, exports):
    write_export(exports, "messages-a.zip", [sms(UPI_CREDIT, T0 + 10 * DAY_MS)], mtime_ns=1_000_000_000)
    sync.sync_sms(conn, exports)
    # A message far older than checkpoint - overlap is outside the window.
    write_export(exports, "messages-b.zip", [sms(UPI_DEBIT, T0)], mtime_ns=2_000_000_000)
    assert sync.sync_sms(conn, exports).statuses == {}


def test_resent_alert_is_marked_duplicate(conn, exports):
    write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0), sms(UPI_DEBIT, T0 + 60_000)])
    report = sync.sync_sms(conn, exports)
    assert report.statuses == {"parsed": 1, "duplicate": 1}
    assert count(conn, "transactions") == 1


def test_unknown_messages_are_reparsed_after_parser_upgrade(conn, exports, monkeypatch):
    new_format = "Rs 99.00 got debited in a brand new format from ICICI Bank"
    write_export(exports, "messages-a.zip", [sms(new_format, T0)])
    assert sync.sync_sms(conn, exports).statuses == {"unknown": 1}

    # Simulate a parser upgrade that learns the new format.
    from finance_tracker.sms.models import ParseResult
    monkeypatch.setattr(icici, "PARSER_VERSION", icici.PARSER_VERSION + 1)
    monkeypatch.setattr(icici, "parse", lambda body, received=None: ParseResult("ignored", reason="learned"))

    report = sync.sync_sms(conn, exports)   # same export: skipped, but re-parse still runs
    assert report.reparsed == 1
    assert count(conn, "processed_messages", "status = 'unknown'") == 0


def test_failed_sync_rolls_back(conn, exports, monkeypatch):
    write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0), sms(UPI_CREDIT, T0 + 1)])
    original = icici.parse
    calls = []

    def flaky(body, received=None):
        calls.append(body)
        if len(calls) == 2:
            raise RuntimeError("boom")
        return original(body, received)

    monkeypatch.setattr(icici, "parse", flaky)
    with pytest.raises(RuntimeError):
        sync.sync_sms(conn, exports)
    assert count(conn, "processed_messages") == 0
    assert count(conn, "sync_state") == 0


def test_older_exports_are_deleted_after_successful_sync(conn, exports):
    old = write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0)], mtime_ns=1_000_000_000)
    older = write_export(exports, "messages-0.zip", [], mtime_ns=500_000_000)
    latest = write_export(exports, "messages-b.zip", [sms(UPI_DEBIT, T0)], mtime_ns=2_000_000_000)
    other = exports / "notes.txt"
    other.write_text("not an export")

    report = sync.sync_sms(conn, exports)

    assert sorted(p.name for p in report.deleted) == ["messages-0.zip", "messages-a.zip"]
    assert not old.exists() and not older.exists()
    assert latest.exists() and other.exists()


def test_exports_are_kept_when_sync_fails(conn, exports, monkeypatch):
    old = write_export(exports, "messages-a.zip", [], mtime_ns=1_000_000_000)
    write_export(exports, "messages-b.zip", [sms(UPI_DEBIT, T0)], mtime_ns=2_000_000_000)

    def boom(body, received=None):
        raise RuntimeError("boom")

    monkeypatch.setattr(icici, "parse", boom)
    with pytest.raises(RuntimeError):
        sync.sync_sms(conn, exports)
    assert old.exists()


def test_newly_supported_bank_gets_full_history(conn, exports):
    hdfc_sms = sms("Sent Rs.930.00 From HDFC Bank A/C *1234 To SHOP On 12/09/25 Ref 123456789012 Not You?",
                   T0, address="VM-HDFCBK-S")
    write_export(exports, "messages-a.zip", [sms(UPI_DEBIT, T0 + 30 * DAY_MS), hdfc_sms])
    # Simulate a database that has synced before HDFC was supported.
    conn.execute("DELETE FROM sync_headers")
    conn.execute("INSERT INTO sync_headers VALUES ('ICICIT', 'then')")
    conn.execute("INSERT INTO sync_state VALUES ('sms', ?, 'messages-a.zip', 0, 0, 'then')", (T0 + 30 * DAY_MS,))

    report = sync.sync_sms(conn, exports)

    # The HDFC message is far behind the checkpoint but is still read, once.
    assert report.statuses == {"parsed": 2}
    assert count(conn, "transactions", "bank = 'HDFC'") == 1
    assert sync.sync_sms(conn, exports).skipped_reason


def test_sbi_announcing_one_credit_twice_is_a_duplicate(conn, exports):
    regular = ("Your A/C XXXXX596354 Credited INR 10,82,318.00 on 06/06/26 -Deposit by transfer from Mr. JaneDoe. "
               "Avl Bal INR 11,82,355.00-SBI")
    closure = ("Dear Customer, Your A/C XXXXX596354 Credited. INR 10,82,318.00 on 06/06/26 on account of Closure of "
               "TD A/c XXXXX342829.-SBI")
    write_export(exports, "messages-a.zip", [sms(regular, T0, address="AD-CBSSBI"),
                                             sms(closure, T0 + 1, address="AD-CBSSBI")])
    report = sync.sync_sms(conn, exports)
    assert report.statuses == {"parsed": 1, "duplicate": 1}
    assert count(conn, "transactions", "bank = 'SBI'") == 1


BARE = ("ICICI Bank Acc XXXX0123 debited with Rs 35,000.00 on 07-Apr-2025. credit via :4046245921."
        "Call 18002662 for dispute or SMS BLOCK 123 to 9215676766")
DETAILED = ("ICICI Bank Acct XX123 debited with Rs 35,000.00 on 07-Apr-25 & Acct XX551 credited.IMPS:509719045599. "
            "Call 18002662 for dispute or SMS BLOCK 123 to 9215676766")


@pytest.mark.parametrize("order", [(BARE, DETAILED), (DETAILED, BARE)])
def test_bare_icici_copy_of_a_transfer_is_dropped(conn, exports, order):
    write_export(exports, "messages-a.zip", [sms(order[0], T0), sms(order[1], T0 + 1000)])
    sync.sync_sms(conn, exports)
    rows = conn.execute("SELECT template, counterparty FROM transactions").fetchall()
    assert rows == [("imps_debit", "XX551")]
    assert count(conn, "processed_messages", "status = 'duplicate'") == 1
