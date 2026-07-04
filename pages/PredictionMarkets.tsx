
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Zap, Info, ShieldCheck, Globe, 
  TrendingDown, TrendingUp, Clock, ArrowRight,
  ChevronRight, Calculator, AlertTriangle, Radio,
  ArrowRightLeft, Trophy, Activity, Timer, Target,
  Layers, BookOpen, CheckCircle2, Search, PlayCircle
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine 
} from 'recharts';
import { clsx } from 'clsx';
import { League } from '../types';

// MOCK DATA TYPES
interface BinaryMarket {
    id: string;
    event: string;
    marketName: string;
    book: string;
    yesPrice: number; // 0-99 cents
    noPrice: number;
    volume: number;
    timeLeft: string;
    type: 'IN_GAME' | 'PREGAME';
    isAsymmetrical?: boolean; // Highlight for asymmetry tab
    trueProb?: number; // Model's calculated probability
    edge?: number;
}

// MOCK DATA GENERATOR
const generateMarkets = (): BinaryMarket[] => [
    // IN-GAME (Fast Decay)
    { id: 'ig-1', event: 'KC vs BAL', marketName: 'Next Drive: Touchdown', book: 'Kalshi', yesPrice: 34, noPrice: 68, volume: 15400, timeLeft: 'Drive 4', type: 'IN_GAME', trueProb: 41, edge: 7 },
    { id: 'ig-2', event: 'KC vs BAL', marketName: 'Mahomes 2+ Passing TDs', book: 'Polymarket', yesPrice: 88, noPrice: 13, volume: 45000, timeLeft: 'Q4 12:00', type: 'IN_GAME' },
    { id: 'ig-3', event: 'KC vs BAL', marketName: 'Next Score: Field Goal', book: 'Kalshi', yesPrice: 45, noPrice: 57, volume: 8900, timeLeft: 'Drive 4', type: 'IN_GAME' },
    { id: 'ig-4', event: 'SF vs LAR', marketName: 'CMC Anytime TD', book: 'Polymarket', yesPrice: 72, noPrice: 29, volume: 12000, timeLeft: 'Q2 5:00', type: 'IN_GAME' },
    
    // PREGAME (Macro)
    { id: 'pg-1', event: 'BUF vs MIA', marketName: 'Bills Win Game', book: 'Kalshi', yesPrice: 58, noPrice: 44, volume: 120000, timeLeft: 'Sun 8:20PM', type: 'PREGAME' },
    { id: 'pg-2', event: 'PHI vs DAL', marketName: 'Eagles Win Game', book: 'Polymarket', yesPrice: 62, noPrice: 40, volume: 98000, timeLeft: 'Sun 4:25PM', type: 'PREGAME' },
    { id: 'pg-3', event: 'DET vs CHI', marketName: 'Total Points > 48.5', book: 'Kalshi', yesPrice: 51, noPrice: 51, volume: 34000, timeLeft: 'Sun 1:00PM', type: 'PREGAME' },
    
    // ASYMMETRICAL (High Edge / Low Risk)
    { id: 'as-1', event: 'NYJ vs NE', marketName: 'Patriots Win (Moneyline)', book: 'Polymarket', yesPrice: 22, noPrice: 80, volume: 5000, timeLeft: 'Sun 1:00PM', type: 'PREGAME', isAsymmetrical: true, trueProb: 35, edge: 13 },
    { id: 'as-2', event: 'KC vs BAL', marketName: 'Next Play: Turnover', book: 'Kalshi', yesPrice: 4, noPrice: 97, volume: 2000, timeLeft: 'Live', type: 'IN_GAME', isAsymmetrical: true, trueProb: 9, edge: 5 },
    { id: 'as-3', event: 'GB vs MIN', marketName: 'Love 300+ Pass Yds', book: 'Kalshi', yesPrice: 18, noPrice: 84, volume: 4100, timeLeft: 'Sun 1:00PM', type: 'PREGAME', isAsymmetrical: true, trueProb: 28, edge: 10 },
];

const DECAY_DATA = [
  { time: '3:00', posProb: 81, turnProb: 9.4, label: 'Baseline' },
  { time: '2:30', posProb: 78, turnProb: 7.9, label: '' },
  { time: '2:00', posProb: 76, turnProb: 6.4, label: '2-Min Warning' },
  { time: '1:30', posProb: 73, turnProb: 4.8, label: '' },
  { time: '1:00', posProb: 49, turnProb: 3.2, label: 'Step Decay' },
  { time: '0:30', posProb: 7, turnProb: 1.6, label: 'Collapse' },
  { time: '0:05', posProb: 1, turnProb: 0.3, label: 'Expiry' },
];

interface PredictionMarketsProps {
  activeLeague: League;
}

interface WorldCupMarket {
    id: string;
    event: string;
    marketName: string;
    type: 'PREGAME' | 'IN_GAME';
    kalshiYes: number;
    kalshiNo: number;
    polyYes: number;
    polyNo: number;
    modelProb: number;
    volume: number;
    timeLeft: string;
    group: string;
}

interface WorldCupPosition {
    id: string;
    marketId: string;
    marketName: string;
    book: 'Kalshi' | 'Polymarket';
    outcome: 'YES' | 'NO';
    entryPrice: number;
    contracts: number;
    timestamp: string;
    type: 'PREGAME' | 'IN_GAME';
}

const INITIAL_WORLD_CUP_MARKETS: WorldCupMarket[] = [
    {
        id: 'wc-pre-1',
        event: 'USA vs England',
        marketName: 'USA to Win or Draw Match',
        type: 'PREGAME',
        kalshiYes: 45,
        kalshiNo: 56,
        polyYes: 43,
        polyNo: 58,
        modelProb: 51,
        volume: 724000,
        timeLeft: 'Starts June 21, 2026',
        group: 'Group B Match'
    },
    {
        id: 'wc-pre-2',
        event: 'Group B Standing',
        marketName: 'USA to Win Group B Outright',
        type: 'PREGAME',
        kalshiYes: 48,
        kalshiNo: 53,
        polyYes: 44,
        polyNo: 57,
        modelProb: 54,
        volume: 1250000,
        timeLeft: 'Group Stage Hub',
        group: 'Group Stage'
    },
    {
        id: 'wc-pre-3',
        event: 'Tournament Outright',
        marketName: 'Brazil to win World Cup 2026',
        type: 'PREGAME',
        kalshiYes: 14,
        kalshiNo: 87,
        polyYes: 16,
        polyNo: 85,
        modelProb: 19,
        volume: 4850000,
        timeLeft: 'Ends July 19, 2026',
        group: 'Outrights'
    },
    {
        id: 'wc-pre-4',
        event: 'Tournament Outright',
        marketName: 'France to win World Cup 2026',
        type: 'PREGAME',
        kalshiYes: 18,
        kalshiNo: 83,
        polyYes: 17,
        polyNo: 84,
        modelProb: 21,
        volume: 3900000,
        timeLeft: 'Ends July 19, 2026',
        group: 'Outrights'
    },
    {
        id: 'wc-pre-5',
        event: 'Group C Standing',
        marketName: 'Mexico to Qualify from Group Stage',
        type: 'PREGAME',
        kalshiYes: 68,
        kalshiNo: 33,
        polyYes: 62,
        polyNo: 39,
        modelProb: 66,
        volume: 540000,
        timeLeft: 'Starts June 15, 2026',
        group: 'Group Stage'
    },
    {
        id: 'wc-in-1',
        event: 'USA vs Germany (Live)',
        marketName: 'Live: Match ends in Draw',
        type: 'IN_GAME',
        kalshiYes: 55,
        kalshiNo: 46,
        polyYes: 58,
        polyNo: 43,
        modelProb: 56,
        volume: 145000,
        timeLeft: 'Live 78\'',
        group: 'In-Play Live'
    },
    {
        id: 'wc-in-2',
        event: 'USA vs Germany (Live)',
        marketName: 'Live: Christian Pulisic to Score Next',
        type: 'IN_GAME',
        kalshiYes: 18,
        kalshiNo: 83,
        polyYes: 15,
        polyNo: 86,
        modelProb: 22,
        volume: 98000,
        timeLeft: 'Live 78\'',
        group: 'In-Play Live'
    },
    {
        id: 'wc-in-3',
        event: 'USA vs Germany (Live)',
        marketName: 'Live: Total Goals Over 3.5',
        type: 'IN_GAME',
        kalshiYes: 77,
        kalshiNo: 24,
        polyYes: 74,
        polyNo: 27,
        modelProb: 80,
        volume: 240000,
        timeLeft: 'Live 78\'',
        group: 'In-Play Live'
    },
    {
        id: 'wc-in-4',
        event: 'USA vs Germany (Live)',
        marketName: 'Live: Penalty Shootout Required',
        type: 'IN_GAME',
        kalshiYes: 34,
        kalshiNo: 67,
        polyYes: 37,
        polyNo: 64,
        modelProb: 35,
        volume: 85000,
        timeLeft: 'Live 78\'',
        group: 'In-Play Live'
    }
];

