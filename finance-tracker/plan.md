# Personal Finance Tracker — Plan

Local-only, single-user personal finance app. This is a living document; each section notes feasibility and approach in brief.

---

## Decisions so far

- **Institutions in scope:** HDFC, ICICI, SBI and IndusInd banks, plus FDs and Zerodha. All four banks are now parsed from SMS.
- **Data sources:**
  - **SMS**, for day-to-day transactions (UPI, cards, account debits and credits). This is milestone 1.
  - **Email** (read-only IMAP), for monthly statements, FD advices and Zerodha/CAS. This comes later.
- **SMS transport:** an Android app exports SMS to a local file, and Syncthing copies it to the PC over the LAN. There's no cloud anywhere in the path.
- **Run model:** no server. The app ingests new data **on computer start/login**, then runs on demand. There's no real-time sync.
- **Incremental sync:** each run resumes from a persisted checkpoint (see §6).
- **Third-party importers/libraries:** allowed if they're popular, actively maintained and have a clean security record.

---

## 1. Expenditure tracking (UPI, credit/debit cards, multiple banks)

**Feasibility: ✅ Feasible via SMS. Live bank APIs are ❌ unavailable to individuals, and the Account Aggregator framework requires regulated FIUs that route data through their cloud.**

- **Why SMS:**
  - RBI mandates an alert for every debit and credit, so coverage is complete across all four banks, including UPI and cards.
  - Messages are short and template-based.
  - Senders use registered DLT IDs (e.g. `XX-ICICIB`), which makes filtering easy.
- **ICICI (first trial):**
  - Collect sample SMS for each type: UPI debit, UPI credit, debit card, credit card, NEFT/IMPS and ATM.
  - Write regex/template parsers, and freeze redacted samples as test fixtures.
- **Limits:**
  - History only goes as far back as the SMS on the phone.
  - OTP and promo messages must be filtered out.
  - Monthly email statements (later) act as reconciliation.
- **Needed:**
  - One parser per bank and message template.
  - De-duplication.
  - Merchant/VPA normalisation.
  - Rule-based categorisation.

## 2. Budgeting (net worth, monthly budgets, accumulating for big expenses)

**Feasibility: ✅ Fully feasible. Pure app logic.**

- **Envelope budgeting:** monthly category budgets, with rollover of unspent amounts.
- **Sinking funds / goals:** accumulate money toward a big expense, with a target amount and date.
- **Net worth:** assets minus liabilities.
- **FDs: ✅ Feasible (email, later).** Parse FD booking and maturity advices, with manual entry as a fallback. Accrued value is computed locally.
- **Zerodha: ✅ Feasible (email, later).**
  - The monthly CDSL/NSDL CAS, parsed with `casparser`, gives holdings.
  - Contract notes give trades.
  - The Kite Connect API is deferred because it needs a daily login token.

## 3. Forecasting and FI number

**Feasibility: ✅ Feasible. Accuracy improves after 6–12 months of data.**

- **Expense forecasting:** rolling averages plus seasonality first; statsmodels ETS/ARIMA later, all running locally.
- **Recurring detection:** find subscriptions, EMIs, SIPs and rent, and project them forward.
- **FI number:** annual expenses ÷ safe withdrawal rate. For India, use a conservative 3–3.5% SWR, i.e. 28–33× expenses, and account for ~6% inflation. Show years-to-FI from the current savings rate.

## 4. Local database (SQLite)

**Feasibility: ✅ Ideal fit.**

- SQLite + **SQLCipher** for encryption at rest, via `sqlcipher3`.
  - Its wheel bundles SQLCipher 4.12 and OpenSSL 3.6.0 statically, and it can't use the system library even when built from source. Updates therefore come through `uv lock --upgrade-package sqlcipher3`, not pacman.
  - The system `sqlcipher` CLI is still handy for inspecting the DB by hand.
- The DB lives at `~/.local/share/finance-tracker/finance.db` (mode 0600). A random 256-bit raw key is stored in KWallet (`finance-tracker/db-key`). **Back that key up** (e.g. in a password manager): losing it means losing the DB.
- **Migrations** are plain SQL steps in `db.py`, tracked by `PRAGMA user_version`. They replace SQLAlchemy + Alembic, which would be two fewer dependencies for a small schema.
- **Amounts** are stored as integer minor units (paise).
- Local encrypted backups: later.

