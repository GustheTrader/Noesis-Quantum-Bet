"""Copy Bot — Main entry point."""

import logging
from phases import PhaseManager, Phase, PhaseConfig
from gates import GatePipeline
from filters import FilterChain, FilterSignal
from sme_agents import AgentRegistry, MarketData, Signal

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("copybot")


class CopyBot:
    """Orchestrates the full pipeline: gates → filters → agents → execution."""

    def __init__(self):
        self.phase_manager = PhaseManager()
        self.gate_pipelines: dict[str, GatePipeline] = {}
        self.filter_chains: dict[str, FilterChain] = {}
        self.agent_registry = AgentRegistry()

    def register_gate_pipeline(self, phase: str, pipeline: GatePipeline):
        self.gate_pipelines[phase] = pipeline

    def register_filter_chain(self, phase: str, chain: FilterChain):
        self.filter_chains[phase] = chain

    def process_market(self, data: MarketData) -> list[Signal]:
        """Run a market through the full pipeline."""
        phase = self.phase_manager.current
        if not phase:
            log.warning("No active phase — skipping")
            return []

        # Step 1: Gates
        gate_pipeline = self.gate_pipelines.get(phase.value)
        if gate_pipeline:
            # gate check here
            pass

        # Step 2: Filters
        filter_chain = self.filter_chains.get(phase.value)
        signal = FilterSignal(
            market_id=data.market_id,
            source="polymarket",
            raw_edge=data.spread,
            filtered_edge=data.spread,
            confidence=1.0,
        )
        if filter_chain:
            signal = filter_chain.run(signal)

        # Step 3: SME Agents
        signals = []
        for agent in self.agent_registry.all():
            result = agent.evaluate(data)
            if result:
                signals.append(result)

        return signals


if __name__ == "__main__":
    bot = CopyBot()
    log.info("Copy Bot initialized — awaiting configuration")
