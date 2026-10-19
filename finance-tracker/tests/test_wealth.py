"""Deposits, PPF, Kite client and investment snapshot tests (synthetic data only)."""

import io
import json
import urllib.error
from datetime import date
from decimal import Decimal

import pytest

from finance_tracker import db, deposits, investments, kite, ppf

# --- fixed deposits ---------------------------------------------------------------

MESSAGES = [
    ("2023-12-23T10:00:00", "Dear Customer, your ICICI BANK Deposit Acct XX5733 for Rs.400000.00 has been opened on "
                            "23-Dec-23. The deposit advice will be updated on Net Banking within 1 wkg day."),
    ("2025-03-23T10:00:00", "ICICI Bank Account XX175 credited:Rs. 4,33,884.00 on 23-Mar-25. Info 252213005733 FD clos "
                            "23-03-2. Available Balance is Rs. 20,69,987.13."),
    ("2026-06-26T10:00:00", "Dear Customer, your ICICI BANK Deposit Acct XX8324 for Rs.2500000.00 has been opened on "
                            "26-Jun-26. The deposit advice will be updated."),
    ("2024-06-29T10:00:00", "UPDATE: INR 6,00,000.00 debited from HDFC Bank XX6981 on 29-JUN-24. Info: FD through "
                            "NET-XXXXXXXXXX0087:JANE DOE. Avl bal:INR 63,780.20"),
    ("2026-01-26T10:00:00", "Update! INR 64,480.00 deposited in HDFC Bank A/c XX6981 on 26-JAN-26 for int. "
                            "auto_redemption  XXXXXXXXXX0087.Avl bal INR 2,37,523.30."),
    ("2026-01-26T10:01:00", "Update! INR 6,00,000.00 deposited in HDFC Bank A/c XX6981 on 26-JAN-26 for Prin and Int "
                            "auto redeem XXXXXXXXXX0087.Avl bal INR 8,37,523.30."),
    ("2025-03-09T10:00:00", "Dear Customer, TDR/STDR No XXXXX763836 for INR 14,00,000.00 has been created on 09/03/25."),
    ("2026-05-22T10:00:00", "Your TDR/STDR no. XXXXX763836 dated 09/03/25 maturing on 27/05/26. Please give "
                            "instructions.-SBI"),
    ("2026-05-27T10:00:00", "Dear Customer, Your A/C XXXXX763836 has a debit by transfer of Rs 15,15,583.00 on "
                            "27/05/26. Avl Bal Rs 0.00.-SBI"),
    # A savings account drained to zero is not a deposit closure.
    ("2026-05-28T10:00:00", "Dear Customer, Your A/C XXXXX596354 has a debit by transfer of Rs 100.00 on "
                            "28/05/26. Avl Bal Rs 0.00.-SBI"),
    ("2024-11-23T10:00:00", "Congrats! Your IndusInd FD 301***170862 has been booked successfully."),
    ("2026-05-24T10:00:00", "Your FD 301***170862 for INR 779,451.00 has been renewed for 18 Months  @ 7% from "
                            "24/05/26. Call 18602677777 for assistance - IndusInd Bank"),
    ("2026-06-30T10:00:00", "Net interest INR 4,500.00 paid on your IndusInd Deposit No 301***170862 on 30/06/26. "
                            "Call 18602677777 for assistance - IndusInd Bank"),
    ("2025-01-31T10:00:00", "Net interest INR 1,000.00 paid on your IndusInd Deposit No 300***035694 on 31/01/25."),
]


def by_number(fds):
    return {fd.digits[-4:]: fd for fd in fds}


def test_fixed_deposits_are_rebuilt_per_bank():
    fds = by_number(deposits.build(MESSAGES))

    icici_closed = fds["5733"]
    assert (icici_closed.principal, icici_closed.payout, icici_closed.interest) == (40000000, 43388400, 3388400)
    assert icici_closed.closed_on == date(2025, 3, 23)
    assert fds["8324"].principal == 250000000 and not fds["8324"].is_closed

    hdfc = fds["0087"]
    assert hdfc.principal == 60000000 and hdfc.payout == 66448000 and hdfc.interest == 6448000

    sbi = fds["3836"]
    assert sbi.maturity_on == date(2026, 5, 27) and sbi.payout == 151558300 and sbi.interest == 11558300
    assert "6354" not in fds

    indus = fds["0862"]
    assert (indus.principal, indus.rate, indus.interest_paid) == (77945100, "7%", 450000)


