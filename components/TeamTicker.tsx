
import React from 'react';
import { League } from '../types';

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
  ]
};

export const TeamTicker: React.FC<TeamTickerProps> = ({ activeLeague }) => {
  const currentTeams = TEAMS[activeLeague] || TEAMS.NFL;
  const leaguePath = activeLeague.toLowerCase();

  return (
    <div className="w-full bg-gradient-to-r from-[#0a0a0a] via-[#111322] to-[#0a0a0a] border-b border-indigo-500/10 overflow-hidden py-3 relative z-40 backdrop-blur-sm">
      {/* Gradient Masks to fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10"></div>
      
      {/* Ticker Container */}
      <div className="flex w-[200%] animate-scroll hover:[animation-play-state:paused]">
        {/* First Set */}
        <div className="flex justify-around w-1/2 min-w-max gap-12 px-6">
          {currentTeams.map((team) => (
            <div key={team} className="group relative flex flex-col items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-300">
               <div className="w-12 h-12 relative flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all">
                  <img 
                    src={`https://a.espncdn.com/i/teamlogos/${leaguePath}/500/${team}.png`} 
                    alt={team} 
                    className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback for tricky team codes if needed
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
               </div>
               <span className="text-[9px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 tracking-widest">{team}</span>
            </div>
          ))}
        </div>

        {/* Duplicate Set for Seamless Loop */}
        <div className="flex justify-around w-1/2 min-w-max gap-12 px-6">
          {currentTeams.map((team) => (
            <div key={`${team}-dup`} className="group relative flex flex-col items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-300">
               <div className="w-12 h-12 relative flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all">
                  <img 
                    src={`https://a.espncdn.com/i/teamlogos/${leaguePath}/500/${team}.png`} 
                    alt={team} 
                    className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                    loading="lazy"
                  />
               </div>
               <span className="text-[9px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 tracking-widest">{team}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
