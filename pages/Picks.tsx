
import React, { useState, useEffect, useMemo } from 'react';
import { Target, Archive, BookOpen, Zap, Star, FileText, Plus, X, DollarSign, Loader2, Play, Info, AlertTriangle, Shield, Layers, TrendingUp, ChevronRight, BarChart3, Activity, Lock, Trash2, ShoppingCart } from 'lucide-react';
import { PickArchiveItem, GameSummary, League } from '../types';
import { HighlightReel } from '../components/HighlightReel';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';

// --- TEAM MAPPING FOR LOGOS ---
const TEAM_MAP: Record<string, { code: string; league: string }> = {
  // NFL
  'Cardinals': { code: 'ARI', league: 'nfl' }, 'Falcons': { code: 'ATL', league: 'nfl' }, 'Ravens': { code: 'BAL', league: 'nfl' }, 
  'Bills': { code: 'BUF', league: 'nfl' }, 'Chiefs': { code: 'KC', league: 'nfl' }, 'Eagles': { code: 'PHI', league: 'nfl' },
  // NBA
  'Lakers': { code: 'lal', league: 'nba' }, 'Suns': { code: 'phx', league: 'nba' }, 'Celtics': { code: 'bos', league: 'nba' },
  'Warriors': { code: 'gsw', league: 'nba' }, 'Knicks': { code: 'nyk', league: 'nba' },
  // NHL
  'Maple Leafs': { code: 'tor', league: 'nhl' }, 'Bruins': { code: 'bos', league: 'nhl' }, 'Rangers': { code: 'nyr', league: 'nhl' },
  // MLB
  'Dodgers': { code: 'lad', league: 'mlb' }, 'Yankees': { code: 'nyy', league: 'mlb' }, 'Braves': { code: 'atl', league: 'mlb' }
};

const getTeamInfo = (entity: string) => {
  const normalized = entity.toLowerCase();
  for (const [team, info] of Object.entries(TEAM_MAP)) {
    if (normalized.includes(team.toLowerCase())) return info;
  }
  return null;
};

interface ExtractedPick {
    id: string;
    entity: string;
    market: string;
    odds: string;
    analysis: string;
    confidence: number;
    units: number;
    risks: string;
    ev?: string;
    sharpLine?: string;
    bookLine?: string;
    isParlay?: boolean;
    legs?: { team: string; line: string }[];
}

interface BetSlipItem extends ExtractedPick {
    stake: number;
    toWin: number;
}

interface PicksProps {
  league: League;
  currentContent: string;
  archives: PickArchiveItem[];
  gameSummaries: GameSummary[];
  propsData: any[];
}

