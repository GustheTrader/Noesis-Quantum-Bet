
import React, { useState, useEffect } from 'react';
import { RefreshCw, MonitorPlay, Clock, Calendar, ArrowLeft, Trophy, Flag, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface GameSummary {
    id: string;
    shortName: string;
    status: {
        type: {
            state: 'pre' | 'in' | 'post';
            detail: string;
            shortDetail: string;
        };
        period: number;
        displayClock: string;
    };
    competitors: {
        id: string;
        uid: string;
        type: string;
        order: number;
        homeAway: 'home' | 'away';
        team: {
            id: string;
            location: string;
            name: string;
            abbreviation: string;
            displayName: string;
            color?: string;
            logo?: string;
        };
        score: string;
        records?: { summary: string }[];
    }[];
}

interface Play {
    id: string;
    text: string;
    clock: { displayValue: string };
    period: { number: number };
    type: { text: string };
    start: { down: number; distance: number; yardLine: number };
    scoringPlay: boolean;
}

// MOCK DATA FOR DEMO PURPOSES (Fallback if API empty)
const MOCK_GAMES: GameSummary[] = [
    {
        id: 'mock-1',
        shortName: 'KC vs BAL',
        status: { type: { state: 'in', detail: '4th Quarter', shortDetail: '4th 2:30' }, period: 4, displayClock: '2:30' },
        competitors: [
            { id: '1', uid: '1', type: 'team', order: 1, homeAway: 'home', team: { id: '1', location: 'Kansas City', name: 'Chiefs', abbreviation: 'KC', displayName: 'Kansas City Chiefs', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' }, score: '24', records: [{summary: '12-3'}] },
            { id: '2', uid: '2', type: 'team', order: 2, homeAway: 'away', team: { id: '2', location: 'Baltimore', name: 'Ravens', abbreviation: 'BAL', displayName: 'Baltimore Ravens', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' }, score: '20', records: [{summary: '11-4'}] }
        ]
    },
    {
        id: 'mock-2',
        shortName: 'BUF vs MIA',
        status: { type: { state: 'in', detail: '3rd Quarter', shortDetail: '3rd 8:45' }, period: 3, displayClock: '8:45' },
        competitors: [
            { id: '3', uid: '3', type: 'team', order: 1, homeAway: 'home', team: { id: '3', location: 'Miami', name: 'Dolphins', abbreviation: 'MIA', displayName: 'Miami Dolphins', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png' }, score: '17', records: [{summary: '9-6'}] },
            { id: '4', uid: '4', type: 'team', order: 2, homeAway: 'away', team: { id: '4', location: 'Buffalo', name: 'Bills', abbreviation: 'BUF', displayName: 'Buffalo Bills', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' }, score: '21', records: [{summary: '10-5'}] }
        ]
    }
];

export const GameCast: React.FC = () => {
    const [games, setGames] = useState<GameSummary[]>([]);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [plays, setPlays] = useState<Play[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPlays, setLoadingPlays] = useState(false);
    const [error, setError] = useState('');
    const [isMock, setIsMock] = useState(false);

    const fetchGames = async () => {
        setLoading(true);
        try {
            const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
            if (!res.ok) throw new Error('Failed to fetch scoreboard');
            const data = await res.json();
            
            const mappedGames = data.events?.map((e: any) => {
                const c = e.competitions[0];
                return {
                    id: e.id,
                    shortName: e.shortName,
                    status: e.status,
                    competitors: c.competitors
                };
            }) || [];
            
            if (mappedGames.length === 0) {
                setGames(MOCK_GAMES);
                setIsMock(true);
            } else {
                setGames(mappedGames);
                setIsMock(false);
            }
        } catch (e: any) {
            setError(e.message);
            // Fallback on error
            setGames(MOCK_GAMES);
            setIsMock(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchGameDetail = async (gameId: string) => {
        setLoadingPlays(true);
        try {
            if (isMock) {
                // Generate Mock Plays
                await new Promise(r => setTimeout(r, 800));
                setPlays([
                    { id: 'p1', text: 'P.Mahomes pass deep right to T.Kelce for 22 yards, TOUCHDOWN.', clock: { displayValue: '2:30' }, period: { number: 4 }, type: { text: 'Touchdown' }, start: { down: 2, distance: 8, yardLine: 22 }, scoringPlay: true },
                    { id: 'p2', text: 'I.Pacheco rush up the middle for 4 yards.', clock: { displayValue: '3:15' }, period: { number: 4 }, type: { text: 'Rush' }, start: { down: 1, distance: 10, yardLine: 26 }, scoringPlay: false },
                    { id: 'p3', text: 'L.Jackson pass incomplete short left intended for Z.Flowers.', clock: { displayValue: '4:05' }, period: { number: 4 }, type: { text: 'Pass Incomplete' }, start: { down: 3, distance: 6, yardLine: 45 }, scoringPlay: false }
                ]);
                setLoadingPlays(false);
                return;
            }

            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
            if (!res.ok) throw new Error('Failed to fetch game summary');
            const data = await res.json();
            
            // Extract Plays
            const drivePlays = data.drives?.previous?.flatMap((d: any) => d.plays) || [];
            // Or if live, current drive
            const currentDrivePlays = data.drives?.current?.plays || [];
            
            const allPlays = [...currentDrivePlays, ...drivePlays].reverse(); // Newest first
            
            // Map to simpler structure
            const mappedPlays = allPlays.map((p: any) => ({
                id: p.id,
                text: p.text,
                clock: p.clock,
                period: p.period,
                type: p.type,
                start: p.start,
                scoringPlay: p.scoringPlay
            }));

            setPlays(mappedPlays);

        } catch (e: any) {
            console.error("Game detail error", e);
        } finally {
            setLoadingPlays(false);
        }
    };

    useEffect(() => {
        fetchGames();
        const interval = setInterval(fetchGames, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedGameId) {
            fetchGameDetail(selectedGameId);
            const interval = setInterval(() => fetchGameDetail(selectedGameId), 15000); // 15s refresh for plays
            return () => clearInterval(interval);
        }
    }, [selectedGameId]);

    // VIEW: SELECTED GAME
    if (selectedGameId) {
        const game = games.find(g => g.id === selectedGameId);
        if (!game) return <div className="p-8 text-center text-slate-500">Game not found in cache.</div>;

        const home = game.competitors.find(c => c.homeAway === 'home');
        const away = game.competitors.find(c => c.homeAway === 'away');

        return (
            <div className="space-y-6">
                <button 
                    onClick={() => setSelectedGameId(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-xs uppercase font-bold tracking-widest"
                >
                    <ArrowLeft size={16} /> Back to Scoreboard
                </button>

                {/* Scoreboard Header */}
                <div className="glass-panel p-6 rounded-2xl border-b-4 border-purple-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-90"></div>
                    {isMock && <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded border border-amber-500/30 z-20">Simulated Data</div>}
                    <div className="relative z-10 grid grid-cols-3 items-center">
                        {/* Away */}
                        <div className="text-center">
                            <div className="text-4xl font-black text-white mb-2">{away?.team.abbreviation}</div>
                            <div className="text-slate-400 text-xs font-mono">{away?.records?.[0]?.summary}</div>
                            <div className="text-6xl font-black text-white mt-2 font-mono tracking-tighter">{away?.score}</div>
                        </div>

                        {/* Clock */}
                        <div className="text-center flex flex-col items-center justify-center">
                            <div className="bg-black/50 px-4 py-2 rounded-lg border border-slate-700 backdrop-blur-sm">
                                <div className={clsx("text-2xl font-mono font-bold tracking-widest", game.status.type.state === 'in' ? "text-emerald-400" : "text-slate-400")}>
                                    {game.status.displayClock}
                                </div>
                                <div className="text-xs text-slate-500 font-bold uppercase mt-1">
                                    Q{game.status.period} • {game.status.type.detail}
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                {game.status.type.state === 'in' ? <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> : null}
                                {game.status.type.state === 'in' ? "Live Action" : "Game Status"}
                            </div>
                        </div>

                        {/* Home */}
                        <div className="text-center">
                            <div className="text-4xl font-black text-white mb-2">{home?.team.abbreviation}</div>
                            <div className="text-slate-400 text-xs font-mono">{home?.records?.[0]?.summary}</div>
                            <div className="text-6xl font-black text-white mt-2 font-mono tracking-tighter">{home?.score}</div>
                        </div>
                    </div>
                </div>

                {/* Play by Play */}
                <div className="glass-panel rounded-2xl overflow-hidden border border-slate-700">
                    <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <MonitorPlay size={16} className="text-purple-400" />
                            Live Feed
                        </h3>
                        {loadingPlays && <RefreshCw size={14} className="animate-spin text-slate-500" />}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {plays.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 text-xs italic">
                                {loadingPlays ? "Loading play data..." : "No play data available yet."}
                            </div>
                        ) : (
                            plays.map((play) => (
                                <div key={play.id} className={clsx("p-3 rounded-lg border text-sm relative overflow-hidden", play.scoringPlay ? "bg-emerald-900/20 border-emerald-500/30" : "bg-slate-900/40 border-slate-800")}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-slate-400 font-bold bg-black/30 px-1.5 py-0.5 rounded">
                                                Q{play.period.number} {play.clock.displayValue}
                                            </span>
                                            {play.scoringPlay && <span className="text-[10px] font-bold bg-emerald-500 text-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1"><Trophy size={10}/> Scoring Play</span>}
                                        </div>
                                    </div>
                                    <p className="text-slate-200 leading-relaxed">
                                        {play.text}
                                    </p>
                                    {play.start?.down > 0 && (
                                        <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                                            <Flag size={10} />
                                            <span>{play.start.down} & {play.start.distance} at {play.start.yardLine}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // VIEW: SCOREBOARD
    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchGames} 
                        disabled={loading}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-widest flex items-center gap-2">
                        ESPN Data Feed
                        {isMock && <span className="bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded text-[9px] border border-amber-500/20">SIMULATION MODE</span>}
                    </span>
                </div>
            </div>

            {loading && games.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-900/50 rounded-xl animate-pulse"></div>)}
                </div>
            ) : games.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No active games found. Check back later.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {games.map(game => {
                        const home = game.competitors.find(c => c.homeAway === 'home');
                        const away = game.competitors.find(c => c.homeAway === 'away');
                        
                        return (
                            <div 
                                key={game.id} 
                                onClick={() => setSelectedGameId(game.id)}
                                className="glass-panel p-4 rounded-xl border border-slate-700 hover:border-purple-500/50 hover:bg-slate-900/60 cursor-pointer transition-all group"
                            >
                                <div className="flex justify-between items-center mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                                    <span className={game.status.type.state === 'in' ? "text-emerald-400 flex items-center gap-1" : ""}>
                                        {game.status.type.state === 'in' ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> : <Clock size={10} />}
                                        {game.status.type.shortDetail}
                                    </span>
                                    <span>NFL</span>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            {away?.team.logo && <img src={away.team.logo} className="w-8 h-8 object-contain" alt={away.team.abbreviation} />}
                                            <div>
                                                <div className="font-black text-white text-lg leading-none">{away?.team.abbreviation}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{away?.records?.[0]?.summary}</div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-mono font-bold text-white">{away?.score}</div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            {home?.team.logo && <img src={home.team.logo} className="w-8 h-8 object-contain" alt={home.team.abbreviation} />}
                                            <div>
                                                <div className="font-black text-white text-lg leading-none">{home?.team.abbreviation}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">{home?.records?.[0]?.summary}</div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-mono font-bold text-white">{home?.score}</div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-center text-xs font-bold text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                                    View Gamecast
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
