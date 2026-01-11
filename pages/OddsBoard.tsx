
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Clock, Activity, Calendar, ShieldCheck, AlertTriangle, Wifi, WifiOff, Sparkles, Search, CheckCircle, Zap, CheckCircle2, AlertCircle, TrendingUp, Trophy, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION ---
const SPORTSDATA_KEY = 'fecb349a85264f47b853aa08e87cc860';

type LeagueType = 'NFL' | 'NBA' | 'NHL';

interface BookData {
    spread: string;
    total: string;
    mlHome: string;
    mlAway: string;
}

interface Matchup {
    id: string;
    league: LeagueType;
    date: Date;
    homeTeam: string;
    homeAbr: string;
    homeLogo?: string;
    awayTeam: string;
    awayAbr: string;
    awayLogo?: string;
    status: string;
    openSpread?: string;
    openTotal?: string;
    consensusSpread?: string;
    consensusTotal?: string;
    consensusMlHome?: string;
    consensusMlAway?: string;
    bookOdds: Record<string, BookData>;
    // AI Verification Fields
    aiVerifiedLine?: string;
    aiVerifiedTotal?: string;
    aiStatus?: 'IDLE' | 'VERIFYING' | 'VERIFIED' | 'ERROR';
    // Compliance: Requirement to store grounding URLs from search
    aiSourceUrl?: string;
}

const MOCK_GAMES_MAP: Record<LeagueType, Matchup[]> = {
    NFL: [
        {
            id: 'mock-nfl-1', league: 'NFL',
            date: new Date(new Date().setHours(13, 0, 0, 0)),
            homeTeam: 'Kansas City', homeAbr: 'KC',
            homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
            awayTeam: 'Baltimore', awayAbr: 'BAL',
            awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
            status: 'Scheduled', openSpread: '-3.0', openTotal: '51.5',
            consensusSpread: '-3.5', consensusTotal: '52.0',
            consensusMlHome: '-175', consensusMlAway: '+150',
            bookOdds: {
                'circa': { spread: '-3.5', total: '52.0', mlHome: '-170', mlAway: '+155' },
                'boomers': { spread: '-3.0', total: '51.5', mlHome: '-175', mlAway: '+150' },
                'dk': { spread: '-3.5', total: '52.0', mlHome: '-180', mlAway: '+150' },
                'fd': { spread: '-3.5', total: '52.5', mlHome: '-178', mlAway: '+152' },
                'czr': { spread: '-3.5', total: '52.0', mlHome: '-175', mlAway: '+145' }
            }
        }
    ],
    NBA: [
        {
            id: 'mock-nba-1', league: 'NBA',
            date: new Date(new Date().setHours(19, 30, 0, 0)),
            homeTeam: 'Los Angeles Lakers', homeAbr: 'LAL',
            homeLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
            awayTeam: 'Phoenix Suns', awayAbr: 'PHX',
            awayLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png',
            status: 'Scheduled', openSpread: '-2.0', openTotal: '228.5',
            consensusSpread: '-2.5', consensusTotal: '230.0',
            consensusMlHome: '-135', consensusMlAway: '+115',
            bookOdds: {
                'circa': { spread: '-2.5', total: '230.0', mlHome: '-130', mlAway: '+110' },
                'dk': { spread: '-2.0', total: '229.5', mlHome: '-135', mlAway: '+115' },
                'fd': { spread: '-2.5', total: '230.5', mlHome: '-138', mlAway: '+118' }
            }
        }
    ],
    NHL: [
        {
            id: 'mock-nhl-1', league: 'NHL',
            date: new Date(new Date().setHours(19, 0, 0, 0)),
            homeTeam: 'Toronto Maple Leafs', homeAbr: 'TOR',
            homeLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png',
            awayTeam: 'Boston Bruins', awayAbr: 'BOS',
            awayLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png',
            status: 'Scheduled', openSpread: '-1.5', openTotal: '6.0',
            consensusSpread: '-1.5', consensusTotal: '6.5',
            consensusMlHome: '-110', consensusMlAway: '-110',
            bookOdds: {
                'circa': { spread: '-1.5', total: '6.5', mlHome: '-105', mlAway: '-115' },
                'dk': { spread: '-1.5', total: '6.0', mlHome: '-110', mlAway: '-110' },
                'fd': { spread: '-1.5', total: '6.5', mlHome: '-112', mlAway: '-108' }
            }
        }
    ]
};

