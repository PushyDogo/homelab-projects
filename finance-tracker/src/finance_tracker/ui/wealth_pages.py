"""Deposits (fixed deposits + PPF) and Investments (Zerodha) pages."""

import secrets
import time
from datetime import date

from nicegui import run, ui

from .. import config, fi, keystore, kite
from ..deposits import is_active
from ..ppf import summarise
from . import data
from .components import (
    CHART_GRID, CHART_INK, CHART_TEXT, CORAL, LIME, TEAL, YELLOW,
    button, card, field, frame, money, pill, stat,
)

PNL_SLOT = """
<q-td :props="props" class="text-right font-medium" :class="props.row.pnl >= 0 ? 'ft-income' : 'ft-expense'">
  {{ props.value }}
</q-td>
"""


def _rupees(value: float | None) -> str:
    return money(round(value * 100)) if value is not None else "—"


def _pct(value: float) -> str:
    return f"{'+' if value >= 0 else '−'}{abs(value):.2f}%"


def _short(fd) -> str:
    if fd.number.startswith("booked") or fd.number == "added by hand":
        return "number unknown"   # booked without an "opened" SMS, or added by hand without one
    return "·" + fd.digits[-4:] if fd.digits else fd.number


# --------------------------------------------------------------------------- deposits

BANKS = ["ICICI", "HDFC", "SBI", "IndusInd"]
FD_SLOT = """
<q-td :props="props">
  <span>{{ props.row.number }}</span>
  <span v-if="props.row.source" class="ft-pill ft-pill--transfer" style="margin-left:6px">{{ props.row.source }}</span>
</q-td>
"""


@ui.page("/deposits")
def deposits_page():
    fds = data.fixed_deposits()
    today = date.today()
    active = [fd for fd in fds if is_active(fd, today)]
    inactive = [fd for fd in fds if not is_active(fd, today)]
    settings = config.load()

    with frame("/deposits", "Deposits", "Fixed deposits rebuilt from bank SMS (plus your corrections), and PPF"):
        entries = data.ppf_entries()
        ppf = summarise(entries, today, settings.ppf_rate)
        in_fds = sum(fd.principal or 0 for fd in active)
        unknown = sum(1 for fd in active if fd.principal is None)
        with ui.grid().classes("w-full gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"):
            stat("In fixed deposits", money(in_fds, paise=False),
                 f"{len(active)} active FDs" + (f" · {unknown} with unknown amount" if unknown else ""),
                 "savings", accent="lime")
            stat("PPF balance", money(ppf.balance, paise=False) if ppf else "—",
                 f"+ {money(ppf.accrued_interest, paise=False)} interest due {ppf.credit_on:%d %b}"
                 if ppf else "Add an entry below",
                 "account_balance", accent="yellow")
            stat("Total in deposits", money(in_fds + (ppf.balance if ppf else 0), paise=False),
                 "FDs + PPF", "lock", accent="teal")
            earned = sum(fd.interest or 0 for fd in fds)
            stat("Interest earned", money(earned, paise=False), "From closed FDs and interest payouts",
                 "percent", accent="cream")

        with ui.grid().classes("w-full gap-5 grid-cols-1 lg:grid-cols-3"):
            with ui.column().classes("lg:col-span-2 gap-4"):
                ui.label("Active fixed deposits by bank").classes("ft-display text-lg")
                for bank in BANKS + sorted({fd.bank for fd in active} - set(BANKS)):
                    bank_fds = [fd for fd in active if fd.bank == bank]
                    if not bank_fds:
                        continue
                    with ui.row().classes("w-full items-baseline gap-3 mt-1"):
                        ui.label(bank).classes("ft-display text-base")
                        ui.label(f"{len(bank_fds)} FD{'s' * (len(bank_fds) != 1)}").classes("ft-subtle text-sm")
                        ui.space()
                        ui.label(money(sum(fd.principal or 0 for fd in bank_fds), paise=False)) \
                            .classes("ft-display text-base")
                    _fd_table(bank_fds, closed=False)
            with ui.column().classes("gap-3"):
                ui.label("PPF · ICICI Bank").classes("ft-display text-lg")
                _ppf_panel(settings.ppf_rate)
                ui.label("Add or correct an FD").classes("ft-display text-lg mt-2")
                _fd_corrections(fds)

        ui.label(f"Closed fixed deposits ({len(inactive)})").classes("ft-display text-lg mt-2")
        ui.label("Interest = payout − principal where both are known. IndusInd deposits seen only through "
                 "interest payouts are listed here once they stop paying for four months.").classes("ft-muted text-sm")
        _fd_table(inactive, closed=True)


