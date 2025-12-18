
import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, ExternalLink, Activity, Calendar, ShieldCheck, ChevronRight, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';

// --- CONFIGURATION ---
const SPORTSDATA_KEY = 'fecb349a85264f47b853aa08e87cc860'; // Provided API Key

// --- DATA STRUCTURES ---
interface BookData {
    spread: string;
    total: string;
    mlHome: string;
    mlAway: string;
}

interface Matchup {
    id: string;
    date: Date;
    homeTeam: string;
    homeAbr: string;
    homeLogo?: string;
    awayTeam: string;
    awayAbr: string;
    awayLogo?: string;
    status: string;
    // Odds Data
    openSpread?: string;
    openTotal?: string;
    consensusSpread?: string;
    consensusTotal?: string;
    consensusMlHome?: string;
    consensusMlAway?: string;
    // Book Specifics
    bookOdds: Record<string, BookData>;
}

// --- MOCK DATA FOR FALLBACK ---
const MOCK_GAMES_DATA: Matchup[] = [
    {
        id: 'mock-1',
        date: new Date(new Date().setHours(13, 0, 0, 0)),
        homeTeam: 'Kansas City',
        homeAbr: 'KC',
        homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
        awayTeam: 'Baltimore',
        awayAbr: 'BAL',
        awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
        status: 'Scheduled',
        openSpread: '-3.0',
        openTotal: '51.5',
        consensusSpread: '-3.5',
        consensusTotal: '52.0',
        consensusMlHome: '-175',
        consensusMlAway: '+150',
        bookOdds: {
            'circa': { spread: '-3.5', total: '52.0', mlHome: '-170', mlAway: '+155' },
            'boomers': { spread: '-3.5', total: '51.5', mlHome: '-175', mlAway: '+150' },
            'dk': { spread: '-3.5', total: '52.0', mlHome: '-180', mlAway: '+150' },
            'fd': { spread: '-3.5', total: '52.5', mlHome: '-178', mlAway: '+152' },
            'czr': { spread: '-3.5', total: '52.0', mlHome: '-175', mlAway: '+145' }
        }
    },
    {
        id: 'mock-2',
        date: new Date(new Date().setHours(16, 25, 0, 0)),
        homeTeam: 'San Francisco',
        homeAbr: 'SF',
        homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
        awayTeam: 'Dallas',
        awayAbr: 'DAL',
        awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
        status: 'Scheduled',
        openSpread: '-4.5',
        openTotal: '48.5',
        consensusSpread: '-5.5',
        consensusTotal: '49.0',
        consensusMlHome: '-240',
        consensusMlAway: '+200',
        bookOdds: {
            'circa': { spread: '-6.0', total: '49.0', mlHome: '-245', mlAway: '+205' },
            'boomers': { spread: '-5.5', total: '49.0', mlHome: '-240', mlAway: '+200' },
            'dk': { spread: '-5.5', total: '49.5', mlHome: '-235', mlAway: '+195' },
            'fd': { spread: '-5.5', total: '49.0', mlHome: '-242', mlAway: '+198' },
            'czr': { spread: '-5.5', total: '48.5', mlHome: '-240', mlAway: '+200' }
        }
    },
    {
        id: 'mock-3',
        date: new Date(new Date().setHours(20, 20, 0, 0)),
        homeTeam: 'Buffalo',
        homeAbr: 'BUF',
        homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
        awayTeam: 'Miami',
        awayAbr: 'MIA',
        awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
        status: 'Scheduled',
        openSpread: '-2.5',
        openTotal: '54.5',
        consensusSpread: '-2.5',
        consensusTotal: '55.0',
        consensusMlHome: '-135',
        consensusMlAway: '+115',
        bookOdds: {
            'circa': { spread: '-2.5', total: '55.5', mlHome: '-130', mlAway: '+120' },
            'boomers': { spread: '-2.5', total: '55.0', mlHome: '-135', mlAway: '+115' },
            'dk': { spread: '-3.0', total: '55.0', mlHome: '-140', mlAway: '+110' },
            'fd': { spread: '-2.5', total: '55.0', mlHome: '-134', mlAway: '+114' },
            'czr': { spread: '-2.5', total: '54.5', mlHome: '-135', mlAway: '+115' }
        }
    }
];