const BOOKS = [
    { id: 'circa', name: 'Circa', color: 'text-indigo-400', bg: 'bg-indigo-500/10', url: 'https://www.circasports.com/' }, 
    { id: 'boomers', name: 'Boomers', color: 'text-rose-400', bg: 'bg-rose-500/10', url: 'https://www.google.com/search?q=betting+odds+boomers' },
    { id: 'dk', name: 'DraftKings', color: 'text-green-500', bg: 'bg-green-500/10', url: 'https://sportsbook.draftkings.com/' },
    { id: 'fd', name: 'FanDuel', color: 'text-blue-500', bg: 'bg-blue-500/10', url: 'https://sportsbook.fanduel.com/' },
    { id: 'czr', name: 'Caesars', color: 'text-amber-300', bg: 'bg-amber-900/40', url: 'https://caesars.com/sportsbook-and-casino' },
];

const parseVal = (str: string): number => {
    if (!str || str === 'PK' || str === 'OFF' || str === '-') return 0;
    const clean = str.replace(/[+]/g, '');
    return parseFloat(clean) || 0;
};

export const OddsBoard: React.FC = () => {
    const [activeLeague, setActiveLeague] = useState<LeagueType>('NFL');
    const [games, setGames] = useState<Matchup[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [view, setView] = useState<'SPREAD' | 'TOTAL' | 'ML'>('SPREAD');
    const [apiStatus, setApiStatus] = useState<'LIVE' | 'SIMULATION'>('LIVE');
    const [apiError, setApiError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fmtMoneyline = (val: number) => !val ? '-' : (val > 0 ? `+${val}` : `${val}`);
    const fmtSpread = (val: number) => (val === 0 || val === undefined || val === null) ? 'PK' : (val > 0 ? `+${val}` : `${val}`);

    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const leaguePath = activeLeague.toLowerCase();
            let week = 1; 
            let season = '2024REG';
            
            // Only NFL uses the currentWeek endpoint pattern usually in this API
            if (activeLeague === 'NFL') {
                const weekRes = await fetch(`https://api.sportsdata.io/v3/nfl/scores/json/CurrentWeek?key=${SPORTSDATA_KEY}`);
                if (weekRes.ok) {
                    const w = await weekRes.json();
                    if (typeof w === 'number') week = w;
                }
            } else if (activeLeague === 'NBA') {
                season = '2025'; // Approximation
            } else if (activeLeague === 'NHL') {
                season = '2025';
            }

            const res = await fetch(`https://api.sportsdata.io/v3/${leaguePath}/odds/json/GameOddsByWeek/${season}/${week}?key=${SPORTSDATA_KEY}`);
            if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) throw new Error("No games found.");

            const parsedGames: Matchup[] = data.map((game: any) => {
                const bookOdds: Record<string, BookData> = {};
                let consensusSpread = 'OFF', consensusTotal = 'OFF', consensusMlHome = '-', consensusMlAway = '-';
                if (game.PregameOdds) {
                    game.PregameOdds.forEach((odd: any) => {
                        const oddsObj = { spread: fmtSpread(odd.HomePointSpread), total: odd.OverUnder ? `${odd.OverUnder}` : 'OFF', mlHome: fmtMoneyline(odd.HomeMoneyLine), mlAway: fmtMoneyline(odd.AwayMoneyLine) };
                        if (odd.Sportsbook === 'DraftKings') bookOdds['dk'] = oddsObj;
                        if (odd.Sportsbook === 'FanDuel') bookOdds['fd'] = oddsObj;
                        if (odd.Sportsbook === 'Caesars') bookOdds['czr'] = oddsObj;
                        if (odd.Sportsbook === 'Consensus' || odd.Sportsbook === 'Bovada') {
                            consensusSpread = oddsObj.spread; consensusTotal = oddsObj.total; consensusMlHome = oddsObj.mlHome; consensusMlAway = oddsObj.mlAway;
                            bookOdds['circa'] = oddsObj; bookOdds['boomers'] = oddsObj;
                        }
                    });
                }
                return {
                    id: game.GameId.toString(),
                    league: activeLeague,
                    date: new Date(game.DateTime || Date.now()),
                    status: game.Status || 'Scheduled',
                    homeTeam: game.HomeTeamName, homeAbr: game.HomeTeamName,
                    homeLogo: `https://a.espncdn.com/i/teamlogos/${activeLeague.toLowerCase()}/500/${game.HomeTeamName.toLowerCase()}.png`,
                    awayTeam: game.AwayTeamName, awayAbr: game.AwayTeamName,
                    awayLogo: `https://a.espncdn.com/i/teamlogos/${activeLeague.toLowerCase()}/500/${game.AwayTeamName.toLowerCase()}.png`,
                    openSpread: consensusSpread, openTotal: consensusTotal, consensusSpread, consensusTotal, consensusMlHome, consensusMlAway, bookOdds,
                    aiStatus: 'IDLE'
                };
            });
            setGames(parsedGames);
            setApiStatus('LIVE');
            setLastUpdate(new Date());
        } catch (e: any) {
            setGames(MOCK_GAMES_MAP[activeLeague].map(g => ({ ...g, aiStatus: 'IDLE' })));
            setApiStatus('SIMULATION');
            setLastUpdate(new Date());
        } finally {
            setLoading(false);
        }
    };

    const runNeuralSync = async () => {
        setIsVerifying(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const updatedGames = [...games];

        for (let i = 0; i < updatedGames.length; i++) {
            const game = updatedGames[i];
            setGames(prev => prev.map((g, idx) => idx === i ? { ...g, aiStatus: 'VERIFYING' } : g));
            
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Search for the current ${game.league} betting odds for ${game.awayTeam} vs ${game.homeTeam} on ESPN or VegasInsider. 
                    Identify the current ${game.league === 'NHL' ? 'puck line' : 'spread'} and total. 
                    Format the output exactly as: SPREAD: [value] | TOTAL: [value]`,
                    config: { tools: [{ googleSearch: {} }] },
                });

                if (response.text) {
                    const text = response.text;
                    const spreadMatch = text.match(/SPREAD:\s*([^|]+)/i);
                    const totalMatch = text.match(/TOTAL:\s*(.+)/i);
                    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                    const sourceUrl = (groundingChunks as any)?.[0]?.web?.uri;

                    updatedGames[i] = { 
                        ...game, 
                        aiVerifiedLine: spreadMatch ? spreadMatch[1].trim() : 'N/A', 
                        aiVerifiedTotal: totalMatch ? totalMatch[1].trim() : 'N/A', 
                        aiSourceUrl: sourceUrl,
                        aiStatus: 'VERIFIED' 
                    };
                }
            } catch (err) {
                console.error("AI Sync Error:", err);
                updatedGames[i] = { ...game, aiStatus: 'ERROR' };
            }
            setGames([...updatedGames]);
        }
        setIsVerifying(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeLeague]);

    const filteredGames = useMemo(() => {
        return games.filter(game => 
            game.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) || 
            game.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
            game.homeAbr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            game.awayAbr.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [games, searchTerm]);

    const renderCell = (game: Matchup, bookId: string) => {
        const bookData = game.bookOdds[bookId];
        let displayVal = '-', subVal = '';
        let isBetter = false;
        let isMatch = false;

        if (bookData) {
            if (view === 'SPREAD') { 
                displayVal = bookData.spread; 
                subVal = '-110'; 
                if (game.aiStatus === 'VERIFIED' && game.aiVerifiedLine) {
                    const bv = parseVal(bookData.spread);
                    const av = parseVal(game.aiVerifiedLine);
                    if (bv === av) isMatch = true;
                    else if (bv > av) isBetter = true;
                }
            }
            else if (view === 'TOTAL') { 
                displayVal = bookData.total; 
                subVal = '-110'; 
                if (game.aiStatus === 'VERIFIED' && game.aiVerifiedTotal) {
                    const bv = parseVal(bookData.total);
                    const av = parseVal(game.aiVerifiedTotal);
                    if (bv === av) isMatch = true;
                    else if (Math.abs(bv - av) >= 0.5) isBetter = true;
                }
            }
            else displayVal = 'ML';
        } else displayVal = 'OFF';

        const book = BOOKS.find(b => b.id === bookId);
        
        return (
            <div className={clsx(
                "flex flex-col items-center justify-center h-full w-full transition-all border-r border-slate-800/30 last:border-0 relative overflow-hidden group",
                isBetter && "bg-emerald-500/5 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]"
            )}>
                {isBetter && (
                    <div className="absolute top-0 right-0 p-0.5" title="Better Odds Found">
                        <TrendingUp size={8} className="text-emerald-400" />
                    </div>
                )}
                {view !== 'ML' ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className={clsx(
                                "text-xs font-bold transition-colors", 
                                isBetter ? "text-emerald-400" : (isMatch ? "text-cyan-400" : book?.color)
                            )}>
                                {displayVal}
                            </span>
                            {isMatch && <CheckCircle size={8} className="text-cyan-500" />}
                            {book?.url && book.url !== '#' && (
                                <a 
                                    href={book.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-1 hover:bg-white/10 rounded transition-all text-slate-600 hover:text-white"
                                    title={`Visit ${book.name}`}
                                >
                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">{subVal}</span>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold ${book?.color}`}>{bookData?.mlAway || '-'}</span>
                            {book?.url && book.url !== '#' && (
                                <a 
                                    href={book.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-1 hover:bg-white/10 rounded transition-all text-slate-600 hover:text-white"
                                    title={`Visit ${book.name}`}
                                >
                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                        <div className="w-4 h-px bg-slate-800"></div>
                        <span className={`text-[10px] font-bold ${book?.color}`}>{bookData?.mlHome || '-'}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-[1800px] mx-auto px-4 py-8 animate-in fade-in duration-700">
            
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
                        <Activity className="text-orange-500" size={32} />
                        Global Odds Board
                    </h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Cross-league market verification engine targeting price dislocations in {activeLeague}.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    {/* LEAGUE SELECTOR */}
                    <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 shadow-2xl">
                        {(['NFL', 'NBA', 'NHL'] as LeagueType[]).map(l => (
                            <button
                                key={l}
                                onClick={() => setActiveLeague(l)}
                                className={clsx(
                                    "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                    activeLeague === l ? "bg-orange-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    <div className="relative group w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder="Filter Matchups..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
                        />
                    </div>

                    <button 
                        onClick={runNeuralSync}
                        disabled={isVerifying || loading}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2 bg-cyan-900/40 border border-cyan-500/50 rounded-lg text-cyan-400 text-xs font-black uppercase tracking-widest transition-all hover:bg-cyan-500 hover:text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]",
                            isVerifying && "animate-pulse brightness-125"
                        )}
                    >
                        <Sparkles size={16} className={isVerifying ? "animate-spin" : ""} />
                        Neural Sync
                    </button>

                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button onClick={() => setView('SPREAD')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all", view === 'SPREAD' ? "bg-orange-500 text-black shadow" : "text-slate-400 hover:text-white")}>
                            {activeLeague === 'NHL' ? 'Puck Line' : 'Spread'}
                        </button>
                        <button onClick={() => setView('TOTAL')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all", view === 'TOTAL' ? "bg-orange-500 text-black shadow" : "text-slate-400 hover:text-white")}>Total</button>
                        <button onClick={() => setView('ML')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all", view === 'ML' ? "bg-orange-500 text-black shadow" : "text-slate-400 hover:text-white")}>Moneyline</button>
                    </div>
                </div>
            </div>

            <div className={clsx("mb-6 p-3 rounded-xl flex items-center justify-between text-xs border", apiStatus === 'LIVE' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400")}>
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    {apiStatus === 'LIVE' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {activeLeague} Market Hub: {apiStatus}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><TrendingUp size={12} className="text-emerald-400"/><span className="text-slate-500">Value Opportunity</span></div>
                    <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-cyan-400"/><span className="text-slate-500">Neural Match</span></div>
                </div>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-slate-700 relative shadow-2xl">
                <div className="grid grid-cols-12 bg-[#08090f] border-b border-slate-700 sticky top-0 z-20">
                    <div className="col-span-3 p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{activeLeague} Matchup</div>
                    <div className="col-span-1 p-4 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase border-l border-slate-800">Open</div>
                    <div className="col-span-1 p-4 flex items-center justify-center text-[10px] font-bold text-cyan-500 uppercase border-l border-slate-800 bg-cyan-950/20">Neural Check</div>
                    <div className="col-span-1 p-4 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase border-l border-slate-800">Consensus</div>
                    <div className="col-span-6 grid grid-cols-5 h-full">
                        {BOOKS.map(book => (
                            <div key={book.id} className="border-l border-slate-800 flex flex-col items-center justify-center p-2"><div className={`text-[9px] font-black uppercase ${book.color}`}>{book.name}</div></div>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-slate-800">
                    {filteredGames.length > 0 ? (
                        filteredGames.map(game => (
                            <div key={game.id} className="grid grid-cols-12 hover:bg-white/[0.02] transition-colors relative group/row">
                                <div className="col-span-3 p-4 flex flex-col justify-center">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-orange-400 font-mono flex items-center gap-1"><Calendar size={10} /> {game.date.toLocaleTimeString([], {weekday: 'short', hour: 'numeric', minute:'2-digit'})}</span>
                                        {game.aiStatus === 'VERIFIED' && (
                                            <div className="flex items-center gap-1 text-emerald-400 text-[9px] font-black uppercase animate-in fade-in slide-in-from-right-2">
                                                <CheckCircle2 size={10}/> Sync OK
                                            </div>
                                        )}
                                        {game.aiStatus === 'ERROR' && (
                                            <div className="flex items-center gap-1 text-rose-500 text-[9px] font-black uppercase animate-in fade-in slide-in-from-right-2">
                                                <AlertCircle size={10}/> Sync Error
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 transition-transform group-hover/row:translate-x-1 duration-300"><img src={game.awayLogo} className="w-5 h-5" alt="" onError={(e) => e.currentTarget.src = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png'}/><span className="font-bold text-white text-sm">{game.awayTeam}</span></div>
                                        <div className="flex items-center gap-2 transition-transform group-hover/row:translate-x-1 duration-300"><img src={game.homeLogo} className="w-5 h-5" alt="" onError={(e) => e.currentTarget.src = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png'}/><span className="font-bold text-white text-sm">{game.homeTeam}</span></div>
                                    </div>
                                </div>

                                <div className="col-span-1 border-l border-slate-800 bg-black/20 flex flex-col justify-center p-2 text-center text-[10px] text-slate-500 font-mono">
                                    <div>{view === 'SPREAD' ? game.openSpread : game.openTotal}</div>
                                </div>

                                <div className={clsx(
                                    "col-span-1 border-l border-slate-800 flex flex-col justify-center p-2 text-center relative",
                                    game.aiStatus === 'VERIFIED' ? "bg-emerald-950/10" : (game.aiStatus === 'ERROR' ? "bg-rose-950/10" : "bg-cyan-950/10")
                                )}>
                                    {game.aiStatus === 'VERIFYING' ? (
                                        <RefreshCw size={14} className="animate-spin text-cyan-500 mx-auto" />
                                    ) : game.aiStatus === 'VERIFIED' ? (
                                        <div className="animate-in zoom-in duration-300">
                                            <div className="text-xs font-black text-emerald-400 font-mono">{view === 'SPREAD' ? game.aiVerifiedLine : game.aiVerifiedTotal}</div>
                                            <div className="text-[8px] text-emerald-600 uppercase font-bold mt-1">Scraped</div>
                                        </div>
                                    ) : game.aiStatus === 'ERROR' ? (
                                        <div className="animate-in zoom-in duration-300 text-rose-500 flex flex-col items-center">
                                            <AlertCircle size={14} className="mb-1" />
                                            <div className="text-[8px] uppercase font-black">Sync Failure</div>
                                        </div>
                                    ) : <div className="text-[9px] text-slate-700 italic">--</div>}
                                </div>

                                <div className="col-span-1 border-l border-slate-800 bg-black/20 flex flex-col justify-center p-2 text-center relative">
                                    <div className="h-1/2 flex items-center justify-center text-xs text-white font-bold font-mono">
                                        {view === 'ML' ? game.consensusMlAway : (view === 'SPREAD' ? game.consensusSpread : game.consensusTotal)}
                                    </div>
                                    <div className="h-1/2 flex items-center justify-center text-xs text-white font-bold font-mono">
                                        {view === 'ML' ? game.consensusMlHome : (view === 'SPREAD' ? (game.consensusSpread && !isNaN(parseFloat(game.consensusSpread)) ? (parseFloat(game.consensusSpread) * -1 > 0 ? `+${parseFloat(game.consensusSpread)*-1}` : 'PK') : 'PK') : game.consensusTotal)}
                                    </div>
                                </div>

                                <div className="col-span-6 grid grid-cols-5">
                                    {BOOKS.map(book => (<div key={book.id} className="border-l border-slate-800 flex flex-col h-full">{renderCell(game, book.id)}</div>))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-slate-500 bg-slate-900/50">
                            <Search size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-sm">No {activeLeague} Matchups Available</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center text-[10px] text-slate-600 font-mono">
                <div>Source: SportsData.io API // Verified via Gemini 3.0 Flash</div>
                <div className="flex items-center gap-2"><Clock size={12} /> Sync Time: {lastUpdate.toLocaleTimeString()}</div>
            </div>
        </div>
    );
};
