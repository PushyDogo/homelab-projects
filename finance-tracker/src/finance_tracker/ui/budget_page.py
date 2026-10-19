"""Budgets: monthly allowances for needs, and savings pots (with carry-over) for wants."""

from datetime import date
from urllib.parse import quote

from nicegui import ui

from ..budgets import DEFAULT_CATEGORIES, month_key
from . import data
from .components import button, card, field, frame, money, pill, stat
from .pages import group_color, month_label

GUIDANCE = {name: cited for name, _, cited, _ in DEFAULT_CATEGORIES}


def _whole(minor: int) -> str:
    return money(minor, paise=False)


@ui.page("/budgets")
def budgets_page():
    report, base, suggested, groups = data.budget_view()
    total_percent = report.allocated_percent
    allocated_monthly = sum(s.monthly for s in report.statuses)

    with frame("/budgets", "Budgets",
               "A share of your monthly income per category: essentials reset each month, wants build up"):
        with ui.grid().classes("w-full gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"):
            with ui.element("div").classes("ft-block ft-block--cream p-5 flex flex-col gap-1 w-full"):
                with ui.row().classes("items-center w-full"):
                    ui.label("Monthly income base").classes("ft-kicker")
                    ui.space()
                    ui.button(icon="edit", color=None, on_click=lambda: _income_dialog(base, suggested)) \
                        .props("flat round dense size=sm")
                ui.label(_whole(base)).classes("ft-big")
                ui.label("Your setting" if base != suggested else "Median of the last 6 months' income") \
                    .classes("ft-subtle text-xs")
            stat("Budgeted", f"{total_percent:g}%", f"{_whole(allocated_monthly)} a month", "donut_small",
                 accent="coral" if total_percent > 100 else "yellow")
            stat("Left to save", f"{max(100 - total_percent, 0):g}%",
                 f"{_whole(max(base - allocated_monthly, 0))} a month (50/30/20 suggests at least 20%)", "savings",
                 accent="lime" if total_percent <= 80 else "coral")
            stat("Saved up in pots", _whole(sum(s.balance for s in report.statuses if s.category.rollover)),
                 "Unspent money set aside for wants", "account_balance_wallet", accent="teal")

        with ui.row().classes("w-full items-center"):
            ui.label("Categories").classes("ft-display text-lg")
            ui.space()
            button("Add category", icon="add", on_click=lambda: _category_dialog(None, groups))

        sections = [
            ("Monthly essentials", "A fresh allowance every month. Unspent money doesn't carry over.",
             [s for s in report.statuses if not s.category.rollover]),
            ("Savings pots for wants", "Unspent money carries over and builds up, so you can save for bigger "
                                       "one-time purchases like a phone or a console.",
             [s for s in report.statuses if s.category.rollover]),
        ]
        for title, description, statuses in sections:
            if not statuses:
                continue
            with ui.row().classes("w-full items-baseline gap-3 mt-2"):
                ui.label(title).classes("ft-display text-base")
                ui.label(f"{sum(s.category.percent for s in statuses):g}% · "
                         f"{_whole(sum(s.monthly for s in statuses))} a month").classes("ft-subtle text-sm")
            ui.label(description).classes("ft-muted text-sm -mt-3")
            with ui.grid().classes("w-full gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"):
                for status in statuses:
                    _category_card(status, groups)

        _expense_groups(report, groups)

        if report.unbudgeted_this_month:
            with card().classes("p-5 w-full gap-2"):
                ui.label("Not in any budget this month").classes("ft-display text-lg")
                ui.label(f"{_whole(report.unbudgeted_this_month)} of spending matched no category. Add a keyword "
                         "from these payees to a category to count it.").classes("ft-muted text-sm")
                with ui.column().classes("w-full gap-0"):
                    for merchant, amount in report.unbudgeted_merchants:
                        with ui.element("div").classes("ft-row w-full"):
                            ui.label(merchant).classes("text-sm")
                            ui.label(_whole(amount)).classes("text-sm font-bold")

        with ui.expansion("How the default percentages were chosen", icon="info").classes("ft-card w-full"):
            ui.label("Based on the 50/30/20 guideline (up to 50% of take-home pay on needs, up to 30% on wants, at "
                     "least 20% saved) and commonly cited ranges for each category. Each default uses the low end of "
                     "its range to leave more for savings.").classes("text-sm px-4")
            with ui.column().classes("w-full gap-0 px-4 pb-3"):
                for name, percent, cited, _ in DEFAULT_CATEGORIES:
                    with ui.element("div").classes("ft-row w-full"):
                        ui.label(name).classes("text-sm")
                        ui.label(f"commonly {cited} → {percent}%").classes("text-sm font-bold")


