from bot.config import Settings
from bot.strategy.breakout_atr import compute_signal


def _kline(price: float):
    return {'open': price - 1, 'high': price + 1, 'low': price - 2, 'close': price, 'volume': 1}


def test_breakout_trigger_generates_signal():
    settings = Settings()
    prices = [100 + i * 0.5 for i in range(80)]
    klines = [_kline(p) for p in prices]
    klines[-1]['close'] = max(k['high'] for k in klines[-21:-1]) + 5
    signal = compute_signal('BTCUSDT', klines, settings)
    assert signal is not None
    assert signal.stop_price < signal.entry_price


def test_no_signal_without_trend_filter():
    settings = Settings()
    prices = [100 - i * 0.2 for i in range(80)]
    klines = [_kline(p) for p in prices]
    signal = compute_signal('BTCUSDT', klines, settings)
    assert signal is None