def _fd_corrections(fds) -> None:
    """Add an FD the bank never sent an SMS for, or correct one (amount, closure)."""
    with card().classes("p-5 gap-3 w-full"):
        ui.label("Banks don't always send an SMS. Add a missing FD, or enter a deposit number to correct that FD "
                 "(e.g. set an unknown amount, or mark it closed).").classes("ft-subtle text-xs")
        with ui.row().classes("w-full gap-2 no-wrap"):
            bank = ui.select(BANKS, value="SBI", label="Bank").props("dense outlined").classes("w-32")
            number = ui.input("Deposit no. (to correct)").props("dense outlined clearable").classes("flex-1")
        with ui.row().classes("w-full gap-2 no-wrap"):
            amount = ui.number("Amount (₹)", min=0, format="%.0f").props("dense outlined").classes("flex-1")
            opened = ui.input("Opened on").props("type=date stack-label dense outlined").classes("flex-1")
        with ui.row().classes("w-full gap-2 no-wrap"):
            closed = ui.input("Closed on (if closed)").props("type=date stack-label dense outlined").classes("flex-1")
            note = ui.input("Note").props("dense outlined").classes("flex-1")

        def save():
            try:
                data.add_fd_adjustment(bank.value, (number.value or "").strip(),
                                       round(amount.value * 100) if amount.value else None,
                                       opened.value, closed.value, note.value)
            except ValueError as e:
                ui.notify(str(e), type="warning")
                return
            ui.navigate.reload()

        button("Save", icon="save", on_click=save)

        corrected = [fd for fd in fds if fd.adjustment_id]
        if corrected:
            ui.label("Your corrections").classes("ft-kicker mt-2")
            with ui.column().classes("w-full gap-0"):
                for fd in corrected:
                    with ui.element("div").classes("ft-row w-full"):
                        with ui.column().classes("gap-0"):
                            ui.label(f"{fd.bank} {_short(fd)} · {money(fd.principal, paise=False) if fd.principal else '—'}") \
                                .classes("text-sm font-medium")
                            if fd.notes:
                                ui.label(fd.notes[-1]).classes("ft-subtle text-xs")
                        ui.button(icon="delete_outline", color=None,
                                  on_click=lambda a=fd.adjustment_id: (data.delete_fd_adjustment(a),
                                                                       ui.navigate.reload())) \
                            .props("flat round dense size=sm")


