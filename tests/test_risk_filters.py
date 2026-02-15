from bot.exchange.filters import SymbolFilters, ensure_min_notional, round_step, round_step_up
from bot.execution.risk import position_size


def test_round_step_down():
    assert round_step(1.2345, 0.01) == 1.23


def test_round_step_up_for_min_notional_case():
    assert round_step_up(1.231, 0.01) == 1.24


def test_position_size_respects_filters():
    filters = SymbolFilters(min_notional=10, step_size=0.001, min_qty=0.001, tick_size=0.01)
    qty = position_size(1000, 0.01, 100, 95, filters)
    assert qty >= filters.min_qty
    assert ensure_min_notional(100, qty, 10)


def test_position_size_returns_zero_if_notional_unreachable():
    filters = SymbolFilters(min_notional=1000, step_size=0.1, min_qty=0.1, max_qty=1.0, tick_size=0.01)
    qty = position_size(100, 0.001, 100, 99, filters)
    assert qty == 0.0
