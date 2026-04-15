"""SME Agents — Domain-specific deterministic edge execution."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Action(Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    CLOSE = "close"


@dataclass
class Signal:
    """Output from an SME agent."""
    market_id: str
    action: Action
    size: float
    edge: float
    confidence: float
    reason: str
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class MarketData:
    """Input to an SME agent."""
    market_id: str
    phase: str  # "pre_game" | "in_play"
    polymarket_price: float
    kalshi_price: float
    spread: float
    volume: float
    position: Optional[float] = None  # current position size
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class SMEAgent(ABC):
    """Base class for Subject Matter Expert agents.
    
    Each agent specializes in a domain (sports, politics, crypto, etc.)
    and has its own edge logic and risk parameters.
    """

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def domain(self) -> str: ...

    @abstractmethod
    def evaluate(self, data: MarketData) -> Optional[Signal]:
        """Evaluate market data and return a signal (or None to skip)."""
        ...

    @abstractmethod
    def max_loss(self) -> float:
        """Maximum loss this agent will tolerate per trade."""
        ...


class AgentRegistry:
    """Registry of available SME agents."""

    def __init__(self):
        self._agents: dict[str, SMEAgent] = {}

    def register(self, agent: SMEAgent):
        self._agents[agent.name] = agent

    def get(self, name: str) -> Optional[SMEAgent]:
        return self._agents.get(name)

    def by_domain(self, domain: str) -> list[SMEAgent]:
        return [a for a in self._agents.values() if a.domain == domain]

    def all(self) -> list[SMEAgent]:
        return list(self._agents.values())