def _expense_groups(report, groups) -> None:
    """Expense categories: named groups of budget categories, which the overview chart stacks by."""
    categories = [s.category for s in report.statuses]
    with ui.row().classes("w-full items-center mt-2"):
        with ui.column().classes("gap-0"):
            ui.label("Expense categories").classes("ft-display text-base")
            ui.label("Groups of budget categories. The overview chart shows spending by these.") \
                .classes("ft-muted text-sm")
        ui.space()
        button("Add expense category", icon="add", on_click=lambda: _group_dialog(None, categories), ghost=True)
    with ui.grid().classes("w-full gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"):
        for position, group in enumerate(groups):
            members = [s for s in report.statuses if s.category.group_id == group.id]
            target = f"/transactions?group={quote(group.name)}&period=this_month"
            with card().classes("p-5 gap-2 w-full ft-clickable") as container:
                container.on("click", js_handler=(
                    f"(e) => {{ if (!e.target.closest('button')) window.location.href = '{target}'; }}"))
                with ui.row().classes("w-full items-center gap-2 no-wrap"):
                    ui.element("span").classes("ft-swatch").style(f"background: {group_color(position)}")
                    ui.label(group.name).classes("ft-display text-base")
                    ui.space()
                    ui.button(icon="edit", color=None, on_click=lambda g=group: _group_dialog(g, categories)) \
                        .props("flat round dense size=sm").tooltip("Edit")
                    ui.button(icon="delete_outline", color=None, on_click=lambda g=group: _delete_group_dialog(g)) \
                        .props("flat round dense size=sm").tooltip("Delete")
                with ui.row().classes("w-full items-baseline"):
                    ui.label("Spent this month").classes("ft-kicker")
                    ui.space()
                    ui.label(f"{_whole(sum(s.spent_this_month for s in members))} of "
                             f"{_whole(sum(s.monthly for s in members))}").classes("text-sm font-bold")
                with ui.row().classes("gap-1"):
                    for status in members:
                        ui.label(status.category.name).classes("ft-pill ft-pill--ignored")
                    if not members:
                        ui.label("No budget categories yet").classes("ft-subtle text-xs")
    loose = [c.name for c in categories if c.group_id is None]
    if loose:
        ui.label(f"Not in an expense category (shown as Other on the chart): {', '.join(loose)}") \
            .classes("ft-subtle text-xs -mt-2")


def _group_dialog(group, categories) -> None:
    editing = group is not None
    with ui.dialog() as dialog, card().classes("p-6 w-full max-w-xl gap-3"):
        ui.label("Edit expense category" if editing else "New expense category").classes("ft-display text-lg")
        name = ui.input("Name", value=group.name if editing else "").props("outlined dense").classes("w-full")
        members = ui.select({c.id: c.name for c in categories}, multiple=True, label="Budget categories",
                            value=[c.id for c in categories if editing and c.group_id == group.id]) \
            .props("outlined dense use-chips").classes("w-full")
        ui.label("A budget category belongs to one expense category; picking it here moves it from another.") \
            .classes("ft-subtle text-xs")

        def save():
            try:
                data.save_expense_group(group.id if editing else None, name.value, members.value or [])
            except ValueError as e:
                ui.notify(str(e), type="warning")
                return
            ui.navigate.reload()

        with ui.row().classes("w-full justify-end gap-2"):
            button("Cancel", on_click=dialog.close, ghost=True)
            button("Save", icon="save", on_click=save)
    dialog.open()


def _delete_group_dialog(group) -> None:
    with ui.dialog() as dialog, card().classes("p-6 gap-3"):
        ui.label(f"Delete “{group.name}”?").classes("ft-display text-lg")
        ui.label("Its budget categories stay; their spending shows as Other until you group them again.") \
            .classes("text-sm")
        with ui.row().classes("w-full justify-end gap-2"):
            button("Cancel", on_click=dialog.close, ghost=True)
            button("Delete", icon="delete", on_click=lambda: (data.delete_expense_group(group.id),
                                                               ui.navigate.reload()))
    dialog.open()


