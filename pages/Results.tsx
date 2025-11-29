
import React from 'react';
import { WeekData } from '../types';
import { FileSearch, FileText } from 'lucide-react';

interface ResultsProps {
  weeks: WeekData[];
}

export const Results: React.FC<ResultsProps> = ({ weeks }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-4">
                TRANSPARENCY REPORTS
            </h1>
            <p className="text-slate-400 text-lg">Verified Raw Data Extraction & Results</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
            {weeks.map((week) => (
                <div key={week.id} className="glass-panel rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
                                <FileSearch size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{week.title}</h2>
                                <p className="text-xs text-amber-500/80 uppercase tracking-widest font-mono mt-1">
                                    LOG DATE: {week.date}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black ${week.overallRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {week.overallRoi > 0 ? '+' : ''}{week.overallRoi}%
                            </div>
                            <div className="text-slate-500 text-xs uppercase tracking-wider">Verified ROI</div>
                        </div>
                    </div>

                    <div className="bg-black/50 rounded-lg border border-slate-800 p-6 font-mono text-sm text-slate-300 relative overflow-hidden group">
                        <div className="absolute top-2 right-2 text-slate-700 flex items-center gap-1 group-hover:text-slate-500 transition-colors">
                            <FileText size={12} />
                            <span className="text-[10px] uppercase">RAW DATA LOG</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            <div>
                                <h4 className="text-slate-500 text-xs uppercase mb-2 border-b border-slate-800 pb-1">Performance Summary</h4>
                                <div className="flex justify-between py-1 border-b border-slate-800/50">
                                    <span>Net Profit:</span>
                                    <span className={week.pools.reduce((a,b)=>a+b.netProfit,0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                        ${week.pools.reduce((a,b) => a + b.netProfit, 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-4">
                                     <h4 className="text-slate-500 text-xs uppercase mb-2 border-b border-slate-800 pb-1">Pool Breakdown</h4>
                                     {week.pools.map(pool => (
                                         <div key={pool.id} className="flex justify-between py-1 border-b border-slate-800/50 text-xs">
                                             <span className="truncate pr-4">{pool.name}</span>
                                             <span>{pool.roi}% ROI</span>
                                         </div>
                                     ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-slate-500 text-xs uppercase mb-2 border-b border-slate-800 pb-1">Betting Log Sample</h4>
                                <ul className="space-y-1 text-xs opacity-80">
                                    {week.pools.flatMap(p => p.bets).slice(0, 5).map(bet => (
                                        <li key={bet.id} className="flex justify-between">
                                            <span className="truncate w-3/4">{bet.description}</span>
                                            <span className={bet.result === 'WIN' ? 'text-emerald-500' : bet.result === 'LOSS' ? 'text-rose-500' : 'text-yellow-500'}>
                                                {bet.result}
                                            </span>
                                        </li>
                                    ))}
                                    {week.pools.flatMap(p => p.bets).length > 5 && (
                                        <li className="text-slate-600 italic pt-1">...and {week.pools.flatMap(p => p.bets).length - 5} more records</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
