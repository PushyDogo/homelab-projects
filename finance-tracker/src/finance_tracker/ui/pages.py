"""UI pages. Everything here is read-only.

Spend and income exclude transfers (card bill payments, FDs, investments), so
card purchases are counted once, when they happen.
"""

import calendar
from datetime import date
from urllib.parse import urlencode

from nicegui import ui

from . import data
from .components import (
    BLUE, CHART_GRID, CHART_INK, CHART_TEXT, COBALT, CORAL, KIND_LABELS, LIME, PURPLE, TEAL, YELLOW,
    card, date_range, field, frame, money, pill, rule_label, stat,
)

SPEND_COLOR = CORAL
INCOME_COLOR = LIME

KIND_SLOT = """
<q-td :props="props"><span :class="'ft-pill ft-pill--' + props.row.kind">{{ props.row.kind_label }}</span></q-td>
"""
AMOUNT_SLOT = """
<q-td :props="props" class="text-right font-medium" :class="'ft-amount--' + props.row.kind">
  {{ props.row.amount_display }}
</q-td>
"""
STATUS_SLOT = """
<q-td :props="props"><span :class="'ft-pill ft-pill--' + props.value">{{ props.value }}</span></q-td>
"""

# Axis labels in Indian short form: 250000 -> ₹2.5L.
INR_SHORT = ("v => v >= 1e7 ? '₹' + +(v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? '₹' + +(v / 1e5).toFixed(1) + 'L'"
             " : v >= 1e3 ? '₹' + +(v / 1e3).toFixed(0) + 'k' : '₹' + v")


def _signed(row: dict) -> str:
    sign = "+" if row["direction"] == "credit" else "−"
    return sign + money(row["amount_minor"], row["currency"])


# --------------------------------------------------------------------------- overview

@ui.page("/")
def overview_page():
    stats = data.overview()
    accounts = data.accounts()
    bank_accounts = [a for a in accounts
                     if a["account_type"] == "bank" and not a["is_deposit"] and a["balance"] is not None]

    with frame("/", "Overview", "Spending and income exclude transfers between your own accounts"):
        with ui.grid().classes("w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"):
            balance = sum(a["balance"] for a in bank_accounts)
            banks = ", ".join(sorted({a["bank"] for a in bank_accounts}))
            stat("Bank balance", money(balance, paise=False) if bank_accounts else "—",
                 f"{banks} · latest SMS balance of each" if bank_accounts else "No balance reported yet",
                 "account_balance", accent="lime")
            stat("Spent this month", money(stats["month_spend"], paise=False),
                 "Expenses minus refunds", "shopping_bag", accent="coral")
            stat("Income this month", money(stats["month_income"], paise=False),
                 "Salary, dividends, other credits", "payments", accent="teal")
            saved = stats["month_income"] - stats["month_spend"]
            stat("Saved this month", money(saved, paise=False), _average_spend_caption(stats["spend"]), "savings",
                 accent="yellow")

        with ui.grid().classes("w-full gap-4 grid-cols-1 lg:grid-cols-3"):
            with card().classes("p-5 lg:col-span-2 gap-2"):
                ui.label("Spending vs income").classes("ft-display text-lg")
                ui.label("Last 12 months, INR, spending by expense category. Click a bar to see its "
                         "transactions.").classes("ft-subtle text-xs")
                _monthly_chart(stats)
            with card().classes("p-5 gap-2"):
                ui.label("Top expenses this month").classes("ft-display text-lg")
                ui.label("Grouped by merchant/payee as shown in SMS").classes("ft-subtle text-xs")
                if not stats["top_expenses"]:
                    ui.label("No expenses yet this month.").classes("ft-muted text-sm mt-4")
                with ui.column().classes("w-full gap-0 mt-1"):
                    for row in stats["top_expenses"]:
                        with ui.element("div").classes("ft-row w-full"):
                            with ui.column().classes("gap-0 min-w-0"):
                                ui.label(row["counterparty"]).classes("text-sm truncate max-w-[16rem]")
                                ui.label(f"{row['count']} transaction{'s' * (row['count'] != 1)}") \
                                    .classes("ft-subtle text-xs")
                            ui.label(money(row["total"], paise=False)).classes("text-sm font-semibold")

        with ui.grid().classes("w-full gap-4 grid-cols-1 lg:grid-cols-3"):
            with card().classes("p-5 lg:col-span-2 gap-2"):
                ui.label("Transfers").classes("ft-display text-lg")
                ui.label("Money moved between your own accounts and assets. Not counted as spending or income.") \
                    .classes("ft-subtle text-xs")
                with ui.column().classes("w-full gap-0 mt-1"):
                    _fd_rows()
                    for row in stats["transfers"]:
                        with ui.element("div").classes("ft-row w-full"):
                            with ui.column().classes("gap-0"):
                                ui.label(rule_label(row["rule"])).classes("text-sm")
                                ui.label(f"{row['count']} transfers · {money(row['this_month'], paise=False)} this month") \
                                    .classes("ft-subtle text-xs")
                            ui.label(money(row["total"], paise=False)).classes("text-sm font-semibold ft-transfer")
            _data_health(stats)


