import { MarketSignal, AgentDecision } from './types';

export const liquidity_gate = (signal: MarketSignal, phase: 'pre_game' | 'in_play'): boolean => {
    const min_liquidity = phase === 'pre_game' ? 1000.0 : 500.0;
    return signal.liquidity >= min_liquidity;
};

export const spread_gate = (signal: MarketSignal, phase: 'pre_game' | 'in_play'): boolean => {
    const min_spread = 0.01; // 1%
    return signal.spread >= min_spread;
};

export const volume_gate = (signal: MarketSignal, phase: 'pre_game' | 'in_play'): boolean => {
    const min_volume = 100.0;
    return signal.volume >= min_volume;
};

export const evaluate_gates = (signal: MarketSignal, phase: 'pre_game' | 'in_play'): boolean => {
    return liquidity_gate(signal, phase) && spread_gate(signal, phase) && volume_gate(signal, phase);
};

export const score_signal = (signal: MarketSignal, phase: 'pre_game' | 'in_play'): number => {
    if (phase === 'pre_game') {
        return (signal.spread * 0.5) + (signal.liquidity / 10000 * 0.3) + (signal.volume / 1000 * 0.2);
    } else {
        return (signal.spread * 0.6) + (signal.volume / 1000 * 0.4);
    }
};

export const evaluate_agent = (signal: MarketSignal, phase: 'pre_game' | 'in_play'): AgentDecision | null => {
    const spread = signal.spread;
    if (spread < 0.02) return null;

    let action: 'buy' | 'sell' | 'hold' | 'close' = 'hold';
    let edge = spread;

    if (signal.polymarket_price > signal.kalshi_price) {
        action = 'buy';
    } else if (signal.kalshi_price > signal.polymarket_price) {
        action = 'sell';
    } else {
        return null;
    }

    const max_size = Math.min(signal.liquidity * 0.1, 100.0);
    const size = max_size * Math.min(edge / 0.1, 1.0);
    const confidence = Math.min(spread * 10, 1.0);

    return {
        market_id: signal.market_id,
        action,
        size: Math.round(size * 100) / 100,
        edge: Math.round(edge * 10000) / 10000,
        confidence: Math.round(confidence * 10000) / 10000,
        reason: `spread=${spread.toFixed(4)} phase=${phase}`
    };
};
