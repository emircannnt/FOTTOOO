from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Position:
    symbol: str
    entry_price: float
    stop_price: float
    qty: float
    initial_risk_per_unit: float
    opened_candle_index: int
    partial_taken: bool = False
    highest_price: float = 0.0
    trailing_stop: float | None = None

    def __post_init__(self):
        self.highest_price = self.entry_price


@dataclass
class PortfolioState:
    positions: dict[str, Position] = field(default_factory=dict)

    def open_count(self) -> int:
        return len(self.positions)

    def open_risk(self) -> float:
        return sum((p.entry_price - p.stop_price) * p.qty for p in self.positions.values())

    def major_count(self, majors: set[str]) -> int:
        return sum(1 for sym in self.positions if sym in majors)
