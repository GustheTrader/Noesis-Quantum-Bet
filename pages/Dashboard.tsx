
import React, { useState, useMemo } from 'react';
import { SummaryCards } from '../components/SummaryCards';
import { PerformanceChart } from '../components/PerformanceChart';
import { WeekView } from '../components/WeekView';
import { HighlightReel } from '../components/HighlightReel';
import { WeekData, DashboardStats, ChartDataPoint } from '../types';
import { calculateStats, generateChartData } from '../utils';
import { clsx } from 'clsx';
import { Layers, Zap, Combine, Cpu, Activity } from 'lucide-react';

interface DashboardProps {
  weeks: WeekData[];
  stats: DashboardStats;
  chartData: ChartDataPoint[];
}

export const Dashboard: React.FC<DashboardProps> = ({ weeks }) => {
  // SCOPE: Locked to 'model' for QuantumEdge v.2 focus
  // User Portfolio is currently on hold.
  const analyticsScope = 'model';
  
  // FILTER: Overall vs Singles vs Parlays
  const [statsView, setStatsView] = useState<'overall' | 'singles' | 'parlays'>('overall');

  // --- DYNAMIC CALCULATION ---
  // Using direct Model Data (no user simulation)
  const activeWeeks = weeks;
  
  // Recalculate Stats & Chart based on the model dataset
  const activeStats = useMemo(() => calculateStats(activeWeeks), [activeWeeks]);
  const activeChartData = useMemo(() => generateChartData(activeWeeks), [activeWeeks]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                  <Cpu className="text-indigo-500" size={32} />
                  QuantumEdge v.2
              </h1>
              <p className="text-slate-400 text-sm">
                  Official Model Performance & Signal Log
              </p>
          </div>

          {/* Scope Badge (Static) */}
          <div className="bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-500/30 flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">
                  System Mode: Master Model
              </span>
          </div>
      </div>

      {/* SUB-FILTER: TYPE */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
                onClick={() => setStatsView('overall')}
                className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    statsView === 'overall' 
                        ? "bg-indigo-900/50 text-indigo-400 border border-indigo-500/30" 
                        : "text-slate-400 hover:text-white"
                )}
            >
                <Layers size={14} />
                Overall
            </button>
            <button
                onClick={() => setStatsView('singles')}
                className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    statsView === 'singles' 
                        ? "bg-purple-900/50 text-purple-400 border border-purple-500/30" 
                        : "text-slate-400 hover:text-white"
                )}
            >
                <Zap size={14} />
                Singles
            </button>
            <button
                onClick={() => setStatsView('parlays')}
                className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    statsView === 'parlays' 
                        ? "bg-violet-900/50 text-violet-400 border border-violet-500/30" 
                        : "text-slate-400 hover:text-white"
                )}
            >
                <Combine size={14} />
                Parlays
            </button>
        </div>
      </div>

      {/* HERO STATS */}
      <div id="dashboard-summary" className="animate-in fade-in slide-in-from-bottom-2 duration-500" key={statsView}>
          <SummaryCards stats={activeStats[statsView]} />
      </div>

      {/* PERFORMANCE CHART */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
         <div className="border rounded-2xl overflow-hidden transition-colors duration-500 border-indigo-500/20">
             <PerformanceChart data={activeChartData} />
         </div>
      </div>

      {/* MAIN GRID 3-COL: Left Info | Center Feed | Right Media */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Info Box */}
        <div className="lg:col-span-1 space-y-8">
           <div className="p-8 rounded-2xl relative overflow-hidden border transition-colors duration-500 bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500/30">
             {/* Background Blob */}
             <div className="absolute top-0 right-0 w-48 h-48 blur-3xl rounded-full pointer-events-none opacity-40 bg-indigo-500"></div>

             <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4 opacity-80">
                     <Activity size={16} className="text-indigo-400" />
                     <span className="text-xs font-bold uppercase tracking-widest text-white">Weighted Win Rate</span>
                 </div>
                 
                 <div className="text-6xl font-black text-white mb-6 tracking-tighter">
                    {activeStats[statsView].weightedWinRate}%
                 </div>
                 
                 <div className="space-y-4">
                     <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                         <span className="text-slate-400">Total Volume</span>
                         <span className="font-mono font-bold text-white">{activeStats[statsView].totalUnitsWagered}u</span>
                     </div>
                     <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                         <span className="text-slate-400">Winning Volume</span>
                         <span className="font-mono font-bold text-indigo-300">
                             {activeStats[statsView].winningUnitsWagered}u
                         </span>
                     </div>
                 </div>
             </div>
           </div>
        </div>

        {/* Center Column: Feed (2 cols wide) */}
        <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Cpu size={20} className="text-indigo-500"/>
                    Model Signal Log
                </h2>
                <div className="h-1 flex-grow mx-6 bg-gradient-to-r from-slate-800 to-transparent rounded"></div>
            </div>
            <WeekView weeks={activeWeeks} />
        </div>

        {/* Right Column: Media Highlight Reel */}
        <div className="lg:col-span-1">
            <HighlightReel />
        </div>

      </div>
    </div>
  );
};
