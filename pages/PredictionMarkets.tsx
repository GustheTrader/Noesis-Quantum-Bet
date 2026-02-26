
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Zap, Info, ShieldCheck, Globe, 
  TrendingDown, TrendingUp, Clock, ArrowRight,
  ChevronRight, Calculator, AlertTriangle, Radio,
  ArrowRightLeft, Trophy, Activity, Timer, Target,
  Layers, BookOpen, CheckCircle2, Search, PlayCircle
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine 
} from 'recharts';
import { clsx } from 'clsx';

// MOCK DATA TYPES
interface BinaryMarket {
    id: string;
    event: string;
    marketName: string;
    yesPrice: number; // 0-99 cents
    noPrice: number;
    volume: number;
    timeLeft: string;
    type: 'IN_GAME' | 'PREGAME';
    isAsymmetrical?: boolean; // Highlight for asymmetry tab
    trueProb?: number; // Model's calculated probability
    edge?: number;
}

// MOCK DATA GENERATOR
const generateMarkets = (): BinaryMarket[] => [
    // IN-GAME (Fast Decay)
    { id: 'ig-1', event: 'KC vs BAL', marketName: 'Next Drive: Touchdown', yesPrice: 34, noPrice: 68, volume: 15400, timeLeft: 'Drive 4', type: 'IN_GAME', trueProb: 41, edge: 7 },
    { id: 'ig-2', event: 'KC vs BAL', marketName: 'Mahomes 2+ Passing TDs', yesPrice: 88, noPrice: 13, volume: 45000, timeLeft: 'Q4 12:00', type: 'IN_GAME' },
    { id: 'ig-3', event: 'KC vs BAL', marketName: 'Next Score: Field Goal', yesPrice: 45, noPrice: 57, volume: 8900, timeLeft: 'Drive 4', type: 'IN_GAME' },
    { id: 'ig-4', event: 'SF vs LAR', marketName: 'CMC Anytime TD', yesPrice: 72, noPrice: 29, volume: 12000, timeLeft: 'Q2 5:00', type: 'IN_GAME' },
    
    // PREGAME (Macro)
    { id: 'pg-1', event: 'BUF vs MIA', marketName: 'Bills Win Game', yesPrice: 58, noPrice: 44, volume: 120000, timeLeft: 'Sun 8:20PM', type: 'PREGAME' },
    { id: 'pg-2', event: 'PHI vs DAL', marketName: 'Eagles Win Game', yesPrice: 62, noPrice: 40, volume: 98000, timeLeft: 'Sun 4:25PM', type: 'PREGAME' },
    { id: 'pg-3', event: 'DET vs CHI', marketName: 'Total Points > 48.5', yesPrice: 51, noPrice: 51, volume: 34000, timeLeft: 'Sun 1:00PM', type: 'PREGAME' },
    
    // ASYMMETRICAL (High Edge / Low Risk)
    { id: 'as-1', event: 'NYJ vs NE', marketName: 'Patriots Win (Moneyline)', yesPrice: 22, noPrice: 80, volume: 5000, timeLeft: 'Sun 1:00PM', type: 'PREGAME', isAsymmetrical: true, trueProb: 35, edge: 13 },
    { id: 'as-2', event: 'KC vs BAL', marketName: 'Next Play: Turnover', yesPrice: 4, noPrice: 97, volume: 2000, timeLeft: 'Live', type: 'IN_GAME', isAsymmetrical: true, trueProb: 9, edge: 5 },
    { id: 'as-3', event: 'GB vs MIN', marketName: 'Love 300+ Pass Yds', yesPrice: 18, noPrice: 84, volume: 4100, timeLeft: 'Sun 1:00PM', type: 'PREGAME', isAsymmetrical: true, trueProb: 28, edge: 10 },
];

const DECAY_DATA = [
  { time: '3:00', posProb: 81, turnProb: 9.4, label: 'Baseline' },
  { time: '2:30', posProb: 78, turnProb: 7.9, label: '' },
  { time: '2:00', posProb: 76, turnProb: 6.4, label: '2-Min Warning' },
  { time: '1:30', posProb: 73, turnProb: 4.8, label: '' },
  { time: '1:00', posProb: 49, turnProb: 3.2, label: 'Step Decay' },
  { time: '0:30', posProb: 7, turnProb: 1.6, label: 'Collapse' },
  { time: '0:05', posProb: 1, turnProb: 0.3, label: 'Expiry' },
];

