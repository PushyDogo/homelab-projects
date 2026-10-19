#!/usr/bin/env python3
"""Run every bank SMS parser over an export and report coverage.

Prints only counts. Messages that mention money but match no template are
written, with digits and VPAs masked, to local/unparsed-<BANK>.txt (0600).

Usage: uv run tools/sms_coverage.py ~/Messages/messages-2026-09-23.zip
"""

import sys
from collections import Counter, defaultdict
from pathlib import Path

from find_templates import mask_structured, write_private

from finance_tracker.sms.export import read_export
from finance_tracker.sms.registry import PARSERS


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    statuses = defaultdict(Counter)
    templates = defaultdict(Counter)
    reasons = defaultdict(Counter)
    unknown = defaultdict(list)

    for sms in read_export(sys.argv[1]):
        parser = PARSERS.get(sms.header)
        if parser is None:
            continue
        result = parser.parse(sms.body, sms.received_at.date())
        bank = parser.BANK
        statuses[bank][result.status] += 1
        if result.status == "parsed":
            templates[bank][result.transaction.template] += 1
        elif result.status == "ignored":
            reasons[bank][result.reason] += 1
        else:
            unknown[bank].append(f"[{sms.header}] {mask_structured(sms.body)}")

    for bank in statuses:
        total = sum(statuses[bank].values())
        print(f"\n{bank}: {total} SMS — " + ", ".join(f"{s} {n}" for s, n in statuses[bank].most_common()))
        print("  parsed:  " + ", ".join(f"{name} {n}" for name, n in templates[bank].most_common()))
        print("  ignored: " + ", ".join(f"{reason} {n}" for reason, n in reasons[bank].most_common()))
        out = Path("local") / f"unparsed-{bank}.txt"
        write_private(out, "\n".join(sorted(unknown[bank])) + "\n")
        if unknown[bank]:
            print(f"  {len(unknown[bank])} unknown → {out}")


if __name__ == "__main__":
    main()
