"""Classify transactions as expense, income, refund or transfer.

Transfers are money moving between your own accounts and assets (card bill
payments, FDs, investments, transfers between your banks). They stay in the
data but are excluded from spend and income, so nothing is counted twice: a
card purchase is the expense, and paying the card bill later is only a
transfer.

Classification is recomputed from scratch on every run, so rule changes apply
to all history. Steps, in order (later steps override earlier ones):

  1. Defaults: debits are expenses, credits are income; no category.
  2. Term-deposit accounts are flagged (SBI numbers each FD like an account),
     and transactions whose SMS names no account (e.g. SBI debit card alerts)
     are attributed to that bank's main account.
  3. Own transfers recognised from the text: a debit naming you (or one of
     your other accounts) as the recipient, or a credit naming you as the
     sender (see `_owner_patterns`).
  4. Built-in pattern rules (refunds, FDs, investments, card bill payments).
  5. Your rules from config.toml (kind and/or category).
  6. Card bill payments are paired with the bank debit that paid them.
  7. Remaining debits are paired with a same-amount credit in another of
     your accounts a few days later: that's money moving between your banks.
  8. Money moving into or out of a term deposit is labelled as an FD booking
     or closure, as are bank debits/credits matching an FD opened/closed on
     the same day for the same amount (e.g. SBI funds a new TDR by a plain
     "Transferred to …" debit).
"""

import re
from collections import Counter

from .config import Rule

# (rule name, kind, SQL condition). Applied in order; later rules win.
PATTERN_RULES = [
    ("refund", "refund", "channel = 'refund'"),
    ("fd_booking", "transfer",
     "direction = 'debit' AND (counterparty LIKE 'TRF TO FD%' OR counterparty LIKE 'FD through%')"),
    ("fd_closure", "transfer",
     "direction = 'credit' AND (counterparty LIKE '%FD clos%' OR counterparty LIKE '%Closure Procee%'"
     " OR counterparty LIKE '%Closure of TD%' OR counterparty LIKE 'Prin and Int auto%')"),
    # Money sent to Zerodha: mutual fund (Coin) purchases settle through Indian Clearing
    # Corporation (ICCL), and adding funds for stock purchases goes to Zerodha Broking.
    # Banks spell these several ways ("Indian Clearing", "IndianClearingC", "ICCL ZERODHA CO").
    ("investment", "transfer",
     "direction = 'debit' AND (counterparty LIKE 'Indian Clearing%' OR counterparty LIKE 'IndianClearing%'"
     " OR counterparty LIKE 'ICCL%' OR counterparty LIKE '%Zerodha%')"),
    # Paying a credit card bill; the card purchases themselves are the expenses.
    ("cc_bill_payment", "transfer",
     "channel = 'cc_payment' AND account_id IN (SELECT id FROM accounts WHERE account_type = 'credit_card')"),
    # Card bills paid through CRED. (Not "CREDPAY…": that's CRED's UPI paying a merchant.)
    ("cc_bill_payment", "transfer",
     "direction = 'debit' AND (counterparty = 'CRED' OR counterparty LIKE 'CRED Club%')"),
]

# CRED rewards cover part of a bill, so the bank debit can be a little less than the card credit.
CRED_MATCH_TOLERANCE = 0.10

# A bank debit is the other side of a card payment if the amounts match and it
# happened up to this many days before (or one day after) the card credit.
CC_MATCH_DAYS_BEFORE = 3
CC_MATCH_DAYS_AFTER = 1
# A transfer between your banks lands up to this many days after (or one day before) the debit.
OWN_MATCH_DAYS_AFTER = 3
OWN_MATCH_DAYS_BEFORE = 1


