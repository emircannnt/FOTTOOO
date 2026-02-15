# Binance Spot Breakout ATR Bot (Testnet-first)

Production-oriented, minimal Python trading bot for **Binance Spot** with a clean architecture. It runs on **Spot Testnet** first and switches to **Mainnet** with one config flag.

> Strategy implemented exactly as requested: EMA trend filter + ATR breakout entries + ATR stop + partial TP + trailing stop + time stop + risk caps.

## Architecture (brief)

- **Data plane:** WebSocket kline stream drives decisions (`bot/exchange/ws_stream.py`).
- **Execution plane:** REST client for account, exchange info, and orders (`bot/exchange/binance_client.py`).
- **Strategy plane:** indicator and signal generation (`bot/strategy/*`).
- **Risk & portfolio plane:** position sizing, open risk caps, and position lifecycle (`bot/execution/*`).
- **Ops plane:** centralized settings (`bot/config.py`) + structured logging (`bot/utils/logger.py`).

## Project Structure

```text
/bot
  config.py
  /exchange
    binance_client.py
    ws_stream.py
    filters.py
  /strategy
    indicators.py
    breakout_atr.py
  /execution
    order_manager.py
    position_manager.py
    risk.py
  /utils
    logger.py
    time.py
/tests
main.py
README.md
requirements.txt
.env.example
```

## Strategy Rules (implemented)

- Timeframe: `1h` or `4h` (`TIMEFRAME`)
- Symbols: configurable (`SYMBOLS`, default `BTCUSDT,ETHUSDT`)
- Trend filter:
  - LONG only if `close > EMA50` and `EMA20 > EMA50`
- Entry:
  - breakout above highest high of last `BREAKOUT_N` candles + `0.1 * ATR(14)`
  - execution type configurable: `ENTRY_ORDER_TYPE=market|stop_limit`
- Initial stop:
  - `entry - ATR_MULT * ATR(14)` (default `2*ATR`)
- Position sizing:
  - `risk_amount = equity * RISK_PCT`
  - `qty = risk_amount / (entry-stop)` then rounded to `LOT_SIZE`/`STEP_SIZE`; `MIN_NOTIONAL` enforced
- TP / trailing:
  - partial at `+TAKE_PROFIT_R` (default +3R), sell `PARTIAL_PCT` (default 40%)
  - remainder trails via `TRAIL_MODE=lowest_low|atr` (default `lowest_low` over 20 candles)
- Time stop:
  - if after `TIME_STOP_CANDLES` (default 10) trade has not reached +1R, exit

## Portfolio Rules

- Max concurrent positions (`MAX_POSITIONS`, default 5)
- Optional major cap example (`MAX_MAJOR_POSITIONS`, default 2 for BTC/ETH majors)
- Global open risk cap (`GLOBAL_OPEN_RISK_CAP`, default 3% equity)

## Setup

1. **Python 3.11+**
2. Install deps:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

## Create Spot Testnet API Key

1. Go to Binance Spot Testnet portal.
2. Create API key/secret.
3. Put values into `.env`:
   - `API_KEY=...`
   - `API_SECRET=...`
4. Keep trading permissions only. **Never enable withdrawals**.

## Run Modes

### 1) Dry-run on Testnet (recommended first)

```bash
TESTNET=true DRY_RUN=true python main.py
```

Expected:
- Connects to WS
- Logs signals and simulated order actions
- No real order sent

### 2) Live on Testnet

```bash
TESTNET=true DRY_RUN=false python main.py
```

Expected:
- Places real testnet spot orders (no real funds)
- Handles fills/partial fills via order query path

### 3) Switch to Mainnet (single flag)

```bash
TESTNET=false DRY_RUN=true python main.py   # sanity first
TESTNET=false DRY_RUN=false ALLOW_LIVE_MAINNET=true python main.py  # live mainnet (explicit unlock)
```

⚠️ Mainnet warning: real funds at risk. Start with very small size and strict IP/API restrictions.

## Safety Checklist

- [ ] `DRY_RUN=true` validated before any live run
- [ ] `TESTNET=true` first; strategy behavior observed for multiple sessions
- [ ] API key has **trading only**, no withdrawals
- [ ] API key restricted by **IP whitelist**
- [ ] Use separate keys for testnet and mainnet
- [ ] Confirm `RISK_PCT`, `GLOBAL_OPEN_RISK_CAP`, `MAX_POSITIONS` are conservative
- [ ] Verify symbols and min notional/lot filters against exchange info
- [ ] Monitor `bot.log` for reconnects, rejects, and exits

## Logging

Structured JSON logs to console + file (`bot.log`) with fields including:
- `order_id`, `symbol`, `side`, `qty`, `price`, `reason`

## Error Handling & Reliability

- REST retries with exponential backoff
- WS reconnect loop + heartbeat (ping interval/timeouts)
- Graceful shutdown on `CTRL+C` / SIGTERM

## Tests

Run unit tests:
```bash
pytest -q tests/test_indicators.py tests/test_risk_filters.py tests/test_strategy.py tests/test_stop_calc.py
```

Optional integration smoke test (no orders):
```bash
RUN_INTEGRATION=true pytest -q tests/test_smoke_testnet.py
```

> Smoke test calls `ping` and `exchangeInfo` on testnet while `DRY_RUN=true`.

## Notes

- Official Binance Spot endpoints only:
  - REST: `/api/v3/*`
  - WS: Spot stream endpoints
- No secrets in code. `.env`/environment variables are loaded through the centralized settings object.