def _fd_rows() -> None:
    """FDs active and closed, from the same FD records as the Deposits tab."""
    from ..deposits import is_active

    fds = data.fixed_deposits()
    active = [fd for fd in fds if is_active(fd, date.today())]
    closed = [fd for fd in fds if fd.is_closed]
    unknown = sum(1 for fd in active if fd.principal is None)
    rows = [
        ("FDs active", f"{len(active)} deposits" + (f" · {unknown} with unknown amount" if unknown else ""),
         sum(fd.principal or 0 for fd in active), "principal"),
        ("FDs closed", f"{len(closed)} deposits · {money(sum(fd.interest or 0 for fd in closed), paise=False)} "
                       "interest earned", sum(fd.payout or 0 for fd in closed), "paid out"),
    ]
    for title, caption, amount, what in rows:
        with ui.link(target="/deposits").classes("ft-row w-full no-underline text-inherit"):
            with ui.column().classes("gap-0"):
                ui.label(title).classes("text-sm")
                ui.label(caption).classes("ft-subtle text-xs")
            with ui.column().classes("gap-0 items-end"):
                ui.label(money(amount, paise=False)).classes("text-sm font-semibold ft-transfer")
                ui.label(what).classes("ft-subtle text-xs")


def _average_spend_caption(spend) -> str:
    """Average spend over the last six complete months."""
    current = date.today().strftime("%Y-%m")
    totals = {m: sum(parts.values()) for m, parts in spend.items() if m < current}
    recent = sorted(totals)[-6:]
    if not recent:
        return "Income minus spend"
    average = sum(totals[m] for m in recent) // len(recent)
    return f"Avg spend {money(average, paise=False)}/month (last {len(recent)} months)"


# Spending is stacked by expense category (Budgets tab); "Other" keeps the spend colour.
GROUP_COLORS = [YELLOW, PURPLE, TEAL, COBALT, "#ec4899", "#f97316", BLUE, "#94a3b8"]
BAR_STYLE = {":borderColor": CHART_INK, "borderWidth": 1.5}


def group_color(position: int) -> str:
    return GROUP_COLORS[position % len(GROUP_COLORS)]


def last_months(today: date, count: int = 12) -> list[str]:
    """The last `count` months as 'YYYY-MM', oldest first, ending with the current month."""
    year, month = today.year, today.month
    months = []
    for _ in range(count):
        months.append(f"{year:04d}-{month:02d}")
        year, month = (year, month - 1) if month > 1 else (year - 1, 12)
    return months[::-1]


def month_label(month: str) -> str:
    """'2025-10' -> "Oct '25"."""
    return date.fromisoformat(month + "-01").strftime("%b '%y")


