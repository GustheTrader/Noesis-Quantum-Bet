import React, { useState } from 'react';
import { runPipeline } from '../src/lib/prediction-market/pipeline';
import { MarketSignal } from '../src/lib/prediction-market/types';
import { Bot, Zap, Target, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { PipelineVisualizer } from '../components/PipelineVisualizer';

export const QuantumEdge: React.FC = () => {
    const [pipelineResult, setPipelineResult] = useState<any>(null);
    const [showDiag, setShowDiag] = useState<boolean>(false);

    const runEdgePipeline = () => {
        const testSignals: MarketSignal[] = [
            { market_id: "BTC-100K-2026Q2", polymarket_price: 0.65, kalshi_price: 0.62, spread: 0.03, volume: 5000.0, liquidity: 50000.0, metadata: {} },
            { market_id: "NFL-SUPERBOWL-2027", polymarket_price: 0.45, kalshi_price: 0.44, spread: 0.01, volume: 200.0, liquidity: 15000.0, metadata: {} },
            { market_id: "US-ELECTION-2028", polymarket_price: 0.55, kalshi_price: 0.50, spread: 0.05, volume: 10000.0, liquidity: 100000.0, metadata: {} },
        ];
        const result = runPipeline(testSignals, 'pre_game');
        setPipelineResult(result);
        setShowDiag(true);
    };

    return (
        <div className="min-h-screen bg-[#06080c] text-white">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                
                {/* 5-Layer Pipeline Live Visualizer Interface */}
                <div className="bg-[#0b0f17] border border-slate-900 rounded-[32px] overflow-hidden shadow-2xl">
                    <PipelineVisualizer />
                </div>

                {/* Optional Developer Diag Tools */}
                <div className="bg-[#090d14]/30 rounded-2xl border border-slate-900/60 p-5 mt-4">
                    <button 
                        onClick={() => setShowDiag(!showDiag)}
                        className="flex items-center justify-between w-full text-left text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <span className="font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 size={14} /> Diagnostic Pipeline Sandbox (Manual trigger)
                        </span>
                        {showDiag ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {showDiag && (
                        <div className="mt-4 pt-4 border-t border-slate-900/40 space-y-4">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={runEdgePipeline} 
                                    className="bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all"
                                >
                                    <Zap size={14} /> Run Test Sample Ingest
                                </button>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    Simulates batch pass-through to evaluate raw logic files directly.
                                </span>
                            </div>
                            
                            {pipelineResult && (
                                <div className="bg-black/80 p-5 rounded-xl border border-slate-900/80 font-mono text-[11px] overflow-x-auto text-indigo-300">
                                    <pre>{JSON.stringify(pipelineResult, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

