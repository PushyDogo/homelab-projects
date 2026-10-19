"""Local web UI entry point. Serves on 127.0.0.1 only."""

from pathlib import Path

from nicegui import app, ui

from . import data

HOST = "127.0.0.1"


def run(port: int = 8321, show: bool = True, db_path: Path | None = None) -> None:
    data.configure(db_path)
    from . import budget_page, pages, wealth_pages  # noqa: F401  (registers the @ui.page routes)

    # Bundled fonts; the UI loads nothing from the internet.
    app.add_static_files("/static", Path(__file__).parent / "static")

    ui.run(
        host=HOST,
        port=port,
        title="Finance Tracker",
        favicon="💰",
        show=show,
        reload=False,
        show_welcome_message=False,
    )
