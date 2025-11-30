
import React from 'react';

// NFL Team Abbreviations for ESPN CDN
const TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WSH'
];

export const TeamTicker: React.FC = () => {
  return (
    <div className="w-full bg-slate-950/80 border-b border-white/5 overflow-hidden py-3 relative z-40 backdrop-blur-sm">
      {/* Gradient Masks to fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10"></div>
      
      {/* Ticker Container */}
      <div className="flex w-[200%] animate-scroll hover:[animation-play-state:paused]">
        {/* First Set */}
        <div className="flex justify-around w-1/2 min-w-max gap-12 px-6">
          {TEAMS.map((team) => (
            <div key={team} className="group relative flex flex-col items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-300">
               <div className="w-12 h-12 relative flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all">
                  <img 
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${team}.png`} 
                    alt={team} 
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
               </div>
               <span className="text-[9px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 tracking-widest">{team}</span>
            </div>
          ))}
        </div>

        {/* Duplicate Set for Seamless Loop */}
        <div className="flex justify-around w-1/2 min-w-max gap-12 px-6">
          {TEAMS.map((team) => (
            <div key={`${team}-dup`} className="group relative flex flex-col items-center justify-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-300">
               <div className="w-12 h-12 relative flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all">
                  <img 
                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${team}.png`} 
                    alt={team} 
                    className="w-full h-full object-contain"
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