## 5. Security (local-only, pull-only)

**Feasibility: ✅ Feasible by design.**

- The app binds to `127.0.0.1` only, with no telemetry and no CDN assets.
- **SMS path:** phone → Syncthing (LAN, end-to-end encrypted, no relays) → PC.
  - Disable Syncthing global discovery and relays so traffic stays on the LAN.
  - The SMS export app must have **no internet permission**, or at least never have cloud backup configured.
- **SMS export files are sensitive plaintext.** Keep them in a restricted directory (`chmod 700`), and consider deleting them after ingestion.
- **Secrets** (DB key, and later IMAP credentials and PDF passwords) live in the OS keyring (`keyring` → Secret Service/KWallet).
- **Zerodha (Kite Connect):** this is the only network access the app has.
  - Only the UI process makes these calls, and only when you click Connect or Refresh.
  - Hosts: `kite.zerodha.com` (login in your browser) and `api.kite.trade` (token exchange plus three read-only GET endpoints).
  - The client is our own stdlib code with no order endpoints.
  - The API key, secret and daily access token live in KWallet.
  - The login callback only accepts a `state` this UI generated in the last 10 minutes.
  - The sync service remains fully offline (`PrivateNetwork=yes`).
- **Email (later):** IMAP opens mailboxes read-only (`EXAMINE`). Gmail auth is still undecided: an app password, or OAuth with `gmail.readonly`.
- Pinned, audited dependencies.
- Any categorisation LLM must be local.

## 6. Sync mechanism (on startup and checkpointing)

**Feasibility: ✅ Feasible.**

- **Trigger:** a systemd **user** service run at login (or a timer with `OnStartupSec`). It's a one-shot ingest; the UI is launched separately.
- **SMS checkpoint:**
  - Each export is a full snapshot, so the app processes only messages with `date > last_sms_timestamp`, stored in the `sync_state` table.
  - It also keeps a small overlap window to tolerate clock or export quirks.
- **Idempotency:**
  - Record every processed SMS in `processed_messages`, keyed by a hash of (sender, timestamp, body), with its status (`parsed`, `skipped`, `failed`) and the parser version.
  - Re-runs are safe, and failed messages can be retried after parser fixes.
- **Stale export:** if the export file hasn't changed since the last run, skip it and warn that the phone hasn't synced.
- **Commit order:** update the checkpoint in the same DB transaction as the parsed transactions.
- **Email (later):** checkpoint per mailbox on `UIDVALIDITY` + `last_uid`, with `Message-ID` for idempotency.

---

## Proposed stack (initial)

- **Language:** Python 3.14, managed with **uv** (`pyproject.toml` + `uv.lock` for pinned dependencies).
- **Phone side:**
  - An SMS export app. Candidates:
    - **SMS Import / Export**: open-source, on F-Droid, exports JSON.
    - **SMS Backup & Restore**: very popular, closed-source, exports XML.
    - Preference is the open-source one if it supports scheduled export. To verify.
  - **Syncthing-Fork** (the official Syncthing Android app was discontinued in late 2024).
- **SMS parsing:** stdlib `json`/`xml` + `re`, with no extra dependencies.
- **Email/PDF (later):** `imap-tools`, `pikepdf`, `pdfplumber`, `casparser`.
- **DB:** SQLite + SQLCipher (`sqlcipher3`), raw SQL with `user_version` migrations. `keyring` for the DB key.
- **UI:** NiceGUI (Python-only; Vue/Quasar/ECharts bundled in the package, no CDN), in `finance_tracker.ui`, launched with `finance-tracker ui`. It serves on 127.0.0.1 only.

## Progress

