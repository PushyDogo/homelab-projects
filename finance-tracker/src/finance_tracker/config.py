"""User configuration from ~/.config/finance-tracker/config.toml.

Example:

    [owner]
    # Names your banks use for you; transfers to/from these are your own money moving.
    names = ["Manu Gupta"]

    # Rules for transactions only you can identify. A rule matches when the
    # merchant/payee text contains any of `contains` (case-insensitive) and every
    # optional filter holds. Rules apply in order; later rules win.
    [[rule]]
    label = "Rent"
    contains = ["XX551"]
    direction = "debit"          # optional: "debit" or "credit"
    bank = "ICICI"               # optional
    min_amount = 30000           # optional, rupees
    max_amount = 40000           # optional, rupees
    kind = "expense"             # optional: expense, income, refund, transfer
    category = "Rent"            # optional
"""

import os
import tomllib
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

KINDS = {"expense", "income", "refund", "transfer"}


@dataclass(frozen=True)
class Rule:
    label: str
    contains: tuple[str, ...]
    direction: str | None = None
    bank: str | None = None
    min_amount: Decimal | None = None
    max_amount: Decimal | None = None
    kind: str | None = None
    category: str | None = None

    def matches(self, direction: str, bank: str, amount_minor: int, counterparty: str | None) -> bool:
        if not counterparty:
            return False
        text = counterparty.lower()
        if not any(needle.lower() in text for needle in self.contains):
            return False
        if self.direction and direction != self.direction:
            return False
        if self.bank and bank.lower() != self.bank.lower():
            return False
        amount = Decimal(amount_minor) / 100
        if self.min_amount is not None and amount < self.min_amount:
            return False
        if self.max_amount is not None and amount > self.max_amount:
            return False
        return True


@dataclass(frozen=True)
class Config:
    owner_names: list[str] = field(default_factory=list)
    rules: list[Rule] = field(default_factory=list)
    ppf_rate: Decimal = Decimal("7.1")   # % per year, [ppf] rate


def config_path() -> Path:
    config_home = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return config_home / "finance-tracker" / "config.toml"


def load(path: Path | None = None) -> Config:
    path = path or config_path()
    if not path.exists():
        return Config()
    with path.open("rb") as f:
        data = tomllib.load(f)
    return Config(
        owner_names=list(data.get("owner", {}).get("names", [])),
        rules=[_rule(entry, path) for entry in data.get("rule", [])],
        ppf_rate=Decimal(str(data.get("ppf", {}).get("rate", "7.1"))),
    )


def _rule(entry: dict, path: Path) -> Rule:
    label = entry.get("label") or "Unnamed rule"
    contains = entry.get("contains")
    if isinstance(contains, str):
        contains = [contains]
    if not contains:
        raise ValueError(f"{path}: rule {label!r} needs a non-empty 'contains' list")
    if entry.get("kind") and entry["kind"] not in KINDS:
        raise ValueError(f"{path}: rule {label!r} has kind {entry['kind']!r}; use one of {sorted(KINDS)}")
    if entry.get("direction") not in (None, "debit", "credit"):
        raise ValueError(f"{path}: rule {label!r} direction must be 'debit' or 'credit'")
    if not entry.get("kind") and not entry.get("category"):
        raise ValueError(f"{path}: rule {label!r} sets neither 'kind' nor 'category'")

    def rupees(key):
        return Decimal(str(entry[key])) if key in entry else None

    return Rule(label=label, contains=tuple(contains), direction=entry.get("direction"), bank=entry.get("bank"),
                min_amount=rupees("min_amount"), max_amount=rupees("max_amount"),
                kind=entry.get("kind"), category=entry.get("category"))
