
import React, { useState, useMemo, useEffect } from 'react';
import { SummaryCards } from '../components/SummaryCards';
import { PerformanceChart } from '../components/PerformanceChart';
import { WeekView } from '../components/WeekView';
import { HighlightReel } from '../components/HighlightReel';
import { WeekData, DashboardStats, ChartDataPoint, UserBet, SummaryStats } from '../types';
import { calculateStats, generateChartData } from '../utils';
import { clsx } from 'clsx';
import { Layers, Zap, Combine, Cpu, Activity, User, Briefcase, RefreshCcw, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  weeks: WeekData[];
  stats: DashboardStats;
  chartData: ChartDataPoint[];
}

export const Dashboard: React.FC<DashboardProps> = ({ weeks, stats, chartData }) => {
  // SCOPE: Toggle between Model Data and User Data
  const [scope, setScope] = useState<'MODEL' | 'CLIENT'>('MODEL');
  
  // FILTER: Overall vs Singles vs Parlays (for Model View)
  const [statsView, setStatsView] = useState<'overall' | 'singles' | 'parlays'>('overall');

  // --- CLIENT PORTFOLIO STATE ---
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [loadingUserBets, setLoadingUserBets] = useState(false);

  useEffect(() => {
      if (scope === 'CLIENT') {
          fetchUserBets();
      }
  }, [scope]);

  const fetchUserBets = async () => {
      setLoadingUserBets(true);
      const { data, error } = await supabase
          .from('user_bets')
          .select('*')
          .order('created_at', { ascending: false });
      
      if (!error && data) {
          setUserBets(data as UserBet[]);
      }
      setLoadingUserBets(false);
  };

  // --- CLIENT STATS CALCULATION ---
  const clientStats: SummaryStats = useMemo(() => {
      const totalInvested = userBets.reduce((sum, bet) => sum + Number(bet.stake), 0);
      const netProfit = userBets.reduce((sum, bet) => {
          if (bet.status === 'WIN') return sum + Number(bet.to_win);
          if (bet.status === 'LOSS') return sum - Number(bet.stake);
          return sum; // Pending/Void
      }, 0);
      
      // Calculate Total Return (Stake + Profit for wins)
      const totalReturn = userBets.reduce((sum, bet) => {
          if (bet.status === 'WIN') return sum + Number(bet.stake) + Number(bet.to_win);
          if (bet.status === 'VOID') return sum + Number(bet.stake);
          return sum;
      }, 0);

      const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
      
      // Simple unit calc assuming $100 units for client view default
      const totalUnits = totalInvested / 100;
      const winningUnits = userBets.filter(b => b.status === 'WIN').reduce((sum, b) => sum + (Number(b.stake)/100), 0);
      const winCount = userBets.filter(b => b.status === 'WIN').length;
      const settledCount = userBets.filter(b => b.status === 'WIN' || b.status === 'LOSS').length;
      const winRate = settledCount > 0 ? (winCount / settledCount) * 100 : 0;

      return {
          totalInvested: Math.round(totalInvested),
          totalReturn: Math.round(totalReturn),
          netProfit: Math.round(netProfit),
          roi: parseFloat(roi.toFixed(1)),
          totalUnitsWagered: parseFloat(totalUnits.toFixed(2)),
          weightedWinRate: parseFloat(winRate.toFixed(1)),
          winningUnitsWagered: parseFloat(winningUnits.toFixed(2))
      };
  }, [userBets]);

  const pendingRisk = useMemo(() => {
      return Math.round(userBets.filter(b => b.status === 'PENDING').reduce((a,b) => a + Number(b.stake), 0));
  }, [userBets]);

  // Model Data (Default)
  const activeStats = scope === 'MODEL' ? stats[statsView] : clientStats;
  const activeChart = scope === 'MODEL' ? chartData : []; // Client chart not implemented yet

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                  <Cpu className="text-indigo-500" size={32} />
                  QuantumEdge v.2
              </h1>
              <p className="text-slate-400 text-sm">
                  {scope === 'MODEL' ? 'Official Model Performance & Signal Log' : 'Client Execution & PnL Tracking'}
              </p>
          </div>

          {/* MAIN SCOPE TOGGLE */}
          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex gap-1">
              <button
                  onClick={() => setScope('MODEL')}
                  className={clsx(
                      "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                      scope === 'MODEL' 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
              >
                  <Activity size={14} />
                  Model Performance
              </button>
              <button
                  onClick={() => setScope('CLIENT')}
                  className={clsx(
                      "flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                      scope === 'CLIENT' 
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
              >
                  <Briefcase size={14} />
                  Client Portfolio
              </button>
          </div>
      </div>

      {/* SUB-FILTER (Model Only) */}
      {scope === 'MODEL' && (
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800 flex gap-1">
                <button
                    onClick={() => setStatsView('overall')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                        statsView === 'overall' ? "bg-indigo-900/50 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white"
                    )}
                >
                    <Layers size={14} /> Overall
                </button>
                <button
                    onClick={() => setStatsView('singles')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                        statsView === 'singles' ? "bg-purple-900/50 text-purple-400 border border-purple-500/30" : "text-slate-400 hover:text-white"
                    )}
                >
                    <Zap size={14} /> Singles
                </button>
                <button
                    onClick={() => setStatsView('parlays')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                        statsView === 'parlays' ? "bg-violet-900/50 text-violet-400 border border-violet-500/30" : "text-slate-400 hover:text-white"
                    )}
                >
                    <Combine size={14} /> Parlays
                </button>
            </div>
        </div>
      )}

      {/* HERO STATS */}
      <div id="dashboard-summary" className="animate-in fade-in slide-in-from-bottom-2 duration-500" key={scope}>
          <SummaryCards stats={activeStats} />
      </div>

      {/* PERFORMANCE CHART (Model Only for now) */}
      {scope === 'MODEL' && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
             <div className="border rounded-2xl overflow-hidden transition-colors duration-500 border-indigo-500/20">
                 <PerformanceChart data={activeChart} />
             </div>
          </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Info Box */}
        <div className="lg:col-span-1 space-y-8">
           <div className="p-8 rounded-2xl relative overflow-hidden border transition-colors duration-500 bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500/30">
             <div className="absolute top-0 right-0 w-48 h-48 blur-3xl rounded-full pointer-events-none opacity-40 bg-indigo-500"></div>
             <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4 opacity-80">
                     <Activity size={16} className="text-indigo-400" />
                     <span className="text-xs font-bold uppercase tracking-widest text-white">
                         {scope === 'MODEL' ? 'Weighted Win Rate' : 'Personal Win Rate'}
                     </span>
                 </div>
                 
                 <div className="text-6xl font-black text-white mb-6 tracking-tighter">
                    {activeStats.weightedWinRate}%
                 </div>
                 
                 <div className="space-y-4">
                     <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                         <span className="text-slate-400">Total Volume</span>
                         <span className="font-mono font-bold text-white">{activeStats.totalUnitsWagered}u</span>
                     </div>
                     <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                         <span className="text-slate-400">Winning Volume</span>
                         <span className="font-mono font-bold text-indigo-300">
                             {activeStats.winningUnitsWagered}u
                         </span>
                     </div>
                 </div>
             </div>
           </div>
        </div>

        {/* Center Column: FEED OR TABLE */}
        <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {scope === 'MODEL' ? <Cpu size={20} className="text-indigo-500"/> : <User size={20} className="text-emerald-500"/>}
                    {scope === 'MODEL' ? 'Model Signal Log' : 'My Transaction History'}
                </h2>
                {scope === 'CLIENT' && (
                    <button 
                        onClick={fetchUserBets} 
                        disabled={loadingUserBets}
                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCcw size={14} className={loadingUserBets ? "animate-spin" : ""} />
                    </button>
                )}
            </div>
            
            {scope === 'MODEL' ? (
                <WeekView weeks={weeks} />
            ) : (
                <>
                    {/* CLIENT SPECIFIC MINI-DASHBOARD ABOVE TABLE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp size={40} className={clientStats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <TrendingUp size={12} className={clientStats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"} /> Net PNL
                            </span>
                            <span className={clsx("text-2xl font-black tracking-tight", clientStats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {clientStats.netProfit >= 0 ? '+' : ''}${clientStats.netProfit.toLocaleString()}
                            </span>
                        </div>
                        
                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign size={40} className="text-cyan-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <DollarSign size={12} className="text-cyan-500" /> Total Return
                            </span>
                            <span className="text-2xl font-black tracking-tight text-cyan-400">
                                ${clientStats.totalReturn.toLocaleString()}
                            </span>
                        </div>

                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Wallet size={40} className="text-amber-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Wallet size={12} className="text-amber-500" /> Pending Risk
                            </span>
                            <span className="text-2xl font-black tracking-tight text-amber-400">
                                ${pendingRisk.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl overflow-hidden border border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        <th className="py-4 px-6">Date</th>
                                        <th className="py-4 px-6">Selection</th>
                                        <th className="py-4 px-6 text-center">Odds</th>
                                        <th className="py-4 px-6 text-right">Stake</th>
                                        <th className="py-4 px-6 text-center">Status</th>
                                        <th className="py-4 px-6 text-right">P/L</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-sm font-mono">
                                    {loadingUserBets ? (
                                        <tr><td colSpan={6} className="py-12 text-center text-slate-500">Loading Portfolio...</td></tr>
                                    ) : userBets.length > 0 ? (
                                        userBets.map((bet) => (
                                            <tr key={bet.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-6 text-slate-400 text-xs">
                                                    {new Date(bet.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-white mb-0.5">{bet.selection}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase">{bet.market_type}</div>
                                                </td>
                                                <td className="py-4 px-6 text-center text-slate-300">{bet.odds}</td>
                                                <td className="py-4 px-6 text-right text-slate-300">${Number(bet.stake).toFixed(2)}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={clsx("px-2 py-1 rounded text-[10px] font-bold uppercase", 
                                                        bet.status === 'WIN' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                                                        bet.status === 'LOSS' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : 
                                                        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                    )}>
                                                        {bet.status}
                                                    </span>
                                                </td>
                                                <td className={clsx("py-4 px-6 text-right font-bold", 
                                                    bet.status === 'WIN' ? "text-emerald-400" : 
                                                    bet.status === 'LOSS' ? "text-rose-400" : "text-slate-500"
                                                )}>
                                                    {bet.status === 'WIN' ? `+$${Number(bet.to_win).toFixed(2)}` : 
                                                    bet.status === 'LOSS' ? `-$${Number(bet.stake).toFixed(2)}` : '--'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                                                No bets logged yet. Use the Bet Slip in 'Team Picks' to add wagers.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>

        {/* Right Column: Media Highlight Reel */}
        <div className="lg:col-span-1">
            <HighlightReel />
        </div>

      </div>
    </div>
  );
};
