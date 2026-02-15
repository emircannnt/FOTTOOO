from __future__ import annotations

from bot.exchange.filters import SymbolFilters, ensure_min_notional, round_step_down, round_step_up


def position_size(
    equity: float,
    risk_pct: float,
    entry_price: float,
    stop_price: float,
    symbol_filters: SymbolFilters,
) -> float:
    risk_amount = equity * risk_pct
    per_unit_risk = max(entry_price - stop_price, 1e-12)
    raw_qty = risk_amount / per_unit_risk

    qty = round_step_down(raw_qty, symbol_filters.step_size)
    if qty < symbol_filters.min_qty:
        qty = symbol_filters.min_qty

    if not ensure_min_notional(entry_price, qty, symbol_filters.min_notional):
        min_qty_for_notional = symbol_filters.min_notional / entry_price
        qty = round_step_up(min_qty_for_notional, symbol_filters.step_size)
        if qty < symbol_filters.min_qty:
            qty = symbol_filters.min_qty

    if symbol_filters.max_qty and qty > symbol_filters.max_qty:
        qty = round_step_down(symbol_filters.max_qty, symbol_filters.step_size)

    if not ensure_min_notional(entry_price, qty, symbol_filters.min_notional):
        return 0.0

    return qty


def trade_risk(entry_price: float, stop_price: float, qty: float) -> float:
    return max(entry_price - stop_price, 0) * qty
