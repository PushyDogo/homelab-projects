"""Monthly budgets and savings pots.

Each category gets `percent` of your monthly income base every month from its
start month, and spending that matches the category is taken out. Two kinds:

  * Monthly (rollover = False), for needs like rent and groceries: a fresh
    allowance each month; unspent money does not carry over.
  * Savings pot (rollover = True), for wants: whatever is left carries over and
    accumulates, so you can save up for bigger one-time purchases.

Matching: a transaction belongs to the category whose keyword matches its
merchant/payee text (case-insensitive substring); when several categories match,
the longest keyword wins ("Instamart" beats "Swiggy"). A keyword of the form
"category:Rent" matches transactions your rules put in that category.
Only expenses and refunds count; refunds give money back to their category.
Transfers (FDs, investments, card bills…) are never budget spending.

Expense categories group budget categories (e.g. Food = Groceries + Food
delivery) for the overview chart. Spending that matches no grouped budget shows
under the category your rules gave it (e.g. Tax), or "Other".
"""

import json
from dataclasses import dataclass, field
from datetime import date

# Conservative defaults: the low end of commonly cited ranges, as % of monthly take-home income.
# (name, percent, commonly cited range, keywords). Needs reset monthly; wants accumulate.
NEEDS = {"Rent & housing", "Groceries", "Bills & utilities", "Transport", "Health & fitness"}
DEFAULT_CATEGORIES = [
    ("Rent & housing", 25, "25–30%", ["category:Rent", "MyGate", "Rentomojo", "maintenance"]),
    ("Groceries", 5, "5–10%", ["Instamart", "Blinkit", "Zepto", "BigBasket", "DMart", "Just Fresh", "Amazon Fresh",
                               "Nature's Basket"]),
    ("Bills & utilities", 3, "3–5%", ["Airtel", "Jio", "Vodafone", "Bharat Connect", "electricity", "BESCOM",
                                      "broadband", "ACT Fibernet", "gas"]),
    ("Transport", 5, "5–10%", ["Uber", "Ola", "Rapido", "Namma Yatri", "IRCTC", "metro", "petrol", "fuel", "FASTag",
                               "redBus", "HPCL", "BPCL", "Indian Oil", "mechanic"]),
    ("Health & fitness", 2, "2–5%", ["1MG", "Apollo", "PharmEasy", "pharmacy", "Practo", "hospital", "clinic",
                                     "Cult Fit", "diagnostic"]),
    ("Food delivery & eating out", 5, "5–10%", ["Swiggy", "Zomato", "EatClub", "KFC", "Domino", "McDonald",
                                                "Starbucks", "Bundl", "Pizza", "restaurant", "cafe", "Burger"]),
    ("Entertainment", 2, "2–5%", ["BookMyShow", "PVR", "INOX", "Cinepolis", "Steam", "Nintendo", "PlayStation",
                                  "Xbox", "Epic Games", "Google Play", "GooglePlay", "bowling"]),
    ("Subscriptions & software", 1, "1–2%", ["Netflix", "Spotify", "Prime Video", "Hotstar", "YouTube", "OpenAI",
                                             "ChatGPT", "Anthropic", "Apple", "iCloud"]),
    ("Shopping & personal", 3, "3–5%", ["Amazon", "Flipkart", "Myntra", "Ajio", "Nykaa", "Decathlon", "Croma",
                                        "Puma", "Nike", "Urbanclap", "Urban Company"]),
    ("Travel & vacations", 3, "3–5%", ["MakeMyTrip", "Goibibo", "IndiGo", "Air India", "Vistara", "Airbnb", "OYO",
                                       "Booking.com", "Cleartrip", "Viaterra", "hotel", "Agoda"]),
    ("Gifts & donations", 1, "1–3%", ["gift", "donation", "Ketto", "GiveIndia"]),
]
# Expense categories and the default budget categories in each.
DEFAULT_GROUPS = [
    ("Home", ["Rent & housing", "Bills & utilities"]),
    ("Food", ["Groceries", "Food delivery & eating out"]),
    ("Transport & travel", ["Transport", "Travel & vacations"]),
    ("Health", ["Health & fitness"]),
    ("Lifestyle", ["Entertainment", "Subscriptions & software", "Shopping & personal", "Gifts & donations"]),
]
OTHER = "Other"