def _fd_table(fds, closed: bool) -> None:
    columns = [
        {"name": "number", "label": "Deposit", "field": "number", "align": "left"},
        {"name": "principal", "label": "Principal", "field": "principal", "sortable": True, "align": "right",
         ":format": "(v, row) => row.principal_display"},
        {"name": "opened_on", "label": "Opened", "field": "opened_on", "sortable": True, "align": "left"},
    ]
    if closed:
        columns.insert(0, {"name": "bank", "label": "Bank", "field": "bank", "sortable": True, "align": "left"})
        columns += [
            {"name": "closed_on", "label": "Closed", "field": "closed_on", "sortable": True, "align": "left"},
            {"name": "payout", "label": "Payout", "field": "payout", "sortable": True, "align": "right",
             ":format": "(v, row) => row.payout_display"},
        ]
    else:
        columns += [
            {"name": "maturity_on", "label": "Matures", "field": "maturity_on", "sortable": True, "align": "left"},
            {"name": "rate", "label": "Rate", "field": "rate", "align": "right"},
        ]
    columns.append({"name": "interest", "label": "Interest", "field": "interest", "sortable": True, "align": "right",
                    ":format": "(v, row) => row.interest_display"})
    rows = [{
        "id": i, "bank": fd.bank, "number": _short(fd),
        "source": ("added by you" if fd.number == "added by hand" else "corrected") if fd.adjustment_id else "",
        "principal": fd.principal or 0, "principal_display": money(fd.principal, paise=False) if fd.principal else "Unknown",
        "opened_on": str(fd.opened_on or "—"), "closed_on": str(fd.closed_on or "—"),
        "maturity_on": str(fd.maturity_on or "—"), "rate": fd.rate or "—",
        "payout": fd.payout or 0, "payout_display": money(fd.payout, paise=False) if fd.payout else "—",
        "interest": fd.interest or 0, "interest_display": money(fd.interest, paise=False) if fd.interest else "—",
    } for i, fd in enumerate(fds)]
    table = ui.table(columns=columns, rows=rows, row_key="id",
                     pagination={"rowsPerPage": 10 if closed else 0, "sortBy": "closed_on" if closed else "opened_on",
                                 "descending": True}) \
        .props("flat" + ("" if closed else " hide-bottom")).classes("ft-table w-full")
    table.add_slot("body-cell-number", FD_SLOT)


PPF_ENTRY_TYPES = {"balance": "Balance", "deposit": "Deposit", "interest": "Interest"}
PPF_HINTS = {
    "balance": "Opening balance: the passbook balance on a date, e.g. when you start tracking. "
               "Later entries add to it.",
    "deposit": "Deposit by the 5th of a month to earn interest for that month.",
    "interest": "Interest credited: the yearly interest your passbook shows on 31 March.",
}


def _ppf_panel(rate) -> None:
    @ui.refreshable
    def panel():
        today = date.today()
        entries = data.ppf_entries()
        ppf = summarise(entries, today, rate)
        with card().classes("p-5 gap-3 w-full"):
            if ppf:
                fy = f"FY {ppf.credit_on.year - 1}-{str(ppf.credit_on.year)[2:]}"
                with ui.grid().classes("grid-cols-2 gap-3 w-full"):
                    field("Balance (passbook)", money(ppf.balance))
                    field(f"Deposited in {fy}", money(ppf.deposits_this_fy, paise=False))
                    field("Interest earned so far", money(ppf.accrued_interest))
                    field("Credited on", f"{ppf.credit_on:%d %b %Y}")
                ui.label(f"Interest builds up monthly at {ppf.rate}% on each month's balance as of the 5th "
                         f"({ppf.months_counted} month{'s' * (ppf.months_counted != 1)} of {fy} so far), and is "
                         "added to the balance only when credited on 31 March.").classes("ft-subtle text-xs")
                if ppf.assumed_months:
                    ui.label(f"Your first entry is after the year began, so its balance is assumed for the "
                             f"{ppf.assumed_months} earlier month{'s' * (ppf.assumed_months != 1)}. Add this year's "
                             "deposits with their dates for an exact figure.").classes("ft-refund text-xs")
            else:
                ui.label("No PPF entries yet. Start with your passbook's opening balance.").classes("ft-muted text-sm")

            ui.label("Add entry").classes("ft-kicker mt-1")
            entry_type = ui.toggle(PPF_ENTRY_TYPES, value="balance" if not entries else "deposit") \
                .props("no-caps unelevated dense toggle-color=warning toggle-text-color=black")
            hint = ui.label(PPF_HINTS[entry_type.value]).classes("ft-subtle text-xs")
            entry_type.on_value_change(lambda e: hint.set_text(PPF_HINTS[e.value]))
            with ui.row().classes("w-full gap-2 items-center no-wrap"):
                entry_date = ui.input("Date", value=today.isoformat()).props("type=date dense outlined") \
                    .classes("w-40")
                amount = ui.number("Amount (₹)", min=1, format="%.2f").props("dense outlined").classes("flex-1")
            note = ui.input("Note (optional)").props("dense outlined").classes("w-full")

            def add():
                try:
                    data.add_ppf_entry(entry_date.value, entry_type.value, round((amount.value or 0) * 100), note.value)
                except ValueError as e:
                    ui.notify(str(e), type="warning")
                    return
                panel.refresh()

            button("Add", icon="add", on_click=add)

            if entries:
                ui.label("History").classes("ft-kicker mt-2")
                with ui.column().classes("w-full gap-0"):
                    for entry in entries:
                        with ui.element("div").classes("ft-row w-full"):
                            with ui.column().classes("gap-0"):
                                ui.label(f"{PPF_HINTS[entry['entry_type']].split(':')[0] if entry['entry_type'] != 'deposit' else 'Deposit'}"
                                         f" · {entry['entry_date']}") \
                                    .classes("text-sm font-medium")
                                if entry["note"]:
                                    ui.label(entry["note"]).classes("ft-subtle text-xs")
                            with ui.row().classes("items-center gap-1"):
                                ui.label(money(entry["amount_minor"])).classes("text-sm font-bold")
                                ui.button(icon="delete_outline", color=None,
                                          on_click=lambda e=entry["id"]: (data.delete_ppf_entry(e), panel.refresh())) \
                                    .props("flat round dense size=sm")
    panel()


