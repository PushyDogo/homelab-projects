"""Financial independence: the corpus needed to fund an inflation-adjusted monthly payout.

Model (all rates annual, as percentages):
  * You want `monthly_payout` per month in today's money.
  * Payouts start `start_in_years` from now and last `years`.
  * The payout grows with inflation: raised once a year, so each year's monthly
    payout is today's amount × (1 + inflation)^(years elapsed since today).
  * The remaining corpus earns `annual_return`, compounded monthly; payouts are
    taken at the start of each month.

The corpus needed is the present value, at the first payout, of all payouts:
the amount that runs down to exactly zero after the last one.

`needed_today` is that corpus discounted back to today at the same return: what
you'd need invested now (and left to grow) to have the corpus when payouts start.
It's the fair figure to compare with today's savings; for payouts starting now it
equals the corpus.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    monthly_payout: float     # rupees per month, in today's money
    inflation: float          # % per year
    years: int                # how long payouts last
    annual_return: float      # % per year earned on the remaining corpus
    start_in_years: int = 0   # years until payouts begin


@dataclass(frozen=True)
class Result:
    corpus: float                   # rupees needed when payouts start
    corpus_in_todays_money: float   # the same, deflated to today by inflation
    needed_today: float             # the same, discounted to today at the expected return
    first_monthly: float            # first monthly payout (inflated to the start year)
    last_monthly: float             # final year's monthly payout
    total_paid: float               # sum of all payouts
    yearly_balance: list[float]     # corpus at the start of each payout year, then 0 at the end


def monthly_rate(annual_percent: float) -> float:
    return (1 + annual_percent / 100) ** (1 / 12) - 1


def calculate(plan: Plan) -> Result:
    if plan.years <= 0 or plan.monthly_payout <= 0:
        return Result(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, [0.0])
    growth = 1 + plan.inflation / 100
    rate = monthly_rate(plan.annual_return)
    payouts = [plan.monthly_payout * growth ** (plan.start_in_years + month // 12)
               for month in range(plan.years * 12)]
    # Present value at the first payout; payouts at the start of each month (annuity due).
    corpus = sum(p / (1 + rate) ** m for m, p in enumerate(payouts))

    balances, balance = [], corpus
    for month, payout in enumerate(payouts):
        if month % 12 == 0:
            balances.append(balance)
        balance = (balance - payout) * (1 + rate)
    balances.append(max(balance, 0.0))

    return Result(
        corpus=corpus,
        corpus_in_todays_money=corpus / growth ** plan.start_in_years,
        needed_today=corpus / (1 + plan.annual_return / 100) ** plan.start_in_years,
        first_monthly=payouts[0],
        last_monthly=payouts[-1],
        total_paid=sum(payouts),
        yearly_balance=balances,
    )
