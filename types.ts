
export enum BetResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  VOID = 'VOID',
  PENDING = 'PENDING'
}

export type League = 'NFL' | 'NBA' | 'NHL' | 'MLB' | 'MLS' | 'SOCCER' | 'MMA' | 'HORSE' | 'GOLF' | 'VELOCITY';
export type BetType = 'SINGLE' | 'PARLAY';

export interface Bet {
  id: string;
  description: string;
  stake: number;
  units: number;
  odds?: string;
  result: BetResult;
  returnVal?: number;
  profit: number;
  score?: string;
  betType?: BetType;
}

export interface UserBet {
  id: string;
  created_at: string;
  selection: string;
  odds: string;
  stake: number;
  to_win: number;
  status: 'PENDING' | 'WIN' | 'LOSS' | 'VOID';
  pnl: number;
  market_type: string;
}

export interface Pool {
  id: string;
  name: string;
  bets: Bet[];
  netProfit: number;
  roi: number;
}

export interface WeekData {
  id: string;
  title: string;
  date?: string;
  overallRoi: number;
  pools: Pool[];
  fileUrl?: string;
  league: League; // Isolated league tracking
}

export interface SummaryStats {
  totalInvested: number;
  totalReturn: number;
  netProfit: number;
  roi: number;
  totalUnitsWagered: number;
  weightedWinRate: number;
  winningUnitsWagered: number;
  winCount: number;
  lossCount: number;
  voidCount: number;
}

export interface DashboardStats {
  overall: SummaryStats;
  singles: SummaryStats;
  parlays: SummaryStats;
}

export interface ChartDataPoint {
  week: string;
  profit: number;
  units: number;
}

export interface PickArchiveItem {
  id: string;
  date: string;
  title: string;
  content: string;
  league: League;
  fileUrl?: string;
}

export interface GameSummary {
  id: string;
  title: string;
  date: string;
  content: string;
  league: League;
  fileUrl?: string;
}
