import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, Play, Pause, RefreshCw, AlertCircle, CheckCircle, XCircle, 
  Settings, Sliders, Activity, TrendingUp, Cpu, Server, ShieldCheck, 
  HelpCircle, ChevronRight, BarChart3, PieChart as PieIcon, Eye, Zap, ArrowRight, CornerDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell, ErrorBar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces for our live signal simulation
export interface SimulatedSignal {
  id: string;
  market_id: string;
  type: string;
  polymarket_price: number;
  kalshi_price: number;
  spread: number;
  volume: number;
  liquidity: number;
  timestamp: string;
  
  // Pipeline path tracking
  gated: boolean;
  gatingError?: 'liquidity' | 'spread' | 'volume';
  filterScore: number;
  filtered: boolean;
  decision?: {
    action: 'buy' | 'sell' | 'hold';
    size: number;
    edge: number;
    confidence: number;
    reason: string;
  };
  execution?: {
    status: 'filled' | 'failed' | 'pending';
    price: number;
    slippage: number;
  };
  
  // Visual positions for flowing particles
  x?: number;
  y?: number;
  currentStage: number; // 0: Ingest, 1: Gates, 2: Filters, 3: Agents, 4: Execution, 5: Done/Filtered Out
}

// 5-Layer Definition
interface StageDefinition {
  id: number;
  name: string;
  phase: string;
  icon: React.ComponentType<any>;
  color: string;
  glow: string;
  description: string;
}

const STAGES: StageDefinition[] = [
  { id: 0, name: 'Ingest', phase: 'Layer 1', icon: Server, color: 'text-cyan-400', glow: 'shadow-cyan-500/20', description: 'Raw high-frequency betting signals from Polymarket & Kalshi' },
  { id: 1, name: 'Gates', phase: 'Layer 2', icon: ShieldCheck, color: 'text-purple-400', glow: 'shadow-purple-500/20', description: 'Hard constraints: minimum liquidity, trade spread and base volume gates' },
  { id: 2, name: 'Filters', phase: 'Layer 3', icon: Activity, color: 'text-pink-400', glow: 'shadow-pink-500/20', description: 'SPS/IPM dynamic scoring algorithms and signal ranking' },
  { id: 3, name: 'Agents', phase: 'Layer 4', icon: Cpu, color: 'text-indigo-400', glow: 'shadow-indigo-500/20', description: 'Expected Value calculations, Bayesian sizing, and agent strategies' },
  { id: 4, name: 'Execution', phase: 'Layer 5', icon: Zap, color: 'text-emerald-400', glow: 'shadow-emerald-500/20', description: 'Atomic block entry to ledger, order book simulation & execution context' }
];

