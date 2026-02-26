
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Archive, BookOpen, Zap, Star, FileText, Plus, X, DollarSign, Loader2, Play, Info, AlertTriangle, Shield, Layers, TrendingUp, ChevronRight, BarChart3, Activity, Lock, Trash2, ShoppingCart, Anchor } from 'lucide-react';
import { PickArchiveItem, GameSummary, League } from '../types';
import { HighlightReel } from '../components/HighlightReel';
import { LiveOdds } from '../components/LiveOdds';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';

// --- TEAM MAPPING FOR LOGOS ---
const TEAM_MAP: Record<string, { code: string; league: string }> = {
  // NFL
  'Cardinals': { code: 'ARI', league: 'nfl' }, 'Falcons': { code: 'ATL', league: 'nfl' }, 'Ravens': { code: 'BAL', league: 'nfl' }, 
  'Bills': { code: 'BUF', league: 'nfl' }, 'Chiefs': { code: 'KC', league: 'nfl' }, 'Eagles': { code: 'PHI', league: 'nfl' },
  'Lions': { code: 'det', league: 'nfl' }, 'Steelers': { code: 'pit', league: 'nfl' }, 'Cowboys': { code: 'dal', league: 'nfl' },
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
            "bg-[#0a0e17] rounded-[40px] border border-[#2d334a]/40 overflow-hidden flex flex-col h-full shadow-[0_30px_60px_rgba(0,0,0,0.6)] group transition-all",
            league === 'NFL' ? "hover:border-emerald-500/50" : league === 'NBA' ? "hover:border-orange-500/50" : league === 'NHL' ? "hover:border-cyan-500/50" : "hover:border-rose-500/50"
        )}>
            <div className="p-8 relative flex-grow">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-3xl bg-[#1a1f35] flex items-center justify-center p-4 border border-[#3d4464] shadow-2xl group-hover:scale-105 transition-transform duration-500">
                            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <Target className="text-slate-600" size={40} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-indigo-500/20">{pick.market} Protocol</span>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={10} className={clsx(i < pick.confidence ? "text-[#ffd700] fill-[#ffd700]" : "text-[#1a1f35] fill-[#1a1f35]")} />
                                    ))}
                                </div>
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight group-hover:text-emerald-400 transition-colors">{pick.entity}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-white font-mono leading-none tracking-tighter">{pick.odds}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Live Price</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-black/40 border border-[#1a1f35] rounded-2xl p-4 flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Sharp Agg</span>
                        <span className="text-sm font-mono font-bold text-white">{pick.sharpLine || '--'}</span>
                    </div>
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex flex-col items-center">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Model EV</span>
                        <span className="text-sm font-mono font-bold text-indigo-400">{pick.ev || '0.0%'}</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex flex-col items-center">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">P(Win)</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{(pick.confidence * 12 + 20)}%</span>
                    </div>
                </div>

                {/* TEXT BELOW: CORE ANALYSIS */}
                <div className="space-y-6">
                    <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 relative overflow-hidden group-hover:bg-white/[0.04] transition-all">
                        <div className="text-[10px] text-slate-500 font-black uppercase mb-3 tracking-[0.3em] flex items-center gap-2">
                             <FileText size={14} className="text-indigo-400" /> System Thesis
                        </div>
                        <p className="text-[13px] text-slate-300 leading-relaxed font-medium italic">
                            "{pick.analysis}"
                        </p>
                    </div>

                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4">
                        <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Critical Variance</span>
                            <p className="text-[11px] text-rose-300 font-mono leading-relaxed opacity-80">{pick.risks}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#080b13] border-t border-white/5 p-8 flex items-center justify-between">
                <div className="flex items-center gap-10">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-1">Handicap</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-emerald-400 font-mono leading-none">{pick.units}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">u</span>
                        </div>
                    </div>
                    <div className="w-px h-12 bg-white/5"></div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.3em] mb-1">Stake Value</div>
                        <div className="text-3xl font-black text-white font-mono leading-none">${(pick.units * unitValue).toLocaleString()}</div>
                    </div>
                </div>
                <button 
                    onClick={() => onAddPick(pick)}
                    className={clsx(
                        "w-16 h-16 text-white rounded-3xl flex items-center justify-center transition-all shadow-2xl active:scale-95 group/btn",
                        league === 'NFL' ? "bg-emerald-600 hover:bg-emerald-500" : league === 'NBA' ? "bg-orange-600 hover:bg-orange-500" : league === 'NHL' ? "bg-cyan-600 hover:bg-cyan-500" : "bg-rose-600 hover:bg-rose-500"
                    )}
                >
                    <Plus size={36} strokeWidth={3} className="group-hover/btn:rotate-90 transition-transform" />
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
                    analysis: lines[i+1]?.startsWith('  ') ? lines[i+1].trim() : `Model identified structural ${league} inefficiency relative to sharp benchmarks. Liquidity flow supports entry.`,
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
    if (viewMode === 'daily') {
        setDisplayedContent(currentContent || `# ${league} ALPHA FEED\n\nNo active signals detected.`);
        setDisplayedTitle(`${league} Active Board`);
        setSelectedId('live-current');
    } else {
        const leagueSummaries = gameSummaries.filter(s => s.league === league);
        if (leagueSummaries.length > 0) {
            setDisplayedContent(leagueSummaries[0].content);
            setDisplayedTitle(leagueSummaries[0].title);
            setSelectedId(leagueSummaries[0].id);
        }
    }
  }, [viewMode, currentContent, archives, gameSummaries, league]);

  const handleClearSlip = useCallback(() => setBetSlip([]), []);
  const handleRemovePick = (id: string) => setBetSlip(prev => prev.filter(p => p.id !== id));

  const accentColor = league === 'NFL' ? 'emerald' : league === 'NBA' ? 'orange' : league === 'NHL' ? 'cyan' : 'rose';
  const accentClass = `text-${accentColor}-500`;
  const bgAccentClass = `bg-${accentColor}-600`;

  if (isLocked) {
      return (
          <div className="min-h-[80vh] flex items-center justify-center p-6">
              <div className="w-full max-w-xl glass-panel p-12 rounded-[56px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] text-center relative overflow-hidden group">
                  <div className={clsx("absolute -top-20 -right-20 w-64 h-64 blur-[120px] opacity-20 rounded-full", `bg-${accentColor}-500`)}></div>
                  <div className={clsx("w-24 h-24 rounded-[32px] mx-auto mb-10 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500", `bg-${accentColor}-500/10`)}>
                      <Lock size={48} className={accentClass} />
                  </div>
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-6 leading-none">{league} Data Core</h2>
                  <p className="text-slate-400 mb-12 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                      Establishing neural handshake with the <span className={accentClass}>{league} Aggregator</span>. 
                      Weights synchronized. Bookmaker latency mapped.
                  </p>
                  <button 
                    onClick={() => setIsLocked(false)}
                    className={clsx("w-full py-6 rounded-3xl font-black uppercase tracking-[0.4em] text-xs text-white shadow-2xl transition-all active:scale-[0.98]", bgAccentClass)}
                  >
                      Initiate Protocol
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-6 py-10 animate-in fade-in duration-1000">
        <div className="flex flex-col xl:flex-row items-center justify-between mb-20 gap-10 border-b border-white/5 pb-12">
            <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                    <div className={clsx("w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(0,255,255,0.5)] animate-pulse", `bg-${accentColor}-400`)}></div>
                    <span className={clsx("text-[11px] font-black uppercase tracking-[0.5em] opacity-80", accentClass)}>Proprietary {league} Data Feed</span>
                </div>
                <h1 className="text-8xl font-black tracking-tighter leading-none flex items-center italic">
                    <span className="text-white">ALPHA</span>
                    <span className={clsx("ml-5", accentClass)}>FEED</span>
                </h1>
            </div>

            <div className="flex items-center gap-6 bg-black/40 p-3 rounded-[40px] border border-white/5 backdrop-blur-3xl shadow-2xl">
                <div className="flex items-center bg-[#0a0e17] rounded-[32px] p-1.5 border border-white/5 shadow-inner">
                    <button onClick={() => setViewMode('daily')} className={clsx("flex items-center gap-3 px-10 py-4 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all", viewMode === 'daily' ? `${bgAccentClass} text-white shadow-xl` : "text-slate-500 hover:text-white")}> <Target size={18} /> POSITIONS </button>
                    <button onClick={() => setViewMode('sunday')} className={clsx("flex items-center gap-3 px-10 py-4 rounded-[28px] text-[11px] font-black uppercase tracking-widest transition-all", viewMode === 'sunday' ? `${bgAccentClass} text-white shadow-xl` : "text-slate-500 hover:text-white")}> <BookOpen size={18} /> RECAPS </button>
                </div>
                <div className="h-14 w-px bg-white/10 mx-2"></div>
                <div className="flex flex-col px-6">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Account Unit Value</span>
                    <div className="flex items-center gap-4">
                        <span className={clsx("text-2xl font-black", accentClass)}>$</span>
                        <input type="number" value={unitValue} onChange={(e) => setUnitValue(Math.max(1, parseInt(e.target.value) || 0))} className="bg-black/60 border border-white/10 rounded-2xl w-28 px-5 py-2.5 text-lg font-mono font-black text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">USD</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-3 space-y-12">
                {league === 'NFL' && <LiveOdds />}

                <div className="bg-[#0a0e17] p-10 rounded-[48px] border border-white/5 shadow-3xl relative overflow-hidden">
                    <div className={clsx("absolute top-0 right-0 p-6 opacity-5 pointer-events-none", accentClass)}>
                        <ShoppingCart size={120} />
                    </div>
                    
                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <h3 className={clsx("font-black uppercase tracking-[0.4em] flex items-center gap-3 text-[12px]", accentClass)}>
                            <ShoppingCart size={20} /> Position Slip
                        </h3>
                        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-indigo-500/20">{betSlip.length}</span>
                    </div>

                    <div className="space-y-5 mb-10 max-h-[450px] overflow-y-auto custom-scrollbar pr-3 relative z-10">
                        {betSlip.length > 0 ? betSlip.map((item) => (
                            <div key={item.id} className="bg-black/40 border border-white/5 rounded-3xl p-5 group/item hover:border-white/10 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="font-black text-white text-xs uppercase truncate pr-6 tracking-tight">{item.entity}</div>
                                    <button onClick={() => handleRemovePick(item.id)} className="text-slate-600 hover:text-rose-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                                        {item.units}u @ {item.odds}
                                    </div>
                                    <div className={clsx("text-sm font-black font-mono", accentClass)}>
                                        ${item.stake.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center text-slate-700 italic text-sm font-mono border-2 border-dashed border-white/5 rounded-[32px]">
                                Awaiting Selections...
                            </div>
                        )}
                    </div>

                    <div className="space-y-5 relative z-10">
                        <div className="flex justify-between items-center text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] px-3">
                            <span>TOTAL EXPOSURE</span>
                            <span className="text-white font-mono text-lg">${betSlip.reduce((acc, curr) => acc + curr.stake, 0).toLocaleString()}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <button disabled={betSlip.length === 0} className={clsx("w-full py-5 rounded-[20px] font-black uppercase tracking-[0.3em] text-[10px] text-white shadow-2xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed", bgAccentClass)}>
                                Execute Handshake
                            </button>
                            <button onClick={handleClearSlip} disabled={betSlip.length === 0} className="w-full py-4 rounded-[20px] font-black uppercase tracking-[0.3em] text-[10px] text-rose-500 border border-rose-500/10 hover:bg-rose-500/5 transition-all flex items-center justify-center gap-2 disabled:opacity-20">
                                <Trash2 size={16} /> Clear Slip
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0a0e17] p-8 rounded-[40px] border border-white/5">
                    <h3 className={clsx("font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-[11px]", accentClass)}>
                        <Archive size={18} /> Archive Node
                    </h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
                        {archives.filter(a => a.league === league).map(item => (
                            <button key={item.id} onClick={() => { setDisplayedContent(item.content); setDisplayedTitle(item.title); setSelectedId(item.id); }} className={clsx("w-full text-left p-6 rounded-3xl border transition-all", selectedId === item.id ? `bg-${accentColor}-600/10 border-${accentColor}-500/50 text-white` : "bg-black/40 border-white/5 text-slate-500 hover:border-white/10")}>
                                <div className="font-black text-[12px] uppercase truncate mb-1 tracking-tight">{item.title}</div>
                                <div className="text-[10px] font-mono opacity-40">{item.date}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-9">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                    {singlePicks.map(pick => (
                        <PositionCard key={pick.id} pick={pick} unitValue={unitValue} onAddPick={(p) => setBetSlip(prev => [...prev, {...p, stake: p.units*unitValue, toWin: 0}])} league={league} />
                    ))}
                    {parlayPicks.map(pick => (
                        <PositionCard key={pick.id} pick={pick} unitValue={unitValue} onAddPick={(p) => setBetSlip(prev => [...prev, {...p, stake: p.units*unitValue, toWin: 0}])} league={league} />
                    ))}
                </div>
                {(singlePicks.length === 0 && parlayPicks.length === 0) && (
                    <div className="py-48 text-center glass-panel rounded-[64px] border-dashed border-white/10 flex flex-col items-center">
                        <Activity size={64} className="mb-6 opacity-10 animate-pulse" />
                        <p className="text-slate-600 font-black uppercase tracking-[0.8em] text-sm">Awaiting Signal Ingestion</p>
                        <p className="text-[10px] text-slate-800 font-mono mt-4 uppercase tracking-widest">Connect Admin Terminal to Broadcast Alpha</p>
                    </div>
                )}
                
                <HighlightReel />
            </div>
        </div>
    </div>
  );
};
