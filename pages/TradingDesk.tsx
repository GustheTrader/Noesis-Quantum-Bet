
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Radio, Play, Pause, Power, Crosshair, BarChart3, Clock, AlertTriangle, ArrowUp, ArrowDown, Wifi, DollarSign, Bot, MousePointerClick, RefreshCw, Layers, Zap, TrendingUp, Search, Filter, Split, LineChart, Eye, EyeOff, List, ZoomIn, ZoomOut } from 'lucide-react';
import { clsx } from 'clsx';

// PROFESSIONAL MARKET DATA TYPES
interface MarketTicker {
    id: string;
    league: 'NFL' | 'NBA' | 'MLB';
    symbol: string;
    description: string;
    type: 'SPREAD' | 'TOTAL' | 'MONEYLINE' | 'PROP';
    bid: number;
    ask: number;
    last: number;
    spread?: number;
    clv: number; // Closing Line Value (Fair Price)
    edge: number; // Discrepancy %
    volatility: number;
    sentiment: number; // -1 to 1
    volume: number;
    change: number; // 24h change
}

interface Trade {
    id: string;
    time: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    amount: number;
    status: 'FILLED' | 'PENDING';
    pnl?: number;
}

interface TradingDeskProps {
    onClose?: () => void;
}

// --- CHART SUB-COMPONENT FOR REUSABILITY & AXES ---
const ChartViz: React.FC<{
    dataSeed: number;
    color: string;
    label: string;
    price: number;
    volatility: number;
    timeScale: number; // 1 = Normal, 2 = Zoomed In, 0.5 = Zoomed Out
    isMacro?: boolean;
}> = ({ dataSeed, color, label, price, volatility, timeScale, isMacro }) => {
    const [path, setPath] = useState('');
    const [yAxisLabels, setYAxisLabels] = useState<number[]>([]);
    const [xAxisLabels, setXAxisLabels] = useState<string[]>([]);
    
    // Generate simulated data points on render/update
    useEffect(() => {
        const width = 1000; // Internal SVG coordinate width
        const height = 300; // Internal SVG coordinate height
        const points: [number, number][] = [];
        
        // Dynamic Range Calculation
        const range = price * (volatility * (isMacro ? 4 : 1)); // Macro shows wider range
        const maxPrice = price + range;
        const minPrice = price - range;
        
        setYAxisLabels([maxPrice, price, minPrice]);

        // Time Labels
        const now = new Date();
        const timeStep = isMacro ? 15 : 1; // 15min vs 1min
        const labels = [];
        for(let i=0; i<4; i++) {
            const t = new Date(now.getTime() - (i * timeStep * 60000) / timeScale);
            labels.push(t.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second: isMacro ? undefined : '2-digit' }));
        }
        setXAxisLabels(labels.reverse());

        // Generate Path Points
        const steps = 100 * timeScale; 
        const stepWidth = width / steps;

        for (let i = 0; i <= steps; i++) {
            const x = i * stepWidth;
            
            // Simulating price movement with sine waves + noise
            const noise = (Math.sin(i * 0.1 + dataSeed) * Math.cos(i * 0.05)) * (range * 0.8);
            const trend = isMacro ? Math.sin(i * 0.02) * (range * 0.5) : 0;
            const simulatedPrice = price + noise + trend;
            
            // Normalize to Y coord (0 is top, height is bottom)
            const normalizedY = height - ((simulatedPrice - minPrice) / (maxPrice - minPrice)) * height;
            
            // Clamp
            const clampedY = Math.max(10, Math.min(height - 10, normalizedY));
            points.push([x, clampedY]);
        }

        // Construct SVG Path d attribute
        if (points.length > 0) {
            const d = `M ${points[0][0]},${points[0][1]} ` + points.map(p => `L ${p[0]},${p[1]}`).join(' ');
            setPath(d);
        }

    }, [dataSeed, price, volatility, timeScale, isMacro]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#050505]">
            {/* Label Badge */}
            <div className={`absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] font-bold border z-10 ${color === '#10b981' ? 'text-emerald-400 border-emerald-900/30' : 'text-rose-400 border-rose-900/30'}`}>
                {label}
            </div>

            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                {/* Grid Lines (Y) */}
                <line x1="0" y1="10" x2="1000" y2="10" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="150" x2="1000" y2="150" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="290" x2="1000" y2="290" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

                {/* Grid Lines (X) */}
                <line x1="250" y1="0" x2="250" y2="300" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="500" y1="0" x2="500" y2="300" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="750" y1="0" x2="750" y2="300" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

                {/* The Chart Line */}
                <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Y-Axis Labels (Right Side) */}
            <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-2 px-1 bg-black/40 text-[9px] font-mono text-slate-500 pointer-events-none text-right">
                {yAxisLabels.map((p, i) => (
                    <span key={i}>{p.toFixed(0)}</span>
                ))}
            </div>

            {/* X-Axis Labels (Bottom) */}
            <div className="absolute left-0 bottom-0 right-0 flex justify-between px-4 pb-1 text-[9px] font-mono text-slate-600 pointer-events-none">
                {xAxisLabels.map((t, i) => (
                    <span key={i}>{t}</span>
                ))}
            </div>
        </div>
    );
};