# --------------------------------------------------------------------------- investments

# Login attempts started from this UI, so the callback only accepts our own redirects.
_PENDING_LOGINS: dict[str, float] = {}
LOGIN_TIMEOUT_SECONDS = 600


@ui.page("/investments")
def investments_page():
    credentials = keystore.get_kite_credentials()
    token = keystore.get_kite_access_token() if credentials else None
    snapshot = data.latest_portfolio()

    with frame("/investments", "Investments", "Zerodha holdings via Kite Connect (read-only)"):
        with ui.row().classes("w-full items-center gap-3"):
            if not credentials:
                pass
            elif token:
                refresh_button = button("Refresh from Zerodha", icon="sync")
                refresh_button.on_click(lambda: _refresh(refresh_button))
                ui.label("Connected for today").classes("ft-subtle text-sm")
            else:
                button("Connect Zerodha", icon="link", on_click=lambda: _connect(credentials[0]))
                ui.label("Kite logins last until ~6 AM the next day.").classes("ft-subtle text-sm")
            ui.space()
            if snapshot:
                ui.label(f"Last fetched {snapshot['fetched_at'].replace('T', ' ')}").classes("ft-subtle text-sm")

        if not credentials:
            _setup_card()
        if snapshot:
            _portfolio(snapshot)
        elif credentials:
            with card().classes("p-6 w-full"):
                ui.label("No holdings fetched yet. Connect Zerodha to load your portfolio.").classes("ft-muted")


def _setup_card() -> None:
    with card().classes("p-6 w-full gap-3"):
        ui.label("Set up Zerodha").classes("ft-display text-lg")
        steps = [
            "Create a Kite Connect app at developers.kite.trade (the personal plan is enough; "
            "we only read holdings).",
            "Set its redirect URL to  http://127.0.0.1:8321/zerodha/callback",
            "Run  uv run finance-tracker zerodha setup  and paste the API key and secret. "
            "They're stored in KDE Wallet, never in files.",
            "Reload this page and click Connect Zerodha.",
        ]
        for i, step in enumerate(steps, start=1):
            with ui.row().classes("items-start gap-3 no-wrap"):
                ui.label(str(i)).classes("ft-pill ft-pill--open")
                ui.label(step).classes("text-sm")


def _connect(api_key: str) -> None:
    now = time.time()
    for state, started in list(_PENDING_LOGINS.items()):
        if now - started > LOGIN_TIMEOUT_SECONDS:
            del _PENDING_LOGINS[state]
    state = secrets.token_urlsafe(16)
    _PENDING_LOGINS[state] = now
    ui.navigate.to(kite.login_url(api_key, state))


async def _refresh(trigger) -> None:
    trigger.props("loading")
    try:
        await _fetch_and_store()
    except kite.TokenExpired:
        keystore.clear_kite_access_token()
        ui.notify("Your Zerodha login expired. Connect again.", type="warning")
    except kite.KiteError as e:
        ui.notify(f"Zerodha: {e}", type="negative")
    else:
        ui.navigate.reload()
        return
    trigger.props(remove="loading")


