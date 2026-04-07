
import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Clock, TrendingUp, Wifi, WifiOff, AlertCircle, DollarSign, Hash, Divide } from 'lucide-react';
import { clsx } from 'clsx';
import { League } from '../types';

interface GameOdd {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  spread: string;
  total: string;
  homeMl?: string;
  awayMl?: string;
  isHot?: boolean;
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
    homeMl: '-175',
    awayMl: '+150',
    isHot: true
  },
  {
    id: 'mock-2',
    homeTeam: 'PHI',
    awayTeam: 'DAL',
    status: 'SUN 4:25PM',
    spread: 'PHI -2.5',
    total: '48.5',
    homeMl: '-135',
    awayMl: '+115'
  },
  {
    id: 'mock-3',
    homeTeam: 'BUF',
    awayTeam: 'MIA',
    status: 'SUN 8:20PM',
    spread: 'BUF -6.0',
    total: '54.0',
    homeMl: '-260',
    awayMl: '+210'
  },
  {
    id: 'mock-4',
    homeTeam: 'GB',
    awayTeam: 'CHI',
    status: 'SUN 1:00PM',
    spread: 'GB -4.5',
    total: '44.0',
    homeMl: '-210',
    awayMl: '+175'
  },
  {
    id: 'mock-5',
    homeTeam: 'CIN',
    awayTeam: 'PIT',
    status: 'SUN 1:00PM',
    spread: 'CIN -3.0',
    total: '42.5',
    homeMl: '-165',
    awayMl: '+140'
  },
   {
    id: 'mock-6',
    homeTeam: 'HOU',
    awayTeam: 'JAX',
    status: 'SUN 1:00PM',
    spread: 'HOU -6.5',
    total: '46.5',
    homeMl: '-280',
    awayMl: '+230'
  }
];

// Helper to estimate ML from spread if API lacks it (Common in free feeds)
const estimateMoneyline = (spreadStr: string): { home: string, away: string } => {
    // Basic heuristics for demo purposes
    if (!spreadStr || spreadStr === 'EVEN') return { home: '-110', away: '-110' };
    
    const parts = spreadStr.split(' ');
    const team = parts[0];
    const val = parseFloat(parts[1]);
    
    // If spread is negative, that team is favored (negative ML)
    // Formula approximation: ML = (Spread * 30) - 110 (very rough)
    let favMl = -110 - (Math.abs(val) * 20); 
    let dogMl = 100 + (Math.abs(val) * 18);
    
    // Round to 5
    favMl = Math.round(favMl / 5) * 5;
    dogMl = Math.round(dogMl / 5) * 5;

    // Check who is favored in string
    // e.g. "BUF -6.0" -> BUF is Home or Away? We need context. 
    // Simplified: return favoring the team in the string
    return { 
        home: val < 0 ? `${favMl}` : `+${dogMl}`, 
        away: val < 0 ? `+${dogMl}` : `${favMl}` 
    };
};

interface LiveOddsProps {
  league: League;
}

