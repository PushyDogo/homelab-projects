import pytest


@pytest.fixture(autouse=True)
def isolated_config(tmp_path, monkeypatch):
    """Keep tests from reading the real ~/.config/finance-tracker/config.toml."""
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "config"))