const PositionCard: React.FC<{ pick: ExtractedPick; unitValue: number; onAddPick: (p: ExtractedPick) => void; league: League }> = ({ pick, unitValue, onAddPick, league }) => {
    const teamInfo = getTeamInfo(pick.entity);
    const logoUrl = teamInfo ? `https://a.espncdn.com/i/teamlogos/${teamInfo.league}/500/${teamInfo.code.toLowerCase()}.png` : null;

    return (
        <div className={clsx(
            "bg-[#0a0e17] rounded-[32px] border border-[#2d334a]/40 overflow-hidden flex flex-col h-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-all",
            league === 'NFL' ? "hover:border-indigo-500/50" : league === 'NBA' ? "hover:border-orange-500/50" : league === 'NHL' ? "hover:border-cyan-500/50" : "hover:border-rose-500/50"
        )}>
            <div className="p-6 relative">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#1a1f35] flex items-center justify-center p-3 border border-[#3d4464] shadow-inner group-hover:scale-110 transition-transform duration-500">
                            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <Target className="text-slate-600" size={32} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#2d334a] text-[#7c86a3] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-[0.1em]">{pick.market}</span>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={10} className={clsx(i < pick.confidence ? "text-[#ffd700] fill-[#ffd700] drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]" : "text-[#1a1f35] fill-[#1a1f35]")} />
                                    ))}
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">{pick.entity}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-white font-mono leading-none">{pick.odds}</div>
                        <div className="text-[10px] text-[#5c668b] uppercase font-black tracking-widest mt-1">Price</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="bg-[#080b13] border border-[#1a1f35] rounded-xl p-3 flex flex-col items-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Book Line</span>
                        <span className="text-sm font-mono font-bold text-white">{pick.bookLine || '--'}</span>
                    </div>
                    <div className="bg-[#080b13] border border-cyan-500/20 rounded-xl p-3 flex flex-col items-center">
                        <span className="text-[8px] font-black text-cyan-500/70 uppercase tracking-widest mb-1">Sharp Avg</span>
                        <span className="text-sm font-mono font-bold text-cyan-400">{pick.sharpLine || '--'}</span>
                    </div>
                    <div className="bg-[#080b13] border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center">
                        <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Model EV</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{pick.ev || '0.0%'}</span>
                    </div>
                </div>

                <div className="bg-[#05070a] rounded-2xl p-5 mb-5 border border-[#1a1f35] shadow-inner min-h-[100px]">
                    <div className="text-[10px] text-[#4f5b93] font-black uppercase mb-2 tracking-widest flex items-center gap-2">
                         <FileText size={12} className="text-indigo-400" /> {league} Intelligence
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-3">{pick.analysis}</p>
                </div>

                <div className="bg-[#1a0e14] border border-[#5a1e27] rounded-xl p-4 flex items-start gap-4">
                    <AlertTriangle size={20} className="text-[#f43f5e] shrink-0" />
                    <div>
                        <span className="text-[10px] font-black text-[#f43f5e] uppercase tracking-[0.2em] block mb-1">Risk Profile</span>
                        <p className="text-[11px] text-[#fca5a5] font-mono leading-snug">{pick.risks}</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto bg-[#080b13] border-t border-[#1a1f35] p-6 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div>
                        <div className="text-[9px] text-[#5c668b] uppercase font-black tracking-[0.3em] mb-1">Exposure</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-[#5c7cff] font-mono leading-none">{pick.units}</span>
                            <span className="text-[10px] font-bold text-[#5c668b] uppercase">units</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-[#1a1f35]"></div>
                    <div>
                        <div className="text-[9px] text-[#5c668b] uppercase font-black tracking-[0.3em] mb-1">Dollar Risk</div>
                        <div className="text-2xl font-black text-white font-mono leading-none">${(pick.units * unitValue).toLocaleString()}</div>
                    </div>
                </div>
                <button 
                    onClick={() => onAddPick(pick)}
                    className={clsx(
                        "w-14 h-14 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 group/btn",
                        league === 'NFL' ? "bg-indigo-600 hover:bg-indigo-500" : league === 'NBA' ? "bg-orange-600 hover:bg-orange-500" : league === 'NHL' ? "bg-cyan-600 hover:bg-cyan-500" : "bg-rose-600 hover:bg-rose-500"
                    )}
                >
                    <Plus size={32} strokeWidth={3} className="group-hover/btn:rotate-90 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export const Picks: React.FC<PicksProps> = ({ league, currentContent, archives, gameSummaries }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'sunday'>('daily');
  const [displayedContent, setDisplayedContent] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unitValue, setUnitValue] = useState(100);
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);

  useEffect(() => {
      setIsLocked(true);
  }, [league]);

  const { singlePicks, parlayPicks } = useMemo(() => {
    const singles: ExtractedPick[] = [];
    const parlays: ExtractedPick[] = [];
    const sections = displayedContent.split('##');
    
    sections.forEach(section => {
        const lines = section.split('\n');
        const isParlaySection = lines[0].toLowerCase().includes('parlay');
        lines.forEach((line, i) => {
            const cleanLine = line.trim();
            const match = cleanLine.match(/^[-*]\s+\*\*(.*?)\*\*\s*(?:\((.*?)\))?(?:\s*\|\s*Conf:\s*(\d+))?(?:\s*\|\s*Units:\s*([\d.]+)u?)?(?:\s*\|\s*EV:\s*(.*?))?(?:\s*\|\s*Sharp:\s*(.*?))?(?:\s*\|\s*Book:\s*(.*?))?(?:\s*\|\s*Risks:\s*(.*))?$/i);
            if (match) {
                const [_, entity, odds, confidence, units, ev, sharp, book, risks] = match;
                const pick: ExtractedPick = {
                    id: `pick-${Date.now()}-${i}`,
                    entity: entity || "Unknown Position",
                    market: league,
                    odds: odds || "-110",
                    analysis: lines[i+1]?.startsWith('  ') ? lines[i+1].trim() : `Model identified significant ${league} liquidity gap.`,
                    confidence: parseInt(confidence) || 3,
                    units: parseFloat(units) || 1.0,
                    risks: risks || "Standard market variance.",
                    ev: ev || '4.2%',
                    sharpLine: sharp || odds,
                    bookLine: book || odds,
                    isParlay: isParlaySection
                };
                if (isParlaySection) parlays.push(pick);
                else singles.push(pick);
            }
        });
    });
    return { singlePicks: singles, parlayPicks: parlays };
  }, [displayedContent, league]);

  useEffect(() => {
    const leagueArchives = archives.filter(a => a.league === league);
    const leagueSummaries = gameSummaries.filter(s => s.league === league);

    if (viewMode === 'daily') {
        setDisplayedContent(currentContent || `# ${league} ALPHA FEED\n\nNo active signals detected for this protocol.`);
        setDisplayedTitle(`${league} Active Board`);
        setSelectedId('live-current');
    } else {
        if (leagueSummaries.length > 0) {
            setDisplayedContent(leagueSummaries[0].content);
            setDisplayedTitle(leagueSummaries[0].title);
            setSelectedId(leagueSummaries[0].id);
        }
    }
  }, [viewMode, currentContent, archives, gameSummaries, league]);

  const handleClearSlip = () => {
    if (betSlip.length === 0) return;
    if (window.confirm('Are you sure you want to clear the current bet slip? This will remove all pending selections.')) {
        setBetSlip([]);
    }
  };

  const handleRemovePick = (id: string) => {
    setBetSlip(prev => prev.filter(p => p.id !== id));
  };

  const accentColor = league === 'NFL' ? 'indigo' : league === 'NBA' ? 'orange' : league === 'NHL' ? 'cyan' : 'rose';
  const accentClass = `text-${accentColor}-500`;
  const bgAccentClass = `bg-${accentColor}-600`;

  if (isLocked) {
      return (
          <div className="min-h-[80vh] flex items-center justify-center p-6">
              <div className="w-full max-w-xl glass-panel p-10 rounded-[48px] border border-white/10 shadow-2xl text-center relative overflow-hidden group">
                  <div className={clsx("absolute -top-20 -right-20 w-64 h-64 blur-3xl opacity-10 rounded-full", `bg-${accentColor}-500`)}></div>
                  <div className={clsx("w-20 h-20 rounded-3xl mx-auto mb-8 flex items-center justify-center border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500", `bg-${accentColor}-500/10`)}>
                      <Lock size={40} className={accentClass} />
                  </div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">{league} Core Linked</h2>
                  <p className="text-slate-400 mb-10 text-sm leading-relaxed">
                      Establishing encrypted handshake with the <span className={accentClass}>{league} Analytical Subsystem</span>. 
                      Neural weights loaded. Synchronizing bookmaker feeds.
                  </p>
                  <button 
                    onClick={() => setIsLocked(false)}
                    className={clsx("w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-sm text-white shadow-xl transition-all active:scale-[0.98]", bgAccentClass)}
                  >
                      Initiate Protocol
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-6 py-10 animate-in fade-in duration-1000">
        <div className="flex flex-col xl:flex-row items-center justify-between mb-16 gap-8 border-b border-white/5 pb-8">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                    <div className={clsx("w-2 h-2 rounded-full shadow-lg animate-pulse", `bg-${accentColor}-500`)}></div>
                    <span className={clsx("text-[10px] font-black uppercase tracking-[0.4em]", accentClass)}>{league} Proprietary Data Feed</span>
                </div>
                <h1 className="text-7xl font-black tracking-tighter leading-none flex items-center">
                    <span className="text-white">MARKET</span>
                    <span className={clsx("ml-3", accentClass)}>BOARD</span>
                </h1>
            </div>

            <div className="flex items-center gap-4 bg-black/40 p-2 rounded-full border border-[#1a1f35] backdrop-blur-xl">
                <div className="flex items-center bg-[#0a0e17] rounded-full p-1 border border-white/5 shadow-inner">
                    <button onClick={() => setViewMode('daily')} className={clsx("flex items-center gap-2 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'daily' ? `${bgAccentClass} text-white` : "text-slate-500 hover:text-white")}> <Target size={14} /> POSITIONS </button>
                    <button onClick={() => setViewMode('sunday')} className={clsx("flex items-center gap-2 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'sunday' ? `${bgAccentClass} text-white` : "text-slate-500 hover:text-white")}> <BookOpen size={14} /> RECAPS </button>
                </div>
                <div className="h-10 w-px bg-white/10 mx-2"></div>
                <div className="flex flex-col px-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Unit Value</span>
                    <div className="flex items-center gap-3">
                        <span className={clsx("text-lg font-black", accentClass)}>$</span>
                        <input type="number" value={unitValue} onChange={(e) => setUnitValue(Math.max(1, parseInt(e.target.value) || 0))} className="bg-black/60 border border-[#2d334a] rounded-lg w-24 px-3 py-1.5 text-sm font-mono font-black text-white focus:outline-none transition-colors" />
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">USD</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-3 space-y-10">
                {/* --- BET SLIP COMPONENT --- */}
                <div className="bg-[#0a0e17] p-8 rounded-[32px] border border-[#2d334a]/40 shadow-2xl relative overflow-hidden">
                    <div className={clsx("absolute top-0 right-0 p-4 opacity-10 pointer-events-none", accentClass)}>
                        <ShoppingCart size={80} />
                    </div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className={clsx("font-black uppercase tracking-[0.3em] flex items-center gap-3 text-[11px]", accentClass)}>
                            <ShoppingCart size={18} /> Position Slip
                        </h3>
                        <span className="bg-slate-800 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">{betSlip.length}</span>
                    </div>

                    <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                        {betSlip.length > 0 ? betSlip.map((item) => (
                            <div key={item.id} className="bg-black/40 border border-[#1a1f35] rounded-2xl p-4 group/item">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-black text-white text-xs uppercase truncate pr-4">{item.entity}</div>
                                    <button onClick={() => handleRemovePick(item.id)} className="text-slate-600 hover:text-rose-500 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-mono text-slate-500">
                                        {item.units}u @ {item.odds}
                                    </div>
                                    <div className={clsx("text-xs font-black font-mono", accentClass)}>
                                        ${item.stake.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center text-slate-700 italic text-xs font-mono border border-dashed border-slate-800/50 rounded-2xl">
                                Slip is empty.
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2">
                            <span>Total Stake</span>
                            <span className="text-white font-mono">${betSlip.reduce((acc, curr) => acc + curr.stake, 0).toLocaleString()}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                disabled={betSlip.length === 0}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed",
                                    bgAccentClass
                                )}
                            >
                                Execute Positions
                            </button>
                            
                            <button 
                                onClick={handleClearSlip}
                                disabled={betSlip.length === 0}
                                className="w-full py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={14} />
                                Clear Slip
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0a0e17] p-8 rounded-[32px] border border-[#1a1f35]">
                    <h3 className={clsx("font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-[11px]", accentClass)}>
                        <Archive size={18} /> {league} Repository
                    </h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
                        {archives.filter(a => a.league === league).map(item => (
                            <button key={item.id} onClick={() => { setDisplayedContent(item.content); setDisplayedTitle(item.title); setSelectedId(item.id); }} className={clsx("w-full text-left p-5 rounded-2xl border transition-all", selectedId === item.id ? `bg-${accentColor}-600/10 border-${accentColor}-500 text-white` : "bg-black/40 border-[#1a1f35] text-[#5c668b] hover:border-[#3d4464]")}>
                                <div className="font-black text-[11px] uppercase truncate mb-1">{item.title}</div>
                                <div className="text-[9px] font-mono opacity-50">{item.date}</div>
                            </button>
                        ))}
                    </div>
                </div>
                <HighlightReel />
            </div>

            <div className="lg:col-span-9">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    {singlePicks.map(pick => (
                        <PositionCard key={pick.id} pick={pick} unitValue={unitValue} onAddPick={(p) => setBetSlip(prev => [...prev, {...p, stake: p.units*unitValue, toWin: 0}])} league={league} />
                    ))}
                </div>
                {singlePicks.length === 0 && (
                    <div className="py-32 text-center glass-panel rounded-[48px] border-dashed border-white/5">
                        <Activity size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Awaiting {league} Signals...</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
