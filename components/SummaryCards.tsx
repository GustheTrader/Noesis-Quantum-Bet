import React from 'react';
import { SummaryStats } from '../types';
import { TrendingUp, DollarSign, Wallet, Percent, Target } from 'lucide-react';

interface SummaryCardsProps {
  stats: SummaryStats;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats }) => {
  const cards = [
    { 
      label: 'Total Invested', 
      value: `$${stats.totalInvested.toLocaleString()}`, 
      icon: Wallet,
      color: 'text-white'
    },
    { 
      label: 'Total Return', 
      value: `$${stats.totalReturn.toLocaleString()}`, 
      icon: DollarSign,
      color: 'text-cyan-400'
    },
    { 
      label: 'Net Profit', 
      value: `+$${stats.netProfit.toLocaleString()}`, 
      icon: TrendingUp,
      color: 'text-emerald-400',
      isGlowing: true
    },
    { 
      label: 'Overall ROI', 
      value: `+${stats.roi}%`, 
      icon: Percent,
      color: 'text-purple-400'
    },
    { 
      label: 'Total Units', 
      value: `${stats.totalUnitsWagered}u`, 
      sub: 'Wagered ($100/u)',
      icon: Target,
      color: 'text-slate-200'
    },
    { 
      label: 'Weighted Win %', 
      value: `${stats.weightedWinRate}%`, 
      sub: 'Unit-based',
      icon: ActivityIcon,
      color: 'text-pink-400'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
      {cards.map((card, idx) => (
        <div 
          key={idx}
          className={`glass-panel rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${card.isGlowing ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : ''}`}
        >
          {/* Decorative hover gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-cyan-400/80 text-xs font-bold uppercase tracking-widest mb-2">{card.label}</p>
              <h3 className={`text-4xl font-black ${card.color} tracking-tight`}>{card.value}</h3>
              {card.sub && <p className="text-slate-400 text-xs mt-2 font-mono">{card.sub}</p>}
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