def classify(conn, owner_names: list[str] = (), rules: list[Rule] = ()) -> Counter:
    """Reclassify every transaction. Call inside the caller's DB transaction."""
    conn.execute(
        "UPDATE transactions SET kind = CASE direction WHEN 'debit' THEN 'expense' ELSE 'income' END, "
        "kind_rule = NULL, linked_txn_id = NULL, category = NULL"
    )
    _mark_deposit_accounts(conn)
    _attribute_unassigned(conn)
    _mark_own_name_transfers(conn, owner_names)
    _mark_own_account_transfers(conn)
    for rule, kind, condition in PATTERN_RULES:
        conn.execute(f"UPDATE transactions SET kind = ?, kind_rule = ? WHERE {condition}", (kind, rule))
    _apply_user_rules(conn, rules)
    _link_card_payments(conn)
    _link_own_transfers(conn)
    _label_deposit_transfers(conn)
    _label_fd_events(conn)
    return Counter(dict(conn.execute("SELECT kind, count(*) FROM transactions GROUP BY kind").fetchall()))


def _owner_patterns(names: list[str]) -> tuple[re.Pattern | None, re.Pattern | None]:
    """Regexes recognising you as a debit's recipient or a credit's sender.

    Credits name you as the beneficiary too (e.g. salary "NEFT Cr-<IFSC>-<EMPLOYER>-<You>"),
    so for credits only sender positions count.
    """
    if not names:
        return None, None
    # "Manu Gupta" also matches "ManuGupta" and "MANU GUPTA".
    name = "|".join(r"\s*".join(map(re.escape, n.split())) for n in names)
    debit = re.compile(rf"(?:{name})", re.I)
    credit = re.compile(
        rf"^(?:{name})"                                   # "MANU GUPTA", "MANU GUPTAS/O ..."
        rf"|from\s+(?:mr|ms|mrs)?\.?\s*(?:{name})"         # "Deposit by transfer from Mr. ManuGupta"
        rf"|(?:NEFT|RTGS|IMPS) Cr-[^-]*-(?:{name})"         # "NEFT Cr-<IFSC>-<sender>-<beneficiary>"
        rf"|mobile\s+\S+\s*-\s*(?:{name})",                # "a/c linked to mobile 9XXX00-MANU GUPTA"
        re.I,
    )
    return debit, credit


def _mark_own_name_transfers(conn, names: list[str]) -> None:
    debit_pattern, credit_pattern = _owner_patterns(names)
    if not debit_pattern:
        return
    rows = conn.execute(
        "SELECT id, direction, counterparty FROM transactions WHERE counterparty IS NOT NULL").fetchall()
    for txn_id, direction, counterparty in rows:
        pattern = debit_pattern if direction == "debit" else credit_pattern
        if pattern.search(counterparty):
            conn.execute(
                "UPDATE transactions SET kind = 'transfer', kind_rule = 'own_transfer' WHERE id = ?", (txn_id,))


# A masked account number in a debit's recipient, e.g. "A/c xxxxxxxx4879" (not mobile numbers).
_MASKED_ACCOUNT = re.compile(r"(?<!mobile no )(?<!mobile )[Xx*]{2,}(\d{3,})")


def _mark_own_account_transfers(conn) -> None:
    """A debit whose recipient is one of your other accounts is a transfer."""
    accounts = conn.execute("SELECT id, suffix FROM accounts").fetchall()
    rows = conn.execute(
        "SELECT id, account_id, counterparty FROM transactions WHERE direction = 'debit' AND counterparty IS NOT NULL"
    ).fetchall()
    for txn_id, account_id, counterparty in rows:
        for digits in _MASKED_ACCOUNT.findall(counterparty):
            if any(other_id != account_id and (digits.endswith(suffix) or suffix.endswith(digits))
                   for other_id, suffix in accounts):
                conn.execute(
                    "UPDATE transactions SET kind = 'transfer', kind_rule = 'own_transfer' WHERE id = ?", (txn_id,))
                break


def _apply_user_rules(conn, rules: list[Rule]) -> None:
    if not rules:
        return
    rows = conn.execute(
        "SELECT id, direction, bank, amount_minor, counterparty FROM transactions WHERE counterparty IS NOT NULL"
    ).fetchall()
    for txn_id, direction, bank, amount_minor, counterparty in rows:
        for rule in rules:
            if not rule.matches(direction, bank, amount_minor, counterparty):
                continue
            if rule.kind:
                conn.execute("UPDATE transactions SET kind = ?, kind_rule = ? WHERE id = ?",
                             (rule.kind, f"rule:{rule.label}", txn_id))
            if rule.category:
                conn.execute("UPDATE transactions SET category = ? WHERE id = ?", (rule.category, txn_id))


