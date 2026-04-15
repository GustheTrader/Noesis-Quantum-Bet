export interface MarketSignal {
    market_id: string;
    polymarket_price: number;
    kalshi_price: number;
    spread: number;
    volume: number;
    liquidity: number;
    metadata: Record<string, any>;
}

export interface AgentDecision {
    market_id: string;
    action: 'buy' | 'sell' | 'hold' | 'close';
    size: number;
    edge: number;
    confidence: number;
    reason: string;
}

export interface ExecutionResult {
    market_id: string;
    action: string;
    size: number;
    price: number;
    status: 'pending' | 'filled' | 'failed';
    order_id?: string;
}

export interface BotState {
    phase: 'pre_game' | 'in_play';
    raw_signals: MarketSignal[];
    gated_signals: MarketSignal[];
    filtered_signals: MarketSignal[];
    decisions: AgentDecision[];
    executions: ExecutionResult[];
    errors: string[];
    metrics: Record<string, number>;
}
