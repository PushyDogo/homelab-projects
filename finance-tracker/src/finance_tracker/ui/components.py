"""Shared page layout, theme and formatting helpers.

The look is neo-brutalist: a warm cream page, ink-black 2.5px borders, hard
offset shadows, bright accent blocks, Archivo Black for display type and
DM Sans for text (both bundled locally, see static/fonts).

Colors come from CSS variables that switch on Quasar's `body--dark` class, so
every element (including Quasar tables, dialogs and inputs) follows the same
light or dark palette. Accent blocks always carry dark ink text; body text
meets WCAG AA contrast on its surface in both themes.
"""

from contextlib import contextmanager

from nicegui import ui

NAV = [
    ("Overview", "/", "space_dashboard"),
    ("Net worth", "/net-worth", "account_balance_wallet"),
    ("Transactions", "/transactions", "receipt_long"),
    ("Budgets", "/budgets", "donut_small"),
    ("Accounts", "/accounts", "account_balance"),
    ("Deposits", "/deposits", "savings"),
    ("Investments", "/investments", "trending_up"),
    ("Messages", "/messages", "sms"),
]

# Theme choice lives in a cookie so the server renders each page (and its charts)
# in the right theme from the start.
THEME_COOKIE = "ft_theme"
THEMES = [("auto", "brightness_auto", "Follow system"), ("light", "light_mode", "Light"), ("dark", "dark_mode", "Dark")]

KIND_LABELS = {"expense": "Expense", "income": "Income", "refund": "Refund", "transfer": "Transfer"}
RULE_LABELS = {
    "cc_bill_payment": "Card bill payment",
    "fd_booking": "FD booked",
    "fd_closure": "FD closed",
    "investment": "Investment",
    "own_transfer": "Between your accounts",
    "refund": "Refund",
}

# Accent palette (shared by CSS and charts).
LIME, YELLOW, CORAL, COBALT, PURPLE, TEAL, BLUE = (
    "#c8e832", "#f5b83c", "#ff5b45", "#1769e8", "#7c3aed", "#3cbdb1", "#4a9fd4")


def rule_label(rule: str | None) -> str:
    """Readable name for a classification rule; user rules are stored as 'rule:<label>'."""
    if rule and rule.startswith("rule:"):
        return rule.removeprefix("rule:")
    return RULE_LABELS.get(rule, rule or "Transfer")


_FONT_FACES = "\n".join(
    f"""@font-face {{ font-family: "{family}"; font-weight: {weight}; font-display: swap;
  src: url("/static/fonts/{file}.woff2") format("woff2"); unicode-range: {urange}; }}"""
    for family, weight, file, urange in [
        ("Archivo Black", 400, "archivo-black-latin-400-normal", "U+0000-00FF, U+2000-206F, U+2190-21FF"),
        *[("DM Sans", w, f"dm-sans-latin-{w}-normal", "U+0000-00FF, U+2000-206F, U+2190-21FF") for w in (400, 500, 700)],
        # latin-ext carries the rupee sign (U+20B9).
        *[("DM Sans", w, f"dm-sans-latin-ext-{w}-normal", "U+0100-02BA, U+20A0-20C0") for w in (400, 500, 700)],
    ]
)

