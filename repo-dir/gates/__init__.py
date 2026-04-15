"""Gates — Environment checks before any strategy runs."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class GateResult(Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"


@dataclass
class GateContext:
    """Context passed through the gate pipeline."""
    market_id: str
    phase: str  # "pre_game" | "in_play"
    polymarket_price: Optional[float] = None
    kalshi_price: Optional[float] = None
    liquidity: Optional[float] = None
    volume_24h: Optional[float] = None
    metadata: dict = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class Gate(ABC):
    """Base class for all gates."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def evaluate(self, ctx: GateContext) -> GateResult: ...


class GatePipeline:
    """Runs a context through a chain of gates. All must pass."""

    def __init__(self, gates: list[Gate]):
        self.gates = gates

    def run(self, ctx: GateContext) -> tuple[GateResult, list[str]]:
        """Returns (final_result, log of gate results)."""
        log = []
        for gate in self.gates:
            result = gate.evaluate(ctx)
            log.append(f"{gate.name}: {result.value}")
            if result != GateResult.PASS:
                return result, log
        return GateResult.PASS, log
