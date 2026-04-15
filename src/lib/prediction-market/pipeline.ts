import { MarketSignal, BotState, AgentDecision } from './types';
import { evaluate_gates, score_signal, evaluate_agent } from './logic';

export const runPipeline = (signals: MarketSignal[], phase: 'pre_game' | 'in_play'): BotState => {
    const state: BotState = {
        phase,
        raw_signals: signals,
        gated_signals: [],
        filtered_signals: [],
        decisions: [],
        executions: [],
        errors: [],
        metrics: { ingested: signals.length }
    };

    // Layer 2: Gates
    state.gated_signals = state.raw_signals.filter(sig => evaluate_gates(sig, phase));
    state.metrics.gates_passed = state.gated_signals.length;
    state.metrics.gates_rejected = state.raw_signals.length - state.gated_signals.length;

    if (state.gated_signals.length === 0) return state;

    // Layer 3: Filters
    state.filtered_signals = state.gated_signals
        .map(sig => ({ ...sig, metadata: { ...sig.metadata, filter_score: score_signal(sig, phase) } }))
        .filter(sig => sig.metadata.filter_score > 0)
        .sort((a, b) => b.metadata.filter_score - a.metadata.filter_score);
    
    state.metrics.filtered_count = state.filtered_signals.length;

    if (state.filtered_signals.length === 0) return state;

    // Layer 4: Agents
    state.decisions = state.filtered_signals
        .map(sig => evaluate_agent(sig, phase))
        .filter((dec): dec is AgentDecision => dec !== null);
    
    state.metrics.decisions_count = state.decisions.length;

    if (state.decisions.length === 0) return state;

    // Layer 5: Execution
    state.executions = state.decisions.map(dec => ({
        market_id: dec.market_id,
        action: dec.action,
        size: dec.size,
        price: 0.0,
        status: 'pending'
    }));
    state.metrics.executed = state.executions.length;

    return state;
};