THEME_CSS = _FONT_FACES + f"""
body {{
  --page: #f6efd9; --surface: #fffaeb; --surface-2: #f4e9cc; --line: #e2d4b0;   /* warm, yellow-tinted */
  --ink: #111111; --text: #111111; --muted: #454545; --subtle: #5a5650;
  --expense: #c2331f; --income: #0c7066; --refund: #8a5a00; --transfer: #1557c0; --accent: #1557c0;
  --lime: {LIME}; --yellow: {YELLOW}; --coral: {CORAL}; --cobalt: {COBALT}; --purple: {PURPLE}; --teal: {TEAL};
  --display: "Archivo Black", "DM Sans", system-ui, sans-serif;
  background: var(--page) !important; color: var(--text);
  font-family: "DM Sans", system-ui, sans-serif; font-variant-numeric: tabular-nums;
}}
body.body--dark {{
  --page: #121110; --surface: #1c1b19; --surface-2: #272521; --line: #34312c;
  --ink: #f6eedf; --text: #f6eedf; --muted: #cfc7b8; --subtle: #b0a898;
  --expense: #ff8a78; --income: #6ddbcf; --refund: #f5c360; --transfer: #8ab6ff; --accent: {LIME};
}}
.ft-display {{ font-family: var(--display); letter-spacing: -0.01em; }}
.ft-header {{ background: var(--page) !important; color: var(--text) !important;
  border-bottom: 2.5px solid var(--ink); box-shadow: none !important; }}
.ft-drawer, .q-drawer {{ background: var(--page) !important; color: var(--text); }}
.q-drawer--bordered {{ border-right: 2.5px solid var(--ink) !important; }}
.ft-logo {{ background: var(--lime); color: #111; border: 2.5px solid var(--ink); border-radius: 10px;
  box-shadow: 2px 2px 0 var(--ink); width: 34px; height: 34px; display: grid; place-items: center; }}
.ft-nav {{ display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 10px;
  border: 2px solid transparent; color: var(--text); text-decoration: none; font-weight: 700; font-size: 14px; }}
.ft-nav:hover {{ border-color: var(--ink); }}
.ft-nav--active {{ background: var(--yellow); color: #111; border-color: var(--ink); box-shadow: 3px 3px 0 var(--ink); }}
.ft-card {{ background: var(--surface) !important; color: var(--text) !important; border: 2.5px solid var(--ink);
  border-radius: 12px; box-shadow: 4px 4px 0 var(--ink) !important; }}
.ft-clickable {{ cursor: pointer; transition: transform .08s, box-shadow .08s; }}
.ft-clickable:hover {{ transform: translate(-1px, -1px); box-shadow: 6px 6px 0 var(--ink) !important; }}
.ft-block {{ border: 2.5px solid var(--ink); border-radius: 12px; box-shadow: 4px 4px 0 var(--ink); color: #111; }}
.ft-block .ft-kicker, .ft-block .ft-subtle {{ color: #2b2b2b; }}
.ft-block--lime {{ background: var(--lime); }} .ft-block--yellow {{ background: var(--yellow); }}
.ft-block--coral {{ background: var(--coral); }} .ft-block--teal {{ background: var(--teal); }}
.ft-block--cobalt {{ background: #7fb0ff; }} .ft-block--cream {{ background: #f6eedf; }}
.ft-title {{ font-family: var(--display); color: var(--text); font-size: 2.1rem; line-height: 1.1; }}
.ft-big {{ font-family: var(--display); font-size: 1.9rem; line-height: 1.15; }}
.ft-big--sm {{ font-size: 1.35rem; }}
.ft-muted {{ color: var(--muted); }}
.ft-subtle {{ color: var(--subtle); }}
.ft-kicker {{ color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }}
.ft-expense {{ color: var(--expense); }} .ft-income {{ color: var(--income); }}
.ft-refund {{ color: var(--refund); }} .ft-transfer {{ color: var(--transfer); }}
.ft-accent {{ color: var(--accent); }}
.ft-pill {{ display: inline-flex; align-items: center; padding: 1px 10px; border-radius: 999px; border: 2px solid var(--ink);
  font-size: 12px; font-weight: 700; white-space: nowrap; color: #111; }}
.ft-pill--expense, .ft-pill--unknown {{ background: #ffb9ad; }}
.ft-pill--income, .ft-pill--parsed {{ background: #b3ebe4; }}
.ft-pill--refund, .ft-pill--duplicate {{ background: #fcd98f; }}
.ft-pill--transfer {{ background: #bcd3fb; }}
.ft-pill--ignored, .ft-pill--neutral {{ background: #efe7d8; }}
.ft-pill--open {{ background: var(--lime); }}
.ft-swatch {{ width: 14px; height: 14px; border: 2px solid var(--ink); border-radius: 3px; flex: none; }}
.ft-amount--expense {{ color: var(--text); }} .ft-amount--income {{ color: var(--income); }}
.ft-amount--refund {{ color: var(--refund); }} .ft-amount--transfer {{ color: var(--subtle); }}
.ft-sms {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; white-space: pre-wrap;
  background: var(--surface-2); color: var(--text); border: 2px solid var(--ink); border-radius: 10px; padding: 12px; }}
.ft-row {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0;
  border-bottom: 2px solid var(--line); }}
.ft-row:last-child {{ border-bottom: none; }}
a.ft-row {{ color: inherit; }}
.ft-table {{ background: var(--surface) !important; color: var(--text) !important; border: 2.5px solid var(--ink);
  border-radius: 12px !important; box-shadow: 4px 4px 0 var(--ink) !important; overflow: hidden; }}
.ft-table thead th {{ background: var(--ink); color: var(--page); font-size: 11px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; }}
.ft-table th, .ft-table td, .ft-table .q-table__bottom {{ border-color: var(--line) !important; }}
.ft-table tbody td {{ font-size: 13px; }}
.ft-table tbody tr {{ cursor: pointer; }}
.ft-table tbody tr:hover td {{ background: var(--surface-2); }}
.ft-table .q-table__bottom {{ color: var(--muted); border-top: 2px solid var(--ink) !important; }}
.ft-table .q-table__sort-icon {{ color: var(--page); }}
.q-btn-toggle {{ box-shadow: 3px 3px 0 var(--ink) !important; border: 2px solid var(--ink); border-radius: 10px;
  background: var(--surface); }}
.q-btn-toggle .q-btn {{ color: var(--text); font-weight: 700; }}
.q-btn-toggle .q-btn.bg-primary {{ background: var(--yellow) !important; color: #111 !important; }}
.q-field--outlined .q-field__control {{ border-radius: 10px; }}
.q-field--outlined .q-field__control:before {{ border: 2px solid var(--ink) !important; }}
.q-field__label, .q-field__native, .q-field__input, .q-select__dropdown-icon {{ color: var(--text) !important; }}
.q-menu {{ background: var(--surface); color: var(--text); border: 2px solid var(--ink); box-shadow: 3px 3px 0 var(--ink); }}
.ft-btn {{ background: var(--lime) !important; color: #111 !important; border: 2px solid var(--ink); border-radius: 10px;
  box-shadow: 3px 3px 0 var(--ink); font-weight: 700; transition: transform .08s, box-shadow .08s; }}
.ft-btn:hover {{ transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }}
.ft-btn:active {{ transform: translate(3px, 3px); box-shadow: 0 0 0 var(--ink); }}
.ft-btn--ghost {{ background: var(--surface) !important; color: var(--text) !important; }}
.q-dialog .q-card {{ background: var(--surface); color: var(--text); }}
.ft-theme {{ display: inline-flex; gap: 2px; padding: 3px; border: 2px solid var(--ink); border-radius: 999px;
  box-shadow: 2px 2px 0 var(--ink); background: var(--surface); }}
.ft-theme .q-btn {{ color: var(--text); }}
.ft-theme .ft-theme--active {{ background: var(--yellow); color: #111; }}
"""


