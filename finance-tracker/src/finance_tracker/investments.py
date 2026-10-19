"""Store and read broker portfolio snapshots."""

from datetime import datetime

from .kite import Portfolio


def store_snapshot(conn, source: str, portfolio: Portfolio) -> int:
    conn.execute("BEGIN")
    try:
        snapshot_id = conn.execute(
            "INSERT INTO investment_snapshots (source, fetched_at, cash_minor) VALUES (?, ?, ?)",
            (source, datetime.now().isoformat(timespec="seconds"),
             round(portfolio.cash * 100) if portfolio.cash is not None else None),
        ).lastrowid
        conn.executemany(
            """
            INSERT INTO investment_holdings
                (snapshot_id, asset_type, symbol, name, exchange, isin, quantity, average_price, last_price, close_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [(snapshot_id, h.asset_type, h.symbol, h.name, h.exchange, h.isin, h.quantity,
              h.average_price, h.last_price, h.close_price) for h in portfolio.holdings],
        )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return snapshot_id


def latest_snapshot(conn, source: str) -> dict | None:
    """The newest snapshot with per-holding values (rupees) and totals."""
    row = conn.execute(
        "SELECT id, fetched_at, cash_minor FROM investment_snapshots WHERE source = ? ORDER BY id DESC LIMIT 1",
        (source,),
    ).fetchone()
    if not row:
        return None
    snapshot_id, fetched_at, cash_minor = row
    cursor = conn.execute(
        "SELECT asset_type, symbol, name, exchange, isin, quantity, average_price, last_price, close_price "
        "FROM investment_holdings WHERE snapshot_id = ?", (snapshot_id,))
    names = [c[0] for c in cursor.description]
    holdings = []
    for values in cursor.fetchall():
        h = dict(zip(names, values))
        h["invested"] = h["quantity"] * h["average_price"]
        h["value"] = h["quantity"] * h["last_price"]
        h["pnl"] = h["value"] - h["invested"]
        h["pnl_pct"] = h["pnl"] / h["invested"] * 100 if h["invested"] else 0.0
        h["day_change"] = h["quantity"] * (h["last_price"] - h["close_price"]) if h["close_price"] else 0.0
        holdings.append(h)
    holdings.sort(key=lambda h: -h["value"])
    invested = sum(h["invested"] for h in holdings)
    value = sum(h["value"] for h in holdings)
    return {
        "fetched_at": fetched_at,
        "cash": cash_minor / 100 if cash_minor is not None else None,
        "holdings": holdings,
        "invested": invested,
        "value": value,
        "pnl": value - invested,
        "pnl_pct": (value - invested) / invested * 100 if invested else 0.0,
        "day_change": sum(h["day_change"] for h in holdings),
    }
