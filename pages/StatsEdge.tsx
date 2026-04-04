
import React, { useState, useEffect } from 'react';
import { Radar, TrendingUp, AlertTriangle, RefreshCw, Trophy, Layers, ArrowRightLeft, Calculator, Target, BookOpen, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { League } from '../types';

// --- CONFIGURATION: DFS PAYOUT MULTIPLIERS & IMPLIED ODDS ---
const PAYOUT_MATRIX = [
    { id: 'pp-5', site: 'PrizePicks', type: 'Flex', legs: 5, multiplier: '10x', impliedAmerican: -119, breakEven: 54.25, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { id: 'pp-6', site: 'PrizePicks', type: 'Flex', legs: 6, multiplier: '25x', impliedAmerican: -119, breakEven: 54.25, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { id: 'ud-3', site: 'Underdog', type: 'Standard', legs: 3, multiplier: '6x', impliedAmerican: -122, breakEven: 54.95, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    { id: 'ud-5', site: 'Underdog', type: 'Standard', legs: 5, multiplier: '20x', impliedAmerican: -122, breakEven: 54.95, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    { id: 'dk-pick6', site: 'DK Pick6', type: 'Dynamic', legs: 4, multiplier: '~10x', impliedAmerican: -125, breakEven: 55.56, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
];

const SHARP_BOOKS = [
    { name: 'Pinnacle', weight: 1.0, icon: 'P' },
    { name: 'Circa', weight: 0.95, icon: 'C' },
    { name: 'Bookmaker', weight: 0.9, icon: 'B' }
];

// --- MOCK DATA GENERATORS ---
const PLAYERS = [
    'J. Allen', 'L. Jackson', 'C. McCaffrey', 'T. Hill', 'J. Jefferson', 
    'A. Brown', 'C. Lamb', 'B. Robinson', 'D. Henry', 'S. Barkley', 
    'K. Murray', 'D. Prescott', 'G. Wilson', 'P. Nacua', 'T. Kelce'
];
const STATS = ['Pass Yds', 'Rush Yds', 'Rec Yds', 'Receptions', 'Fantasy Pts'];

interface ScannerRow {
    id: string;
    player: string;
    stat: string;
    line: number;
    side: 'OVER' | 'UNDER';
    
    // Sharp Data
    sharpBook: string;
    sharpOdds: number; // e.g. -150
    winProb: number; // True probability derived from sharp odds
    
    // DFS Data
    dfsSite: string;
    dfsType: string;
    dfsImplied: number; // e.g. -119
    
    // Math
    ev: number;
    edge: number; // Probability Gap
}

interface StatsEdgeProps {
  activeLeague: League;
}

export const StatsEdge: React.FC<StatsEdgeProps> = ({ activeLeague }) => {
  const [scannerRows, setScannerRows] = useState<ScannerRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'LIVE_DB' | 'QUANTUM_SIM'>('QUANTUM_SIM');
  const [activeTab, setActiveTab] = useState<'arbitrage' | 'calculator'>('arbitrage');

  // --- ARBITRAGE SIMULATION ENGINE ---
  const runSimulation = () => {
        const rows: ScannerRow[] = [];
        
        // Generate opportunities
        for (let i = 0; i < 40; i++) {
            const player = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
            const stat = STATS[Math.floor(Math.random() * STATS.length)];
            const line = Math.floor(Math.random() * 50) + 0.5;
            const side = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            const sharpBook = SHARP_BOOKS[Math.floor(Math.random() * SHARP_BOOKS.length)].name;

            // 1. Generate Sharp Odds (Heavily Juiced Lines create the Arb)
            // We want scenarios where Sharp is -130 to -165
            const sharpOdds = -125 - Math.floor(Math.random() * 45); 
            
            // Remove Vig to get True Win Probability
            // Simplified No-Vig calc for simulation
            const impliedSharp = Math.abs(sharpOdds) / (Math.abs(sharpOdds) + 100);
            const trueWinProb = impliedSharp - 0.025; // Remove ~2.5% theoretical vig

            // 2. Find Best DFS Fit
            // We compare True Win Prob against DFS Break Even Prob
            let bestEv = -Infinity;
            let bestSiteData = PAYOUT_MATRIX[0];

            PAYOUT_MATRIX.forEach(dfs => {
                const dfsBreakEven = dfs.breakEven / 100;
                
                // EV Equation for DFS: (WinProb * PayoutMultiplier) - 1 ?? 
                // Easier: Compare Odds.
                // EV = (TrueWinProb * DecimalPayout) - 1
                // Where DecimalPayout of the specific leg roughly equals (1 / DfsBreakEven)
                
                const legReturn = 1 / dfsBreakEven; 
                const ev = (trueWinProb * legReturn) - 1;

                if (ev > bestEv) {
                    bestEv = ev;
                    bestSiteData = dfs;
                }
            });

            // Only keep Positive EV plays or near neutral for realism
            if (bestEv > -0.02) { 
                rows.push({
                    id: `scan-${i}`,
                    player,
                    stat,
                    line,
                    side,
                    sharpBook,
                    sharpOdds,
                    winProb: trueWinProb * 100,
                    dfsSite: bestSiteData.site,
                    dfsType: bestSiteData.type + ` (${bestSiteData.legs}-Leg)`,
                    dfsImplied: bestSiteData.impliedAmerican,
                    ev: bestEv * 100,
                    edge: (trueWinProb * 100) - bestSiteData.breakEven
                });
            }
        }
        
        rows.sort((a, b) => b.ev - a.ev);
        setScannerRows(rows);
        setDataSource('QUANTUM_SIM');
        setLastScanTime(new Date());
  };

  const handleScan = async () => {
      setIsScanning(true);
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1200));
      runSimulation();
      setIsScanning(false);
  };

  // Initial Load
  useEffect(() => {
      runSimulation();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 mb-2 uppercase tracking-tighter">
                    {activeLeague} StatsEdge Arbitrage
                </h1>
                <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                    The engine identifies <span className="text-white font-bold">price dislocations</span> between high-limit sharp books (Pinnacle/Circa) and fixed-payout DFS multipliers for <span className="text-emerald-400 font-bold">{activeLeague}</span>.
                    We exploit the gap between "True Probability" and "Implied Probability".
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Market Status</div>
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        LIQUIDITY DETECTED
                    </div>
                </div>
                <button 
                    onClick={handleScan}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw size={16} className={clsx(isScanning && "animate-spin")} />
                    {isScanning ? 'Running Solver...' : 'Scan Markets'}
                </button>
            </div>
        </div>

        {/* 1. PAYOUT MATRIX DASHBOARD (THE TARGETS) */}
        <div className="mb-12">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target size={16} className="text-purple-400"/> DFS Implied Probability Matrix (The Targets)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {PAYOUT_MATRIX.map((item) => (
                    <div key={item.id} className={clsx("glass-panel p-4 rounded-xl border relative overflow-hidden group", item.border)}>
                        <div className={clsx("absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity", item.color)}>
                            <Layers size={40} />
                        </div>
                        <div className="relative z-10">
                            <div className={clsx("text-xs font-black uppercase mb-1", item.color)}>{item.site}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-3">{item.type} • {item.legs} Legs</div>
                            
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <div className="text-[10px] text-slate-500">Break Even</div>
                                    <div className="text-lg font-mono font-bold text-white">{item.breakEven}%</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500">Implied</div>
                                    <div className={clsx("text-lg font-mono font-bold", item.color)}>{item.impliedAmerican}</div>
                                </div>
                            </div>
                            
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className={clsx("h-full", item.bg.replace('/10', '/60'))} style={{width: `${item.breakEven}%`}}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 2. MAIN ARBITRAGE FEED */}
        <div className="glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden relative">
            {/* Table Header */}
            <div className="p-6 border-b border-slate-800 bg-black/40 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <ArrowRightLeft size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Live Discrepancies</h2>
                        <p className="text-xs text-slate-500">Props where Sharp Odds exceed DFS Implied Odds</p>
                    </div>
                </div>
                <div className="flex gap-2">
                   <div className="px-3 py-1 rounded bg-black border border-slate-800 text-[10px] text-slate-400 font-mono flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       DataSource: {dataSource}
                   </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-800">
                            <th className="py-4 px-6">Opportunity</th>
                            <th className="py-4 px-6 text-center">Sharp Intelligence (Reference)</th>
                            <th className="py-4 px-6 text-center">DFS Inefficiency (Target)</th>
                            <th className="py-4 px-6 text-right">Probability Gap</th>
                            <th className="py-4 px-6 text-right">EV %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm">
                        {scannerRows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                                {/* 1. The Play */}
                                <td className="py-4 px-6">
                                    <div className="font-bold text-white mb-0.5">{row.player}</div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={clsx("font-bold", row.side === 'OVER' ? "text-emerald-400" : "text-rose-400")}>{row.side}</span>
                                        <span className="text-white font-mono">{row.line}</span>
                                        <span className="text-slate-400">{row.stat}</span>
                                    </div>
                                </td>

                                {/* 2. Sharp Book Data */}
                                <td className="py-4 px-6">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{row.sharpBook}</span>
                                        </div>
                                        <div className="px-3 py-1 bg-black/40 border border-slate-700 rounded font-mono text-emerald-400 font-bold">
                                            {row.sharpOdds}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                            True Win: {(row.winProb).toFixed(1)}%
                                        </div>
                                    </div>
                                </td>

                                {/* 3. DFS Data */}
                                <td className="py-4 px-6">
                                    <div className="flex flex-col items-center">
                                        <div className="text-[10px] font-bold text-purple-400 uppercase mb-1">{row.dfsSite}</div>
                                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded font-mono text-white font-bold">
                                            {row.dfsImplied}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                            {row.dfsType}
                                        </div>
                                    </div>
                                </td>

                                {/* 4. The Gap (Visual) */}
                                <td className="py-4 px-6 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-xs font-bold text-white">
                                            +{row.edge.toFixed(1)}% Edge
                                        </div>
                                        {/* Visual Bar showing Gap */}
                                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-slate-600" style={{width: '54%'}} title="DFS Breakeven"></div>
                                            <div className="h-full bg-emerald-500" style={{width: `${row.edge}%`}} title="Profit Zone"></div>
                                        </div>
                                        <div className="text-[9px] text-slate-500">
                                            {54.2}% vs {row.winProb.toFixed(1)}%
                                        </div>
                                    </div>
                                </td>

                                {/* 5. EV */}
                                <td className="py-4 px-6 text-right">
                                    <div className={clsx(
                                        "inline-block px-3 py-1.5 rounded-lg font-black text-sm border",
                                        row.ev > 5 ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : 
                                        "bg-emerald-950/30 text-emerald-400 border-emerald-500/30"
                                    )}>
                                        +{row.ev.toFixed(1)}%
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <Info size={14} />
                    <span>Calculations assume optimal slip sizing (e.g. 5-Flex for PrizePicks) to minimize implied odds.</span>
                </div>
                <div>
                    Displaying Top {scannerRows.length} Opportunities
                </div>
            </div>
        </div>

        {/* 3. EXPLANATION / HOW IT WORKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                <h3 className="text-white font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen size={18} className="text-purple-400" />
                    The Math: Fixed Payouts
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    DFS sites like PrizePicks do not change their payouts based on the player. A prop for <span className="text-white">Patrick Mahomes</span> pays the same as a prop for a backup RB.
                    <br/><br/>
                    <strong>The Flaw:</strong> Sharp books adjust odds based on probability. If Pinnacle sets a line at <strong>-160 (61.5%)</strong>, but PrizePicks offers it at a fixed <strong>-119 (54.3%)</strong>, we have a massive mathematical advantage.
                </p>
                <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">Static Pricing</span>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">vs</span>
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">Efficient Market</span>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
                <h3 className="text-white font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    Optimal Slip Configuration
                </h3>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold mt-0.5">1</div>
                        <div>
                            <strong className="text-white">PrizePicks 5-Pick Flex</strong>
                            <div className="text-xs">Implied Odds: -119. Best long-term EV structure.</div>
                        </div>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold mt-0.5">2</div>
                        <div>
                            <strong className="text-white">Underdog 3-Pick Power</strong>
                            <div className="text-xs">Implied Odds: -122. 6x Payout. High variance but solid edge.</div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>

    </div>
  );
};
    