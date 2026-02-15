from bot.strategy.indicators import atr, ema


def test_ema_increasing_series():
    values = [1, 2, 3, 4, 5]
    result = ema(values, period=3)
    assert len(result) == len(values)
    assert result[-1] > result[0]


def test_atr_positive_values():
    highs = [10, 11, 12, 13]
    lows = [9, 10, 11, 12]
    closes = [9.5, 10.5, 11.5, 12.5]
    values = atr(highs, lows, closes, period=2)
    assert values[-1] > 0
