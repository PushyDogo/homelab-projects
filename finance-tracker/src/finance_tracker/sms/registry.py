"""Which parser handles which DLT sender header."""

from . import hdfc, icici, indusind, sbi

BANK_PARSERS = (icici, hdfc, sbi, indusind)
PARSERS = {header: parser for parser in BANK_PARSERS for header in parser.HEADERS}