def themed(light: str, dark: str) -> str:
    """A JS expression choosing a color by theme, for ECharts options keyed with ':'."""
    return f"document.body.classList.contains('body--dark') ? '{dark}' : '{light}'"


CHART_TEXT = themed("#454545", "#cfc7b8")
CHART_GRID = themed("#e6dccb", "#34312c")
CHART_INK = themed("#111111", "#f6eedf")


def date_range(first: str | None, last: str | None) -> str | None:
    """'first → last', wrapping only at the arrow (dates use non-breaking hyphens)."""
    if not first:
        return None
    return f"{first} → {last}".replace("-", "‑")


def indian_grouping(number: int) -> str:
    """1234567 -> '12,34,567' (lakh/crore grouping)."""
    digits = str(number)
    if len(digits) <= 3:
        return digits
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups) + "," + tail


def money(minor: int | None, currency: str = "INR", paise: bool = True) -> str:
    if minor is None:
        return "—"
    sign = "−" if minor < 0 else ""
    units, cents = divmod(abs(round(minor)), 100)
    if not paise:
        units += cents >= 50
    fraction = f".{cents:02d}" if paise else ""
    if currency == "INR":
        return f"{sign}₹{indian_grouping(units)}{fraction}"
    return f"{sign}{currency} {units:,}{fraction}"