const COMMENTARY_LIST = [
    { min: "78:15", text: "Christian Pulisic storms down the left flank, nutmegs Rüdiger and fires a cross, but Neuer punches it clear!", highlight: true },
    { min: "79:40", text: "Germany substitutions: Jamal Musiala comes off for Wirtz. Goretzka instructions on direct midfield press.", highlight: false },
    { min: "81:05", text: "Dangerous free kick for Germany at the edge of the box. Kimmich floats a ball in, Tah rises but heads it wide!", highlight: true },
    { min: "82:30", text: "Tyler Adams stops Havertz counter-attack with a professional yellow-card foul. Midfield lock-down mode activated.", highlight: false },
    { min: "84:10", text: "Rain begins pouring heavier at MetLife Stadium. Ball slickness index increasing, affecting passing accuracy.", highlight: false },
    { min: "85:50", text: "USA Counter! Reyna holds play, splits defenders to find Balogun, whose low shot is deflected out for a crucial corner!", highlight: true },
    { min: "87:00", text: "Incredibly tense atmospheres. Implied draw probability spiking across both exchange order books.", highlight: true },
    { min: "88:25", text: "Neuer slows down the goal kick, checking tactical setup. Germany content with the road point.", highlight: false },
    { min: "89:45", text: "Pulisic wins a free kick on the left corner. McKennie and Robinson crowding the box!", highlight: true }
];

