"""Filters — Signal quality scoring and noise reduction."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class FilterSignal:
    """A signal after passing through filters."""
    market_id: str
    source: str  # "polymarket" | "kalshi"
    raw_edge: float
    filtered_edge: float
    confidence: float  # 0.0 - 1.0
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class Filter(ABC):
    """Base class for signal filters."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def apply(self, signal: FilterSignal) -> FilterSignal: ...


class FilterChain:
    """Applies filters sequentially to refine a signal."""

    def __init__(self, filters: list[Filter]):
        self.filters = filters

    def run(self, signal: FilterSignal) -> FilterSignal:
        for f in self.filters:
            signal = f.apply(signal)
            if signal.filtered_edge <= 0:
                return signal  # edge destroyed, stop early
        return signal