export const TradingDesk: React.FC<TradingDeskProps> = ({ onClose }) => {
    const [mode, setMode] = useState<'TITL' | 'AGENT'>('TITL');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [markets, setMarkets] = useState<MarketTicker[]>([]);
    const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
    const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
    const [pnl, setPnl] = useState(0);
    const [equityHistory, setEquityHistory] = useState<number[]>([0]);
    const [openPositions, setOpenPositions] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPnl, setShowPnl] = useState(true);
    
    // Execution State
    const [orderSize, setOrderSize] = useState(100);
    
    // Zoom State
    const [timeScale, setTimeScale] = useState(1);

    // Agent State
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const agentIntervalRef = useRef<any>(null);

    // Derived State for Safety
    const selectedMarket = markets.find(m => m.id === selectedMarketId);

    // --- DATA GENERATOR ---
    useEffect(() => {
        const generateMarkets = (): MarketTicker[] => {
            const tickers: MarketTicker[] = [
                // NFL Spreads
                { id: 'm1', league: 'NFL', symbol: 'KC -3.5', description: 'Chiefs vs Ravens', type: 'SPREAD', bid: -110, ask: -108, last: -109, spread: 3.5, clv: -115, edge: 2.4, volatility: 0.05, sentiment: 0.6, volume: 8500, change: 0.5 },
                { id: 'm2', league: 'NFL', symbol: 'BAL +3.5', description: 'Chiefs vs Ravens', type: 'SPREAD', bid: -112, ask: -110, last: -111, spread: 3.5, clv: -105, edge: -1.2, volatility: 0.05, sentiment: -0.4, volume: 8200, change: -0.2 },
                { id: 'm3', league: 'NFL', symbol: 'SF -4.0', description: '49ers vs Rams', type: 'SPREAD', bid: -115, ask: -112, last: -114, spread: 4.0, clv: -118, edge: 1.1, volatility: 0.08, sentiment: 0.1, volume: 6400, change: 1.2 },
                { id: 'm4', league: 'NFL', symbol: 'DET -6.5', description: 'Lions vs Bears', type: 'SPREAD', bid: -108, ask: -105, last: -106, spread: 6.5, clv: -110, edge: 0.8, volatility: 0.1, sentiment: 0.7, volume: 5100, change: 0.8 },
                { id: 'm5', league: 'NFL', symbol: 'PHI -2.5', description: 'Eagles vs Cowboys', type: 'SPREAD', bid: -115, ask: -110, last: -112, spread: 2.5, clv: -115, edge: 0.0, volatility: 0.12, sentiment: 0.2, volume: 9200, change: -0.5 },
                
                // NFL Totals
                { id: 'm6', league: 'NFL', symbol: 'KC/BAL o51.5', description: 'Total Points', type: 'TOTAL', bid: -110, ask: -110, last: -110, clv: -112, edge: 0.5, volatility: 0.02, sentiment: 0.1, volume: 4300, change: 0 },
                { id: 'm7', league: 'NFL', symbol: 'SF/LAR u44.5', description: 'Total Points', type: 'TOTAL', bid: -105, ask: -102, last: -103, clv: -108, edge: 1.8, volatility: 0.03, sentiment: -0.3, volume: 3100, change: -1.5 },

                // NBA
                { id: 'm8', league: 'NBA', symbol: 'LAL -5.5', description: 'Lakers vs Suns', type: 'SPREAD', bid: -110, ask: -110, last: -110, spread: 5.5, clv: -113, edge: 0.9, volatility: 0.15, sentiment: 0.4, volume: 2200, change: 2.1 },
                { id: 'm9', league: 'NBA', symbol: 'GSW +2.0', description: 'Warriors vs Kings', type: 'SPREAD', bid: -108, ask: -105, last: -106, spread: 2.0, clv: -105, edge: -0.5, volatility: 0.2, sentiment: 0.2, volume: 2800, change: 0.4 },
                { id: 'm10', league: 'NBA', symbol: 'BOS -8.5', description: 'Celtics vs Heat', type: 'SPREAD', bid: -112, ask: -108, last: -110, spread: 8.5, clv: -115, edge: 1.5, volatility: 0.1, sentiment: 0.8, volume: 3500, change: 1.1 },

                // Props (High Volatility)
                { id: 'm11', league: 'NFL', symbol: 'J.Allen o255.5', description: 'Pass Yards', type: 'PROP', bid: -115, ask: -112, last: -114, clv: -125, edge: 4.2, volatility: 0.3, sentiment: 0.8, volume: 1500, change: 3.5 },
                { id: 'm12', league: 'NFL', symbol: 'C.McCaffrey TD', description: 'Anytime TD', type: 'PROP', bid: -150, ask: -140, last: -145, clv: -160, edge: 5.1, volatility: 0.05, sentiment: 0.9, volume: 1800, change: 0.1 },
                { id: 'm13', league: 'NFL', symbol: 'T.Hill o80.5', description: 'Rec Yards', type: 'PROP', bid: -114, ask: -114, last: -114, clv: -114, edge: 0.0, volatility: 0.2, sentiment: 0.5, volume: 1200, change: 0 },
                { id: 'm14', league: 'NBA', symbol: 'L.James o24.5', description: 'Points', type: 'PROP', bid: -118, ask: -112, last: -115, clv: -122, edge: 1.9, volatility: 0.25, sentiment: 0.6, volume: 900, change: 1.2 },
                { id: 'm15', league: 'NBA', symbol: 'S.Curry 4+ 3PM', description: 'Threes Made', type: 'PROP', bid: -140, ask: -130, last: -135, clv: -145, edge: 3.5, volatility: 0.2, sentiment: 0.7, volume: 1100, change: 0.5 },
            ];
            return tickers;
        };
        
        const initialMarkets = generateMarkets();
        setMarkets(initialMarkets);
        setSelectedMarketId(initialMarkets[0].id); // Select first market immediately

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        // Advanced Simulation Loop (Random Walk)
        const simInterval = setInterval(() => {
            setMarkets(prev => prev.map(m => {
                // Determine movement magnitude based on volatility
                const moveProb = Math.random();
                if (moveProb > 0.7) { // 30% chance to move
                    const direction = Math.random() > 0.5 ? 1 : -1;
                    const magnitude = Math.floor(Math.random() * 3) + 1; // 1-3 pts
                    
                    let newBid = m.bid + (direction * magnitude);
                    // Ensure spreads don't cross zero weirdly for American odds (simplified)
                    if (newBid > -100 && newBid < 100) newBid = 100;

                    const spreadWidth = Math.abs(m.bid - m.ask);
                    const newAsk = newBid + (spreadWidth > 0 ? spreadWidth : 2); // Maintain spread
                    
                    return {
                        ...m,
                        bid: newBid,
                        ask: newAsk,
                        last: Math.round((newBid + newAsk) / 2),
                        volume: m.volume + Math.floor(Math.random() * 50), // Add volume
                        change: parseFloat((m.change + (direction * 0.1)).toFixed(2))
                    };
                }
                return m;
            }));
        }, 1200);

        return () => {
            clearInterval(timer);
            clearInterval(simInterval);
            if (agentIntervalRef.current) clearInterval(agentIntervalRef.current);
        };
    }, []);

    // Agent Logic
    useEffect(() => {
        if (mode === 'AGENT' && isAgentRunning && markets.length > 0) {
            agentIntervalRef.current = setInterval(() => {
                const target = markets[Math.floor(Math.random() * markets.length)];
                if (target.edge > 1.5) { // Agent only trades +1.5% Edge
                    executeTrade(target, 'BUY', 100);
                }
            }, 1500);
        } else {
            if (agentIntervalRef.current) clearInterval(agentIntervalRef.current);
        }
    }, [mode, isAgentRunning, markets]);

    const executeTrade = (market: MarketTicker, side: 'BUY' | 'SELL', amount: number) => {
        const price = side === 'BUY' ? market.ask : market.bid;
        const newTrade: Trade = {
            id: `trd-${Date.now()}`,
            time: new Date().toLocaleTimeString([], { hour12: false }),
            symbol: market.symbol,
            side,
            price,
            amount,
            status: 'FILLED'
        };
        
        setRecentTrades(prev => [newTrade, ...prev].slice(0, 100));
        setOpenPositions(prev => prev + (side === 'BUY' ? 1 : -1));
        
        // Sim PnL Impact & Equity Curve Update
        // Simulated volatility impact relative to trade size
        const volatilityFactor = market.volatility || 0.05; 
        // Random walk simulation for PnL: -1.5% to +2.5% variation scaled by amount
        // Bias slightly negative to simulate spread/vig unless edge is high
        const edgeBias = market.edge / 100;
        const randomReturn = ((Math.random() * 0.08) - 0.045) + (edgeBias * 0.1); 
        
        const impact = amount * randomReturn;

        setPnl(prev => {
            const newPnl = prev + impact;
            setEquityHistory(h => [...h, newPnl].slice(-50)); // Keep last 50 points
            return newPnl;
        });
    };

    const handleManualExec = (side: 'BUY' | 'SELL') => {
        if (selectedMarket) executeTrade(selectedMarket, side, orderSize);
    };

    const filteredMarkets = markets.filter(m => 
        m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.league.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExit = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        if (onClose) onClose();
    };

    // Helper for Equity Curve Path
    const generateEquityPath = (data: number[], width: number, height: number) => {
        if (data.length < 2) return `M0,${height/2} L${width},${height/2}`;
        
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        
        const stepX = width / (data.length - 1);
        
        return data.map((val, idx) => {
            const x = idx * stepX;
            // Normalize y: 0 at top, height at bottom
            const normalizedY = height - ((val - min) / range) * height; 
            // Add padding so it doesn't touch edges perfectly
            const paddedY = normalizedY * 0.8 + height * 0.1;
            return `${idx === 0 ? 'M' : 'L'}${x},${paddedY}`;
        }).join(' ');
    };

    return (
        <div className="h-screen w-full bg-[#0b0e14] text-slate-200 overflow-hidden flex flex-col font-mono selection:bg-cyan-500/30 text-xs">
            
            {/* 1. TOP GLOBAL TICKER */}
            <div className="h-8 bg-gradient-to-r from-[#020617] via-[#0f172a] to-[#020617] border-b border-indigo-500/20 flex items-center gap-6 px-4 overflow-hidden whitespace-nowrap shadow-lg z-20">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Activity size={12} /> SYSTEM ONLINE
                </div>
                {markets.slice(0, 8).map(m => (
                    <div key={`tick-${m.id}`} className="flex items-center gap-2 opacity-70">
                        <span className="text-slate-400">{m.symbol}</span>
                        <span className={m.change >= 0 ? "text-emerald-500" : "text-rose-500"}>
                            {m.last} ({m.change > 0 ? '+' : ''}{m.change}%)
                        </span>
                    </div>
                ))}
            </div>

            {/* 2. MAIN TOOLBAR */}
            <header className="h-14 bg-gradient-to-r from-[#020617] via-[#0f172a] to-[#020617] border-b border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-xl z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center rounded text-white font-black text-lg border border-cyan-400/30">Q</div>
                        <div>
                            <div className="font-bold text-white tracking-widest text-sm">QUANTUM<span className="text-cyan-400">DESK</span></div>
                            <div className="text-[10px] text-slate-500">PRO TERMINAL v2.1</div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-800/50"></div>

                    {/* SEARCH */}
                    <div className="relative group w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search Markets (NFL, NBA...)" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#050505]/60 border border-slate-700/50 rounded pl-9 pr-4 py-1.5 focus:border-cyan-500/50 focus:outline-none transition-colors text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <div className="flex bg-[#050505]/50 rounded p-0.5 border border-slate-700/50">
                        <button 
                            onClick={() => { setMode('TITL'); setIsAgentRunning(false); }}
                            className={clsx("flex items-center gap-2 px-4 py-1.5 font-bold uppercase rounded transition-all", mode === 'TITL' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-white")}
                        >
                            <MousePointerClick size={12} />
                            TITL
                        </button>
                        <button 
                            onClick={() => setMode('AGENT')}
                            className={clsx("flex items-center gap-2 px-4 py-1.5 font-bold uppercase rounded transition-all", mode === 'AGENT' ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]" : "text-slate-500 hover:text-white")}
                        >
                            <Bot size={12} />
                            AGENT
                        </button>
                    </div>

                    <div className="text-right">
                        <div className="text-slate-400 font-bold">{currentTime.toLocaleTimeString()}</div>
                        <div className="text-[10px] text-slate-600">UTC-5 EST</div>
                    </div>

                    <div className="h-8 w-px bg-slate-800 mx-2"></div>

                    <button 
                        onClick={handleExit}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-rose-950/10 border border-rose-900/50 hover:bg-rose-900 hover:border-rose-500 rounded text-rose-500 hover:text-white transition-all"
                        title="Exit Trading Desk"
                    >
                        <Power size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">EXIT</span>
                    </button>
                </div>
            </header>

            {/* 3. WORKSPACE GRID */}
            <div className="flex-grow flex overflow-hidden">
                
                {/* A. MARKET SCREENER & ANALYTICS (LEFT) */}
                <div className="w-[450px] border-r border-slate-800 flex flex-col bg-[#0b0e14]">
                    
                    {/* Headers */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase bg-[#08090f]">
                        <div className="col-span-4">Instrument</div>
                        <div className="col-span-2 text-center">Bid</div>
                        <div className="col-span-2 text-center">Ask</div>
                        <div className="col-span-2 text-center">CLV</div>
                        <div className="col-span-2 text-right">Edge</div>
                    </div>

                    {/* Screener List (Flex Grow) */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar border-b border-slate-800">
                        {filteredMarkets.map(m => (
                            <div 
                                key={m.id}
                                onClick={() => setSelectedMarketId(m.id)}
                                className={clsx(
                                    "grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800/30 cursor-pointer hover:bg-white/5 transition-colors items-center group",
                                    selectedMarketId === m.id ? "bg-cyan-900/10 border-l-2 border-l-cyan-500 pl-[10px]" : "border-l-2 border-l-transparent pl-[10px]"
                                )}
                            >
                                {/* Symbol */}
                                <div className="col-span-4 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={clsx("text-[9px] px-1 rounded font-bold", m.league === 'NFL' ? 'bg-blue-900/50 text-blue-400' : m.league === 'NBA' ? 'bg-orange-900/50 text-orange-400' : 'bg-slate-700 text-slate-300')}>
                                            {m.league}
                                        </span>
                                        <span className="font-bold text-slate-200 truncate">{m.symbol}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">{m.description}</div>
                                </div>

                                {/* Quotes */}
                                <div className="col-span-2 text-center font-mono text-emerald-400">{m.bid}</div>
                                <div className="col-span-2 text-center font-mono text-rose-400">{m.ask}</div>
                                
                                {/* CLV */}
                                <div className="col-span-2 text-center font-mono text-slate-400 opacity-70">{m.clv}</div>

                                {/* Edge */}
                                <div className="col-span-2 text-right">
                                    <div className={clsx("inline-block px-1.5 py-0.5 rounded font-bold text-[10px]", m.edge > 1.5 ? "bg-emerald-500 text-black" : m.edge > 0 ? "bg-emerald-900/30 text-emerald-500" : "text-slate-600")}>
                                        {m.edge > 0 ? '+' : ''}{m.edge}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* EQUITY CURVE (Performance Card) */}
                    <div className="h-48 bg-[#050505] p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <LineChart size={14} className="text-emerald-500" />
                                Session Performance
                            </div>
                            <div className={clsx("font-black font-mono", pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {pnl >= 0 ? '+' : ''}{((pnl / 10000) * 100).toFixed(2)}% ROI
                            </div>
                        </div>
                        <div className="flex-grow bg-slate-900/30 rounded border border-slate-800 relative overflow-hidden">
                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                <path 
                                    d={generateEquityPath(equityHistory, 400, 100)}
                                    fill="none"
                                    stroke={pnl >= 0 ? "#10b981" : "#f43f5e"}
                                    strokeWidth="2"
                                />
                                {/* Fill gradient area under curve */}
                                <path 
                                    d={`${generateEquityPath(equityHistory, 400, 100)} L400,150 L0,150 Z`}
                                    fill={pnl >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)"}
                                    stroke="none"
                                />
                            </svg>
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-mono">
                            <span>09:30 EST</span>
                            <span>LIVE</span>
                        </div>
                    </div>
                </div>

                {/* B. EXECUTION DECK (CENTER) - SPLIT VIEW WITH HISTORICAL CONTEXT */}
                <div className="flex-grow flex flex-col bg-[#050505] relative">
                    
                    {/* Header */}
                    <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#080808]">
                         <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                {selectedMarket?.symbol || "LOADING..."}
                                <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{selectedMarket?.description || "Market Data"}</span>
                            </h2>
                         </div>
                         <div className="flex gap-4 items-center">
                             <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
                                <button onClick={() => setTimeScale(Math.max(0.5, timeScale - 0.5))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Zoom Out"><ZoomOut size={14}/></button>
                                <span className="text-[10px] font-mono w-8 text-center text-slate-500">{timeScale}x</span>
                                <button onClick={() => setTimeScale(Math.min(4, timeScale + 0.5))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Zoom In"><ZoomIn size={14}/></button>
                             </div>
                             <div className="h-6 w-px bg-slate-800"></div>
                             <div>
                                 <div className="text-[10px] text-slate-500 uppercase">24h Vol</div>
                                 <div className="text-white font-mono">{selectedMarket?.volume.toLocaleString() || "---"}</div>
                             </div>
                             <div>
                                 <div className="text-[10px] text-slate-500 uppercase">Volatility</div>
                                 <div className={clsx("text-white font-mono", (selectedMarket?.volatility || 0) > 0.5 ? "text-rose-400" : "text-emerald-400")}>
                                     {((selectedMarket?.volatility || 0) * 100).toFixed(0)}%
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* DUAL CHART AREA - SPLIT VIEW WITH MACRO/MICRO */}
                    <div className="flex-grow flex flex-col relative border-b border-slate-800">
                         
                         {/* TOP ROW: PRIMARY LEG (LONG) - 50% Height */}
                         <div className="h-[50%] flex border-b border-slate-800/50 bg-[#060606]">
                             {/* Macro Chart (1H) */}
                             <div className="w-1/3 border-r border-slate-800 relative bg-[#040404]">
                                <ChartViz 
                                    dataSeed={100} 
                                    color="#10b981" 
                                    label="MACRO (1H)" 
                                    price={selectedMarket?.last || 100} 
                                    volatility={selectedMarket?.volatility || 0.1}
                                    timeScale={timeScale}
                                    isMacro={true}
                                />
                             </div>
                             {/* Micro Chart (Live) */}
                             <div className="flex-1 relative">
                                <ChartViz 
                                    dataSeed={200} 
                                    color="#10b981" 
                                    label={`LEG A: ${selectedMarket?.symbol} (LONG)`} 
                                    price={selectedMarket?.last || 100} 
                                    volatility={selectedMarket?.volatility || 0.1}
                                    timeScale={timeScale}
                                />
                             </div>
                         </div>

                         {/* BOTTOM ROW: SECONDARY LEG (HEDGE) - 50% Height */}
                         <div className="h-[50%] flex bg-[#060606]">
                             {/* Macro Chart (1H) */}
                             <div className="w-1/3 border-r border-slate-800 relative bg-[#040404]">
                                 <ChartViz 
                                    dataSeed={300} 
                                    color="#f43f5e" 
                                    label="MACRO (1H)" 
                                    price={(selectedMarket?.last || 100) - 2} 
                                    volatility={selectedMarket?.volatility || 0.1}
                                    timeScale={timeScale}
                                    isMacro={true}
                                />
                             </div>
                             {/* Micro Chart (Live) */}
                             <div className="flex-1 relative">
                                <ChartViz 
                                    dataSeed={400} 
                                    color="#f43f5e" 
                                    label="LEG B: HEDGE / SHORT" 
                                    price={(selectedMarket?.last || 100) - 2} 
                                    volatility={selectedMarket?.volatility || 0.1}
                                    timeScale={timeScale}
                                />
                             </div>
                         </div>

                         {/* Agent Overlay */}
                         {mode === 'AGENT' && (
                             <div className="absolute top-4 right-4 bg-black/80 border border-purple-500/50 p-4 rounded-xl backdrop-blur-md w-64 shadow-2xl z-20">
                                 <div className="flex justify-between items-center mb-4">
                                     <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-xs">
                                         <Bot size={14} className={isAgentRunning ? "animate-bounce" : ""} />
                                         Auto-Trader
                                     </div>
                                     <div className={clsx("w-2 h-2 rounded-full", isAgentRunning ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" : "bg-rose-500")}></div>
                                 </div>
                                 <button 
                                    onClick={() => setIsAgentRunning(!isAgentRunning)}
                                    className={clsx("w-full py-2 rounded font-bold uppercase text-[10px] tracking-widest transition-all", isAgentRunning ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white")}
                                 >
                                     {isAgentRunning ? 'STOP ALGORITHM' : 'START ALGORITHM'}
                                 </button>
                             </div>
                         )}
                    </div>

                    {/* Simplified Order Entry Footer */}
                    <div className="h-32 bg-[#0b0e14] border-t border-slate-800 flex items-center px-8 gap-8">
                        <div className="w-1/3 space-y-2">
                            <div className="flex justify-between text-xs text-slate-500 font-bold uppercase">
                                <span>Order Size</span>
                                <span>Max: $42,500</span>
                            </div>
                            <div className="flex gap-2">
                                {[100, 500, 1000].map(amt => (
                                    <button 
                                        key={amt} 
                                        onClick={() => setOrderSize(amt)}
                                        className={clsx(
                                            "flex-1 py-3 rounded text-xs font-bold transition-colors",
                                            orderSize === amt ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                        )}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
                                <input 
                                    type="number" 
                                    placeholder="Custom" 
                                    value={orderSize}
                                    onChange={(e) => setOrderSize(Math.abs(parseFloat(e.target.value)) || 0)}
                                    className="w-full bg-black border border-slate-700 rounded py-2 pl-8 pr-4 text-white font-mono" 
                                />
                            </div>
                        </div>
                        
                        <div className="flex-grow flex gap-6 h-20">
                            <button 
                                disabled={mode === 'AGENT'}
                                onClick={() => handleManualExec('SELL')}
                                className="flex-1 bg-rose-950/30 border border-rose-600/30 hover:bg-rose-600 hover:text-white text-rose-500 rounded-lg flex flex-col items-center justify-center transition-all disabled:opacity-30 group"
                            >
                                <span className="text-xs uppercase font-black tracking-widest mb-1 group-hover:text-rose-200">Sell / Short</span>
                                <span className="text-4xl font-black font-mono">{selectedMarket?.bid || '---'}</span>
                            </button>
                            <button 
                                disabled={mode === 'AGENT'}
                                onClick={() => handleManualExec('BUY')}
                                className="flex-1 bg-emerald-950/30 border border-emerald-600/30 hover:bg-emerald-600 hover:text-white text-emerald-500 rounded-lg flex flex-col items-center justify-center transition-all disabled:opacity-30 group"
                            >
                                <span className="text-xs uppercase font-black tracking-widest mb-1 group-hover:text-emerald-200">Buy / Long</span>
                                <span className="text-4xl font-black font-mono">{selectedMarket?.ask || '---'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* C. RIGHT SIDEBAR (LOGS & PNL & ORDER BOOK) */}
                <div className="w-80 border-l border-slate-800 bg-[#0e1116] flex flex-col">
                    
                    {/* Account Info (Toggleable) */}
                    <div className="border-b border-slate-800">
                        <div className="p-4 flex justify-between items-center bg-[#0a0a0a]">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Unrealized P&L</div>
                            <button onClick={() => setShowPnl(!showPnl)} className="text-slate-500 hover:text-white">
                                {showPnl ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                        </div>
                        
                        {showPnl && (
                            <div className="p-6 pt-0 animate-in slide-in-from-top-2 duration-300">
                                <div className={clsx("text-4xl font-black mb-4", pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Buying Power</span>
                                        <span className="text-white font-mono">$42,500</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Positions</span>
                                        <span className="text-white font-mono">{openPositions}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ORDER BOOK (Moved from Footer) */}
                    <div className="border-b border-slate-800 bg-[#050505]">
                        <div className="p-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <List size={12} /> Live Depth
                        </div>
                        <div className="p-2 font-mono text-[10px]">
                            {/* Asks */}
                            <div className="flex flex-col-reverse gap-0.5 mb-1">
                                {[...Array(5)].map((_, i) => (
                                    <div key={`ask-${i}`} className="flex justify-between px-2 py-0.5 relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 bottom-0 bg-rose-900/20 group-hover:bg-rose-900/40 transition-all" style={{ width: `${Math.random() * 80 + 20}%`}}></div>
                                        <span className="relative z-10 text-slate-400">{(selectedMarket?.ask || 0) - i - 1}</span>
                                        <span className="relative z-10 text-rose-400">{(Math.random() * 500 + 100).toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Spread Divider */}
                            <div className="flex justify-between px-2 py-1 bg-slate-900 border-y border-slate-800 text-slate-500 font-bold my-1">
                                <span>SPREAD</span>
                                <span>{Math.abs((selectedMarket?.ask || 0) - (selectedMarket?.bid || 0)).toFixed(1)}</span>
                            </div>

                            {/* Bids */}
                            <div className="flex flex-col gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <div key={`bid-${i}`} className="flex justify-between px-2 py-0.5 relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 bg-emerald-900/20 group-hover:bg-emerald-900/40 transition-all" style={{ width: `${Math.random() * 80 + 20}%`}}></div>
                                        <span className="relative z-10 text-emerald-400">{(Math.random() * 500 + 100).toFixed(0)}</span>
                                        <span className="relative z-10 text-slate-400">{(selectedMarket?.bid || 0) + i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Trade Log */}
                    <div className="flex-grow flex flex-col bg-[#0b0e14]">
                        <div className="p-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                            Recent Executions
                        </div>
                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                            {recentTrades.map(trade => (
                                <div key={trade.id} className="p-3 border-b border-slate-800/30 hover:bg-white/5 text-xs">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-slate-300">{trade.symbol}</span>
                                        <span className="text-slate-500 font-mono">{trade.time}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx("font-bold px-1.5 rounded text-[10px]", trade.side === 'BUY' ? "bg-emerald-900/50 text-emerald-400" : "bg-rose-900/50 text-rose-400")}>
                                                {trade.side}
                                            </span>
                                            <span className="text-slate-400 text-[10px]">(${trade.amount})</span>
                                        </div>
                                        <span className="font-mono text-slate-300">@{trade.price}</span>
                                    </div>
                                </div>
                            ))}
                            {recentTrades.length === 0 && (
                                <div className="text-center py-8 text-slate-600 text-xs italic">
                                    No trades this session.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
