
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, RefreshCw, Clock, TrendingUp, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { League } from '../types';
import { getEvents, getLatestOddsByEvent, readerConfigFromEnv, todayIn, EspnReadError } from '../lib/espn/reader';
import { toBoardMatchups, toLeagueKey, latestCapturedAt, latestEventUpdate } from '../lib/espn/boardModel';
import { toLiveOddsRows, OFF, type LiveOddsRow } from '../lib/espn/liveOddsModel';

// Mock/synthetic data is only used when explicitly enabled (VITE_USE_MOCKS=true), never as a silent fallback.
const USE_MOCKS = ((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_USE_MOCKS) === 'true';
const REFRESH_MS = 60_000;

// DEV ONLY (VITE_USE_MOCKS=true): synthetic lines.
interface GameOdd {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  spread: string;
  total: string;
  homeMl?: string;
  awayMl?: string;
  isHot?: boolean;
}

const LEAGUE_MOCK_DATA: Record<League, GameOdd[]> = {
  NFL: [
    { id: 'nfl-1', homeTeam: 'KC', awayTeam: 'BAL', homeScore: 24, awayScore: 20, status: 'LIVE Q4 12:30', spread: 'KC -3.5', total: '51.5', homeMl: '-175', awayMl: '+150', isHot: true },
    { id: 'nfl-2', homeTeam: 'PHI', awayTeam: 'DAL', status: 'SUN 4:25PM', spread: 'PHI -2.5', total: '48.5', homeMl: '-135', awayMl: '+115' },
    { id: 'nfl-3', homeTeam: 'BUF', awayTeam: 'MIA', status: 'SUN 8:20PM', spread: 'BUF -6.0', total: '54.0', homeMl: '-260', awayMl: '+210' },
    { id: 'nfl-4', homeTeam: 'GB', awayTeam: 'CHI', status: 'SUN 1:00PM', spread: 'GB -4.5', total: '44.0', homeMl: '-210', awayMl: '+175' }
  ],
  CFL: [
    { id: 'cfl-1', homeTeam: 'MTL', awayTeam: 'WPG', homeScore: 28, awayScore: 24, status: 'LIVE Q3 08:45', spread: 'MTL -3.5', total: '49.5', homeMl: '-180', awayMl: '+155', isHot: true },
    { id: 'cfl-2', homeTeam: 'TOR', awayTeam: 'HAM', status: 'SAT 7:00PM', spread: 'TOR -5.5', total: '51.5', homeMl: '-240', awayMl: '+200' },
    { id: 'cfl-3', homeTeam: 'BC', awayTeam: 'SSK', status: 'SUN 4:00PM', spread: 'BC -2.5', total: '47.5', homeMl: '-140', awayMl: '+120' },
    { id: 'cfl-4', homeTeam: 'CGY', awayTeam: 'EDM', status: 'SUN 1:00PM', spread: 'CGY -1.5', total: '45.5', homeMl: '-120', awayMl: '+100' }
  ],
  NBA: [
    { id: 'nba-1', homeTeam: 'LAL', awayTeam: 'BOS', homeScore: 104, awayScore: 102, status: 'LIVE Q4 02:15', spread: 'LAL -1.5', total: '224.5', homeMl: '-120', awayMl: '+100', isHot: true },
    { id: 'nba-2', homeTeam: 'GSW', awayTeam: 'SAC', status: 'SUN 8:30PM', spread: 'GSW -3.5', total: '232.0', homeMl: '-165', awayMl: '+140' },
    { id: 'nba-3', homeTeam: 'MIL', awayTeam: 'PHI', status: 'SUN 6:00PM', spread: 'MIL -4.5', total: '228.5', homeMl: '-190', awayMl: '+160' }
  ],
  NHL: [
    { id: 'nhl-1', homeTeam: 'BOS', awayTeam: 'MTL', homeScore: 3, awayScore: 2, status: 'LIVE P3 14:20', spread: 'BOS -1.5', total: '5.5', homeMl: '-150', awayMl: '+130', isHot: true },
    { id: 'nhl-2', homeTeam: 'NYR', awayTeam: 'NJ', status: 'SUN 7:00PM', spread: 'NYR -1.5', total: '6.0', homeMl: '-140', awayMl: '+120' },
    { id: 'nhl-3', homeTeam: 'EDM', awayTeam: 'TOR', status: 'SUN 8:00PM', spread: 'EDM -1.5', total: '6.5', homeMl: '-135', awayMl: '+115' }
  ],
  MLB: [
    { id: 'mlb-1', homeTeam: 'NYY', awayTeam: 'BOS', homeScore: 5, awayScore: 4, status: 'LIVE 8TH INN', spread: 'NYY -1.5', total: '8.5', homeMl: '-140', awayMl: '+120', isHot: true },
    { id: 'mlb-2', homeTeam: 'LAD', awayTeam: 'SF', status: 'SUN 4:10PM', spread: 'LAD -1.5', total: '7.5', homeMl: '-180', awayMl: '+155' },
    { id: 'mlb-3', homeTeam: 'CHC', awayTeam: 'STL', status: 'SUN 1:20PM', spread: 'CHC -1.5', total: '8.0', homeMl: '-125', awayMl: '+105' }
  ],
  MLS: [
    { id: 'mls-1', homeTeam: 'MIA', awayTeam: 'LAG', homeScore: 2, awayScore: 1, status: 'LIVE 78 MIN', spread: 'MIA -0.5', total: '3.5', homeMl: '-130', awayMl: '+240', isHot: true },
    { id: 'mls-2', homeTeam: 'LAFC', awayTeam: 'SEA', status: 'SUN 5:00PM', spread: 'LAFC -0.5', total: '2.5', homeMl: '-110', awayMl: '+280' }
  ],
  SOCCER: [
    { id: 'soc-1', homeTeam: 'RMD', awayTeam: 'BAR', homeScore: 1, awayScore: 1, status: 'LIVE 65 MIN', spread: 'RMD -0.5', total: '3.0', homeMl: '+110', awayMl: '+220', isHot: true },
    { id: 'soc-2', homeTeam: 'MCI', awayTeam: 'LIV', status: 'SUN 11:30AM', spread: 'MCI -0.5', total: '3.5', homeMl: '-120', awayMl: '+260' }
  ],
  MMA: [
    { id: 'mma-1', homeTeam: 'JON', awayTeam: 'STI', status: 'SAT 10:00PM', spread: 'JON -350', total: '2.5', homeMl: '-350', awayMl: '+280' },
    { id: 'mma-2', homeTeam: 'PER', awayTeam: 'PRO', status: 'SAT 9:30PM', spread: 'PER -150', total: '1.5', homeMl: '-150', awayMl: '+130' }
  ],
  GOLF: [
    { id: 'golf-1', homeTeam: 'SCH', awayTeam: 'MCI', status: 'LIVE ROUND 4', spread: 'SCH -3', total: '-12', homeMl: '-200', awayMl: '+160' }
  ],
  HORSE: [
    { id: 'hrs-1', homeTeam: 'SEC', awayTeam: 'BOL', status: 'LIVE POST TIME', spread: 'SEC -1.5', total: '1:59.4', homeMl: '-250', awayMl: '+200' }
  ],
  VELOCITY: [
    { id: 'vel-1', homeTeam: 'BTC', awayTeam: 'ETH', status: 'LIVE HIGH VOL', spread: 'BTC -2.4%', total: '72000', homeMl: '-150', awayMl: '+130' }
  ]
};


const flip = (s: string) => (s.startsWith('-') ? `+${s.slice(1)}` : s.startsWith('+') ? `-${s.slice(1)}` : s);

/** DEV ONLY: adapt the synthetic "KC -3.5" spread strings to per-side rows. */
const getMockRows = (league: League): LiveOddsRow[] =>
  (LEAGUE_MOCK_DATA[league] || LEAGUE_MOCK_DATA.NFL).map((g) => {
    const [team, val] = g.spread.split(' ');
    const homeSpread = team === g.homeTeam ? val : flip(val ?? '');
    return {
      id: g.id, homeTeam: g.homeTeam, awayTeam: g.awayTeam,
      homeScore: g.homeScore ?? null, awayScore: g.awayScore ?? null,
      status: g.status, isLive: g.status.startsWith('LIVE'), isFinal: false,
      spreadHome: homeSpread || OFF, spreadAway: homeSpread ? flip(homeSpread) : OFF,
      total: g.total || OFF, mlHome: g.homeMl || OFF, mlAway: g.awayMl || OFF,
      provider: 'MOCK', capturedAt: null,
    };
  });

type LoadState = 'loading' | 'ready' | 'empty' | 'error' | 'unsupported';

const fmtAsOf = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

interface LiveOddsProps {
  league: League;
}

export const LiveOdds: React.FC<LiveOddsProps> = ({ league }) => {
  const [rows, setRows] = useState<LiveOddsRow[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'SPREAD' | 'TOTAL' | 'ML'>('SPREAD');
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);
  const leagueKey = toLeagueKey(league);

  const fetchOdds = useCallback(async (initial: boolean) => {
    const id = ++reqId.current;
    if (initial) setState('loading');
    setRefreshing(true);
    try {
      if (USE_MOCKS) {
        setRows(getMockRows(league));
        setErrorMsg(null);
        setDataAsOf(null);
        setState('ready');
        return;
      }
      if (!leagueKey) {
        setRows([]);
        setState('unsupported');
        return;
      }
      const cfg = readerConfigFromEnv();
      const events = await getEvents(cfg, { league: leagueKey, date: todayIn(), days: 2 });
      const odds = events.length ? await getLatestOddsByEvent(cfg, events.map((e) => e.espn_id)) : {};
      if (id !== reqId.current) return;
      const next = toLiveOddsRows(toBoardMatchups(events, odds));
      setRows(next);
      setDataAsOf(latestCapturedAt(odds) ?? latestEventUpdate(events));
      setErrorMsg(null);
      setState(next.length ? 'ready' : 'empty');
    } catch (e) {
      if (id !== reqId.current) return;
      setErrorMsg(e instanceof EspnReadError ? e.message : 'Unexpected error loading odds.');
      // Keep the last good rows visible on a refresh failure; show the error state only if we have nothing.
      setState((s) => (initial || s !== 'ready' ? 'error' : s));
    } finally {
      if (id === reqId.current) setRefreshing(false);
    }
  }, [league, leagueKey]);

  useEffect(() => {
    void fetchOdds(true);
    const interval = setInterval(() => void fetchOdds(false), REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchOdds]);

  const live = !USE_MOCKS && state === 'ready';
  const cell = (v: string) => v || OFF;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm">
            <Activity size={18} className={live ? "animate-pulse" : ""} />
            Vegas Board
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{USE_MOCKS ? 'MOCK DATA (DEV)' : 'ESPN CONSENSUS'}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase font-mono flex items-center gap-1 ${live ? 'text-emerald-500' : state === 'error' ? 'text-rose-500' : 'text-amber-500'}`}>
                {live ? <Wifi size={12}/> : <WifiOff size={12}/>}
                {USE_MOCKS ? 'MOCK' : live ? 'LIVE' : state === 'error' ? 'ERROR' : state === 'loading' ? '...' : 'IDLE'}
            </span>
            <button
                onClick={() => void fetchOdds(false)}
                disabled={refreshing}
                className="text-slate-500 hover:text-white transition-colors p-1"
                title="Force Refresh"
            >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800 mb-4 shrink-0">
        {(['SPREAD', 'TOTAL', 'ML'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={clsx("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all", viewMode === m ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300")}
          >
            {m === 'ML' ? 'Moneyline' : m === 'TOTAL' ? 'Total' : 'Spread'}
          </button>
        ))}
      </div>

      {/* DATA GRID */}
      <div className="space-y-2">
        {state === 'loading' && (
          <div className="text-center text-slate-500 text-xs py-10 border border-dashed border-slate-800 rounded-lg">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-60" />
            Loading {league} lines...
          </div>
        )}

        {state === 'error' && (
          <div className="text-center text-rose-400 text-xs py-10 border border-dashed border-rose-900/60 rounded-lg">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-70" />
            Couldn't load odds. {errorMsg}
            <button onClick={() => void fetchOdds(true)} className="block mx-auto mt-2 text-[10px] uppercase tracking-wider text-slate-400 hover:text-white">Retry</button>
          </div>
        )}

        {state === 'unsupported' && (
          <div className="text-center text-slate-500 text-xs py-10 border border-dashed border-slate-800 rounded-lg">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            Live lines aren't available for {league} yet (NFL, NBA, NHL, MLB only).
          </div>
        )}

        {state === 'empty' && (
          <div className="text-center text-slate-500 text-xs py-10 border border-dashed border-slate-800 rounded-lg">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No {league} games today or tomorrow.
          </div>
        )}

        {state === 'ready' && rows.map((game) => (
          <div key={game.id} className="bg-slate-900/40 rounded-lg p-3 border border-slate-800 hover:border-cyan-500/30 transition-all group">

            {/* Status Bar */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800/50">
                <span className={`text-[9px] font-mono uppercase tracking-wider ${game.isFinal ? 'text-slate-600' : game.isLive ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {game.status}
                </span>
                {game.isLive && <TrendingUp size={12} className="text-emerald-500" />}
            </div>

            {/* Matchup Row */}
            <div className="flex items-center justify-between">

                {/* Away Team */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            {game.awayLogo && <img src={game.awayLogo} alt="" className="w-5 h-5 object-contain" />}
                            <span className="font-black text-sm text-white">{game.awayTeam}</span>
                        </div>
                        <span className="font-mono text-slate-300">{game.awayScore ?? '-'}</span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded text-center border border-slate-800">
                        {viewMode === 'SPREAD' && cell(game.spreadAway)}
                        {viewMode === 'TOTAL' && (game.total === OFF ? OFF : `O ${game.total}`)}
                        {viewMode === 'ML' && cell(game.mlAway)}
                    </div>
                </div>

                {/* VS Divider */}
                <div className="px-3 text-[9px] text-slate-600 font-bold">@</div>

                {/* Home Team */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-slate-300">{game.homeScore ?? '-'}</span>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="font-black text-sm text-white text-right">{game.homeTeam}</span>
                            {game.homeLogo && <img src={game.homeLogo} alt="" className="w-5 h-5 object-contain" />}
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded text-center border border-slate-800">
                        {viewMode === 'SPREAD' && cell(game.spreadHome)}
                        {viewMode === 'TOTAL' && (game.total === OFF ? OFF : `U ${game.total}`)}
                        {viewMode === 'ML' && cell(game.mlHome)}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Metadata */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-600 font-mono shrink-0">
         <span>{USE_MOCKS ? 'Source: mock data (dev)' : `Source: ESPN${rows[0]?.provider ? ` (${rows[0].provider})` : ''}`}</span>
         <span className="flex items-center gap-1">
            <Clock size={10} />
            {USE_MOCKS ? 'Mock' : dataAsOf ? `Data as of ${fmtAsOf(dataAsOf)}${state === 'ready' && errorMsg ? ' · refresh failed' : ''}` : 'No data yet'}
         </span>
      </div>
    </div>
  );
};
