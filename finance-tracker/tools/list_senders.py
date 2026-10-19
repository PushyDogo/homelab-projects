#!/usr/bin/env python3
"""List commercial SMS sender IDs in an SMS export zip, with message counts.

Only alphanumeric sender IDs (DLT headers such as "AX-ICICIT" or "JD-HDFCBK-S")
are printed. Personal phone numbers are counted but never printed, and no
message bodies are printed.

Usage: uv run tools/list_senders.py ~/Messages/messages-2026-09-23.zip [filter]
       filter: optional case-insensitive substring, e.g. "icici"
"""

import sys
from collections import Counter, defaultdict

from finance_tracker.sms.export import read_export


def main():
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    needle = sys.argv[2].lower() if len(sys.argv) == 3 else None

    counts = Counter()
    variants = defaultdict(set)
    first_seen = {}
    last_seen = {}
    personal = 0

    for sms in read_export(sys.argv[1]):
        if sms.header is None:
            personal += 1
            continue
        if needle and needle not in sms.header.lower():
            continue
        header = sms.header
        counts[header] += 1
        variants[header].add(sms.address.strip().upper())
        first_seen[header] = min(first_seen.get(header, sms.received_at), sms.received_at)
        last_seen[header] = max(last_seen.get(header, sms.received_at), sms.received_at)

    print(f"{'HEADER':<12} {'SMS':>6}  {'FIRST':<7}  {'LAST':<7}  SENDER IDS")
    for header, count in counts.most_common():
        print(
            f"{header:<12} {count:>6}  {first_seen[header]:%Y-%m}  {last_seen[header]:%Y-%m}  "
            f"{', '.join(sorted(variants[header]))}"
        )
    print(f"\n{len(counts)} commercial senders; {personal} SMS from phone numbers (not listed)")


if __name__ == "__main__":
    main()
