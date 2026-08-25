
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Radio, Play, Pause, Power, Crosshair, BarChart3, Clock, AlertTriangle, ArrowUp, ArrowDown, Wifi, DollarSign, Bot, MousePointerClick, RefreshCw, Layers, Zap, TrendingUp, Search, Filter, Split, LineChart, Eye, EyeOff, List, ZoomIn, ZoomOut, History, X, Download, CheckCircle2, Copy } from 'lucide-react';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

// PROFESSIONAL MARKET DATA TYPES
interface MarketTicker {
    id: string;
    league: 'NFL' | 'NBA' | 'MLB' | 'VELOCITY';
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
    book?: 'Polymarket' | 'Kalshi';
    marketUrl?: string;
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
    exchange?: string;
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
    dataView?: 'VOLUME' | 'ALPHA';
}> = ({ dataSeed, color, label, price, volatility, timeScale, isMacro, dataView = 'VOLUME' }) => {
    const [path, setPath] = useState('');
    const [alphaPath, setAlphaPath] = useState('');
    const [yAxisLabels, setYAxisLabels] = useState<number[]>([]);
    const [xAxisLabels, setXAxisLabels] = useState<string[]>([]);
    const [volumeBars, setVolumeBars] = useState<{ x: number; height: number }[]>([]);
    
    // Generate simulated data points on render/update
    useEffect(() => {
        const width = 1000; // Internal SVG coordinate width
        const height = 300; // Internal SVG coordinate height
        const points: [number, number][] = [];
        const alphaPoints: [number, number][] = [];
        const volBars: { x: number; height: number }[] = [];
        
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

            // Volume bar generation (heights between 10 and 60 pixels from bottom)
            const volHeight = Math.abs(Math.sin(i * 0.15 + dataSeed) * Math.cos(i * 0.08)) * 60 + 10;
            volBars.push({ x: x, height: volHeight });

            // Alpha predicted line (shifted slightly earlier/different shape)
            const alphaNoise = (Math.sin(i * 0.11 + dataSeed + 0.4) * Math.cos(i * 0.04)) * (range * 0.7);
            const alphaSimulated = price + alphaNoise + trend + (range * 0.08);
            const alphaY = height - ((alphaSimulated - minPrice) / (maxPrice - minPrice)) * height;
            alphaPoints.push([x, Math.max(10, Math.min(height - 10, alphaY))]);
        }

        // Construct SVG Path d attribute
        if (points.length > 0) {
            const d = `M ${points[0][0]},${points[0][1]} ` + points.map(p => `L ${p[0]},${p[1]}`).join(' ');
            setPath(d);
        }

        if (alphaPoints.length > 0) {
            const alphaD = `M ${alphaPoints[0][0]},${alphaPoints[0][1]} ` + alphaPoints.map(p => `L ${p[0]},${p[1]}`).join(' ');
            setAlphaPath(alphaD);
        }

        setVolumeBars(volBars);

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

                {/* Dynamic Volume Bars */}
                {dataView === 'VOLUME' && volumeBars.map((bar, index) => {
                    if (index % 4 === 0) {
                        return (
                            <rect 
                                key={index} 
                                x={bar.x} 
                                y={300 - bar.height} 
                                width="5" 
                                height={bar.height} 
                                fill="#22d3ee" 
                                opacity="0.10" 
                            />
                        );
                    }
                    return null;
                })}

                {/* Alpha Prediction Line */}
                {dataView === 'ALPHA' && (
                    <path d={alphaPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.75" />
                )}

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
    const [selectedLeague, setSelectedLeague] = useState<'ALL' | 'NFL' | 'NBA' | 'VELOCITY'>('ALL');
    const [showPnl, setShowPnl] = useState(true);
    const [depthTab, setDepthTab] = useState<'SIDE_BY_SIDE' | 'DELTA'>('SIDE_BY_SIDE');
    
    // Execution State
    const [orderSize, setOrderSize] = useState(100);
    
    // Zoom State
    const [timeScale, setTimeScale] = useState(1);

    // Background Real-Time Synchronization State
    const [syncLatency, setSyncLatency] = useState(0.85);
    const [lastSyncStatus, setLastSyncStatus] = useState<'PARITY_OK' | 'SYNCING'>('PARITY_OK');

    // Agent State
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const agentIntervalRef = useRef<any>(null);

    // Floating Data View State
    const [deskDataView, setDeskDataView] = useState<'VOLUME' | 'ALPHA'>('VOLUME');
    const [activePreset, setActivePreset] = useState<string>('Standard Sharp Core');
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
    const [tradeToast, setTradeToast] = useState<{ id: string, message: string, impact: number, side: 'BUY' | 'SELL', symbol: string } | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

                // Velocity Crypto Prediction Markets
                { id: 'v1', league: 'VELOCITY', symbol: 'BTC > $100K Q2', description: 'Bitcoin price exceeds $100,000 at end of Q2', type: 'PROP', bid: 64, ask: 66, last: 65, clv: 68, edge: 3.0, volatility: 0.22, sentiment: 0.75, volume: 1250000, change: 4.2, book: 'Polymarket', marketUrl: 'https://polymarket.com' },
                { id: 'v2', league: 'VELOCITY', symbol: 'ETH Gas < 15 gwei', description: 'Weekly median Ethereum gas price below 15 gwei', type: 'PROP', bid: 44, ask: 46, last: 45, clv: 42, edge: -1.5, volatility: 0.35, sentiment: -0.2, volume: 450000, change: -1.8, book: 'Kalshi', marketUrl: 'https://kalshi.com' },
                { id: 'v3', league: 'VELOCITY', symbol: 'SOL Surpasses BNB', description: 'Solana market capitalization surpases BNB in 2026', type: 'PROP', bid: 28, ask: 30, last: 29, clv: 35, edge: 6.0, volatility: 0.45, sentiment: 0.82, volume: 854000, change: 12.5, book: 'Polymarket', marketUrl: 'https://polymarket.com' },
                { id: 'v4', league: 'VELOCITY', symbol: 'SOL ETF Approval', description: 'SEC approves spot Solana ETF before Dec 31', type: 'PROP', bid: 18, ask: 20, last: 19, clv: 24, edge: 5.0, volatility: 0.50, sentiment: 0.4, volume: 620000, change: 8.4, book: 'Kalshi', marketUrl: 'https://kalshi.com' }
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
                    if (m.league === 'VELOCITY') {
                        newBid = Math.max(2, Math.min(96, newBid));
                    } else if (newBid > -100 && newBid < 100) {
                        newBid = 100;
                    }

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

        // Real-time background synchronization check for low-duration assets (PROPS / high volatility)
        const syncInterval = setInterval(() => {
            setLastSyncStatus('SYNCING');
            setTimeout(() => {
                setSyncLatency(parseFloat((0.3 + Math.random() * 0.6).toFixed(2)));
                setLastSyncStatus('PARITY_OK');
                // Ensure price parity & data freshness for low-duration assets
                setMarkets(prev => prev.map(m => {
                    if (m.type === 'PROP' || m.volatility > 0.15) {
                        const correctedBid = Math.round((m.bid * 0.85) + (m.clv * 0.15));
                        const spread = Math.abs(m.bid - m.ask) || 2;
                        return {
                            ...m,
                            bid: correctedBid,
                            ask: correctedBid + spread,
                            last: Math.round(correctedBid + (spread / 2))
                        };
                    }
                    return m;
                }));
            }, 180);
        }, 3500);

        return () => {
            clearInterval(timer);
            clearInterval(simInterval);
            clearInterval(syncInterval);
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
            id: `trd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            time: new Date().toLocaleTimeString([], { hour12: false }),
            symbol: market.symbol,
            side,
            price,
            amount,
            status: 'FILLED',
            exchange: market.book || 'Internal'
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

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setTradeToast({
            id: newTrade.id,
            message: `Executed ${amount} ${market.symbol}`,
            impact,
            side,
            symbol: market.symbol
        });
        toastTimeoutRef.current = setTimeout(() => {
            setTradeToast(null);
        }, 4000);
    };

    const handleManualExec = (side: 'BUY' | 'SELL') => {
        if (selectedMarket) executeTrade(selectedMarket, side, orderSize);
    };

    // Calculate the order book depth levels & volumes deterministically from the selected market price & time
    const depthData = React.useMemo(() => {
        if (!selectedMarket) return [];
        
        // Use a deterministic seed from base characters of selectedMarket symbol and properties
        const seedValue = selectedMarket.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100) + Math.abs(selectedMarket.bid || 100);
        
        return Array.from({ length: 5 }).map((_, i) => {
            // Incorporate smooth live progression based on current seconds
            const secondsFactor = Math.sin((currentTime.getTime() / 1500) + i);
            
            // Scaled base volume levels (representing thicker orders as we go deeper into the book)
            const baseBidVol = Math.round((seedValue * (i + 1) * 31) % 180 + 120 + (i * 40));
            const baseAskVol = Math.round((seedValue * (i + 1) * 73) % 180 + 120 + (i * 40));
            
            // Apply slight interactive simulation wiggle 
            const bidVol = Math.max(15, Math.round(baseBidVol + (secondsFactor * 30)));
            const askVol = Math.max(15, Math.round(baseAskVol + (-secondsFactor * 30)));
            
            // Calculate delta
            const delta = bidVol - askVol;
            const absDelta = Math.abs(delta);
            
            // Calculate corresponding prices above and below spread
            const bidPrice = selectedMarket.bid - (i * 2);
            const askPrice = selectedMarket.ask + (i * 2);
            
            return {
                level: `Lvl ${i + 1}`,
                bidPrice,
                askPrice,
                bid: bidVol,
                ask: askVol,
                delta,
                absDelta,
                // Highlight dominant side for this level
                dominant: delta > 0 ? 'bid' : 'ask'
            };
        });
    }, [selectedMarket, currentTime]);

    const filteredMarkets = markets.filter(m => {
        const matchesSearch = m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             m.league.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLeague = selectedLeague === 'ALL' || m.league === selectedLeague;
        return matchesSearch && matchesLeague;
    });

    const copyTradeDataToJSON = () => {
        if (recentTrades.length === 0) return;
        navigator.clipboard.writeText(JSON.stringify(recentTrades, null, 2));
        
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setTradeToast({
            id: `toast-${Date.now()}`,
            message: 'Trade history copied to clipboard.',
            impact: 0,
            side: 'BUY',
            symbol: 'SYSTEM'
        });
        toastTimeoutRef.current = setTimeout(() => {
            setTradeToast(null);
        }, 3000);
    };

    const exportTradeHistoryToCSV = () => {
        if (recentTrades.length === 0) return;

        const headers = ['ID', 'Time', 'Symbol', 'Side', 'Price (cents)', 'Amount (USD)', 'Exchange', 'Status', 'PNL'];
        const csvRows = [headers.join(',')];

        recentTrades.forEach(trade => {
            const row = [
                trade.id,
                trade.time,
                trade.symbol,
                trade.side,
                trade.price,
                trade.amount,
                trade.exchange || 'Internal',
                trade.status,
                trade.pnl || 0
            ];
            // Escape values containing commas just in case (though these specific fields likely don't have them)
            csvRows.push(row.map(val => `"${val}"`).join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `trade_history_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExit = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        if (onClose) onClose();
    };

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

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

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!chartRef.current || equityHistory.length === 0) return;
        const rect = chartRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const index = Math.round((x / rect.width) * (equityHistory.length - 1));
        setHoveredIndex(Math.max(0, Math.min(index, equityHistory.length - 1)));
    };

    return (
        <div className="h-screen w-full bg-[#0b0e14] text-slate-200 overflow-hidden flex flex-col font-mono selection:bg-cyan-500/30 text-xs">
            
            {/* 1. TOP GLOBAL TICKER */}
            <div className="h-8 bg-gradient-to-r from-[#020617] via-[#0f172a] to-[#020617] border-b border-indigo-500/20 flex items-center gap-6 px-4 overflow-hidden whitespace-nowrap shadow-lg z-20">
                <div className="flex items-center gap-2 text-emerald-400 font-bold shrink-0">
                    <Activity size={12} /> SYSTEM ONLINE
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${lastSyncStatus === 'SYNCING' ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'}`}></span>
                    <span>SYNC PARITY: {lastSyncStatus === 'SYNCING' ? 'CHECKING...' : `OK (${syncLatency}ms)`}</span>
                </div>
                {markets.slice(0, 8).map(m => (
                    <div key={`tick-${m.id}`} className="flex items-center gap-2 opacity-70">
                        <span className="text-slate-400 font-bold">{m.symbol}</span>
                        <span className={m.change >= 0 ? "text-emerald-500" : "text-rose-500"}>
                            {m.league === 'VELOCITY' ? `$0.${m.last}` : m.last > 0 ? `+${m.last}` : m.last} ({m.change > 0 ? '+' : ''}{m.change}%)
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

                    <button 
                        onClick={() => setIsHistoryDrawerOpen(true)}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-500 rounded text-slate-400 hover:text-white transition-all"
                        title="Trade History"
                    >
                        <History size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">HISTORY</span>
                    </button>

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
                    
                    {/* League Sub-Tabs */}
                    <div className="flex bg-[#05080c] p-1.5 border-b border-slate-800 text-[10px] font-bold overflow-x-auto gap-1 shrink-0">
                        {(['ALL', 'NFL', 'NBA', 'VELOCITY'] as const).map(l => (
                            <button
                                key={l}
                                onClick={() => setSelectedLeague(l)}
                                className={clsx(
                                    "px-2.5 py-1 rounded transition-all whitespace-nowrap uppercase tracking-wider font-sans text-[9px] border",
                                    selectedLeague === l
                                        ? l === 'VELOCITY'
                                            ? "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.2)]"
                                            : "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                        : "text-slate-500 hover:text-slate-300 border-transparent bg-transparent"
                                )}
                            >
                                {l === 'VELOCITY' ? 'Velocity Crypto' : l}
                            </button>
                        ))}
                    </div>

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
                                        <span className={clsx(
                                            "text-[9px] px-1 rounded font-bold uppercase border",
                                            m.league === 'VELOCITY' 
                                                ? 'bg-fuchsia-950/80 text-fuchsia-400 border-fuchsia-500/30' 
                                                : m.league === 'NFL' 
                                                    ? 'bg-blue-900/50 text-blue-400 border-blue-800/30' 
                                                    : m.league === 'NBA' 
                                                        ? 'bg-orange-900/50 text-orange-400 border-orange-800/30' 
                                                        : 'bg-slate-700 text-slate-300 border-slate-600/30'
                                        )}>
                                            {m.league === 'VELOCITY' ? 'CRYPTO' : m.league}
                                        </span>
                                        <span className="font-bold text-slate-200 truncate">{m.symbol}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">{m.description}</div>
                                </div>

                                {/* Quotes */}
                                <div className="col-span-2 text-center font-mono text-emerald-400">
                                    {m.league === 'VELOCITY' ? `$0.${m.bid}` : m.bid > 0 ? `+${m.bid}` : m.bid}
                                </div>
                                <div className="col-span-2 text-center font-mono text-rose-400">
                                    {m.league === 'VELOCITY' ? `$0.${m.ask}` : m.ask > 0 ? `+${m.ask}` : m.ask}
                                </div>
                                
                                {/* CLV */}
                                <div className="col-span-2 text-center font-mono text-slate-400 opacity-70">
                                    {m.league === 'VELOCITY' ? `$0.${m.clv}` : m.clv > 0 ? `+${m.clv}` : m.clv}
                                </div>

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
                        <div 
                            ref={chartRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className="flex-grow bg-slate-900/30 rounded border border-slate-800 relative overflow-hidden"
                        >
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
                                {/* Hover Indicator */}
                                {hoveredIndex !== null && (
                                    <circle 
                                        cx={(hoveredIndex / (equityHistory.length - 1)) * 400} 
                                        cy={100 - ((equityHistory[hoveredIndex] - Math.min(...equityHistory)) / (Math.max(...equityHistory) - Math.min(...equityHistory) || 1)) * 80 - 10} 
                                        r="4" 
                                        fill="white" 
                                    />
                                )}
                            </svg>
                            {/* Tooltip */}
                            {hoveredIndex !== null && (
                                <div 
                                    className="absolute bg-black border border-slate-700 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none"
                                    style={{
                                        left: `${(hoveredIndex / (equityHistory.length - 1)) * 100}%`,
                                        top: '10px',
                                        transform: 'translateX(-50%)'
                                    }}
                                >
                                    P&L: ${equityHistory[hoveredIndex].toFixed(2)}
                                </div>
                            )}
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
                                <span className="text-sm font-normal text-slate-400 bg-slate-900/80 px-2.5 py-0.5 rounded border border-slate-800 font-sans">{selectedMarket?.description || "Market Data"}</span>
                                {selectedMarket?.book && (
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border font-sans",
                                            selectedMarket.book === 'Polymarket' 
                                                ? 'bg-indigo-950/85 text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                                                : 'bg-pink-950/85 text-pink-400 border-pink-500/30'
                                        )}>
                                            {selectedMarket.book}
                                        </span>
                                        <a 
                                            href={selectedMarket.marketUrl || 'https://polymarket.com'} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className={clsx(
                                                "text-[9px] font-black uppercase px-2 py-1 rounded border shadow-sm transition-all flex items-center gap-1 font-sans",
                                                selectedMarket.book === 'Polymarket'
                                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/50"
                                                    : "bg-pink-600 hover:bg-pink-500 text-white border-pink-400/50"
                                            )}
                                        >
                                            Review on {selectedMarket.book === 'Polymarket' ? 'polymarket.com' : 'Kalshi'}
                                        </a>
                                    </div>
                                )}
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
                                    dataView={deskDataView}
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
                                    dataView={deskDataView}
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
                                    dataView={deskDataView}
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
                                    dataView={deskDataView}
                                />
                             </div>
                         </div>

                         {/* FLOATING CONTROL OVERLAY */}
                         <div className="absolute bottom-4 right-4 bg-[#0a0d14]/90 border border-cyan-500/30 p-4 rounded-2xl backdrop-blur-md w-64 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-20 flex flex-col gap-3 font-sans text-[11px] animate-in fade-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                 <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                     <Layers size={12} className="text-cyan-400" />
                                     DESK OVERLAY
                                 </span>
                                 <div className="flex items-center gap-1">
                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                     <span className="text-[8px] font-mono text-emerald-400 uppercase font-black">Live</span>
                                 </div>
                             </div>

                             {/* Preset Selector */}
                             <div className="flex flex-col gap-1">
                                 <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Preset</span>
                                 <select 
                                     value={activePreset} 
                                     onChange={(e) => setActivePreset(e.target.value)}
                                     className="bg-[#04060a] border border-slate-800 rounded-lg px-2.5 py-2 text-[10px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                                 >
                                     <option value="Standard Sharp Core">Standard Sharp Core</option>
                                     <option value="High Volatility Props">High Volatility Props</option>
                                     <option value="Asymmetric Spreads">Asymmetric Spreads</option>
                                     <option value="MLB Alpha Special">MLB Alpha Special</option>
                                 </select>
                             </div>

                             {/* Toggle Controls */}
                             <div className="flex flex-col gap-1.5">
                                 <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Data View</span>
                                 <div className="flex bg-[#04060a] p-0.5 rounded-lg border border-slate-800">
                                     <button
                                         onClick={() => setDeskDataView('VOLUME')}
                                         className={clsx(
                                             "flex-1 py-2 text-[9px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1.5",
                                             deskDataView === 'VOLUME' ? "bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 shadow-inner" : "text-slate-500 hover:text-slate-300 border border-transparent"
                                         )}
                                     >
                                         <BarChart3 size={10} />
                                         Volume
                                     </button>
                                     <button
                                         onClick={() => setDeskDataView('ALPHA')}
                                         className={clsx(
                                             "flex-1 py-2 text-[9px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-1.5",
                                             deskDataView === 'ALPHA' ? "bg-indigo-950/80 text-indigo-400 border border-indigo-500/30 shadow-inner" : "text-slate-500 hover:text-slate-300 border border-transparent"
                                         )}
                                     >
                                         <Zap size={10} />
                                         Alpha
                                     </button>
                                 </div>
                             </div>

                             {/* Selected view details */}
                             <div className="bg-black/60 border border-slate-800/80 rounded-lg p-2.5 text-[9px] font-mono text-slate-400">
                                 {deskDataView === 'VOLUME' ? (
                                     <div className="flex justify-between">
                                         <span>AGGREGATED VOL:</span>
                                         <span className="text-cyan-400 font-bold">{(selectedMarket?.volume ? selectedMarket.volume * 1.5 : 12450).toLocaleString()} contracts</span>
                                     </div>
                                 ) : (
                                     <div className="flex justify-between">
                                         <span>PREDICTED ALPHA:</span>
                                         <span className="text-indigo-400 font-bold">+{selectedMarket ? (selectedMarket.edge * 1.25).toFixed(2) : '3.12'}% edge</span>
                                     </div>
                                 )}
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
                                <span className="text-4xl font-black font-mono">
                                    {selectedMarket ? (selectedMarket.league === 'VELOCITY' ? `$0.${selectedMarket.bid}` : selectedMarket.bid > 0 ? `+${selectedMarket.bid}` : selectedMarket.bid) : '---'}
                                </span>
                            </button>
                            <button 
                                disabled={mode === 'AGENT'}
                                onClick={() => handleManualExec('BUY')}
                                className="flex-1 bg-emerald-950/30 border border-emerald-600/30 hover:bg-emerald-600 hover:text-white text-emerald-500 rounded-lg flex flex-col items-center justify-center transition-all disabled:opacity-30 group"
                            >
                                <span className="text-xs uppercase font-black tracking-widest mb-1 group-hover:text-emerald-200">Buy / Long</span>
                                <span className="text-4xl font-black font-mono">
                                    {selectedMarket ? (selectedMarket.league === 'VELOCITY' ? `$0.${selectedMarket.ask}` : selectedMarket.ask > 0 ? `+${selectedMarket.ask}` : selectedMarket.ask) : '---'}
                                </span>
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
                    <div className="border-b border-slate-800 bg-[#050505]" id="live-depth-container">
                        <div className="p-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <List size={12} /> Live Depth
                            </span>
                            {/* Tabs for Order Book visualization */}
                            <div className="flex gap-1">
                                <button
                                    id="depth-tab-volume"
                                    onClick={() => setDepthTab('SIDE_BY_SIDE')}
                                    className={clsx(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider transition-all uppercase",
                                        depthTab === 'SIDE_BY_SIDE' ? "bg-cyan-600 text-white shadow-sm" : "bg-slate-800 text-slate-400 hover:text-white"
                                    )}
                                >
                                    Volume
                                </button>
                                <button
                                    id="depth-tab-delta"
                                    onClick={() => setDepthTab('DELTA')}
                                    className={clsx(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider transition-all uppercase",
                                        depthTab === 'DELTA' ? "bg-cyan-600 text-white shadow-sm" : "bg-slate-800 text-slate-400 hover:text-white"
                                    )}
                                >
                                    Delta
                                </button>
                            </div>
                        </div>

                        {/* Summary Metrics block detailing order book pressure */}
                        <div className="px-3 py-1.5 bg-slate-950 flex justify-between items-center text-[9px] font-bold border-b border-slate-900/80" id="live-depth-imbalance-summary">
                            <span className="text-slate-500">Imbalance Pressure:</span>
                            {(() => {
                                const totalBids = depthData.reduce((acc, d) => acc + d.bid, 0);
                                const totalAsks = depthData.reduce((acc, d) => acc + d.ask, 0);
                                const diff = totalBids - totalAsks;
                                const totalVal = totalBids + totalAsks;
                                const bidPct = totalVal > 0 ? (totalBids / totalVal) * 100 : 50;
                                
                                return (
                                    <div className="flex items-center gap-1.5">
                                        <span className={clsx("font-extrabold", diff >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                            {diff >= 0 ? 'Bids' : 'Asks'} {diff >= 0 ? '+' : ''}{diff} ({bidPct.toFixed(0)}%)
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Spread Indicator Box */}
                        <div className="p-2 bg-slate-950 font-mono text-[9px] grid grid-cols-3 text-center border-b border-slate-900 text-slate-500 font-bold" id="live-depth-spread-info">
                            <div>
                                <span className="block text-[8px] text-slate-600">BEST BID</span>
                                <span className="text-emerald-400 font-black">
                                    {selectedMarket ? (selectedMarket.league === 'VELOCITY' ? `$0.${selectedMarket.bid}` : selectedMarket.bid > 0 ? `+${selectedMarket.bid}` : selectedMarket.bid) : '---'}
                                </span>
                            </div>
                            <div className="border-x border-slate-900 flex flex-col justify-center">
                                <span className="block text-[8px] text-slate-600">SPREAD</span>
                                <span className="text-white font-black font-mono">
                                    {selectedMarket ? (selectedMarket.league === 'VELOCITY' ? `$${(Math.abs(selectedMarket.ask - selectedMarket.bid) / 100).toFixed(2)}` : Math.abs(selectedMarket.ask - selectedMarket.bid).toFixed(1)) : '---'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[8px] text-slate-600">BEST ASK</span>
                                <span className="text-rose-400 font-black">
                                    {selectedMarket ? (selectedMarket.league === 'VELOCITY' ? `$0.${selectedMarket.ask}` : selectedMarket.ask > 0 ? `+${selectedMarket.ask}` : selectedMarket.ask) : '---'}
                                </span>
                            </div>
                        </div>

                        {/* Rendering different chart based on selection */}
                        <div className="p-2 h-44 w-full" id="live-depth-chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                                {depthTab === 'SIDE_BY_SIDE' ? (
                                    // Bids vs Asks side-by-side comparative horizontal bar chart
                                    <BarChart 
                                        data={depthData} 
                                        layout="vertical" 
                                        margin={{ top: 0, right: 10, left: -25, bottom: 0 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="level" type="category" stroke="#475569" fontSize={8} tickLine={false} />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload as any;
                                                    return (
                                                        <div className="bg-[#090d13] border border-slate-800 p-2 rounded shadow-xl text-[9px] font-mono leading-normal">
                                                            <div className="text-slate-400 text-[8px] font-bold border-b border-slate-800 pb-1 mb-1">{data.level} Details</div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-emerald-400">Bid (Price: {data.bidPrice}):</span>
                                                                <span className="text-white font-bold">{data.bid} Vol</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-rose-400">Ask (Price: {data.askPrice}):</span>
                                                                <span className="text-white font-bold">{data.ask} Vol</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="bid" fill="#10b981" radius={[0, 2, 2, 0]} barSize={6} />
                                        <Bar dataKey="ask" fill="#f43f5e" radius={[0, 2, 2, 0]} barSize={6} />
                                    </BarChart>
                                ) : (
                                    // Order Book Delta (Bids - Asks) horizontal bar chart relative to center line (zero)
                                    <BarChart 
                                        data={depthData} 
                                        layout="vertical" 
                                        margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                                    >
                                        <XAxis type="number" stroke="#334155" fontSize={8} tickLine={false} />
                                        <YAxis dataKey="level" type="category" stroke="#475569" fontSize={8} tickLine={false} />
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload as any;
                                                    return (
                                                        <div className="bg-[#090d13] border border-slate-800 p-2 rounded shadow-xl text-[9px] font-mono leading-normal">
                                                            <div className="text-slate-400 text-[8px] font-bold border-b border-slate-800 pb-1 mb-1">{data.level} Imbalance</div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-400">Bid Price:</span>
                                                                <span className="text-emerald-400 font-bold">{data.bidPrice}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-slate-400">Ask Price:</span>
                                                                <span className="text-rose-400 font-bold">{data.askPrice}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4 border-t border-slate-900 pt-1 mt-1">
                                                                <span className="text-slate-300 font-bold">Net Delta:</span>
                                                                <span className={clsx("font-bold", data.delta >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                                    {data.delta >= 0 ? '+' : ''}{data.delta} Vol
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                                        <Bar dataKey="delta">
                                            {depthData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.delta >= 0 ? '#10b981' : '#f43f5e'} 
                                                    radius={entry.delta >= 0 ? [0, 2, 2, 0] : [2, 0, 0, 2]}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
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

            {/* HISTORY DRAWER OVERLAY */}
            {isHistoryDrawerOpen && (
                <div className="absolute inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsHistoryDrawerOpen(false)}>
                    <div 
                        className="w-[450px] md:w-[500px] h-full bg-[#080b11] border-l border-slate-800 flex flex-col shadow-2xl shadow-black animate-in slide-in-from-right duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                            <div>
                                <h2 className="text-white font-black text-lg uppercase tracking-widest flex items-center gap-2">
                                    <History className="text-cyan-400" />
                                    Trade History
                                </h2>
                                <p className="text-slate-500 text-xs mt-1">Full transaction ledger for current session</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={copyTradeDataToJSON}
                                    disabled={recentTrades.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-900/50 hover:bg-indigo-900/50 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Copy to JSON"
                                >
                                    <Copy size={14} />
                                    <span>Copy JSON</span>
                                </button>
                                <button 
                                    onClick={exportTradeHistoryToCSV}
                                    disabled={recentTrades.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/30 text-cyan-400 border border-cyan-900/50 hover:bg-cyan-900/50 hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Export to CSV"
                                >
                                    <Download size={14} />
                                    <span>Export CSV</span>
                                </button>
                                <button onClick={() => setIsHistoryDrawerOpen(false)} className="text-slate-500 hover:text-white p-2 transition-colors rounded hover:bg-slate-800">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-4">
                            {recentTrades.map(trade => (
                                <div key={trade.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:bg-slate-900/60 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={clsx("text-[10px] font-black uppercase px-2 py-0.5 rounded border", trade.side === 'BUY' ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/30" : "bg-rose-950/30 text-rose-400 border-rose-500/30")}>
                                                    {trade.side}
                                                </span>
                                                <span className="text-white font-bold">{trade.symbol}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                                <Clock size={10} />
                                                {trade.time}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black font-mono text-white">
                                                {trade.price}¢
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1">
                                                Size: ${trade.amount}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-[10px]">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 uppercase tracking-widest font-bold">Exchange:</span>
                                            <span className={clsx("font-bold px-1.5 py-0.5 rounded bg-black/40 border border-slate-800", trade.exchange === 'Kalshi' ? "text-pink-400" : trade.exchange === 'Polymarket' ? "text-indigo-400" : "text-cyan-400")}>
                                                {trade.exchange}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            {trade.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {recentTrades.length === 0 && (
                                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                                    <History size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm font-bold">No trades executed</p>
                                    <p className="text-xs mt-1">Your transaction ledger is empty.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-slate-800 bg-black/20 shrink-0">
                            <div className="flex justify-between items-center text-xs font-mono">
                                <span className="text-slate-500">Total Executions</span>
                                <span className="text-white font-bold">{recentTrades.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NON-INTRUSIVE TRADE TOAST NOTIFICATION */}
            {tradeToast && (
                <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-700 shadow-2xl shadow-black rounded-xl p-4 min-w-[280px] flex items-start gap-4">
                        <div className="bg-emerald-500/10 p-2 rounded-full border border-emerald-500/20 shrink-0 mt-0.5">
                            <CheckCircle2 size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white text-sm font-bold flex items-center gap-2">
                                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded font-black", tradeToast.side === 'BUY' ? "bg-emerald-950/50 text-emerald-400" : "bg-rose-950/50 text-rose-400")}>{tradeToast.side}</span>
                                {tradeToast.symbol}
                            </h4>
                            <div className="text-xs text-slate-400 mt-1">
                                {tradeToast.message}
                            </div>
                            <div className="mt-2 text-[11px] font-mono font-bold flex items-center gap-1.5 border-t border-slate-800 pt-2">
                                <span className="text-slate-500">PnL Impact:</span>
                                <span className={clsx(tradeToast.impact >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {tradeToast.impact >= 0 ? '+' : ''}${tradeToast.impact.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setTradeToast(null)} className="text-slate-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
