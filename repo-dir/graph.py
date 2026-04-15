"""
Copy Bot — 5-Layer Graph Model (LangGraph)

Layer 1: INGEST    → Polymarket data feed
Layer 2: GATES     → Environment scan / market qualification
Layer 3: FILTERS   → Signal refinement / scoring
Layer 4: AGENTS    → SME edge computation
Layer 5: EXECUTION → Machine execution on Kalshi

Flow: linear with conditional branching at each layer.
Gates can reject. Filters can kill signals. Agents can loop for multi-leg.
"""

from __future__ import annotations

import operator
from dataclasses import dataclass, field
from enum import Enum
from typing import Annotated, Any, Optional, TypedDict

from langgraph.graph import StateGraph, END


# ─── Enums ───────────────────────────────────────────────────────

class Phase(str, Enum):
    PRE_GAME = "pre_game"
    IN_PLAY = "in_play"


class Action(str, Enum):
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"
    CLOSE = "close"


class GateVerdict(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"


# ─── Data Models ─────────────────────────────────────────────────

@dataclass
class MarketSignal:
    """A single market signal flowing through the graph."""
    market_id: str
    polymarket_price: float
    kalshi_price: float
    spread: float
    volume: float
    liquidity: float
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "market_id": self.market_id,
            "polymarket_price": self.polymarket_price,
            "kalshi_price": self.kalshi_price,
            "spread": self.spread,
            "volume": self.volume,
            "liquidity": self.liquidity,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "MarketSignal":
        return cls(**d)


@dataclass
class AgentDecision:
    """Output from an SME agent."""
    market_id: str
    action: str
    size: float
    edge: float
    confidence: float
    reason: str

    def to_dict(self) -> dict:
        return {
            "market_id": self.market_id,
            "action": self.action,
            "size": self.size,
            "edge": self.edge,
            "confidence": self.confidence,
            "reason": self.reason,
        }


@dataclass
class ExecutionResult:
    """Output from execution layer."""
    market_id: str
    action: str
    size: float
    price: float
    status: str
    order_id: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "market_id": self.market_id,
            "action": self.action,
            "size": self.size,
            "price": self.price,
            "status": self.status,
            "order_id": self.order_id,
        }


# ─── Graph State (TypedDict) ────────────────────────────────────

class BotState(TypedDict):
    """State flowing through all 5 layers."""
    phase: str
    raw_signals: list[dict]
    gated_signals: list[dict]
    filtered_signals: list[dict]
    decisions: list[dict]
    executions: list[dict]
    errors: list[str]
    metrics: dict


# ─── Layer 1: INGEST ─────────────────────────────────────────────

def ingest_node(state: BotState) -> dict:
    """Layer 1: Pull data from Polymarket feed."""
    signals = state.get("raw_signals", [])
    return {
        "raw_signals": signals,
        "metrics": {**state.get("metrics", {}), "ingested": len(signals)},
    }


# ─── Layer 2: GATES ──────────────────────────────────────────────

def gates_node(state: BotState) -> dict:
    """Layer 2: Environment scan — qualify or reject markets."""
    signals = state.get("raw_signals", [])
    phase = state.get("phase", "pre_game")
    passed = []
    rejected = []

    for sig_dict in signals:
        sig = MarketSignal.from_dict(sig_dict)
        verdict = evaluate_gates(sig, phase)
        if verdict == "pass":
            # Create clean copy with verdict — no mutation of original
            d = sig.to_dict()
            d["metadata"] = {**d.get("metadata", {}), "gate_verdict": "pass"}
            passed.append(d)
        else:
            rejected.append(dict(sig_dict))

    return {
        "gated_signals": passed,
        "metrics": {
            **state.get("metrics", {}),
            "gates_passed": len(passed),
            "gates_rejected": len(rejected),
        },
    }


def evaluate_gates(signal: MarketSignal, phase: str) -> str:
    """Evaluate all gates. All must pass."""
    gates = [liquidity_gate, spread_gate, volume_gate]
    for gate in gates:
        if gate(signal, phase) != "pass":
            return "fail"
    return "pass"


