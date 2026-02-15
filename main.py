from __future__ import annotations

import asyncio
import signal
from collections import defaultdict

from bot.config import get_settings
from bot.exchange.binance_client import BinanceClient
from bot.exchange.filters import parse_symbol_filters
from bot.exchange.ws_stream import KlineStream
from bot.execution.order_manager import OrderManager
from bot.execution.position_manager import PortfolioState, Position
from bot.execution.risk import position_size
from bot.strategy.breakout_atr import compute_signal
from bot.strategy.indicators import atr
from bot.utils.logger import setup_logger


def _interval_to_ms(interval: str) -> int:
    if interval.endswith('h'):
        return int(interval[:-1]) * 60 * 60 * 1000
    raise ValueError(f'Unsupported interval: {interval}')


async def run_bot() -> None:
    settings = get_settings()
    logger = setup_logger(settings.log_level, settings.log_file)

    if not settings.testnet and not settings.dry_run and not settings.allow_live_mainnet:
        raise RuntimeError('Mainnet live trading blocked. Set ALLOW_LIVE_MAINNET=true explicitly.')

    client = BinanceClient(settings)
    client.ping()

    if not settings.dry_run and (not settings.api_key or not settings.api_secret):
        raise RuntimeError('Live mode requires API_KEY and API_SECRET.')

    account = client.account() if settings.api_key and settings.api_secret else {'balances': []}

    usdt_balance = 0.0
    for balance in account.get('balances', []):
        if balance['asset'] == 'USDT':
            usdt_balance = float(balance['free'])
            break
    equity = usdt_balance if usdt_balance > 0 else 10_000.0

    symbol_filters = {}
    candles: dict[str, list[dict]] = defaultdict(list)
    candle_index: dict[str, int] = defaultdict(int)
    last_close_time: dict[str, int] = {}

    for sym in settings.symbols:
        info = client.exchange_info(sym)['symbols'][0]
        symbol_filters[sym] = parse_symbol_filters(info)
        candles[sym] = client.klines(sym, settings.timeframe, limit=250)
        if candles[sym]:
            last_close_time[sym] = int(candles[sym][-1]['close_time'])

    portfolio = PortfolioState()
    order_manager = OrderManager(client, settings, logger)
    stream = KlineStream(settings.ws_url, settings.symbols, settings.timeframe, logger, settings.ws_max_reconnect_delay_sec)

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def stop_handler():
        logger.info('shutdown_requested')
        stop_event.set()

    for sig_name in ('SIGINT', 'SIGTERM'):
        loop.add_signal_handler(getattr(signal, sig_name), stop_handler)

    interval_ms = _interval_to_ms(settings.timeframe)

    async for kline in stream.run():
        symbol = kline['symbol']
        current_close_time = int(kline['close_time'])
        prev_close_time = last_close_time.get(symbol)
        if prev_close_time and current_close_time - prev_close_time > interval_ms * 2:
            logger.warning('candle_gap_detected', extra={'symbol': symbol, 'reason': f'{current_close_time - prev_close_time}ms'})
            candles[symbol] = client.klines(symbol, settings.timeframe, limit=250)

        last_close_time[symbol] = current_close_time
        candles[symbol].append(kline)
        candles[symbol] = candles[symbol][-300:]
        candle_index[symbol] += 1

        signal_obj = compute_signal(symbol, candles[symbol], settings)
        if signal_obj and symbol not in portfolio.positions:
            filters = symbol_filters[symbol]
            if portfolio.open_count() >= settings.max_positions:
                logger.info('entry_skipped', extra={'symbol': symbol, 'reason': 'max_positions'})
                continue
            if symbol in settings.majors and portfolio.major_count(settings.majors) >= settings.max_major_positions:
                logger.info('entry_skipped', extra={'symbol': symbol, 'reason': 'major_cap'})
                continue

            qty = position_size(equity, settings.risk_pct, signal_obj.entry_price, signal_obj.stop_price, filters)
            if qty <= 0:
                logger.info('entry_skipped', extra={'symbol': symbol, 'reason': 'qty_invalid_after_filters'})
                continue

            open_risk = portfolio.open_risk() + (signal_obj.entry_price - signal_obj.stop_price) * qty
            if open_risk > equity * settings.global_open_risk_cap:
                logger.info('entry_skipped', extra={'symbol': symbol, 'reason': 'global_risk_cap'})
                continue

            order = order_manager.place_entry(symbol, qty, signal_obj.entry_price, filters, signal_obj.reason)
            executed_qty = float(order.get('executedQty', qty))
            entry_price = float(order.get('avgPrice', signal_obj.entry_price) or signal_obj.entry_price)

            if not settings.dry_run and order.get('status') in {'NEW', 'PARTIALLY_FILLED'}:
                fill_qty, fill_price, status = order_manager.wait_fill(symbol, int(order['orderId']))
                executed_qty = fill_qty
                if fill_price > 0:
                    entry_price = fill_price
                if status in {'NEW', 'PARTIALLY_FILLED'}:
                    client.cancel_order(symbol, int(order['orderId']))

            if executed_qty <= 0:
                logger.info('entry_skipped', extra={'symbol': symbol, 'reason': 'no_fill'})
                continue

            portfolio.positions[symbol] = Position(
                symbol=symbol,
                entry_price=entry_price,
                stop_price=signal_obj.stop_price,
                qty=executed_qty,
                initial_risk_per_unit=max(entry_price - signal_obj.stop_price, 1e-12),
                opened_candle_index=candle_index[symbol],
            )
            logger.info('position_opened', extra={'symbol': symbol, 'side': 'BUY', 'qty': executed_qty, 'price': entry_price, 'order_id': order.get('orderId'), 'reason': signal_obj.reason})

        pos = portfolio.positions.get(symbol)
        if not pos:
            if stop_event.is_set():
                break
            continue

        close = float(kline['close'])
        highs = [float(c['high']) for c in candles[symbol]]
        lows = [float(c['low']) for c in candles[symbol]]
        closes = [float(c['close']) for c in candles[symbol]]
        atr_now = atr(highs, lows, closes, settings.atr_period)[-1]

        r_gain = (close - pos.entry_price) / max(pos.initial_risk_per_unit, 1e-12)

        filters = symbol_filters[symbol]
        if not pos.partial_taken and r_gain >= settings.take_profit_r:
            partial_qty = pos.qty * settings.partial_pct
            exit_order = order_manager.place_exit_market(symbol, partial_qty, filters, reason='partial_take_profit')
            pos.qty -= float(exit_order.get('executedQty', partial_qty))
            pos.partial_taken = True

        if settings.trail_mode == 'lowest_low':
            trail = min(lows[-settings.trail_lookback:]) if len(lows) >= settings.trail_lookback else pos.stop_price
        else:
            trail = close - settings.trail_atr_mult * atr_now
        pos.trailing_stop = max(pos.stop_price, trail)

        candles_open = candle_index[symbol] - pos.opened_candle_index
        if candles_open >= settings.time_stop_candles and r_gain < 1:
            order_manager.place_exit_market(symbol, pos.qty, filters, reason='time_stop')
            del portfolio.positions[symbol]
            continue

        if close <= pos.trailing_stop:
            order_manager.place_exit_market(symbol, pos.qty, filters, reason='trailing_stop')
            del portfolio.positions[symbol]

        if stop_event.is_set():
            break

    await stream.stop()


if __name__ == '__main__':
    asyncio.run(run_bot())
