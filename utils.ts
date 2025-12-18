
import { WeekData, SummaryStats, ChartDataPoint, BetResult, DashboardStats, Bet } from './types';

export const calculateStats = (weeks: WeekData[]): DashboardStats => {
  const createEmptyStats = (): any => ({
    totalInvested: 0,
    totalReturn: 0,
    netProfit: 0,
    roi: 0,
    totalUnitsWagered: 0,
    winningUnitsWagered: 0,
    weightedWinRate: 0
  });

  const overall = createEmptyStats();
  const singles = createEmptyStats();
  const parlays = createEmptyStats();

  const processBet = (bet: Bet, stats: any) => {
    // Robust parsing: Handle strings like "1.5u" or "$100" by stripping non-numeric chars (keeping decimal point)
    const cleanNumber = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = String(val).replace(/[^\d.-]/g, '');
        return parseFloat(str) || 0;
    };

    const stake = cleanNumber(bet.stake);
    const units = cleanNumber(bet.units);
    const profit = cleanNumber(bet.profit);

    stats.totalInvested += stake;
    stats.totalUnitsWagered += units;
    stats.netProfit += profit;

    if (bet.result === BetResult.WIN) {
      // If profit is recorded, return is stake + profit
      stats.totalReturn += (stake + profit);
      stats.winningUnitsWagered += units;
    } else if (bet.result === BetResult.VOID) {
      stats.totalReturn += stake;
    }
  };

  weeks.forEach(week => {
    week.pools.forEach(pool => {
      pool.bets.forEach(bet => {
        // Determine Bet Type if not explicitly set
        let isParlay = false;
        if (bet.betType) {
            isParlay = bet.betType === 'PARLAY';
        } else {
            const desc = bet.description.toLowerCase();
            const poolName = pool.name.toLowerCase();
            isParlay = desc.includes('parlay') || desc.includes('leg') || poolName.includes('parlay');
        }

        processBet(bet, overall);
        
        if (isParlay) {
            processBet(bet, parlays);
        } else {
            processBet(bet, singles);
        }
      });
    });
  });

  const finalizeStats = (s: any): SummaryStats => {
    const roi = s.totalInvested > 0 ? (s.netProfit / s.totalInvested) * 100 : 0;
    const weightedWinRate = s.totalUnitsWagered > 0 ? (s.winningUnitsWagered / s.totalUnitsWagered) * 100 : 0;

    return {
      totalInvested: Math.round(s.totalInvested),
      totalReturn: Math.round(s.totalReturn),
      netProfit: Math.round(s.netProfit),
      roi: Math.round(roi), // Rounded to nearest integer
      // Safely cast to Number before toFixed to prevent crashes
      totalUnitsWagered: parseFloat(Number(s.totalUnitsWagered).toFixed(2)),
      weightedWinRate: parseFloat(weightedWinRate.toFixed(1)),
      winningUnitsWagered: parseFloat(Number(s.winningUnitsWagered).toFixed(2))
    };
  };

  return {
      overall: finalizeStats(overall),
      singles: finalizeStats(singles),
      parlays: finalizeStats(parlays)
  };
};

export const generateChartData = (weeks: WeekData[]): ChartDataPoint[] => {
  let runningProfit = 0;
  
  // Helper to extract week number for robust sorting
  const getWeekNum = (title: string) => {
    const match = title.match(/week[\s_-]*(\d+)/i);
    return match ? parseInt(match[1]) : 0;
  };

  // Sort Chronologically: Oldest (Week 1) -> Newest (Week X)
  const sortedWeeks = [...weeks].sort((a, b) => getWeekNum(a.title) - getWeekNum(b.title));
  
  return sortedWeeks.map(week => {
    let weekProfit = 0;
    let weekUnits = 0;
    
    week.pools.forEach(pool => {
      weekProfit += Number(pool.netProfit) || 0;
      pool.bets.forEach(b => {
          // Clean units here too just in case
          const u = typeof b.units === 'number' ? b.units : parseFloat(String(b.units).replace(/[^\d.-]/g, '')) || 0;
          weekUnits += u;
      });
    });

    runningProfit += weekProfit;

    const weekNum = getWeekNum(week.title);
    const label = weekNum > 0 ? `W${weekNum}` : week.title.substring(0, 3);

    return {
      week: label,
      profit: Math.round(runningProfit),
      units: parseFloat(weekUnits.toFixed(1))
    };
  });
};