def liquidity_gate(signal: MarketSignal, phase: str) -> str:
    min_liquidity = 1000.0 if phase == "pre_game" else 500.0
    return "pass" if signal.liquidity >= min_liquidity else "fail"


def spread_gate(signal: MarketSignal, phase: str) -> str:
    min_spread = 0.01  # 1% minimum
    return "pass" if signal.spread >= min_spread else "fail"


def volume_gate(signal: MarketSignal, phase: str) -> str:
    min_volume = 100.0
    return "pass" if signal.volume >= min_volume else "fail"


# ─── Layer 3: FILTERS ────────────────────────────────────────────

def filters_node(state: BotState) -> dict:
    """Layer 3: Refine signals — score, rank, clean."""
    signals = state.get("gated_signals", [])
    phase = state.get("phase", "pre_game")

    filtered = []
    for sig_dict in signals:
        sig = MarketSignal.from_dict(sig_dict)
        score = score_signal(sig, phase)
        if score > 0:
            # Create clean copy with score — no mutation of original
            d = sig.to_dict()
            d["metadata"] = {**sig_dict.get("metadata", {}), "filter_score": score}
            filtered.append(d)

    # Rank by score descending
    filtered.sort(key=lambda s: s.get("metadata", {}).get("filter_score", 0), reverse=True)

    return {
        "filtered_signals": filtered,
        "metrics": {
            **state.get("metrics", {}),
            "filtered_count": len(filtered),
        },
    }


def score_signal(signal: MarketSignal, phase: str) -> float:
    if phase == "pre_game":
        return (signal.spread * 0.5) + (signal.liquidity / 10000 * 0.3) + (signal.volume / 1000 * 0.2)
    else:
        return (signal.spread * 0.6) + (signal.volume / 1000 * 0.4)


# ─── Layer 4: AGENTS ─────────────────────────────────────────────

def agents_node(state: BotState) -> dict:
    """Layer 4: SME agents compute edge and generate decisions."""
    signals = state.get("filtered_signals", [])
    phase = state.get("phase", "pre_game")
    decisions = []

    for sig_dict in signals:
        sig = MarketSignal.from_dict(sig_dict)
        decision = evaluate_agent(sig, phase)
        if decision:
            decisions.append(decision.to_dict())

    return {
        "decisions": decisions,
        "metrics": {
            **state.get("metrics", {}),
            "decisions_count": len(decisions),
        },
    }


def evaluate_agent(signal: MarketSignal, phase: str) -> Optional[AgentDecision]:
    """
    SME agent evaluation — deterministic edge computation.
    TODO: Plug in domain-specific SME agents.
    """
    spread = signal.spread

    if spread < 0.02:
        return None  # no edge

    if signal.polymarket_price > signal.kalshi_price:
        action = "buy"
        edge = spread
    elif signal.kalshi_price > signal.polymarket_price:
        action = "sell"
        edge = spread
    else:
        return None

    max_size = min(signal.liquidity * 0.1, 100.0)
    size = max_size * min(edge / 0.1, 1.0)
    confidence = min(spread * 10, 1.0)

    return AgentDecision(
        market_id=signal.market_id,
        action=action,
        size=round(size, 2),
        edge=round(edge, 4),
        confidence=round(confidence, 4),
        reason=f"spread={spread:.4f} phase={phase}",
    )


# ─── Layer 5: EXECUTION ──────────────────────────────────────────

def execution_node(state: BotState) -> dict:
    """Layer 5: Machine execution on Kalshi."""
    decisions = state.get("decisions", [])
    executions = []

    for dec in decisions:
        result = execute_decision(dec)
        executions.append(result)

    return {
        "executions": executions,
        "metrics": {
            **state.get("metrics", {}),
            "executed": len(executions),
        },
    }


def execute_decision(decision: dict) -> dict:
    """Execute a decision on Kalshi. TODO: Wire up Kalshi API."""
    return ExecutionResult(
        market_id=decision["market_id"],
        action=decision["action"],
        size=decision["size"],
        price=0.0,
        status="pending",
        order_id=None,
    ).to_dict()


# ─── Routing ─────────────────────────────────────────────────────

def after_gates(state: BotState) -> str:
    """Route after gates: continue if signals passed, else end."""
    return "continue" if state.get("gated_signals") else "end"


