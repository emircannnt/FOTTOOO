from __future__ import annotations

import logging
import time

from bot.config import Settings
from bot.exchange.binance_client import BinanceClient
from bot.exchange.filters import SymbolFilters, format_by_step, round_step_down, round_tick


class OrderManager:
    def __init__(self, client: BinanceClient, settings: Settings, logger: logging.Logger):
        self.client = client
        self.settings = settings
        self.logger = logger

    def place_entry(self, symbol: str, qty: float, trigger_price: float, filters: SymbolFilters, reason: str) -> dict:
        qty = round_step_down(qty, filters.step_size)
        if qty < filters.min_qty:
            raise RuntimeError(f'Quantity too small for {symbol}: {qty}')

        if self.settings.dry_run:
            order = {
                'orderId': f'DRY-{symbol}-{int(time.time())}',
                'status': 'FILLED',
                'avgPrice': trigger_price,
                'executedQty': qty,
            }
            self.logger.info('order_simulated', extra={'symbol': symbol, 'side': 'BUY', 'qty': qty, 'price': trigger_price, 'order_id': order['orderId'], 'reason': reason})
            return order

        if self.settings.entry_order_type == 'market':
            order = self.client.new_order(symbol=symbol, side='BUY', type='MARKET', quantity=format_by_step(qty, filters.step_size))
        else:
            stop_price = round_tick(trigger_price, filters.tick_size)
            limit_price = round_tick(trigger_price * 1.001, filters.tick_size)
            order = self.client.new_order(
                symbol=symbol,
                side='BUY',
                type='STOP_LOSS_LIMIT',
                timeInForce='GTC',
                quantity=format_by_step(qty, filters.step_size),
                stopPrice=format_by_step(stop_price, filters.tick_size),
                price=format_by_step(limit_price, filters.tick_size),
            )

        self.logger.info('order_sent', extra={'symbol': symbol, 'side': 'BUY', 'qty': qty, 'price': trigger_price, 'order_id': order.get('orderId'), 'reason': reason})
        return order

    def place_exit_market(self, symbol: str, qty: float, filters: SymbolFilters, reason: str) -> dict:
        qty = round_step_down(qty, filters.step_size)
        if qty < filters.min_qty:
            self.logger.info('exit_skipped_dust', extra={'symbol': symbol, 'side': 'SELL', 'qty': qty, 'price': 0, 'order_id': 'N/A', 'reason': reason})
            return {'orderId': 'N/A', 'status': 'SKIPPED', 'executedQty': 0}

        if self.settings.dry_run:
            order = {'orderId': f'DRYEXIT-{symbol}-{int(time.time())}', 'status': 'FILLED', 'executedQty': qty}
            self.logger.info('exit_simulated', extra={'symbol': symbol, 'side': 'SELL', 'qty': qty, 'price': 0, 'order_id': order['orderId'], 'reason': reason})
            return order

        order = self.client.new_order(symbol=symbol, side='SELL', type='MARKET', quantity=format_by_step(qty, filters.step_size))
        self.logger.info('exit_sent', extra={'symbol': symbol, 'side': 'SELL', 'qty': qty, 'price': 0, 'order_id': order.get('orderId'), 'reason': reason})
        return order

    def wait_fill(self, symbol: str, order_id: int, timeout_sec: int = 20) -> tuple[float, float, str]:
        if self.settings.dry_run:
            return 0.0, 0.0, 'FILLED'

        deadline = time.time() + timeout_sec
        executed_qty = 0.0
        avg_price = 0.0
        status = 'NEW'
        while time.time() < deadline:
            order = self.client.get_order(symbol=symbol, order_id=order_id)
            status = order.get('status', 'UNKNOWN')
            executed_qty = float(order.get('executedQty', 0))
            avg_price = float(order.get('price', 0) or 0)
            if status in {'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'}:
                break
            time.sleep(1)
        return executed_qty, avg_price, status