def _category_card(status, groups) -> None:
    category = status.category
    balance = status.balance
    target = f"/transactions?budget={category.id}"
    with card().classes("p-5 gap-3 w-full ft-clickable") as container:
        # Clicking the card (but not its buttons) opens the transactions this budget counts.
        container.on("click", js_handler=(
            f"(e) => {{ if (!e.target.closest('button')) window.location.href = '{target}'; }}"))
        with ui.row().classes("w-full items-center gap-2 no-wrap"):
            ui.label(category.name).classes("ft-display text-base")
            pill(f"{category.percent:g}%", "neutral")
            group_name = next((g.name for g in groups if g.id == category.group_id), None)
            if group_name:
                ui.label(group_name).classes("ft-subtle text-xs truncate")
            ui.space()
            ui.button(icon="history", color=None, on_click=lambda: _history_dialog(status)) \
                .props("flat round dense size=sm").tooltip("Month by month")
            ui.button(icon="edit", color=None, on_click=lambda: _category_dialog(category, groups)) \
                .props("flat round dense size=sm").tooltip("Edit")
            ui.button(icon="delete_outline", color=None, on_click=lambda: _delete_dialog(category)) \
                .props("flat round dense size=sm").tooltip("Delete")

        with ui.column().classes("gap-0"):
            ui.label("Saved up" if category.rollover else "Left this month").classes("ft-kicker")
            ui.label(("−" if balance < 0 else "") + _whole(abs(balance))) \
                .classes("ft-big ft-big--sm " + ("ft-expense" if balance < 0 else ""))
            if category.rollover:
                ui.label(f"{_whole(status.monthly)} added every month since {month_label(category.start_month)} "
                         f"({status.months} month{'s' * (status.months != 1)})").classes("ft-subtle text-xs")
            else:
                ui.label(f"{_whole(status.monthly)} allowance each month").classes("ft-subtle text-xs")

        used = status.spent_this_month / status.monthly if status.monthly else 0
        with ui.column().classes("gap-1 w-full"):
            with ui.row().classes("w-full"):
                ui.label("This month").classes("ft-kicker")
                ui.space()
                ui.label(f"{_whole(status.spent_this_month)} of {_whole(status.monthly)}").classes("text-xs font-bold")
            ui.linear_progress(value=min(max(used, 0), 1), show_value=False, size="12px") \
                .props(f"rounded color={'negative' if used > 1 else 'positive'} track-color=grey-4")

        if category.goal_minor and category.rollover:
            months = status.months_to_goal
            label = category.goal_label or "Goal"
            text = ("Ready to buy now" if months == 0
                    else f"{months} more month{'s' * (months != 1)} at this rate" if months else "Increase the % to get there")
            with ui.row().classes("w-full items-center gap-2"):
                ui.icon("flag", size="xs")
                ui.label(f"{label}: {_whole(category.goal_minor)}").classes("text-sm font-medium")
                ui.space()
                ui.label(text).classes("text-xs " + ("ft-income font-bold" if months == 0 else "ft-subtle"))

        if category.keywords:
            shown = category.keywords[:6]
            with ui.row().classes("gap-1"):
                for keyword in shown:
                    ui.label(keyword).classes("ft-pill ft-pill--ignored")
                if len(category.keywords) > len(shown):
                    ui.label(f"+{len(category.keywords) - len(shown)}").classes("ft-pill ft-pill--ignored")
        with ui.row().classes("w-full items-center"):
            if category.name in GUIDANCE:
                ui.label(f"Commonly {GUIDANCE[category.name]} of income").classes("ft-subtle text-xs")
            ui.space()
            with ui.row().classes("items-center gap-1 ft-accent text-xs font-bold"):
                ui.label("View transactions")
                ui.icon("arrow_forward", size="xs")


