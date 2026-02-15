from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_DOWN, ROUND_UP


@dataclass
class SymbolFilters:
    min_notional: float
    step_size: float
    min_qty: float
    tick_size: float
    max_qty: float | None = None
    min_price: float | None = None
    max_price: float | None = None


def _quantize(value: float, step: float, rounding: str) -> float:
    if step <= 0:
        return value
    d_value = Decimal(str(value))
    d_step = Decimal(str(step))
    return float((d_value / d_step).to_integral_value(rounding=rounding) * d_step)


def round_step_down(value: float, step: float) -> float:
    return _quantize(value, step, ROUND_DOWN)


def round_step_up(value: float, step: float) -> float:
    return _quantize(value, step, ROUND_UP)


def round_step(value: float, step: float) -> float:
    return round_step_down(value, step)


def round_tick(price: float, tick_size: float) -> float:
    return round_step_down(price, tick_size)


def ensure_min_notional(price: float, qty: float, min_notional: float) -> bool:
    return price * qty >= min_notional


def format_by_step(value: float, step: float) -> str:
    decimals = max(0, -Decimal(str(step)).as_tuple().exponent)
    return f'{value:.{decimals}f}'


def parse_symbol_filters(symbol_info: dict) -> SymbolFilters:
    filters = {f['filterType']: f for f in symbol_info['filters']}
    lot = filters['LOT_SIZE']
    price_filter = filters['PRICE_FILTER']
    min_notional_filter = filters.get('MIN_NOTIONAL') or filters.get('NOTIONAL') or {'minNotional': '0'}
    return SymbolFilters(
        min_notional=float(min_notional_filter['minNotional']),
        step_size=float(lot['stepSize']),
        min_qty=float(lot['minQty']),
        max_qty=float(lot.get('maxQty', '0')) if lot.get('maxQty') else None,
        tick_size=float(price_filter['tickSize']),
        min_price=float(price_filter.get('minPrice', '0')) if price_filter.get('minPrice') else None,
        max_price=float(price_filter.get('maxPrice', '0')) if price_filter.get('maxPrice') else None,
    )