- ✅ **Phone → PC sync:** SMS Import / Export and Syncthing are working; exports land in `~/Messages/*.zip` (`messages.ndjson` inside).
- ✅ **SMS reader:** `finance_tracker.sms.export` yields received SMS with a parsed DLT header.
- ✅ **ICICI parser:** `finance_tracker.sms.icici` covers 17 templates. Against the real export (1,532 ICICIT SMS, 2023-10 → 2026-09): 1,368 parsed, 164 ignored as non-transactions, 0 unknown. Tests use synthetic samples only.
- **Tools:** in `tools/` (`list_senders`, `find_templates`, `sms_coverage`). They only print counts or structure; anything detailed is written to `local/` with mode 0600.
- ✅ **Encrypted DB + sync job:** `finance-tracker init | sync | stats`.
  - First real sync: 1,367 transactions across 1 bank account and 2 credit cards, 164 ignored, 1 duplicate.
  - Re-runs skip an unchanged export.
  - After a successful sync, **older exports are deleted automatically**. The latest one is kept, and a failed sync deletes nothing.
- ✅ **Transaction kinds** (`classify.py`, re-run on every sync):
  - Each transaction is an expense, income, refund or transfer.
  - Transfers are excluded from spend and income: card bill payments (the card credit plus the matched bank debit, within −3/+1 days, same amount), FD bookings and closures, and "Indian Clearing" investments.
  - Card purchases therefore count once, when they happen.
  - Real data over 3 years: ₹34L spent, ₹66.8L income, ₹182L of transfers excluded.
- ✅ **All four banks** (`sms/templates.py` shared engine, plus `icici.py`, `hdfc.py`, `sbi.py`, `indusind.py`, and a `registry.py` mapping DLT headers to parsers):
  - Coverage on the real export: 0 unknown messages across 1,821 bank SMS.
  - Newly supported headers get their full history backfilled (`sync_headers` table).
  - Formats without a date use the SMS received date.
  - Skipped as duplicates of another SMS: SBI's IT-refund notices (the receiving bank sends its own credit SMS) and IndusInd's "credited to beneficiary" confirmations.
- ✅ **Own-transfer detection:**
  - Your names (in `~/.config/finance-tracker/config.toml`) mark a debit to you, or a credit from you, as a transfer. Credits name you as the beneficiary too (salary), so only sender positions count for credits.
  - A debit to one of your other accounts' numbers is a transfer.
  - Same-amount debit/credit pairs across your accounts (−1/+3 days) are linked as one transfer.
  - SBI term-deposit accounts are flagged from "TDR/STDR created" and "Closure of TD" SMS, and excluded from bank balance.
- ✅ **UI theme switch** (system/light/dark), stored in a cookie.
- ✅ **User rules** (`[[rule]]` in `config.toml`: match on payee text plus optional direction, bank and amount; set kind and/or category). Current rules:
  - `GIB*` and `CBDTTAX` → Tax.
  - XX551 and ₹35k `BIL*NEFT*ICIC` → Rent.
  - Parents' lump sums ≥ ₹1L → transfer ("Family funds").
- ✅ **SBI fixed deposits:** each TDR gets its own account number. These show as "SBI FD ·xxxx", money in or out is labelled FD booked/closed, and they're excluded from bank balance.
- ✅ **Shared card limit:** ICICI ·7004 (Mastercard) and ·4008 (AmEx) share one limit; both show the latest limit reported by either.
- ✅ **Redesign** (inspired by depobudget.com): neo-brutalist cream/ink palette, 2.5px borders, hard offset shadows, accent blocks, Archivo Black + DM Sans (bundled locally, OFL). Dark mode inverts ink to cream.
- ✅ **Deposits tab** (`deposits.py`): FDs rebuilt per bank from SMS.
  - ICICI: opened plus "FD clos" SMS. HDFC: "FD through NET" plus auto-redeem. SBI: TDR created/maturing/closure. IndusInd: booked/renewed plus interest payouts.
  - Shows principal, dates, payout and interest. 14 active FDs, ₹1.49Cr known principal.
  - SBI FDs moved off the Accounts page.
- ✅ **PPF:** entered by hand on the Deposits tab (entries: opening balance, deposit, yearly interest credit). It follows PPF rules:
  - Interest accrues monthly at `[ppf] rate` (default 7.1%) on the balance as of the 5th.
  - It's credited only on 31 March.
  - Deposits are capped at ₹1.5L per financial year, and the cap is enforced.
  - If your first entry comes mid-year, its balance is assumed for the earlier months (and flagged).
