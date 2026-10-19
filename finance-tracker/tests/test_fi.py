import pytest

from finance_tracker.fi import Plan, calculate


def test_zero_return_and_inflation_is_a_plain_sum():
    result = calculate(Plan(monthly_payout=50_000, inflation=0, years=10, annual_return=0))
    assert result.corpus == pytest.approx(50_000 * 120)
    assert result.first_monthly == result.last_monthly == 50_000


def test_inflation_raises_the_payout_each_year():
    result = calculate(Plan(monthly_payout=100_000, inflation=6, years=3, annual_return=0))
    assert result.first_monthly == pytest.approx(100_000)
    assert result.last_monthly == pytest.approx(100_000 * 1.06 ** 2)
    assert result.corpus == pytest.approx(12 * 100_000 * (1 + 1.06 + 1.06 ** 2))


def test_returns_reduce_the_corpus_needed_and_it_runs_down_to_zero():
    plan = Plan(monthly_payout=100_000, inflation=6, years=30, annual_return=8)
    result = calculate(plan)
    assert result.corpus < result.total_paid
    assert result.yearly_balance[0] == pytest.approx(result.corpus)
    assert result.yearly_balance[-1] == pytest.approx(0, abs=1)
    assert len(result.yearly_balance) == 31


def test_starting_later_inflates_the_first_payout():
    later = calculate(Plan(monthly_payout=100_000, inflation=6, years=20, annual_return=7, start_in_years=10))
    now = calculate(Plan(monthly_payout=100_000, inflation=6, years=20, annual_return=7))
    assert later.first_monthly == pytest.approx(100_000 * 1.06 ** 10)
    assert later.corpus == pytest.approx(now.corpus * 1.06 ** 10)
    assert later.corpus_in_todays_money == pytest.approx(now.corpus)


def test_empty_plan():
    assert calculate(Plan(monthly_payout=0, inflation=6, years=30, annual_return=7)).corpus == 0


def test_needed_today_discounts_a_future_corpus_at_the_expected_return():
    later = calculate(Plan(monthly_payout=100_000, inflation=6, years=20, annual_return=7, start_in_years=10))
    assert later.needed_today == pytest.approx(later.corpus / 1.07 ** 10)
    now = calculate(Plan(monthly_payout=100_000, inflation=6, years=20, annual_return=7))
    assert now.needed_today == pytest.approx(now.corpus)