export const PredictionMarkets: React.FC<PredictionMarketsProps> = ({ activeLeague }) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'world-cup' | 'analysis'>('world-cup');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'IN_GAME' | 'PREGAME' | 'ASYMMETRY'>('ALL');
  const [markets, setMarkets] = useState<BinaryMarket[]>([]);

  // World Cup state
  const [wcMarkets, setWcMarkets] = useState<WorldCupMarket[]>(INITIAL_WORLD_CUP_MARKETS);
  const [wcPositions, setWcPositions] = useState<WorldCupPosition[]>([
      {
          id: 'pos-1',
          marketId: 'wc-pre-1',
          marketName: 'USA to Win or Draw Match',
          book: 'Polymarket',
          outcome: 'YES',
          entryPrice: 40,
          contracts: 1000,
          timestamp: '10 mins ago',
          type: 'PREGAME'
      }
  ]);
  const [wallet, setWallet] = useState<number>(10000); // 10k mock funds
  const [wcActiveSubTab, setWcActiveSubTab] = useState<'ALL' | 'PREGAME' | 'IN_GAME' | 'ARBITRAGE' | 'PORTFOLIO'>('ALL');
  const [commentaryIdx, setCommentaryIdx] = useState<number>(0);
  const [wcLiveMin, setWcLiveMin] = useState<number>(78);
  const [wcLiveSec, setWcLiveSec] = useState<number>(24);
  const [wcLiveScore, setWcLiveScore] = useState<string>("USA 1 - 1 GER");
  const [selectedWcMarket, setSelectedWcMarket] = useState<WorldCupMarket | null>(null);
  const [wcSelectedBook, setWcSelectedBook] = useState<'Kalshi' | 'Polymarket'>('Polymarket');
  const [wcSelectedTradeType, setWcSelectedTradeType] = useState<'YES' | 'NO'>('YES');
  const [wcTradeAmount, setWcTradeAmount] = useState<number>(250);
  const [wcLogAlert, setWcLogAlert] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Background Real-Time Synchronization State
  const [lastSyncLagMs, setLastSyncLagMs] = useState(0.74);
  const [syncPulse, setSyncPulse] = useState(false);

  useEffect(() => {
      setMarkets(generateMarkets());
      // Simulate live price updates
      const interval = setInterval(() => {
          setMarkets(prev => prev.map(m => {
              if (m.type === 'IN_GAME' || Math.random() > 0.8) {
                  const shift = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
                  return { ...m, yesPrice: Math.min(99, Math.max(1, m.yesPrice + shift)) };
              }
              return m;
          }));

          // Tweak World Cup markets to update ticking feed
          setWcMarkets(prev => prev.map(m => {
              const shiftK = Math.floor(Math.random() * 3) - 1;
              const shiftP = Math.floor(Math.random() * 3) - 1;
              
              const kYes = Math.min(98, Math.max(2, m.kalshiYes + shiftK));
              const pYes = Math.min(98, Math.max(2, m.polyYes + shiftP));
              
              return {
                  ...m,
                  kalshiYes: kYes,
                  kalshiNo: 100 - kYes,
                  polyYes: pYes,
                  polyNo: 100 - pYes,
                  // Volume increment
                  volume: m.volume + Math.floor(Math.random() * 120)
              };
          }));

          // Ticker simulation
          setWcLiveSec(s => {
              const nextS = (s + 15) % 60;
              if (nextS < s) {
                  setWcLiveMin(m => {
                      if (m >= 90) return 90;
                      // Advance commentary
                      setCommentaryIdx(c => (c + 1) % COMMENTARY_LIST.length);
                      return m + 1;
                  });
              }
              return nextS;
          });

      }, 3000);

      // Background real-time synchronization parity check for low-duration assets (IN_GAME)
      const paritySyncInterval = setInterval(() => {
          setSyncPulse(true);
          setTimeout(() => {
              setLastSyncLagMs(parseFloat((0.3 + Math.random() * 0.5).toFixed(2)));
              setSyncPulse(false);
              // Ensure price parity & data freshness for low-duration assets (IN_GAME)
              setMarkets(prev => prev.map(m => {
                  if (m.type === 'IN_GAME') {
                      const impliedNo = Math.max(1, 100 - m.yesPrice);
                      return { ...m, noPrice: impliedNo };
                  }
                  return m;
              }));
              setWcMarkets(prev => prev.map(m => {
                  if (m.type === 'IN_GAME') {
                      const avg = Math.round((m.kalshiYes + m.polyYes) / 2);
                      if (Math.abs(m.kalshiYes - m.polyYes) > 5) {
                          return {
                              ...m,
                              kalshiYes: avg,
                              kalshiNo: 100 - avg,
                              polyYes: avg,
                              polyNo: 100 - avg
                          };
                      }
                  }
                  return m;
              }));
          }, 150);
      }, 4000);

      return () => {
          clearInterval(interval);
          clearInterval(paritySyncInterval);
      };
  }, []);

  // Volatility Shocks
  const triggerShock = (type: 'usa-goal' | 'ger-goal' | 'red-card' | 'sim-tick') => {
      if (type === 'usa-goal') {
          setWcLiveScore("USA 2 - 1 GER");
          setWcLogAlert("⚡ GOAL USA! Pulisic blasts inside path! Volatility spiking.");
          setWcMarkets(prev => prev.map(m => {
              if (m.id === 'wc-in-1') { // Draw decreases
                  return { ...m, kalshiYes: 18, kalshiNo: 81, polyYes: 20, polyNo: 79, modelProb: 15 };
              }
              if (m.id === 'wc-in-2') { // Pulisic score yes drops (fulfilled)
                  return { ...m, kalshiYes: 99, kalshiNo: 1, polyYes: 99, polyNo: 1, modelProb: 100 };
              }
              if (m.id === 'wc-in-3') { // Over 2.5 goals yes wins
                  return { ...m, kalshiYes: 99, kalshiNo: 1, polyYes: 99, polyNo: 1, modelProb: 100 };
              }
              if (m.id === 'wc-pre-1' || m.id === 'wc-pre-2') { // USA outrights win probability rises
                  return { ...m, kalshiYes: Math.min(95, m.kalshiYes + 25), polyYes: Math.min(95, m.polyYes + 25), modelProb: Math.min(95, m.modelProb + 24) };
              }
              return m;
          }));
      } else if (type === 'ger-goal') {
          setWcLiveScore("USA 1 - 2 GER");
          setWcLogAlert("⚡ GOAL GERMANY! Havertz headers bottom corner. Market adapting...");
          setWcMarkets(prev => prev.map(m => {
              if (m.id === 'wc-in-1') { // Draw decreases
                  return { ...m, kalshiYes: 22, kalshiNo: 77, polyYes: 24, polyNo: 75, modelProb: 20 };
              }
              if (m.id === 'wc-pre-1' || m.id === 'wc-pre-2') { // USA outrights win probability drops
                  return { ...m, kalshiYes: Math.max(10, m.kalshiYes - 20), polyYes: Math.max(10, m.polyYes - 20), modelProb: Math.max(10, m.modelProb - 18) };
              }
              return m;
          }));
      } else if (type === 'red-card') {
          setWcLogAlert("⚡ RED CARD issued to Germany center-back! USA leverage spiking!");
          setWcMarkets(prev => prev.map(m => {
              if (m.id === 'wc-in-1' || m.id === 'wc-pre-1') { // USA win chance rises
                  return { ...m, kalshiYes: Math.min(95, m.kalshiYes + 12), polyYes: Math.min(95, m.polyYes + 12), modelProb: Math.min(95, m.modelProb + 15) };
              }
              return m;
          }));
      } else if (type === 'sim-tick') {
           setWcLiveMin(m => m + 1 >= 90 ? 90 : m + 1);
           setCommentaryIdx(c => (c + 1) % COMMENTARY_LIST.length);
           setWcLogAlert("⚡ Game clock advanced. Implied rates decaying...");
      }

      setTimeout(() => {
          setWcLogAlert(null);
      }, 5000);
  };

  // Trade Executor
  const executeWcTrade = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedWcMarket) return;

      const price = wcSelectedBook === 'Kalshi' 
          ? (wcSelectedTradeType === 'YES' ? selectedWcMarket.kalshiYes : selectedWcMarket.kalshiNo)
          : (wcSelectedTradeType === 'YES' ? selectedWcMarket.polyYes : selectedWcMarket.polyNo);
      
      const dollarsSpend = wcTradeAmount;
      if (dollarsSpend > wallet) {
          alert("Insufficient virtual treasury balance!");
          return;
      }

      const contractsBought = Math.floor((dollarsSpend / (price / 100)));
      if (contractsBought <= 0) {
          alert("Trade allocation is too small for current pricing!");
          return;
      }

      const newPos: WorldCupPosition = {
          id: `pos-${Date.now()}`,
          marketId: selectedWcMarket.id,
          marketName: selectedWcMarket.marketName,
          book: wcSelectedBook,
          outcome: wcSelectedTradeType,
          entryPrice: price,
          contracts: contractsBought,
          timestamp: 'Just now',
          type: selectedWcMarket.type
      };

      setWallet(prev => prev - dollarsSpend);
      setWcPositions(prev => [newPos, ...prev]);
      setSuccessToast(`SUCCESS: Acquired ${contractsBought} contracts at ${price}¢!`);
      setSelectedWcMarket(null);

      setTimeout(() => {
          setSuccessToast(null);
      }, 4000);
  };

  // Cash Out liquidator
  const cashOutPosition = (pos: WorldCupPosition) => {
      // Find current market price
      const market = wcMarkets.find(m => m.id === pos.marketId);
      if (!market) return;

      const currentPrice = pos.book === 'Kalshi'
          ? (pos.outcome === 'YES' ? market.kalshiYes : market.kalshiNo)
          : (pos.outcome === 'YES' ? market.polyYes : market.polyNo);

      const returnedCash = pos.contracts * (currentPrice / 100);
      setWallet(prev => prev + returnedCash);
      setWcPositions(prev => prev.filter(p => p.id !== pos.id));
      
      const profit = (currentPrice - pos.entryPrice) * pos.contracts / 100;
      setSuccessToast(`LIQUIDATED: Cashed out for $${returnedCash.toFixed(2)} (${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} PnL)!`);

      setTimeout(() => {
          setSuccessToast(null);
      }, 4000);
  };

  // Kelly Recommendation Calculator
  const getKellyRecommendation = (m: WorldCupMarket) => {
      const price = wcSelectedBook === 'Kalshi' 
          ? (wcSelectedTradeType === 'YES' ? m.kalshiYes : m.kalshiNo)
          : (wcSelectedTradeType === 'YES' ? m.polyYes : m.polyNo);

      const winProb = wcSelectedTradeType === 'YES' ? (m.modelProb / 100) : (1 - (m.modelProb / 100));
      const impliedProb = price / 100;
      const b = (1 - impliedProb) / impliedProb; // decimal odds payoff b-1

      if (winProb <= impliedProb) return 0; // No edge

      // Kelly fraction = (b * p - q) / b
      const q = 1 - winProb;
      const f = (b * winProb - q) / b;
      
      // Use standard Quarter-Kelly for safety
      const quarterKelly = f * 0.25;
      return Math.max(0, parseFloat((quarterKelly * wallet).toFixed(2)));
  };

  // Arbitrage Scanner logic
  // Returns contracts where buying Yes on exchange A and No on exchange B is < 100
  const arbitrageDeals = wcMarkets.filter(m => {
      const polyYkalshiN = m.polyYes + m.kalshiNo;
      const kalshiYpolyN = m.kalshiYes + m.polyNo;
      return polyYkalshiN < 98 || kalshiYpolyN < 98;
  });

  const filteredWcMarkets = wcMarkets.filter(m => {
      if (wcActiveSubTab === 'ALL') return true;
      if (wcActiveSubTab === 'PREGAME') return m.type === 'PREGAME';
      if (wcActiveSubTab === 'IN_GAME') return m.type === 'IN_GAME';
      if (wcActiveSubTab === 'ARBITRAGE') {
          const polyYkalshiN = m.polyYes + m.kalshiNo;
          const kalshiYpolyN = m.kalshiYes + m.polyNo;
          return polyYkalshiN < 98 || kalshiYpolyN < 98;
      }
      return true;
  });

  const filteredMarkets = markets.filter(m => {
      if (marketFilter === 'ALL') return true;
      if (marketFilter === 'ASYMMETRY') return m.isAsymmetrical;
      return m.type === marketFilter;
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
               <Globe className="text-pink-400" size={24} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{activeLeague} Binary Edge Alpha</h1>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed mb-4">
            Direct feed of Event Contracts from <span className="text-pink-400 font-bold underline">Kalshi</span> and <span className="text-indigo-400 font-bold underline">Polymarket</span>. 
            Identify and trade mispriced probabilities, pregame hedges, and real-time in-play contracts.
          </p>
          <div className="inline-flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-900/80 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <span className={`w-2 h-2 rounded-full ${syncPulse ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'}`}></span>
            <span className="font-bold tracking-wider text-slate-300">LOW-DURATION SYNC:</span>
            <span>{syncPulse ? 'PARITY CHECKING...' : `VERIFIED (${lastSyncLagMs}ms parity lag)`}</span>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 shadow-2xl overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={clsx(
              "px-4 lg:px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0",
              activeTab === 'terminal' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Live Terminal
          </button>
          <button 
            onClick={() => setActiveTab('world-cup')}
            className={clsx(
              "px-4 lg:px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 relative",
              activeTab === 'world-cup' ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20" : "text-pink-400 hover:text-white"
            )}
          >
            <Trophy size={14} className={activeTab === 'world-cup' ? "animate-bounce" : "animate-pulse"} />
            World Cup 2026 Special
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={clsx(
              "px-4 lg:px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shrink-0",
              activeTab === 'analysis' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
            )}
          >
            Quant Analysis
          </button>
        </div>
      </div>

      {activeTab === 'world-cup' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* SUCCESS NOTIFICATION TOAST */}
              {successToast && (
                  <div className="fixed bottom-10 right-10 z-50 bg-emerald-950/90 border border-emerald-500 text-emerald-400 px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] font-mono text-xs flex items-center gap-3 animate-bounce">
                      <CheckCircle2 size={18} className="text-emerald-400 animate-spin" />
                      <span>{successToast}</span>
                  </div>
              )}

              {/* WORLD CUP MASTER SHOCK CONTAINER & STADIUM SCOREBOARD */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* SCOREBOARD ROW */}
                  <div className="lg:col-span-8 bg-gradient-to-r from-slate-900 via-[#131130] to-slate-900 border border-indigo-500/30 p-6 rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col justify-between min-h-[220px]">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <Trophy size={150} className="text-indigo-500" />
                      </div>

                      <div className="flex justify-between items-center z-10">
                          <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                              <span className="text-[10px] font-mono font-black text-indigo-300 uppercase tracking-widest">In-Play Hub // MetLife Stadium Stadium Feed</span>
                          </div>
                          <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded text-[9px] font-mono text-indigo-400 font-bold uppercase">FIFA WC Matchday 1</span>
                      </div>

                      {/* Score display */}
                      <div className="flex items-center justify-around my-4 z-10">
                          <div className="text-center">
                              <span className="text-[#00ffff] font-black text-[10px] uppercase font-mono tracking-widest">United States</span>
                              <div className="text-3xl lg:text-4xl font-extrabold text-white mt-1">USA 🇺🇸</div>
                          </div>
                          
                          <div className="text-center px-4 bg-black/40 rounded-2xl border border-slate-800 py-2">
                              <div className="text-3xl lg:text-4xl font-black font-mono tracking-wider text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">
                                  {wcLiveScore.includes("USA 1 - 1") && "1 - 1"}
                                  {wcLiveScore.includes("USA 2 - 1") && "2 - 1"}
                                  {wcLiveScore.includes("USA 1 - 2") && "1 - 2"}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 block mt-1 animate-pulse font-black text-emerald-400">
                                  {wcLiveMin}:{wcLiveSec < 10 ? `0${wcLiveSec}` : wcLiveSec}
                              </span>
                          </div>

                          <div className="text-center">
                              <span className="text-slate-400 font-black text-[10px] uppercase font-mono tracking-widest">Germany</span>
                              <div className="text-3xl lg:text-4xl font-extrabold text-white mt-1">🇩🇪 GER</div>
                          </div>
                      </div>

                      {/* Live commentary bar */}
                      <div className="bg-black/60 border border-slate-800 p-3 rounded-xl z-10 flex items-center gap-3">
                          <div className="text-xs font-mono font-black text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded">
                              {COMMENTARY_LIST[commentaryIdx].min}
                          </div>
                          <p className="text-xs text-slate-300 font-light truncate flex-grow">
                              {COMMENTARY_LIST[commentaryIdx].text}
                          </p>
                          <span className="text-[9px] text-indigo-400 font-mono animate-pulse uppercase font-bold">● Reciprocity Engine</span>
                      </div>
                  </div>

                  {/* SHOCK TRIGGER PANEL */}
                  <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                      <div>
                          <h3 className="text-xs font-black text-white font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Zap size={14} className="text-cyan-400 animate-pulse" />
                              Volatility Shock Simulator
                          </h3>
                          <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                              Trigger direct game event shocks to instantly recalc market and fair value probabilities.
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-2">
                          <button 
                            onClick={() => triggerShock('usa-goal')}
                            className="bg-cyan-950/30 border border-cyan-500/40 hover:bg-cyan-500 hover:text-black py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-cyan-400 transition-all flex items-center justify-center gap-1.5"
                          >
                              🇺🇸 USA Goal
                          </button>
                          <button 
                            onClick={() => triggerShock('ger-goal')}
                            className="bg-slate-900 border border-slate-700 hover:border-yellow-500 hover:text-yellow-400 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-400 transition-all flex items-center justify-center gap-1.5"
                          >
                              🇩🇪 GER Goal
                          </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => triggerShock('red-card')}
                            className="bg-rose-950/30 border border-rose-500/40 hover:bg-rose-500 hover:text-white py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-rose-400 transition-all flex items-center justify-center gap-1.5"
                          >
                              🟥 GER Red Card
                          </button>
                          <button 
                            onClick={() => triggerShock('sim-tick')}
                            className="bg-indigo-950/20 border border-indigo-500/30 hover:border-indigo-400 hover:text-indigo-300 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-indigo-400 transition-all flex items-center justify-center gap-1"
                          >
                              ⏱️ Advance Clock
                          </button>
                      </div>

                      {wcLogAlert && (
                          <div className="mt-4 p-2 bg-indigo-500/10 border border-indigo-500/40 rounded text-[10px] font-mono text-indigo-400 text-center animate-pulse">
                              {wcLogAlert}
                          </div>
                      )}
                  </div>
              </div>

              {/* WORLD CUP METRICS TAPE */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">MOCK TREASURY BALANCE</div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">${wallet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      <button 
                        onClick={() => { setWallet(10000); setWcPositions([]); }}
                        className="text-[8px] text-slate-400 hover:text-white font-mono uppercase tracking-widest underline mt-1"
                      >
                          Reset Portfolio Deck
                      </button>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">ACTIVE CONTRACT POSITIONS</div>
                      <div className="text-2xl font-black text-white font-mono">{wcPositions.length}</div>
                      <span className="text-[8px] text-indigo-400 font-mono uppercase tracking-widest block mt-1">
                          Holding {wcPositions.reduce((sum, p) => sum + p.contracts, 0)} contracts
                      </span>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                      <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1 flex items-center gap-1 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-ping"></span>
                          Exchange Arbitrage Spreads
                      </div>
                      <div className="text-2xl font-black text-pink-400 font-mono">
                          {arbitrageDeals.length} ACTIVE
                      </div>
                      {arbitrageDeals.length > 0 ? (
                          <span className="text-[8px] text-yellow-500 animate-pulse font-mono uppercase tracking-widest font-black block mt-1">
                              ⚠️ spread mispricing detected!
                          </span>
                      ) : (
                          <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest block mt-1">
                              Synchronized equilibrium
                          </span>
                      )}
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">PROSPECTIVE POSITION VALUE</div>
                      <div className="text-2xl font-black text-cyan-400 font-mono">
                          ${(wallet + wcPositions.reduce((sum, p) => {
                              const market = wcMarkets.find(m => m.id === p.marketId);
                              if (!market) return p.contracts * p.entryPrice / 100;
                              const price = p.book === 'Kalshi'
                                  ? (p.outcome === 'YES' ? market.kalshiYes : market.kalshiNo)
                                  : (p.outcome === 'YES' ? market.polyYes : market.polyNo);
                              return sum + (p.contracts * price / 100);
                          }, 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <span className="text-[8px] text-[#00ffff] font-mono tracking-widest font-black uppercase mt-1 block">
                          Real-time Unhedged Valuation
                      </span>
                  </div>
              </div>

              {/* WORLD CUP SUB-TABS */}
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 max-w-full overflow-x-auto gap-1">
                  {([
                      { id: 'ALL', label: 'All World Cup Contracts' },
                      { id: 'PREGAME', label: 'Pregame Special' },
                      { id: 'IN_GAME', label: 'Live In-Play Feed' },
                      { id: 'ARBITRAGE', label: 'Arbitrage Scanner' },
                      { id: 'PORTFOLIO', label: 'My Positions Ledger' }
                  ] as const).map(tab => {
                      const isArb = tab.id === 'ARBITRAGE';
                      const count = isArb ? arbitrageDeals.length : (tab.id === 'PORTFOLIO' ? wcPositions.length : 0);
                      return (
                          <button
                            key={tab.id}
                            onClick={() => {
                                setWcActiveSubTab(tab.id);
                                setSelectedWcMarket(null);
                            }}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2",
                                wcActiveSubTab === tab.id
                                    ? isArb 
                                        ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/25"
                                        : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                              {tab.label}
                              {count > 0 && (
                                  <span className={clsx(
                                      "px-1.5 py-0.5 rounded text-[8px] font-bold font-mono",
                                      wcActiveSubTab === tab.id ? "bg-black/20 text-current" : "bg-indigo-500/20 text-indigo-400"
                                  )}>
                                      {count}
                                  </span>
                              )}
                          </button>
                      );
                  })}
              </div>

              {/* TWO COLUMN GRID: MARKETS / LEDGER VS ORDER FORM */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  
                  {/* LEFT COLUMN: ACTIVE MARKETS LIST OR PORTFOLIO TABLE */}
                  <div className="xl:col-span-2 space-y-4">
                      {wcActiveSubTab === 'PORTFOLIO' ? (
                          /* PORTFOLIO POSITION LEDGER TABLE */
                          <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6">
                              <h3 className="text-base font-black text-white font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Layers size={16} className="text-cyan-400" />
                                  Holding Position Register
                              </h3>

                              {wcPositions.length === 0 ? (
                                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                                      <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">No active World Cup contracts of record.</p>
                                      <button 
                                        onClick={() => setWcActiveSubTab('ALL')}
                                        className="mt-4 px-4 py-2 bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-500 hover:text-white rounded text-[10px] font-black uppercase tracking-wider text-indigo-400 transition-all"
                                      >
                                          Browse Markets
                                      </button>
                                  </div>
                              ) : (
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-left font-mono text-xs">
                                          <thead>
                                              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                                                  <th className="py-3">Event Contract</th>
                                                  <th className="py-3">Exchange</th>
                                                  <th className="py-3">Side</th>
                                                  <th className="py-3 text-center">Qty</th>
                                                  <th className="py-3 text-right">Entry Price</th>
                                                  <th className="py-3 text-right">Live Price</th>
                                                  <th className="py-3 text-right text-cyan-400">Unrealized PnL</th>
                                                  <th className="py-3 text-right">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-900">
                                              {wcPositions.map(pos => {
                                                  const market = wcMarkets.find(m => m.id === pos.marketId);
                                                  const livePrice = market 
                                                      ? (pos.outcome === 'YES' 
                                                          ? (pos.book === 'Kalshi' ? market.kalshiYes : market.polyYes)
                                                          : (pos.book === 'Kalshi' ? market.kalshiNo : market.polyNo))
                                                      : pos.entryPrice;
                                                  
                                                  const entryValue = pos.contracts * pos.entryPrice / 100;
                                                  const liveValue = pos.contracts * livePrice / 100;
                                                  const pnl = liveValue - entryValue;

                                                  return (
                                                      <tr key={pos.id} className="hover:bg-white/5 transition-colors group">
                                                          <td className="py-4 font-sans font-bold">
                                                              {pos.marketName}
                                                              <span className="block text-[9px] text-slate-500 font-mono font-medium mt-0.5">{pos.type} // {pos.timestamp}</span>
                                                          </td>
                                                          <td className="py-4">
                                                              <span className={clsx(
                                                                  "px-2 py-0.5 rounded text-[9px] border font-sans font-black",
                                                                  pos.book === 'Kalshi' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                              )}>
                                                                  {pos.book}
                                                              </span>
                                                          </td>
                                                          <td className="py-4">
                                                              <span className={clsx(
                                                                  "px-2 py-0.5 rounded text-[9px] font-black",
                                                                  pos.outcome === 'YES' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                                              )}>
                                                                  {pos.outcome}
                                                              </span>
                                                          </td>
                                                          <td className="py-4 text-center text-white font-bold">{pos.contracts}</td>
                                                          <td className="py-4 text-right text-slate-400">{pos.entryPrice}¢</td>
                                                          <td className="py-4 text-right text-white font-black animate-pulse">{livePrice}¢</td>
                                                          <td className={clsx(
                                                              "py-4 text-right font-black font-mono text-xs",
                                                              pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                                                          )}>
                                                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                                          </td>
                                                          <td className="py-4 text-right">
                                                              <button
                                                                onClick={() => cashOutPosition(pos)}
                                                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded border border-rose-500/30 text-[9px] font-black uppercase text-rose-400 transition-all"
                                                              >
                                                                  Cash Out
                                                              </button>
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                              )}
                          </div>
                      ) : (
                          /* MARKETS CARDS LIST */
                          <div className="space-y-4">
                              {filteredWcMarkets.length === 0 ? (
                                  <div className="text-center py-12 bg-slate-950/80 border border-slate-800 rounded-3xl">
                                      <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">No matching World Cup contracts found.</p>
                                  </div>
                              ) : (
                                  filteredWcMarkets.map(m => {
                                      // Highlight arbitrage opportunities
                                      const isArbPolyY = m.polyYes + m.kalshiNo < 98;
                                      const isArbKalshiY = m.kalshiYes + m.polyNo < 98;
                                      const hasArb = isArbPolyY || isArbKalshiY;

                                      return (
                                          <div 
                                            key={m.id} 
                                            className={clsx(
                                                "p-6 bg-slate-950/80 border rounded-3xl hover:border-indigo-500/40 transition-all relative overflow-hidden group",
                                                hasArb ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-gradient-to-r from-yellow-950/10 to-transparent" : "border-slate-800"
                                            )}
                                          >
                                              {hasArb && (
                                                  <div className="absolute top-0 right-0 bg-yellow-500 text-black font-mono font-black text-[8px] uppercase px-4 py-1 tracking-widest rounded-bl-xl shadow-lg z-10 animate-pulse">
                                                      ⚡ arbitrage mismatch detected! 
                                                  </div>
                                              )}

                                              {/* Row 1: Header */}
                                              <div className="flex justify-between items-start mb-3">
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-[10px] text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{m.event}</span>
                                                      <span className="text-[9px] text-[#00ffff] font-mono font-bold bg-black/40 px-2 py-0.5 rounded">{m.group}</span>
                                                      <span className="text-[9px] text-slate-500 font-mono">{m.timeLeft}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                      <span className="text-[10px] text-slate-400 font-mono uppercase">Model True:</span>
                                                      <span className="text-xs font-mono font-black bg-white/10 px-2 py-0.5 rounded text-white">{m.modelProb}%</span>
                                                  </div>
                                              </div>

                                              {/* Row 2: Title & Details */}
                                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-2 mb-4">
                                                  <div>
                                                      <h4 className="text-white group-hover:text-pink-400 transition-colors font-black text-lg leading-tight">{m.marketName}</h4>
                                                      <div className="text-[10px] font-mono text-slate-500 uppercase mt-1 tracking-widest">
                                                          Order Volume: ${(m.volume / 1000).toFixed(1)}k synchronized contracts
                                                      </div>
                                                  </div>
                                                  
                                                  {/* Calculated Edge Badges */}
                                                  <div className="flex gap-2">
                                                      {m.modelProb > m.polyYes && (
                                                          <span className="bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[9px] text-emerald-400 font-mono font-black uppercase tracking-wider">
                                                              Polymarket Yes Edge: +{(m.modelProb - m.polyYes).toFixed(0)}%
                                                          </span>
                                                      )}
                                                      {m.modelProb > m.kalshiYes && (
                                                          <span className="bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[9px] text-emerald-400 font-mono font-black uppercase tracking-wider">
                                                              Kalshi Yes Edge: +{(m.modelProb - m.kalshiYes).toFixed(0)}%
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* Row 3: Bid blocks for both exchanges */}
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-900">
                                                  {/* Kalshi Order Block */}
                                                  <div className="p-3 bg-black/40 border border-slate-900 rounded-2xl flex items-center justify-between">
                                                      <div className="flex items-center gap-2">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                                          <span className="text-[11px] font-sans font-black text-pink-400 uppercase tracking-widest">Kalshi Book</span>
                                                      </div>
                                                      <div className="flex gap-2">
                                                          <button 
                                                            onClick={() => {
                                                                setSelectedWcMarket(m);
                                                                setWcSelectedBook('Kalshi');
                                                                setWcSelectedTradeType('YES');
                                                            }}
                                                            className={clsx(
                                                                "px-3 py-1.5 rounded-lg text-xs font-black font-mono border hover:scale-105 transition-all text-center min-w-[65px]",
                                                                isArbKalshiY 
                                                                    ? "bg-yellow-500 border-yellow-400 text-black"
                                                                    : "bg-emerald-950/10 hover:bg-emerald-500 hover:text-black border-emerald-500/30 text-emerald-400"
                                                            )}
                                                          >
                                                              YES {m.kalshiYes}¢
                                                          </button>
                                                          <button 
                                                            onClick={() => {
                                                                setSelectedWcMarket(m);
                                                                setWcSelectedBook('Kalshi');
                                                                setWcSelectedTradeType('NO');
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-black font-mono bg-rose-950/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 hover:scale-105 transition-all text-center min-w-[65px]"
                                                          >
                                                              NO {m.kalshiNo}¢
                                                          </button>
                                                      </div>
                                                  </div>

                                                  {/* Polymarket Order Block */}
                                                  <div className="p-3 bg-black/40 border border-slate-900 rounded-2xl flex items-center justify-between">
                                                      <div className="flex items-center gap-2">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-550 bg-indigo-500 text-indigo-400"></span>
                                                          <span className="text-[11px] font-sans font-black text-indigo-400 uppercase tracking-widest">Polymarket</span>
                                                      </div>
                                                      <div className="flex gap-2">
                                                          <button 
                                                            onClick={() => {
                                                                setSelectedWcMarket(m);
                                                                setWcSelectedBook('Polymarket');
                                                                setWcSelectedTradeType('YES');
                                                            }}
                                                            className={clsx(
                                                                "px-3 py-1.5 rounded-lg text-xs font-black font-mono border hover:scale-105 transition-all text-center min-w-[65px]",
                                                                isArbPolyY 
                                                                    ? "bg-yellow-500 border-yellow-400 text-black font-black"
                                                                    : "bg-emerald-950/10 hover:bg-emerald-500 hover:text-black border-emerald-500/30 text-emerald-400"
                                                            )}
                                                          >
                                                              YES {m.polyYes}¢
                                                          </button>
                                                          <button 
                                                            onClick={() => {
                                                                setSelectedWcMarket(m);
                                                                setWcSelectedBook('Polymarket');
                                                                setWcSelectedTradeType('NO');
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-black font-mono bg-rose-950/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 hover:scale-105 transition-all text-center min-w-[65px]"
                                                          >
                                                              NO {m.polyNo}¢
                                                          </button>
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      )}
                  </div>
                  
                  {/* RIGHT COLUMN: INTERACTIVE TICKET SLIP MODAL / DETAIL FLIGHT */}
                  <div className="xl:col-span-1">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sticky top-28 self-start">
                          <div className="flex items-center gap-2 border-b border-slate-900 pb-4 mb-4">
                              <ArrowRightLeft className="text-pink-500" size={18} />
                              <h3 className="text-base font-black text-white font-mono uppercase tracking-widest">
                                  Executive Slip Desk
                              </h3>
                          </div>

                          {selectedWcMarket ? (
                              <form onSubmit={executeWcTrade} className="space-y-6">
                                  <div className="p-4 bg-slate-900/55 border border-slate-800 rounded-2xl">
                                      <span className="text-[9px] text-slate-500 font-mono uppercase font-black block mb-0.5">{selectedWcMarket.event}</span>
                                      <h4 className="text-white font-bold text-sm leading-snug">{selectedWcMarket.marketName}</h4>
                                      <div className="flex justify-between items-center mt-3 text-[10px] font-mono pt-2 border-t border-slate-800/80">
                                          <span className="text-slate-500 font-bold uppercase tracking-widest">Implied True:</span>
                                          <span className="text-white font-bold font-mono">{selectedWcMarket.modelProb}%</span>
                                      </div>
                                  </div>

                                  {/* Route Exchange Selector */}
                                  <div>
                                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono block mb-2">Exchanges Router Routing</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setWcSelectedBook('Kalshi')}
                                            className={clsx(
                                                "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-center border font-mono",
                                                wcSelectedBook === 'Kalshi'
                                                    ? "bg-pink-600 border-pink-500 text-white shadow-md shadow-pink-500/20"
                                                    : "bg-transparent border-slate-800 text-slate-400 hover:text-white"
                                            )}
                                          >
                                              Kalshi Secure
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setWcSelectedBook('Polymarket')}
                                            className={clsx(
                                                "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-center border font-mono",
                                                wcSelectedBook === 'Polymarket'
                                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                                                    : "bg-transparent border-slate-800 text-slate-400 hover:text-white"
                                            )}
                                          >
                                              Polymarket Ledger
                                          </button>
                                      </div>
                                  </div>

                                  {/* Bid Side Selector (YES/NO) */}
                                  <div>
                                      <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono block mb-2">Position Direction Contract Buy Side</label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setWcSelectedTradeType('YES')}
                                            className={clsx(
                                                "py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border font-mono transition-all",
                                                wcSelectedTradeType === 'YES'
                                                    ? "bg-emerald-900/40 border-emerald-500 text-emerald-400"
                                                    : "bg-transparent border-slate-800 text-slate-500 hover:text-white"
                                            )}
                                          >
                                              Buy YES (Bid @ {wcSelectedBook === 'Kalshi' ? selectedWcMarket.kalshiYes : selectedWcMarket.polyYes}¢)
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setWcSelectedTradeType('NO')}
                                            className={clsx(
                                                "py-2.5 rounded-lg text-xs font-black uppercase tracking-widest border font-mono transition-all",
                                                wcSelectedTradeType === 'NO'
                                                    ? "bg-rose-955 bg-rose-950/40 border-rose-500 text-rose-400"
                                                    : "bg-transparent border-slate-800 text-slate-500 hover:text-white"
                                            )}
                                          >
                                              Buy NO (Bid @ {wcSelectedBook === 'Kalshi' ? selectedWcMarket.kalshiNo : selectedWcMarket.polyNo}¢)
                                          </button>
                                      </div>
                                  </div>

                                  {/* Stake Allocations with Quick Prefills */}
                                  <div>
                                      <div className="flex justify-between items-center mb-2">
                                          <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-mono">Simulated Cash Wager Spend</label>
                                          <span className="text-[10px] text-slate-400 font-mono">Max: ${wallet.toFixed(0)}</span>
                                      </div>
                                      <div className="flex gap-2">
                                          <span className="bg-slate-900 border border-slate-800 flex items-center pl-3 pr-1 text-slate-400 text-xs rounded-xl font-mono">$</span>
                                          <input 
                                            type="number"
                                            value={wcTradeAmount}
                                            onChange={(e) => setWcTradeAmount(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none"
                                            max={wallet}
                                          />
                                      </div>
                                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                                          {[100, 250, 500, 1000].map(amt => (
                                              <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setWcTradeAmount(amt)}
                                                className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 py-1 rounded text-[9px] font-mono transition-all"
                                              >
                                                  ${amt}
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  {/* ADVANCED REVELATION: KELLY ADVISOR MODULE */}
                                  <div className="p-4 bg-slate-900/30 border border-indigo-500/20 rounded-2xl font-mono text-[10px]">
                                      <div className="flex items-center gap-1.5 text-indigo-400 uppercase tracking-wider font-black mb-1.5">
                                          <Calculator size={12} />
                                          Kelly Advisor Recommendation
                                      </div>
                                      {getKellyRecommendation(selectedWcMarket) > 0 ? (
                                          <div className="space-y-2">
                                              <p className="text-slate-300 leading-relaxed font-light">
                                                  Based on our model win probability and exchange pricing, an edge of <strong className="text-pink-400">+{(selectedWcMarket.modelProb - (wcSelectedBook === 'Kalshi' ? (wcSelectedTradeType === 'YES' ? selectedWcMarket.kalshiYes : selectedWcMarket.kalshiNo) : (wcSelectedTradeType === 'YES' ? selectedWcMarket.polyYes : selectedWcMarket.polyNo))).toFixed(0)}%</strong> is recognized.
                                              </p>
                                              <div className="bg-indigo-950/20 border-l-2 border-indigo-500 p-2 text-indigo-400 flex justify-between items-center">
                                                  <span>Suggested Stake (1/4 Kelly):</span>
                                                  <strong className="text-white text-[12px]">${getKellyRecommendation(selectedWcMarket).toFixed(0)}</strong>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setWcTradeAmount(Math.floor(getKellyRecommendation(selectedWcMarket)))}
                                                className="w-full py-1 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500 hover:text-white rounded text-[9px] font-black uppercase tracking-wider text-indigo-400 transition-all"
                                              >
                                                  Select Staking recommendation Size
                                              </button>
                                          </div>
                                      ) : (
                                          <p className="text-slate-500 leading-relaxed font-light">
                                              No mathematical edge resides on this specific outcome at current exchange listings. Staking of portfolio capital not advised.
                                          </p>
                                      )}
                                      
                                  </div>

                                  {/* Place Trade Action Buttons */}
                                  <div className="space-y-2">
                                      <button 
                                        type="submit"
                                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20"
                                      >
                                          Execute Options wager
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setSelectedWcMarket(null)}
                                        className="w-full py-2 border border-slate-800 text-slate-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                      >
                                          Abort Entry order
                                      </button>
                                  </div>
                              </form>
                          ) : (
                              <div className="text-center py-16 border border-dashed border-slate-905 border-slate-800 rounded-3xl">
                                  <Activity className="text-slate-600 mx-auto mb-4 animate-pulse" size={32} />
                                  <p className="text-slate-400 text-xs font-mono uppercase tracking-widest leading-relaxed px-4">
                                      No Contract Active. Choose YES/NO pricing from Kalshi or Polymarket books to invoke order ticket.
                                  </p>
                              </div>
                          )}
                      </div>
                  </div>

              </div>

          </div>
      ) : activeTab === 'terminal' ? (
          <div className="space-y-8">
              
              {/* TERMINAL CONTROLS */}
              <div className="flex gap-4 border-b border-slate-800 pb-4">
                  {(['ALL', 'IN_GAME', 'PREGAME', 'ASYMMETRY'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setMarketFilter(f)}
                        className={clsx(
                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                            marketFilter === f 
                                ? f === 'ASYMMETRY' ? "bg-yellow-500/20 border-yellow-500 text-yellow-400" : "bg-white text-black border-white"
                                : "bg-transparent border-transparent text-slate-500 hover:text-white hover:bg-slate-800"
                        )}
                      >
                          {f === 'ASYMMETRY' && <Zap size={12} className="inline mr-2" />}
                          {f.replace('_', ' ')}
                      </button>
                  ))}
              </div>

              {/* ASYMMETRY HIGHLIGHT HEADER (If Filter is ALL or ASYMMETRY) */}
              {(marketFilter === 'ALL' || marketFilter === 'ASYMMETRY') && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-yellow-500 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Zap size={64} className="text-yellow-500" />
                          </div>
                          <h3 className="text-yellow-400 font-bold uppercase text-xs mb-2 flex items-center gap-2">
                              <Zap size={14} /> Great Asymmetrical Bets
                          </h3>
                          <p className="text-slate-300 text-sm leading-relaxed mb-4">
                              Opportunities where the market prices an outcome below 25¢ ($0.25), but our models project &gt; 35% probability. Low risk, high convexity.
                          </p>
                          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                              Scanning {markets.filter(m => m.isAsymmetrical).length} Active Nodes...
                          </div>
                      </div>
                      
                      {/* Featured Asymmetry Cards */}
                      {markets.filter(m => m.isAsymmetrical).slice(0, 2).map(m => (
                          <div key={m.id} className="bg-slate-900/50 border border-yellow-500/20 p-6 rounded-2xl flex flex-col justify-between group hover:bg-yellow-900/10 transition-colors">
                              <div>
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-slate-500 font-bold bg-black/40 px-2 py-1 rounded">{m.event}</span>
                                          <span className={clsx("text-[10px] font-bold px-2 py-1 rounded border", m.book === 'Kalshi' ? "bg-pink-500/20 text-pink-400 border-pink-500/30" : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30")}>
                                              {m.book}
                                          </span>
                                      </div>
                                      <span className="text-[12px] bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 font-mono font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]">+{m.edge}% EDGE</span>
                                  </div>
                                  <h4 className="text-white font-bold text-lg leading-tight mb-4">{m.marketName}</h4>
                              </div>
                              <div className="flex items-end justify-between">
                                  <div>
                                      <div className="text-[10px] text-slate-500 uppercase font-black">Buy Price</div>
                                      <div className="text-3xl font-black text-yellow-400">${(m.yesPrice / 100).toFixed(2)}</div>
                                  </div>
                                  <div className="text-right">
                                       <div className="text-[10px] text-slate-500 uppercase font-black">Model True</div>
                                       <div className="text-xl font-bold text-white">{(m.trueProb! / 100).toFixed(2)}</div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* MARKET GRID */}
              <div className="grid grid-cols-1 gap-4">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 px-6 py-3 bg-slate-900/80 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800">
                      <div className="col-span-4">Event Contract</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-2 text-center">Market Vol</div>
                      <div className="col-span-2 text-center">YES (Bid)</div>
                      <div className="col-span-2 text-center">NO (Ask)</div>
                  </div>

                  {filteredMarkets.map(m => (
                      <div key={m.id} className="grid grid-cols-12 px-6 py-4 bg-black/40 border border-slate-800 rounded-xl items-center hover:border-indigo-500/30 transition-all group">
                          
                          {/* Event Name */}
                          <div className="col-span-4">
                              <div className="flex items-center gap-2 mb-1">
                                  {m.type === 'IN_GAME' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                                  <span className="text-xs font-bold text-slate-400">{m.event}</span>
                                  <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded border", m.book === 'Kalshi' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20")}>
                                      {m.book}
                                  </span>
                              </div>
                              <div className="text-base font-black text-white group-hover:text-pink-400 transition-colors">{m.marketName}</div>
                              {m.isAsymmetrical && (
                                  <div className="inline-block mt-1.5 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-black shadow-[0_0_5px_rgba(16,185,129,0.2)]">
                                      +{m.edge}% EDGE REVEALED
                                  </div>
                              )}
                          </div>

                          {/* Status */}
                          <div className="col-span-2 text-center">
                              <div className={clsx("text-xs font-mono font-bold", m.type === 'IN_GAME' ? "text-rose-400" : "text-slate-400")}>
                                  {m.timeLeft}
                              </div>
                              {m.isAsymmetrical && <div className="text-[9px] text-yellow-500 uppercase font-black tracking-widest mt-1">Asymmetric</div>}
                          </div>

                          {/* Volume */}
                          <div className="col-span-2 text-center">
                              <div className="text-xs font-mono text-slate-300">${(m.volume / 1000).toFixed(1)}k</div>
                          </div>

                          {/* YES PRICE */}
                          <div className="col-span-2 flex justify-center">
                              <button className="flex flex-col items-center justify-center bg-emerald-900/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 w-20 h-12 rounded-lg transition-all group/btn">
                                  <span className="text-xs font-bold text-emerald-500 group-hover/btn:text-black">Yes</span>
                                  <span className="text-lg font-black text-white group-hover/btn:text-black">{m.yesPrice}¢</span>
                              </button>
                          </div>

                          {/* NO PRICE */}
                          <div className="col-span-2 flex justify-center">
                              <button className="flex flex-col items-center justify-center bg-rose-900/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white hover:border-rose-400 w-20 h-12 rounded-lg transition-all group/btn">
                                  <span className="text-xs font-bold text-rose-500 group-hover/btn:text-white">No</span>
                                  <span className="text-lg font-black text-white">{m.noPrice}¢</span>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-700">
          {/* THE CHART SECTION */}
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 mb-10 overflow-hidden relative">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Probability Decay Dynamics</h3>
                <p className="text-slate-500 text-sm font-mono uppercase tracking-widest"> NFL TIED GAMES: FINAL 3:00 MINUTES</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Alpha Zone: 2:00 - 1:00
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded text-[10px] font-black text-pink-400 uppercase tracking-widest">
                  Latency Threshold: &lt;200ms
                </div>
              </div>
            </div>

            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DECAY_DATA}>
                  <defs>
                    <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="turnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10}} axisLine={false} label={{ value: 'Time Remaining', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 10 }} />
                  <YAxis stroke="#475569" tick={{fontSize: 10}} axisLine={false} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine x="1:00" stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'CRITICAL COLLAPSE', position: 'top', fill: '#f43f5e', fontSize: 10 }} />
                  <Area type="monotone" name="New Possession Prob" dataKey="posProb" stroke="#ec4899" strokeWidth={4} fill="url(#probGrad)" dot={{ r: 4, fill: '#ec4899' }} />
                  <Area type="monotone" name="Turnover Prob" dataKey="turnProb" stroke="#6366f1" strokeWidth={2} fill="url(#turnGrad)" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QUANT ANALYSIS REPORT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="glass-panel p-8 rounded-3xl border border-slate-800">
                <h2 className="text-xl font-black text-white uppercase mb-6 flex items-center gap-3">
                  <Calculator className="text-pink-400" />
                  Quantitative Analysis Summary
                </h2>
                <div className="prose prose-invert prose-pink max-w-none space-y-6 text-slate-300 font-light leading-relaxed">
                  <p>In tied football games with 3 minutes remaining, binary options on "new possession" events experience dramatic probability decay, moving from approximately <strong className="text-white">80% to near 0%</strong> as time expires.</p>
                  <p>At the 3:00 mark, the implied probability for a "yes" outcome sits at <strong className="text-pink-400">81%</strong>, driven by the high likelihood that the current drive will end before time expires. However, this probability collapses to approximately <strong className="text-rose-500">1%</strong> by the final 5 seconds.</p>
                  <div className="bg-black/40 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-pink-500">
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">Critical 2:00 to 1:00 Window</h4>
                    <p className="text-sm">The 2:00-1:00 window experiences a <strong className="text-white">27 percentage point drop</strong> in new possession probability—the steepest decline in the entire sequence.</p>
                  </div>
                  <h3 className="text-white font-bold uppercase text-sm mt-8">Execution Architecture: &lt;200ms Latency</h3>
                  <p className="text-sm">Probability shifts of 5-10% can occur within seconds. For sub-200ms total execution, traders combine Institutional-grade APIs with Cloud Edge compute (Cloudflare Workers) and Direct Exchange API access.</p>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              {/* LIVE EDGE MODULE */}
              <div className="glass-panel p-6 rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-900/10 to-transparent">
                <div className="flex items-center gap-3 mb-6">
                  <Radio className="text-pink-500 animate-pulse" size={20} />
                  <h3 className="text-lg font-black text-white uppercase">Live Alpha Feed</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">KC vs BAL (4th 2:55)</span>
                      <span className="text-emerald-400 font-mono text-[10px]">+11.2% Edge</span>
                    </div>
                    <div className="text-sm font-bold text-white uppercase">New Possession: YES</div>
                    <div className="flex justify-between mt-2 text-[10px] font-mono">
                      <span className="text-slate-500">Fair: $0.81</span>
                      <span className="text-pink-400">Kalshi: $0.70</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-6 py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-pink-500/20">Execute Fractional Kelly</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="mt-16 text-center text-[10px] text-slate-600 font-mono uppercase tracking-[0.3em]">Proprietary Model Feed v2025.2 // Sub-Second Synchronized</div>
    </div>
  );
};