async def _fetch_and_store() -> None:
    api_key, _ = keystore.get_kite_credentials()
    portfolio = await run.io_bound(kite.fetch_portfolio, api_key, keystore.get_kite_access_token())
    data.store_portfolio(portfolio)


@ui.page("/zerodha/callback")
async def zerodha_callback(request_token: str | None = None, status: str | None = None, state: str | None = None):
    with frame("/investments", "Connecting Zerodha…"):
        started = _PENDING_LOGINS.pop(state or "", None)
        credentials = keystore.get_kite_credentials()
        if started is None or time.time() - started > LOGIN_TIMEOUT_SECONDS:
            ui.label("This login link wasn't started from this app (or took too long). "
                     "Go back to Investments and click Connect Zerodha again.").classes("ft-expense")
            return
        if status != "success" or not request_token or not credentials:
            ui.label("Zerodha didn't complete the login.").classes("ft-expense")
            return
        try:
            token = await run.io_bound(kite.create_session, credentials[0], credentials[1], request_token)
            keystore.set_kite_access_token(token)
            await _fetch_and_store()
        except kite.KiteError as e:
            ui.label(f"Zerodha: {e}").classes("ft-expense")
            return
        ui.navigate.to("/investments")


def _portfolio(snapshot: dict) -> None:
    with ui.grid().classes("w-full gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"):
        stat("Current value", _rupees(snapshot["value"]),
             f"{len(snapshot['holdings'])} holdings", "trending_up", accent="lime")
        stat("Invested", _rupees(snapshot["invested"]), "Average cost × quantity", "payments", accent="cream")
        stat("Total P&L", _rupees(snapshot["pnl"]), _pct(snapshot["pnl_pct"]), "show_chart",
             accent="teal" if snapshot["pnl"] >= 0 else "coral")
        stat("Today", _rupees(snapshot["day_change"]),
             f"Cash with broker {_rupees(snapshot['cash'])}", "today", accent="yellow")

    def is_gold_bond(h):
        return h["asset_type"] == "equity" and h["symbol"].upper().startswith("SGB")

    groups = [
        ("Stocks", "equity", [h for h in snapshot["holdings"] if h["asset_type"] == "equity" and not is_gold_bond(h)],
         LIME),
        ("Sovereign Gold Bonds", "sgb", [h for h in snapshot["holdings"] if is_gold_bond(h)], CORAL),
        ("Mutual funds", "mf", [h for h in snapshot["holdings"] if h["asset_type"] == "mf"], YELLOW),
    ]
    groups = [g for g in groups if g[2]]
    with ui.grid().classes("w-full gap-5 grid-cols-1 lg:grid-cols-3"):
        with ui.column().classes("lg:col-span-2 gap-3"):
            ui.label("Split").classes("ft-display text-lg")
            with ui.grid().classes(f"w-full gap-5 grid-cols-1 sm:grid-cols-{min(len(groups), 3)}"):
                for title, _, holdings, _ in groups:
                    _group_summary(title, holdings, snapshot["value"])
        with ui.column().classes("gap-3"):
            ui.label("Allocation").classes("ft-display text-lg")
            with card().classes("p-4 w-full"):
                slices = [{"name": title, "value": round(sum(h["value"] for h in holdings)),
                           "itemStyle": {"color": colour}} for title, _, holdings, colour in groups]
                if snapshot["cash"]:
                    slices.append({"name": "Cash with broker", "value": round(snapshot["cash"]),
                                   "itemStyle": {"color": TEAL}})
                ui.echart({
                    "animation": False, "backgroundColor": "transparent",
                    "tooltip": {"trigger": "item", ":valueFormatter": "v => '₹' + v.toLocaleString('en-IN')"},
                    "legend": {"bottom": 0, "textStyle": {":color": CHART_TEXT, "fontWeight": "bold"}},
                    "series": [{"type": "pie", "radius": ["45%", "72%"], "center": ["50%", "44%"],
                                "itemStyle": {":borderColor": CHART_INK, "borderWidth": 2},
                                "label": {"show": False}, "data": slices}],
                }).classes("w-full h-64")

    for title, _, holdings, _ in groups:
        if holdings:
            ui.label(f"{title} ({len(holdings)})").classes("ft-display text-lg mt-2")
            _holdings_table(holdings)


