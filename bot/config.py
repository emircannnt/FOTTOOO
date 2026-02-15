from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Literal


def _get_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {'1', 'true', 'yes', 'on'}


def _get_float(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


def _get_int(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


def _load_dotenv(path: str = '.env') -> None:
    env_path = Path(path)
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip())


@dataclass
class Settings:
    app_name: str = 'binance-spot-breakout-bot'
    testnet: bool = True
    dry_run: bool = True
    allow_live_mainnet: bool = False
    api_key: str = ''
    api_secret: str = ''

    base_url_testnet: str = 'https://testnet.binance.vision/api'
    base_url_mainnet: str = 'https://api.binance.com'
    ws_url_testnet: str = 'wss://testnet.binance.vision'
    ws_url_mainnet: str = 'wss://stream.binance.com:9443'

    symbols: list[str] = field(default_factory=lambda: ['BTCUSDT', 'ETHUSDT'])
    timeframe: Literal['1h', '4h'] = '1h'

    risk_pct: float = 0.0075
    atr_mult: float = 2.0
    breakout_n: int = 20
    atr_period: int = 14
    breakout_buffer_atr: float = 0.1

    take_profit_r: float = 3.0
    partial_pct: float = 0.4
    trail_mode: Literal['lowest_low', 'atr'] = 'lowest_low'
    trail_lookback: int = 20
    trail_atr_mult: float = 3.0
    time_stop_candles: int = 10

    max_positions: int = 5
    majors: set[str] = field(default_factory=lambda: {'BTCUSDT', 'ETHUSDT'})
    max_major_positions: int = 2
    global_open_risk_cap: float = 0.03

    entry_order_type: Literal['market', 'stop_limit'] = 'market'
    poll_interval_sec: float = 2.0
    log_level: str = 'INFO'
    log_file: str = 'bot.log'

    recv_window_ms: int = 5000
    http_timeout_sec: int = 10
    rest_max_retries: int = 5
    ws_max_reconnect_delay_sec: int = 30

    @property
    def base_url(self) -> str:
        return self.base_url_testnet if self.testnet else self.base_url_mainnet

    @property
    def ws_url(self) -> str:
        return self.ws_url_testnet if self.testnet else self.ws_url_mainnet


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    _load_dotenv()
    symbols = [s.strip().upper() for s in os.getenv('SYMBOLS', 'BTCUSDT,ETHUSDT').split(',') if s.strip()]
    majors = {s.strip().upper() for s in os.getenv('MAJORS', 'BTCUSDT,ETHUSDT').split(',') if s.strip()}
    return Settings(
        testnet=_get_bool('TESTNET', True),
        dry_run=_get_bool('DRY_RUN', True),
        allow_live_mainnet=_get_bool('ALLOW_LIVE_MAINNET', False),
        api_key=os.getenv('API_KEY', ''),
        api_secret=os.getenv('API_SECRET', ''),
        symbols=symbols,
        timeframe=os.getenv('TIMEFRAME', '1h'),
        risk_pct=_get_float('RISK_PCT', 0.0075),
        atr_mult=_get_float('ATR_MULT', 2.0),
        breakout_n=_get_int('BREAKOUT_N', 20),
        take_profit_r=_get_float('TAKE_PROFIT_R', 3.0),
        partial_pct=_get_float('PARTIAL_PCT', 0.4),
        trail_mode=os.getenv('TRAIL_MODE', 'lowest_low'),
        entry_order_type=os.getenv('ENTRY_ORDER_TYPE', 'market'),
        max_positions=_get_int('MAX_POSITIONS', 5),
        global_open_risk_cap=_get_float('GLOBAL_OPEN_RISK_CAP', 0.03),
        max_major_positions=_get_int('MAX_MAJOR_POSITIONS', 2),
        majors=majors,
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        log_file=os.getenv('LOG_FILE', 'bot.log'),
        recv_window_ms=_get_int('RECV_WINDOW_MS', 5000),
        http_timeout_sec=_get_int('HTTP_TIMEOUT_SEC', 10),
        rest_max_retries=_get_int('REST_MAX_RETRIES', 5),
        ws_max_reconnect_delay_sec=_get_int('WS_MAX_RECONNECT_DELAY_SEC', 30),
    )