export const PipelineVisualizer: React.FC = () => {
  // Configurable Parameters
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phaseMode, setPhaseMode] = useState<'pre_game' | 'in_play'>('pre_game');
  const [minLiquidity, setMinLiquidity] = useState<number>(800);
  const [minSpread, setMinSpread] = useState<number>(0.015); // 1.5%
  const [minVolume, setMinVolume] = useState<number>(300);
  const [simSpeed, setSimSpeed] = useState<number>(2000); // interval ms
  
  // States
  const [activeSignals, setActiveSignals] = useState<SimulatedSignal[]>([]);
  const [history, setHistory] = useState<SimulatedSignal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<SimulatedSignal | null>(null);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    totalIngested: 0,
    passedGates: 0,
    failedGates: { liquidity: 0, spread: 0, volume: 0 },
    filteredOut: 0,
    passedFilters: 0,
    agentDecisions: { buy: 0, sell: 0, hold: 0 },
    executedOrders: { filled: 0, failed: 0 }
  });

  // Flow particles
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; color: string; stage: number; status: 'ok' | 'fail' }>>([]);

  // Generate a random market signal based on category
  const generateRandomSignal = (): SimulatedSignal => {
    const marketTypes = [
      { id: 'BTC-100K-Q2', name: 'Crypto: BTC > $100K Q2', type: 'Crypto' },
      { id: 'NFL-SUPERBOWL', name: 'Sports: NFL SuperBowl Champion', type: 'Sports' },
      { id: 'US-ELEC-2028', name: 'Macro: US Presidency 2028', type: 'Politics' },
      { id: 'ETH-BREAKOUT', name: 'Crypto: ETH over $4.5K', type: 'Crypto' },
      { id: 'NBA-FINALS-GAME7', name: 'Sports: NBA Finals Winner', type: 'Sports' },
      { id: 'MOCK-FED-RATE', name: 'Macro: Fed Rate Cut in June', type: 'Finance' }
    ];
    
    const market = marketTypes[Math.floor(Math.random() * marketTypes.length)];
    const polymarketPrice = Math.round((0.15 + Math.random() * 0.70) * 100) / 100;
    // Induce random pricing variance for spread
    const variance = (Math.random() - 0.5) * 0.08;
    const kalshiPrice = Math.max(0.05, Math.min(0.95, Math.round((polymarketPrice + variance) * 100) / 100));
    const spread = Math.round(Math.abs(polymarketPrice - kalshiPrice) * 100) / 100;
    const volume = Math.round((50 + Math.random() * 2000) * 10) / 10;
    const liquidity = Math.round((300 + Math.random() * 5000) * 10) / 10;
    
    return {
      id: `${market.id}-${Date.now().toString().slice(-4)}`,
      market_id: market.name,
      type: market.type,
      polymarket_price: polymarketPrice,
      kalshi_price: kalshiPrice,
      spread,
      volume,
      liquidity,
      timestamp: new Date().toLocaleTimeString(),
      gated: false,
      filterScore: 0,
      filtered: false,
      currentStage: 0
    };
  };

  // Run a single tick of the pipeline simulation
  const runSingleCycle = () => {
    const freshSignal = generateRandomSignal();
    
    // Process the signal through our 5 layers using state configurations
    // --- Layer 1: Ingest ---
    freshSignal.currentStage = 0;
    let currentMetrics = { ...metrics };
    currentMetrics.totalIngested += 1;

    // --- Layer 2: Gates ---
    const passLiquidity = freshSignal.liquidity >= minLiquidity;
    const passSpread = freshSignal.spread >= minSpread;
    const passVolume = freshSignal.volume >= minVolume;
    
    if (passLiquidity && passSpread && passVolume) {
      freshSignal.gated = true;
      currentMetrics.passedGates += 1;
      
      // --- Layer 3: Filters ---
      freshSignal.currentStage = 1;
      // Formula matches src/lib/prediction-market/logic.ts but incorporates dynamic phase mode
      const score = phaseMode === 'pre_game' 
        ? (freshSignal.spread * 0.5) + (freshSignal.liquidity / 5000 * 0.3) + (freshSignal.volume / 2000 * 0.2)
        : (freshSignal.spread * 0.6) + (freshSignal.volume / 2000 * 0.4);
      
      freshSignal.filterScore = Math.round(score * 1000) / 1000;
      
      // Threshold filter
      const filterCutoff = phaseMode === 'pre_game' ? 0.08 : 0.04;
      if (freshSignal.filterScore >= filterCutoff) {
        freshSignal.filtered = true;
        currentMetrics.passedFilters += 1;
        
        // --- Layer 4: Agents ---
        freshSignal.currentStage = 2;
        // Evaluate trade direction
        let action: 'buy' | 'sell' | 'hold' = 'hold';
        if (freshSignal.polymarket_price > freshSignal.kalshi_price) {
          action = 'buy';
        } else if (freshSignal.kalshi_price > freshSignal.polymarket_price) {
          action = 'sell';
        }
        
        const sizeMultiplier = Math.min(freshSignal.spread / 0.1, 1.0);
        const tradeSize = Math.round((Math.min(freshSignal.liquidity * 0.05, 120) * sizeMultiplier) * 100) / 100;
        const confidence = Math.round(Math.min(freshSignal.spread * 12, 1.0) * 100) / 100;
        
        freshSignal.decision = {
          action,
          size: tradeSize,
          edge: freshSignal.spread,
          confidence,
          reason: `Spread differential: ${Math.round(freshSignal.spread * 100)}% on ${freshSignal.type}`
        };
        
        currentMetrics.agentDecisions[action] += 1;
        
        // --- Layer 5: Execution ---
        if (action !== 'hold') {
          freshSignal.currentStage = 3;
          // Simulated order matches
          const isSuccessful = Math.random() > 0.12; // 88% order fill rate
          const executionPrice = action === 'buy' ? freshSignal.polymarket_price : freshSignal.kalshi_price;
          const slippage = Math.round(Math.random() * 0.015 * 10000) / 10000;
          
          freshSignal.execution = {
            status: isSuccessful ? 'filled' : 'failed',
            price: executionPrice,
            slippage
          };
          
          if (isSuccessful) {
            currentMetrics.executedOrders.filled += 1;
          } else {
            currentMetrics.executedOrders.failed += 1;
          }
          freshSignal.currentStage = 4; // Complete
        } else {
          freshSignal.currentStage = 4; // Complete as custom hold
        }
      } else {
        freshSignal.currentStage = 5; // Rejected at Filter
        currentMetrics.filteredOut += 1;
      }
    } else {
      // Gate error identification
      if (!passLiquidity) freshSignal.gatingError = 'liquidity';
      else if (!passSpread) freshSignal.gatingError = 'spread';
      else freshSignal.gatingError = 'volume';
      
      currentMetrics.failedGates[freshSignal.gatingError] += 1;
      freshSignal.currentStage = 5; // Gated Out
    }

    // Append new signals and prune logs if they grow too large
    setActiveSignals(prev => [freshSignal, ...prev.slice(0, 15)]);
    setHistory(prev => [freshSignal, ...prev.slice(0, 150)]);
    setMetrics(currentMetrics);

    // Dynamic Flow particle generator
    const particleId = `particle-${Date.now()}`;
    const startY = Math.random() * 60 + 20; // Y percentage start
    
    // Queue particle movements across steps
    let currentParticleStage = 0;
    const nextStatus = freshSignal.gated ? (freshSignal.filtered ? 'ok' : 'fail') : 'fail';
    
    const newParticle = {
      id: particleId,
      x: 5,
      y: startY,
      color: freshSignal.gated ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-red-400 shadow-[0_0_8px_#f87171]',
      stage: 0,
      status: nextStatus
    };
    
    setParticles(prev => [...prev, newParticle]);

    // Animate the particles along the pipeline levels
    const intervalIds: any[] = [];
    for (let s = 1; s <= 4; s++) {
      const timeoutId = setTimeout(() => {
        setParticles(prev => prev.map(p => {
          if (p.id === particleId) {
            // Determine if signal didn't make it to this layer
            const dropped = (freshSignal.currentStage < s && freshSignal.currentStage !== 4);
            const statusColor = dropped ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]';
            
            return {
              ...p,
              stage: s,
              x: s * 22 + 5 + (Math.random() * 4 - 2),
              y: dropped ? p.y + 15 : p.y + (Math.random() * 8 - 4),
              color: dropped ? 'bg-red-700/60 shadow-none' : p.color
            };
          }
          return p;
        }));
      }, s * 350);
      intervalIds.push(timeoutId);
    }

    // Clear particle trace after complete animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== particleId));
    }, 2200);
  };

  // Run Interval logic
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(runSingleCycle, simSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, minLiquidity, minSpread, minVolume, phaseMode, metrics]);

  // Run an initial burst of trades for dashboard visuals upon startup
  useEffect(() => {
    if (history.length === 0) {
      for (let i = 0; i < 30; i++) {
        runSingleCycle();
      }
    }
  }, []);

  // Compute stats for visualization diagrams
  const gatePieData = useMemo(() => {
    const totalFailed = metrics.failedGates.liquidity + metrics.failedGates.spread + metrics.failedGates.volume;
    const passed = metrics.passedGates;
    return [
      { name: 'Passed Gates', value: passed, color: '#10B981' },
      { name: 'Gated: Liquidity', value: metrics.failedGates.liquidity, color: '#EC4899' },
      { name: 'Gated: Spread', value: metrics.failedGates.spread, color: '#A855F7' },
      { name: 'Gated: Volume', value: metrics.failedGates.volume, color: '#3B82F6' }
    ].filter(item => item.value > 0);
  }, [metrics]);

  const funnelData = useMemo(() => {
    const passedFiltersCount = metrics.passedFilters;
    const evaluatedAgentsCount = metrics.agentDecisions.buy + metrics.agentDecisions.sell + metrics.agentDecisions.hold;
    return [
      { name: '1. Ingested', volume: metrics.totalIngested, fill: '#22D3EE' },
      { name: '2. Gates Pass', volume: metrics.passedGates, fill: '#C084FC' },
      { name: '3. Filter Qualified', volume: passedFiltersCount, fill: '#F472B6' },
      { name: '4. Agent Orders', volume: metrics.agentDecisions.buy + metrics.agentDecisions.sell, fill: '#818CF8' },
      { name: '5. Executed', volume: metrics.executedOrders.filled, fill: '#34D399' }
    ];
  }, [metrics]);

  const signalRateHistory = useMemo(() => {
    // Break simulation history down by segments
    const entries = [...history].reverse();
    const result = [];
    const segments = Math.min(10, Math.ceil(entries.length / 10));
    
    for (let i = 0; i < segments; i++) {
      const slice = entries.slice(i * 10, (i + 1) * 10);
      if (slice.length === 0) continue;
      
      const ingested = slice.length;
      const passed = slice.filter(s => s.gated).length;
      const executed = slice.filter(s => s.execution && s.execution.status === 'filled').length;
      
      result.push({
        interval: `T-${segments - i - 1}`,
        Ingested: ingested,
        Passed: passed,
        Executed: executed
      });
    }
    return result;
  }, [history]);

  const resetMetrics = () => {
    setMetrics({
      totalIngested: 0,
      passedGates: 0,
      failedGates: { liquidity: 0, spread: 0, volume: 0 },
      filteredOut: 0,
      passedFilters: 0,
      agentDecisions: { buy: 0, sell: 0, hold: 0 },
      executedOrders: { filled: 0, failed: 0 }
    });
    setActiveSignals([]);
    setHistory([]);
    setSelectedSignal(null);
  };

  return (
    <div id="pipeline-core-container" className="w-full h-full bg-[#080b0f] text-slate-200 p-1 md:p-6 font-sans">
      
      {/* Visual Header Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#6366f1] select-none">Reinforcement Learning Core</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight mt-1">
            <Cpu className="text-cyan-400 animate-pulse" size={28} />
            RL 5-LAYER DECISION ENGINE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live telemetry and gate routing control panel for high-frequency odds and pricing arbitrage.
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Phase selection */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setPhaseMode('pre_game')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                phaseMode === 'pre_game' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pre-Game (Macro)
            </button>
            <button
              onClick={() => setPhaseMode('in_play')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                phaseMode === 'in_play' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In-Play (Fast Decay)
            </button>
          </div>

          {/* Player control buttons */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all ${
              isPlaying 
                ? 'bg-blue-950/40 text-blue-400 border-blue-500/30 hover:bg-blue-900/30' 
                : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/30'
            }`}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? 'Pause Feed' : 'Start Feed'}
          </button>

          <button
            onClick={runSingleCycle}
            className="p-2.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all"
            title="Inject Single Signal"
          >
            <RefreshCw size={15} className="active:rotate-180 transition-transform duration-300" />
          </button>

          <button
            onClick={resetMetrics}
            className="px-3.5 py-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 rounded-xl text-xs font-bold transition-all"
          >
            Reset Logs
          </button>
        </div>
      </div>

      {/* Main Grid: Control sliders on Left, Center Animated Visualizer, Right Advanced Recharts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Left Column: Interactive Telemetry Controls */}
        <div className="lg:col-span-1 bg-[#0d121a]/90 rounded-2xl p-5 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="text-indigo-400" size={18} />
              <h3 className="font-extrabold uppercase text-xs tracking-wider text-white">Dynamic Routing Tolerances</h3>
            </div>

            {/* Micro sliders with explanations */}
            <div className="space-y-5">
              
              {/* Slider 1: Min Liquidity */}
              <div>
                <div className="flex justify-between items-center mb-1.5 select-none">
                  <span className="text-xs text-slate-400 font-medium">1. Min Liquidity Gate</span>
                  <span className="font-mono text-xs text-purple-400 font-bold">${minLiquidity}</span>
                </div>
                <input 
                  type="range"
                  min="200"
                  max="3000"
                  step="50"
                  value={minLiquidity}
                  onChange={(e) => setMinLiquidity(Number(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Lo-Tolerance ($200)</span>
                  <span>Strict ($3k)</span>
                </div>
              </div>

              {/* Slider 2: Min Spread */}
              <div>
                <div className="flex justify-between items-center mb-1.5 select-none">
                  <span className="text-xs text-slate-400 font-medium">2. Min Arbitrage Spread</span>
                  <span className="font-mono text-xs text-cyan-400 font-bold">{(minSpread * 100).toFixed(1)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.005"
                  max="0.05"
                  step="0.005"
                  value={minSpread}
                  onChange={(e) => setMinSpread(Number(e.target.value))}
                  className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Very Wide (0.5%)</span>
                  <span>Selective (5.0%)</span>
                </div>
              </div>

              {/* Slider 3: Min Volume */}
              <div>
                <div className="flex justify-between items-center mb-1.5 select-none">
                  <span className="text-xs text-slate-400 font-medium">3. Min Order Volume</span>
                  <span className="font-mono text-xs text-pink-400 font-bold">${minVolume}</span>
                </div>
                <input 
                  type="range"
                  min="50"
                  max="1200"
                  step="50"
                  value={minVolume}
                  onChange={(e) => setMinVolume(Number(e.target.value))}
                  className="w-full accent-pink-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Micro ($50)</span>
                  <span>Deep Volume ($1200)</span>
                </div>
              </div>

              {/* Slider 4: Sim speed */}
              <div>
                <div className="flex justify-between items-center mb-1.5 select-none">
                  <span className="text-xs text-slate-400 font-medium">Feed Rate (Latency)</span>
                  <span className="font-mono text-xs text-indigo-400 font-bold">{simSpeed / 1000}s</span>
                </div>
                <input 
                  type="range"
                  min="500"
                  max="5000"
                  step="250"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Fast (0.5s)</span>
                  <span>Slow (5s)</span>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="text-indigo-400 animate-pulse" size={14} />
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Layer Execution Matrix</div>
            </div>
            
            {/* Quick stats box */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Signals Passed Gates</span>
                <span className="font-mono font-bold text-emerald-400">
                  {metrics.totalIngested > 0 ? `${Math.round((metrics.passedGates / metrics.totalIngested) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Filter Conversion Rate</span>
                <span className="font-mono font-bold text-amber-400">
                  {metrics.passedGates > 0 ? `${Math.round((metrics.passedFilters / metrics.passedGates) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Optimal Order Yield</span>
                <span className="font-mono font-bold text-[#6366f1]">
                  {metrics.passedFilters > 0 ? `${Math.round((metrics.executedOrders.filled / metrics.passedFilters) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Center Canvas: Interactive SVG flowing nodes */}
        <div className="lg:col-span-3 bg-[#0d121a]/95 rounded-2xl border border-slate-800/80 p-5 flex flex-col relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-4 z-10 select-none">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={18} />
              <h3 className="font-extrabold uppercase text-xs tracking-wider text-white">Live Pipeline Signal Trace</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Active Trade Flow</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span> Filtered/Gated Exit</div>
            </div>
          </div>

          {/* Interactive Flow Diagram Overlay */}
          <div className="relative flex-grow min-h-[280px] bg-slate-950/40 rounded-xl border border-slate-800/60 overflow-hidden">
            {/* 5-layer grid columns */}
            <div className="absolute inset-0 grid grid-cols-5 z-0">
              {[0, 1, 2, 3, 4].map((index) => (
                <div 
                  key={index}
                  onMouseEnter={() => setHoveredStage(index)}
                  onMouseLeave={() => setHoveredStage(null)}
                  className={`border-r border-slate-900/40 last:border-0 h-full flex flex-col justify-between p-3.5 transition-all duration-300 ${
                    hoveredStage === index ? 'bg-slate-900/20 backdrop-brightness-110' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="text-center">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{STAGES[index].phase}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      {React.createElement(STAGES[index].icon, { className: `${STAGES[index].color}`, size: 14 })}
                      <span className="text-xs font-black uppercase text-white tracking-tight">{STAGES[index].name}</span>
                    </div>
                  </div>

                  {/* Column Footer Metric */}
                  <div className="bg-black/50 border border-slate-800/80 rounded-lg p-1.5 text-center font-mono">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                      {index === 0 ? 'Ingested' : index === 1 ? 'Gates Pass' : index === 2 ? 'Filtered' : index === 3 ? 'Decided' : 'Complete'}
                    </span>
                    <span className="text-sm font-black text-white">
                      {index === 0 ? metrics.totalIngested : 
                       index === 1 ? metrics.passedGates : 
                       index === 2 ? metrics.passedFilters : 
                       index === 3 ? (metrics.agentDecisions.buy + metrics.agentDecisions.sell) : 
                       metrics.executedOrders.filled}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Particle Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              <svg className="w-full h-full">
                {/* Horizontal Guide lines */}
                <path d="M 5,100 C 250,100 250,100 950,100" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3,6" />
                <path d="M 5,200 C 250,200 250,200 950,200" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3,6" />
                
                {/* Connective pipeline routing glows */}
                <path d="M 50,150 Q 250,120 400,150 T 800,150" fill="none" stroke="rgba(99, 102, 241, 0.08)" strokeWidth="6" />

                {/* Animated flowing vectors */}
                {particles.map((p) => (
                  <circle
                    key={p.id}
                    cx={`${p.x}%`}
                    cy={`${p.y}%`}
                    r="4.5"
                    className={`${p.color} transition-all duration-300 ease-out`}
                  />
                ))}
              </svg>

              {/* Gated Signal drop indicators */}
              <AnimatePresence>
                {activeSignals.slice(0, 3).map((sig) => {
                  if (sig.currentStage === 5) {
                    return (
                      <motion.div
                        key={sig.id}
                        initial={{ opacity: 0, scale: 0.5, y: 80 }}
                        animate={{ opacity: 1, scale: 1, y: 150 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute text-[10px] bg-red-950/20 border border-red-900/30 text-red-400 rounded px-2 py-1 flex items-center gap-1.5"
                        style={{ left: sig.gatingError ? '25%' : '45%', top: '25%' }}
                      >
                        <XCircle size={10} /> 
                        Gated: {sig.gatingError ? sig.gatingError.toUpperCase() : 'SCORE'}
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </AnimatePresence>
            </div>

            {/* Custom Interactive Tooltip card for columns hover */}
            {hoveredStage !== null && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute z-20 left-[5%] right-[5%] bottom-4 bg-[#090d13] border border-slate-700/80 p-3 rounded-xl shadow-2xl flex gap-4 select-none"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-center text-center shrink-0 w-12 h-12">
                  {React.createElement(STAGES[hoveredStage].icon, { className: `${STAGES[hoveredStage].color} shrink-0`, size: 24 })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">{STAGES[hoveredStage].phase}</span>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">{STAGES[hoveredStage].name} Execution Context</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {STAGES[hoveredStage].description}
                  </p>
                </div>
              </motion.div>
            )}

          </div>

          {/* Quick descriptive legend explaining live flows */}
          <div className="mt-4 flex flex-wrap gap-4 items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 pt-3">
            <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
              <Zap className="text-yellow-400" size={12} /> Key metrics:
            </span>
            <div className="flex gap-6 overflow-x-auto select-none">
              <div>Total Feed Liquidity: <strong className="text-white">${history.reduce((acc, s) => acc + s.liquidity, 0) ? (history.reduce((acc, s) => acc + s.liquidity, 0)/1000).toFixed(1)+(history.reduce((acc, s) => acc + s.liquidity, 0) > 1000 ? 'k':'') : '$0'}</strong></div>
              <div>Gating Rejects: <strong className="text-purple-400">{history.filter(s => !s.gated).length}</strong></div>
              <div>Filters Passed: <strong className="text-pink-400">{history.filter(s => s.filtered).length}</strong></div>
              <div>Agent Buy Orders: <strong className="text-indigo-400">{metrics.agentDecisions.buy}</strong></div>
              <div>Agent Sell Orders: <strong className="text-indigo-400">{metrics.agentDecisions.sell}</strong></div>
            </div>
          </div>

        </div>

      </div>

      {/* Embedded Chart Metrics and Logs Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Panel 1: Attrition Funnel Grid */}
        <div className="bg-[#0b0e14] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 select-none">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="text-purple-400" size={15} /> Signal Conversion Funnel
              </h4>
              <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Cumulative Volume</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-normal">
              Conversion flow indicating the absolute count of signals flowing down each pipeline layer.
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 5 }}>
                <XAxis type="number" stroke="#475569" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d13', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] bg-slate-950/40 p-2 border border-slate-900 rounded-lg text-slate-400 mt-2 font-mono flex justify-between select-none">
            <span>Overall Ingestion Efficiency:</span>
            <span className="text-white font-black">
              {metrics.totalIngested > 0 ? `${(metrics.executedOrders.filled / metrics.totalIngested * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Visual Panel 2: Gate Failure Pie details */}
        <div className="bg-[#0b0e14] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <PieIcon className="text-cyan-400" size={15} /> Gate Pass/Fail Distribution
              </h4>
              <span className="text-[10px] text-[#22D3EE] font-bold tracking-widest uppercase font-mono">Layer 2 Telemetry</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-normal">
              Breakdown of raw signals successfully navigating versus rejecting at individual gating parameters.
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {gatePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gatePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {gatePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d13', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-500 py-10 font-mono">Awaiting Live Telemetry...</div>
            )}
          </div>

          {/* Color Indicators Grid */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono select-none">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Passed ({metrics.passedGates})</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span> Liquidity Fail ({metrics.failedGates.liquidity})</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Spread Fail ({metrics.failedGates.spread})</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Volume Fail ({metrics.failedGates.volume})</div>
          </div>
        </div>

        {/* Visual Panel 3: Ingested vs Passed Area Chart over intervals */}
        <div className="bg-[#0b0e14] border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="text-pink-400" size={15} /> Real-Time Signal Rates
              </h4>
              <span className="text-[10px] text-pink-400 font-bold tracking-widest uppercase font-mono">Stability index</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 font-normal">
              Rate stability metric mapping ingested signals versus filtered trade setups over segmented timeframes.
            </p>
          </div>

          <div className="h-44 w-full">
            {signalRateHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signalRateHistory} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                  <XAxis dataKey="interval" stroke="#475569" fontSize={8} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={8} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d13', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Area type="monotone" dataKey="Ingested" stroke="#22D3EE" fill="rgba(34, 211, 238, 0.05)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Passed" stroke="#C084FC" fill="rgba(192, 132, 252, 0.05)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Executed" stroke="#34D399" fill="rgba(52, 211, 153, 0.05)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-500 py-10 font-mono">Generating charts...</div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-2 flex items-center justify-between font-mono select-none">
            <span>Total Simulated Orders Filled:</span>
            <span className="text-emerald-400 font-bold">{metrics.executedOrders.filled}</span>
          </div>
        </div>

      </div>

      {/* Footer Section: Details tables allowing inspector capability */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Active Signal stream feed */}
        <div className="lg:col-span-2 bg-[#090d13]/80 rounded-2xl border border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="text-indigo-400 animate-pulse" size={14} /> Live Pipeline Processing Queue (Max 15)
            </h4>
            <span className="text-[9px] bg-slate-800 text-slate-400 font-mono font-semibold px-2 py-0.5 rounded select-none">
              Auto Streaming
            </span>
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  <th className="py-2 px-3">Raw ID</th>
                  <th className="py-2 px-3">Target Market</th>
                  <th className="py-2 px-3 text-right">Spread</th>
                  <th className="py-2 px-3 text-right">Liquidity</th>
                  <th className="py-2 px-3">Gate Route</th>
                  <th className="py-2 px-3 font-mono text-center">Score</th>
                  <th className="py-2 px-3 text-center">Decision</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {activeSignals.length > 0 ? (
                  activeSignals.map((signal) => (
                    <tr 
                      key={signal.id}
                      onClick={() => setSelectedSignal(signal)}
                      className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${
                        selectedSignal?.id === signal.id ? 'bg-indigo-950/20 border-l-2 border-indigo-500' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[10px] text-indigo-400 font-bold">{signal.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-white max-w-[150px] truncate">{signal.market_id}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">{(signal.spread * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">${signal.liquidity}</td>
                      <td className="py-2.5 px-3">
                        {signal.gated ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded">
                            <CheckCircle size={10} /> PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-pink-400 font-bold bg-pink-950/20 px-1.5 py-0.5 rounded capitalize">
                            <XCircle size={10} /> {signal.gatingError || 'Fail'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-rose-400">
                        {signal.filterScore > 0 ? signal.filterScore.toFixed(3) : '0.000'}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-center font-black">
                        {signal.decision ? (
                          <span className={`px-2 py-0.5 rounded border text-[10px] ${
                            signal.decision.action === 'buy' 
                              ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40' 
                              : 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40'
                          }`}>
                            {signal.decision.action}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {signal.execution ? (
                          <span className={`text-[10px] ${
                            signal.execution.status === 'filled' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {signal.execution.status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-normal">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center font-mono text-xs text-slate-500 py-10">
                      Processing incoming high frequency queue signals...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signal Payload Inspector Panel */}
        <div className="bg-[#090d13]/80 rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 select-none">
              <Settings className="text-indigo-400" size={15} />
              <h4 className="text-xs font-black text-white uppercase tracking-widest">
                Payload Inspector
              </h4>
            </div>

            {selectedSignal ? (
              <div className="space-y-4">
                <div className="bg-black/45 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2.5">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">ID:</span>
                    <span className="text-teal-400 font-bold">{selectedSignal.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Market Target:</span>
                    <span className="text-white font-bold max-w-[140px] truncate text-right" title={selectedSignal.market_id}>
                      {selectedSignal.market_id}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Polymarket Price:</span>
                    <span className="text-slate-300 font-semibold">${selectedSignal.polymarket_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Kalshi Price:</span>
                    <span className="text-slate-300 font-semibold">${selectedSignal.kalshi_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Calculated Spread:</span>
                    <span className="text-[#22D3EE] font-bold">{(selectedSignal.spread * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Matched Volume:</span>
                    <span className="text-slate-300 font-semibold">${selectedSignal.volume}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Pool Liquidity:</span>
                    <span className="text-slate-300 font-semibold">${selectedSignal.liquidity}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Filter Score Rank:</span>
                    <span className="text-pink-400 font-black">{selectedSignal.filterScore.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Signal Timestamp:</span>
                    <span className="text-slate-400">{selectedSignal.timestamp}</span>
                  </div>
                </div>

                {/* Sub-Decision details */}
                {selectedSignal.decision && (
                  <div className="bg-indigo-950/25 border border-indigo-900/30 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-widest mb-1.5">
                      <Cpu size={12} /> Agent Decision Metric
                    </div>
                    <div className="text-xs space-y-1">
                      <div>Action Strategy: <strong className="text-white uppercase font-black">{selectedSignal.decision.action}</strong></div>
                      <div>Optimal Size: <strong className="text-white">${selectedSignal.decision.size}</strong></div>
                      <div>Confidence: <strong className="text-indigo-400">{(selectedSignal.decision.confidence * 100).toFixed(1)}%</strong></div>
                      <div className="text-[11px] text-slate-400 mt-1 mt-1.5 flex items-start gap-1">
                        <CornerDownRight size={10} className="shrink-0 mt-0.5 text-indigo-500" />
                        <span>Reason: {selectedSignal.decision.reason}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-800 border-dashed p-10 rounded-xl text-center flex flex-col items-center justify-center h-[260px] select-none">
                <HelpCircle className="text-slate-600 mb-2" size={32} />
                <span className="text-xs font-bold text-slate-400">No Signal Selected</span>
                <span className="text-[10px] text-slate-500 px-4 mt-1 leading-relaxed">
                  Click on any signal inside the live stream queue to dump its full hierarchical JSON state payload.
                </span>
              </div>
            )}
          </div>

          <div className="text-[10px] font-medium text-slate-500 leading-normal select-none border-t border-slate-800/80 pt-3">
            Gating algorithms align with active criteria defined inside <code className="bg-slate-900 text-slate-400 px-1 py-0.5 rounded font-mono">logic.ts</code> files.
          </div>
        </div>

      </div>

    </div>
  );
};
