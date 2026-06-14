import React, { useState, useMemo } from 'react';
import { WeekData, League, SummaryStats } from '../types';
import { calculateStats } from '../utils';
import { Calendar, DollarSign, Percent, TrendingUp, Info, Activity, ShieldAlert, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface MonthlyHeatmapProps {
  weeks: WeekData[];
  activeLeague: League;
}

interface MonthDetail {
  month: string; // 'Jan', 'Feb', etc
  year: number;
  stats: SummaryStats | null;
  weeksCount: number;
}

const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS_LIST = [2024, 2025, 2026];

export const MonthlyHeatmap: React.FC<MonthlyHeatmapProps> = ({ weeks, activeLeague }) => {
  const [selectedCell, setSelectedCell] = useState<MonthDetail | null>(null);
  const [hoveredCell, setHoveredCell] = useState<MonthDetail | null>(null);

  // Parse weeks into a year-month grouped map
  const heatmapData = useMemo(() => {
    const grouped: Record<string, WeekData[]> = {};

    // Helper: Determine a sensible year/month for a week
    const parseWeekTime = (week: WeekData) => {
      let year = 2025;
      let monthIndex = 8; // September default

      if (week.date) {
        const d = new Date(week.date);
        if (!isNaN(d.getTime())) {
          return {
            year: d.getFullYear(),
            month: MONTHS_LIST[d.getMonth()]
          };
        }
      }

      // Guess from ID/title if date is missing
      const title = (week.title || '').toLowerCase();
      const match = title.match(/week[\s_-]*(\d+)/);
      if (match) {
        const wNum = parseInt(match[1]);
        if (wNum <= 4) { year = 2025; monthIndex = 8; } // Sep
        else if (wNum <= 8) { year = 2025; monthIndex = 9; } // Oct
        else if (wNum <= 12) { year = 2025; monthIndex = 10; } // Nov
        else if (wNum <= 17) { year = 2025; monthIndex = 11; } // Dec
        else { year = 2026; monthIndex = 0; } // Jan
      } else {
        // Fallback checks for explicit keywords in title
        MONTHS_LIST.forEach((m, idx) => {
          if (title.includes(m.toLowerCase())) {
            monthIndex = idx;
          }
        });
        if (title.includes('2024')) year = 2024;
        if (title.includes('2026')) year = 2026;
      }

      return {
        year,
        month: MONTHS_LIST[monthIndex]
      };
    };

    // Group active weeks
    weeks.forEach(week => {
      const { year, month } = parseWeekTime(week);
      const key = `${year}-${month}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(week);
    });

    // Structure cells for the years 2024, 2025, 2026
    const grid: Record<string, MonthDetail> = {};
    YEARS_LIST.forEach(year => {
      MONTHS_LIST.forEach(month => {
        const key = `${year}-${month}`;
        const monthWeeks = grouped[key] || [];
        
        let stats: SummaryStats | null = null;
        if (monthWeeks.length > 0) {
          const calculated = calculateStats(monthWeeks);
          stats = calculated.overall;
        }

        grid[key] = {
          month,
          year,
          stats,
          weeksCount: monthWeeks.length
        };
      });
    });

    return grid;
  }, [weeks]);

  // Determine colour based on ROI range
  const getCellClassName = (cell: MonthDetail) => {
    if (!cell.stats || cell.weeksCount === 0) {
      return 'bg-slate-950 border border-slate-900 hover:border-slate-700/50 text-slate-700 hover:bg-slate-900/20';
    }

    const { roi } = cell.stats;

    if (roi > 0) {
      if (roi <= 10) return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:border-emerald-400 hover:bg-emerald-950/60 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]';
      if (roi <= 25) return 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/50';
      if (roi <= 50) return 'bg-emerald-800/50 text-emerald-200 border border-emerald-400/50 hover:border-emerald-300 hover:bg-emerald-800/70 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      return 'bg-emerald-500 text-black font-extrabold border border-emerald-300 hover:border-white shadow-[0_0_15px_rgba(16,185,129,0.35)]';
    } else if (roi < 0) {
      const absRoi = Math.abs(roi);
      if (absRoi <= 10) return 'bg-rose-950/40 text-rose-400 border border-rose-500/20 hover:border-rose-400 hover:bg-rose-950/60';
      if (absRoi <= 25) return 'bg-rose-900/30 text-rose-300 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-900/50';
      if (absRoi <= 50) return 'bg-rose-800/50 text-rose-200 border border-rose-400/50 hover:border-rose-300 hover:bg-rose-800/70 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
      return 'bg-rose-500 text-white font-extrabold border border-rose-300 hover:border-white shadow-[0_0_15px_rgba(244,63,94,0.35)]';
    } else {
      // exactly 0
      return 'bg-slate-900 text-slate-400 border border-slate-700/60 hover:border-slate-500 hover:bg-slate-850';
    }
  };

  const activeDetail = hoveredCell || selectedCell;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full mb-10 overflow-hidden relative" id="monthly-heatmap-section">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
            <Calendar className="text-cyan-400" size={20} />
            <span>Monthly Performance Heatmap</span>
            <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase px-2 py-0.5 rounded ml-2 border border-cyan-500/10 font-mono">
              {activeLeague} Live
            </span>
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Visual matrix mapping Return on Investment (ROI) across calendar seasons (Grouped Chronologically)
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400 bg-black/40 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 uppercase">ROI Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
            <span>&lt; -25%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-950/50 border border-rose-500/30"></span>
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-950 border border-slate-900"></span>
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-950/50 border border-emerald-500/30"></span>
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
            <span>&gt; +50%</span>
          </div>
        </div>
      </div>

      {/* HEATMAP GRID SYSTEM */}
      <div className="overflow-x-auto custom-scrollbar pb-3">
        <div className="min-w-[800px] select-none">
          {/* Months Head */}
          <div className="grid gap-1.5 mb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            <div className="text-left font-sans pl-2 py-1">Season</div>
            {MONTHS_LIST.map(m => (
              <div key={m} className="py-1">{m}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-1.5">
            {YEARS_LIST.map(year => (
              <div key={year} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                
                {/* Year Label */}
                <div className="text-sm font-black text-slate-400 font-mono pl-2 tracking-wider">
                  {year}
                </div>

                {/* Months Cells */}
                {MONTHS_LIST.map(month => {
                  const key = `${year}-${month}`;
                  const cell = heatmapData[key];
                  const hasData = cell?.stats && cell?.weeksCount > 0;
                  const isSelected = selectedCell?.year === year && selectedCell?.month === month;
                  const isHovered = hoveredCell?.year === year && hoveredCell?.month === month;

                  return (
                    <div
                      key={month}
                      onMouseEnter={() => hasData && setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => hasData && setSelectedCell(isSelected ? null : cell)}
                      className={clsx(
                        "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-150 relative",
                        getCellClassName(cell),
                        (isSelected || isHovered) && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black scale-[1.05] z-15"
                      )}
                    >
                      {hasData ? (
                        <div className="text-[10px] font-mono leading-none tracking-tighter">
                          {cell.stats!.roi > 0 ? '+' : ''}{cell.stats!.roi}%
                        </div>
                      ) : (
                        <div className="text-[9px] font-mono text-slate-800 opacity-20">--</div>
                      )}
                      
                      {/* Active tiny node */}
                      {hasData && (
                        <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-cyan-400/40"></span>
                      )}
                    </div>
                  );
                })}

              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAIL CONSOLE */}
      <div className="mt-6 border-t border-slate-900 pt-6">
        {activeDetail ? (
          <div className="bg-[#040811] border border-cyan-500/20 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-black border border-cyan-500/20">
                  {activeDetail.month[0]}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    {activeDetail.month} {activeDetail.year} In-Focus
                  </h4>
                  <p className="text-[10px] text-[#00ffff] font-mono uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={10} /> Active Season Segment // {activeDetail.weeksCount} week{activeDetail.weeksCount !== 1 ? 's' : ''} parsed
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 bg-black/40 px-3 py-1 rounded border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 uppercase text-[9px]">Calculated ROI:</span>
                <span className={clsx(
                  "font-black text-sm",
                  activeDetail.stats!.roi >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {activeDetail.stats!.roi > 0 ? '+' : ''}{activeDetail.stats!.roi}%
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/50 border border-slate-900 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Total Net Profit</div>
                <div className={clsx(
                  "text-lg font-mono font-bold",
                  activeDetail.stats!.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {activeDetail.stats!.netProfit >= 0 ? '+' : ''}${activeDetail.stats!.netProfit.toLocaleString()}
                </div>
              </div>

              <div className="bg-black/50 border border-slate-900 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Total Allocated</div>
                <div className="text-lg font-mono font-bold text-slate-200">
                  ${activeDetail.stats!.totalInvested.toLocaleString()}
                </div>
              </div>

              <div className="bg-black/50 border border-slate-900 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Wager Volume (Units)</div>
                <div className="text-lg font-mono font-bold text-indigo-400">
                  {activeDetail.stats!.totalUnitsWagered} U
                </div>
              </div>

              <div className="bg-black/50 border border-slate-900 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Record (Wins/Losses)</div>
                <div className="text-lg font-mono font-bold text-slate-300">
                  {activeDetail.stats!.winCount}W - {activeDetail.stats!.lossCount}L
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black/20 border border-dashed border-slate-900 rounded-xl py-6 px-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Info size={14} className="text-cyan-500/50" />
            <span>Hover or click a colored month tile above to display full calculated metrics.</span>
          </div>
        )}
      </div>
    </div>
  );
};
