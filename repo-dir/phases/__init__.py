"""Phase Manager — Cron-triggered state machine for pre-game ↔ in-play."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Callable, Optional


class Phase(Enum):
    PRE_GAME = "pre_game"
    IN_PLAY = "in_play"


@dataclass
class PhaseConfig:
    """Configuration for a phase."""
    phase: Phase
    gates: list[str]  # gate names active in this phase
    filters: list[str]  # filter names active
    agents: list[str]  # agent names active
    max_exposure: float = 0.0
    metadata: dict = field(default_factory=dict)


@dataclass
class PhaseEvent:
    """A phase transition event."""
    from_phase: Optional[Phase]
    to_phase: Phase
    timestamp: datetime
    trigger: str  # "cron" | "manual" | "event"


class PhaseManager:
    """Manages phase transitions and config switching."""

    def __init__(self):
        self._current: Optional[Phase] = None
        self._configs: dict[Phase, PhaseConfig] = {}
        self._callbacks: list[Callable[[PhaseEvent], None]] = []

    def register_config(self, config: PhaseConfig):
        self._configs[config.phase] = config

    def on_transition(self, callback: Callable[[PhaseEvent], None]):
        self._callbacks.append(callback)

    def transition(self, to: Phase, trigger: str = "cron"):
        """Execute a phase transition."""
        event = PhaseEvent(
            from_phase=self._current,
            to_phase=to,
            timestamp=datetime.utcnow(),
            trigger=trigger,
        )
        self._current = to
        for cb in self._callbacks:
            cb(event)

    @property
    def current(self) -> Optional[Phase]:
        return self._current

    @property
    def config(self) -> Optional[PhaseConfig]:
        if self._current:
            return self._configs.get(self._current)
        return None
