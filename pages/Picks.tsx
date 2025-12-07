
import React, { useState, useEffect } from 'react';
import { Target, AlertCircle, Clock, Archive, ChevronRight, BookOpen, Layers, Wifi, User, Zap, TrendingUp, BadgePercent, Shuffle, Trophy, LayoutGrid, List } from 'lucide-react';
import { PickArchiveItem, GameSummary } from '../types';
import { LiveOdds } from '../components/LiveOdds';
import { clsx } from 'clsx';

// ... (MOCK DATA CONSTANTS - No Changes) ...
const PROP_PLAYERS = [
    'J. Allen', 'L. Jackson', 'C. McCaffrey', 'T. Hill', 'J. Jefferson', 
    'A. Brown', 'C. Lamb', 'B. Robinson', 'D. Henry', 'S. Barkley', 
    'K. Murray', 'D. Prescott', 'G. Wilson', 'P. Nacua'
];
const PROP_STATS = ['Pass Yds', 'Rush Yds', 'Rec Yds', 'Receptions', 'Fantasy Pts'];

interface PicksProps {
  currentContent: string;
  archives: PickArchiveItem[];
  gameSummaries: GameSummary[];
  initialViewMode?: 'daily' | 'edgeprop'; // NEW PROP
}

interface EdgeSlip {
    id: string;
    type: '2-LEG POWER' | '3-LEG FLEX' | '4-LEG EDGE';
    platform: 'PrizePicks' | 'Underdog' | 'Betr' | 'Sleeper' | 'DFS';
    totalEv: number;
    impliedOdds: string;
    legs: {
        player: string;
        stat: string;
        line: number;
        side: 'OVER' | 'UNDER';
        ev: number;
        sharpOdds: number;
    }[];
}

interface SurfacePick {
    id: string;
    player: string;
    stat: string;
    line: number;
    side: 'OVER' | 'UNDER';
    publicPct: number;
    sharpPct: number;
    exposure: number;
    diff: number;
    platform: 'PrizePicks' | 'Underdog';
}

