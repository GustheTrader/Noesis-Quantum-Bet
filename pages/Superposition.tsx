
import React, { useState, useEffect } from 'react';
import { Infinity, ArrowRightLeft, Globe, Coins, Zap, ShieldCheck, TrendingUp, AlertTriangle, Layers } from 'lucide-react';
import { clsx } from 'clsx';

export const Superposition: React.FC = () => {
  const [activeExample, setActiveExample] = useState(0);

  // Animation cycle for the visualizer
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveExample((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="text-center mb-16 relative">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
         <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-6 uppercase tracking-tighter drop-shadow-lg relative z-10 flex items-center justify-center gap-4">
            <Infinity className="text-indigo-400 animate-pulse" size={48} />
            Quantum Superposition
         </h1>
         <p className="text-xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed relative z-10">
            The mathematical certainty of profit derived from holding two contradictory market positions simultaneously.
            <br/>
            <span className="text-indigo-400 font-bold">The Crossed Arb Engine.</span>
         </p>
      </div>

      {/* CONCEPTUAL FRAMEWORK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          
          {/* VISUALIZER CARD */}
          <div className="glass-panel p-1 rounded-3xl border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-black to-purple-900/40 opacity-50"></div>
              
              <div className="relative z-10 p-8 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                          <ArrowRightLeft className="text-pink-400" />
                          Live Dislocation
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          ARB ACTIVE
                      </div>
                  </div>

                  {/* Dynamic Simulation Content */}
                  <div className="flex-grow flex flex-col justify-center gap-6 relative">
                      {/* Connection Line */}
                      <div className="absolute left-1/2 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent -translate-x-1/2 z-0"></div>

                      {/* SIDE A */}
                      <div className={clsx("relative z-10 bg-slate-900/80 border p-4 rounded-xl flex justify-between items-center transition-all duration-500", activeExample === 0 ? "border-indigo-500 shadow-lg shadow-indigo-500/20" : "border-slate-700 opacity-60")}>
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">FD</div>
                              <div>
                                  <div className="text-xs text-slate-400 uppercase">Legacy Sportsbook</div>
                                  <div className="font-bold text-white">Chiefs Moneyline</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-2xl font-black text-white">+110</div>
                              <div className="text-xs text-emerald-400 font-mono">Impled: 47.6%</div>
                          </div>
                      </div>

                      {/* VS BADGE */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black border border-white/20 rounded-full p-2">
                          <span className="font-black text-xs text-slate-500">VS</span>
                      </div>

                      {/* SIDE B */}
                      <div className={clsx("relative z-10 bg-slate-900/80 border p-4 rounded-xl flex justify-between items-center transition-all duration-500", activeExample === 0 ? "border-pink-500 shadow-lg shadow-pink-500/20" : "border-slate-700 opacity-60")}>
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-black border border-white/20 flex items-center justify-center font-bold text-xs">POLY</div>
                              <div>
                                  <div className="text-xs text-slate-400 uppercase">Web3 Prediction Market</div>
                                  <div className="font-bold text-white">Chiefs Lose (No)</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-2xl font-black text-white">+105</div>
                              <div className="text-xs text-emerald-400 font-mono">Implied: 48.8%</div>
                          </div>
                      </div>
                  </div>

                  {/* CALCULATION FOOTER */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="flex justify-between items-end">
                          <div>
                              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Risk Exposure</div>
                              <div className="text-white font-mono">0.00 (Market Neutral)</div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Guaranteed Yield</div>
                              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                  +3.65% ROI
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Instant Settlement</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* EXPLANATION TEXT */}
          <div className="flex flex-col justify-center space-y-8">
              <div>
                  <h2 className="text-3xl font-bold text-white mb-4">Velocity of Money</h2>
                  <p className="text-slate-400 text-lg leading-relaxed">
                      In traditional finance, yield is annual. In <span className="text-white font-bold">Quantum Superposition</span>, yield is transactional.
                      <br/><br/>
                      By identifying "Crossed Markets"—where Book A pays +110 on an outcome and Book B pays +105 on the inverse—we lock in a profit regardless of the result. 
                      This is not gambling. This is liquidity providing.
                  </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                      <ShieldCheck className="text-indigo-400 mb-3" size={24} />
                      <h4 className="font-bold text-white uppercase tracking-wider text-sm mb-1">Zero Directional Risk</h4>
                      <p className="text-xs text-slate-500">Outcome independence. Who wins the game is irrelevant to the P&L.</p>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                      <Zap className="text-pink-400 mb-3" size={24} />
                      <h4 className="font-bold text-white uppercase tracking-wider text-sm mb-1">Capital Recycling</h4>
                      <p className="text-xs text-slate-500">Funds settle instantly in binary markets, allowing daily compounding.</p>
                  </div>
              </div>
          </div>
      </div>

      {/* NEW MARKETS GRID */}
      <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
              <h2 className="text-2xl font-bold text-slate-200 uppercase tracking-widest text-center">
                  The Expanding Ecosystem
              </h2>
              <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
              
              {/* Card 1: Sweepstakes */}
              <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] glass-panel p-6 rounded-2xl hover:border-yellow-500/50 transition-all hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Coins className="text-yellow-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">Sweepstakes Casinos</h3>
                  <p className="text-xs text-slate-400 mb-3 font-mono">Fliff, Rebet, Sportzino</p>
                  <p className="text-sm text-slate-300">
                      Legal in 40+ states. These apps offer "Social Currency" that converts to cash, often creating massive arbitrage lines against sharp books due to recreational flow.
                  </p>
              </div>

              {/* Card 2: Prediction Markets (CFTC & Event) */}
              <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] glass-panel p-6 rounded-2xl hover:border-emerald-500/50 transition-all hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <TrendingUp className="text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">Prediction Markets (Event)</h3>
                  <p className="text-xs text-slate-400 mb-3 font-mono">Kalshi, PredictIt, Polymarket</p>
                  <p className="text-sm text-slate-300">
                      Event contracts and binary options. Kalshi (CFTC Regulated) and Polymarket offer high-volume binary structures perfect for hedging against standard Sportsbook odds.
                  </p>
              </div>

              {/* Card 3: Web3 */}
              <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] glass-panel p-6 rounded-2xl hover:border-pink-500/50 transition-all hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Globe className="text-pink-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">Decentralized (Web3)</h3>
                  <p className="text-xs text-slate-400 mb-3 font-mono">Crypto.com, BetDex, SX.Bet</p>
                  <p className="text-sm text-slate-300">
                      Smart contract settlement on Polygon/Solana chains. No limits, global liquidity. Crypto.com and SX offer exchange-like interfaces with minimal fees.
                  </p>
              </div>

              {/* Card 4: DFS Pick'em */}
              <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] glass-panel p-6 rounded-2xl hover:border-cyan-500/50 transition-all hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="text-cyan-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">DFS Pick'em</h3>
                  <p className="text-xs text-slate-400 mb-3 font-mono">PrizePicks, Underdog, Betr</p>
                  <p className="text-sm text-slate-300">
                      Fixed payout structures allow us to "solve" for profitability by correlating outcomes that books price as independent events.
                  </p>
              </div>

              {/* Card 5: International P2P */}
              <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)] glass-panel p-6 rounded-2xl hover:border-indigo-500/50 transition-all hover:-translate-y-1 group">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Layers className="text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white mb-2">International P2P & Exchanges</h3>
                  <p className="text-xs text-slate-400 mb-3 font-mono">Betfair, Smarkets</p>
                  <p className="text-sm text-slate-300">
                      UK/European betting exchanges that allow users to "Lay" (Short) outcomes directly against other peers. The purest form of market liquidity with true price discovery.
                  </p>
              </div>

          </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="text-center p-6 border border-dashed border-indigo-500/30 rounded-xl bg-indigo-900/10">
          <div className="flex items-center justify-center gap-2 text-indigo-300 font-bold uppercase tracking-widest text-xs mb-2">
              <AlertTriangle size={14} />
              Execution Warning
          </div>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Superposition requires multiple funded accounts and rapid execution. Prices in these markets are ephemeral. 
              The Quantum Bets "StatsEdge" tool is designed to identify these openings in real-time.
          </p>
      </div>

    </div>
  );
};