def _category_dialog(category, groups) -> None:
    editing = category is not None
    with ui.dialog() as dialog, card().classes("p-6 w-full max-w-xl gap-3"):
        ui.label("Edit category" if editing else "New category").classes("ft-display text-lg")
        name = ui.input("Name", value=category.name if editing else "").props("outlined dense").classes("w-full")
        kind = ui.toggle({False: "Monthly (resets)", True: "Savings pot (carries over)"},
                         value=category.rollover if editing else True) \
            .props("no-caps unelevated dense toggle-color=warning toggle-text-color=black")
        ui.label("Monthly suits needs like rent and groceries; a savings pot suits wants you save up for.") \
            .classes("ft-subtle text-xs")
        with ui.row().classes("w-full gap-3 no-wrap"):
            percent = ui.number("% of monthly income", value=category.percent if editing else 2, min=0, max=100,
                                step=0.5).props("outlined dense").classes("flex-1")
            start = ui.input("Starts from", value=category.start_month if editing else month_key(date.today())) \
                .props("type=month stack-label outlined dense").classes("flex-1")
        keywords = ui.textarea("Merchant keywords (comma separated)",
                               value=", ".join(category.keywords) if editing else "") \
            .props("outlined dense autogrow").classes("w-full")
        ui.label("A payment counts here when its merchant/payee contains a keyword (e.g. Swiggy, Steam). "
                 "Use category:Rent to match a category set by your rules.").classes("ft-subtle text-xs")
        group = ui.select({None: "None (shown as Other)", **{g.id: g.name for g in groups}},
                          value=category.group_id if editing else None, label="Expense category") \
            .props("outlined dense").classes("w-full")
        with ui.row().classes("w-full gap-3 no-wrap") as goal_row:
            goal_label = ui.input("Saving for (optional)", value=(category.goal_label or "") if editing else "") \
                .props("outlined dense").classes("flex-1")
            goal = ui.number("Goal amount (₹)", value=(category.goal_minor / 100 if editing and category.goal_minor
                                                       else None), min=0, format="%.0f") \
                .props("outlined dense").classes("flex-1")
        goal_row.bind_visibility_from(kind, "value")   # goals only make sense for savings pots

        def save():
            try:
                pot = bool(kind.value)
                data.save_budget_category(
                    category.id if editing else None, name.value, float(percent.value or 0),
                    (keywords.value or "").split(","), start.value,
                    round(goal.value * 100) if pot and goal.value else None, goal_label.value if pot else None,
                    rollover=pot, group_id=group.value)
            except ValueError as e:
                ui.notify(str(e), type="warning")
                return
            ui.navigate.reload()

        with ui.row().classes("w-full justify-end gap-2"):
            button("Cancel", on_click=dialog.close, ghost=True)
            button("Save", icon="save", on_click=save)
    dialog.open()


def _delete_dialog(category) -> None:
    with ui.dialog() as dialog, card().classes("p-6 gap-3"):
        ui.label(f"Delete “{category.name}”?").classes("ft-display text-lg")
        ui.label("Its carried-over balance goes with it. Transactions aren't affected.").classes("text-sm")
        with ui.row().classes("w-full justify-end gap-2"):
            button("Cancel", on_click=dialog.close, ghost=True)
            button("Delete", icon="delete", on_click=lambda: (data.delete_budget_category(category.id),
                                                               ui.navigate.reload()))
    dialog.open()


def _income_dialog(base: int, suggested: int) -> None:
    with ui.dialog() as dialog, card().classes("p-6 w-full max-w-md gap-3"):
        ui.label("Monthly income base").classes("ft-display text-lg")
        ui.label("Budgets are percentages of this amount. Your take-home salary is a good choice; the suggestion "
                 f"is the median of your last 6 months' income ({_whole(suggested)}).").classes("text-sm")
        amount = ui.number("Amount (₹ a month)", value=base / 100, min=0, format="%.0f") \
            .props("outlined dense").classes("w-full")

        def save(value):
            data.set_budget_income(round((value or 0) * 100))
            ui.navigate.reload()

        with ui.row().classes("w-full justify-end gap-2"):
            button("Use suggestion", on_click=lambda: save(suggested / 100), ghost=True)
            button("Save", icon="save", on_click=lambda: save(amount.value))
    dialog.open()


def _history_dialog(status) -> None:
    with ui.dialog() as dialog, card().classes("p-6 w-full max-w-2xl gap-3"):
        with ui.row().classes("w-full items-center"):
            ui.label(f"{status.category.name}: month by month").classes("ft-display text-lg")
            ui.space()
            ui.button(icon="close", color=None, on_click=dialog.close).props("flat round dense")
        columns = [
            {"name": "month", "label": "Month", "field": "label", "align": "left"},
            {"name": "allocated", "label": "Added", "field": "allocated", "align": "right",
             ":format": "v => '₹' + Math.round(v / 100).toLocaleString('en-IN')"},
            {"name": "spent", "label": "Spent", "field": "spent", "align": "right",
             ":format": "v => '₹' + Math.round(v / 100).toLocaleString('en-IN')"},
            {"name": "balance", "label": "Available after", "field": "balance", "align": "right",
             ":format": "v => (v < 0 ? '−₹' : '₹') + Math.round(Math.abs(v) / 100).toLocaleString('en-IN')"},
        ]
        rows = [{**h, "label": month_label(h["month"])} for h in reversed(status.history)]
        ui.table(columns=columns, rows=rows, row_key="month", pagination={"rowsPerPage": 0}) \
            .props("flat hide-bottom").classes("ft-table w-full")
        with ui.grid().classes("grid-cols-3 gap-3 w-full"):
            field("Total added", _whole(status.allocated))
            field("Total spent", _whole(status.spent))
            field("Available", _whole(status.balance))
    dialog.open()