@contextmanager
def frame(path: str, title: str, subtitle: str | None = None):
    """Header, navigation drawer and a centred content column. `path` marks the active nav item."""
    ui.add_css(THEME_CSS)
    ui.colors(primary=COBALT, warning=YELLOW)
    theme = ui.context.client.request.cookies.get(THEME_COOKIE, "auto")
    theme = theme if theme in {value for value, _, _ in THEMES} else "auto"
    ui.dark_mode({"auto": None, "light": False, "dark": True}[theme])

    with ui.header().classes("ft-header items-center gap-3 px-5 py-3"):
        ui.button(icon="menu", color=None, on_click=lambda: drawer.toggle()).props("flat round dense")
        with ui.element("div").classes("ft-logo"):
            ui.icon("account_balance_wallet", size="xs")
        ui.label("Finance Tracker").classes("ft-display text-lg")
        ui.space()
        with ui.row().classes("items-center gap-1 ft-subtle text-xs mr-3"):
            ui.icon("lock", size="xs")
            ui.label("Local only")
        _theme_switch(theme)

    with ui.left_drawer(value=True).props("width=236 bordered :breakpoint=900").classes("ft-drawer p-3") as drawer:
        with ui.column().classes("gap-2 w-full"):
            for label, target, icon in NAV:
                with ui.link(target=target).classes("ft-nav" + (" ft-nav--active" if target == path else "")):
                    ui.icon(icon, size="xs")
                    ui.label(label)

    with ui.column().classes("w-full max-w-7xl mx-auto px-6 py-8 gap-6"):
        with ui.column().classes("gap-1"):
            ui.label(title).classes("ft-title")
            if subtitle:
                ui.label(subtitle).classes("ft-muted text-sm")
        yield


def _theme_switch(current: str) -> None:
    """System / light / dark buttons. Clicking sets the cookie and reloads, entirely in the browser."""
    with ui.element("div").classes("ft-theme"):
        for value, icon, label in THEMES:
            button = ui.button(icon=icon, color=None).props("flat round dense size=sm") \
                .classes("ft-theme--active" if value == current else "")
            button.tooltip(label)
            button.on("click", js_handler=(
                f"() => {{ document.cookie = '{THEME_COOKIE}={value}; path=/; max-age=31536000; SameSite=Strict';"
                " location.reload(); }"))


def card():
    return ui.card().classes("ft-card")


def stat(label: str, value: str, caption: str | None = None, icon: str | None = None,
         accent: str | None = None, tone: str = "", small: bool = False) -> None:
    """A headline number. `accent` (lime, yellow, coral, teal, cobalt, cream) fills the card with colour."""
    container = ui.element("div").classes(f"ft-block ft-block--{accent} p-5 flex flex-col gap-1 w-full") if accent \
        else card().classes("p-5 gap-1 w-full")
    with container:
        with ui.row().classes("items-center gap-2"):
            if icon:
                ui.icon(icon, size="xs")
            ui.label(label).classes("ft-kicker")
        ui.label(value).classes(f"ft-big {'ft-big--sm' if small else ''} {tone}")
        if caption:
            ui.label(caption).classes("ft-subtle text-xs")


def field(label: str, value) -> None:
    with ui.column().classes("gap-0"):
        ui.label(label).classes("ft-kicker")
        ui.label("—" if value in (None, "") else str(value)).classes("text-sm font-medium break-words")


def pill(text: str, variant: str) -> None:
    ui.label(text).classes(f"ft-pill ft-pill--{variant}")


def button(text: str, icon: str | None = None, on_click=None, ghost: bool = False):
    return ui.button(text, icon=icon, on_click=on_click, color=None).props("unelevated no-caps") \
        .classes("ft-btn" + (" ft-btn--ghost" if ghost else ""))
