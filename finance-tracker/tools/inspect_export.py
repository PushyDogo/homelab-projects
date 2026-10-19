#!/usr/bin/env python3
"""Print the structure of JSON/NDJSON files inside an SMS export zip.

Only key paths, value types and occurrence counts are printed. No field
values ever leave this script, so the output is safe to share.

Usage: python tools/inspect_export.py ~/Messages/messages-2026-09-23.zip
"""

import io
import json
import sys
import zipfile
from collections import Counter, defaultdict

JSON_SUFFIXES = (".json", ".ndjson", ".jsonl")


def type_name(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    return "object"


def walk(value, path, schema):
    """Record the type of `value` at `path`, recursing into objects and arrays."""
    schema[path][type_name(value)] += 1
    if isinstance(value, dict):
        for key, child in value.items():
            walk(child, f"{path}.{key}" if path else key, schema)
    elif isinstance(value, list):
        for child in value:
            walk(child, f"{path}[]", schema)


def iter_records(stream, name):
    """Yield top-level records from an NDJSON file or a JSON array/object."""
    if name.endswith(".json"):
        data = json.load(stream)
        yield from data if isinstance(data, list) else [data]
        return
    for line in stream:
        line = line.strip()
        if line:
            yield json.loads(line)


def inspect_member(archive, info):
    schema = defaultdict(Counter)
    records = 0
    with archive.open(info) as raw:
        stream = io.TextIOWrapper(raw, encoding="utf-8")
        for record in iter_records(stream, info.filename):
            records += 1
            walk(record, "", schema)

    print(f"\n=== {info.filename}  ({info.file_size:,} bytes, {records:,} records)")
    for path, types in sorted(schema.items()):
        if not path:
            continue
        seen = sum(types.values())
        type_list = ", ".join(f"{t}:{n:,}" for t, n in types.most_common())
        print(f"  {path:<45} {seen:>9,}  [{type_list}]")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    with zipfile.ZipFile(sys.argv[1]) as archive:
        members = archive.infolist()
        json_members = [m for m in members if m.filename.lower().endswith(JSON_SUFFIXES)]

        # Summarise non-JSON entries (e.g. MMS attachments) by extension only.
        other = Counter(
            m.filename.rsplit(".", 1)[-1].lower() if "." in m.filename else "(none)"
            for m in members
            if m not in json_members and not m.is_dir()
        )
        print(f"Zip entries: {len(members):,} ({len(json_members)} JSON)")
        for ext, count in other.most_common():
            print(f"  other .{ext}: {count:,}")

        for info in json_members:
            inspect_member(archive, info)


if __name__ == "__main__":
    main()
