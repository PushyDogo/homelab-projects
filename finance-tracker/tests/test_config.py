from decimal import Decimal

import pytest

from finance_tracker import config


def write(tmp_path, text):
    path = tmp_path / "config.toml"
    path.write_text(text)
    return path


def test_missing_file_gives_defaults(tmp_path):
    assert config.load(tmp_path / "nope.toml") == config.Config()


def test_loads_owner_and_rules(tmp_path):
    cfg = config.load(write(tmp_path, """
[owner]
names = ["Jane Doe"]

[[rule]]
label = "Rent"
contains = "XX551"
min_amount = 30000
category = "Rent"
"""))
    assert cfg.owner_names == ["Jane Doe"]
    assert cfg.rules == [config.Rule("Rent", ("XX551",), min_amount=Decimal("30000"), category="Rent")]


@pytest.mark.parametrize("body, message", [
    ('label = "x"\ncategory = "c"', "contains"),
    ('label = "x"\ncontains = ["a"]\nkind = "gift"', "kind"),
    ('label = "x"\ncontains = ["a"]', "neither"),
])
def test_invalid_rules_are_reported(tmp_path, body, message):
    with pytest.raises(ValueError, match=message):
        config.load(write(tmp_path, "[[rule]]\n" + body))