@dataclass
class Category:
    id: int
    name: str
    percent: float
    keywords: list[str]
    start_month: str                 # 'YYYY-MM'
    goal_minor: int | None = None
    goal_label: str | None = None
    rollover: bool = True            # True: unspent money carries over (savings pot); False: resets monthly
    group_id: int | None = None      # expense category it belongs to


@dataclass
class Group:
    id: int
    name: str


@dataclass
class CategoryStatus:
    category: Category
    monthly: int                     # paise allocated each month
    months: int                      # months allocated so far (start → this month)
    allocated: int                   # total paise allocated
    spent: int                       # total paise spent (net of refunds) since the start month
    spent_this_month: int
    history: list[dict] = field(default_factory=list)   # per month: month, allocated, spent, balance

    @property
    def balance(self) -> int:
        """Available now: the running total for a savings pot, this month's remainder for a monthly budget."""
        return self.history[-1]["balance"] if self.history else 0

    @property
    def months_to_goal(self) -> int | None:
        """Months of allocations still needed to reach the goal (0 when already reached)."""
        if not self.category.goal_minor or not self.category.rollover:
            return None
        short = self.category.goal_minor - self.balance
        if short <= 0:
            return 0
        return -(-short // self.monthly) if self.monthly else None


@dataclass
class BudgetReport:
    income_base: int
    statuses: list[CategoryStatus]
    unbudgeted_this_month: int                  # expenses this month matching no category
    unbudgeted_merchants: list[tuple[str, int]]  # top unmatched merchants this month

    @property
    def allocated_percent(self) -> float:
        return sum(s.category.percent for s in self.statuses)


def month_key(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def months_between(start: str, end: str) -> list[str]:
    """Inclusive list of 'YYYY-MM' months from start to end (empty if start is after end)."""
    year, month = map(int, start.split("-"))
    end_year, end_month = map(int, end.split("-"))
    months = []
    while (year, month) <= (end_year, end_month):
        months.append(f"{year:04d}-{month:02d}")
        year, month = (year, month + 1) if month < 12 else (year + 1, 1)
    return months


def match(categories: list[Category], counterparty: str | None, txn_category: str | None) -> Category | None:
    """The category whose longest keyword matches this transaction, if any."""
    text = (counterparty or "").lower()
    best, best_len = None, 0
    for category in categories:
        for keyword in category.keywords:
            keyword = keyword.strip()
            if keyword.lower().startswith("category:"):
                wanted = keyword.split(":", 1)[1].strip().lower()
                hit = bool(txn_category) and txn_category.lower() == wanted
                length = 1000   # an explicit category from your rules always wins
            else:
                hit = bool(keyword) and keyword.lower() in text
                length = len(keyword)
            if hit and length > best_len:
                best, best_len = category, length
    return best


def load_categories(conn) -> list[Category]:
    return [
        Category(id=row[0], name=row[1], percent=row[2], keywords=json.loads(row[3]), start_month=row[4],
                 goal_minor=row[5], goal_label=row[6], rollover=bool(row[7]), group_id=row[8])
        for row in conn.execute("SELECT id, name, percent, keywords, start_month, goal_minor, goal_label, rollover, "
                                "group_id FROM budget_categories ORDER BY position, id")
    ]


def load_groups(conn) -> list[Group]:
    return [Group(*row) for row in conn.execute("SELECT id, name FROM expense_groups ORDER BY position, id")]


def seed_defaults(conn, start_month: str) -> None:
    group_of = {}
    for position, (group, members) in enumerate(DEFAULT_GROUPS):
        conn.execute("INSERT OR IGNORE INTO expense_groups (name, position, created_at) VALUES (?, ?, datetime('now'))",
                     (group, position))
        (group_id,) = conn.execute("SELECT id FROM expense_groups WHERE name = ?", (group,)).fetchone()
        group_of.update(dict.fromkeys(members, group_id))
    for position, (name, percent, _, keywords) in enumerate(DEFAULT_CATEGORIES):
        conn.execute(
            "INSERT INTO budget_categories (name, percent, keywords, start_month, position, rollover, group_id, "
            "created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            (name, percent, json.dumps(keywords), start_month, position, int(name not in NEEDS), group_of.get(name)))


def spend_label(categories: list[Category], groups: dict[int, str], counterparty: str | None,
                txn_category: str | None) -> str:
    """The expense category a payment shows under: its budget's group, else its rule category, else Other."""
    matched = match(categories, counterparty, txn_category)
    if matched and matched.group_id in groups:
        return groups[matched.group_id]
    return txn_category or OTHER


def spend_by_label(conn, since: str) -> tuple[dict[str, dict[str, int]], list[str]]:
    """({month: {expense category: paise}}, labels in display order) for INR spending from `since`.

    Refunds are taken off the category they belong to. Order: expense categories as
    arranged, then rule categories A–Z, then Other.
    """
    categories = load_categories(conn)
    groups = {g.id: g.name for g in load_groups(conn)}
    spend: dict[str, dict[str, int]] = {}
    for month, kind, amount, counterparty, txn_category in conn.execute(
            "SELECT substr(txn_date, 1, 7), kind, amount_minor, counterparty, category FROM transactions "
            "WHERE currency = 'INR' AND kind IN ('expense', 'refund') AND txn_date >= ?", (since,)):
        label = spend_label(categories, groups, counterparty, txn_category)
        parts = spend.setdefault(month, {})
        parts[label] = parts.get(label, 0) + (amount if kind == "expense" else -amount)
    used = {label for parts in spend.values() for label in parts}
    named = list(groups.values())
    order = ([g for g in named if g in used] + sorted(used - set(named) - {OTHER})
             + ([OTHER] if OTHER in used else []))
    return spend, order


def report(conn, today: date, income_base: int) -> BudgetReport:
    categories = load_categories(conn)
    this_month = month_key(today)
    earliest = min((c.start_month for c in categories), default=this_month)
    rows = conn.execute(
        "SELECT txn_date, kind, amount_minor, counterparty, category FROM transactions "
        "WHERE currency = 'INR' AND kind IN ('expense', 'refund') AND txn_date >= ?", (earliest + "-01",),
    ).fetchall()

    spent: dict[tuple[int, str], int] = {}
    unbudgeted: dict[str, int] = {}
    for txn_date, kind, amount, counterparty, txn_category in rows:
        month = txn_date[:7]
        signed = amount if kind == "expense" else -amount
        category = match(categories, counterparty, txn_category)
        if category is None:
            if month == this_month and kind == "expense":
                unbudgeted[counterparty or "Unknown"] = unbudgeted.get(counterparty or "Unknown", 0) + amount
            continue
        if month >= category.start_month:
            spent[(category.id, month)] = spent.get((category.id, month), 0) + signed

    statuses = []
    for category in categories:
        monthly = round(income_base * category.percent / 100)
        months = months_between(category.start_month, this_month)
        history, balance = [], 0
        for month in months:
            month_spent = spent.get((category.id, month), 0)
            # A savings pot keeps what's left; a monthly budget starts afresh each month.
            balance = (balance if category.rollover else 0) + monthly - month_spent
            history.append({"month": month, "allocated": monthly, "spent": month_spent, "balance": balance})
        statuses.append(CategoryStatus(
            category=category, monthly=monthly, months=len(months), allocated=monthly * len(months),
            spent=sum(h["spent"] for h in history), spent_this_month=spent.get((category.id, this_month), 0),
            history=history,
        ))
    top_unbudgeted = sorted(unbudgeted.items(), key=lambda kv: -kv[1])
    return BudgetReport(income_base, statuses, sum(unbudgeted.values()), top_unbudgeted[:8])


def suggested_income_base(conn, today: date, months: int = 6) -> int:
    """Median monthly income (INR, excluding transfers) over the last complete months."""
    first = date(today.year, today.month, 1)
    totals = [row[0] for row in conn.execute(
        "SELECT sum(amount_minor) FROM transactions WHERE kind = 'income' AND currency = 'INR' "
        "AND txn_date < ? AND txn_date >= date(?, ?) GROUP BY substr(txn_date, 1, 7)",
        (first.isoformat(), first.isoformat(), f"-{months} months"))]
    if not totals:
        return 0
    totals.sort()
    mid = len(totals) // 2
    return totals[mid] if len(totals) % 2 else (totals[mid - 1] + totals[mid]) // 2
