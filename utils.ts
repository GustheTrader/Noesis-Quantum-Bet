
import { WeekData, SummaryStats, ChartDataPoint, BetResult, DashboardStats, Bet } from './types';

/**
 * Unifies error handling to prevent [object Object] displays.
 */
export const formatError = (err: any): string => {
  if (!err) return "Unknown Error";
  if (typeof err === 'string') return err;
  
  if (typeof err === 'object') {
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.msg) return err.msg;
    if (err instanceof Error) return err.message;
    
    try {
      const stringified = JSON.stringify(err);
      if (stringified === '{}') return `Object: ${Object.keys(err).join(', ')}`;
      return stringified;
    } catch (e) {
      return "An unexpected object error occurred (unserializable)";
    }
  }
  
  return String(err);
};

export const calculateStats = (weeks: WeekData[]): DashboardStats => {
  const createEmptyStats = (): any => ({
    totalInvested: 0,
    totalReturn: 0,
    netProfit: 0,
    roi: 0,
    totalUnitsWagered: 0,
    winningUnitsWagered: 0,
    weightedWinRate: 0,
    winCount: 0,
    lossCount: 0,
    voidCount: 0
  });

  const overall = createEmptyStats();
  const singles = createEmptyStats();
  const parlays = createEmptyStats();

  const processBet = (bet: Bet, stats: any) => {
    const cleanNumber = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = String(val).replace(/[^\d.-]/g, '');
        return parseFloat(str) || 0;
    };

    const stake = cleanNumber(bet.stake);
    // Explicitly base units on $100 unit if missing or just use total/100 for consistency
    const units = stake / 100;
    const profit = cleanNumber(bet.profit);

    stats.totalInvested += stake;
    stats.totalUnitsWagered += units;
    stats.netProfit += profit;

    if (bet.result === BetResult.WIN) {
      stats.totalReturn += (stake + profit);
      stats.winningUnitsWagered += units;
      stats.winCount += 1;
    } else if (bet.result === BetResult.LOSS) {
      stats.lossCount += 1;
    } else if (bet.result === BetResult.VOID) {
      stats.totalReturn += stake;
      stats.voidCount += 1;
    }
  };

  weeks.forEach(week => {
    week.pools.forEach(pool => {
      pool.bets.forEach(bet => {
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
      roi: Math.round(roi),
      totalUnitsWagered: parseFloat(Number(s.totalUnitsWagered).toFixed(2)),
      weightedWinRate: parseFloat(weightedWinRate.toFixed(1)),
      winningUnitsWagered: parseFloat(Number(s.winningUnitsWagered).toFixed(2)),
      winCount: s.winCount,
      lossCount: s.lossCount,
      voidCount: s.voidCount
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
  
  const getWeekNum = (title: string) => {
    const match = title.match(/week[\s_-]*(\d+)/i);
    return match ? parseInt(match[1]) : 0;
  };

  const sortedWeeks = [...weeks].sort((a, b) => getWeekNum(a.title) - getWeekNum(b.title));
  
  return sortedWeeks.map(week => {
    let weekProfit = 0;
    let weekUnits = 0;
    
    week.pools.forEach(pool => {
      weekProfit += Number(pool.netProfit) || 0;
      pool.bets.forEach(b => {
          const stake = typeof b.stake === 'number' ? b.stake : parseFloat(String(b.stake).replace(/[^\d.-]/g, '')) || 0;
          weekUnits += (stake / 100);
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