def _monthly_chart(stats) -> None:
    """Last 12 months, every month labelled. No zoom, so scrolling over it scrolls the page."""
    months = last_months(date.today())
    spend, income = stats["spend"], stats["income"]
    # Expense categories keep their Budgets-tab colour; rule categories (e.g. Tax) take the next ones.
    named = stats["group_names"]
    extra = [label for label in stats["spend_labels"] if label not in named]

    def color(label: str) -> str:
        if label == "Other":
            return SPEND_COLOR
        return group_color(named.index(label) if label in named else len(named) + extra.index(label))

    spend_series = [
        {"name": label, "type": "bar", "stack": "spend", "barMaxWidth": 22, "itemStyle": BAR_STYLE,
         "color": color(label), "data": [round(spend.get(m, {}).get(label, 0) / 100) for m in months]}
        for label in stats["spend_labels"]
    ]

    def open_transactions(e) -> None:
        month = months[e.data_index]
        year, number = map(int, month.split("-"))
        params = {"date_from": f"{month}-01", "date_to": f"{month}-{calendar.monthrange(year, number)[1]:02d}"}
        params.update({"kind": "income"} if e.series_name == "Income" else {"group": e.series_name})
        ui.navigate.to(f"/transactions?{urlencode(params)}")

    ui.echart({
        "animation": False,
        "backgroundColor": "transparent",
        "textStyle": {":color": CHART_TEXT},
        "tooltip": {"trigger": "axis", ":valueFormatter": "v => '₹' + v.toLocaleString('en-IN')"},
        "legend": {"type": "scroll", "top": 0, "left": 0, "right": 0,
                   "textStyle": {":color": CHART_TEXT, "fontWeight": "bold"},
                   "itemStyle": BAR_STYLE},
        "grid": {"left": 56, "right": 12, "top": 40, "bottom": 28},
        "xAxis": {"type": "category", "data": [month_label(m) for m in months],
                  "axisLabel": {":color": CHART_TEXT, "interval": 0, "fontWeight": "bold"},
                  "axisTick": {"alignWithLabel": True},
                  "axisLine": {"lineStyle": {":color": CHART_INK, "width": 2}}},
        "yAxis": {"type": "value", "axisLabel": {":formatter": INR_SHORT, ":color": CHART_TEXT},
                  "splitLine": {"lineStyle": {":color": CHART_GRID}}},
        "series": [
            *spend_series,
            {"name": "Income", "type": "bar", "color": INCOME_COLOR, "barMaxWidth": 22,
             "data": [round(income.get(m, 0) / 100) for m in months], "itemStyle": BAR_STYLE},
        ],
    }, on_point_click=open_transactions).classes("w-full h-[26rem] cursor-pointer")


def _data_health(stats) -> None:
    sync = stats["sync"]
    statuses = stats["statuses"]
    with card().classes("p-5 gap-3"):
        ui.label("Data health").classes("ft-display text-lg")
        with ui.column().classes("gap-0"):
            ui.label("Last sync").classes("ft-kicker")
            ui.label(sync["updated_at"].replace("T", " ") if sync else "Never").classes("text-sm")
            if sync:
                ui.label(sync["export"]).classes("ft-subtle text-xs")
        with ui.column().classes("gap-0"):
            ui.label("Transactions").classes("ft-kicker")
            ui.label(f"{stats['txn_count']:,}").classes("text-sm")
            if stats["first"]:
                ui.label(date_range(stats["first"], stats["last"])).classes("ft-subtle text-xs")
        ui.label("Bank SMS processed").classes("ft-kicker")
        with ui.row().classes("gap-2"):
            for status in ("parsed", "ignored", "duplicate", "unknown"):
                with ui.link(target=f"/messages?status={status}").classes("no-underline"):
                    pill(f"{status} · {statuses.get(status, 0):,}", status)
        if statuses.get("unknown"):
            ui.label("Some bank SMS mention money but matched no template.").classes("ft-expense text-xs")


# --------------------------------------------------------------------------- transactions

