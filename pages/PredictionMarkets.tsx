
import React, { useState } from 'react';
import { 
  BarChart3, Zap, Info, ShieldCheck, Globe, 
  TrendingDown, TrendingUp, Clock, ArrowRight,
  ChevronRight, Calculator, AlertTriangle, Radio,
  ArrowRightLeft, Trophy, Activity, Timer, Target,
  Layers, BookOpen, CheckCircle2, Search
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine 
} from 'recharts';
import { clsx } from 'clsx';

// Data from quantitative analysis
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
               <BarChart3 className="text-pink-400" size={24} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Binary Alpha Hub</h1>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed">
            Exploiting event-contract inefficiencies across <span className="text-pink-400 font-bold underline">Kalshi</span> and <span className="text-indigo-400 font-bold underline">Polymarket</span>. 
            We focus on live NFL micro-outcomes where market repricing lags behind empirical probability decay.
          </p>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 shadow-2xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={clsx(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'overview' ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Market Specs & Strategy
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

      {activeTab === 'overview' ? (
        <div className="space-y-16">
          
          {/* PLATFORM CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-panel p-8 rounded-3xl border border-emerald-500/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <ShieldCheck className="text-emerald-400" size={32} />
                  </div>
                  <div className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded text-[10px] font-black text-emerald-400 tracking-widest uppercase">Regulated (CFTC)</div>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">KALSHI</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">The first federally regulated exchange for event contracts. Clear and cleared; trades are matched and guaranteed by a central clearinghouse.</p>
                <div className="space-y-3 mb-8 text-xs text-slate-300">
                  <div className="flex items-center gap-3"><ChevronRight size={14} className="text-emerald-500" /><span>Direct USD Onramps</span></div>
                  <div className="flex items-center gap-3"><ChevronRight size={14} className="text-emerald-500" /><span>Zero Counterparty Risk (Cleared)</span></div>
                  <div className="flex items-center gap-3"><ChevronRight size={14} className="text-emerald-500" /><span>Strict CFTC Oversight</span></div>
                </div>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
                    <Globe className="text-indigo-400" size={32} />
                  </div>
                  <div className="px-3 py-1 bg-indigo-950/40 border border-indigo-500/30 rounded text-[10px] font-black text-indigo-400 tracking-widest uppercase">Decentralized (Web3)</div>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">POLYMARKET</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">The world's largest prediction market. Built on Polygon, leveraging AMMs and high volume for deep global liquidity.</p>
                <div className="space-y-3 mb-8 text-xs text-slate-300">
                  <div className="flex items-center gap-3"><ChevronRight size={14} className="text-indigo-500" /><span>Global Liquidity & Whale Volume</span></div>
                  <div className="flex items-center gap-3"><ChevronRight size={14} className="text-indigo-500" /><span>Instant USDC Settlement</span></div>
                  <div className="flex items-center gap-3"><ChevronRight size={14} className="text-indigo-500" /><span>Permissionless Market Creation</span></div>
                </div>
            </div>
          </div>

          {/* ARBITRAGE MODELING SECTION */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 mb-2">
                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center flex items-center gap-3">
                    <ArrowRightLeft className="text-pink-400" />
                    Arbitrage Modeling in Binary Markets
                </h2>
                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold mb-4">01</div>
                    <h4 className="font-bold text-white uppercase mb-2">Convert Odds</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Translate sportsbook fractional/decimal odds into implied probabilities. In prediction markets, the price itself is the probability (e.g., $0.72 = 72%).</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold mb-4">02</div>
                    <h4 className="font-bold text-white uppercase mb-2">Compare Venues</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Search for variance where Venue A prices P(yes) = 0.62 and Venue B prices P(yes) = 0.48. Dynamic live markets are the most inefficient.</p>
                </div>
                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold mb-4">03</div>
                    <h4 className="font-bold text-white uppercase mb-2">Size & Stake</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">When over‑round &lt; 1, split stakes to cover both sides. This locks in profit regardless of the event outcome (Yes or No).</p>
                </div>
            </div>
          </div>

          {/* END-OF-GAME DYNAMICS BY SPORT */}
          <div className="space-y-8">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Timer className="text-yellow-500" />
                  End-of-Game State Exploitation
              </h2>
              <p className="text-slate-400 text-sm max-w-4xl">Near the end of games, the space of possible outcomes collapses. Binary prices frequently overreact to single plays, creating windows where our models outperform generic sportsbook templates.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* NFL */}
                  <div className="bg-[#0f172a]/40 p-6 rounded-2xl border border-slate-800 hover:border-pink-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Trophy className="text-indigo-400" size={20} /> NFL
                          </h4>
                          <span className="text-[10px] bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">DRIVE-BASED</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">Final 2–3 minutes are determined by ball possession, field position, and timeouts. Our drive-based posterior for "YES" (e.g., "Will there be another score?") is often sharper than static sportsbook templates.</p>
                      <div className="p-3 bg-black/40 rounded-lg border border-slate-800 text-[10px] font-mono text-indigo-300">
                          Strategy: Buy "YES" at 0.40 on Pred-Mkts when model implies 0.52; hedge on books near 0.48.
                      </div>
                  </div>

                  {/* Basketball */}
                  <div className="bg-[#0f172a]/40 p-6 rounded-2xl border border-slate-800 hover:border-pink-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Activity className="text-orange-500" size={20} /> Basketball
                          </h4>
                          <span className="text-[10px] bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">POSSESSION-FLOW</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">Basketball is a game of runs and late fouling. Binary prices often overreact to small late leads. Lead-change strategies (betting both sides at plus money snapshots) capture massive volatility edge.</p>
                      <div className="p-3 bg-black/40 rounded-lg border border-slate-800 text-[10px] font-mono text-orange-300">
                          Strategy: Exploit exchange overreactions (e.g., 75% pricing on a 60% real chance) using possession win-prob.
                      </div>
                  </div>

                  {/* Soccer */}
                  <div className="bg-[#0f172a]/40 p-6 rounded-2xl border border-slate-800 hover:border-pink-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Globe className="text-emerald-500" size={20} /> Soccer
                          </h4>
                          <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">1X2 DECOMPOSITION</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">In 80'+ states, books heavily favor the leading side. Late penalty rates and added time volatility make comeback chances non-negligible. We decompose 1X2 markets into binary pairs.</p>
                      <div className="p-3 bg-black/40 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-300">
                          Strategy: Cross-market "Team A win" binary on Kalshi vs. implied prob from sportsbook 1X2 markets.
                      </div>
                  </div>

                  {/* Tennis */}
                  <div className="bg-[#0f172a]/40 p-6 rounded-2xl border border-slate-800 hover:border-pink-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                              <Target className="text-yellow-400" size={20} /> Tennis
                          </h4>
                          <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">MARKOV-STRUCTURE</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">Point-by-point Markov structure gives exact probabilities in endgame states (e.g., serving for match). High-frequency models on edge nodes compute "YES" probability at 5-4 40-30 with extreme accuracy.</p>
                      <div className="p-3 bg-black/40 rounded-lg border border-slate-800 text-[10px] font-mono text-yellow-300">
                          Strategy: Compare sub-second Markov fair-price to binary contract quotes on exchanges for instant mispricing.
                      </div>
                  </div>
              </div>
          </div>

          {/* ARBITRAGE FRAMEWORK */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-pink-900/10 p-10 rounded-3xl border border-slate-800 shadow-2xl">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Calculator className="text-pink-400" />
                    Arbitrage Band Mathematics
                  </h3>
                  <div className="space-y-4 text-slate-300 leading-relaxed text-sm">
                    <p>A yes/no contract makes arbitrage math trivial compared to fractional odds. We normalize all inputs into a universal probability format.</p>
                    <div className="bg-black/60 p-6 rounded-xl border border-white/10 font-mono space-y-3">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-500">Condition:</span>
                            <span className="text-pink-400 font-bold">p(A) + (1 - p(B)) &lt; 1</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed italic">
                            Where p(A) is buy price of YES and p(B) is buy price of NO. If sum is &lt; 1, an arbitrage band exists.
                        </div>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5" size={16}/><span><strong>Normalization:</strong> Binary prices (0-1) are treated as universal asset formats.</span></li>
                        <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5" size={16}/><span><strong>Execution:</strong> Size legs so both pay exactly $1.00 on win, locking in the spread.</span></li>
                    </ul>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20">
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Sample Arbitrage Execution</h4>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-black">Exchange 1 (YES)</div>
                                <div className="text-xl font-black text-white">0.46 <span className="text-xs text-slate-500 font-normal">(46%)</span></div>
                            </div>
                            <ArrowRight className="text-slate-700" />
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase font-black">Exchange 2 (NO)</div>
                                <div className="text-xl font-black text-white">0.60 <span className="text-xs text-slate-500 font-normal">(Implies 40% YES)</span></div>
                            </div>
                        </div>
                        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 text-center">
                            <div className="text-[10px] text-emerald-400 uppercase font-black mb-1">Arbitrage Opportunity</div>
                            <div className="text-2xl font-black text-white">14% Net ROI</div>
                            <div className="text-[9px] text-emerald-500/70 mt-1 uppercase">Total Prob: 0.86 (Band: 0.14)</div>
                        </div>
                        <p className="text-[11px] text-slate-500 italic">This risk-neutral position pays out regardless of the game outcome because the combined market probability is under 100%.</p>
                    </div>
                </div>
             </div>
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

              <section className="glass-panel p-8 rounded-3xl border border-indigo-500/20">
                <h2 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
                  <AlertTriangle className="text-yellow-400" />
                  Execution Strategies
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-black/30 rounded-xl border border-slate-800">
                    <h4 className="text-indigo-400 font-bold uppercase text-xs mb-2">Strategy 1: Decay Fade</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Short "yes" at the 3:00 mark (85% implied vs 81% fair), then cover and flip long at 1:30 (68% implied vs 73% fair). Targeted return: 9% per cycle.</p>
                  </div>
                  <div className="p-5 bg-black/30 rounded-xl border border-slate-800">
                    <h4 className="text-indigo-400 font-bold uppercase text-xs mb-2">Strategy 2: Event Spike</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Monitor for turnover events via &lt;500ms feed. Turnover-triggered win probability models lag actual outcomes by 2-5 seconds, creating brief arbitrage windows.</p>
                  </div>
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
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 opacity-60 grayscale">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">PHI vs DAL (2nd 1:15)</span>
                      <span className="text-slate-500 font-mono text-[10px]">Market Efficient</span>
                    </div>
                    <div className="text-sm font-bold text-slate-300 uppercase">Field Goal Attempt: YES</div>
                    <div className="flex justify-between mt-2 text-[10px] font-mono">
                      <span className="text-slate-500">Fair: $0.45</span>
                      <span className="text-slate-500">Poly: $0.46</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-6 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-pink-500/20">Execute Fractional Kelly</button>
              </div>

              {/* RISK WARNING */}
              <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/5">
                <h4 className="text-rose-500 font-black uppercase tracking-widest text-[10px] mb-2">Latency Risk Warning</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">A 200ms execution delay can result in missing 5-10% probability movements during high-velocity periods. Never trade live binary slates on standard TV broadcasts.</p>
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