def after_filters(state: BotState) -> str:
    """Route after filters: continue if signals remain, else end."""
    return "continue" if state.get("filtered_signals") else "end"


def after_agents(state: BotState) -> str:
    """Route after agents: continue if decisions made, else end."""
    return "continue" if state.get("decisions") else "end"


# ─── Graph Construction ──────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Build the 5-layer pipeline graph.
    
    Flow:
        ingest → gates → (check) → filters → (check) → agents → (check) → execution → end
    """
    graph = StateGraph(BotState)

    graph.add_node("ingest", ingest_node)
    graph.add_node("gates", gates_node)
    graph.add_node("filters", filters_node)
    graph.add_node("agents", agents_node)
    graph.add_node("execution", execution_node)

    graph.set_entry_point("ingest")
    graph.add_edge("ingest", "gates")
    graph.add_conditional_edges("gates", after_gates, {
        "continue": "filters",
        "end": END,
    })
    graph.add_conditional_edges("filters", after_filters, {
        "continue": "agents",
        "end": END,
    })
    graph.add_conditional_edges("agents", after_agents, {
        "continue": "execution",
        "end": END,
    })
    graph.add_edge("execution", END)

    return graph


# ─── Compile ─────────────────────────────────────────────────────

graph = build_graph()
app = graph.compile()


# ─── Entry Point ─────────────────────────────────────────────────

def run_pipeline(
    signals: list[dict],
    phase: str = "pre_game",
) -> BotState:
    """Run the full 5-layer pipeline."""
    initial_state: BotState = {
        "phase": phase,
        "raw_signals": signals,
        "gated_signals": [],
        "filtered_signals": [],
        "decisions": [],
        "executions": [],
        "errors": [],
        "metrics": {},
    }

    result = app.invoke(initial_state)
    return result


if __name__ == "__main__":
    test_signals = [
        MarketSignal(
            market_id="BTC-100K-2026Q2",
            polymarket_price=0.65,
            kalshi_price=0.62,
            spread=0.03,
            volume=5000.0,
            liquidity=50000.0,
        ),
        MarketSignal(
            market_id="NFL-SUPERBOWL-2027",
            polymarket_price=0.45,
            kalshi_price=0.44,
            spread=0.01,
            volume=200.0,
            liquidity=15000.0,
        ),
        MarketSignal(
            market_id="US-ELECTION-2028",
            polymarket_price=0.55,
            kalshi_price=0.50,
            spread=0.05,
            volume=10000.0,
            liquidity=100000.0,
        ),
    ]

    result = run_pipeline([s.to_dict() for s in test_signals], "pre_game")

    print("\n" + "=" * 60)
    print("COPY BOT — 5-Layer Pipeline Results")
    print("=" * 60)
    print(f"Phase:            {result.get('phase')}")
    print(f"Ingested:         {result['metrics'].get('ingested', 0)}")
    print(f"Gates passed:     {result['metrics'].get('gates_passed', 0)}")
    print(f"Gates rejected:   {result['metrics'].get('gates_rejected', 0)}")
    print(f"Filtered:         {result['metrics'].get('filtered_count', 0)}")
    print(f"Decisions:        {result['metrics'].get('decisions_count', 0)}")
    print(f"Executed:         {result['metrics'].get('executed', 0)}")

    print("\n--- Gated Signals ---")
    for s in result.get("gated_signals", []):
        print(f"  {s['market_id']}: spread={s['spread']} vol={s['volume']} liq={s['liquidity']}")

    print("\n--- Filtered & Ranked ---")
    for s in result.get("filtered_signals", []):
        score = s.get("metadata", {}).get("filter_score", 0)
        print(f"  {s['market_id']}: score={score:.4f}")

    print("\n--- Agent Decisions ---")
    for d in result.get("decisions", []):
        print(f"  {d['market_id']}: {d['action']} size={d['size']} edge={d['edge']} conf={d['confidence']}")
        print(f"    reason: {d['reason']}")

    print("\n--- Executions ---")
    for e in result.get("executions", []):
        print(f"  {e['market_id']}: {e['action']} size={e['size']} status={e['status']}")