@ui.page("/transactions")
def transactions_page(account: int | None = None, kind: str | None = None, budget: str | None = None,
                      period: str | None = None, q: str | None = None, channel: str | None = None,
                      date_from: str | None = None, date_to: str | None = None,
                      min: float | None = None, max: float | None = None,  # noqa: A002 (URL names)
                      group: str | None = None):
    """Every filter can also be set from the URL, e.g. /transactions?budget=3&period=this_month."""
    options = data.filter_options()
    budget_options = data.budget_options()
    group_names = data.group_options()
    columns = [
        {"name": "txn_date", "label": "Date", "field": "txn_date", "sortable": True, "align": "left"},
        {"name": "counterparty", "label": "Merchant / payee", "field": "counterparty", "sortable": True,
         "align": "left", "classes": "max-w-xs truncate", "headerClasses": "max-w-xs"},
        {"name": "account", "label": "Account", "field": "account", "sortable": True, "align": "left"},
        {"name": "kind", "label": "Kind", "field": "kind", "sortable": True, "align": "left"},
        {"name": "group", "label": "Category", "field": "group", "sortable": True, "align": "left",
         "classes": "max-w-[10rem] truncate"},
        {"name": "budget", "label": "Budget", "field": "budget", "sortable": True, "align": "left",
         "classes": "max-w-[10rem] truncate"},
        {"name": "channel", "label": "Channel", "field": "channel", "sortable": True, "align": "left"},
        # Sorts by size, ignoring whether money came in or went out.
        {"name": "amount", "label": "Amount", "field": "signed_amount", "sortable": True, "align": "right",
         ":sort": "(a, b) => Math.abs(a) - Math.abs(b)"},
    ]
    sort_options = {
        "newest": ("Newest first", "txn_date", True),
        "oldest": ("Oldest first", "txn_date", False),
        "largest": ("Largest amount", "amount", True),
        "smallest": ("Smallest amount", "amount", False),
        "merchant": ("Merchant A–Z", "counterparty", False),
    }
    budget_choices = {None: "Any budget", data.NO_BUDGET: "Not in any budget",
                      **{str(k): v for k, v in budget_options.items()}}
    if period not in data.PERIODS:
        period = "custom" if (date_from or date_to) else "all"
    group_choices = {None: "Any category", **{g: g for g in group_names}}
    if group and group not in group_choices:
        group_choices[group] = group   # e.g. a category with no spending yet
    headings = [f"Budget: {budget_choices[budget]}" if budget and budget in budget_choices else None,
                f"Category: {group}" if group else None]
    heading = " · ".join(h for h in headings if h)

    with frame("/transactions", "Transactions",
               heading or "Click a row to compare the parsed values with the original SMS"):
        with card().classes("p-4 w-full gap-3"):
            with ui.row().classes("w-full items-center gap-3"):
                kind_toggle = ui.toggle({None: "All", "expense": "Expenses", "income": "Income",
                                         "refund": "Refunds", "transfer": "Transfers"},
                                        value=kind if kind in KIND_LABELS else None) \
                    .props("no-caps unelevated toggle-color=warning toggle-text-color=black")
                ui.space()
                search = ui.input(placeholder="Search merchant, reference, budget…", value=q or "") \
                    .props("clearable dense outlined debounce=300").classes("min-w-72")
                with search.add_slot("prepend"):
                    ui.icon("search", size="xs")
            with ui.row().classes("w-full items-center gap-3"):
                period_select = ui.select(data.PERIODS, value=period, label="Period") \
                    .props("dense outlined").classes("min-w-40")
                start, end = data.period_range(period, date.today())
                from_input = ui.input("From", value=date_from or start or "") \
                    .props("type=date stack-label dense outlined clearable")
                to_input = ui.input("To", value=date_to or end or "") \
                    .props("type=date stack-label dense outlined clearable")
                budget_select = ui.select(budget_choices, value=budget if budget in budget_choices else None,
                                          label="Budget").props("dense outlined").classes("min-w-48")
                group_select = ui.select(group_choices, value=group or None, label="Category") \
                    .props("dense outlined").classes("min-w-48")
            with ui.row().classes("w-full items-center gap-3"):
                account_select = ui.select({None: "All accounts", **options["accounts"]},
                                           value=account if account in options["accounts"] else None,
                                           label="Account").props("dense outlined").classes("min-w-48")
                channel_select = ui.select({None: "All channels", **{c: c for c in options["channels"]}},
                                           value=channel if channel in options["channels"] else None,
                                           label="Channel").props("dense outlined").classes("min-w-36")
                min_input = ui.number("Min ₹", value=min, min=0, format="%.0f") \
                    .props("dense outlined clearable").classes("w-28")
                max_input = ui.number("Max ₹", value=max, min=0, format="%.0f") \
                    .props("dense outlined clearable").classes("w-28")
                ui.space()
                sort = ui.select({key: label for key, (label, _, _) in sort_options.items()}, value="newest",
                                 label="Sort by").props("dense outlined").classes("min-w-44")
                ui.button("Clear filters", icon="filter_alt_off", color=None,
                          on_click=lambda: ui.navigate.to("/transactions")).props("flat dense no-caps")
            summary = ui.row().classes("gap-4 text-sm items-center")

        table = ui.table(columns=columns, rows=[], row_key="id", pagination={
            "rowsPerPage": 25, "sortBy": "txn_date", "descending": True,
        }).props("flat").classes("ft-table w-full")
        table.add_slot("body-cell-kind", KIND_SLOT)
        table.add_slot("body-cell-amount", AMOUNT_SLOT)

        def rupees_to_paise(value):
            return round(value * 100) if value not in (None, "") else None

        def refresh():
            rows = data.transactions(
                account_select.value, kind_toggle.value, channel_select.value,
                from_input.value or None, to_input.value or None, budget=budget_select.value,
                min_amount=rupees_to_paise(min_input.value), max_amount=rupees_to_paise(max_input.value),
                search=search.value, group=group_select.value)
            totals = dict.fromkeys(KIND_LABELS, 0)
            for row in rows:
                row["signed_amount"] = (1 if row["direction"] == "credit" else -1) * row["amount_minor"]
                row["amount_display"] = _signed(row)
                row["kind_label"] = KIND_LABELS[row["kind"]]
                # Count each paired transfer once (its debit side).
                paired_credit = row["linked_txn_id"] is not None and row["direction"] == "credit"
                if row["currency"] == "INR" and not paired_credit:
                    totals[row["kind"]] += row["amount_minor"]
            table.rows = rows
            table.update()
            summary.clear()
            with summary:
                ui.label(f"{len(rows):,} transactions").classes("ft-muted")
                ui.label(f"Spent {money(totals['expense'] - totals['refund'])}").classes("ft-expense font-medium")
                ui.label(f"Income {money(totals['income'])}").classes("ft-income font-medium")
                ui.label(f"Transfers {money(totals['transfer'])} (not counted)").classes("ft-transfer")

        def period_changed():
            if period_select.value != "custom":
                start, end = data.period_range(period_select.value, date.today())
                from_input.value, to_input.value = start or "", end or ""   # triggers refresh
            refresh()

        def dates_edited():
            # Typing a date by hand makes the period custom (unless it matches the shortcut exactly).
            start, end = data.period_range(period_select.value, date.today())
            if (from_input.value or None, to_input.value or None) != (start, end):
                period_select.set_value("custom")
            refresh()

        def apply_sort():
            _, column, descending = sort_options[sort.value]
            table.pagination = {**table.pagination, "sortBy": column, "descending": descending, "page": 1}

        for control in (kind_toggle, account_select, channel_select, budget_select, group_select, min_input, max_input, search):
            control.on_value_change(refresh)
        period_select.on_value_change(period_changed)
        from_input.on("change", dates_edited)
        to_input.on("change", dates_edited)
        sort.on_value_change(apply_sort)
        table.on("rowClick", lambda e: _transaction_dialog(e.args[1]))
        refresh()