def test_icici_booking_without_opened_sms_is_still_an_fd():
    booked = ("2025-12-03T10:00:00", "ICICI Bank Acc XX175 debited Rs. 10,00,000.00 on 03-Dec-25 InfoTRF TO FD no.."
                                     "Avl Bal Rs. 7,75,097.16.To dispute call 18002662")
    announced = ("2026-06-26T10:00:00", "ICICI Bank Acc XX175 debited Rs. 25,00,000.00 on 26-Jun-26 InfoTRF TO FD "
                                        "no..Avl Bal Rs. 6,63,557.98.")
    fds = deposits.build(MESSAGES + [booked, announced])
    extra = [fd for fd in fds if fd.number.startswith("booked")]
    assert [(fd.principal, fd.opened_on) for fd in extra] == [(100000000, date(2025, 12, 3))]   # 8324 is announced

    closure = ("2026-12-03T10:00:00", "ICICI Bank Account XX175 credited:Rs. 10,72,000.00 on 03-Dec-26. Info "
                                      "252213009999 FD clos 03-12-2. Available Balance is Rs. 1.")
    fd = next(fd for fd in deposits.build(MESSAGES + [booked, closure]) if fd.principal == 100000000)
    assert fd.closed_on == date(2026, 12, 3) and fd.interest == 7200000


def test_interest_only_deposits_go_inactive_after_four_months():
    fds = by_number(deposits.build(MESSAGES))
    today = date(2026, 9, 23)
    assert deposits.is_active(fds["0862"], today)
    assert not deposits.is_active(fds["5694"], today)


# --- PPF -----------------------------------------------------------------------------

def test_ppf_interest_uses_balance_on_the_fifth_and_credits_on_31_march():
    entries = [
        {"entry_date": "2026-03-31", "entry_type": "balance", "amount_minor": 1_000_000_00},
        {"entry_date": "2026-05-05", "entry_type": "deposit", "amount_minor": 50_000_00},   # counts for May
        {"entry_date": "2026-06-06", "entry_type": "deposit", "amount_minor": 50_000_00},   # counts from July
    ]
    summary = ppf.summarise(entries, date(2026, 7, 20), Decimal("7.2"))
    monthly = lambda balance: Decimal(balance) * Decimal("7.2") / 100 / 12
    expected = monthly(1_000_000_00) + monthly(1_050_000_00) * 2 + monthly(1_100_000_00)   # Apr, May, Jun, Jul
    assert summary.months_counted == 4
    assert summary.accrued_interest == int(expected)
    assert summary.balance == 1_100_000_00          # interest isn't added until it's credited
    assert summary.credit_on == date(2027, 3, 31)
    assert summary.deposits_this_fy == 1_00_000_00


def test_ppf_current_month_counts_only_after_the_fifth():
    entries = [{"entry_date": "2026-03-31", "entry_type": "balance", "amount_minor": 1_200_00}]
    assert ppf.summarise(entries, date(2026, 4, 4)).months_counted == 0
    assert ppf.summarise(entries, date(2026, 4, 5)).months_counted == 1


def test_ppf_interest_credit_adds_to_balance():
    entries = [
        {"entry_date": "2025-04-01", "entry_type": "balance", "amount_minor": 10_000_00},
        {"entry_date": "2026-03-31", "entry_type": "interest", "amount_minor": 710_00},
    ]
    summary = ppf.summarise(entries, date(2026, 4, 10))
    assert summary.balance == 10_710_00
    assert summary.last_interest["amount_minor"] == 710_00
    assert summary.deposits_this_fy == 0


def test_financial_year_start():
    assert ppf.financial_year_start(date(2026, 3, 31)) == date(2025, 4, 1)
    assert ppf.financial_year_start(date(2026, 4, 1)) == date(2026, 4, 1)


# --- Kite client ---------------------------------------------------------------------

class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_opener(routes, seen=None):
    def opener(request, timeout):
        path = request.full_url.removeprefix(kite.API_ROOT)
        if seen is not None:
            seen.append(request)
        status, payload = routes[path]
        body = json.dumps(payload).encode()
        if status != 200:
            raise urllib.error.HTTPError(request.full_url, status, "err", {}, io.BytesIO(body))
        return FakeResponse(body)
    return opener


def test_login_url_carries_api_key_and_state():
    url = kite.login_url("key123", "abc")
    assert url.startswith("https://kite.zerodha.com/connect/login?")
    assert "api_key=key123" in url and "redirect_params=state%3Dabc" in url


def test_create_session_sends_checksum():
    seen = []
    opener = fake_opener({"/session/token": (200, {"status": "success", "data": {"access_token": "tok"}})}, seen)
    assert kite.create_session("key", "secret", "req", opener=opener) == "tok"
    body = seen[0].data.decode()
    assert f"checksum={kite.checksum('key', 'req', 'secret')}" in body
    assert "secret" not in body.replace(kite.checksum("key", "req", "secret"), "")