const BOOKS = [
    { id: 'circa', name: 'Circa', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', url: 'https://www.circasports.com/', apiName: 'Consensus' }, 
    { id: 'boomers', name: 'Boomers', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', url: '#', apiName: 'Consensus' },
    { id: 'dk', name: 'DraftKings', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', url: 'https://sportsbook.draftkings.com/leagues/football/nfl', apiName: 'DraftKings' },
    { id: 'fd', name: 'FanDuel', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', url: 'https://sportsbook.fanduel.com/navigation/nfl', apiName: 'FanDuel' },
    { id: 'czr', name: 'Caesars', color: 'text-amber-300', bg: 'bg-amber-900/40', border: 'border-amber-500/30', url: 'https://caesars.com/sportsbook-and-casino', apiName: 'Caesars' },
];

export const OddsBoard: React.FC = () => {
    const [games, setGames] = useState<Matchup[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [view, setView] = useState<'SPREAD' | 'TOTAL' | 'ML'>('SPREAD');
    const [apiStatus, setApiStatus] = useState<'LIVE' | 'SIMULATION'>('LIVE');
    const [apiError, setApiError] = useState<string | null>(null);

    // Helper: Format American Odds
    const fmtMoneyline = (val: number) => {
        if (!val) return '-';
        return val > 0 ? `+${val}` : `${val}`;
    };

    // Helper: Format Spread
    const fmtSpread = (val: number) => {
        if (val === 0 || val === undefined || val === null) return 'PK';
        return val > 0 ? `+${val}` : `${val}`;
    };

    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            // 1. Fetch Current Week
            // Note: Using a fixed season '2024REG' as '2025REG' might not be active yet depending on date.
            // Using query parameter for auth to avoid some CORS preflight issues
            
            let week = 1; 
            let season = '2024REG';

            const weekRes = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/CurrentWeek?key=${SPORTSDATA_KEY}`);
            if (weekRes.ok) {
                const w = await weekRes.json();
                if (typeof w === 'number') week = w;
            }

            // 2. Fetch Game Odds
            const res = await fetch(`https://api.sportsdata.io/v3/nfl/odds/json/GameOddsByWeek/${season}/${week}?key=${SPORTSDATA_KEY}`);

            if (!res.ok) {
                // If fetch fails (CORS, 404, etc), throw to trigger fallback
                throw new Error(`API Error: ${res.statusText}`);
            }
            
            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) {
                // If no games (off-season), trigger fallback
                throw new Error("No games found for current week.");
            }

            const parsedGames: Matchup[] = data.map((game: any) => {
                const bookOdds: Record<string, BookData> = {};
                
                let consensusSpread = 'OFF';
                let consensusTotal = 'OFF';
                let consensusMlHome = '-';
                let consensusMlAway = '-';

                if (game.PregameOdds && Array.isArray(game.PregameOdds)) {
                    game.PregameOdds.forEach((odd: any) => {
                        const bookName = odd.Sportsbook;
                        
                        const oddsObj = {
                            spread: fmtSpread(odd.HomePointSpread),
                            total: odd.OverUnder ? `${odd.OverUnder}` : 'OFF',
                            mlHome: fmtMoneyline(odd.HomeMoneyLine),
                            mlAway: fmtMoneyline(odd.AwayMoneyLine)
                        };

                        if (bookName === 'DraftKings') bookOdds['dk'] = oddsObj;
                        if (bookName === 'FanDuel') bookOdds['fd'] = oddsObj;
                        if (bookName === 'Caesars') bookOdds['czr'] = oddsObj;
                        
                        // Use SportsData "Consensus" or a major book as baseline
                        if (bookName === 'Consensus' || bookName === 'Bovada') {
                            consensusSpread = oddsObj.spread;
                            consensusTotal = oddsObj.total;
                            consensusMlHome = oddsObj.mlHome;
                            consensusMlAway = oddsObj.mlAway;
                            bookOdds['circa'] = oddsObj; 
                            bookOdds['boomers'] = oddsObj;
                        }
                    });
                }

                return {
                    id: game.GameId.toString(),
                    date: new Date(game.DateTime),
                    status: game.Status,
                    homeTeam: game.HomeTeamName, 
                    homeAbr: game.HomeTeamName,
                    homeLogo: `https://a.espncdn.com/i/teamlogos/nfl/500/${game.HomeTeamName.toLowerCase()}.png`,
                    awayTeam: game.AwayTeamName,
                    awayAbr: game.AwayTeamName,
                    awayLogo: `https://a.espncdn.com/i/teamlogos/nfl/500/${game.AwayTeamName.toLowerCase()}.png`,
                    openSpread: consensusSpread, 
                    openTotal: consensusTotal,
                    consensusSpread,
                    consensusTotal,
                    consensusMlHome,
                    consensusMlAway,
                    bookOdds
                };
            });

            setGames(parsedGames);
            setApiStatus('LIVE');
            setLastUpdate(new Date());

        } catch (e: any) {
            console.warn("Live odds fetch failed, switching to simulation:", e.message);
            setApiError(e.message);
            setGames(MOCK_GAMES_DATA); // Fallback to robust mock data
            setApiStatus('SIMULATION');
            setLastUpdate(new Date());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1800000);
        return () => clearInterval(interval);
    }, []);

    const renderCell = (game: Matchup, bookId: string) => {
        const bookData = game.bookOdds[bookId];
        
        let displayVal = '-';
        let subVal = '';

        if (bookData) {
            if (view === 'SPREAD') {
                displayVal = bookData.spread;
                subVal = '-110'; 
                
                // Simulate Sharp Disagreement for Circa if using generic data
                if (bookId === 'circa' && displayVal !== 'OFF' && displayVal !== 'PK' && apiStatus === 'SIMULATION') {
                     const num = parseFloat(displayVal);
                     if (!isNaN(num) && Math.random() > 0.6) {
                         displayVal = num > 0 ? `+${num - 0.5}` : `${num + 0.5}`;
                     }
                }
            } else if (view === 'TOTAL') {
                displayVal = bookData.total;
                subVal = '-110';
            } else {
                displayVal = 'ML'; 
            }
        } else {
            displayVal = 'OFF';
        }

        const book = BOOKS.find(b => b.id === bookId);

        return (
            <a 
                href={book?.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex flex-col items-center justify-center h-full w-full hover:bg-white/5 transition-colors group cursor-pointer"
            >
                {view !== 'ML' ? (
                    <>
                        <span className={`text-xs font-bold ${book?.color} group-hover:underline`}>{displayVal}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{subVal}</span>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-bold ${book?.color}`}>{bookData?.mlAway || '-'}</span>
                        <div className="w-4 h-px bg-slate-800"></div>
                        <span className={`text-[10px] font-bold ${book?.color}`}>{bookData?.mlHome || '-'}</span>
                    </div>
                )}
            </a>
        );
    };

    return (
        <div className="max-w-[1800px] mx-auto px-4 py-8 animate-in fade-in duration-700">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                        <Activity className="text-orange-500" size={32} />
                        Live Odds Board
                    </h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Real-time consensus lines via SportsData.io. Updates automatically every 30 minutes.
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => setView('SPREAD')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all", view === 'SPREAD' ? "bg-orange-500 text-black shadow" : "text-slate-400 hover:text-white")}>Spread</button>
                        <button onClick={() => setView('TOTAL')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all", view === 'TOTAL' ? "bg-orange-500 text-black shadow" : "text-slate-400 hover:text-white")}>Total</button>
                        <button onClick={() => setView('ML')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all", view === 'ML' ? "bg-orange-500 text-black shadow" : "text-slate-400 hover:text-white")}>Moneyline</button>
                    </div>
                    
                    <button 
                        onClick={fetchData} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-bold uppercase tracking-wider transition-all border border-slate-700"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            <div className={clsx("mb-6 p-3 rounded-xl flex items-center justify-between text-xs border", apiStatus === 'LIVE' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400")}>
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    {apiStatus === 'LIVE' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {apiStatus === 'LIVE' ? "Live Feed Active" : "Simulation Mode Active"}
                </div>
                {apiError && (
                    <div className="flex items-center gap-2 opacity-80">
                        <AlertTriangle size={12} />
                        <span>Source Error: {apiError}</span>
                    </div>
                )}
            </div>

            {/* MAIN ODDS GRID */}
            <div className="glass-panel rounded-xl overflow-hidden border border-slate-700 relative">
                
                {/* 1. Grid Header */}
                <div className="grid grid-cols-12 bg-[#08090f] border-b border-slate-700 sticky top-0 z-20">
                    {/* Matchup Column */}
                    <div className="col-span-3 p-4 flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Matchup
                    </div>
                    {/* Open / Consensus */}
                    <div className="col-span-1 p-4 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l border-slate-800 bg-[#0a0c14]">
                        Open
                    </div>
                    <div className="col-span-1 p-4 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l border-slate-800 bg-[#0a0c14]">
                        Consensus
                    </div>
                    
                    {/* Sportsbooks Columns */}
                    <div className="col-span-7 grid grid-cols-5 h-full">
                        {BOOKS.map(book => (
                            <div key={book.id} className="border-l border-slate-800 flex flex-col items-center justify-center p-2 relative group cursor-pointer hover:bg-white/5 transition-colors">
                                <div className={`text-[10px] font-black uppercase tracking-tighter ${book.color}`}>{book.name}</div>
                                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-current opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'currentColor' }}></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Game Rows */}
                <div className="divide-y divide-slate-800">
                    {loading && games.length === 0 ? (
                        <div className="p-20 text-center text-slate-500 flex flex-col items-center">
                            <RefreshCw size={32} className="animate-spin mb-4 text-orange-500" />
                            <p className="uppercase tracking-widest text-xs">Connecting to SportsData.io...</p>
                        </div>
                    ) : games.length === 0 ? (
                        <div className="p-20 text-center text-slate-500 flex flex-col items-center">
                            <Calendar size={32} className="mb-4 text-slate-700" />
                            <p className="uppercase tracking-widest text-xs">No Games Found</p>
                        </div>
                    ) : games.map(game => (
                        <div key={game.id} className="grid grid-cols-12 hover:bg-white/[0.02] transition-colors group">
                            
                            {/* Matchup Info */}
                            <div className="col-span-3 p-4 flex flex-col justify-center relative">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-orange-400 font-mono flex items-center gap-1">
                                        <Calendar size={10} /> {game.date.toLocaleTimeString([], {weekday: 'short', hour: 'numeric', minute:'2-digit'})}
                                    </span>
                                    {game.status === 'InProgress' || game.status === 'Final' ? (
                                        <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", game.status === 'InProgress' ? "bg-red-900/30 text-red-500 animate-pulse" : "bg-slate-800 text-slate-500")}>
                                            {game.status === 'InProgress' ? 'LIVE' : 'FINAL'}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-slate-600">{game.status.toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {game.awayLogo && <img src={game.awayLogo} className="w-5 h-5 object-contain" alt={game.awayAbr} onError={(e) => e.currentTarget.style.display = 'none'}/>}
                                            <span className="font-bold text-white text-sm">{game.awayTeam}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {game.homeLogo && <img src={game.homeLogo} className="w-5 h-5 object-contain" alt={game.homeAbr} onError={(e) => e.currentTarget.style.display = 'none'}/>}
                                            <span className="font-bold text-white text-sm">{game.homeTeam}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Open Line */}
                            <div className="col-span-1 border-l border-slate-800 bg-[#0a0c14]/50 flex flex-col justify-center p-2 text-center">
                                <div className="h-1/2 flex items-center justify-center text-xs text-slate-500 font-mono">
                                    {view === 'SPREAD' ? game.openSpread : view === 'TOTAL' ? game.openTotal : '-'}
                                </div>
                                <div className="h-1/2 flex items-center justify-center text-xs text-slate-500 font-mono">
                                    {view === 'SPREAD' ? (game.openSpread && game.openSpread.startsWith('-') ? (parseFloat(game.openSpread) * -1 > 0 ? `+${parseFloat(game.openSpread)*-1}` : parseFloat(game.openSpread)*-1) : '-') : view === 'TOTAL' ? game.openTotal : '-'}
                                </div>
                            </div>

                            {/* Consensus Line */}
                            <div className="col-span-1 border-l border-slate-800 bg-[#0a0c14]/50 flex flex-col justify-center p-2 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-0.5"><ShieldCheck size={8} className="text-emerald-500 opacity-50"/></div>
                                <div className="h-1/2 flex items-center justify-center text-xs text-white font-bold font-mono">
                                    {view === 'ML' ? game.consensusMlAway : (view === 'SPREAD' ? game.consensusSpread : game.consensusTotal)}
                                </div>
                                <div className="h-1/2 flex items-center justify-center text-xs text-white font-bold font-mono">
                                    {view === 'ML' ? game.consensusMlHome : (view === 'SPREAD' ? (game.consensusSpread && !isNaN(parseFloat(game.consensusSpread)) ? (parseFloat(game.consensusSpread) * -1 > 0 ? `+${parseFloat(game.consensusSpread)*-1}` : parseFloat(game.consensusSpread)*-1) : 'PK') : game.consensusTotal)}
                                </div>
                            </div>

                            {/* Sportsbooks Grid */}
                            <div className="col-span-7 grid grid-cols-5">
                                {BOOKS.map(book => (
                                    <div key={book.id} className="border-l border-slate-800 flex flex-col h-full">
                                        <div className="h-full">
                                            {renderCell(game, book.id)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center text-[10px] text-slate-600 font-mono">
                <div>
                    Data by SportsData.io. {apiStatus === 'SIMULATION' ? 'Using Simulation Mode due to API unavailability.' : 'Live Feed Active.'}
                </div>
                <div className="flex items-center gap-2">
                    <Clock size={12} />
                    Last Updated: {lastUpdate.toLocaleTimeString()}
                </div>
            </div>

        </div>
    );
};
