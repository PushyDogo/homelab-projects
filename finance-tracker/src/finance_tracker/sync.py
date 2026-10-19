"""Ingest the latest SMS export into the database.

Each run:
  1. Picks the newest messages-*.zip in the export directory. If it's the
     same file (name, mtime, size) as last time, nothing is done.
  2. Reads SMS newer than the stored checkpoint minus a safety overlap, and
     only from senders that have a parser. Other SMS are never stored. Senders
     whose parser is new (not yet in sync_headers) get their full history read.
  3. Records each message in processed_messages (keyed by content hash, so
     re-runs are idempotent) and each parsed transaction in transactions.
  4. Re-parses stored "unknown" messages if their parser has been upgraded.
  5. Reclassifies transactions (expense/income/refund/transfer).
  6. Advances the checkpoint — all in one database transaction.
  7. After a successful commit, deletes exports older than the one just read.
"""

import hashlib
import os
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from . import config
from .classify import classify
from .sms.export import read_export
from .sms.models import Transaction
from .sms.registry import PARSERS

SOURCE = "sms"
# Re-read messages this far behind the checkpoint in case the phone recorded
# them out of order. The content hash keeps re-reads from duplicating.
OVERLAP_MS = 2 * 24 * 60 * 60 * 1000


def default_export_dir() -> Path:
    return Path(os.environ.get("FINANCE_TRACKER_SMS_DIR", Path.home() / "Messages"))


@dataclass
class SyncReport:
    export: Path | None = None
    skipped_reason: str | None = None     # set when nothing was ingested
    statuses: Counter = field(default_factory=Counter)
    reparsed: int = 0
    kinds: Counter = field(default_factory=Counter)      # transaction counts by kind after classifying
    deleted: list[Path] = field(default_factory=list)   # older exports removed after ingest


def latest_export(export_dir: Path) -> Path | None:
    exports = list(export_dir.glob("messages-*.zip"))
    return max(exports, key=lambda p: p.stat().st_mtime_ns) if exports else None


def sync_sms(conn, export_dir: Path, settings: config.Config | None = None) -> SyncReport:
    export = latest_export(export_dir)
    if export is None:
        return SyncReport(skipped_reason=f"no messages-*.zip found in {export_dir}")

    stat = export.stat()
    state = conn.execute(
        "SELECT checkpoint_ms, export_name, export_mtime_ns, export_size FROM sync_state WHERE source = ?",
        (SOURCE,),
    ).fetchone()
    known_headers = {h for (h,) in conn.execute("SELECT header FROM sync_headers")}
    new_headers = set(PARSERS) - known_headers
    # A newly supported sender needs its full history read, even from an unchanged export.
    unchanged = (state and not new_headers
                 and (state[1], state[2], state[3]) == (export.name, stat.st_mtime_ns, stat.st_size))
    checkpoint = state[0] if state else 0
    settings = settings or config.load()
    report = SyncReport(export=export)
    if unchanged:
        report.skipped_reason = "export unchanged since last sync; has the phone synced?"
    newest = checkpoint

    conn.execute("BEGIN")
    try:
        # Parser upgrades apply to stored messages even when there's no new export.
        report.reparsed = _reparse_unknown(conn)
        if unchanged:
            report.kinds = classify(conn, settings.owner_names, settings.rules)
            conn.execute("COMMIT")
            # Clean up anything a previous run couldn't delete.
            report.deleted = _delete_older_exports(export)
            return report

        for sms in read_export(export):
            parser = PARSERS.get(sms.header)
            if parser is None:
                continue
            if sms.header not in new_headers and sms.received_ms <= checkpoint - OVERLAP_MS:
                continue
            digest = _message_hash(sms.header, sms.received_ms, sms.body)
            if conn.execute("SELECT 1 FROM processed_messages WHERE hash = ?", (digest,)).fetchone():
                continue
            status = _ingest(conn, parser, digest, sms.header, sms.received_ms, sms.body)
            report.statuses[status] += 1
            newest = max(newest, sms.received_ms)

        for header in new_headers:
            conn.execute("INSERT INTO sync_headers (header, added_at) VALUES (?, ?)", (header, _now()))
        report.kinds = classify(conn, settings.owner_names, settings.rules)
        conn.execute(
            """
            INSERT INTO sync_state (source, checkpoint_ms, export_name, export_mtime_ns, export_size, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (source) DO UPDATE SET
                checkpoint_ms = excluded.checkpoint_ms, export_name = excluded.export_name,
                export_mtime_ns = excluded.export_mtime_ns, export_size = excluded.export_size,
                updated_at = excluded.updated_at
            """,
            (SOURCE, newest, export.name, stat.st_mtime_ns, stat.st_size, _now()),
        )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    report.deleted = _delete_older_exports(export)
    return report


def _delete_older_exports(current: Path) -> list[Path]:
    """Remove exports older than `current`, which has just been ingested.

    `current` itself is kept so the next run can detect an unchanged export,
    and anything newer (e.g. delivered by Syncthing mid-sync) is left alone.
    """
    current_mtime = current.stat().st_mtime_ns
    deleted = []
    for path in current.parent.glob("messages-*.zip"):
        if path != current and path.stat().st_mtime_ns <= current_mtime:
            path.unlink()
            deleted.append(path)
    return deleted


