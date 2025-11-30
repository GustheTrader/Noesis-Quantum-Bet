
import React, { useState, useEffect } from 'react';
import { Target, AlertCircle, Clock, Archive, ChevronRight, BookOpen, Layers, Wifi, User, Zap, TrendingUp, BadgePercent, Shuffle, Trophy } from 'lucide-react';
import { PickArchiveItem, GameSummary } from '../types';
import { LiveOdds } from '../components/LiveOdds';
import { clsx } from 'clsx';

// --- MOCK DATA FOR EDGE PROP GENERATOR ---
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
}

interface EdgeSlip {
    id: string;
    type: '2-LEG POWER' | '3-LEG FLEX' | '4-LEG EDGE';
    platform: 'PrizePicks' | 'Underdog' | 'Betr' | 'Sleeper';
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

export const Picks: React.FC<PicksProps> = ({ currentContent, archives, gameSummaries }) => {
  // Navigation State
  const [viewMode, setViewMode] = useState<'daily' | 'sunday' | 'edgeprop'>('daily');
  
  // Content State
  const [displayedContent, setDisplayedContent] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedDate, setDisplayedDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Edge Prop State
  const [generatedSlips, setGeneratedSlips] = useState<EdgeSlip[]>([]);

  // Initialize view when tabs change or data updates
  useEffect(() => {
    if (viewMode === 'daily') {
        // Default to Current Live Picks
        setDisplayedContent(currentContent);
        setDisplayedTitle("Live Edge Action");
        setDisplayedDate(new Date().toLocaleDateString());
        setSelectedId('live-current');
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
    }
  }, [viewMode, currentContent, gameSummaries]);

  // Handler for Sidebar Clicks
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

  // --- EDGE PROP GENERATOR LOGIC ---
  const generateEdgeSlips = () => {
      const createLeg = () => {
          const player = PROP_PLAYERS[Math.floor(Math.random() * PROP_PLAYERS.length)];
          const stat = PROP_STATS[Math.floor(Math.random() * PROP_STATS.length)];
          const line = Math.floor(Math.random() * 50) + 10.5;
          const ev = Math.random() * 8 + 1.5; // 1.5% to 9.5% EV
          return {
              player,
              stat,
              line,
              side: Math.random() > 0.5 ? 'OVER' : 'UNDER' as 'OVER' | 'UNDER',
              ev: parseFloat(ev.toFixed(1)),
              sharpOdds: -130 - Math.floor(Math.random() * 30) // -130 to -160
          };
      };

      const slips: EdgeSlip[] = [
          {
              id: 'slip-1',
              type: '2-LEG POWER',
              platform: 'Betr',
              totalEv: 12.4,
              impliedOdds: '3.0x',
              legs: [createLeg(), createLeg()]
          },
          {
              id: 'slip-2',
              type: '3-LEG FLEX',
              platform: 'PrizePicks',
              totalEv: 18.2,
              impliedOdds: '2.25x / 5.0x',
              legs: [createLeg(), createLeg(), createLeg()]
          },
          {
              id: 'slip-3',
              type: '4-LEG EDGE',
              platform: 'Underdog',
              totalEv: 24.5,
              impliedOdds: '10.0x',
              legs: [createLeg(), createLeg(), createLeg(), createLeg()]
          }
      ];
      setGeneratedSlips(slips);
  };

  const formatBold = (text: string) => {
    // Replaces **text** with a span that is white and bold
    return text.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-black tracking-wide">$1</span>');
  };

  // State to track if we are currently inside the "Player Props" section
  let inPlayerPropsSection = false;

  // Robust MD Parser for consistent styling
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Split lines
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

        // Safety Strip: Remove code fences
        if (trimmed.startsWith('```')) continue;

        // Headers
        if (line.startsWith('# ')) {
            flushProps(`h1-${i}`);
            inPlayerPropsSection = false;
            nodes.push(
                <h1 key={i} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-10 mb-6 uppercase tracking-tighter drop-shadow-sm border-b-2 border-slate-800/50 pb-4">
                    {line.replace('# ', '')}
                </h1>
            );
            continue;
        }

        if (line.startsWith('## ')) {
            flushProps(`h2-${i}`);
            const headerText = line.replace('## ', '').toUpperCase();
            
            // Detect Player Props Section specifically
            if (headerText.includes('PROPS') || headerText.includes('PLAYER')) {
                inPlayerPropsSection = true;
                nodes.push(
                    <h2 key={i} className="text-xl font-bold text-yellow-400 border-l-4 border-yellow-500 pl-4 mt-8 mb-4 uppercase tracking-widest bg-gradient-to-r from-slate-900 to-transparent py-2 flex items-center gap-2">
                        <Zap size={20} />
                        {headerText}
                    </h2>
                );
            } else {
                inPlayerPropsSection = false;
                nodes.push(
                    <h2 key={i} className="text-xl font-bold text-white border-l-4 border-cyan-500 pl-4 mt-8 mb-4 uppercase tracking-widest bg-gradient-to-r from-slate-900 to-transparent py-2">
                        {headerText}
                    </h2>
                );
            }
            continue;
        }

        if (line.startsWith('### ')) {
            flushProps(`h3-${i}`);
            nodes.push(
                <h3 key={i} className="text-lg font-bold text-purple-400 mt-6 mb-2 uppercase tracking-wide">
                    {line.replace('### ', '')}
                </h3>
            );
            continue;
        }

        // List Items (Bullets)
        if (trimmed.startsWith('- ')) {
            const content = trimmed.replace('- ', '');
            
            if (inPlayerPropsSection) {
                // SPECIAL RENDER FOR PROPS
                // Try to parse format like: "**Name** Over X Yards" or just bold text
                propBuffer.push(
                    <div key={`prop-${i}`} className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-xl flex items-start gap-4 hover:border-yellow-500/50 hover:bg-black transition-all group shadow-lg">
                         <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition-transform">
                            <User size={20} />
                         </div>
                         <div>
                             <div className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(content) }}></div>
                             <div className="mt-2 flex gap-2">
                                 <span className="text-[9px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest">Prop Bet</span>
                             </div>
                         </div>
                    </div>
                );
            } else {
                // Standard List
                nodes.push(
                    <li key={i} className="flex items-start gap-3 ml-2 mb-3 text-slate-300 text-sm leading-relaxed group">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)] group-hover:scale-125 transition-transform"></span>
                        <span className="group-hover:text-slate-200 transition-colors" dangerouslySetInnerHTML={{ __html: formatBold(content) }}></span>
                    </li>
                );
            }
            continue;
        }
        
        // Numbered Lists
        if (trimmed.match(/^\d+\./)) {
             flushProps(`num-${i}`);
             const number = trimmed.split('.')[0];
             const content = trimmed.replace(/^\d+\.\s*/, '');
             nodes.push(
                <div key={i} className="flex items-start gap-3 ml-2 mb-3 text-slate-300 text-sm group">
                   <span className="text-cyan-400 font-bold font-mono mt-0.5">{number}.</span>
                   <span className="group-hover:text-slate-200 transition-colors" dangerouslySetInnerHTML={{ __html: formatBold(content) }}></span>
                </div>
             )
             continue;
        }

        // Paragraphs
        if (trimmed.length > 0) {
             flushProps(`p-${i}`);
             if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                 nodes.push(
                    <h3 key={i} className="text-lg font-bold text-indigo-400 mt-6 mb-2 uppercase tracking-wide border-b border-indigo-500/20 pb-1 w-fit">
                        {trimmed.replace(/\*\*/g, '')}
                    </h3>
                 );
             } else {
                 nodes.push(
                    <p key={i} className="mb-4 text-slate-400 text-sm leading-7 font-medium max-w-4xl" dangerouslySetInnerHTML={{ __html: formatBold(line) }}></p>
                 );
             }
             continue;
        }

        // Spacers
        nodes.push(<div key={i} className="h-2"></div>);
    }
    
    // Final flush
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
                    Daily Edge Picks
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
                    EdgeProp Player
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
                                    {/* Badge */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className={clsx(
                                                "text-xs font-black uppercase tracking-widest mb-1",
                                                slip.platform === 'Betr' ? "text-purple-400" : 
                                                slip.platform === 'PrizePicks' ? "text-emerald-400" : "text-yellow-400"
                                            )}>
                                                {slip.platform}
                                            </div>
                                            <h3 className="text-xl font-black text-white">{slip.type}</h3>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center min-w-[60px]">
                                            <div className="text-[10px] text-slate-500 uppercase">Payout</div>
                                            <div className="text-lg font-mono font-bold text-white">{slip.impliedOdds}</div>
                                        </div>
                                    </div>

                                    {/* Legs */}
                                    <div className="space-y-4 mb-6 flex-grow">
                                        {slip.legs.map((leg, lIdx) => (
                                            <div key={lIdx} className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs",
                                                    slip.platform === 'Betr' ? "bg-purple-500/20 text-purple-400" :
                                                    slip.platform === 'PrizePicks' ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"
                                                )}>
                                                    {lIdx + 1}
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-bold text-white">{leg.player}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">Sharp: {leg.sharpOdds}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-xs text-slate-400">{leg.side} {leg.line} {leg.stat}</span>
                                                        <span className="text-xs font-bold text-emerald-400">+{leg.ev}% EV</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <BadgePercent size={16} className="text-cyan-400" />
                                            <span className="text-sm font-bold text-white">Total Edge: <span className="text-cyan-400">+{slip.totalEv}%</span></span>
                                        </div>
                                        <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                            <Shuffle size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 text-center">
                     <button onClick={generateEdgeSlips} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold uppercase tracking-wider text-xs border border-slate-700 hover:border-cyan-500 transition-all flex items-center gap-2 mx-auto">
                        <RefreshCwIcon size={16} className="animate-spin-slow" />
                        Regenerate Opportunity Set
                     </button>
                </div>
            </div>
        ) : (
            /* ==================================
               STANDARD PICK / SUMMARY VIEW
               ================================== */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Main Content Area (Unified for both Tabs) */}
                <div className="lg:col-span-3">
                    <div className={clsx(
                        "glass-panel p-1 rounded-2xl mb-8 border shadow-[0_0_50px_rgba(0,0,0,0.2)]",
                        viewMode === 'daily' ? "border-emerald-500/30 shadow-emerald-500/10" : "border-amber-500/30 shadow-amber-500/10"
                    )}>
                        <div className="bg-gradient-to-b from-slate-900/95 to-black/95 p-8 rounded-xl min-h-[70vh] relative overflow-hidden">
                            
                            {/* Background Deco */}
                            <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
                                <Target className={clsx(
                                    "w-40 h-40 absolute top-4 right-4 animate-pulse-slow opacity-20",
                                    viewMode === 'daily' ? "text-emerald-500" : "text-amber-500"
                                )} />
                            </div>
                            
                            {/* Header Bar */}
                            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "flex items-center gap-2 px-4 py-1.5 border rounded-full text-xs font-black uppercase tracking-widest",
                                        selectedId === 'live-current' && viewMode === 'daily'
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse"
                                            : (viewMode === 'sunday' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-slate-800 border-slate-600 text-slate-300")
                                    )}>
                                        {selectedId === 'live-current' && viewMode === 'daily' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                        {displayedTitle}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono bg-slate-900/50 px-3 py-1 rounded-lg border border-slate-800">
                                    <Clock size={12} />
                                    {displayedDate}
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="relative z-10 font-sans min-h-[400px]">
                                {renderMarkdown(displayedContent)}
                            </div>

                            {/* Footer Disclaimer */}
                            <div className="mt-16 pt-8 border-t border-dashed border-slate-800 flex gap-3 items-start opacity-40 hover:opacity-100 transition-opacity">
                                <AlertCircle className="text-slate-500 shrink-0" size={16} />
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-relaxed font-mono">
                                    NOESIS QUANTUM MODEL v2025.1 | OUTPUT IS PROBABILISTIC NOT GUARANTEED.
                                    <br/>All information provided is for educational purposes. Wager responsibly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Dynamic Context */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Live Odds (Visible in Both for Ref) */}
                    <div className="order-2 lg:order-1">
                        <LiveOdds />
                    </div>

                    {/* Contextual History List */}
                    <div className="glass-panel p-6 rounded-2xl sticky top-28 border border-slate-700/50 order-1 lg:order-2">
                        <h3 className={clsx(
                            "font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-sm",
                            viewMode === 'daily' ? "text-emerald-400" : "text-amber-400"
                        )}>
                            <Archive size={16} />
                            {viewMode === 'daily' ? 'Picks Archive' : 'Summary History'}
                        </h3>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {viewMode === 'daily' && (
                                <>
                                    {/* "Live" Button */}
                                    <button 
                                        onClick={handleLiveReset}
                                        className={clsx(
                                            "w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group",
                                            selectedId === 'live-current'
                                            ? "bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-emerald-500/50 hover:text-white"
                                        )}
                                    >
                                        <div>
                                            <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                                Current Edge
                                                {selectedId === 'live-current' && <Wifi size={10} className="animate-pulse text-emerald-400"/>}
                                            </div>
                                            <div className="text-[10px] opacity-60 font-mono mt-1">Live Action</div>
                                        </div>
                                        {selectedId === 'live-current' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}
                                    </button>
                                    <div className="h-px bg-slate-800 my-2"></div>
                                </>
                            )}

                            {/* List Items */}
                            {(viewMode === 'daily' ? archives : gameSummaries).length > 0 ? (
                                (viewMode === 'daily' ? archives : gameSummaries).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSidebarClick(viewMode === 'daily' ? 'archive' : 'summary', item)}
                                        className={clsx(
                                            "w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group",
                                            selectedId === item.id
                                            ? (viewMode === 'daily' ? "bg-purple-500/20 border-purple-500 text-white" : "bg-amber-500/20 border-amber-500 text-white")
                                            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white",
                                            viewMode === 'daily' ? "hover:border-purple-500/50" : "hover:border-amber-500/50"
                                        )}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="font-bold text-xs uppercase tracking-wider truncate">{item.title}</div>
                                            <div className="text-[10px] opacity-60 font-mono mt-1">{item.date}</div>
                                        </div>
                                        <ChevronRight size={14} className={clsx(
                                            "opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                                            viewMode === 'daily' ? "text-purple-400" : "text-amber-400"
                                        )} />
                                    </button>
                                ))
                            ) : (
                                <div className="text-center text-slate-600 text-xs py-4 border border-dashed border-slate-800 rounded-lg">
                                    No history found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        )}
    </div>
  );
};

function RefreshCwIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
        </svg>
    )
}
