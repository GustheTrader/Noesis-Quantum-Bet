
import React, { useState, useMemo, useEffect } from 'react';
import { SummaryCards } from '../components/SummaryCards';
import { PerformanceChart } from '../components/PerformanceChart';
import { WeekView } from '../components/WeekView';
import { HighlightReel } from '../components/HighlightReel';
import { WeekData, DashboardStats, ChartDataPoint, UserBet, SummaryStats, League } from '../types';
import { calculateStats, generateChartData } from '../utils';
import { clsx } from 'clsx';
import { 
  Layers, Zap, Combine, Cpu, Activity, User, Briefcase, RefreshCcw, 
  TrendingUp, DollarSign, Wallet, PieChart as PieChartIcon, 
  ArrowUpRight, ArrowDownRight, History, BarChart3, Target, Calendar,
  Filter, Search, ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  weeks: WeekData[];
  stats: DashboardStats;
  chartData: ChartDataPoint[];
  activeLeague: League;
}

type SortKey = keyof UserBet | 'date';
type SortDirection = 'asc' | 'desc';

export const Dashboard: React.FC<DashboardProps> = ({ weeks, stats, chartData, activeLeague }) => {
  const [scope, setScope] = useState<'MODEL' | 'CLIENT'>('MODEL');
  const [statsView, setStatsView] = useState<'overall' | 'singles' | 'parlays'>('overall');
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [loadingUserBets, setLoadingUserBets] = useState(false);

  // Table State
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });

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
          .order('created_at', { ascending: true }); // Ascending for chart chronological flow
      
      if (!error && data) {
          setUserBets(data as UserBet[]);
      }
      setLoadingUserBets(false);
  };

  const filteredUserBets = useMemo(() => {
      return userBets.filter(b => b.market_type === activeLeague);
  }, [userBets, activeLeague]);

  // --- CLIENT ANALYTICS ---
  const clientAnalytics = useMemo(() => {
      const settledBets = filteredUserBets.filter(b => b.status === 'WIN' || b.status === 'LOSS');
      const totalInvested = settledBets.reduce((sum, b) => sum + Number(b.stake), 0);
      const netProfit = settledBets.reduce((sum, b) => {
          if (b.status === 'WIN') return sum + Number(b.to_win);
          if (b.status === 'LOSS') return sum - Number(b.stake);
          return sum;
      }, 0);

      const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
      const winCount = settledBets.filter(b => b.status === 'WIN').length;
      const lossCount = settledBets.filter(b => b.status === 'LOSS').length;
      const winRate = settledBets.length > 0 ? (winCount / settledBets.length) * 100 : 0;

      // Cumulative PnL Data for Chart
      let runningPnl = 0;
      const pnlHistory = settledBets.map(bet => {
          const impact = bet.status === 'WIN' ? Number(bet.to_win) : -Number(bet.stake);
          runningPnl += impact;
          return {
              time: new Date(bet.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
              pnl: Math.round(runningPnl),
              stake: Number(bet.stake)
          };
      });

      // Market Exposure (Pie Chart)
      const exposureMap: Record<string, number> = {};
      filteredUserBets.forEach(b => {
          const type = b.market_type || 'Unknown';
          exposureMap[type] = (exposureMap[type] || 0) + Number(b.stake);
      });
      const exposureData = Object.entries(exposureMap).map(([name, value]) => ({ name, value }));

      return {
          stats: {
              totalInvested: Math.round(totalInvested),
              totalReturn: Math.round(totalInvested + netProfit),
              netProfit: Math.round(netProfit),
              roi: parseFloat(roi.toFixed(1)),
              winRate: parseFloat(winRate.toFixed(1)),
              pendingRisk: Math.round(filteredUserBets.filter(b => b.status === 'PENDING').reduce((a,b) => a + Number(b.stake), 0)),
              totalVolume: Math.round(filteredUserBets.reduce((a,b) => a + Number(b.stake), 0)),
              winCount,
              lossCount
          },
          pnlHistory,
          exposureData
      };
  }, [filteredUserBets]);

  // --- SORTING & FILTERING ---
  const processedBets = useMemo(() => {
      let data = [...filteredUserBets];

      // 1. Filter
      if (filterStatus !== 'ALL') {
          data = data.filter(b => b.status === filterStatus);
      }
      if (filterText) {
          const lower = filterText.toLowerCase();
          data = data.filter(b => 
              b.selection.toLowerCase().includes(lower) || 
              b.market_type?.toLowerCase().includes(lower) ||
              b.odds.toLowerCase().includes(lower)
          );
      }

      // 2. Sort
      data.sort((a, b) => {
          const aValue = sortConfig.key === 'date' ? new Date(a.created_at).getTime() : a[sortConfig.key as keyof UserBet];
          const bValue = sortConfig.key === 'date' ? new Date(b.created_at).getTime() : b[sortConfig.key as keyof UserBet];

          // Handle numeric values (stake, pnl, etc stored as potential strings or numbers)
          const isNumeric = sortConfig.key === 'stake' || sortConfig.key === 'pnl' || sortConfig.key === 'to_win';
          
          if (isNumeric) {
              const numA = Number(aValue) || 0;
              const numB = Number(bValue) || 0;
              return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }

          // Handle strings
          const strA = String(aValue || '').toLowerCase();
          const strB = String(bValue || '').toLowerCase();
          
          if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });

      return data;
  }, [filteredUserBets, filterText, filterStatus, sortConfig]);

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
      if (sortConfig.key !== column) return <ArrowUpDown size={12} className="text-slate-600 opacity-0 group-hover:opacity-50" />;
      return sortConfig.direction === 'asc' 
          ? <ChevronUp size={12} className="text-cyan-400" /> 
          : <ChevronDown size={12} className="text-cyan-400" />;
  };

  const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
      
      {/* HEADER & TOGGLE */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                  <Cpu className="text-indigo-500" size={32} />
                  QuantumEdge v.2
              </h1>
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                      {scope === 'MODEL' ? 'Official Model Performance' : 'Client Execution Terminal'}
                  </p>
              </div>
          </div>

          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex gap-1 shadow-2xl">
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

      {scope === 'MODEL' ? (
          <>
            <div className="flex justify-center mb-8">
                <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800 flex gap-1">
                    <button onClick={() => setStatsView('overall')} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all", statsView === 'overall' ? "bg-indigo-900/50 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white")}> <Layers size={14} /> Overall </button>
                    <button onClick={() => setStatsView('singles')} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all", statsView === 'singles' ? "bg-purple-900/50 text-purple-400 border border-purple-500/30" : "text-slate-400 hover:text-white")}> <Zap size={14} /> Singles </button>
                    <button onClick={() => setStatsView('parlays')} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all", statsView === 'parlays' ? "bg-violet-900/50 text-violet-400 border border-violet-500/30" : "text-slate-400 hover:text-white")}> <Combine size={14} /> Parlays </button>
                </div>
            </div>
            <SummaryCards stats={stats[statsView]} allStats={stats} />
            <PerformanceChart data={chartData} />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <div className="p-8 rounded-2xl relative overflow-hidden border bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500/30">
                        <div className="absolute top-0 right-0 w-48 h-48 blur-3xl rounded-full pointer-events-none opacity-40 bg-indigo-500"></div>
                        <div className="relative z-10 text-center">
                            <Activity size={32} className="text-indigo-400 mx-auto mb-4" />
                            <h4 className="text-xs font-black uppercase text-slate-400 mb-2">Global Edge Rating</h4>
                            <div className="text-6xl font-black text-white tracking-tighter mb-4">{stats[statsView].weightedWinRate}%</div>
                            <p className="text-[10px] text-indigo-300 font-mono uppercase">Unit-Adjusted Performance</p>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <WeekView weeks={weeks} />
                </div>
                <div className="lg:col-span-1">
                    <HighlightReel />
                </div>
            </div>
          </>
      ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Summary Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 relative group">
                      <TrendingUp className="absolute top-6 right-6 text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors" size={48} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Net PnL</p>
                      <h3 className={clsx("text-4xl font-black tracking-tight", clientAnalytics.stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                          {clientAnalytics.stats.netProfit >= 0 ? '+' : ''}${clientAnalytics.stats.netProfit.toLocaleString()}
                      </h3>
                      <div className="mt-4 flex items-center gap-2">
                          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded", clientAnalytics.stats.roi >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                              {clientAnalytics.stats.roi}% ROI
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono italic">Closed PnL</span>
                      </div>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 relative group">
                      <DollarSign className="absolute top-6 right-6 text-cyan-500/20 group-hover:text-cyan-500/40 transition-colors" size={48} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Stake Volume</p>
                      <h3 className="text-4xl font-black text-white tracking-tight">${clientAnalytics.stats.totalVolume.toLocaleString()}</h3>
                      <div className="mt-4 flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded">
                              {userBets.length} Tickets
                          </span>
                      </div>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 relative group">
                      <Wallet className="absolute top-6 right-6 text-amber-500/20 group-hover:text-amber-500/40 transition-colors" size={48} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Market Risk</p>
                      <h3 className="text-4xl font-black text-amber-400 tracking-tight">${clientAnalytics.stats.pendingRisk.toLocaleString()}</h3>
                  </div>
                  <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 relative group">
                      <Target className="absolute top-6 right-6 text-purple-500/20 group-hover:text-purple-500/40 transition-colors" size={48} />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Strike Win Rate</p>
                      <h3 className="text-4xl font-black text-purple-400 tracking-tight">{clientAnalytics.stats.winRate}%</h3>
                      <div className="mt-4 flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                              {clientAnalytics.stats.winCount} Wins - {clientAnalytics.stats.lossCount} Losses
                          </span>
                      </div>
                  </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  <div className="lg:col-span-2 glass-panel p-8 rounded-2xl border border-slate-800">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                                  <TrendingUp className="text-emerald-500" size={20} />
                                  Equity Curve
                              </h3>
                          </div>
                      </div>
                      <div className="h-[300px] w-full">
                          {clientAnalytics.pnlHistory.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={clientAnalytics.pnlHistory}>
                                      <defs>
                                          <linearGradient id="clientPnl" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                          </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                      <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10}} axisLine={false} />
                                      <YAxis stroke="#475569" tick={{fontSize: 10}} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                      <Tooltip 
                                          contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #334155', borderRadius: '8px'}}
                                          itemStyle={{color: '#10b981', fontWeight: 'bold'}}
                                      />
                                      <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={3} fill="url(#clientPnl)" />
                                  </AreaChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                                  <History size={32} className="mb-2 opacity-20" />
                                  <p className="text-xs font-mono uppercase">Insufficient Data for Equity Curve</p>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="glass-panel p-8 rounded-2xl border border-slate-800 flex flex-col">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight mb-8">
                          <PieChartIcon className="text-cyan-500" size={20} />
                          Market Exposure
                      </h3>
                      <div className="flex-grow flex items-center justify-center">
                          {clientAnalytics.exposureData.length > 0 ? (
                              <div className="w-full h-full relative">
                                  <ResponsiveContainer width="100%" height={240}>
                                      <PieChart>
                                          <Pie
                                              data={clientAnalytics.exposureData}
                                              innerRadius={60}
                                              outerRadius={80}
                                              paddingAngle={5}
                                              dataKey="value"
                                          >
                                              {clientAnalytics.exposureData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Pie>
                                          <Tooltip />
                                      </PieChart>
                                  </ResponsiveContainer>
                              </div>
                          ) : (
                              <div className="text-center py-10 opacity-20"><PieChartIcon size={48} className="mx-auto mb-2"/> <p className="text-[10px] uppercase font-black">No Data</p></div>
                          )}
                      </div>
                  </div>
              </div>

              {/* BET HISTORY TABLE SECTION */}
              <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 mb-20">
                  <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                          <h2 className="text-xl font-black text-white flex items-center gap-3">
                              <History size={20} className="text-indigo-400" />
                              Bet History
                          </h2>
                          
                          <div className="flex gap-4 w-full md:w-auto">
                              {/* Search */}
                              <div className="relative group flex-grow md:flex-grow-0">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
                                  <input 
                                      type="text" 
                                      placeholder="Search selections..." 
                                      value={filterText}
                                      onChange={(e) => setFilterText(e.target.value)}
                                      className="w-full md:w-64 bg-slate-950/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                                  />
                              </div>

                              {/* Status Filter */}
                              <div className="relative">
                                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                  <select 
                                      value={filterStatus}
                                      onChange={(e) => setFilterStatus(e.target.value)}
                                      className="bg-slate-950/50 border border-slate-700/50 rounded-lg pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                                  >
                                      <option value="ALL">All Status</option>
                                      <option value="PENDING">Pending</option>
                                      <option value="WIN">Win</option>
                                      <option value="LOSS">Loss</option>
                                      <option value="VOID">Void</option>
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={12} />
                              </div>

                              <button onClick={fetchUserBets} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all border border-slate-700">
                                  <RefreshCcw size={14} className={loadingUserBets ? "animate-spin" : ""} />
                              </button>
                          </div>
                      </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-slate-950/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800">
                                  <th className="py-4 px-6 cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('date')}>
                                      <div className="flex items-center gap-2">Date <SortIcon column="date"/></div>
                                  </th>
                                  <th className="py-4 px-6 cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('selection')}>
                                      <div className="flex items-center gap-2">Selection <SortIcon column="selection"/></div>
                                  </th>
                                  <th className="py-4 px-6 cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('market_type')}>
                                      <div className="flex items-center gap-2">Market Type <SortIcon column="market_type"/></div>
                                  </th>
                                  <th className="py-4 px-6 text-center cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('odds')}>
                                      <div className="flex items-center justify-center gap-2">Odds <SortIcon column="odds"/></div>
                                  </th>
                                  <th className="py-4 px-6 text-right cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('stake')}>
                                      <div className="flex items-center justify-end gap-2">Stake <SortIcon column="stake"/></div>
                                  </th>
                                  <th className="py-4 px-6 text-center cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('status')}>
                                      <div className="flex items-center justify-center gap-2">Status <SortIcon column="status"/></div>
                                  </th>
                                  <th className="py-4 px-6 text-right cursor-pointer hover:text-white group transition-colors" onClick={() => handleSort('pnl')}>
                                      <div className="flex items-center justify-end gap-2">PnL <SortIcon column="pnl"/></div>
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 text-sm font-mono">
                              {processedBets.length > 0 ? (
                                  processedBets.map((bet) => (
                                      <tr key={bet.id} className="hover:bg-white/5 transition-colors group">
                                          <td className="py-4 px-6 text-slate-500 text-xs">
                                              <div className="flex flex-col">
                                                  <span className="text-slate-300 font-bold">{new Date(bet.created_at).toLocaleDateString()}</span>
                                                  <span>{new Date(bet.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                              </div>
                                          </td>
                                          <td className="py-4 px-6">
                                              <div className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">{bet.selection}</div>
                                          </td>
                                          <td className="py-4 px-6">
                                              <div className="inline-block px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                                  {bet.market_type || 'STANDARD'}
                                              </div>
                                          </td>
                                          <td className="py-4 px-6 text-center text-slate-300 font-bold">{bet.odds}</td>
                                          <td className="py-4 px-6 text-right text-slate-300 font-bold">${Number(bet.stake).toFixed(2)}</td>
                                          <td className="py-4 px-6 text-center">
                                              <span className={clsx(
                                                  "px-3 py-1 rounded text-[10px] font-black uppercase tracking-tighter border", 
                                                  bet.status === 'WIN' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : 
                                                  bet.status === 'LOSS' ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : 
                                                  bet.status === 'VOID' ? "bg-slate-500/10 text-slate-400 border-slate-500/30" :
                                                  "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                                              )}>
                                                  {bet.status}
                                              </span>
                                          </td>
                                          <td className={clsx("py-4 px-6 text-right font-black text-base", 
                                              bet.status === 'WIN' ? "text-emerald-400" : 
                                              bet.status === 'LOSS' ? "text-rose-400" : "text-slate-500"
                                          )}>
                                              {bet.status === 'WIN' ? `+$${Number(bet.to_win).toFixed(2)}` : bet.status === 'LOSS' ? `-$${Number(bet.stake).toFixed(2)}` : '--'}
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr><td colSpan={7} className="py-24 text-center text-slate-600 italic">
                                      {filterText || filterStatus !== 'ALL' ? 'No bets match your filter.' : 'No transactions recorded.'}
                                  </td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
