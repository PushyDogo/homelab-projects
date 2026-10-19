"""Read received SMS from an "SMS Import / Export" zip (messages.ndjson)."""

import io
import json
import re
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# DLT sender IDs: optional 2-char operator/circle prefix, the alphanumeric
# header, and an optional 1-char category suffix (-S service, -T transactional,
# -P promotional, -G government). E.g. "AX-ICICIT", "JD-ICICIT-S".
DLT_PATTERN = re.compile(r"^(?:[A-Z0-9]{2}-)?([A-Z0-9]{3,11})(?:-[A-Z])?$")
RECEIVED = "1"


@dataclass(frozen=True)
class Sms:
    address: str            # raw sender as stored on the phone
    header: str | None      # DLT header (e.g. "ICICIT"); None for phone numbers
    received_ms: int        # Unix epoch milliseconds, as stored by Android
    body: str

    @property
    def received_at(self) -> datetime:
        return datetime.fromtimestamp(self.received_ms / 1000)


def sender_header(address: str) -> str | None:
    """Return the DLT header for a commercial sender, or None for phone numbers."""
    match = DLT_PATTERN.match(address.strip().upper())
    if not match or not re.search(r"[A-Z]", match.group(1)):
        return None
    return match.group(1)


def read_export(zip_path: str | Path) -> Iterator[Sms]:
    """Yield received SMS (MMS and sent/draft messages are skipped)."""
    with zipfile.ZipFile(zip_path) as archive, archive.open("messages.ndjson") as raw:
        for line in io.TextIOWrapper(raw, encoding="utf-8"):
            if not line.strip():
                continue
            record = json.loads(line)
            # MMS records have no "body"; type "1" is the inbox.
            if "body" not in record or record.get("type") != RECEIVED:
                continue
            address = record.get("address", "")
            yield Sms(
                address=address,
                header=sender_header(address),
                received_ms=int(record["date"]),
                body=record["body"],
            )
