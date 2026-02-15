from __future__ import annotations

from dataclasses import dataclass

from bot.config import Settings
from bot.strategy.indicators import atr, ema


@dataclass
class Signal:
    symbol: str
    entry_price: float
    stop_price: float
    atr_value: float
    breakout_level: float
    reason: str


def compute_signal(symbol: str, klines: list[dict], settings: Settings) -> Signal | None:
    if len(klines) < max(settings.breakout_n + 1, settings.atr_period + 2, 55):
        return None

    closes = [float(k['close']) for k in klines]
    highs = [float(k['high']) for k in klines]
    lows = [float(k['low']) for k in klines]

    ema20 = ema(closes, 20)[-1]
    ema50 = ema(closes, 50)[-1]
    close = closes[-1]

    if not (close > ema50 and ema20 > ema50):
        return None

    atr_values = atr(highs, lows, closes, settings.atr_period)
    atr_now = atr_values[-1]

    recent_high = max(highs[-(settings.breakout_n + 1):-1])
    breakout_level = recent_high + settings.breakout_buffer_atr * atr_now

    if close <= breakout_level:
        return None

    stop_price = close - settings.atr_mult * atr_now
    return Signal(
        symbol=symbol,
        entry_price=close,
        stop_price=stop_price,
        atr_value=atr_now,
        breakout_level=breakout_level,
        reason='breakout_with_trend',
    )
