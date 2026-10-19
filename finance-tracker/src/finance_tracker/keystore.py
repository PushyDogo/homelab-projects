"""Secrets in the OS keyring (Secret Service / KWallet): the database key and
the Zerodha Kite Connect credentials."""

import json
import secrets
from datetime import date

import keyring

SERVICE = "finance-tracker"
DB_KEY = "db-key"
KITE_API_KEY = "kite-api-key"
KITE_API_SECRET = "kite-api-secret"
KITE_ACCESS_TOKEN = "kite-access-token"


def get_db_key(create: bool = False) -> str:
    """Return the 256-bit database key as hex, generating it on first use.

    Raises RuntimeError if no key exists and `create` is False, so an existing
    database is never silently paired with a fresh (wrong) key.
    """
    key = keyring.get_password(SERVICE, DB_KEY)
    if key:
        return key
    if not create:
        raise RuntimeError(
            f"No database key in the keyring ({SERVICE}/{DB_KEY}). "
            "Run 'finance-tracker init' to create one."
        )
    key = secrets.token_hex(32)
    keyring.set_password(SERVICE, DB_KEY, key)
    return key


def get_kite_credentials() -> tuple[str, str] | None:
    api_key = keyring.get_password(SERVICE, KITE_API_KEY)
    api_secret = keyring.get_password(SERVICE, KITE_API_SECRET)
    return (api_key, api_secret) if api_key and api_secret else None


def set_kite_credentials(api_key: str, api_secret: str) -> None:
    keyring.set_password(SERVICE, KITE_API_KEY, api_key)
    keyring.set_password(SERVICE, KITE_API_SECRET, api_secret)
    clear_kite_access_token()


def get_kite_access_token() -> str | None:
    """Today's access token, if any (Kite tokens expire daily)."""
    stored = keyring.get_password(SERVICE, KITE_ACCESS_TOKEN)
    if not stored:
        return None
    try:
        record = json.loads(stored)
    except ValueError:
        return None
    return record["token"] if record.get("date") == date.today().isoformat() else None


def set_kite_access_token(token: str) -> None:
    keyring.set_password(SERVICE, KITE_ACCESS_TOKEN, json.dumps({"token": token, "date": date.today().isoformat()}))


def clear_kite_access_token() -> None:
    try:
        keyring.delete_password(SERVICE, KITE_ACCESS_TOKEN)
    except keyring.errors.PasswordDeleteError:
        pass