def _group_summary(title: str, holdings: list[dict], total_value: float) -> None:
    value = sum(h["value"] for h in holdings)
    invested = sum(h["invested"] for h in holdings)
    pnl = value - invested
    with card().classes("p-5 gap-2 w-full"):
        with ui.row().classes("w-full items-center"):
            ui.label(title).classes("ft-kicker")
            ui.space()
            pill(f"{value / total_value * 100:.0f}% of portfolio" if total_value else "—", "neutral")
        ui.label(_rupees_whole(value)).classes("ft-big ft-big--sm")
        with ui.grid().classes("grid-cols-2 gap-3"):
            field("Invested", _rupees_whole(invested))
            with ui.column().classes("gap-0"):
                ui.label("P&L").classes("ft-kicker")
                ui.label(f"{_rupees_whole(pnl)} ({_pct(pnl / invested * 100 if invested else 0)})") \
                    .classes("text-sm font-bold " + ("ft-income" if pnl >= 0 else "ft-expense"))
            field("Holdings", str(len(holdings)))
            field("Today", _rupees_whole(sum(h["day_change"] for h in holdings)) if title == "Stocks" else "—")


def _holdings_table(holdings: list[dict]) -> None:
    price = "v => '₹' + v.toLocaleString('en-IN', {maximumFractionDigits: 2})"
    columns = [
        {"name": "symbol", "label": "Holding", "field": "symbol", "sortable": True, "align": "left",
         "classes": "max-w-sm truncate"},
        {"name": "quantity", "label": "Qty", "field": "quantity", "sortable": True, "align": "right"},
        {"name": "average_price", "label": "Avg", "field": "average_price", "sortable": True, "align": "right",
         ":format": price},
        {"name": "last_price", "label": "LTP", "field": "last_price", "sortable": True, "align": "right",
         ":format": price},
        {"name": "invested", "label": "Invested", "field": "invested", "sortable": True, "align": "right",
         ":format": "v => '₹' + Math.round(v).toLocaleString('en-IN')"},
        {"name": "value", "label": "Value", "field": "value", "sortable": True, "align": "right",
         ":format": "v => '₹' + Math.round(v).toLocaleString('en-IN')"},
        {"name": "pnl", "label": "P&L", "field": "pnl_label", "sortable": True, "align": "right",
         ":sort": "(a, b, rowA, rowB) => rowA.pnl - rowB.pnl"},
    ]
    rows = [{
        "id": i, "symbol": h["name"] or h["symbol"], "quantity": round(h["quantity"], 3),
        "average_price": h["average_price"], "last_price": h["last_price"], "invested": h["invested"],
        "value": h["value"], "pnl": h["pnl"],
        # No % when the average cost is zero (e.g. bonus shares).
        "pnl_label": _rupees(h["pnl"]) + (f" ({_pct(h['pnl_pct'])})" if h["invested"] else ""),
    } for i, h in enumerate(holdings)]
    table = ui.table(columns=columns, rows=rows, row_key="id",
                     pagination={"rowsPerPage": 0, "sortBy": "value", "descending": True}) \
        .props("flat hide-bottom").classes("ft-table w-full")
    table.add_slot("body-cell-pnl", PNL_SLOT)


# --------------------------------------------------------------------------- net worth

NET_WORTH_PARTS = [("bank", "Bank accounts", "cream"), ("fds", "Fixed deposits", "yellow"),
                   ("ppf", "PPF", "teal"), ("investments", "Investments", "cobalt")]

FI_DEFAULTS = {"monthly_payout": 100000, "inflation": 6.0, "years": 30, "annual_return": 7.0, "start_in_years": 0}


