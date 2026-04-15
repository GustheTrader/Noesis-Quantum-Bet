import React, { useState } from 'react';
import { runPipeline } from '../src/lib/prediction-market/pipeline';
import { MarketSignal } from '../src/lib/prediction-market/types';
import { Bot, Zap, Target, BarChart3 } from 'lucide-react';

export const QuantumEdge: React.FC = () => {
    const [pipelineResult, setPipelineResult] = useState<any>(null);

    const runEdgePipeline = () => {
        const testSignals: MarketSignal[] = [
            { market_id: "BTC-100K-2026Q2", polymarket_price: 0.65, kalshi_price: 0.62, spread: 0.03, volume: 5000.0, liquidity: 50000.0, metadata: {} },
            { market_id: "NFL-SUPERBOWL-2027", polymarket_price: 0.45, kalshi_price: 0.44, spread: 0.01, volume: 200.0, liquidity: 15000.0, metadata: {} },
            { market_id: "US-ELECTION-2028", polymarket_price: 0.55, kalshi_price: 0.50, spread: 0.05, volume: 10000.0, liquidity: 100000.0, metadata: {} },
        ];
        const result = runPipeline(testSignals, 'pre_game');
        setPipelineResult(result);
    };

    return (
        <div className="p-10 text-white">
            <h1 className="text-4xl font-black mb-6 flex items-center gap-4">
                <Bot className="text-cyan-400" size={40} /> Quantum Edge Pipeline
            </h1>
            <button onClick={runEdgePipeline} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-bold flex items-center gap-2">
                <Zap size={18} /> Run Pipeline
            </button>
            {pipelineResult && (
                <div className="mt-8 bg-black/50 p-6 rounded-xl border border-slate-800 font-mono text-sm">
                    <pre>{JSON.stringify(pipelineResult, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};
