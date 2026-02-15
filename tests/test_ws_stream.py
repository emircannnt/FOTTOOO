import logging

import pytest

pytest.importorskip('websockets')

from bot.exchange.ws_stream import KlineStream


def test_combined_stream_url_format():
    stream = KlineStream('wss://testnet.binance.vision', ['BTCUSDT', 'ETHUSDT'], '1h', logging.getLogger('t'))
    assert '/stream?streams=' in stream.url
    assert 'btcusdt@kline_1h' in stream.url
    assert 'ethusdt@kline_1h' in stream.url