@ui.page("/net-worth")
def net_worth_page():
    history = data.net_worth_history(months=2)
    now, previous = history[-1], history[0]

    with frame("/net-worth", "Net worth", "Everything you own across banks, deposits and investments"):
        with ui.element("div").classes("ft-block ft-block--lime p-6 flex flex-col gap-1 w-full"):
            ui.label("Net worth today").classes("ft-kicker")
            ui.label(money(now.total, paise=False)).classes("ft-display text-5xl")
            # Investments are only known from the first Zerodha snapshot onwards; don't count
            # their first appearance as growth.
            comparable = previous.has_investments or not now.has_investments
            change = now.total - previous.total - (0 if comparable else now.investments)
            ui.label(f"{'+' if change >= 0 else '−'}{money(abs(change), paise=False)} since "
                     f"{previous.as_of:%d %b %Y}" + ("" if comparable else " (excluding investments, first "
                                                          "tracked this month)")).classes("text-sm font-bold")

        with ui.grid().classes("w-full gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"):
            for key, label, accent in NET_WORTH_PARTS:
                value = getattr(now, key)
                percent = value / now.total * 100 if now.total else 0
                share = ("<1%" if 0 < percent < 1 else f"{percent:.0f}%") + " of net worth"
                stat(label, money(value, paise=False), share, accent=accent)

        _fi_calculator(now.total / 100)

        with card().classes("p-5 w-full gap-2"):
            ui.label("How net worth is calculated").classes("ft-display text-lg")
            notes = [
                "Bank: the latest balance each bank reported by SMS. IndusInd alerts rarely include a balance, "
                "so its figure can lag behind transfers out of it.",
                "Fixed deposits: principal of open FDs (interest is counted when paid out). "
                "Deposits with no stated amount are left out.",
                "PPF: your passbook balance from the Deposits tab (interest counts once credited on 31 March).",
                "Investments: the latest Zerodha snapshot, including cash with the broker.",
                "Credit cards aren't subtracted: purchases already count as spending when they happen.",
            ]
            for note in notes:
                with ui.row().classes("items-start gap-2 no-wrap"):
                    ui.icon("arrow_right", size="xs")
                    ui.label(note).classes("text-sm")