def _transaction_dialog(row: dict) -> None:
    message = data.message(row["message_hash"])
    linked = data.transaction(row["linked_txn_id"]) if row["linked_txn_id"] else None
    with ui.dialog() as dialog, card().classes("p-6 w-full max-w-3xl gap-4"):
        with ui.row().classes("w-full items-start"):
            with ui.column().classes("gap-1"):
                ui.label(row["amount_display"]).classes(f"ft-big ft-amount--{row['kind']}")
                ui.label(row["counterparty"] or "—").classes("ft-muted")
            ui.space()
            pill(KIND_LABELS[row["kind"]], row["kind"])
            ui.button(icon="close", color=None, on_click=dialog.close).props("flat round dense").classes("ft-muted")
        if row["kind"] == "transfer":
            text = rule_label(row["kind_rule"])
            if linked:
                text += f" · paired with {_signed(linked)} on {linked['account']} ({linked['txn_date']})"
            ui.label(text + ". Not counted as spending or income.").classes("ft-transfer text-sm")
        with ui.grid().classes("w-full grid-cols-2 md:grid-cols-4 gap-4"):
            field("Date", row["txn_date"])
            field("Account", row["account"])
            field("Channel", row["channel"])
            field("Reference", row["reference"])
            field("Category", row["group"] or row["category"])
            field("Balance / limit after", money(row["balance_minor"]) if row["balance_minor"] is not None else None)
            field("Currency", row["currency"])
            field("Template", row["template"])
        _message_body(message)
    dialog.open()


