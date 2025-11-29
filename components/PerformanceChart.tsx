
import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartDataPoint } from '../types';

interface PerformanceChartProps {
  data: ChartDataPoint[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const currentProfit = data.length > 0 ? data[data.length - 1].profit : 0;
  const growth = data.length > 1 
    ? ((currentProfit - data[0].profit) / Math.abs(data[0].profit) * 100).toFixed(1)
    : 0;

  return (
    <div className="glass-panel p-8 rounded-2xl mb-10 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Performance Trajectory</h3>
          <p className="text-slate-400 text-sm mt-1">Net Profit Accumulation (2025 Season)</p>
        </div>
        <div className="flex gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded border ${Number(growth) >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                {Number(growth) > 0 ? '+' : ''}{growth}% Growth
            </span>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00ffff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
                dataKey="week" 
                stroke="#64748b" 
                tick={{fill: '#64748b', fontSize: 12}} 
                axisLine={false}
                tickLine={false}
            />
            <YAxis 
                stroke="#64748b" 
                tick={{fill: '#64748b', fontSize: 12}} 
                tickFormatter={(value) => `$${value}`}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                itemStyle={{ color: '#00ffff' }}
                formatter={(value: number) => [`$${value}`, 'Net Profit']}
            />
            <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#00ffff" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorProfit)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