def _fi_calculator(net_worth: float) -> None:
    """How big a corpus funds an inflation-adjusted monthly payout for N years. Inputs are saved."""
    saved = {**FI_DEFAULTS, **(data.get_setting("fi_plan", {}) or {})}

    with card().classes("p-6 w-full gap-4"):
        ui.label("Financial independence calculator").classes("ft-display text-xl")
        ui.label("How much you need in your accounts to draw a monthly amount, rising with inflation, "
                 "for a number of years.").classes("ft-muted text-sm")
        with ui.grid().classes("w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"):
            inputs = {
                "monthly_payout": ui.number("Monthly payout (₹, today's money)", value=saved["monthly_payout"],
                                            min=0, step=5000, format="%.0f"),
                "inflation": ui.number("Inflation (% a year)", value=saved["inflation"], min=0, max=30, step=0.5),
                "years": ui.number("Payout for (years)", value=saved["years"], min=1, max=80, step=1, format="%.0f"),
                "annual_return": ui.number("Return on savings (% a year)", value=saved["annual_return"],
                                           min=0, max=30, step=0.5),
                "start_in_years": ui.number("Payouts start in (years)", value=saved["start_in_years"],
                                            min=0, max=60, step=1, format="%.0f"),
            }
            for field_input in inputs.values():
                field_input.props("outlined dense").classes("w-full")

        @ui.refreshable
        def results():
            values = {key: (field_input.value or 0) for key, field_input in inputs.items()}
            plan = fi.Plan(monthly_payout=float(values["monthly_payout"]), inflation=float(values["inflation"]),
                           years=int(values["years"]), annual_return=float(values["annual_return"]),
                           start_in_years=int(values["start_in_years"]))
            result = fi.calculate(plan)
            start_year = date.today().year + plan.start_in_years

            with ui.grid().classes("w-full gap-5 grid-cols-1 lg:grid-cols-3"):
                with ui.column().classes("gap-4"):
                    with ui.element("div").classes("ft-block ft-block--yellow p-5 flex flex-col gap-1 w-full"):
                        ui.label("You need").classes("ft-kicker")
                        ui.label(_rupees_whole(result.corpus)).classes("ft-big")
                        ui.label("when payouts start" + (f" in {start_year}" if plan.start_in_years else " (now)")) \
                            .classes("ft-subtle text-xs")
                        if plan.start_in_years:
                            ui.label(f"≈ {_rupees_whole(result.corpus_in_todays_money)} in today's money") \
                                .classes("text-sm font-bold")
                    # Compare like with like: today's savings vs what's needed today (the future corpus
                    # discounted at the expected return, since today's money also grows until then).
                    covered = net_worth / result.needed_today * 100 if result.needed_today else 0
                    with card().classes("p-5 gap-2 w-full"):
                        ui.label("Your net worth covers").classes("ft-kicker")
                        ui.label(f"{min(covered, 999):.0f}%").classes("ft-big")
                        ui.linear_progress(value=min(covered / 100, 1), show_value=False, size="14px") \
                            .props("rounded color=positive track-color=grey-4").classes("ft-progress")
                        gap = result.needed_today - net_worth
                        ui.label(f"{_rupees_whole(gap)} still to go" if gap > 0 else "Already covered") \
                            .classes("ft-subtle text-xs")
                        if plan.start_in_years:
                            ui.label(f"Compared with {_rupees_whole(result.needed_today)} needed today, which grows "
                                     f"to the target by {start_year} at {plan.annual_return:g}% a year.") \
                                .classes("ft-subtle text-xs")
                    with card().classes("p-5 gap-3 w-full"):
                        with ui.grid().classes("grid-cols-2 gap-3"):
                            field("First monthly payout", _rupees_whole(result.first_monthly))
                            field("Last monthly payout", _rupees_whole(result.last_monthly))
                            field("Total paid out", _rupees_whole(result.total_paid))
                            field("Payout years", f"{start_year}–{start_year + plan.years - 1}")
                with card().classes("p-5 lg:col-span-2 gap-2"):
                    ui.label("Your savings as you draw them down").classes("ft-display text-lg")
                    ui.label("Balance at the start of each year; it reaches zero after the last payout") \
                        .classes("ft-subtle text-xs")
                    years = [str(start_year + i) for i in range(len(result.yearly_balance))]
                    ui.echart({
                        "animation": False, "backgroundColor": "transparent",
                        "textStyle": {":color": CHART_TEXT},
                        "tooltip": {"trigger": "axis",
                                    ":valueFormatter": "v => '₹' + Math.round(v).toLocaleString('en-IN')"},
                        "grid": {"left": 64, "right": 16, "top": 16, "bottom": 28},
                        "xAxis": {"type": "category", "data": years, "boundaryGap": False,
                                  "axisLabel": {":color": CHART_TEXT, "fontWeight": "bold"},
                                  "axisLine": {"lineStyle": {":color": CHART_INK, "width": 2}}},
                        "yAxis": {"type": "value", "splitLine": {"lineStyle": {":color": CHART_GRID}},
                                  "axisLabel": {":color": CHART_TEXT, ":formatter":
                                                "v => v >= 1e7 ? '₹' + +(v / 1e7).toFixed(1) + 'Cr' "
                                                ": '₹' + +(v / 1e5).toFixed(0) + 'L'"}},
                        "series": [{"name": "Savings", "type": "line", "color": CORAL, "symbol": "none",
                                    "lineStyle": {"width": 3, ":color": CHART_INK},
                                    "areaStyle": {"color": LIME, "opacity": 0.9},
                                    "data": [round(b) for b in result.yearly_balance]}],
                    }).classes("w-full h-80")

        def changed():
            data.set_setting("fi_plan", {key: field_input.value for key, field_input in inputs.items()})
            results.refresh()

        for field_input in inputs.values():
            field_input.on_value_change(changed)
        results()


def _rupees_whole(value: float) -> str:
    return money(round(value * 100), paise=False)