export const Picks: React.FC<PicksProps> = ({ currentContent, archives, gameSummaries, initialViewMode = 'daily' }) => {
  // Navigation State
  const [viewMode, setViewMode] = useState<'daily' | 'sunday' | 'edgeprop'>(initialViewMode);
  const [subViewMode, setSubViewMode] = useState<'team' | 'props'>('team'); // For Daily Edge sub-tabs
  
  // Content State
  const [displayedContent, setDisplayedContent] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedDate, setDisplayedDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Data States
  const [generatedSlips, setGeneratedSlips] = useState<EdgeSlip[]>([]);
  const [topPropCards, setTopPropCards] = useState<any[]>([]);
  const [surfaceAreaPicks, setSurfaceAreaPicks] = useState<SurfacePick[]>([]);

  // React to prop changes (Deep Linking)
  useEffect(() => {
      if (initialViewMode) {
          setViewMode(initialViewMode);
      }
  }, [initialViewMode]);

  // Initialize view data
  useEffect(() => {
    if (viewMode === 'daily') {
        // Default to Current Live Picks
        setDisplayedContent(currentContent);
        setDisplayedTitle("Live Edge Action");
        setDisplayedDate(new Date().toLocaleDateString());
        setSelectedId('live-current');
        generateTopProps(); // Generate the sub-tab data
    } else if (viewMode === 'sunday') {
        // Default to Latest Sunday Summary
        if (gameSummaries.length > 0) {
            const latest = gameSummaries[0];
            setDisplayedContent(latest.content);
            setDisplayedTitle(latest.title);
            setDisplayedDate(latest.date);
            setSelectedId(latest.id);
        } else {
            setDisplayedContent("# NO SUMMARIES FOUND\n\nPlease upload a Game Summary via the Admin Console.");
            setDisplayedTitle("No Data");
            setDisplayedDate("-");
            setSelectedId(null);
        }
    } else if (viewMode === 'edgeprop') {
        generateEdgeSlips();
        generateSurfaceAreaPicks();
    }
  }, [viewMode, currentContent, gameSummaries]);

  // ... (Keep existing handlers: handleSidebarClick, handleLiveReset, generateEdgeSlips) ...
  const handleSidebarClick = (type: 'archive' | 'summary', item: any) => {
      setDisplayedContent(item.content);
      setDisplayedTitle(item.title);
      setDisplayedDate(item.date);
      setSelectedId(item.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLiveReset = () => {
      setDisplayedContent(currentContent);
      setDisplayedTitle("Live Edge Action");
      setDisplayedDate(new Date().toLocaleDateString());
      setSelectedId('live-current');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateEdgeSlips = () => {
      const createLeg = () => {
          const player = PROP_PLAYERS[Math.floor(Math.random() * PROP_PLAYERS.length)];
          const stat = PROP_STATS[Math.floor(Math.random() * PROP_STATS.length)];
          const line = Math.floor(Math.random() * 50) + 10.5;
          const ev = Math.random() * 8 + 1.5;
          return {
              player,
              stat,
              line,
              side: Math.random() > 0.5 ? 'OVER' : 'UNDER' as 'OVER' | 'UNDER',
              ev: parseFloat(ev.toFixed(1)),
              sharpOdds: -130 - Math.floor(Math.random() * 30)
          };
      };

      const slips: EdgeSlip[] = [
          { id: 'slip-1', type: '2-LEG POWER', platform: 'Betr', totalEv: 12.4, impliedOdds: '3.0x', legs: [createLeg(), createLeg()] },
          { id: 'slip-2', type: '3-LEG FLEX', platform: 'PrizePicks', totalEv: 18.2, impliedOdds: '2.25x / 5.0x', legs: [createLeg(), createLeg(), createLeg()] },
          { id: 'slip-3', type: '4-LEG EDGE', platform: 'Underdog', totalEv: 24.5, impliedOdds: '10.0x', legs: [createLeg(), createLeg(), createLeg(), createLeg()] }
      ];
      setGeneratedSlips(slips);
  };

  const generateTopProps = () => {
      const props = [];
      for(let i=0; i<6; i++) {
          props.push({
              id: `tp-${i}`,
              player: PROP_PLAYERS[Math.floor(Math.random() * PROP_PLAYERS.length)],
              stat: PROP_STATS[Math.floor(Math.random() * PROP_STATS.length)],
              line: (Math.random() * 50 + 10.5).toFixed(1),
              side: Math.random() > 0.5 ? 'OVER' : 'UNDER',
              ev: (Math.random() * 5 + 2).toFixed(1),
              confidence: 'HIGH'
          });
      }
      setTopPropCards(props);
  };

  const generateSurfaceAreaPicks = () => {
      const picks: SurfacePick[] = [];
      for(let i=0; i<4; i++) {
          const publicPct = Math.floor(Math.random() * 30) + 60; // 60-90% public
          const sharpPct = Math.floor(Math.random() * 20) + 10; // 10-30% sharp on inverse
          picks.push({
              id: `surf-${i}`,
              player: PROP_PLAYERS[Math.floor(Math.random() * PROP_PLAYERS.length)],
              stat: PROP_STATS[Math.floor(Math.random() * PROP_STATS.length)],
              line: Math.floor(Math.random() * 50) + 0.5,
              side: 'UNDER', // Usually fading public over
              publicPct,
              sharpPct,
              exposure: (publicPct - sharpPct),
              diff: 15 + Math.floor(Math.random() * 10),
              platform: i % 2 === 0 ? 'PrizePicks' : 'Underdog'
          });
      }
      setSurfaceAreaPicks(picks);
  };

  // ... (Keep existing formatBold and renderMarkdown functions) ...
  const formatBold = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-black tracking-wide">$1</span>');
  };

  // State to track if we are currently inside the "Player Props" section
  let inPlayerPropsSection = false;

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    const nodes = [];
    let propBuffer: React.ReactNode[] = [];

    const flushProps = (keyPrefix: string) => {
        if (propBuffer.length > 0) {
            nodes.push(
                <div key={`${keyPrefix}-grid`} className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                    {propBuffer}
                </div>
            );
            propBuffer = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) continue;

        if (line.startsWith('# ')) {
            flushProps(`h1-${i}`);
            inPlayerPropsSection = false;
            nodes.push(<h1 key={i} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-10 mb-6 uppercase tracking-tighter drop-shadow-sm border-b-2 border-slate-800/50 pb-4">{line.replace('# ', '')}</h1>);
            continue;
        }
        if (line.startsWith('## ')) {
            flushProps(`h2-${i}`);
            const headerText = line.replace('## ', '').toUpperCase();
            if (headerText.includes('PROPS') || headerText.includes('PLAYER')) {
                inPlayerPropsSection = true;
                nodes.push(<h2 key={i} className="text-xl font-bold text-yellow-400 border-l-4 border-yellow-500 pl-4 mt-8 mb-4 uppercase tracking-widest bg-gradient-to-r from-slate-900 to-transparent py-2 flex items-center gap-2"><Zap size={20} />{headerText}</h2>);
            } else {
                inPlayerPropsSection = false;
                nodes.push(<h2 key={i} className="text-xl font-bold text-white border-l-4 border-cyan-500 pl-4 mt-8 mb-4 uppercase tracking-widest bg-gradient-to-r from-slate-900 to-transparent py-2">{headerText}</h2>);
            }
            continue;
        }
        if (line.startsWith('### ')) {
            flushProps(`h3-${i}`);
            nodes.push(<h3 key={i} className="text-lg font-bold text-purple-400 mt-6 mb-2 uppercase tracking-wide">{line.replace('### ', '')}</h3>);
            continue;
        }
        if (trimmed.startsWith('- ')) {
            const content = trimmed.replace('- ', '');
            if (inPlayerPropsSection) {
                propBuffer.push(
                    <div key={`prop-${i}`} className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl flex items-start gap-4 hover:border-yellow-500/50 hover:bg-black transition-all group shadow-lg">
                         <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition-transform"><User size={20} /></div>
                         <div><div className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(content) }}></div><div className="mt-2 flex gap-2"><span className="text-[9px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest">Prop Bet</span></div></div>
                    </div>
                );
            } else {
                nodes.push(<li key={i} className="flex items-start gap-3 ml-2 mb-3 text-slate-300 text-sm leading-relaxed group"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)] group-hover:scale-125 transition-transform"></span><span className="group-hover:text-slate-200 transition-colors" dangerouslySetInnerHTML={{ __html: formatBold(content) }}></span></li>);
            }
            continue;
        }
        if (trimmed.match(/^\d+\./)) {
             flushProps(`num-${i}`);
             const number = trimmed.split('.')[0];
             const content = trimmed.replace(/^\d+\.\s*/, '');
             nodes.push(<div key={i} className="flex items-start gap-3 ml-2 mb-3 text-slate-300 text-sm group"><span className="text-cyan-400 font-bold font-mono mt-0.5">{number}.</span><span className="group-hover:text-slate-200 transition-colors" dangerouslySetInnerHTML={{ __html: formatBold(content) }}></span></div>)
             continue;
        }
        if (trimmed.length > 0) {
             flushProps(`p-${i}`);
             if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                 nodes.push(<h3 key={i} className="text-lg font-bold text-indigo-400 mt-6 mb-2 uppercase tracking-wide border-b border-indigo-500/20 pb-1 w-fit">{trimmed.replace(/\*\*/g, '')}</h3>);
             } else {
                 nodes.push(<p key={i} className="mb-4 text-slate-400 text-sm leading-7 font-medium max-w-4xl" dangerouslySetInnerHTML={{ __html: formatBold(line) }}></p>);
             }
             continue;
        }
        nodes.push(<div key={i} className="h-2"></div>);
    }
    flushProps('final');
    return nodes;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
        
        {/* Top Tab Bar */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex flex-wrap justify-center gap-1">
                <button
                    onClick={() => setViewMode('daily')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                        viewMode === 'daily' 
                            ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Layers size={16} />
                    Daily Picks
                </button>
                <button
                    onClick={() => setViewMode('edgeprop')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                        viewMode === 'edgeprop' 
                            ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Zap size={16} />
                    Player Props
                </button>
                <button
                    onClick={() => setViewMode('sunday')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                        viewMode === 'sunday' 
                            ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" 
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <BookOpen size={16} />
                    Sunday Summaries
                </button>
            </div>
        </div>

        {viewMode === 'edgeprop' ? (
            /* ==================================
               EDGEPROP PLAYER VIEW (NEW)
               ================================== */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Educational Header */}
                <div className="glass-panel p-8 rounded-2xl mb-8 border-l-4 border-l-purple-500 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter flex items-center gap-3">
                            <TrendingUp className="text-purple-400" size={32} />
                            Statistical Arbitrage Engine
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-purple-400 font-bold uppercase tracking-widest text-sm mb-2">The Edge Thesis</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    We exploit market inefficiencies between <span className="text-emerald-400 font-bold">Sharp Sportsbooks</span> (Pinnacle/Circa) and <span className="text-rose-400 font-bold">Square DFS Platforms</span> (PrizePicks/Betr). 
                                    When a sharp book posts a line at -150 (60% probability), but a DFS site offers it at -119 implied odds, we have a mathematical edge.
                                </p>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">Supported Liquidity Pools</h3>
                                <div className="flex gap-3">
                                    <span className="px-3 py-1 bg-[#1A4731] text-emerald-400 rounded text-xs font-bold border border-emerald-500/30">PrizePicks</span>
                                    <span className="px-3 py-1 bg-[#3A2A0D] text-yellow-400 rounded text-xs font-bold border border-yellow-500/30">Underdog</span>
                                    <span className="px-3 py-1 bg-[#2D1B36] text-purple-400 rounded text-xs font-bold border border-purple-500/30">Betr</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Background Deco */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none"></div>
                </div>

                {/* 4. SURFACE AREA EXPOSURE (NEW SECTION) */}
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-rose-500 pl-4 uppercase tracking-widest flex items-center gap-2">
                        <List className="text-rose-400" />
                        4. Surface Area Exposure
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {surfaceAreaPicks.map((pick) => (
                            <div key={pick.id} className="bg-gradient-to-br from-rose-950/30 to-black border border-rose-500/20 rounded-xl p-4 hover:border-rose-500/50 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-white font-bold text-sm">{pick.player}</div>
                                        <div className="text-slate-400 text-xs">{pick.side} {pick.line} {pick.stat}</div>
                                    </div>
                                    <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded border uppercase", pick.platform === 'PrizePicks' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-yellow-400 border-yellow-500/30 bg-yellow-500/10")}>{pick.platform}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-1.5 flex-grow bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500" style={{width: `${pick.publicPct}%`}}></div>
                                    </div>
                                    <span className="text-[10px] text-rose-400 font-mono">{pick.publicPct}% Pub</span>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Net Diff</div>
                                    <div className="text-lg font-black text-rose-400">+{pick.diff}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Slip Builder Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {generatedSlips.map((slip, idx) => (
                        <div key={slip.id} className="relative group">
                            <div className={clsx(
                                "glass-panel rounded-2xl p-1 h-full transition-transform duration-300 hover:-translate-y-2",
                                slip.platform === 'Betr' ? "border-purple-500/30 shadow-purple-500/10" : 
                                slip.platform === 'PrizePicks' ? "border-emerald-500/30 shadow-emerald-500/10" :
                                "border-yellow-500/30 shadow-yellow-500/10"
                            )}>
                                <div className="bg-slate-900/90 rounded-xl p-6 h-full flex flex-col relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className={clsx("text-xs font-black uppercase tracking-widest mb-1", slip.platform === 'Betr' ? "text-purple-400" : slip.platform === 'PrizePicks' ? "text-emerald-400" : "text-yellow-400")}>{slip.platform}</div>
                                            <h3 className="text-xl font-black text-white">{slip.type}</h3>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center min-w-[60px]">
                                            <div className="text-[10px] text-slate-500 uppercase">Payout</div>
                                            <div className="text-lg font-mono font-bold text-white">{slip.impliedOdds}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-6 flex-grow">
                                        {slip.legs.map((leg, lIdx) => (
                                            <div key={lIdx} className="grid grid-cols-12 gap-2 items-center p-2 bg-black/40 rounded border border-slate-800 text-xs">
                                                <div className="col-span-1 text-slate-500 font-bold">{lIdx + 1}</div>
                                                <div className="col-span-5 font-bold text-white truncate">{leg.player}</div>
                                                <div className="col-span-4 text-slate-300 text-[10px]">{leg.side} {leg.line} {leg.stat}</div>
                                                <div className="col-span-2 text-right font-bold text-emerald-400">+{leg.ev}%</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2"><BadgePercent size={16} className="text-cyan-400" /><span className="text-sm font-bold text-white">Total Edge: <span className="text-cyan-400">+{slip.totalEv}%</span></span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            /* ==================================
               STANDARD PICK / SUMMARY VIEW
               ================================== */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <div className={clsx("glass-panel p-1 rounded-2xl mb-8 border shadow-[0_0_50px_rgba(0,0,0,0.2)]", viewMode === 'daily' ? "border-emerald-500/30 shadow-emerald-500/10" : "border-amber-500/30 shadow-amber-500/10")}>
                        <div className="bg-gradient-to-b from-slate-900/95 to-black/95 p-8 rounded-xl min-h-[70vh] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none"><Target className={clsx("w-40 h-40 absolute top-4 right-4 animate-pulse-slow opacity-20", viewMode === 'daily' ? "text-emerald-500" : "text-amber-500")} /></div>
                            
                            {/* SUB-TABS FOR DAILY EDGE (Team vs Prop) */}
                            {viewMode === 'daily' && (
                                <div className="flex justify-center mb-6 relative z-20">
                                    <div className="bg-slate-900/80 p-1 rounded-lg border border-slate-700 flex gap-1">
                                        <button onClick={() => setSubViewMode('team')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase transition-all", subViewMode === 'team' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white")}>Team Edge Plays</button>
                                        <button onClick={() => setSubViewMode('props')} className={clsx("px-4 py-1.5 rounded text-xs font-bold uppercase transition-all", subViewMode === 'props' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white")}>Player Prop Edge Plays</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={clsx("flex items-center gap-2 px-4 py-1.5 border rounded-full text-xs font-black uppercase tracking-widest", selectedId === 'live-current' && viewMode === 'daily' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse" : (viewMode === 'sunday' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-slate-800 border-slate-600 text-slate-300"))}>
                                        {selectedId === 'live-current' && viewMode === 'daily' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                        {displayedTitle}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono bg-slate-900/50 px-3 py-1 rounded-lg border border-slate-800"><Clock size={12} />{displayedDate}</div>
                            </div>

                            {/* CONTENT RENDERING */}
                            <div className="relative z-10 font-sans min-h-[400px]">
                                {subViewMode === 'team' || viewMode === 'sunday' ? (
                                    renderMarkdown(displayedContent)
                                ) : (
                                    /* SUB-VIEW: TOP PLAYER PROPS */
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <h3 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-2"><Zap size={20}/> Top Prop Edges (Model Output)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {topPropCards.map(prop => (
                                                <div key={prop.id} className="bg-slate-900 border border-purple-500/20 p-4 rounded-xl flex items-center gap-4 hover:bg-slate-800 transition-colors">
                                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-xs border border-purple-500/30">
                                                        {prop.confidence === 'HIGH' ? 'A+' : 'A'}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between">
                                                            <span className="text-white font-bold text-sm">{prop.player}</span>
                                                            <span className="text-emerald-400 font-bold text-xs">+{prop.ev}% EV</span>
                                                        </div>
                                                        <div className="text-slate-400 text-xs mt-1">
                                                            {prop.side} <span className="text-white font-mono">{prop.line}</span> {prop.stat}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-16 pt-8 border-t border-dashed border-slate-800 flex gap-3 items-start opacity-40 hover:opacity-100 transition-opacity">
                                <AlertCircle className="text-slate-500 shrink-0" size={16} />
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-relaxed font-mono">NOESIS QUANTUM MODEL v2025.1 | OUTPUT IS PROBABILISTIC NOT GUARANTEED.<br/>All information provided is for educational purposes. Wager responsibly.</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="order-2 lg:order-1"><LiveOdds /></div>
                    <div className="glass-panel p-6 rounded-2xl sticky top-28 border border-slate-700/50 order-1 lg:order-2">
                        <h3 className={clsx("font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-sm", viewMode === 'daily' ? "text-emerald-400" : "text-amber-400")}><Archive size={16} />{viewMode === 'daily' ? 'Picks Archive' : 'Summary History'}</h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {viewMode === 'daily' && (
                                <><button onClick={handleLiveReset} className={clsx("w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group", selectedId === 'live-current' ? "bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-emerald-500/50 hover:text-white")}><div><div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">Current Edge {selectedId === 'live-current' && <Wifi size={10} className="animate-pulse text-emerald-400"/>}</div><div className="text-[10px] opacity-60 font-mono mt-1">Live Action</div></div>{selectedId === 'live-current' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}</button><div className="h-px bg-slate-800 my-2"></div></>
                            )}
                            {(viewMode === 'daily' ? archives : gameSummaries).length > 0 ? ((viewMode === 'daily' ? archives : gameSummaries).map(item => (<button key={item.id} onClick={() => handleSidebarClick(viewMode === 'daily' ? 'archive' : 'summary', item)} className={clsx("w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group", selectedId === item.id ? (viewMode === 'daily' ? "bg-purple-500/20 border-purple-500 text-white" : "bg-amber-500/20 border-amber-500 text-white") : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white", viewMode === 'daily' ? "hover:border-purple-500/50" : "hover:border-amber-500/50")}><div className="overflow-hidden"><div className="font-bold text-xs uppercase tracking-wider truncate">{item.title}</div><div className="text-[10px] opacity-60 font-mono mt-1">{item.date}</div></div><ChevronRight size={14} className={clsx("opacity-0 group-hover:opacity-100 transition-opacity shrink-0", viewMode === 'daily' ? "text-purple-400" : "text-amber-400")} /></button>))) : (<div className="text-center text-slate-600 text-xs py-4 border border-dashed border-slate-800 rounded-lg">No history found.</div>)}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
