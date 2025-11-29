
import React, { useState } from 'react';
import { WeekData, BetResult, Bet } from '../types';
import { ChevronDown, ChevronUp, Search, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { clsx } from 'clsx';

interface WeekViewProps {
  weeks: WeekData[];
}

export const WeekView: React.FC<WeekViewProps> = ({ weeks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState<'usd' | 'unit'>('usd');

  const filteredWeeks = weeks.map(week => ({
    ...week,
    pools: week.pools.map(pool => ({
      ...pool,
      bets: pool.bets.filter(bet => 
        bet.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(pool => pool.bets.length > 0)
  })).filter(week => week.pools.length > 0);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800">
         <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
            <input 
                type="text" 
                placeholder="Search all weeks..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-all placeholder:text-slate-600"
            />
         </div>
         <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
            <button 
                onClick={() => setDisplayMode('usd')}
                className={clsx(
                    "px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all",
                    displayMode === 'usd' ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "text-slate-400 hover:text-white"
                )}
            >
                USD ($)
            </button>
            <button 
                onClick={() => setDisplayMode('unit')}
                className={clsx(
                    "px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all",
                    displayMode === 'unit' ? "bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "text-slate-400 hover:text-white"
                )}
            >
                Units (u)
            </button>
         </div>
      </div>

      {filteredWeeks.map((week) => (
        <WeekCard key={week.id} week={week} displayMode={displayMode} />
      ))}
      
      {filteredWeeks.length === 0 && (
          <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
              <p>No bets found matching "{searchTerm}"</p>
          </div>
      )}
    </div>
  );
};

const WeekCard: React.FC<{ week: WeekData, displayMode: 'usd' | 'unit' }> = ({ week, displayMode }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [localFilter, setLocalFilter] = useState('');

    const formatProfit = (profit: number, mode: 'usd' | 'unit') => {
        const absVal = Math.abs(profit);
        const sign = profit > 0 ? '+' : (profit < 0 ? '-' : '');
        
        if (mode === 'usd') {
            return `${sign}$${absVal.toFixed(2)}`;
        } else {
            // Conversion rate: $100 = 1 unit
            return `${sign}${(absVal / 100).toFixed(2)}u`;
        }
    };

    // Filter logic specific to this card's view
    const visiblePools = week.pools.map(pool => ({
        ...pool,
        bets: pool.bets.filter(bet => 
            bet.description.toLowerCase().includes(localFilter.toLowerCase())
        )
    })).filter(pool => pool.bets.length > 0);

    return (
        <div className="glass-panel rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:border-slate-600/50">
            <div 
                className="p-6 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${week.overallRoi >= 0 ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'}`}>
                            {week.overallRoi >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-wide uppercase">{week.title}</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className={`text-lg font-black font-mono px-4 py-1 rounded border ${
                            week.overallRoi >= 0 
                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' 
                            : 'border-rose-500/50 text-rose-400 bg-rose-500/10'
                        }`}>
                            {week.overallRoi > 0 ? '+' : ''}{week.overallRoi}% ROI
                        </div>
                        {isOpen ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="p-6 bg-slate-950/30">
                    {/* Local Search for specific week */}
                    <div className="flex justify-end mb-6">
                        <div className="relative group w-full max-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="Filter bets in this week..." 
                                value={localFilter}
                                onChange={(e) => setLocalFilter(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 focus:bg-slate-900 focus:w-full transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {visiblePools.length > 0 ? (
                        visiblePools.map(pool => (
                            <div key={pool.id} className="mb-8 last:mb-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex justify-between items-end mb-4 border-b border-slate-800 pb-2">
                                    <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                        <div className="w-1 h-4 bg-cyan-400 rounded-full"></div>
                                        {pool.name}
                                    </h3>
                                    <div className="text-xs font-mono text-slate-400">
                                        ROI: <span className={pool.roi >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                            {pool.roi > 0 ? '+' : ''}{pool.roi}%
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="overflow-x-auto rounded-lg border border-slate-800/50">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-xs uppercase text-slate-500 tracking-wider bg-slate-900/50">
                                                <th className="py-3 pl-4 font-semibold">Description</th>
                                                <th className="py-3 text-right font-semibold">Stake</th>
                                                <th className="py-3 text-right font-semibold">Odds</th>
                                                <th className="py-3 text-center font-semibold">Result</th>
                                                <th className="py-3 pr-4 text-right font-semibold">P/L</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-mono bg-slate-900/20">
                                            {pool.bets.map((bet) => (
                                                <tr key={bet.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors group">
                                                    <td className="py-3 pl-4 font-sans font-medium text-slate-300 group-hover:text-white transition-colors">
                                                        {bet.description}
                                                        {bet.score && <span className="ml-2 text-xs text-slate-500">({bet.score})</span>}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-400">
                                                        {displayMode === 'usd' ? `$${bet.stake}` : `${bet.units}u`}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-500">{bet.odds || '-'}</td>
                                                    <td className="py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                            bet.result === BetResult.WIN ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            bet.result === BetResult.LOSS ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                            'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                        }`}>
                                                            {bet.result}
                                                        </span>
                                                    </td>
                                                    <td className={`py-3 pr-4 text-right font-bold ${bet.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        <div className="flex flex-col items-end leading-tight">
                                                            <span>
                                                                {formatProfit(bet.profit, displayMode)}
                                                            </span>
                                                            <span className="text-[10px] opacity-50 font-medium">
                                                                {formatProfit(bet.profit, displayMode === 'usd' ? 'unit' : 'usd')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500 bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
                             <Filter className="mx-auto h-8 w-8 text-slate-700 mb-2" />
                             <p className="text-sm">No bets match "{localFilter}" in this week.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
