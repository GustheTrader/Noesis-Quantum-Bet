
import React from 'react';
import { SummaryStats, DashboardStats } from '../types';
import { TrendingUp, DollarSign, Wallet, Percent, Target, Trophy, Hash, Layers, Zap } from 'lucide-react';

interface SummaryCardsProps {
  stats: SummaryStats;
  allStats?: DashboardStats; // Optional: used to extract cross-category records if needed
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, allStats }) => {
  // Use fallbacks for numbers to prevent NaN displays
  const totalUnits = stats.totalUnitsWagered || (stats.totalInvested / 100) || 0;
  const winRate = stats.weightedWinRate || 0;

  const cards = [
    { 
      label: 'Total Invested', 
      value: `$${(stats.totalInvested || 0).toLocaleString()}`, 
      icon: Wallet,
      color: 'text-white'
    },
    { 
      label: 'Total Return', 
      value: `$${(stats.totalReturn || 0).toLocaleString()}`, 
      icon: DollarSign,
      color: 'text-cyan-400'
    },
    { 
      label: 'Net Profit', 
      value: `${(stats.netProfit || 0) >= 0 ? '+' : ''}$${(stats.netProfit || 0).toLocaleString()}`, 
      icon: TrendingUp,
      color: (stats.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400',
      isGlowing: (stats.netProfit || 0) >= 0
    },
    { 
      label: 'Overall ROI', 
      value: `${(stats.roi || 0) > 0 ? '+' : ''}${stats.roi || 0}%`, 
      icon: Percent,
      color: 'text-purple-400'
    },
    { 
      label: 'Total Units', 
      value: `${totalUnits.toFixed(1)}u`, 
      sub: 'Wagered ($100/u)',
      icon: Target,
      color: 'text-slate-200'
    },
    { 
      label: 'Weighted Win %', 
      value: `${winRate}%`, 
      sub: 'Unit-based',
      icon: ActivityIcon,
      color: 'text-pink-400'
    },
    // New Record Cards
    { 
        label: 'Singles Record', 
        value: `${allStats?.singles.winCount || 0} - ${allStats?.singles.lossCount || 0}`, 
        sub: `${allStats?.singles.voidCount || 0} Voids`,
        icon: Zap,
        color: 'text-indigo-400'
    },
    { 
        label: 'Parlays Record', 
        value: `${allStats?.parlays.winCount || 0} - ${allStats?.parlays.lossCount || 0}`, 
        sub: `${allStats?.parlays.voidCount || 0} Voids`,
        icon: Layers,
        color: 'text-violet-400'
    },
    { 
        label: 'Overall Record', 
        value: `${stats.winCount || 0} - ${stats.lossCount || 0}`, 
        sub: 'Combined W-L',
        icon: Trophy,
        color: 'text-amber-400'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
      {cards.map((card, idx) => (
        <div 
          key={idx}
          className={`glass-panel rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${card.isGlowing ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : ''}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-cyan-400/80 text-[10px] font-black uppercase tracking-widest mb-2">{card.label}</p>
              <h3 className={`text-4xl font-black ${card.color} tracking-tight`}>{card.value}</h3>
              {card.sub && <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase font-bold tracking-wider">{card.sub}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-white/5 ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

function ActivityIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
