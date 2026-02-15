from __future__ import annotations

import asyncio
import json
import logging

import websockets


class KlineStream:
    def __init__(self, ws_url: str, symbols: list[str], interval: str, logger: logging.Logger, max_reconnect_delay_sec: int = 30):
        streams = '/'.join(f'{symbol.lower()}@kline_{interval}' for symbol in symbols)
        self.url = f'{ws_url}/stream?streams={streams}'
        self.logger = logger
        self.max_reconnect_delay_sec = max_reconnect_delay_sec
        self._stop = asyncio.Event()

    async def stop(self) -> None:
        self._stop.set()

    async def run(self):
        delay = 1
        while not self._stop.is_set():
            try:
                async with websockets.connect(self.url, ping_interval=20, ping_timeout=20) as ws:
                    self.logger.info('ws_connected', extra={'reason': self.url})
                    delay = 1
                    while not self._stop.is_set():
                        try:
                            message = await asyncio.wait_for(ws.recv(), timeout=35)
                        except asyncio.TimeoutError:
                            pong = await ws.ping()
                            await asyncio.wait_for(pong, timeout=10)
                            continue

                        payload = json.loads(message)
                        data = payload.get('data', payload)
                        kline = data.get('k')
                        if not kline or not kline.get('x'):
                            continue
                        yield {
                            'symbol': data['s'],
                            'open_time': kline['t'],
                            'open': kline['o'],
                            'high': kline['h'],
                            'low': kline['l'],
                            'close': kline['c'],
                            'volume': kline['v'],
                            'close_time': kline['T'],
                            'is_closed': kline['x'],
                        }
            except Exception as exc:
                self.logger.warning('ws_reconnect', extra={'reason': str(exc)})
                await asyncio.sleep(delay)
                delay = min(delay * 2, self.max_reconnect_delay_sec)
