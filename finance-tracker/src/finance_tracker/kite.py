"""Minimal read-only Zerodha Kite Connect client (standard library only).

Only these endpoints are used, all read-only apart from the login token
exchange; nothing here can place, modify or cancel orders:

  POST /session/token        exchange the login request_token for an access token
  GET  /portfolio/holdings   equity holdings (demat)
  GET  /mf/holdings          mutual fund holdings (Coin)
  GET  /user/margins         available funds

Login flow: open `login_url()` in a browser, log in on kite.zerodha.com, and
Kite redirects to the redirect URL registered for your Kite Connect app with
`request_token` and our `state`. Access tokens expire daily (~6 AM).
"""

import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

API_ROOT = "https://api.kite.trade"
LOGIN_URL = "https://kite.zerodha.com/connect/login"
TIMEOUT_SECONDS = 20


class KiteError(Exception):
    pass


class TokenExpired(KiteError):
    """The access token is missing, expired or revoked: log in again."""


@dataclass(frozen=True)
class Holding:
    asset_type: str          # 'equity' or 'mf'
    symbol: str
    name: str | None
    exchange: str | None
    isin: str | None
    quantity: float
    average_price: float
    last_price: float
    close_price: float | None


@dataclass(frozen=True)
class Portfolio:
    holdings: list[Holding] = field(default_factory=list)
    cash: float | None = None   # rupees available with the broker


def login_url(api_key: str, state: str) -> str:
    query = urllib.parse.urlencode({"v": "3", "api_key": api_key, "redirect_params": f"state={state}"})
    return f"{LOGIN_URL}?{query}"


def checksum(api_key: str, request_token: str, api_secret: str) -> str:
    return hashlib.sha256(f"{api_key}{request_token}{api_secret}".encode()).hexdigest()


def create_session(api_key: str, api_secret: str, request_token: str, opener=urllib.request.urlopen) -> str:
    """Exchange a login request_token for an access token."""
    body = urllib.parse.urlencode({
        "api_key": api_key,
        "request_token": request_token,
        "checksum": checksum(api_key, request_token, api_secret),
    }).encode()
    data = _call(urllib.request.Request(f"{API_ROOT}/session/token", data=body, method="POST",
                                        headers={"X-Kite-Version": "3"}), opener)
    return data["access_token"]


def fetch_portfolio(api_key: str, access_token: str, opener=urllib.request.urlopen) -> Portfolio:
    def get(path):
        request = urllib.request.Request(f"{API_ROOT}{path}", headers={
            "X-Kite-Version": "3", "Authorization": f"token {api_key}:{access_token}"})
        return _call(request, opener)

    holdings = [
        Holding("equity", h["tradingsymbol"], None, h.get("exchange"), h.get("isin"),
                float(h.get("quantity", 0)) + float(h.get("t1_quantity", 0)),
                float(h["average_price"]), float(h["last_price"]), _float(h.get("close_price")))
        for h in get("/portfolio/holdings")
    ]
    holdings += [
        Holding("mf", h["tradingsymbol"], h.get("fund"), None, h.get("tradingsymbol"),
                float(h["quantity"]), float(h["average_price"]), float(h["last_price"]), None)
        for h in get("/mf/holdings")
    ]
    margins = get("/user/margins")
    cash = _float(margins.get("equity", {}).get("net"))
    return Portfolio([h for h in holdings if h.quantity > 0], cash)


def _float(value) -> float | None:
    return float(value) if value not in (None, "") else None


def _call(request: urllib.request.Request, opener) -> dict | list:
    try:
        with opener(request, timeout=TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode())
        except (ValueError, OSError):
            raise KiteError(f"Kite returned HTTP {e.code}") from e
        if payload.get("error_type") == "TokenException" or e.code == 403:
            raise TokenExpired(payload.get("message", "Session expired; log in again")) from e
        raise KiteError(payload.get("message", f"Kite returned HTTP {e.code}")) from e
    except urllib.error.URLError as e:
        raise KiteError(f"Could not reach Kite: {e.reason}") from e
    if payload.get("status") != "success":
        raise KiteError(payload.get("message", "Unexpected response from Kite"))
    return payload["data"]