- ✅ **FD fixes:**
  - ICICI "TRF TO FD" bookings with no "opened" SMS still create an FD; a later unmatched closure is adopted if the payout fits.
  - SBI plain transfers that fund a new TDR are labelled FD bookings.
  - SBI's duplicate "Closure of TD" credit SMS are dropped (schema step 6 also cleans up past ones).
  - The Overview shows FDs active/closed from the FD records, instead of summing booking/closure money flows (those don't reconcile: renewals, pre-history FDs, and interest in payouts).
- ✅ **Investments tab** (`kite.py`, `investments.py`):
  - Zerodha via Kite Connect: holdings, Coin MFs and cash, stored as snapshots.
  - Shows value, invested, P&L, day change and an allocation chart.
  - Set up with `finance-tracker zerodha setup`, then Connect in the UI (daily login).
- ✅ **Net worth tab** (`networth.py`, `fi.py`):
  - Net worth = bank (latest SMS balance per account) + open FDs + PPF + latest Zerodha snapshot.
  - Card balances aren't subtracted: purchases already count as spending.
  - The month-on-month change excludes investments until a snapshot exists for both months.
  - Same-day balances are ordered by SMS received time.
  - **Financial-independence calculator:** monthly payout in today's money, inflation, payout years, return on savings and start delay give the corpus needed (present value of inflation-indexed payouts, compounded monthly) and how much of it your net worth covers, with a drawdown chart. Inputs persist in the `settings` table.
- ✅ **Investments:** separate Stocks and Mutual funds sections, each with subtotals, and an allocation donut. All MFs come through Coin (Kite `/mf/holdings`); INDmoney isn't used.
- ✅ **Overview chart:** exactly the last 12 months, every month labelled, no scroll-zoom.
- ✅ **Audit (2026-09-23):**
  - FI calculator verified against an independent year-by-year formula and a month-by-month drawdown (agree to ~1e-15; the balance ends at ₹0). Coverage now compares net worth with the corpus discounted to today.
  - Running-balance check per account: 0 direction flips and 0 ordering errors.
  - Fixed:
    - CRED card-bill payments double-counted as spending (~₹53.7k, 7 payments).
    - A duplicated ₹35k rent (ICICI's bare "credit via" copy).
  - Pages reconcile with each other (Overview/Transactions, Accounts/Net worth, Deposits/Net worth, Investments/Net worth).
  - Closed FDs imply 6.65–6.84% p.a.
  - Known data gaps (no SMS from the bank):
    - ICICI +₹1.32L (May 2024, likely salary) and ±₹10L (Jun–Jul 2024).
    - SBI +₹10L (Mar 2025) and −₹25L (29 May–6 Jun 2026, destination unknown).
    - IndusInd sends no balances.
- ✅ **Follow-up fixes (2026-09-23):**
  - Investments now recognise every Zerodha payee spelling ("Indian Clearing", "IndianClearingC", "ICCL ZERODHA…", "Zerodha Broking"): ₹9.52L over 67 payments, of which ₹2.82L was previously counted as spending.
  - FD corrections (`fd_adjustments`, Deposits tab) add FDs with no SMS or fix amounts/closures, applied everywhere FDs are used. Recorded:
    - IndusInd …3769 = ₹1.5L tax-saver.
    - SBI FD ₹25L (no SMS, dated 6 Jun 2026).
    - Totals: ICICI ₹66L, HDFC ₹66L, SBI ₹44L.
  - Deposits are grouped by bank with subtotals.
  - PPF: same-day entries apply in the order added (a deposit after a same-day balance now adds). The ₹1.5L deposit-limit UI was removed.
  - Investments: separate Sovereign Gold Bonds section (SGB* holdings from Zerodha). No SGB SMS exist.
- ✅ **Budgets tab** (`budgets.py`, `budget_categories` table):
  - Each category gets % × monthly income base every month from its start month. Refunds return to their category; transfers never count.
  - Two kinds (`rollover` column, schema step 11):
    - **Monthly essentials** (rent, groceries, bills, transport, health): a fresh allowance each month.
    - **Savings pots for wants**: unspent money carries over for bigger purchases, with optional goals.
  - Transactions match by merchant keyword (longest keyword wins) or by `category:<name>` from your rules.
  - The income base defaults to the median of the last 6 complete months' income, and is editable.
  - Defaults use the low end of commonly cited ranges (50/30/20): 55% budgeted, 45% saved.
  - Categories can be added, edited and deleted, with keywords, start month and an optional savings goal ("N more months at this rate").
  - Month-by-month history, plus "not in any budget" payees to help refine keywords.
- ✅ **Transaction filters:**
  - Type, period shortcuts (this/last month, last 3/12 months, this year, all time) or custom dates, budget (or "not in any budget"), account, channel, amount range, and search (payee, reference, account, category, budget). The search is server-side, so totals follow it.
  - Every filter is settable from the URL (`/transactions?budget=6&period=this_month`), and there's a Budget column.
  - Budget cards open `/transactions?budget=<id>`. Each card's this-month total reconciles exactly with its filtered list.
- ✅ **ruff** (dev dependency) checks for undefined names: `uv run ruff check --select F src tests tools`.
- ✅ **Transactions page:** "Sort by" control, amount sorted by size, category column. The chart stacks spending by category. Paired transfers are counted once in totals.
- ✅ **Read-only UI** (`finance-tracker ui` → http://127.0.0.1:8321):
  - Overview: KPIs, message-status chips, a monthly debit/credit chart, debits by channel.
  - Transactions: filters and search. A row opens the parsed fields next to the original SMS.
  - Messages: filterable by status.
  - Accounts: balance or limit, totals.
  - Verified: no external URLs in served pages, listening on 127.0.0.1 only.
- ✅ **Sync service enabled** (2026-09-23), running under its sandbox (no network, read-only system):
  - `finance-tracker-sync.service` runs at login (graphical-session.target, after KWallet is up).
  - `finance-tracker-sync.path` re-runs it whenever `~/Messages` changes, so exports Syncthing delivers mid-session are ingested right away.
  - Logs: `journalctl --user -u finance-tracker-sync`.
- ✅ **UI service enabled** (`finance-tracker-ui.service`): http://127.0.0.1:8321 whenever you're logged in, restarted on failure.
  - It keeps network access (for Zerodha refreshes only) but is limited to ordinary sockets.
  - Writes are limited to the DB directory.
- ✅ **Sandbox fix:** `ProtectSystem=strict` alone left `/home` writable in user services (verified with a test write). Both units now add `ProtectHome=read-only`, so only the DB directory (and `~/Messages` for the sync) is writable.
- ✅ **Expense categories:** named groups of budget categories (migration 12, `expense_groups`; a budget belongs to at most one). The overview chart stacks spending by them, falling back to the rule category (e.g. Tax) and then Other. Bars are clickable: they open Transactions filtered by `group` and that month. Defaults: Home, Food, Transport & travel, Health, Lifestyle.

**Findings to carry forward:**
- Android's `contains_otp` is always `"0"`, so it's useless. Detect OTPs from the text instead.
- The same bank account appears as `XX123` and `XXXX0123`, so account matching must compare suffixes. Two autopay formats don't name the account at all.
- ICICI also sends one duplicate SMS now and then (same ref, amount and date), so the de-duplication key must handle that.
- Future-debit notices ("will be / to be debited", mandates) must stay ignored to avoid double counting.
- **Signals for later features:**
  - "Deposit Acct … opened" and "TRF TO FD" can track FDs.
  - `ACH*<company>` credits are dividends.
  - "Indian Clearing" UPI debits are most likely investment purchases.
  - The CC statement SMS gives the total and minimum due.
- **Internal transfers** (CC bill payment from savings, savings → FD) appear on both sides. They must be marked as transfers, not spending.

## Next steps

1. Edit user rules from the UI; they're config-file only today.
2. Merchant normalisation (`VIN*`, `RSP*`, `RAZ*`, `WWW` prefixes) and rule-based categories.
3. Email sources: CC statements, CAS.

## Open questions

- Do you hold an ICICI credit card, or only a savings account?
- Scheduled export frequency on the phone (e.g. daily)?
- Desktop-only UI, or also a view from a phone on the LAN?
