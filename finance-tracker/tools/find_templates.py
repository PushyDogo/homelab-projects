#!/usr/bin/env python3
"""Group one sender's SMS into masked templates and write them to a local file.

Masking applied to every message before grouping:
  - URLs            -> <URL>
  - VPAs / emails   -> <VPA>
  - month names     -> <MON>
  - digit runs      -> <N>     (amounts, dates, account digits, reference numbers)
  - rare words      -> <W>     (words found in fewer than --min-share of the
                                sender's messages; catches most names/merchants)

Heuristic masking can still leave frequent names (e.g. a person you pay
often) visible, so the output goes to a file with 0600 permissions for you to
review before sharing. Nothing but a summary is printed to the terminal.

Usage: uv run tools/find_templates.py ~/Messages/messages-2026-09-23.zip \
           [--header ICICIT] [--min-share 0.02] [--out local/templates-ICICIT.txt]
"""

import argparse
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

from finance_tracker.sms.export import read_export

URL = re.compile(r"\b(?:https?://|www\.)\S+|\b[\w-]+\.(?:com|in|co|me|ly)/\S*", re.I)
VPA = re.compile(r"\b[\w.+-]+@[\w.-]+\b")
MONTH = re.compile(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b", re.I)
NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")
WORD = re.compile(r"[A-Za-z][A-Za-z'&]*")
REPEATED_W = re.compile(r"<W>(?:[\s.&'/-]*<W>)+")


def mask_structured(body):
    body = URL.sub("<URL>", body)
    body = VPA.sub("<VPA>", body)
    body = MONTH.sub("<MON>", body)
    body = NUMBER.sub("<N>", body)
    return " ".join(body.split())


def words_in(text):
    """Plain words in `text`, excluding the placeholders we inserted."""
    return {w.lower() for w in WORD.findall(re.sub(r"<[A-Z]+>", " ", text))}


def mask_rare_words(text, common):
    def replace(match):
        # Leave placeholder names like <URL> intact.
        start, end = match.span()
        if start > 0 and text[start - 1] == "<" and text[end : end + 1] == ">":
            return match.group()
        return match.group() if match.group().lower() in common else "<W>"

    return REPEATED_W.sub("<W>", WORD.sub(replace, text))


def write_private(path, text):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("zip_path")
    parser.add_argument("--header", default="ICICIT", help="DLT header without prefix/suffix")
    parser.add_argument("--min-share", type=float, default=0.02,
                        help="words in fewer than this share of messages are masked")
    parser.add_argument("--out", type=Path, help="output file (default local/templates-<HEADER>.txt)")
    args = parser.parse_args()

    header = args.header.upper()
    out = args.out or Path("local") / f"templates-{header}.txt"

    messages = [
        (sms.received_at, mask_structured(sms.body))
        for sms in read_export(args.zip_path)
        if sms.header == header
    ]
    if not messages:
        raise SystemExit(f"No received SMS found for header {header}")

    doc_freq = Counter(w for _, text in messages for w in words_in(text))
    min_docs = max(10, int(len(messages) * args.min_share))
    common = {w for w, n in doc_freq.items() if n >= min_docs}

    groups = defaultdict(list)
    for date, text in messages:
        groups[mask_rare_words(text, common)].append(date)

    lines = [
        f"# {len(messages)} SMS from {header}, {len(groups)} templates "
        f"(words in < {min_docs} messages masked as <W>)",
        "# REVIEW BEFORE SHARING: frequent names or merchants may still be visible.",
        "",
    ]
    for template, dates in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        lines.append(f"[{len(dates):>4}x  {min(dates):%Y-%m} → {max(dates):%Y-%m}]")
        lines.append(template)
        lines.append("")

    write_private(out, "\n".join(lines))
    print(f"{len(messages)} SMS from {header} → {len(groups)} templates")
    print(f"Written to {out} (mode 0600). Review it before sharing anything.")


if __name__ == "__main__":
    main()