export const PredictionMarkets: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'analysis'>('terminal');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'IN_GAME' | 'PREGAME' | 'ASYMMETRY'>('ALL');
  const [markets, setMarkets] = useState<BinaryMarket[]>([]);

  useEffect(() => {
      setMarkets(generateMarkets());
      // Simulate live price updates
      const interval = setInterval(() => {
          setMarkets(prev => prev.map(m => {
              if (m.type === 'IN_GAME' || Math.random() > 0.8) {
                  const shift = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
                  return { ...m, yesPrice: Math.min(99, Math.max(1, m.yesPrice + shift)) };
              }
              return m;
          }));
      }, 2000);
      return () => clearInterval(interval);
  }, []);

  const filteredMarkets = markets.filter(m => {
      if (marketFilter === 'ALL') return true;
      if (marketFilter === 'ASYMMETRY') return m.isAsymmetrical;
      return m.type === marketFilter;
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
               <Globe className="text-pink-400" size={24} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Binary Edge Alpha</h1>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed">
            Direct feed of Event Contracts from <span className="text-pink-400 font-bold underline">Kalshi</span> and <span className="text-indigo-400 font-bold underline">Polymarket</span>. 
            Identify mispriced probabilities in real-time.
          </p>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 shadow-2xl">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={clsx(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'terminal' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Live Terminal
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={clsx(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'analysis' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Quant Analysis
          </button>
        </div>
      </div>

      {activeTab === 'terminal' ? (
          <div className="space-y-8">
              
              {/* TERMINAL CONTROLS */}
              <div className="flex gap-4 border-b border-slate-800 pb-4">
                  {(['ALL', 'IN_GAME', 'PREGAME', 'ASYMMETRY'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setMarketFilter(f)}
                        className={clsx(
                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                            marketFilter === f 
                                ? f === 'ASYMMETRY' ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" : "bg-white text-black border-white"
                                : "bg-transparent border-transparent text-slate-500 hover:text-white hover:bg-slate-800"
                        )}
                      >
                          {f === 'ASYMMETRY' && <Zap size={12} className="inline mr-2" />}
                          {f.replace('_', ' ')}
                      </button>
                  ))}
              </div>

              {/* ASYMMETRY HIGHLIGHT HEADER (If Filter is ALL or ASYMMETRY) */}
              {(marketFilter === 'ALL' || marketFilter === 'ASYMMETRY') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-yellow-500 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Zap size={64} className="text-yellow-500" />
                          </div>
                          <h3 className="text-yellow-400 font-bold uppercase text-xs mb-2 flex items-center gap-2">
                              <Zap size={14} /> Great Asymmetrical Bets
                          </h3>
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">
                              Opportunities where the market prices an outcome below 25¢ ($0.25), but our models project &gt; 35% probability. Low risk, high convexity.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                              Scanning {markets.filter(m => m.isAsymmetrical).length} Active Nodes...
                          </div>
                      </div>
                      
                      {/* Featured Asymmetry Cards */}
                      {markets.filter(m => m.isAsymmetrical).slice(0, 2).map(m => (
                          <div key={m.id} className="bg-slate-900/50 border border-yellow-500/20 p-6 rounded-2xl flex flex-col justify-between group hover:bg-yellow-900/10 transition-colors">
                              <div>
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] text-slate-500 font-bold bg-black/40 px-2 py-1 rounded">{m.event}</span>
                                      <span className="text-[10px] text-emerald-400 font-mono font-bold">+{m.edge}% Edge</span>
                                  </div>
                                  <h4 className="text-white font-bold text-lg leading-tight mb-4">{m.marketName}</h4>
                              </div>
                              <div className="flex items-end justify-between">
                                  <div>
                                      <div className="text-[10px] text-slate-500 uppercase font-black">Buy Price</div>
                                      <div className="text-3xl font-black text-yellow-400">${(m.yesPrice / 100).toFixed(2)}</div>
                                  </div>
                                  <div className="text-right">
                                       <div className="text-[10px] text-slate-500 uppercase font-black">Model True</div>
                                       <div className="text-xl font-bold text-white">{(m.trueProb! / 100).toFixed(2)}</div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* MARKET GRID */}
              <div className="grid grid-cols-1 gap-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 px-6 py-3 bg-slate-900/80 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800">
                      <div className="col-span-4">Event Contract</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-2 text-center">Market Vol</div>
                      <div className="col-span-2 text-center">YES (Bid)</div>
                      <div className="col-span-2 text-center">NO (Ask)</div>
                  </div>

                  {filteredMarkets.map(m => (
                      <div key={m.id} className="grid grid-cols-12 px-6 py-4 bg-black/40 border border-slate-800 rounded-xl items-center hover:border-indigo-500/30 transition-all group">
                          
                          {/* Event Name */}
                          <div className="col-span-4">
                              <div className="flex items-center gap-2 mb-1">
                                  {m.type === 'IN_GAME' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                                  <span className="text-xs font-bold text-slate-400">{m.event}</span>
                              </div>
                              <div className="text-base font-black text-white group-hover:text-pink-400 transition-colors">{m.marketName}</div>
                          </div>

                          {/* Status */}
                          <div className="col-span-2 text-center">
                              <div className={clsx("text-xs font-mono font-bold", m.type === 'IN_GAME' ? "text-rose-400" : "text-slate-400")}>
                                  {m.timeLeft}
                              </div>
                              {m.isAsymmetrical && <div className="text-[9px] text-yellow-500 uppercase font-black tracking-widest mt-1">Asymmetric</div>}
                          </div>

                          {/* Volume */}
                          <div className="col-span-2 text-center">
                              <div className="text-xs font-mono text-slate-300">${(m.volume / 1000).toFixed(1)}k</div>
                          </div>

                          {/* YES PRICE */}
                          <div className="col-span-2 flex justify-center">
                              <button className="flex flex-col items-center justify-center bg-emerald-900/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 w-20 h-12 rounded-lg transition-all group/btn">
                                  <span className="text-xs font-bold text-emerald-500 group-hover/btn:text-black">Yes</span>
                                  <span className="text-lg font-black text-white group-hover/btn:text-black">{m.yesPrice}¢</span>
                              </button>
                          </div>

                          {/* NO PRICE */}
                          <div className="col-span-2 flex justify-center">
                              <button className="flex flex-col items-center justify-center bg-rose-900/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white hover:border-rose-400 w-20 h-12 rounded-lg transition-all group/btn">
                                  <span className="text-xs font-bold text-rose-500 group-hover/btn:text-white">No</span>
                                  <span className="text-lg font-black text-white">{m.noPrice}¢</span>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-700">
          {/* THE CHART SECTION */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 mb-10 overflow-hidden relative">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Probability Decay Dynamics</h3>
                <p className="text-slate-500 text-sm font-mono uppercase tracking-widest"> NFL TIED GAMES: FINAL 3:00 MINUTES</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Alpha Zone: 2:00 - 1:00
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded text-[10px] font-black text-pink-400 uppercase tracking-widest">
                  Latency Threshold: &lt;200ms
                </div>
              </div>
            </div>

            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DECAY_DATA}>
                  <defs>
                    <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="turnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10}} axisLine={false} label={{ value: 'Time Remaining', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10 }} />
                  <YAxis stroke="#475569" tick={{fontSize: 10}} axisLine={false} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine x="1:00" stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'CRITICAL COLLAPSE', position: 'top', fill: '#f43f5e', fontSize: 10 }} />
                  <Area type="monotone" name="New Possession Prob" dataKey="posProb" stroke="#ec4899" strokeWidth={4} fill="url(#probGrad)" dot={{ r: 4, fill: '#ec4899' }} />
                  <Area type="monotone" name="Turnover Prob" dataKey="turnProb" stroke="#6366f1" strokeWidth={2} fill="url(#turnGrad)" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QUANT ANALYSIS REPORT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="glass-panel p-8 rounded-3xl border border-slate-800">
                <h2 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
                  <Calculator className="text-pink-400" />
                  Quantitative Analysis Summary
                </h2>
                <div className="prose prose-invert prose-pink max-w-none space-y-6 text-slate-300 font-light leading-relaxed">
                  <p>In tied football games with 3 minutes remaining, binary options on "new possession" events experience dramatic probability decay, moving from approximately <strong className="text-white">80% to near 0%</strong> as time expires.</p>
                  <p>At the 3:00 mark, the implied probability for a "yes" outcome sits at <strong className="text-pink-400">81%</strong>, driven by the high likelihood that the current drive will end before time expires. However, this probability collapses to approximately <strong className="text-rose-500">1%</strong> by the final 5 seconds.</p>
                  <div className="bg-black/40 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-pink-500">
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Critical 2:00 to 1:00 Window</h4>
                    <p className="text-sm">The 2:00-1:00 window experiences a <strong className="text-white">27 percentage point drop</strong> in new possession probability—the steepest decline in the entire sequence.</p>
                  </div>
                  <h3 className="text-white font-bold uppercase text-sm mt-8">Execution Architecture: &lt;200ms Latency</h3>
                  <p className="text-sm">Probability shifts of 5-10% can occur within seconds. For sub-200ms total execution, traders combine Institutional-grade APIs with Cloud Edge compute (Cloudflare Workers) and Direct Exchange API access.</p>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              {/* LIVE EDGE MODULE */}
              <div className="glass-panel p-6 rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-900/10 to-transparent">
                <div className="flex items-center gap-3 mb-6">
                  <Radio className="text-pink-500 animate-pulse" size={20} />
                  <h3 className="text-lg font-black text-white uppercase">Live Alpha Feed</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">KC vs BAL (4th 2:55)</span>
                      <span className="text-emerald-400 font-mono text-[10px]">+11.2% Edge</span>
                    </div>
                    <div className="text-sm font-bold text-white uppercase">New Possession: YES</div>
                    <div className="flex justify-between mt-2 text-[10px] font-mono">
                      <span className="text-slate-500">Fair: $0.81</span>
                      <span className="text-pink-400">Kalshi: $0.70</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-6 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-pink-500/20">Execute Fractional Kelly</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="mt-16 text-center text-[10px] text-slate-600 font-mono uppercase tracking-[0.3em]">Proprietary Model Feed v2025.2 // Sub-Second Synchronized</div>
    </div>
  );
};
