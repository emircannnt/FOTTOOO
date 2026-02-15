import os

import pytest

requests = pytest.importorskip('requests')

from bot.config import Settings
from bot.exchange.binance_client import BinanceClient


@pytest.mark.integration
def test_testnet_smoke_ping_exchangeinfo():
    if os.getenv('RUN_INTEGRATION', 'false').lower() != 'true':
        pytest.skip('Set RUN_INTEGRATION=true to run smoke test')

    settings = Settings(testnet=True, dry_run=True)
    client = BinanceClient(settings)
    assert client.ping() == {}
    info = client.exchange_info('BTCUSDT')
    assert info['symbols'][0]['symbol'] == 'BTCUSDT'
