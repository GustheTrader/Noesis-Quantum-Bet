
import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Clock, TrendingUp, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface GameOdd {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string; // e.g., 'SUN 1:00PM', 'LIVE Q2', 'FINAL'
  spread: string;
  total: string;
  isHot?: boolean; // Significant line movement logic could go here
}

const MOCK_ODDS: GameOdd[] = [
  {
    id: 'mock-1',
    homeTeam: 'KC',
    awayTeam: 'BAL',
    homeScore: 24,
    awayScore: 20,
    status: 'LIVE Q4 12:30',
    spread: 'KC -3.5',
    total: '51.5',
    isHot: true
  },
  {
    id: 'mock-2',
    homeTeam: 'PHI',
    awayTeam: 'DAL',
    status: 'SUN 4:25PM',
    spread: 'PHI -2.5',
    total: '48.5'
  },
  {
    id: 'mock-3',
    homeTeam: 'BUF',
    awayTeam: 'MIA',
    status: 'SUN 8:20PM',
    spread: 'BUF -6.0',
    total: '54.0'
  }
];

export const LiveOdds: React.FC = () => {
  const [odds, setOdds] = useState<GameOdd[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [usingLiveData, setUsingLiveData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOdds = async () => {
    setLoading(true);
    setError(null);
    try {
        // Public ESPN Endpoint for NFL Scoreboard
        // This is a common public endpoint used for non-commercial educational projects
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
        
        if (!response.ok) throw new Error("API connection failed");
        
        const data = await response.json();
        const events = data.events || [];

        if (events.length === 0) {
            console.warn("No live games found from API (Offseason/No Games), using simulation.");
            setOdds(MOCK_ODDS);
            setUsingLiveData(false);
        } else {
            const mappedOdds: GameOdd[] = events.map((event: any) => {
                const competition = event.competitions[0];
                const homeComp = competition.competitors.find((c: any) => c.homeAway === 'home');
                const awayComp = competition.competitors.find((c: any) => c.homeAway === 'away');
                const oddsData = competition.odds ? competition.odds[0] : null;

                // Status parsing: "Final", "1st 10:00", "Sun, 1:00 PM"
                let statusStr = event.status.type.shortDetail; 

                // Parsing Lines
                const spreadStr = oddsData?.details || 'OFF';
                const totalStr = oddsData?.overUnder ? `${oddsData.overUnder}` : 'OFF';

                return {
                    id: event.id,
                    homeTeam: homeComp.team.abbreviation,
                    awayTeam: awayComp.team.abbreviation,
                    homeScore: parseInt(homeComp.score),
                    awayScore: parseInt(awayComp.score),
                    status: statusStr,
                    spread: spreadStr,
                    total: totalStr,
                    isHot: false // Could implement logic here if we had opening lines
                };
            });
            
            setOdds(mappedOdds);
            setUsingLiveData(true);
        }
    } catch (err) {
        console.error("Failed to fetch live odds:", err);
        setError("Connection issue");
        setOdds(MOCK_ODDS);
        setUsingLiveData(false);
    } finally {
        setLastUpdated(new Date());
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchOdds();
    // Auto-refresh every 60s
    const interval = setInterval(fetchOdds, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 mb-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm">
          <Activity size={18} className={usingLiveData ? "animate-pulse" : ""} />
          Live Market
        </h3>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase font-mono flex items-center gap-1 ${usingLiveData ? 'text-emerald-500' : 'text-amber-500'}`}>
                {usingLiveData ? <Wifi size={12}/> : <WifiOff size={12}/>}
                {usingLiveData ? 'ESPN FEED' : 'SIMULATION'}
            </span>
            <button 
                onClick={fetchOdds} 
                disabled={loading}
                className="text-slate-500 hover:text-white transition-colors p-1"
                title="Refresh Odds"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
        {odds.map((game) => (
          <div key={game.id} className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 hover:border-cyan-500/30 transition-all group">
            
            {/* Game Status Header */}
            <div className="flex justify-between items-center mb-2 text-[10px] font-mono uppercase tracking-wider">
              <span className={`flex items-center gap-1 ${game.status.includes('Final') ? 'text-slate-500' : (game.status.match(/\d/) ? 'text-rose-500 font-bold animate-pulse' : 'text-slate-400')}`}>
                {game.status.match(/\d/) && !game.status.includes('Final') && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
                {game.status}
              </span>
              {game.isHot && (
                 <span className="text-emerald-400 flex items-center gap-1">
                   <TrendingUp size={10} /> Heavy Action
                 </span>
              )}
            </div>

            {/* Teams & Scores */}
            <div className="flex justify-between items-center mb-3">
               <div className="space-y-1">
                  <div className="flex items-center justify-between w-28">
                     <span className="text-white font-black text-sm">{game.awayTeam}</span>
                     <span className="text-white font-mono">{isNaN(Number(game.awayScore)) ? 0 : game.awayScore}</span>
                  </div>
                  <div className="flex items-center justify-between w-28">
                     <span className="text-white font-black text-sm">{game.homeTeam}</span>
                     <span className="text-white font-mono">{isNaN(Number(game.homeScore)) ? 0 : game.homeScore}</span>
                  </div>
               </div>
               
               {/* Lines */}
               <div className="text-right space-y-1">
                  <div className="bg-black/40 px-2 py-1 rounded border border-slate-700 text-[10px] text-cyan-300 font-mono min-w-[60px] text-center">
                    {game.spread}
                  </div>
                  <div className="bg-black/40 px-2 py-1 rounded border border-slate-700 text-[10px] text-slate-400 font-mono min-w-[60px] text-center">
                    O/U {game.total}
                  </div>
               </div>
            </div>
          </div>
        ))}
        {odds.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-xs py-4 border border-dashed border-slate-800 rounded-lg">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No active games found.
            </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600 font-mono">
         <span>Feed: {usingLiveData ? 'ESPN Public' : 'Quantum Sim'}</span>
         <span className="flex items-center gap-1">
            <Clock size={10} />
            {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
         </span>
      </div>
    </div>
  );
};
