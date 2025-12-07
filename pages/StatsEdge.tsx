
import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, AlertTriangle, ArrowRight, Calculator, CheckCircle2, XCircle, User, Activity, ChevronDown, Radar, RefreshCw, Trophy, Layers, Search, Loader2, Settings2, List } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';

// --- MOCK DATA FOR SIMULATION (Fallback) ---
const PLAYERS = [
    'J. Allen', 'P. Mahomes', 'L. Jackson', 'T. Tagovailoa', 'J. Burrow', 'C. McCaffrey', 'T. Hill', 
    'J. Jefferson', 'A. Brown', 'C. Lamb', 'D. Henry', 'S. Barkley', 'B. Robinson', 'K. Cousins', 'D. Prescott'
];
const STATS = ['Pass Yds', 'Rush Yds', 'Rec Yds', 'Pass TDs', 'Receptions'];

// Fixed Payout Platforms
const FIXED_PLATFORMS = [
    { name: 'PrizePicks Flex', implied: -119, label: 'PP Flex' },
    { name: 'PrizePicks Power', implied: -137, label: 'PP Power' },
    { name: 'Underdog 3-Slip', implied: -122, label: 'UD 3-Slip' },
    { name: 'DK Pick6', implied: -125, label: 'DK Pick6' },
    { name: 'Betr 2-Pick', implied: -119, label: 'Betr 2-Leg' }
];

// Payout Presets based on Leg Count
const PAYOUT_PRESETS: Record<string, Record<number, number>> = {
    'Standard': { 2: 3.0, 3: 6.0, 4: 10.0, 5: 20.0, 6: 25.0 }, // PP Power / Generic
    'Flex': { 2: 2.0, 3: 2.25, 4: 5.0, 5: 10.0, 6: 25.0 }, // Conservative / Flex Max (Approx)
    'Underdog': { 2: 3.0, 3: 6.0, 4: 10.0, 5: 20.0 }, // UD Standard
};

interface ScannerRow {
    id: string;
    player: string;
    stat: string;
    line: number;
    side: 'OVER' | 'UNDER';
    bookOdds: number; // American
    bestPlatform: string; // The DFS site to use
    dfsImplied: number; // American
    winProb: number;
    ev: number;
}

