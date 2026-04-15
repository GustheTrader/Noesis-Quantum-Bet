"""Execution — Order management and Kalshi API integration."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class OrderStatus(Enum):
    PENDING = "pending"
    FILLED = "filled"
    PARTIAL = "partial"
    CANCELLED = "cancelled"
    FAILED = "failed"


@dataclass
class Order:
    """Represents an order to execute."""
    market_id: str
    side: str  # "buy" | "sell"
    size: float
    price: Optional[float] = None  # None = market order
    order_id: Optional[str] = None
    status: OrderStatus = OrderStatus.PENDING
    filled_size: float = 0.0
    filled_price: Optional[float] = None


@dataclass
class Position:
    """Current position in a market."""
    market_id: str
    size: float
    avg_price: float
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0


class ExecutionEngine(ABC):
    """Base class for execution backends."""

    @abstractmethod
    def submit(self, order: Order) -> Order: ...

    @abstractmethod
    def cancel(self, order_id: str) -> bool: ...

    @abstractmethod
    def get_position(self, market_id: str) -> Optional[Position]: ...

    @abstractmethod
    def get_balance(self) -> float: ...
