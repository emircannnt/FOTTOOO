from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any
from urllib.parse import urlencode

import requests

from bot.config import Settings


class BinanceClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.session = requests.Session()
        if settings.api_key:
            self.session.headers.update({'X-MBX-APIKEY': settings.api_key})

    def _sign(self, params: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.api_secret:
            raise RuntimeError('Signed endpoint requested but API_SECRET is empty.')
        params['timestamp'] = int(time.time() * 1000)
        params['recvWindow'] = self.settings.recv_window_ms
        query = urlencode(params)
        signature = hmac.new(self.settings.api_secret.encode(), query.encode(), hashlib.sha256).hexdigest()
        params['signature'] = signature
        return params

    def _request(self, method: str, path: str, params: dict | None = None, signed: bool = False) -> Any:
        query = dict(params or {})
        if signed:
            query = self._sign(query)

        backoff = 1.0
        last_error: Exception | None = None
        for _ in range(self.settings.rest_max_retries):
            try:
                kwargs: dict[str, Any] = {'timeout': self.settings.http_timeout_sec}
                if method.upper() in {'GET', 'DELETE'}:
                    kwargs['params'] = query
                else:
                    kwargs['params'] = query

                response = self.session.request(method, f'{self.settings.base_url}{path}', **kwargs)
                if response.status_code in (429, 418):
                    retry_after = int(response.headers.get('Retry-After', '1'))
                    time.sleep(max(retry_after, backoff))
                    backoff = min(backoff * 2, 30)
                    continue
                if 500 <= response.status_code < 600:
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 30)
                    continue

                response.raise_for_status()
                return response.json()
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)

        raise RuntimeError(f'Binance request failed: {path} ({last_error})')

    def ping(self) -> dict:
        return self._request('GET', '/v3/ping')

    def exchange_info(self, symbol: str | None = None) -> dict:
        params = {'symbol': symbol} if symbol else {}
        return self._request('GET', '/v3/exchangeInfo', params=params)

    def klines(self, symbol: str, interval: str, limit: int = 200) -> list[dict]:
        raw = self._request('GET', '/v3/klines', params={'symbol': symbol, 'interval': interval, 'limit': limit})
        return [
            {
                'open_time': k[0],
                'open': k[1],
                'high': k[2],
                'low': k[3],
                'close': k[4],
                'volume': k[5],
                'close_time': k[6],
                'is_closed': True,
            }
            for k in raw
        ]

    def account(self) -> dict:
        return self._request('GET', '/v3/account', signed=True)

    def new_order(self, **params: Any) -> dict:
        return self._request('POST', '/v3/order', params=params, signed=True)

    def cancel_order(self, symbol: str, order_id: int) -> dict:
        return self._request('DELETE', '/v3/order', params={'symbol': symbol, 'orderId': order_id}, signed=True)

    def get_order(self, symbol: str, order_id: int) -> dict:
        return self._request('GET', '/v3/order', params={'symbol': symbol, 'orderId': order_id}, signed=True)