def _message_body(message: dict | None) -> None:
    if not message:
        ui.label("Original message not found.").classes("ft-expense text-sm")
        return
    with ui.column().classes("w-full gap-2"):
        with ui.row().classes("items-center gap-2"):
            ui.label("Original SMS").classes("ft-kicker")
            pill(message["status"], message["status"])
            ui.label(f"{message['sender']} · received {message['received_at'].replace('T', ' ')[:19]}") \
                .classes("ft-subtle text-xs")
        ui.label(message["body"]).classes("ft-sms w-full")
        if message["reason"]:
            ui.label(f"Reason: {message['reason']}").classes("ft-subtle text-xs")


# --------------------------------------------------------------------------- accounts

@ui.page("/accounts")
def accounts_page():
    accounts = data.accounts()
    unassigned = data.unassigned_count()
    with frame("/accounts", "Accounts", "Detected from SMS and matched by the digits banks show"):
        if unassigned:
            ui.label(f"{unassigned} transactions couldn't be linked to an account.").classes("ft-refund text-sm")
        # Fixed deposits (SBI numbers them like accounts) live on the Deposits tab.
        groups = [
            ("Bank accounts", [a for a in accounts if a["account_type"] == "bank" and not a["is_deposit"]]),
            ("Credit cards", [a for a in accounts if a["account_type"] == "credit_card"]),
        ]
        shared = _shared_card_limits(accounts)
        for heading, group in groups:
            if group:
                ui.label(heading).classes("ft-kicker mt-2")
                with ui.grid().classes("w-full gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"):
                    for account in group:
                        _account_card(account, shared.get(account["bank"]) if account["account_type"] == "credit_card"
                                      else None)


def _shared_card_limits(accounts: list[dict]) -> dict[str, dict]:
    """A bank's credit cards draw on one credit limit, so the latest limit reported
    by any of them applies to all: {bank: {balance, balance_date, suffixes}}."""
    shared = {}
    for account in accounts:
        if account["account_type"] != "credit_card" or account["balance"] is None:
            continue
        entry = shared.setdefault(account["bank"], {"balance": None, "balance_date": "", "suffixes": []})
        entry["suffixes"].append(account["suffix"])
        if account["balance_date"] > entry["balance_date"]:
            entry["balance"], entry["balance_date"] = account["balance"], account["balance_date"]
    return {bank: entry for bank, entry in shared.items() if len(entry["suffixes"]) > 1}


