"""Command line entry point: finance-tracker {init,sync,stats}."""

import argparse
import sys
from pathlib import Path

from . import db, keystore
from .sync import default_export_dir, sync_sms


def _open(path: Path, create: bool = False):
    try:
        return db.open_default(path, create=create)
    except FileNotFoundError as e:
        sys.exit(str(e))


def cmd_init(args) -> None:
    existed = args.db.exists()
    _open(args.db, create=True).close()
    print(f"{'Opened existing' if existed else 'Created'} encrypted database at {args.db}")
    print(f"Key stored in the system keyring as {keystore.SERVICE}/{keystore.DB_KEY}")


def cmd_sync(args) -> None:
    conn = _open(args.db)
    report = sync_sms(conn, args.export_dir)
    conn.close()
    if report.deleted:
        print(f"Deleted {len(report.deleted)} older export(s): {', '.join(p.name for p in report.deleted)}")
    if report.reparsed:
        print(f"Re-parsed {report.reparsed} previously unknown messages")
    if report.kinds:
        print("Classified: " + ", ".join(f"{k} {n}" for k, n in report.kinds.most_common()))
    if report.skipped_reason:
        print(f"SMS sync skipped: {report.skipped_reason}")
        return
    counts = ", ".join(f"{s} {n}" for s, n in report.statuses.most_common()) or "no new messages"
    print(f"SMS sync from {report.export.name}: {counts}")


def cmd_stats(args) -> None:
    conn = _open(args.db)
    rows = conn.execute(
        "SELECT a.bank, a.account_type, a.suffix, count(t.id), min(t.txn_date), max(t.txn_date) "
        "FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id "
        "GROUP BY a.id ORDER BY a.bank, a.account_type"
    ).fetchall()
    for bank, account_type, suffix, count, first, last in rows:
        print(f"{bank:<8} {account_type:<12} x{suffix:<6} {count:>6} txns  {first} → {last}")
    (unassigned,) = conn.execute("SELECT count(*) FROM transactions WHERE account_id IS NULL").fetchone()
    if unassigned:
        print(f"{unassigned} transactions without an identifiable account")
    for status, count in conn.execute(
        "SELECT status, count(*) FROM processed_messages GROUP BY status ORDER BY 2 DESC"
    ):
        print(f"messages {status:<10} {count:>6}")
    conn.close()


def cmd_zerodha_setup(args) -> None:
    import getpass

    print("Create a Kite Connect app at https://developers.kite.trade and set its redirect URL to:")
    print(f"  http://127.0.0.1:{args.port}/zerodha/callback")
    api_key = input("API key: ").strip()
    api_secret = getpass.getpass("API secret (hidden): ").strip()
    if not api_key or not api_secret:
        sys.exit("Both the API key and secret are required.")
    keystore.set_kite_credentials(api_key, api_secret)
    print(f"Saved to the system keyring ({keystore.SERVICE}/{keystore.KITE_API_KEY}, {keystore.KITE_API_SECRET}).")
    print("Open the Investments tab and click 'Connect Zerodha'.")


def cmd_zerodha_logout(args) -> None:
    keystore.clear_kite_access_token()
    print("Removed today's Zerodha access token.")


def cmd_ui(args) -> None:
    from .ui.app import run

    run(port=args.port, show=not args.no_browser, db_path=args.db)


def main() -> None:
    parser = argparse.ArgumentParser(prog="finance-tracker")
    parser.add_argument("--db", type=Path, default=db.default_path(), help="database path")
    sub = parser.add_subparsers(required=True)

    sub.add_parser("init", help="create the database and its keyring key").set_defaults(func=cmd_init)
    sync = sub.add_parser("sync", help="ingest the latest SMS export")
    sync.add_argument("--export-dir", type=Path, default=default_export_dir())
    sync.set_defaults(func=cmd_sync)
    sub.add_parser("stats", help="show account and message counts").set_defaults(func=cmd_stats)
    zerodha = sub.add_parser("zerodha", help="Zerodha Kite Connect credentials").add_subparsers(required=True)
    setup = zerodha.add_parser("setup", help="store your Kite Connect API key and secret in the keyring")
    setup.add_argument("--port", type=int, default=8321, help="UI port used in the redirect URL")
    setup.set_defaults(func=cmd_zerodha_setup)
    zerodha.add_parser("logout", help="forget today's access token").set_defaults(func=cmd_zerodha_logout)
    ui = sub.add_parser("ui", help="open the local web UI (127.0.0.1 only)")
    ui.add_argument("--port", type=int, default=8321)
    ui.add_argument("--no-browser", action="store_true", help="don't open a browser tab")
    ui.set_defaults(func=cmd_ui)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
