"""Encrypted SQLite (SQLCipher) connection and schema migrations.

Migrations are plain SQL applied in order; PRAGMA user_version records how
many have run. Append new migrations to the end of MIGRATIONS, never edit
existing ones.
"""

import os
from pathlib import Path

from sqlcipher3 import dbapi2 as sqlcipher

MIGRATIONS = [
    # 1: accounts, transactions, SMS processing log, sync checkpoints
    """
    CREATE TABLE accounts (
        id            INTEGER PRIMARY KEY,
        bank          TEXT NOT NULL,
        account_type  TEXT NOT NULL CHECK (account_type IN ('bank', 'credit_card')),
        suffix        TEXT NOT NULL,          -- trailing digits as shown in SMS
        name          TEXT,                   -- optional user-facing label
        UNIQUE (bank, account_type, suffix)
    );

    CREATE TABLE processed_messages (
        hash            TEXT PRIMARY KEY,     -- sha256 of sender header, timestamp, body
        source          TEXT NOT NULL,        -- 'sms'
        sender          TEXT NOT NULL,        -- DLT header, e.g. 'ICICIT'
        received_at     TEXT NOT NULL,        -- ISO timestamp
        body            TEXT NOT NULL,        -- kept for re-parsing after parser fixes
        status          TEXT NOT NULL CHECK (status IN ('parsed', 'ignored', 'unknown', 'duplicate')),
        reason          TEXT,
        parser_version  INTEGER NOT NULL,
        processed_at    TEXT NOT NULL
    );

    CREATE TABLE transactions (
        id              INTEGER PRIMARY KEY,
        account_id      INTEGER REFERENCES accounts (id),   -- NULL when the SMS names no account
        bank            TEXT NOT NULL,
        direction       TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
        amount_minor    INTEGER NOT NULL,     -- paise (or cents for foreign currency)
        currency        TEXT NOT NULL,
        txn_date        TEXT NOT NULL,        -- ISO date
        channel         TEXT NOT NULL,
        counterparty    TEXT,
        reference       TEXT,
        balance_minor   INTEGER,              -- available balance / limit after the txn
        template        TEXT NOT NULL,
        message_hash    TEXT NOT NULL REFERENCES processed_messages (hash),
        created_at      TEXT NOT NULL
    );

    -- Banks occasionally resend the same alert; a reference number makes it identifiable.
    CREATE UNIQUE INDEX transactions_reference_unique
        ON transactions (bank, direction, reference, amount_minor, txn_date)
        WHERE reference IS NOT NULL;
    CREATE INDEX transactions_date ON transactions (txn_date);

    CREATE TABLE sync_state (
        source          TEXT PRIMARY KEY,     -- 'sms'
        checkpoint_ms   INTEGER NOT NULL,     -- newest processed message timestamp
        export_name     TEXT,
        export_mtime_ns INTEGER,
        export_size     INTEGER,
        updated_at      TEXT NOT NULL
    );
    """,
    # 2: transaction kind, so transfers between own accounts are excluded from spend/income
    """
    ALTER TABLE transactions ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense'
        CHECK (kind IN ('expense', 'income', 'refund', 'transfer'));
    ALTER TABLE transactions ADD COLUMN kind_rule TEXT;       -- which classification rule applied
    ALTER TABLE transactions ADD COLUMN linked_txn_id INTEGER REFERENCES transactions (id);
    CREATE INDEX transactions_kind ON transactions (kind, txn_date);
    """,
    # 3: multiple banks — track which sender headers have been backfilled, and
    #    flag term-deposit accounts so they aren't counted as bank balance
    """
    CREATE TABLE sync_headers (
        header      TEXT PRIMARY KEY,     -- DLT header whose full history has been ingested
        added_at    TEXT NOT NULL
    );
    INSERT INTO sync_headers (header, added_at)
        SELECT DISTINCT sender, datetime('now') FROM processed_messages;
    ALTER TABLE accounts ADD COLUMN is_deposit INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE accounts ADD COLUMN is_closed INTEGER NOT NULL DEFAULT 0;
    """,
    # 4: spending category, set by user rules
    """
    ALTER TABLE transactions ADD COLUMN category TEXT;
    """,
    # 5: PPF entries (entered by hand) and investment snapshots (fetched from brokers)
    """
    CREATE TABLE ppf_entries (
        id            INTEGER PRIMARY KEY,
        entry_date    TEXT NOT NULL,        -- ISO date
        entry_type    TEXT NOT NULL CHECK (entry_type IN ('balance', 'deposit')),
        amount_minor  INTEGER NOT NULL,     -- paise
        note          TEXT,
        created_at    TEXT NOT NULL
    );
    CREATE TABLE investment_snapshots (
        id            INTEGER PRIMARY KEY,
        source        TEXT NOT NULL,        -- 'zerodha'
        fetched_at    TEXT NOT NULL,
        cash_minor    INTEGER               -- available funds with the broker, paise
    );
    CREATE TABLE investment_holdings (
        id            INTEGER PRIMARY KEY,
        snapshot_id   INTEGER NOT NULL REFERENCES investment_snapshots (id) ON DELETE CASCADE,
        asset_type    TEXT NOT NULL CHECK (asset_type IN ('equity', 'mf')),
        symbol        TEXT NOT NULL,
        name          TEXT,
        exchange      TEXT,
        isin          TEXT,
        quantity      REAL NOT NULL,
        average_price REAL NOT NULL,        -- rupees per unit
        last_price    REAL NOT NULL,
        close_price   REAL                  -- previous close, for day change
    );
    CREATE INDEX investment_holdings_snapshot ON investment_holdings (snapshot_id);
    """,
    # 6: PPF entries can record the yearly interest credit; drop SBI's duplicate
    #    "Closure of TD" credit SMS where a regular credit alert recorded the same money
    """
    CREATE TABLE ppf_entries_new (
        id            INTEGER PRIMARY KEY,
        entry_date    TEXT NOT NULL,
        entry_type    TEXT NOT NULL CHECK (entry_type IN ('balance', 'deposit', 'interest')),
        amount_minor  INTEGER NOT NULL,
        note          TEXT,
        created_at    TEXT NOT NULL
    );
    INSERT INTO ppf_entries_new SELECT id, entry_date, entry_type, amount_minor, note, created_at FROM ppf_entries;
    DROP TABLE ppf_entries;
    ALTER TABLE ppf_entries_new RENAME TO ppf_entries;

    CREATE TEMP TABLE duplicate_closures AS
        SELECT t.id, t.message_hash FROM transactions t
        WHERE t.template = 'td_closure_credit' AND EXISTS (
            SELECT 1 FROM transactions o WHERE o.id != t.id AND o.account_id = t.account_id
              AND o.direction = 'credit' AND o.amount_minor = t.amount_minor AND o.txn_date = t.txn_date);
    UPDATE processed_messages SET status = 'duplicate',
        reason = 'same credit as a regular SBI credit alert'
        WHERE hash IN (SELECT message_hash FROM duplicate_closures);
    UPDATE transactions SET linked_txn_id = NULL WHERE linked_txn_id IN (SELECT id FROM duplicate_closures);
    DELETE FROM transactions WHERE id IN (SELECT id FROM duplicate_closures);
    DROP TABLE duplicate_closures;
    """,
    # 7: small key/value store for UI preferences (e.g. the FI calculator's inputs)
    """
    CREATE TABLE settings (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,        -- JSON
        updated_at  TEXT NOT NULL
    );
    """,
    # 8: ICICI's bare "debited … credit via" SMS can repeat a transfer another SMS already
    #    announced; drop those copies (the detailed SMS names the payee)
    """
    CREATE TEMP TABLE bare_copies AS
        SELECT t.id, t.message_hash FROM transactions t
        WHERE t.template = 'account_debit_v0' AND EXISTS (
            SELECT 1 FROM transactions o WHERE o.id != t.id AND o.bank = t.bank AND o.direction = 'debit'
              AND o.amount_minor = t.amount_minor AND o.txn_date = t.txn_date AND o.template != 'account_debit_v0');
    UPDATE processed_messages SET status = 'duplicate', reason = 'same transfer as a detailed ICICI alert'
        WHERE hash IN (SELECT message_hash FROM bare_copies);
    UPDATE transactions SET linked_txn_id = NULL WHERE linked_txn_id IN (SELECT id FROM bare_copies);
    DELETE FROM transactions WHERE id IN (SELECT id FROM bare_copies);
    DROP TABLE bare_copies;
    """,
    # 9: FDs added or corrected by hand (banks don't always send an SMS)
    """
    CREATE TABLE fd_adjustments (
        id              INTEGER PRIMARY KEY,
        bank            TEXT NOT NULL,
        number          TEXT,               -- matches an SMS-derived FD to correct it; NULL adds a new FD
        principal_minor INTEGER,
        opened_on       TEXT,
        maturity_on     TEXT,
        closed_on       TEXT,
        rate            TEXT,
        note            TEXT,
        created_at      TEXT NOT NULL
    );
    """,
    # 10: rolling budget categories (the monthly income base lives in settings)
    """
    CREATE TABLE budget_categories (
        id           INTEGER PRIMARY KEY,
        name         TEXT NOT NULL UNIQUE,
        percent      REAL NOT NULL CHECK (percent >= 0 AND percent <= 100),
        keywords     TEXT NOT NULL DEFAULT '[]',   -- JSON list of merchant keywords / "category:X"
        start_month  TEXT NOT NULL,                -- 'YYYY-MM': first month that gets an allocation
        goal_minor   INTEGER,                      -- optional savings goal, paise
        goal_label   TEXT,
        position     INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT NOT NULL
    );
    """,
    # 11: monthly budgets (reset each month) vs savings pots (carry over)
    """
    ALTER TABLE budget_categories ADD COLUMN rollover INTEGER NOT NULL DEFAULT 1;
    UPDATE budget_categories SET rollover = 0
        WHERE name IN ('Rent & housing', 'Groceries', 'Bills & utilities', 'Transport', 'Health & fitness');
    """,
    # 12: expense categories, each grouping one or more budget categories (for the overview chart)
    """
    CREATE TABLE expense_groups (
        id          INTEGER PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        position    INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL
    );
    ALTER TABLE budget_categories ADD COLUMN group_id INTEGER REFERENCES expense_groups(id) ON DELETE SET NULL;
    INSERT INTO expense_groups (name, position, created_at) VALUES
        ('Home', 0, datetime('now')), ('Food', 1, datetime('now')), ('Transport & travel', 2, datetime('now')),
        ('Health', 3, datetime('now')), ('Lifestyle', 4, datetime('now'));
    UPDATE budget_categories SET group_id = (SELECT id FROM expense_groups WHERE name = 'Home')
        WHERE name IN ('Rent & housing', 'Bills & utilities', 'Household help');
    UPDATE budget_categories SET group_id = (SELECT id FROM expense_groups WHERE name = 'Food')
        WHERE name IN ('Groceries', 'Food delivery & eating out');
    UPDATE budget_categories SET group_id = (SELECT id FROM expense_groups WHERE name = 'Transport & travel')
        WHERE name IN ('Transport', 'Travel & vacations');
    UPDATE budget_categories SET group_id = (SELECT id FROM expense_groups WHERE name = 'Health')
        WHERE name IN ('Health & fitness');
    UPDATE budget_categories SET group_id = (SELECT id FROM expense_groups WHERE name = 'Lifestyle')
        WHERE name IN ('Entertainment', 'Subscriptions & software', 'Shopping & personal', 'Gifts & donations');
    """,
]