def _account_card(account: dict, shared_limit: dict | None = None) -> None:
    is_card = account["account_type"] == "credit_card"
    kind = "term deposit" if account["is_deposit"] else "credit card" if is_card else "bank account"
    with card().classes("p-5 gap-4" + (" opacity-60" if account["is_closed"] else "")):
        with ui.row().classes("items-center gap-3 w-full"):
            ui.icon("savings" if account["is_deposit"] else "credit_card" if is_card else "account_balance",
                    size="md").classes("ft-accent")
            with ui.column().classes("gap-0"):
                ui.label(f"{account['bank']} {kind}").classes("font-semibold")
                ui.label(f"•••• {account['suffix']}").classes("ft-muted text-sm")
            if account["is_closed"]:
                ui.space()
                pill("Closed", "neutral")
        balance, balance_date = account["balance"], account["balance_date"]
        if shared_limit:
            balance, balance_date = shared_limit["balance"], shared_limit["balance_date"]
        with ui.column().classes("gap-0"):
            ui.label("Shared available limit" if shared_limit else "Available limit" if is_card
                     else "Last balance" if account["is_closed"] else "Balance").classes("ft-kicker")
            ui.label(money(balance)).classes("ft-big")
            if balance_date:
                caption = f"as of {balance_date}"
                if shared_limit:
                    others = [f"·{s}" for s in shared_limit["suffixes"] if s != account["suffix"]]
                    caption += f" · shared with {', '.join(others)}"
                ui.label(caption).classes("ft-subtle text-xs")
        with ui.grid().classes("grid-cols-2 gap-3"):
            field("Spent", money(account["spent"] or 0))
            field("Income", money(account["income"] or 0) if not is_card else "—")
            field("Transactions", f"{account['txn_count']:,}")
            field("Active", date_range(account["first"], account["last"]))
        ui.button("View transactions", icon="arrow_forward", color=None,
                  on_click=lambda a=account["id"]: ui.navigate.to(f"/transactions?account={a}")) \
            .props("flat dense no-caps").classes("self-start")


# --------------------------------------------------------------------------- messages

@ui.page("/messages")
def messages_page(status: str | None = None):
    statuses = {"parsed", "ignored", "duplicate", "unknown"}
    columns = [
        {"name": "received_at", "label": "Received", "field": "received_at", "sortable": True, "align": "left"},
        {"name": "status", "label": "Status", "field": "status", "sortable": True, "align": "left"},
        {"name": "reason", "label": "Reason", "field": "reason", "sortable": True, "align": "left"},
        {"name": "preview", "label": "Message", "field": "body", "align": "left",
         "classes": "max-w-xl truncate", "headerClasses": "max-w-xl"},
    ]
    with frame("/messages", "Messages", "Every bank SMS the sync processed, including the ones it skipped"):
        with card().classes("p-4 w-full"):
            with ui.row().classes("w-full items-center gap-3"):
                selected = ui.toggle({None: "All", "parsed": "Parsed", "ignored": "Ignored",
                                      "duplicate": "Duplicate", "unknown": "Unknown"},
                                     value=status if status in statuses else None).props("no-caps unelevated toggle-color=warning toggle-text-color=black")
                ui.space()
                search = ui.input(placeholder="Search…").props("clearable dense outlined").classes("min-w-64")
                with search.add_slot("prepend"):
                    ui.icon("search", size="xs")

        table = ui.table(columns=columns, rows=[], row_key="hash", pagination={
            "rowsPerPage": 25, "sortBy": "received_at", "descending": True,
        }).props("flat").classes("ft-table w-full")
        table.add_slot("body-cell-status", STATUS_SLOT)
        search.bind_value(table, "filter")

        def refresh():
            rows = data.messages(selected.value)
            for row in rows:
                row["received_at"] = row["received_at"].replace("T", " ")[:19]
            table.rows = rows
            table.update()

        selected.on_value_change(refresh)
        table.on("rowClick", lambda e: _message_dialog(e.args[1]["hash"]))
        refresh()


def _message_dialog(message_hash: str) -> None:
    message = data.message(message_hash)
    with ui.dialog() as dialog, card().classes("p-6 w-full max-w-3xl gap-4"):
        with ui.row().classes("w-full items-center"):
            ui.label("Message").classes("text-lg font-semibold")
            ui.space()
            ui.button(icon="close", color=None, on_click=dialog.close).props("flat round dense").classes("ft-muted")
        _message_body(message)
        if message and message["txn_id"]:
            ui.button("Stored as a transaction", icon="receipt_long", color=None,
                      on_click=lambda: ui.navigate.to("/transactions")).props("flat dense no-caps")
    dialog.open()
