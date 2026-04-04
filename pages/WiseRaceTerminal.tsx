
import React, { useState, useEffect } from 'react';
import { 
  Trophy, Activity, Clock, Zap, Target, 
  TrendingUp, BarChart3, Search, Filter,
  ChevronRight, ArrowRight, ShieldCheck,
  Timer, Globe, Calculator, Radio
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { clsx } from 'clsx';

interface HorseRunner {
    id: string;
    name: string;
    jockey: string;
    trainer: string;
    odds: string;
    speedFigure: number;
    classRating: number;
    winProb: number;
    edge: number;
    status: 'LIVE' | 'PARADE' | 'GATE';
}

const MOCK_RUNNERS: HorseRunner[] = [
    { id: 'h1', name: 'Quantum Leap', jockey: 'I. Ortiz Jr.', trainer: 'T. Pletcher', odds: '5/2', speedFigure: 104, classRating: 98, winProb: 34, edge: 6, status: 'GATE' },
    { id: 'h2', name: 'Cyber Sprint', jockey: 'F. Prat', trainer: 'B. Baffert', odds: '4/1', speedFigure: 101, classRating: 95, winProb: 22, edge: 4, status: 'GATE' },
    { id: 'h3', name: 'Digital Dash', jockey: 'J. Rosario', trainer: 'C. Brown', odds: '12/1', speedFigure: 98, classRating: 92, winProb: 12, edge: 8, status: 'GATE' },
    { id: 'h4', name: 'Alpha Mare', jockey: 'L. Saez', trainer: 'W. Mott', odds: '8/1', speedFigure: 96, classRating: 94, winProb: 15, edge: 3, status: 'GATE' },
    { id: 'h5', name: 'Binary Bet', jockey: 'T. Gaffalione', trainer: 'S. Asmussen', odds: '20/1', speedFigure: 92, classRating: 88, winProb: 8, edge: 5, status: 'GATE' },
];

const TRACK_BIAS_DATA = [
  { position: 'Rail', winRate: 18, impact: 1.2 },
  { position: 'Mid', winRate: 14, impact: 0.9 },
  { position: 'Wide', winRate: 11, impact: 0.7 },
];

export const WiseRaceTerminal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'analytics'>('terminal');
  const [runners, setRunners] = useState<HorseRunner[]>(MOCK_RUNNERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      // Simulate live odds fluctuations
      const interval = setInterval(() => {
          setRunners(prev => prev.map(r => ({
              ...r,
              winProb: Math.min(99, Math.max(1, r.winProb + (Math.random() > 0.5 ? 1 : -1)))
          })));
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
               <Trophy className="text-amber-400" size={28} />
            </div>
            <div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">WiseRace AI Terminal</h1>
                <p className="text-amber-500/60 font-mono text-[10px] uppercase tracking-[0.4em] mt-1">Proprietary Equine Analytics v4.0</p>
            </div>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed">
            Real-time speed figures, class ratings, and <span className="text-amber-400 font-bold underline">Track Bias</span> analysis. 
            Identify value in the pools before the gates open.
          </p>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 shadow-2xl">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={clsx(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'terminal' ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Race Terminal
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={clsx(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'analytics' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Track Analytics
          </button>
        </div>
      </div>

      {activeTab === 'terminal' ? (
          <div className="space-y-8">
              
              {/* RACE INFO BAR */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Current Track</div>
                      <div className="text-lg font-black text-white uppercase">Churchill Downs</div>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Race Number</div>
                      <div className="text-lg font-black text-white uppercase">Race 9 (G1)</div>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Surface / Dist</div>
                      <div className="text-lg font-black text-white uppercase">Dirt / 1 1/4 M</div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-amber-500 uppercase font-black mb-1">Post Time</div>
                        <div className="text-lg font-black text-white uppercase">02:45 Mins</div>
                      </div>
                      <Clock className="text-amber-500 animate-pulse" size={24} />
                  </div>
              </div>

              {/* RUNNERS GRID */}
              <div className="grid grid-cols-1 gap-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 px-6 py-3 bg-slate-900/80 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800">
                      <div className="col-span-4">Runner / Connections</div>
                      <div className="col-span-2 text-center">Speed / Class</div>
                      <div className="col-span-2 text-center">M/L Odds</div>
                      <div className="col-span-2 text-center">AI Win Prob</div>
                      <div className="col-span-2 text-center">Value Edge</div>
                  </div>

                  {runners.map(r => (
                      <div key={r.id} className="grid grid-cols-12 px-6 py-4 bg-black/40 border border-slate-800 rounded-xl items-center hover:border-amber-500/30 transition-all group">
                          
                          {/* Name & Connections */}
                          <div className="col-span-4">
                              <div className="text-base font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{r.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1">J: {r.jockey} | T: {r.trainer}</div>
                          </div>

                          {/* Metrics */}
                          <div className="col-span-2 text-center">
                              <div className="flex justify-center gap-3">
                                  <div className="text-center">
                                      <div className="text-[9px] text-slate-600 uppercase font-bold">SPD</div>
                                      <div className="text-sm font-black text-white">{r.speedFigure}</div>
                                  </div>
                                  <div className="text-center">
                                      <div className="text-[9px] text-slate-600 uppercase font-bold">CLS</div>
                                      <div className="text-sm font-black text-white">{r.classRating}</div>
                                  </div>
                              </div>
                          </div>

                          {/* Odds */}
                          <div className="col-span-2 text-center">
                              <div className="text-lg font-black text-slate-300">{r.odds}</div>
                          </div>

                          {/* AI Prob */}
                          <div className="col-span-2 text-center">
                              <div className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded text-indigo-400 font-black text-sm">
                                  {r.winProb}%
                              </div>
                          </div>

                          {/* Edge */}
                          <div className="col-span-2 flex justify-center">
                              <div className={clsx(
                                  "flex flex-col items-center justify-center w-20 h-12 rounded-lg border transition-all",
                                  r.edge > 5 ? "bg-emerald-900/10 border-emerald-500/30 text-emerald-400" : "bg-slate-900/10 border-slate-800 text-slate-500"
                              )}>
                                  <span className="text-[10px] font-bold uppercase">Edge</span>
                                  <span className="text-lg font-black">+{r.edge}%</span>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                      <div className="glass-panel p-8 rounded-3xl border border-slate-800 mb-8">
                          <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
                              <BarChart3 className="text-amber-400" />
                              Track Bias Visualization
                          </h3>
                          <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={TRACK_BIAS_DATA}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                      <XAxis dataKey="position" stroke="#475569" tick={{fontSize: 12}} axisLine={false} />
                                      <YAxis stroke="#475569" tick={{fontSize: 12}} axisLine={false} />
                                      <Tooltip 
                                          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #334155', borderRadius: '8px' }}
                                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                      />
                                      <Bar dataKey="winRate" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                          {TRACK_BIAS_DATA.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#334155'} />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                          <p className="text-slate-400 text-sm mt-6 leading-relaxed">
                              Current track conditions favor <strong className="text-white">Inside Speed</strong>. Rail positions are winning at an 18% clip, significantly higher than the wide draws. Adjusting model weights for early speed horses in gates 1-3.
                          </p>
                      </div>

                      <div className="glass-panel p-8 rounded-3xl border border-slate-800">
                          <h3 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
                              <ShieldCheck className="text-indigo-400" />
                              WiseRace AI Methodology
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                  <h4 className="text-indigo-400 font-bold text-xs uppercase mb-2">Neural Speed Maps</h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">Analyzing past performance data across 100+ variables to generate predictive speed figures adjusted for track variant.</p>
                              </div>
                              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                  <h4 className="text-indigo-400 font-bold text-xs uppercase mb-2">Class Parity Engine</h4>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">Normalizing performance across different circuits and class levels to identify true competitive ability.</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="space-y-8">
                      <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-900/10 to-transparent">
                          <div className="flex items-center gap-3 mb-6">
                              <Radio className="text-amber-500 animate-pulse" size={20} />
                              <h3 className="text-lg font-black text-white uppercase">Live Alpha Feed</h3>
                          </div>
                          <div className="space-y-4">
                              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] text-slate-500 uppercase font-bold">CD Race 9</span>
                                      <span className="text-emerald-400 font-mono text-[10px]">+8.4% Edge</span>
                                  </div>
                                  <div className="text-sm font-bold text-white uppercase">Digital Dash: WIN</div>
                                  <div className="flex justify-between mt-2 text-[10px] font-mono">
                                      <span className="text-slate-500">Fair: 8/1</span>
                                      <span className="text-amber-400">Current: 12/1</span>
                                  </div>
                              </div>
                          </div>
                          <button className="w-full mt-6 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-amber-500/20">Execute Kelly Stake</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* FOOTER */}
      <div className="mt-16 text-center text-[10px] text-slate-600 font-mono uppercase tracking-[0.3em]">WiseRaceAi.com // Proprietary Terminal v2026.1</div>
    </div>
  );
};
