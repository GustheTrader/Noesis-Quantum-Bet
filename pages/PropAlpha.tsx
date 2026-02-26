
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, TrendingUp, BarChart3, Filter, Search, RefreshCw, 
  ArrowRight, ShieldCheck, AlertCircle, Info, Target, 
  Layers, ChevronRight, Calculator, CheckCircle2, 
  Flame, BookOpen, ExternalLink, Activity, Shield, Anchor
} from 'lucide-react';
import { clsx } from 'clsx';

// --- TYPES ---
type League = 'NFL' | 'NBA' | 'NHL';

interface SharpOdds {
  over: number;  // American
  under: number; // American
  liquidity: 'HIGH' | 'MED' | 'LOW';
}

interface SoftLine {
  book: string;
  overOdds: number;
  underOdds: number;
  line: number;
  isDFS?: boolean;
}

interface PropOpportunity {
  id: string;
  league: League;
  game: string;
  startTime: string;
  player: string;
  stat: string;
  line: number;
  
  // Sharp Sources
  pinnacle: SharpOdds;
  circa: SharpOdds;
  novig: SharpOdds;
  prophetx: SharpOdds;

  // Soft Target
  bestSoft: SoftLine;
  
  // Calculated
  fairProb: number; // For the "Over"
  fairOdds: number; // American (no vig)
  ev: number;
  suitability: ('STRAIGHT' | 'DFS')[];
}

// --- MOCK DATA GENERATOR ---
const generateProps = (league: League): PropOpportunity[] => {
  const players: Record<League, string[]> = {
    NFL: ['Patrick Mahomes', 'Lamar Jackson', 'Josh Allen', 'CeeDee Lamb', 'Bijan Robinson'],
    NBA: ['LeBron James', 'Nikola Jokic', 'Luka Doncic', 'Kevin Durant', 'Steph Curry'],
    NHL: ['Connor McDavid', 'Auston Matthews', 'Nathan MacKinnon', 'Cale Makar', 'Kirill Kaprizov']
  };

  const stats: Record<League, string[]> = {
    NFL: ['Pass Yds', 'Rush Yds', 'Rec Yds', 'TDs'],
    NBA: ['Points', 'Rebounds', 'Assists', '3PM'],
    NHL: ['Shots on Goal', 'Points', 'Goals', 'Assists']
  };

  return Array.from({ length: 15 }).map((_, i) => {
    const player = players[league][i % 5];
    const stat = stats[league][i % 4];
    const baseLine = Math.floor(Math.random() * 40) + 0.5;
    
    // Pinnacle is the absolute anchor - we generate it first
    const pinOver = -130 - Math.floor(Math.random() * 25);
    const pinUnder = 100 + Math.floor(Math.random() * 15);
    
    // Other books deviate from the Pinnacle anchor
    const circaOver = pinOver + (Math.random() > 0.5 ? 5 : -5);
    const circaUnder = pinUnder + (Math.random() > 0.5 ? 5 : -5);
    
    const novigOver = pinOver + (Math.random() > 0.5 ? 10 : -10);
    const prophetxOver = pinOver + (Math.random() > 0.5 ? 8 : -8);

    // Calculate Fair Probability using the Pinnacle Anchor Method
    const getImplied = (american: number) => american > 0 ? 100 / (american + 100) : Math.abs(american) / (Math.abs(american) + 100);
    
    // Pinnacle weighted heavily at 50% for the baseline true probability
    const pPin = getImplied(pinOver) / (getImplied(pinOver) + getImplied(pinUnder));
    const pCirca = getImplied(circaOver) / (getImplied(circaOver) + getImplied(circaUnder));
    const pNovig = getImplied(novigOver) / (getImplied(novigOver) + (1 - getImplied(novigOver) + 0.04));
    const pProphet = getImplied(prophetxOver) / (getImplied(prophetxOver) + (1 - getImplied(prophetxOver) + 0.03));
    
    // Integrated Pinnacle Alpha Weighting (50% Pinnacle, 50% rest of sharp market)
    const fairProb = (pPin * 0.50) + (pCirca * 0.30) + (pNovig * 0.10) + (pProphet * 0.10); 
    const fairOdds = Math.round(fairProb > 0.5 ? -(fairProb / (1 - fairProb)) * 100 : ((1 - fairProb) / fairProb) * 100);

    // Generate Soft Book line
    const bestSoft: SoftLine = {
      book: Math.random() > 0.5 ? 'FanDuel' : 'DraftKings',
      overOdds: -110,
      underOdds: -110,
      line: baseLine,
      isDFS: Math.random() > 0.7
    };

    // Calculate EV based on the Pinnacle-Anchored Fair Probability
    const payoutFactor = 100 / Math.abs(bestSoft.overOdds);
    const ev = (fairProb * (1 + payoutFactor)) - 1;

    return {
      id: `${league}-${i}`,
      league,
      game: league === 'NFL' ? 'KC @ BAL' : league === 'NBA' ? 'LAL @ PHX' : 'EDM @ TOR',
      startTime: '7:30 PM EST',
      player,
      stat,
      line: baseLine,
      pinnacle: { over: pinOver, under: pinUnder, liquidity: 'HIGH' },
      circa: { over: circaOver, under: circaUnder, liquidity: 'HIGH' },
      novig: { over: novigOver, under: novigOver + 10, liquidity: 'MED' },
      prophetx: { over: prophetxOver, under: prophetxOver + 8, liquidity: 'MED' },
      bestSoft,
      fairProb,
      fairOdds,
      ev: ev * 100,
      suitability: ev > 0.04 ? ['STRAIGHT', 'DFS'] : ['STRAIGHT']
    };
  });
};

