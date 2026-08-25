import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { WeekData } from '../types';
import { clsx } from 'clsx';
import { Target, Info } from 'lucide-react';

interface MarketROIHeatmapProps {
  weeks: WeekData[];
}

export const MarketROIHeatmap: React.FC<MarketROIHeatmapProps> = ({ weeks }) => {
  // We need to extract unique markets and unique weeks to form the grid.
  const data = useMemo(() => {
    const points: any[] = [];
    const marketSet = new Set<string>();
    
    weeks.forEach((week) => {
      week.pools.forEach((pool) => {
        marketSet.add(pool.name);
      });
    });

    const markets = Array.from(marketSet).sort();

    weeks.forEach((week, weekIndex) => {
      week.pools.forEach((pool) => {
        const marketIndex = markets.indexOf(pool.name);
        points.push({
          week: week.title,
          weekIndex: weekIndex,
          market: pool.name,
          marketIndex: marketIndex,
          roi: pool.roi,
          netProfit: pool.netProfit
        });
      });
    });

    return { points, markets };
  }, [weeks]);

  if (!weeks || weeks.length === 0 || data.points.length === 0) {
      return null;
  }

  const CustomShape = (props: any) => {
    const { cx, cy, payload, xAxis, yAxis } = props;
    
    if (!cx || !cy) return null;

    // Use a fixed size or calculate based on axis band if using categorical
    const size = 36;
    
    const isPositive = payload.roi > 0;
    const isNegative = payload.roi < 0;
    const isNeutral = payload.roi === 0;

    let fill = '#1e293b'; // empty/neutral
    let stroke = '#334155';
    if (isPositive) {
      const intensity = Math.min(1, 0.2 + (payload.roi / 100) * 0.8);
      fill = `rgba(16, 185, 129, ${intensity})`; // emerald-500
      stroke = 'rgba(16, 185, 129, 0.5)';
    } else if (isNegative) {
      const intensity = Math.min(1, 0.2 + (Math.abs(payload.roi) / 100) * 0.8);
      fill = `rgba(244, 63, 94, ${intensity})`; // rose-500
      stroke = 'rgba(244, 63, 94, 0.5)';
    }

    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <rect 
          x={-size / 2} 
          y={-size / 2} 
          width={size} 
          height={size} 
          fill={fill} 
          stroke={stroke}
          strokeWidth={1}
          rx={4} 
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0f172a] border border-slate-700 p-3 rounded-xl shadow-2xl">
          <div className="text-xs font-bold text-slate-300 mb-1">{data.week} // {data.market}</div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">ROI</div>
              <div className={clsx("font-mono text-sm font-black", data.roi >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {data.roi > 0 ? '+' : ''}{data.roi}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Net Profit</div>
              <div className={clsx("font-mono text-sm font-bold", data.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {data.netProfit >= 0 ? '+' : ''}${data.netProfit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-8 rounded-2xl mb-10 border border-slate-800 relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-64 h-64 blur-3xl rounded-full pointer-events-none opacity-10 bg-cyan-500"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 relative z-10">
          <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Target className="text-cyan-400" size={20} />
                  Market ROI Heatmap
              </h3>
              <p className="text-slate-400 text-sm mt-1">Profit/Loss density across betting markets and time periods</p>
          </div>
      </div>

      <div className="h-[400px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              type="category" 
              dataKey="week" 
              name="Time Period" 
              stroke="#64748b"
              tick={{fill: '#64748b', fontSize: 11}}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="market" 
              name="Market" 
              stroke="#64748b"
              tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <ZAxis type="number" dataKey="roi" range={[100, 100]} />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} content={<CustomTooltip />} />
            <Scatter data={data.points} shape={<CustomShape />} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-slate-400 bg-black/40 px-4 py-2 rounded-xl border border-slate-800 max-w-fit mx-auto">
        <span className="text-slate-500 uppercase tracking-widest font-bold mr-2 flex items-center gap-1">
            <Info size={12} /> Density Scale:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500/90 border border-rose-500"></span>
          <span>Heavy Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50"></span>
          <span>Light Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700"></span>
          <span>Neutral / None</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"></span>
          <span>Light Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/90 border border-emerald-500"></span>
          <span>Heavy Profit</span>
        </div>
      </div>
    </div>
  );
};