export const LiveOdds: React.FC<LiveOddsProps> = ({ league }) => {
  const [odds, setOdds] = useState<GameOdd[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [usingLiveData, setUsingLiveData] = useState(false);
  const [viewMode, setViewMode] = useState<'SPREAD' | 'TOTAL' | 'ML'>('SPREAD');
  
  const fetchOdds = async () => {
    setLoading(true);
    try {
        // Map League to ESPN API path
        const leagueMap: Record<League, string> = {
            NFL: 'football/nfl',
            NBA: 'basketball/nba',
            NHL: 'hockey/nhl',
            MLB: 'baseball/mlb',
            MLS: 'soccer/usa.1',
            SOCCER: 'soccer/eng.1',
            MMA: 'mma/ufc',
            HORSE: 'horse-racing',
            GOLF: 'golf/pga',
            VELOCITY: 'crypto'
        };

        const path = leagueMap[league] || 'football/nfl';
        let response;
        try {
            response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`);
        } catch (e) {
            console.warn(`Live odds fetch failed for ${league}, using mock data`);
            setOdds(MOCK_ODDS);
            setUsingLiveData(false);
            setLoading(false);
            return;
        }
        
        if (!response.ok) {
            setOdds(MOCK_ODDS);
            setUsingLiveData(false);
            setLoading(false);
            return;
        }
        
        const data = await response.json();
        const events = data.events || [];

        if (events.length === 0) {
            setOdds(MOCK_ODDS);
            setUsingLiveData(false);
        } else {
            const mappedOdds: GameOdd[] = events.map((event: any) => {
                const competition = event.competitions[0];
                
                // Special handling for GOLF (Individual sport)
                if (league === 'GOLF') {
                    const topPlayers = competition.competitors.slice(0, 2);
                    const leader = topPlayers[0];
                    const second = topPlayers[1];

                    return {
                        id: event.id,
                        homeTeam: leader?.athlete?.shortName || leader?.team?.abbreviation || 'TBD',
                        awayTeam: second?.athlete?.shortName || second?.team?.abbreviation || 'TBD',
                        homeLogo: leader?.athlete?.headshot?.href || leader?.team?.logo,
                        awayLogo: second?.athlete?.headshot?.href || second?.team?.logo,
                        homeScore: leader?.score || 0,
                        awayScore: second?.score || 0,
                        status: event.status.type.shortDetail,
                        spread: leader?.curatedRank?.label || 'RANK 1',
                        total: leader?.linescores?.[0]?.displayValue || 'E',
                        homeMl: 'LEADER',
                        awayMl: 'CHASE',
                        isHot: true
                    };
                }

                const homeComp = competition.competitors.find((c: any) => c.homeAway === 'home');
                const awayComp = competition.competitors.find((c: any) => c.homeAway === 'away');
                const oddsData = competition.odds ? competition.odds[0] : null;

                // Status parsing
                let statusStr = event.status.type.shortDetail; 

                // Parsing Lines
                const spreadStr = oddsData?.details || 'OFF';
                const totalStr = oddsData?.overUnder ? `${oddsData.overUnder}` : 'OFF';
                
                // Moneyline (ESPN often hides this deep, using estimation for consistency in display)
                const ml = estimateMoneyline(spreadStr);
                
                const isHomeFav = spreadStr && homeComp?.team?.abbreviation && spreadStr.includes(homeComp.team.abbreviation) && spreadStr.includes('-');
                const isAwayFav = spreadStr && awayComp?.team?.abbreviation && spreadStr.includes(awayComp.team.abbreviation) && spreadStr.includes('-');
                
                let homeMl = '-110';
                let awayMl = '-110';

                if (isHomeFav) {
                    homeMl = ml.home;
                    awayMl = ml.away;
                } else if (isAwayFav) {
                    homeMl = ml.away;
                    awayMl = ml.home;
                }

                return {
                    id: event.id,
                    homeTeam: homeComp?.team?.abbreviation || 'TBD',
                    awayTeam: awayComp?.team?.abbreviation || 'TBD',
                    homeLogo: homeComp?.team?.logo,
                    awayLogo: awayComp?.team?.logo,
                    homeScore: parseInt(homeComp?.score || '0'),
                    awayScore: parseInt(awayComp?.score || '0'),
                    status: statusStr,
                    spread: spreadStr,
                    total: totalStr,
                    homeMl: homeMl,
                    awayMl: awayMl,
                    isHot: false 
                };
            });
            
            setOdds(mappedOdds);
            setUsingLiveData(true);
        }
    } catch (err) {
        console.error("Failed to fetch live odds:", err);
        setOdds(MOCK_ODDS);
        setUsingLiveData(false);
    } finally {
        setLastUpdated(new Date());
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchOdds();
    const interval = setInterval(fetchOdds, 1800000);
    return () => clearInterval(interval);
  }, [league]); // Refetch when league changes

  return (
    <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm">
            <Activity size={18} className={usingLiveData ? "animate-pulse" : ""} />
            Vegas Board
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">LIVE CONSENSUS</span>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase font-mono flex items-center gap-1 ${usingLiveData ? 'text-emerald-500' : 'text-amber-500'}`}>
                {usingLiveData ? <Wifi size={12}/> : <WifiOff size={12}/>}
                {usingLiveData ? 'LIVE' : 'SIM'}
            </span>
            <button 
                onClick={fetchOdds} 
                disabled={loading}
                className="text-slate-500 hover:text-white transition-colors p-1"
                title="Force Refresh"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800 mb-4 shrink-0">
          <button 
            onClick={() => setViewMode('SPREAD')}
            className={clsx("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all", viewMode === 'SPREAD' ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300")}
          >
            Spread
          </button>
          <button 
            onClick={() => setViewMode('TOTAL')}
            className={clsx("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all", viewMode === 'TOTAL' ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300")}
          >
            Total
          </button>
          <button 
            onClick={() => setViewMode('ML')}
            className={clsx("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all", viewMode === 'ML' ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300")}
          >
            Moneyline
          </button>
      </div>

      {/* DATA GRID */}
      <div className="space-y-2">
        {odds.map((game) => (
          <div key={game.id} className="bg-slate-900/40 rounded-lg p-3 border border-slate-800 hover:border-cyan-500/30 transition-all group">
            
            {/* Status Bar */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800/50">
                <span className={`text-[9px] font-mono uppercase tracking-wider ${game.status?.includes('Final') ? 'text-slate-600' : (game.status?.match(/\d/) ? 'text-rose-500 font-bold' : 'text-slate-400')}`}>
                    {game.status}
                </span>
                {game.isHot && <TrendingUp size={12} className="text-emerald-500" />}
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
                        <span className="font-mono text-slate-300">{!isNaN(Number(game.awayScore)) ? game.awayScore : '-'}</span>
                    </div>
                    {/* Data Point */}
                    <div className="text-[10px] font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded text-center border border-slate-800">
                        {viewMode === 'SPREAD' && (game.spread?.includes(game.awayTeam || '') ? game.spread.replace(game.awayTeam || '', '') : (game.spread?.includes(game.homeTeam || '') ? 'OPP' : 'OFF'))}
                        {viewMode === 'TOTAL' && `O ${game.total}`}
                        {viewMode === 'ML' && (game.awayMl || 'OFF')}
                    </div>
                </div>

                {/* VS Divider */}
                <div className="px-3 text-[9px] text-slate-600 font-bold">@</div>

                {/* Home Team */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-slate-300">{!isNaN(Number(game.homeScore)) ? game.homeScore : '-'}</span>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="font-black text-sm text-white text-right">{game.homeTeam}</span>
                            {game.homeLogo && <img src={game.homeLogo} alt="" className="w-5 h-5 object-contain" />}
                        </div>
                    </div>
                    {/* Data Point */}
                    <div className="text-[10px] font-mono text-cyan-300 bg-black/40 px-2 py-1 rounded text-center border border-slate-800">
                        {viewMode === 'SPREAD' && (game.spread?.includes(game.homeTeam || '') ? game.spread.replace(game.homeTeam || '', '') : (game.spread?.includes(game.awayTeam || '') ? 'OPP' : 'OFF'))}
                        {viewMode === 'TOTAL' && `U ${game.total}`}
                        {viewMode === 'ML' && (game.homeMl || 'OFF')}
                    </div>
                </div>
            </div>
          </div>
        ))}
        
        {odds.length === 0 && !loading && (
            <div className="text-center text-slate-500 text-xs py-10 border border-dashed border-slate-800 rounded-lg">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No active markets.
            </div>
        )}
      </div>
      
      {/* Footer Metadata */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-600 font-mono shrink-0">
         <span>Source: VegasInsider (Consensus)</span>
         <span className="flex items-center gap-1">
            <Clock size={10} />
            Next Update: {new Date(lastUpdated.getTime() + 1800000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
         </span>
      </div>
    </div>
  );
};