def _link_card_payments(conn) -> None:
    """Pair each card payment with the bank debit that paid it, marking both as transfers."""
    payments = conn.execute(
        "SELECT t.id, t.amount_minor, t.txn_date FROM transactions t "
        "WHERE t.kind_rule = 'cc_bill_payment' ORDER BY t.txn_date, t.id"
    ).fetchall()
    for payment_id, amount, txn_date in payments:
        match = conn.execute(
            """
            SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id
            WHERE a.account_type = 'bank' AND t.direction = 'debit' AND t.kind = 'expense'
              AND t.amount_minor = ? AND t.currency = 'INR'
              AND t.txn_date BETWEEN date(?, ?) AND date(?, ?)
            ORDER BY abs(julianday(t.txn_date) - julianday(?)), t.id
            LIMIT 1
            """,
            (amount, txn_date, f"-{CC_MATCH_DAYS_BEFORE} days", txn_date, f"+{CC_MATCH_DAYS_AFTER} days", txn_date),
        ).fetchone()
        if match:
            _link(conn, match[0], payment_id, "cc_bill_payment")
            continue
        # Paid through CRED: the bank debit may be slightly less than the card credit.
        match = conn.execute(
            """
            SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id
            WHERE a.account_type = 'bank' AND t.direction = 'debit' AND t.kind_rule = 'cc_bill_payment'
              AND t.linked_txn_id IS NULL AND t.amount_minor BETWEEN ? AND ?
              AND t.txn_date BETWEEN date(?, ?) AND date(?, ?)
            ORDER BY abs(t.amount_minor - ?), abs(julianday(t.txn_date) - julianday(?))
            LIMIT 1
            """,
            (int(amount * (1 - CRED_MATCH_TOLERANCE)), amount, txn_date, f"-{CC_MATCH_DAYS_BEFORE} days",
             txn_date, f"+{CC_MATCH_DAYS_AFTER} days", amount, txn_date),
        ).fetchone()
        if match:
            _link(conn, match[0], payment_id, "cc_bill_payment")


def _link_own_transfers(conn) -> None:
    """Pair a bank debit with a same-amount credit in another of your bank accounts.

    Candidates are unpaired debits/credits that are still expense/income, or were
    already recognised as own transfers by name (pairing them links the two sides).
    """
    candidate = "(t.kind IN ('expense', 'income') OR t.kind_rule = 'own_transfer') AND t.linked_txn_id IS NULL"
    debits = conn.execute(
        f"""
        SELECT t.id, t.account_id, t.amount_minor, t.txn_date FROM transactions t
        JOIN accounts a ON a.id = t.account_id
        WHERE a.account_type = 'bank' AND t.direction = 'debit' AND t.currency = 'INR' AND {candidate}
        ORDER BY t.txn_date, t.id
        """
    ).fetchall()
    for debit_id, account_id, amount, txn_date in debits:
        match = conn.execute(
            f"""
            SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id
            WHERE a.account_type = 'bank' AND t.direction = 'credit' AND t.currency = 'INR'
              AND t.account_id != ? AND t.amount_minor = ? AND {candidate}
              AND t.txn_date BETWEEN date(?, ?) AND date(?, ?)
            ORDER BY abs(julianday(t.txn_date) - julianday(?)), t.id
            LIMIT 1
            """,
            (account_id, amount, txn_date, f"-{OWN_MATCH_DAYS_BEFORE} days",
             txn_date, f"+{OWN_MATCH_DAYS_AFTER} days", txn_date),
        ).fetchone()
        if match:
            _link(conn, debit_id, match[0], "own_transfer")