def _ingest(conn, parser, digest, header, received_ms, body) -> str:
    """Parse one message and store it. Returns the stored status."""
    result = parser.parse(body, datetime.fromtimestamp(received_ms / 1000).date())
    status, reason = result.status, result.reason
    txn = result.transaction
    if txn and _is_duplicate(conn, txn):
        status, reason, txn = "duplicate", "same bank reference, amount and date already stored", None
    elif txn:
        _drop_bare_copy(conn, txn)

    conn.execute(
        """
        INSERT INTO processed_messages
            (hash, source, sender, received_at, body, status, reason, parser_version, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (digest, SOURCE, header, datetime.fromtimestamp(received_ms / 1000).isoformat(),
         body, status, reason, parser.PARSER_VERSION, _now()),
    )
    if txn:
        _insert_transaction(conn, txn, digest)
    return status


def _reparse_unknown(conn) -> int:
    """Retry "unknown" messages whose parser version has since been bumped."""
    reparsed = 0
    for header, parser in PARSERS.items():
        rows = conn.execute(
            "SELECT hash, body, received_at FROM processed_messages "
            "WHERE sender = ? AND status = 'unknown' AND parser_version < ?",
            (header, parser.PARSER_VERSION),
        ).fetchall()
        for digest, body, received_at in rows:
            result = parser.parse(body, datetime.fromisoformat(received_at).date())
            txn = result.transaction
            status, reason = result.status, result.reason
            if txn and _is_duplicate(conn, txn):
                status, reason, txn = "duplicate", "same bank reference, amount and date already stored", None
            conn.execute(
                "UPDATE processed_messages SET status = ?, reason = ?, parser_version = ?, processed_at = ? "
                "WHERE hash = ?",
                (status, reason, parser.PARSER_VERSION, _now(), digest),
            )
            if txn:
                _insert_transaction(conn, txn, digest)
            reparsed += status != "unknown"
    return reparsed


BARE_TEMPLATE = "account_debit_v0"   # ICICI "debited with Rs X on D. credit via :ref" (no payee)


def _drop_bare_copy(conn, txn: Transaction) -> None:
    """A detailed alert arriving after ICICI's bare copy of the same debit replaces it."""
    if txn.template == BARE_TEMPLATE:
        return
    row = conn.execute(
        "SELECT id, message_hash FROM transactions WHERE bank = ? AND direction = ? AND template = ? "
        "AND amount_minor = ? AND txn_date = ?",
        (txn.bank, txn.direction, BARE_TEMPLATE, _minor(txn.amount), txn.txn_date.isoformat()),
    ).fetchone()
    if row:
        conn.execute("DELETE FROM transactions WHERE id = ?", row[:1])
        conn.execute("UPDATE processed_messages SET status = 'duplicate', "
                     "reason = 'same transfer as a detailed ICICI alert' WHERE hash = ?", row[1:])


def _is_duplicate(conn, txn: Transaction) -> bool:
    if txn.template == BARE_TEMPLATE:
        # The bare alert repeats a debit another SMS may already have announced in detail.
        return conn.execute(
            "SELECT 1 FROM transactions WHERE bank = ? AND direction = ? AND amount_minor = ? AND txn_date = ?",
            (txn.bank, txn.direction, _minor(txn.amount), txn.txn_date.isoformat()),
        ).fetchone() is not None
    if txn.bank == "SBI" and txn.direction == "credit" and txn.reference is None:
        # SBI can announce one credit twice: a regular alert and a "Closure of TD" notice.
        return conn.execute(
            "SELECT 1 FROM transactions WHERE bank = 'SBI' AND direction = 'credit' AND amount_minor = ? "
            "AND txn_date = ? AND (template = 'td_closure_credit' OR ? = 'td_closure_credit')",
            (_minor(txn.amount), txn.txn_date.isoformat(), txn.template),
        ).fetchone() is not None
    if txn.reference is None:
        return False
    return conn.execute(
        "SELECT 1 FROM transactions WHERE bank = ? AND direction = ? AND reference = ? "
        "AND amount_minor = ? AND txn_date = ?",
        (txn.bank, txn.direction, txn.reference, _minor(txn.amount), txn.txn_date.isoformat()),
    ).fetchone() is not None


def _insert_transaction(conn, txn: Transaction, digest: str) -> None:
    conn.execute(
        """
        INSERT INTO transactions
            (account_id, bank, direction, amount_minor, currency, txn_date, channel,
             counterparty, reference, balance_minor, template, message_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            _account_id(conn, txn.bank, txn.account_type, txn.account),
            txn.bank, txn.direction, _minor(txn.amount), txn.currency, txn.txn_date.isoformat(),
            txn.channel, txn.counterparty, txn.reference,
            _minor(txn.balance) if txn.balance is not None else None,
            txn.template, digest, _now(),
        ),
    )


def _account_id(conn, bank: str, account_type: str, suffix: str | None) -> int | None:
    """Find or create the account an SMS refers to.

    SMS mask account numbers inconsistently (XX123 vs XXXX0123), so suffixes
    match when one ends with the other; the longer suffix is kept. When the SMS
    names no account, it's attributed only if the bank has exactly one account
    of that type.
    """
    rows = conn.execute(
        "SELECT id, suffix FROM accounts WHERE bank = ? AND account_type = ?", (bank, account_type)
    ).fetchall()
    if suffix is None:
        return rows[0][0] if len(rows) == 1 else None

    for account_id, known in rows:
        if known.endswith(suffix) or suffix.endswith(known):
            if len(suffix) > len(known):
                conn.execute("UPDATE accounts SET suffix = ? WHERE id = ?", (suffix, account_id))
            return account_id
    return conn.execute(
        "INSERT INTO accounts (bank, account_type, suffix) VALUES (?, ?, ?)", (bank, account_type, suffix)
    ).lastrowid


def _message_hash(header: str, received_ms: int, body: str) -> str:
    return hashlib.sha256(f"{header}\x1f{received_ms}\x1f{body}".encode()).hexdigest()


def _minor(amount) -> int:
    return int((amount * 100).to_integral_value())


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")
