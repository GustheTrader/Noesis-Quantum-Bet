
import React, { useState, useEffect } from 'react';
import { Calculator, ShieldCheck, TrendingUp, AlertTriangle, HelpCircle, BookOpen, Percent } from 'lucide-react';

export const KellyTool: React.FC = () => {
  const [bankroll, setBankroll] = useState(10000);
  const [odds, setOdds] = useState('-110');
  const [winProb, setWinProb] = useState(55); // 55% win rate
  
  const [metrics, setMetrics] = useState({
    decimalOdds: 1.91,
    edge: 5.0, // 5% edge
    fullKelly: 0,
    safeKelly: 0 // 0.3x
  });

  useEffect(() => {
    calculate();
  }, [bankroll, odds, winProb]);

  const calculate = () => {
    // 1. Convert Odds
    let dec = 0;
    const o = parseFloat(odds);
    if (isNaN(o)) return;
    
    if (o > 0) dec = (o / 100) + 1;
    else dec = (100 / Math.abs(o)) + 1;

    // 2. Variables
    const b = dec - 1; // Net odds (b to 1)
    const p = winProb / 100;
    const q = 1 - p;

    // 3. Formula: f* = (bp - q) / b
    const f = (b * p - q) / b;

    // 4. Edge Calculation
    const ev = (p * dec) - 1;

    setMetrics({
        decimalOdds: dec,
        edge: ev * 100,
        fullKelly: Math.max(0, f),
        safeKelly: Math.max(0, f * 0.3) // We use 0.3x as our "Standard"
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
        
        {/* Header */}
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4 uppercase tracking-tighter">
                Capital Preservation Engine
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                The <span className="text-white font-bold">Kelly Criterion</span> is the mathematical formula for maximizing geometric growth while minimizing the risk of ruin.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* CALCULATOR SECTION */}
            <div className="glass-panel p-1 rounded-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                <div className="bg-slate-900/90 p-8 rounded-xl h-full">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-4">
                        <Calculator className="text-cyan-400" /> Bet Sizer
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Current Bankroll ($)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                <input 
                                    type="number" 
                                    value={bankroll}
                                    onChange={(e) => setBankroll(parseFloat(e.target.value))}
                                    className="w-full bg-black/40 border border-slate-700 rounded-lg py-3 pl-8 pr-4 text-white font-mono text-lg focus:border-cyan-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Odds (American)</label>
                                <input 
                                    type="text" 
                                    value={odds}
                                    onChange={(e) => setOdds(e.target.value)}
                                    className="w-full bg-black/40 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono text-lg focus:border-cyan-500 focus:outline-none transition-colors"
                                />
                                <div className="text-[10px] text-slate-500 mt-1 font-mono">Decimal: {metrics.decimalOdds.toFixed(2)}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Win Probability (%)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={winProb}
                                        onChange={(e) => setWinProb(parseFloat(e.target.value))}
                                        className={`w-full bg-black/40 border rounded-lg py-3 px-4 font-mono text-lg focus:outline-none transition-colors ${metrics.edge > 0 ? 'border-emerald-500/50 text-emerald-400' : 'border-rose-500/50 text-rose-400'}`}
                                    />
                                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                </div>
                                <div className={`text-[10px] mt-1 font-mono font-bold ${metrics.edge > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    Edge: {metrics.edge > 0 ? '+' : ''}{metrics.edge.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 my-6"></div>

                        {/* Results */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 opacity-60">
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Full Kelly (Aggressive)</div>
                                <div className="text-2xl font-black text-slate-300">
                                    ${(bankroll * metrics.fullKelly).toFixed(0)}
                                </div>
                                <div className="text-xs font-mono text-slate-500">
                                    {(metrics.fullKelly * 100).toFixed(2)}% of Bankroll
                                </div>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl border border-cyan-500/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-20">
                                    <ShieldCheck size={40} className="text-cyan-400" />
                                </div>
                                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <ShieldCheck size={12} />
                                    Noesis Recommended (0.3x)
                                </div>
                                <div className="text-3xl font-black text-white">
                                    ${(bankroll * metrics.safeKelly).toFixed(0)}
                                </div>
                                <div className="text-xs font-mono text-cyan-200/70">
                                    {(metrics.safeKelly * 100).toFixed(2)}% of Bankroll
                                </div>
                            </div>
                        </div>
                        
                        {metrics.edge <= 0 && (
                            <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
                                <AlertTriangle size={16} />
                                <span>Negative EV detected. Kelly Criterion dictates <strong>NO BET</strong>.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EDUCATIONAL SECTION */}
            <div className="space-y-8">
                
                {/* The Why */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-purple-500" />
                        WHY: Avoiding The Gambler's Ruin
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Most bettors fail not because they can't pick winners, but because they <strong>bet too much</strong> when they lose. 
                        Flat betting (e.g., $100 on every game) ignores your edge. Betting too big drains your bankroll during inevitable losing streaks.
                        <br/><br/>
                        Kelly optimizes for <strong>Geometric Growth</strong>. It bets more when the math is in your favor, and less when it's not.
                    </p>
                </div>

                {/* The What */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-cyan-500">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <BookOpen size={18} className="text-cyan-500" />
                        WHAT: The Formula
                    </h3>
                    <div className="bg-black/40 p-4 rounded-lg font-mono text-center text-cyan-300 text-lg mb-4 border border-slate-800">
                        f* = (bp - q) / b
                    </div>
                    <ul className="text-slate-400 text-sm space-y-2">
                        <li><strong className="text-white">f*</strong> = Fraction of bankroll to wager</li>
                        <li><strong className="text-white">b</strong> = Net odds received (Decimal - 1)</li>
                        <li><strong className="text-white">p</strong> = Probability of winning</li>
                        <li><strong className="text-white">q</strong> = Probability of losing (1 - p)</li>
                    </ul>
                </div>

                {/* The How */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        HOW: Fractional Implementation
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        "Full Kelly" is mathematically optimal but emotionally volatile. It assumes you know the <i>exact</i> probability of winning. In sports, probabilities are estimates.
                    </p>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-wide mb-1">The Noesis Strategy</p>
                        <p className="text-emerald-100/80 text-sm">
                            We use <strong>0.3x Kelly (Fractional)</strong>. This captures ~80% of the maximum growth rate while reducing variance (volatility) by 50%. It protects against model error.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};