def default_path() -> Path:
    data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return data_home / "finance-tracker" / "finance.db"


def open_default(path: Path | None = None, create: bool = False) -> sqlcipher.Connection:
    """Open the database with its key from the system keyring."""
    from . import keystore

    path = path or default_path()
    if not create and not path.exists():
        raise FileNotFoundError(f"No database at {path}. Run 'finance-tracker init' first.")
    return connect(path, keystore.get_db_key(create=create))


def connect(path: Path, key_hex: str) -> sqlcipher.Connection:
    """Open (or create) the encrypted database and apply pending migrations.

    `key_hex` is a 64-char hex string used as a raw 256-bit key, so SQLCipher
    skips passphrase key derivation.
    """
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    conn = sqlcipher.connect(str(path), isolation_level=None)  # explicit BEGIN/COMMIT
    if len(key_hex) != 64 or any(c not in "0123456789abcdef" for c in key_hex):
        raise ValueError("database key must be 64 lowercase hex characters")
    conn.execute(f"PRAGMA key = \"x'{key_hex}'\"")
    conn.execute("PRAGMA foreign_keys = ON")
    # Fails here, rather than on first real query, if the key is wrong.
    conn.execute("SELECT count(*) FROM sqlite_master").fetchone()
    os.chmod(path, 0o600)
    _migrate(conn)
    return conn


def _migrate(conn: sqlcipher.Connection) -> None:
    (version,) = conn.execute("PRAGMA user_version").fetchone()
    for number, sql in enumerate(MIGRATIONS[version:], start=version + 1):
        try:
            conn.executescript(f"BEGIN; {sql}; PRAGMA user_version = {number}; COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK")
            raise