def _link(conn, debit_id: int, credit_id: int, rule: str) -> None:
    conn.execute("UPDATE transactions SET kind = 'transfer', kind_rule = ?, linked_txn_id = ? WHERE id = ?",
                 (rule, credit_id, debit_id))
    conn.execute("UPDATE transactions SET kind = 'transfer', kind_rule = ?, linked_txn_id = ? WHERE id = ?",
                 (rule, debit_id, credit_id))


def _label_deposit_transfers(conn) -> None:
    """Money into a term deposit is an FD booking; money out of one is an FD closure."""
    deposits = "(SELECT id FROM accounts WHERE is_deposit = 1)"
    conn.execute(f"UPDATE transactions SET kind = 'transfer', kind_rule = 'fd_booking' "
                 f"WHERE account_id IN {deposits} AND direction = 'credit'")
    conn.execute(f"UPDATE transactions SET kind = 'transfer', kind_rule = 'fd_closure' "
                 f"WHERE account_id IN {deposits} AND direction = 'debit'")
    # The other side of those pairs, in your savings account.
    conn.execute(f"""
        UPDATE transactions SET kind_rule = (SELECT d.kind_rule FROM transactions d WHERE d.id = transactions.linked_txn_id)
        WHERE kind_rule = 'own_transfer'
          AND linked_txn_id IN (SELECT id FROM transactions WHERE account_id IN {deposits})
    """)


def _label_fd_events(conn) -> None:
    from . import deposits

    fds = deposits.build(conn.execute("SELECT received_at, body FROM processed_messages").fetchall())
    for fd in fds:
        for direction, rule, amount, on in (("debit", "fd_booking", fd.principal, fd.opened_on),
                                            ("credit", "fd_closure", fd.payout, fd.closed_on)):
            if amount is None or on is None:
                continue
            conn.execute(
                """
                UPDATE transactions SET kind = 'transfer', kind_rule = ?
                WHERE id = (
                    SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id
                    WHERE t.bank = ? AND t.direction = ? AND t.amount_minor = ? AND a.is_deposit = 0
                      AND t.txn_date BETWEEN date(?, '-1 day') AND date(?, '+1 day')
                      AND (t.kind IN ('expense', 'income') OR t.kind_rule = 'own_transfer')
                    ORDER BY abs(julianday(t.txn_date) - julianday(?)) LIMIT 1)
                """,
                (rule, fd.bank, direction, amount, on.isoformat(), on.isoformat(), on.isoformat()),
            )


# SBI term deposits get their own account numbers, announced in these SMS.
_DEPOSIT_OPENED = re.compile(r"TDR/STDR No X+(\d+)")
_DEPOSIT_CLOSED = re.compile(r"Closure of TD A/c X+(\d+)|A/C X+(\d+) has been closed")


def _mark_deposit_accounts(conn) -> None:
    opened, closed = set(), set()
    for (body,) in conn.execute(
        "SELECT body FROM processed_messages WHERE body LIKE '%TDR/STDR No%' OR body LIKE '%Closure of TD%' "
        "OR body LIKE '%has been closed%'"
    ):
        opened.update(_DEPOSIT_OPENED.findall(body))
        for groups in _DEPOSIT_CLOSED.findall(body):
            closed.update(g for g in groups if g)
    deposits = opened | closed
    conn.execute("UPDATE accounts SET is_deposit = 0, is_closed = 0")
    for account_id, suffix in conn.execute(
            "SELECT id, suffix FROM accounts WHERE bank = 'SBI' AND account_type = 'bank'").fetchall():
        def matches(numbers):
            return any(n.endswith(suffix) or suffix.endswith(n) for n in numbers)
        if matches(deposits):
            conn.execute("UPDATE accounts SET is_deposit = 1, is_closed = ? WHERE id = ?",
                         (int(matches(closed)), account_id))


def _attribute_unassigned(conn) -> None:
    conn.execute(
        """
        UPDATE transactions SET account_id = (
            SELECT a.id FROM accounts a
            WHERE a.bank = transactions.bank AND a.account_type = 'bank' AND a.is_deposit = 0
            ORDER BY (SELECT count(*) FROM transactions t WHERE t.account_id = a.id) DESC, a.id
            LIMIT 1)
        WHERE account_id IS NULL
        """
    )