export const PropAlpha: React.FC = () => {
  const [activeLeague, setActiveLeague] = useState<League>('NBA');
  const [isScanning, setIsScanning] = useState(false);
  const [data, setData] = useState<PropOpportunity[]>([]);
  const [minEv, setMinEv] = useState(3.0);

  const fetchAlpha = async () => {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 1000));
    const props = generateProps(activeLeague);
    setData(props.sort((a, b) => b.ev - a.ev));
    setIsScanning(false);
  };

  useEffect(() => {
    fetchAlpha();
  }, [activeLeague]);

  const filteredData = useMemo(() => {
    return data.filter(d => d.ev >= minEv);
  }, [data, minEv]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
               <Anchor className="text-indigo-400" size={24} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Prop Alpha Engine</h1>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Market-driven exploitation scanning <span className="text-indigo-400 font-bold underline">Pinnacle (Main Anchor)</span>, Circa, Novig, and ProphetX. 
            We utilize Pinnacle's low-margin sharp lines to solve for the empirical fair-value of every market.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
           <div className="flex bg-black/40 rounded-xl p-1 border border-slate-700">
              {(['NFL', 'NBA', 'NHL'] as League[]).map(l => (
                <button 
                  key={l}
                  onClick={() => setActiveLeague(l)}
                  className={clsx(
                    "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    activeLeague === l ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                  )}
                >
                  {l}
                </button>
              ))}
           </div>
           
           <div className="h-10 w-px bg-slate-800 hidden md:block"></div>

           <div className="flex items-center gap-3 px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Min EV:</span>
              <input 
                type="range" min="0" max="10" step="0.5" 
                value={minEv} 
                onChange={(e) => setMinEv(parseFloat(e.target.value))}
                className="w-24 accent-indigo-500"
              />
              <span className="text-xs font-mono font-bold text-indigo-400">{minEv}%</span>
           </div>

           <button 
            onClick={fetchAlpha}
            disabled={isScanning}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
           >
              <RefreshCw size={14} className={clsx(isScanning && "animate-spin")} />
              Sync
           </button>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Pinnacle Integration</div>
          <div className="text-3xl font-black text-white flex items-center gap-2">ACTIVE <CheckCircle2 size={24} className="text-emerald-500" /></div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Avg Market Edge</div>
          <div className="text-3xl font-black text-emerald-400">
            +{(filteredData.reduce((a,b)=>a+b.ev, 0) / (filteredData.length || 1)).toFixed(1)}%
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Signal Strength</div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-4 rounded-sm ${i <= 4 ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>)}
            </div>
            <span className="text-xs font-bold text-slate-300 ml-2 uppercase">Aggregated</span>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Primary Reference</div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-indigo-600 rounded border border-indigo-400 text-[10px] font-black text-white uppercase tracking-tighter">PINNACLE ANCHOR</span>
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden relative">
        {isScanning && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Syncing Pinnacle Data Stream...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#08090f] border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="py-4 px-6">Prop Selection</th>
                <th className="py-4 px-4 text-center border-l border-indigo-500/30 bg-indigo-500/5">Pinnacle (Anchor)</th>
                <th className="py-4 px-4 text-center">Circa (Sharp)</th>
                <th className="py-4 px-4 text-center">Novig (Exch)</th>
                <th className="py-4 px-4 text-center border-l border-slate-800/50 bg-indigo-900/10">Fair Odds</th>
                <th className="py-4 px-6 text-center border-l border-slate-800/50">Best Soft Line</th>
                <th className="py-4 px-6 text-right">Edge %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                  {/* Selection */}
                  <td className="py-4 px-6">
                    <div className="text-xs text-slate-500 mb-1 font-bold">{row.game} • {row.startTime}</div>
                    <div className="font-black text-white text-base group-hover:text-indigo-400 transition-colors uppercase">{row.player}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold uppercase">{row.stat}</span>
                      <span className="text-white font-mono text-xs font-bold">{row.line}</span>
                    </div>
                  </td>

                  {/* Sharp Column: Pinnacle Anchor */}
                  <td className="py-4 px-4 border-l border-indigo-500/30 bg-indigo-500/5">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-mono text-emerald-400 font-black">{row.pinnacle.over}</div>
                      <div className="text-[10px] font-mono text-rose-400 font-black">{row.pinnacle.under}</div>
                      <div className="text-[8px] text-indigo-400 uppercase font-black mt-1">Main Signal</div>
                    </div>
                  </td>

                  {/* Sharp Column: Circa */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">{row.circa.over}</div>
                      <div className="text-[10px] font-mono text-rose-400">{row.circa.under}</div>
                      <div className="text-[8px] text-slate-600 uppercase font-black mt-1">Secondary</div>
                    </div>
                  </td>

                  {/* Exch Column: Novig */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-mono text-emerald-400 font-bold">{row.novig.over}</div>
                      <div className="text-[10px] font-mono text-rose-400">{row.novig.under}</div>
                      <div className="text-[8px] text-slate-600 uppercase font-black mt-1">Liquid</div>
                    </div>
                  </td>

                  {/* Fair Odds */}
                  <td className="py-4 px-4 border-l border-slate-800/50 bg-indigo-900/5 text-center">
                    <div className="text-sm font-black text-indigo-400 font-mono">{row.fairOdds}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Model True</div>
                  </td>

                  {/* Best Soft Line */}
                  <td className="py-4 px-6 border-l border-slate-800/50">
                    <div className="flex flex-col items-center">
                      <div className="text-xs font-black text-white uppercase">{row.bestSoft.book}</div>
                      <div className="px-3 py-1 bg-black border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold mt-1">
                        {row.bestSoft.overOdds}
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {row.suitability.map(s => (
                          <span key={s} className={clsx(
                            "text-[8px] px-1 rounded font-black",
                            s === 'DFS' ? "bg-purple-900/50 text-purple-400 border border-purple-500/20" : "bg-blue-900/50 text-blue-400 border border-blue-500/20"
                          )}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Edge % */}
                  <td className="py-4 px-6 text-right">
                    <div className={clsx(
                      "inline-block px-4 py-2 rounded-xl font-black text-sm transition-all",
                      row.ev > 5 ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110" : "bg-emerald-900/20 text-emerald-400 border border-emerald-500/30"
                    )}>
                      +{row.ev.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER LEGEND */}
      <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-wrap items-center gap-6 text-[10px] text-slate-500 uppercase tracking-widest font-black">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span>Consensus Weight: 50% Pinnacle (Main Anchor)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
            <span>Consensus Weight: 30% Circa (Sharp)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>Consensus Weight: 20% Exchange Signals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-slate-600 font-mono">Feed Status: PINNACLE-SYNC-OK</div>
          <div className="px-2 py-1 bg-indigo-600/20 border border-indigo-500/40 rounded text-[10px] text-indigo-400 font-black uppercase tracking-tighter">
            SHARP DATA FEED
          </div>
        </div>
      </div>

      {/* STRATEGY GUIDE SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          <div className="glass-panel p-8 rounded-3xl border border-indigo-500/10">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" />
                Sharp Arbitrage Guide
              </h3>
              <ul className="space-y-4 text-sm text-slate-400 leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-indigo-400 font-mono font-bold">01.</span>
                  <span><strong>The Pinnacle Standard:</strong> Pinnacle represents the limit of market intelligence. If Pinnacle is significantly sharper than your soft book, the math guarantees long-term profit.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-400 font-mono font-bold">02.</span>
                  <span><strong>Vig Stripping:</strong> Our model strips the "vig" (bookmaker fee) from Pinnacle's lines to find the true probability of the outcome.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-indigo-400 font-mono font-bold">03.</span>
                  <span><strong>Soft Exploitation:</strong> FanDuel and DraftKings often move slower than Pinnacle. We strike during these 5-15 minute latency windows.</span>
                </li>
              </ul>
          </div>
          <div className="glass-panel p-8 rounded-3xl border border-indigo-500/10 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-3">
                <Calculator className="text-indigo-400" />
                Kelly Sizing (Pinnacle Adjusted)
              </h3>
              <div className="p-4 bg-black/40 rounded-xl border border-slate-800 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Edge Intensity</span>
                  <span className="text-xs font-bold text-slate-500 uppercase">Risk %</span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-300"><span>3% - 4% (Standard)</span> <span className="text-indigo-400">0.5% - 1.0%</span></div>
                  <div className="flex justify-between text-white font-bold"><span>5% - 7% (High Alpha)</span> <span className="text-emerald-400">1.5% - 2.5%</span></div>
                  <div className="flex justify-between text-slate-300"><span>8% + (Outlier)</span> <span className="text-emerald-400">3.0% +</span></div>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">Pinnacle-anchored fair probability is used as the base for the Kelly Criterion formula.</p>
          </div>
      </div>

    </div>
  );
};
