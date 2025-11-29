
import React, { useState } from 'react';
import { SummaryCards } from '../components/SummaryCards';
import { PerformanceChart } from '../components/PerformanceChart';
import { WeekView } from '../components/WeekView';
import { WeekData, DashboardStats, ChartDataPoint } from '../types';
import { clsx } from 'clsx';
import { Layers, Zap, Combine } from 'lucide-react';

interface DashboardProps {
  weeks: WeekData[];
  stats: DashboardStats;
  chartData: ChartDataPoint[];
}

export const Dashboard: React.FC<DashboardProps> = ({ weeks, stats, chartData }) => {
  const [statsView, setStatsView] = useState<'overall' | 'singles' | 'parlays'>('overall');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
      
      {/* View Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
                onClick={() => setStatsView('overall')}
                className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                    statsView === 'overall' 
                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <Layers size={16} />
                Overall
            </button>
            <button
                onClick={() => setStatsView('singles')}
                className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                    statsView === 'singles' 
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <Zap size={16} />
                Singles
            </button>
            <button
                onClick={() => setStatsView('parlays')}
                className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                    statsView === 'parlays' 
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" 
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <Combine size={16} />
                Parlays
            </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" key={statsView}>
          <SummaryCards stats={stats[statsView]} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chart & Info */}
        <div className="lg:col-span-1 space-y-8">
           <PerformanceChart data={chartData} />
           
           <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-purple-500/30 p-8 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none"></div>
             <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 z-10 relative">Weighted Win %</h3>
             <div className="text-5xl font-black text-white mb-4 z-10 relative tracking-tighter">
                {stats[statsView].weightedWinRate}%
             </div>
             <p className="text-indigo-200 text-sm leading-relaxed z-10 relative">
                Based on $100 units: <span className="text-white font-bold">{stats[statsView].totalUnitsWagered}</span> {statsView} units wagered. 
                Normalizes performance across different bet sizes for accurate tracking.
             </p>
           </div>
        </div>

        {/* Right Column: Feed */}
        <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
                <div className="h-1 flex-grow mx-6 bg-gradient-to-r from-cyan-500/50 to-transparent opacity-30 rounded"></div>
            </div>
            <WeekView weeks={weeks} />
        </div>
      </div>
    </div>
  );
};
