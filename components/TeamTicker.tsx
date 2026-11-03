
import React, { useEffect, useState } from 'react';
import { League } from '../types';
import { getEvents, readerConfigFromEnv, todayIn, EspnReadError } from '../lib/espn/reader';
import { toLeagueKey } from '../lib/espn/boardModel';
import { toTickerTeams, type TickerTeam } from '../lib/espn/liveOddsModel';

// Mock/static lists only when explicitly enabled (VITE_USE_MOCKS=true) or for leagues we don't ingest.
const USE_MOCKS = ((import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_USE_MOCKS) === 'true';
const REFRESH_MS = 60_000;

type TickerState =
  | { kind: 'loading' }
  | { kind: 'ready'; teams: TickerTeam[]; asOf: Date }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

interface TeamTickerProps {
  activeLeague: League;
}

const TEAMS: Record<League, string[]> = {
  NFL: [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
    'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
    'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
    'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WSH'
  ],
  NBA: [
    'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 
    'DET', 'GS', 'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 
    'MIL', 'MIN', 'NO', 'NYK', 'OKC', 'ORL', 'PHI', 'PHX', 
    'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
  ],
  NHL: [
    'ANA', 'BOS', 'BUF', 'CGY', 'CAR', 'CHI', 'COL', 'CBJ', 
    'DAL', 'DET', 'EDM', 'FLA', 'LA', 'MIN', 'MTL', 'NSH', 
    'NJ', 'NYI', 'NYR', 'OTT', 'PHI', 'PIT', 'SJ', 'SEA', 
    'STL', 'TB', 'TOR', 'VAN', 'VGK', 'WSH', 'WPG', 'UTA'
  ],
  MLB: [
    'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CIN', 'CLE', 
    'COL', 'DET', 'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 
    'MIN', 'NYM', 'NYY', 'OAK', 'PHI', 'PIT', 'SD', 'SF', 
    'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
  ],
  MLS: [
    'ATL', 'CLT', 'CHI', 'COL', 'CLB', 'DC', 'HOU', 'LAFC', 
    'LA', 'MIA', 'MIN', 'MTL', 'NSH', 'NE', 'NYC', 'NY', 
    'ORL', 'PHI', 'POR', 'RSL', 'SJ', 'SEA', 'SKC', 'STL', 
    'TOR', 'VAN'
  ],
  SOCCER: [
    'ARG', 'BRA', 'FRA', 'ENG', 'GER', 'ESP', 'ITA', 'POR', 
    'NED', 'BEL', 'CRO', 'MEX', 'USA', 'JPN', 'MAR', 'SEN'
  ],
  MMA: [
    'UFC', 'PFL', 'BELL', 'ONE', 'RIZ', 'KSW', 'LFA', 'CAGE'
  ],
  HORSE: [
    'CD', 'SA', 'GP', 'BEL', 'SAR', 'KEE', 'DMR', 'AQU'
  ],
  GOLF: [
    'SCHEFFLER', 'MCILROY', 'RAHM', 'SCHAUFFELE', 'HOVLAND', 'MORIKAWA', 'SPIETH', 'THOMAS'
  ],
  VELOCITY: [
    'BTC', 'ETH', 'SOL', 'AAVE', 'LINK', 'UNI', 'MKR', 'SNX'
  ],
  CFL: [
    'MTL', 'WPG', 'TOR', 'HAM', 'BC', 'CGY', 'EDM', 'SSK', 'OTT'
  ]
};

const leaguePathFor = (activeLeague: League) =>
  activeLeague === 'SOCCER' ? 'soccer' :
  activeLeague === 'MMA' ? 'mma' :
  activeLeague === 'HORSE' ? 'horse' :
  activeLeague === 'GOLF' ? 'golf' :
  activeLeague.toLowerCase();

/** Teams playing today/tomorrow (ET) from the espn read layer; null leagueKey = not ingested (static list). */
function useLiveTeams(activeLeague: League): TickerState | null {
  const leagueKey = USE_MOCKS ? null : toLeagueKey(activeLeague);
  const [state, setState] = useState<TickerState>({ kind: 'loading' });
  useEffect(() => {
    if (!leagueKey) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    const load = async () => {
      try {
        const events = await getEvents(readerConfigFromEnv(), { league: leagueKey, date: todayIn(), days: 2 });
        if (cancelled) return;
        const teams = toTickerTeams(events);
        setState(teams.length ? { kind: 'ready', teams, asOf: new Date() } : { kind: 'empty' });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof EspnReadError ? e.message : 'Unexpected error loading teams.';
        // Keep the last good list on a refresh failure.
        setState((s) => (s.kind === 'ready' ? s : { kind: 'error', message }));
      }
    };
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [leagueKey]);
  return leagueKey ? state : null;
}

export const TeamTicker: React.FC<TeamTickerProps> = ({ activeLeague }) => {
  const live = useLiveTeams(activeLeague);
  const leaguePath = leaguePathFor(activeLeague);
  const staticTeams: TickerTeam[] = (TEAMS[activeLeague] || TEAMS.NFL).map((abbr) => ({ abbr, logo: null }));
  const currentTeams = live === null ? staticTeams : live.kind === 'ready' ? live.teams : [];
  const logoFor = (t: TickerTeam) => t.logo ?? `https://a.espncdn.com/i/teamlogos/${leaguePath}/500/${t.abbr}.png`;

  if (live && live.kind !== 'ready') {
    return (
      <div className="w-full bg-gradient-to-r from-[#0a0a0a] via-[#111322] to-[#0a0a0a] border-b border-indigo-500/10 py-3 relative z-40 text-center text-[10px] font-mono uppercase tracking-widest">
        {live.kind === 'loading' && <span className="text-slate-500 animate-pulse">Loading {activeLeague} slate...</span>}
        {live.kind === 'empty' && <span className="text-slate-500">No {activeLeague} games today or tomorrow</span>}
        {live.kind === 'error' && <span className="text-rose-400" title={live.message}>{activeLeague} slate unavailable</span>}
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#0a0a0a] via-[#111322] to-[#0a0a0a] border-b border-indigo-500/10 overflow-hidden py-3 relative z-40 backdrop-blur-sm">
      {/* Gradient Masks to fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10"></div>
      
      {/* Ticker Container */}
      <div className="flex w-[200%] animate-scroll hover:[animation-play-state:paused]">
        {/* First Set */}
        <div className="flex justify-around w-1/2 min-w-max gap-12 px-6">
          {currentTeams.map((t) => (
            <div key={t.abbr} className="group relative flex flex-col items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-300">
               <div className="w-12 h-12 relative flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all">
                  <img 
                    src={logoFor(t)} 
                    alt={t.abbr} 
                    className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback for tricky team codes if needed
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
               </div>
               <span className="text-[9px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 tracking-widest">{t.abbr}</span>
            </div>
          ))}
        </div>

        {/* Duplicate Set for Seamless Loop */}
        <div className="flex justify-around w-1/2 min-w-max gap-12 px-6">
          {currentTeams.map((t) => (
            <div key={`${t.abbr}-dup`} className="group relative flex flex-col items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-300">
               <div className="w-12 h-12 relative flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all">
                  <img 
                    src={logoFor(t)} 
                    alt={t.abbr} 
                    className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                  />
               </div>
               <span className="text-[9px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 tracking-widest">{t.abbr}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