def test_fetch_portfolio_parses_holdings_and_cash():
    seen = []
    opener = fake_opener({
        "/portfolio/holdings": (200, {"status": "success", "data": [
            {"tradingsymbol": "COALINDIA", "exchange": "NSE", "isin": "INE522F01014", "quantity": 10,
             "t1_quantity": 2, "average_price": 300.0, "last_price": 400.0, "close_price": 390.0},
            {"tradingsymbol": "SOLD", "exchange": "NSE", "quantity": 0, "average_price": 1, "last_price": 1},
        ]}),
        "/mf/holdings": (200, {"status": "success", "data": [
            {"tradingsymbol": "INF179KC1BS5", "fund": "EXAMPLE NIFTY INDEX FUND", "quantity": 12.5,
             "average_price": 100.0, "last_price": 120.0},
        ]}),
        "/user/margins": (200, {"status": "success", "data": {"equity": {"net": 8.89}}}),
    }, seen)
    portfolio = kite.fetch_portfolio("key", "tok", opener=opener)
    assert [h.symbol for h in portfolio.holdings] == ["COALINDIA", "INF179KC1BS5"]
    assert portfolio.holdings[0].quantity == 12
    assert portfolio.cash == 8.89
    assert all(r.get_header("Authorization") == "token key:tok" for r in seen)
    assert all(r.get_method() == "GET" for r in seen)


def test_expired_token_is_reported():
    opener = fake_opener({"/portfolio/holdings": (403, {"status": "error", "error_type": "TokenException",
                                                        "message": "Incorrect api_key or access_token."})})
    with pytest.raises(kite.TokenExpired):
        kite.fetch_portfolio("key", "tok", opener=opener)


# --- investment snapshots ------------------------------------------------------------

def test_snapshot_round_trip(tmp_path):
    conn = db.connect(tmp_path / "t.db", "ab" * 32)
    portfolio = kite.Portfolio([
        kite.Holding("equity", "COALINDIA", None, "NSE", "INE522F01014", 10, 300.0, 400.0, 390.0),
        kite.Holding("mf", "INF179KC1BS5", "EXAMPLE FUND", None, None, 10, 100.0, 90.0, None),
    ], cash=500.0)
    investments.store_snapshot(conn, "zerodha", portfolio)
    snap = investments.latest_snapshot(conn, "zerodha")
    assert snap["value"] == 4900.0 and snap["invested"] == 4000.0 and snap["pnl"] == 900.0
    assert snap["day_change"] == 100.0 and snap["cash"] == 500.0
    assert snap["holdings"][0]["symbol"] == "COALINDIA"
    assert investments.latest_snapshot(conn, "other") is None


def test_ppf_opening_balance_mid_year_is_assumed_for_earlier_months():
    entries = [{"entry_date": "2026-09-23", "entry_type": "balance", "amount_minor": 70_000_00}]
    summary = ppf.summarise(entries, date(2026, 9, 23), Decimal("7.2"))
    # Apr–Sep: every 5th falls before the 23 Sep entry, so all six months use the assumed balance.
    assert summary.months_counted == 6 and summary.assumed_months == 6
    assert summary.accrued_interest == int(Decimal(70_000_00) * Decimal("7.2") / 100 / 12 * 6)


def test_ppf_deposit_on_the_same_day_as_the_balance_adds_to_it():
    entries = [
        {"id": 1, "entry_date": "2026-09-23", "entry_type": "balance", "amount_minor": 70_000_00},
        {"id": 2, "entry_date": "2026-09-23", "entry_type": "deposit", "amount_minor": 10_000_00},
    ]
    assert ppf.summarise(entries, date(2026, 9, 23)).balance == 80_000_00
    # A deposit recorded before the balance entry is taken to be included in it.
    entries[1]["id"] = 0
    assert ppf.summarise(entries, date(2026, 9, 23)).balance == 70_000_00


def test_ppf_opening_balance_is_found_even_if_a_same_day_deposit_is_listed_first():
    entries = [
        {"id": 2, "entry_date": "2026-09-23", "entry_type": "deposit", "amount_minor": 10_000_00},
        {"id": 1, "entry_date": "2026-09-23", "entry_type": "balance", "amount_minor": 70_000_00},
    ]
    summary = ppf.summarise(entries, date(2026, 9, 23), Decimal("7.2"))
    assert summary.assumed_months == 6
    assert summary.accrued_interest == int(Decimal(70_000_00) * Decimal("7.2") / 100 / 12 * 6)


def test_fd_corrections_fill_in_and_add_deposits():
    fds = deposits.build(MESSAGES + [
        ("2025-02-25T10:00:00", "Congrats! Your IndusInd FD 301***373769 has been booked successfully."),
    ])
    corrected = deposits.apply_adjustments(fds, [
        {"id": 1, "bank": "IndusInd", "number": "373769", "principal_minor": 150000_00, "note": "Tax saver"},
        {"id": 2, "bank": "SBI", "number": None, "principal_minor": 2500000_00, "opened_on": "2026-06-06",
         "note": "No SMS from SBI"},
        {"id": 3, "bank": "ICICI", "number": "8324", "closed_on": "2026-09-01"},
    ])
    by = by_number(corrected)
    assert by["3769"].principal == 150000_00 and by["3769"].adjustment_id == 1
    added = next(fd for fd in corrected if fd.adjustment_id == 2)
    assert (added.bank, added.principal, added.opened_on) == ("SBI", 2500000_00, date(2026, 6, 6))
    assert by["8324"].closed_on == date(2026, 9, 1) and by["8324"].principal == 250000000
    assert len(corrected) == len(fds) + 1