export const StatsEdge: React.FC = () => {
  // --- PARLAY SCENARIO BUILDER STATE ---
  const [legs, setLegs] = useState<string[]>(['-110', '-110']);
  const [dfsMultiplier, setDfsMultiplier] = useState(3.0); // 3x for 2 legs
  const [payoutMode, setPayoutMode] = useState<'Standard' | 'Flex' | 'Underdog' | 'Custom'>('Standard');
  
  const [metrics, setMetrics] = useState({
    trueProbability: 0,
    trueDecimal: 0,
    dfsImpliedProb: 0,
    ev: 0,
    verdict: 'NEUTRAL'
  });

  // --- PLAYER PROP ANALYZER STATE ---
  const [playerName, setPlayerName] = useState('');
  const [statType, setStatType] = useState('');
  const [pickSide, setPickSide] = useState<'OVER' | 'UNDER'>('OVER');
  const [sbOdds, setSbOdds] = useState('-135'); // Sharp Book Odds
  const [dfsOdds, setDfsOdds] = useState('-119'); // Default DFS Implied (PP 5-Flex)
  const [isFetchingProp, setIsFetchingProp] = useState(false);
  
  const [propMetrics, setPropMetrics] = useState({
    winProb: 0,
    impliedProb: 0,
    ev: 0,
    isPositive: false
  });

  // --- SCANNER STATE ---
  const [scannerRows, setScannerRows] = useState<ScannerRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'LIVE_DB' | 'SIMULATION'>('SIMULATION');

  // --- PARLAY HANDLERS ---
  const addLeg = () => { if (legs.length < 6) setLegs([...legs, '-110']); };
  const removeLeg = (index: number) => {
    if (legs.length > 2) {
      const newLegs = [...legs];
      newLegs.splice(index, 1);
      setLegs(newLegs);
    }
  };
  const updateLeg = (index: number, val: string) => {
    const newLegs = [...legs];
    newLegs[index] = val;
    setLegs(newLegs);
  };

  // Smart Multiplier Update Logic
  useEffect(() => {
    // Only auto-update if not in Custom mode
    if (payoutMode !== 'Custom') {
        const count = legs.length;
        const preset = PAYOUT_PRESETS[payoutMode];
        if (preset && preset[count]) {
            setDfsMultiplier(preset[count]);
        }
    }
  }, [legs.length, payoutMode]);

  const handleMultiplierChange = (val: number) => {
      setDfsMultiplier(val);
      setPayoutMode('Custom');
  };

  useEffect(() => {
    if (legs.length === 2 && payoutMode === 'Standard') setDfsMultiplier(3.0);
    // Removed strict dependency logic to favor the payoutMode effect above
  }, []); // Run once on mount

  // --- PARLAY CALC ---
  useEffect(() => {
    let combinedDecimal = 1;
    let valid = true;
    legs.forEach(leg => {
      const am = parseFloat(leg);
      if (isNaN(am)) { valid = false; return; }
      let decimal = 0;
      if (am > 0) decimal = (am / 100) + 1;
      else decimal = (100 / Math.abs(am)) + 1;
      combinedDecimal *= decimal;
    });

    if (!valid) return;
    const impliedProb = 1 / combinedDecimal;
    const dfsProb = 1 / dfsMultiplier;
    const profit = dfsMultiplier - 1;
    const lossProb = 1 - impliedProb;
    const ev = (impliedProb * profit) - (lossProb * 1);

    setMetrics({
        trueProbability: impliedProb * 100,
        trueDecimal: combinedDecimal,
        dfsImpliedProb: dfsProb * 100,
        ev: ev * 100,
        verdict: ev > 0 ? 'POSITIVE' : 'NEGATIVE'
    });
  }, [legs, dfsMultiplier]);

  // --- PROP CALC ---
  useEffect(() => {
    const getDec = (os: string) => {
        const o = parseFloat(os);
        if (isNaN(o)) return 0;
        return o > 0 ? (o/100)+1 : (100/Math.abs(o))+1;
    };

    const sbDec = getDec(sbOdds); // The "Real" probability source
    const dfsDec = getDec(dfsOdds); // The "Cost" source

    if (sbDec > 0 && dfsDec > 0) {
        // Book Win Probability
        const winProb = 1 / sbDec;
        
        // DFS Break Even Probability
        const impliedProb = 1 / dfsDec;

        // EV Calculation:
        // If we bet $1 on DFS, we get 'dfsDec' back if we win.
        // EV = (RealWinProb * (dfsDec - 1)) - (RealLossProb * 1)
        const profit = dfsDec - 1;
        const lossProb = 1 - winProb;
        const ev = (winProb * profit) - (lossProb * 1);

        setPropMetrics({
            winProb: winProb * 100,
            impliedProb: impliedProb * 100,
            ev: ev * 100,
            isPositive: ev > 0
        });
    }
  }, [sbOdds, dfsOdds]);

  const handleDfsPreset = (val: string) => setDfsOdds(val);

  // --- PROP FETCH LOGIC ---
  const handleFetchPlayerLine = async () => {
    if (!playerName.trim()) return;
    setIsFetchingProp(true);
    
    try {
        // 1. Try to find real scan data in Supabase first
        const { data, error } = await supabase
            .from('market_scans')
            .select('*')
            .ilike('player', `%${playerName}%`)
            .order('scanned_at', { ascending: false })
            .limit(1);

        if (!error && data && data.length > 0) {
            const hit = data[0];
            setStatType(`${hit.line} ${hit.stat}`);
            setPickSide(hit.side as 'OVER' | 'UNDER');
            setSbOdds(hit.book_odds.toString());
            // We keep the DFS odds as is, or could update if we tracked specific platform
        } else {
            // 2. Simulation Fallback
            // Fake latency for realism
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Generate contextual stats based on name hints (very basic)
            let possibleStats = ['Rush Yds', 'Rec Yds', 'Receptions', 'Anytime TD'];
            if (['josh', 'patrick', 'lamar', 'joe', 'dak', 'kirk'].some(n => playerName.toLowerCase().includes(n))) {
                possibleStats = ['Pass Yds', 'Pass TDs', 'Rush Yds', 'Completions'];
            }
            
            const randomStat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
            const randomLine = (Math.random() * 50 + 10.5).toFixed(1);
            const randomSide = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            const randomOdds = -110 - Math.floor(Math.random() * 60); // -110 to -170
            
            setStatType(`${randomLine} ${randomStat}`);
            setPickSide(randomSide);
            setSbOdds(randomOdds.toString());
        }
    } catch (err) {
        console.error("Fetch prop error:", err);
    } finally {
        setIsFetchingProp(false);
    }
  };

  // --- SCANNER LOGIC ---
  const runSimulation = () => {
        const rows: ScannerRow[] = [];
        
        // Generate 50 potential market scenarios
        for (let i = 0; i < 50; i++) {
            const player = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
            const stat = STATS[Math.floor(Math.random() * STATS.length)];
            const line = Math.floor(Math.random() * 50) + 0.5;
            const side = Math.random() > 0.5 ? 'OVER' : 'UNDER';
            
            // Simulate "Sharp" Book Odds (e.g. ESPN Bet/DraftKings Sportsbook)
            // Bias towards heavy juice (-130 to -165) to create EV opportunities against fixed payouts
            const bookOdds = Math.floor(Math.random() * 45) - 165; 
            const bookDec = (100 / Math.abs(bookOdds)) + 1;
            const winProb = 1 / bookDec;

            // --- FIND BEST PLATFORM ---
            let bestEv = -Infinity;
            let bestPlatformName = '';
            let bestImplied = 0;

            // 1. Check Fixed Payout Sites (PrizePicks, Underdog, Betr, DK Pick6)
            FIXED_PLATFORMS.forEach(platform => {
                const dfsDec = (100 / Math.abs(platform.implied)) + 1;
                const profit = dfsDec - 1;
                const ev = (winProb * profit) - ((1 - winProb) * 1);
                
                if (ev > bestEv) {
                    bestEv = ev;
                    bestPlatformName = platform.label;
                    bestImplied = platform.implied;
                }
            });

            // 2. Check Sleeper (Dynamic Pricing Simulation)
            // Sleeper uses dynamic multipliers.
            // We simulate a multiplier that is typically "Sharp Odds + Vig", but occasionally better (lag/promo).
            const isPromo = Math.random() > 0.95; // 5% chance of a "Sleeper Promo/Misprice"
            
            // Standard Sleeper Vig is ~4-8%, Promos might have negative vig relative to sharp book
            const effectiveVig = isPromo ? -0.015 : (0.04 + Math.random() * 0.04); 
            
            let sleeperImpliedProb = winProb + effectiveVig;
            // Clamp probability
            if (sleeperImpliedProb > 0.98) sleeperImpliedProb = 0.98;
            if (sleeperImpliedProb < 0.02) sleeperImpliedProb = 0.02;

            const sleeperMultiplier = 1 / sleeperImpliedProb;
            
            // EV Calc for Sleeper: (WinProb * (Multiplier - 1)) - (LossProb * 1)
            const sleeperEv = (winProb * (sleeperMultiplier - 1)) - ((1 - winProb) * 1);

            // Calculate "Implied Odds" for display comparison (American format of the multiplier)
            let sleeperImpliedOddsDisplay = 0;
            if (sleeperImpliedProb > 0.5) {
                sleeperImpliedOddsDisplay = -Math.round((sleeperImpliedProb / (1 - sleeperImpliedProb)) * 100);
            } else {
                sleeperImpliedOddsDisplay = Math.round(((1 - sleeperImpliedProb) / sleeperImpliedProb) * 100);
            }

            if (sleeperEv > bestEv) {
                bestEv = sleeperEv;
                bestPlatformName = isPromo ? 'Sleeper (Promo)' : 'Sleeper (Dyn)';
                bestImplied = sleeperImpliedOddsDisplay;
            }
            
            rows.push({
                id: `scan-${i}`,
                player,
                stat,
                line,
                side,
                bookOdds,
                bestPlatform: bestPlatformName,
                dfsImplied: bestImplied,
                winProb: winProb * 100,
                ev: bestEv * 100
            });
        }
        
        // Sort by EV Descending and take top 20
        rows.sort((a, b) => b.ev - a.ev);
        setScannerRows(rows.slice(0, 20));
        setDataSource('SIMULATION');
  };

  const runScan = async () => {
      setIsScanning(true);
      
      try {
          // 1. Try fetching real data from Supabase
          const { data, error } = await supabase
            .from('market_scans')
            .select('*')
            .order('scanned_at', { ascending: false })
            .limit(50); // Get latest 50 scans

          if (!error && data && data.length > 0) {
              const mappedRows: ScannerRow[] = data.map((row) => ({
                  id: row.id,
                  player: row.player,
                  stat: row.stat,
                  line: row.line,
                  side: row.side,
                  bookOdds: row.book_odds,
                  bestPlatform: row.best_platform || 'DFS',
                  dfsImplied: row.dfs_implied,
                  winProb: row.win_prob || 0, // Should be stored or calculated
                  ev: row.ev
              }));
              
              setScannerRows(mappedRows);
              setDataSource('LIVE_DB');
              setLastScanTime(new Date(data[0].scanned_at));
          } else {
              // 2. Fallback to Simulation if DB is empty
              console.warn("No market scan data found in DB, running simulation.");
              runSimulation();
              setLastScanTime(new Date());
          }
      } catch (err) {
          console.error("Scan error:", err);
          runSimulation();
          setLastScanTime(new Date());
      } finally {
          setIsScanning(false);
      }
  };

  // Initial Scan
  useEffect(() => {
      runScan();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
        
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-600 mb-4 uppercase tracking-tighter">
                StatsEdge Calculator
            </h1>
            <p className="text-slate-400 text-lg">
                Arbitrage & EV Analysis Tool for Sportsbook vs. DFS Markets
            </p>
        </div>

        {/* =========================================
            SECTION 1: PARLAY ANALYZER
           ========================================= */}
        <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-yellow-500 pl-4 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="text-yellow-400" /> 
                1. Parlay Ticket Analyzer
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="glass-panel p-1 rounded-2xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.1)]">
                    <div className="bg-slate-900/90 p-8 rounded-xl h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Calculator className="text-yellow-400" /> 
                                Scenario Builder
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => removeLeg(legs.length - 1)} disabled={legs.length <= 2} className="px-3 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 disabled:opacity-50 text-xs font-bold">- Leg</button>
                                <button onClick={addLeg} disabled={legs.length >= 6} className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 disabled:opacity-50 text-xs font-bold">+ Leg</button>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8 flex-grow">
                            {legs.map((leg, idx) => (
                                <div key={idx} className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-300">
                                    <span className="text-slate-500 font-mono text-sm w-12">Leg {idx + 1}</span>
                                    <div className="flex-grow relative">
                                        <input 
                                            type="text" 
                                            value={leg}
                                            onChange={(e) => updateLeg(idx, e.target.value)}
                                            className="w-full bg-black/40 border border-slate-700 rounded-lg py-3 pl-4 pr-12 text-white font-mono focus:border-yellow-500 focus:outline-none transition-colors"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs">ODDS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="h-px bg-slate-800 mb-6"></div>
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">DFS Payout Multiplier</label>
                                
                                {/* Platform Selector */}
                                <div className="flex bg-slate-800 rounded-lg p-0.5">
                                    {(['Standard', 'Flex', 'Underdog', 'Custom'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setPayoutMode(mode)}
                                            className={clsx(
                                                "px-2 py-1 text-[10px] font-bold rounded uppercase transition-colors",
                                                payoutMode === mode 
                                                    ? "bg-yellow-500 text-black" 
                                                    : "text-slate-400 hover:text-white"
                                            )}
                                        >
                                            {mode === 'Standard' ? 'Power' : mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={dfsMultiplier}
                                    onChange={(e) => handleMultiplierChange(parseFloat(e.target.value))}
                                    className={clsx(
                                        "w-full bg-black/40 border rounded-lg py-4 pl-4 text-yellow-400 font-black text-2xl focus:outline-none transition-colors",
                                        payoutMode === 'Custom' ? "border-yellow-500/80" : "border-yellow-500/30"
                                    )}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">x</span>
                                {payoutMode === 'Custom' && (
                                    <div className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-yellow-500 bg-yellow-900/30 px-2 py-0.5 rounded border border-yellow-700/50">
                                        CUSTOM
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-500 text-right">
                                {payoutMode === 'Standard' && 'Using PrizePicks Power / Standard Multipliers'}
                                {payoutMode === 'Flex' && 'Using Conservative / Flex Max Multipliers'}
                                {payoutMode === 'Underdog' && 'Using Underdog Standard Multipliers'}
                                {payoutMode === 'Custom' && 'Manual Override Active'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className={clsx(
                        "glass-panel p-8 rounded-2xl border-l-4 transition-all duration-500",
                        metrics.verdict === 'POSITIVE' ? "border-l-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]" : "border-l-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)]"
                    )}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Expected Value (EV)</div>
                                <div className={clsx("text-5xl font-black tracking-tighter", metrics.verdict === 'POSITIVE' ? "text-emerald-400" : "text-rose-400")}>
                                    {metrics.ev > 0 ? '+' : ''}{metrics.ev.toFixed(2)}%
                                </div>
                            </div>
                            <div className={clsx(
                                "px-4 py-2 rounded-lg font-black uppercase text-sm flex items-center gap-2",
                                metrics.verdict === 'POSITIVE' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            )}>
                                {metrics.verdict === 'POSITIVE' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                {metrics.verdict === 'POSITIVE' ? 'High Value' : 'Bad Bet'}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-3 rounded-lg border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase">Book True Odds</div>
                                <div className="text-xl font-mono text-white">+{((metrics.trueDecimal - 1) * 100).toFixed(0)}</div>
                                <div className="text-[10px] text-slate-500">{metrics.trueProbability.toFixed(1)}% Prob</div>
                            </div>
                            <div className="bg-black/30 p-3 rounded-lg border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase">DFS Implied Odds</div>
                                <div className="text-xl font-mono text-white">+{((dfsMultiplier - 1) * 100).toFixed(0)}</div>
                                <div className="text-[10px] text-slate-500">{metrics.dfsImpliedProb.toFixed(1)}% Req</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* =========================================
            SECTION 2: PLAYER PROP ANALYZER
           ========================================= */}
        <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-cyan-500 pl-4 uppercase tracking-widest flex items-center gap-2">
                <User className="text-cyan-400" /> 
                2. Single Prop Analyzer
            </h2>
            
            <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* INPUTS */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Player Name</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Josh Allen"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleFetchPlayerLine()}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-3 pr-10 text-white focus:border-cyan-500 focus:outline-none"
                                    />
                                    <button 
                                        onClick={handleFetchPlayerLine}
                                        disabled={isFetchingProp || !playerName}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-500 hover:text-white hover:bg-cyan-500/20 rounded transition-all disabled:opacity-30"
                                        title="Fetch Current Line"
                                    >
                                        {isFetchingProp ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Stat Type</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Pass Yards"
                                    value={statType}
                                    onChange={(e) => setStatType(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Side</label>
                                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                    <button 
                                        onClick={() => setPickSide('OVER')}
                                        className={clsx("flex-1 py-2 rounded text-xs font-bold transition-all", pickSide === 'OVER' ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white")}
                                    >OVER</button>
                                    <button 
                                        onClick={() => setPickSide('UNDER')}
                                        className={clsx("flex-1 py-2 rounded text-xs font-bold transition-all", pickSide === 'UNDER' ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white")}
                                    >UNDER</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block text-emerald-400">Sportsbook Odds</label>
                                <input 
                                    type="text" 
                                    value={sbOdds}
                                    onChange={(e) => setSbOdds(e.target.value)}
                                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-3 text-emerald-400 font-mono font-bold focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">DFS Implied Odds</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={dfsOdds}
                                        onChange={(e) => setDfsOdds(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-mono focus:border-cyan-500 focus:outline-none"
                                    />
                                    {/* Quick Select Dropdown */}
                                    <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 z-10 hidden group-hover:block shadow-xl">
                                        <div className="p-2 text-[10px] text-slate-500 font-bold uppercase">Quick Select</div>
                                        <button onClick={() => handleDfsPreset('-119')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-slate-300">PrizePicks 5/6 Flex (-119)</button>
                                        <button onClick={() => handleDfsPreset('-137')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-slate-300">PrizePicks 2 Power (-137)</button>
                                        <button onClick={() => handleDfsPreset('-122')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-slate-300">Underdog 3 Pick (-122)</button>
                                    </div>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESULTS CARD */}
                    <div className="lg:col-span-1">
                        <div className={clsx(
                            "h-full rounded-xl border p-6 flex flex-col justify-center transition-all",
                            propMetrics.isPositive ? "bg-emerald-500/10 border-emerald-500/50" : "bg-rose-500/10 border-rose-500/50"
                        )}>
                            <div className="text-center">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-white mb-2">
                                    {playerName || 'Player'} {pickSide} {statType}
                                </h4>
                                <div className={clsx(
                                    "text-5xl font-black tracking-tighter mb-2",
                                    propMetrics.isPositive ? "text-emerald-400" : "text-rose-400"
                                )}>
                                    {propMetrics.ev > 0 ? '+' : ''}{propMetrics.ev.toFixed(1)}% EV
                                </div>
                                <div className="inline-block px-3 py-1 rounded-full bg-black/40 text-xs font-mono text-slate-400">
                                    Win Prob: <span className="text-white font-bold">{propMetrics.winProb.toFixed(1)}%</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-slate-700/50 text-xs text-center text-slate-400">
                                {propMetrics.isPositive 
                                    ? "Strong Play. The sharp books suggest this hits more often than the DFS price implies." 
                                    : "Negative Edge. The sportsbook line implies this is a losing bet at DFS prices."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* =========================================
            SECTION 3: QUANTUM MARKET SCANNER
           ========================================= */}
        <div>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white border-l-4 border-purple-500 pl-4 uppercase tracking-widest flex items-center gap-2">
                    <Radar className="text-purple-400" /> 
                    3. Quantum Market Scanner
                </h2>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden md:inline">
                        Last Update: {lastScanTime ? lastScanTime.toLocaleTimeString() : 'Never'}
                    </span>
                    <button 
                        onClick={runScan} 
                        disabled={isScanning}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-lg text-purple-400 font-bold uppercase text-xs hover:bg-purple-600/40 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                        {isScanning ? 'Scanning...' : 'Scan Market'}
                    </button>
                </div>
             </div>

             <div className="glass-panel rounded-2xl border border-purple-500/20 overflow-hidden">
                 <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                         <thead>
                             <tr className="bg-slate-900/80 text-xs uppercase text-slate-500 border-b border-slate-700">
                                 <th className="py-4 px-6">Player Prop</th>
                                 <th className="py-4 px-6 text-center">
                                     <span className="flex items-center justify-center gap-1">
                                        <Trophy size={12} className="text-emerald-500" />
                                        Sharp Book (Fair)
                                     </span>
                                 </th>
                                 <th className="py-4 px-6 text-center">
                                     <span className="flex items-center justify-center gap-1">
                                        <Layers size={12} className="text-purple-500" />
                                        Best Available Edge
                                     </span>
                                 </th>
                                 <th className="py-4 px-6 text-right">Implied Odds</th>
                                 <th className="py-4 px-6 text-right">EV %</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                             {scannerRows.map((row) => (
                                 <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                                     <td className="py-3 px-6">
                                         <div className="font-bold text-white text-sm">{row.player}</div>
                                         <div className="text-xs text-slate-400 font-mono">
                                             <span className={row.side === 'OVER' ? 'text-emerald-400' : 'text-rose-400'}>{row.side}</span> {row.line} {row.stat}
                                         </div>
                                     </td>
                                     <td className="py-3 px-6 text-center">
                                         <div className="inline-block px-2 py-1 bg-black/40 rounded border border-emerald-900/50 font-mono text-emerald-400 text-xs font-bold">
                                             {row.bookOdds}
                                         </div>
                                         <div className="text-[9px] text-slate-600 mt-1">Win%: {row.winProb.toFixed(1)}%</div>
                                     </td>
                                     <td className="py-3 px-6 text-center">
                                         <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-purple-300 mb-1">{row.bestPlatform}</span>
                                            <div className="inline-block px-2 py-1 bg-purple-500/10 rounded border border-purple-500/30 text-[10px] text-purple-200">
                                                Best Route
                                            </div>
                                         </div>
                                     </td>
                                     <td className="py-3 px-6 text-right font-mono text-sm text-slate-300">
                                         {row.dfsImplied}
                                     </td>
                                     <td className="py-3 px-6 text-right">
                                         <div className={clsx(
                                             "inline-block min-w-[60px] text-center px-2 py-1 rounded font-black text-xs",
                                             row.ev > 5 ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]" : 
                                             row.ev > 0 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500"
                                         )}>
                                             {row.ev > 0 ? '+' : ''}{row.ev.toFixed(1)}%
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                             {scannerRows.length === 0 && !isScanning && (
                                 <tr>
                                     <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                                         Press "Scan Market" to search for anomalies.
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
                 <div className="bg-slate-900/50 p-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600">
                     <span className="flex items-center gap-2">
                        <AlertTriangle size={12} />
                        DATA SOURCE: {dataSource}
                     </span>
                     <span>Scanning: PrizePicks, Underdog, Sleeper, DraftKings</span>
                 </div>
             </div>
        </div>

        {/* =========================================
            SECTION 4: PLAYER PROP BETS (DETAILED)
           ========================================= */}
        <div>
             <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-emerald-500 pl-4 uppercase tracking-widest flex items-center gap-2">
                <List className="text-emerald-400" /> 
                4. Player Prop Bets
            </h2>

             <div className="glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden">
                 <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                         <thead>
                             <tr className="bg-slate-900/80 text-xs uppercase text-slate-500 border-b border-slate-700">
                                 <th className="py-4 px-6">Player Name</th>
                                 <th className="py-4 px-6">Stat Type</th>
                                 <th className="py-4 px-6 text-center">Line</th>
                                 <th className="py-4 px-6 text-center">Side</th>
                                 <th className="py-4 px-6 text-center">Sportsbook Odds</th>
                                 <th className="py-4 px-6 text-center">DFS Implied</th>
                                 <th className="py-4 px-6 text-right">EV %</th>
                                 <th className="py-4 px-6 text-right">Best Platform</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                             {scannerRows.map((row) => (
                                 <tr key={row.id + '-detailed'} className="hover:bg-white/5 transition-colors text-sm group">
                                     <td className="py-3 px-6 font-bold text-white">{row.player}</td>
                                     <td className="py-3 px-6 text-slate-300">{row.stat}</td>
                                     <td className="py-3 px-6 text-center font-mono text-white">{row.line}</td>
                                     <td className="py-3 px-6 text-center">
                                         <span className={clsx("font-bold px-2 py-1 rounded text-xs", row.side === 'OVER' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                             {row.side}
                                         </span>
                                     </td>
                                     <td className="py-3 px-6 text-center font-mono text-emerald-400">{row.bookOdds > 0 ? `+${row.bookOdds}` : row.bookOdds}</td>
                                     <td className="py-3 px-6 text-center font-mono text-slate-400">{row.dfsImplied > 0 ? `+${row.dfsImplied}` : row.dfsImplied}</td>
                                     <td className="py-3 px-6 text-right font-black text-emerald-400">+{row.ev.toFixed(1)}%</td>
                                     <td className="py-3 px-6 text-right">
                                         <span className="text-purple-300 font-bold text-xs border border-purple-500/30 px-2 py-1 rounded bg-purple-500/10">
                                             {row.bestPlatform}
                                         </span>
                                     </td>
                                 </tr>
                             ))}
                             {scannerRows.length === 0 && (
                                 <tr>
                                     <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
                                         No data available. Run scan to populate.
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
             </div>
        </div>

    </div>
  );
};
