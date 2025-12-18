
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Target, Clock, Archive, ChevronRight, BookOpen, Layers, Wifi, User, Zap, TrendingUp, Activity, Calculator, Star, Calendar, FileText, Plus, X, Trash2, DollarSign, GripVertical, Loader2, CheckCircle2, Save, FolderOpen, Folder, Play, Split, Link as LinkIcon, PlusCircle, AlertCircle, Copy, MonitorPlay, Siren, BarChart2 } from 'lucide-react';
import { PickArchiveItem, GameSummary } from '../types';
import { LiveOdds } from '../components/LiveOdds';
import { HighlightReel } from '../components/HighlightReel';
import { clsx } from 'clsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Dot } from 'recharts';
import { supabase } from '../lib/supabase';

// --- MOCK DATA CONSTANTS ---
const PLAYER_IDS: Record<string, string> = {
    'J. Allen': '3918298',
    'L. Jackson': '3916387',
    'C. McCaffrey': '3117251',
    'T. Hill': '3116406', 
    'J. Jefferson': '4262921',
    'A. Brown': '4047646',
    'C. Lamb': '4241389',
    'B. Robinson': '4430807',
    'D. Henry': '3043078',
    'S. Barkley': '3929630',
    'K. Murray': '3917315', 
    'D. Prescott': '2577417',
    'G. Wilson': '4569618',
    'P. Nacua': '4430831',
    'Travis Etienne': '4426354',
    'Bijan Robinson': '4430807',
    'Trevor Lawrence': '4396968',
    'Jalen Hurts': '4040715',
    'Patrick Mahomes': '3139477'
};

const TEAM_MAP: Record<string, string> = {
    'Arizona': 'ARI', 'Cardinals': 'ARI', 'ARI': 'ARI',
    'Atlanta': 'ATL', 'Falcons': 'ATL', 'ATL': 'ATL',
    'Baltimore': 'BAL', 'Ravens': 'BAL', 'BAL': 'BAL',
    'Buffalo': 'BUF', 'Bills': 'BUF', 'BUF': 'BUF',
    'Carolina': 'CAR', 'Panthers': 'CAR', 'CAR': 'CAR',
    'Chicago': 'CHI', 'Bears': 'CHI', 'CHI': 'CHI',
    'Cincinnati': 'CIN', 'Bengals': 'CIN', 'CIN': 'CIN',
    'Cleveland': 'CLE', 'Browns': 'CLE', 'CLE': 'CLE',
    'Dallas': 'DAL', 'Cowboys': 'DAL', 'DAL': 'DAL',
    'Denver': 'DEN', 'Broncos': 'DEN', 'DEN': 'DEN',
    'Detroit': 'DET', 'Lions': 'DET', 'DET': 'DET',
    'Green Bay': 'GB', 'Packers': 'GB', 'GB': 'GB',
    'Houston': 'HOU', 'Texans': 'HOU', 'HOU': 'HOU',
    'Indianapolis': 'IND', 'Colts': 'IND', 'IND': 'IND',
    'Jacksonville': 'JAX', 'Jaguars': 'JAX', 'JAX': 'JAX',
    'Kansas City': 'KC', 'Chiefs': 'KC', 'KC': 'KC',
    'Las Vegas': 'LV', 'Raiders': 'LV', 'LV': 'LV',
    'Los Angeles Chargers': 'LAC', 'Chargers': 'LAC', 'LAC': 'LAC',
    'Los Angeles Rams': 'LAR', 'Rams': 'LAR', 'LAR': 'LAR',
    'Miami': 'MIA', 'Dolphins': 'MIA', 'MIA': 'MIA',
    'Minnesota': 'MIN', 'Vikings': 'MIN', 'MIN': 'MIN',
    'New England': 'NE', 'Patriots': 'NE', 'NE': 'NE',
    'New Orleans': 'NO', 'Saints': 'NO', 'NO': 'NO',
    'New York Giants': 'NYG', 'Giants': 'NYG', 'NYG': 'NYG',
    'New York Jets': 'NYJ', 'Jets': 'NYJ', 'NYJ': 'NYJ',
    'Philadelphia': 'PHI', 'Eagles': 'PHI', 'PHI': 'PHI',
    'Pittsburgh': 'PIT', 'Steelers': 'PIT', 'PIT': 'PIT',
    'San Francisco': 'SF', '49ers': 'SF', 'SF': 'SF',
    'Seattle': 'SEA', 'Seahawks': 'SEA', 'SEA': 'SEA',
    'Tampa Bay': 'TB', 'Buccaneers': 'TB', 'TB': 'TB',
    'Tennessee': 'TEN', 'Titans': 'TEN', 'TEN': 'TEN',
    'Washington': 'WSH', 'Commanders': 'WSH', 'WSH': 'WSH', 'Redskins': 'WSH'
};

interface PicksProps {
  currentContent: string;
  archives: PickArchiveItem[];
  gameSummaries: GameSummary[];
  propsData: any[]; // New prop for player props from DB
  initialViewMode?: 'daily' | 'edgeprop' | 'sunday';
}

interface PerformancePoint {
    game: string;
    val: number;
}

interface ExtractedPick {
    id: string;
    entity: string;
    market: string;
    line: number;
    side: 'OVER' | 'UNDER';
    odds: string;
    bookmaker: string;
    projection: number;
    projectionStr: string;
    rating: number;
    analysis: string;
    teamHome: string;
    teamAway?: string;
    startTime: string;
    playerId?: string;
    history: PerformancePoint[];
    recordStr: string;
    edgeTriggers?: string[];
}

interface BetSlipItem extends ExtractedPick {
    stake: number;
    toWin: number;
}

interface SavedSlip {
    id: string;
    name: string;
    items: BetSlipItem[];
    date: string;
}

// Cleaner Markdown Renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return null;
    return (
        <div className="space-y-4 text-slate-300 font-mono text-sm leading-relaxed">
            {content.split('\n').map((line, i) => {
                // 1. Clean legacy markdown symbols
                let cleanLine = line.replace(/#+/g, '').trim(); 
                
                if (!cleanLine) return <div key={i} className="h-2" />;
                
                // 2. Detect Uppercase Headers (No symbols needed, just all caps + short length)
                // Ex: "EXECUTIVE SUMMARY", "OFFICIAL POSITIONS"
                const isHeader = /^[A-Z\s\d:\-]{3,}$/.test(cleanLine) && cleanLine.length < 60 && !cleanLine.startsWith('-');

                if (isHeader) {
                    return (
                        <h2 key={i} className="text-lg font-black text-white uppercase tracking-widest mt-8 mb-4 border-b border-slate-700/50 pb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                            {cleanLine}
                        </h2>
                    );
                }
                
                // 3. Detect List Items (Picks/Contracts)
                if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                    const listItemText = cleanLine.replace(/^[-*]\s+/, '');
                    
                    // Parse strict bolding `**...**` as "Contracts"
                    const parts = listItemText.split(/(\*\*.*?\*\*)/g);
                    
                    return (
                        <li key={i} className="ml-0 pl-4 border-l-2 border-slate-700/50 list-none my-3 text-sm hover:border-emerald-500/50 transition-colors">
                            {parts.map((part, idx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    const text = part.slice(2, -2);
                                    // Highlighted Contract Style
                                    return (
                                        <span key={idx} className="font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.15)] mx-1 inline-block">
                                            {text}
                                        </span>
                                    );
                                }
                                return <span key={idx} className="text-slate-300">{part}</span>;
                            })}
                        </li>
                    );
                }

                // 4. Standard Paragraph
                return <p key={i} className="opacity-90">{cleanLine}</p>;
            })}
        </div>
    );
};

// --- ODDS HELPERS ---
const getDecimalOdds = (americanOdds: string): number => {
    const odds = parseInt(americanOdds);
    if (isNaN(odds) || odds === 0) return 1;
    if (odds > 0) return 1 + (odds / 100);
    return 1 + (100 / Math.abs(odds));
};

const getAmericanFromDecimal = (decimal: number): string => {
    if (decimal <= 1) return '-';
    if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
    return `-${Math.round(100 / (decimal - 1))}`;
};

const calculateSinglePayout = (stake: number, americanOdds: string) => {
    const decimal = getDecimalOdds(americanOdds);
    return (stake * decimal) - stake; // Return Profit only
};

// --- UUID GENERATOR (Robust Client Side) ---
const generateUUID = () => {
    // Pure JS fallback that matches UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const MISSING_TABLE_SQL = `create table if not exists user_bets (
  id uuid default gen_random_uuid() primary key,
  selection text not null,
  odds text not null,
  stake numeric not null,
  to_win numeric not null,
  status text default 'PENDING',
  pnl numeric default 0,
  market_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_bets enable row level security;
create policy "Public Read Bets" on user_bets for select using (true);
create policy "Public Insert Bets" on user_bets for insert with check (true);
create policy "Public Update Bets" on user_bets for update using (true);`;

export const Picks: React.FC<PicksProps> = ({ currentContent, archives, gameSummaries, propsData, initialViewMode = 'sunday' }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'sunday' | 'edgeprop'>(initialViewMode);
  const [displayedContent, setDisplayedContent] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedDate, setDisplayedDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extractedPicks, setExtractedPicks] = useState<ExtractedPick[]>([]);
  
  // Bet Slip State
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [betMode, setBetMode] = useState<'STRAIGHT' | 'PARLAY'>('STRAIGHT');
  const [parlayStake, setParlayStake] = useState(100);
  
  const [savedSlips, setSavedSlips] = useState<SavedSlip[]>([]);
  const [slipName, setSlipName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [slipOpen, setSlipOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Error State
  const [missingTableError, setMissingTableError] = useState(false);

  useEffect(() => {
      if (initialViewMode) setViewMode(initialViewMode);
  }, [initialViewMode]);

  // Load Saved Slips from Local Storage
  useEffect(() => {
      const stored = localStorage.getItem('quantum_saved_slips');
      if (stored) {
          try {
              setSavedSlips(JSON.parse(stored));
          } catch (e) {
              console.error("Failed to parse saved slips", e);
          }
      }
  }, []);

  const persistSlips = (slips: SavedSlip[]) => {
      setSavedSlips(slips);
      localStorage.setItem('quantum_saved_slips', JSON.stringify(slips));
  };

  useEffect(() => {
    if (viewMode === 'daily') {
        setDisplayedContent(currentContent);
        setDisplayedTitle("Live Team Picks");
        setDisplayedDate(new Date().toLocaleDateString());
        setSelectedId('live-current');
        setExtractedPicks(extractPicksFromMarkdown(currentContent));
    } else if (viewMode === 'sunday') {
        if (gameSummaries.length > 0) {
            const latest = gameSummaries[0];
            setDisplayedContent(latest.content); 
            setDisplayedTitle(latest.title);
            setDisplayedDate(latest.date);
            setSelectedId(latest.id);
        } else {
            setDisplayedContent("NO SUMMARIES FOUND");
            setDisplayedTitle("No Data");
        }
    }
  }, [viewMode, currentContent, gameSummaries]);

  // --- PARSING & GENERATION LOGIC ---
  const extractPicksFromMarkdown = (md: string): ExtractedPick[] => {
      if (!md) return [];
      const lines = md.split('\n');
      const picks: ExtractedPick[] = [];
      const pickRegex = /^\s*[-*\d\.]*\s*\*\*(.*?)\*\*\s*(\(([-+]?\d+|[A-Za-z\s]+)\))?/;

      lines.forEach((line, idx) => {
          const cleanLine = line.replace(/#+/g, '').trim();
          const match = cleanLine.match(pickRegex);
          
          if (match) {
              const fullSelection = match[1].trim(); 
              const oddsRaw = match[3] ? match[3].trim() : '-110';
              
              let entity = fullSelection;
              let market = 'Spread';
              let lineVal = 0;
              let side: 'OVER' | 'UNDER' = 'OVER';
              let projection = 0;
              let playerId = undefined;

              // Analysis extraction: take the text after the closing parenthesis of odds, or just after the bold part
              const analysisMatch = cleanLine.match(/\)\s*:?\s*(.*)$/);
              let analysis = analysisMatch ? analysisMatch[1].trim() : "Analysis pending.";
              if (!analysisMatch && cleanLine.includes(':')) {
                  // Fallback for "**Team** : Analysis" format
                  analysis = cleanLine.split(':').slice(1).join(':').trim();
              }

              const propMatch = fullSelection.match(/^(.*?)\s+(OVER|UNDER|O|U)\s+(\d+\.?\d*)\s*(.*)$/i);
              const totalMatch = fullSelection.match(/^(.*?)\s+(OVER|UNDER|O|U)\s+(\d+\.?\d*)$/i);
              const spreadMatch = fullSelection.match(/^(.*?)\s+([-+]\d+\.?\d*)$/);

              if (propMatch) {
                  entity = propMatch[1].trim();
                  const sideStr = propMatch[2].toUpperCase();
                  side = (sideStr.startsWith('O') ? 'OVER' : 'UNDER');
                  lineVal = parseFloat(propMatch[3]);
                  market = propMatch[4].trim() || 'Prop'; 
                  projection = side === 'OVER' ? lineVal * 1.15 : lineVal * 0.85;
                  const pKey = Object.keys(PLAYER_IDS).find(k => entity.includes(k) || k.includes(entity.split(' ').pop() || ''));
                  if (pKey) playerId = PLAYER_IDS[pKey];
              } else if (totalMatch) {
                  entity = totalMatch[1].trim();
                  const sideStr = totalMatch[2].toUpperCase();
                  side = (sideStr.startsWith('O') ? 'OVER' : 'UNDER');
                  lineVal = parseFloat(totalMatch[3]);
                  market = 'Total Points';
                  projection = side === 'OVER' ? lineVal + 4 : lineVal - 4;
              } else if (spreadMatch) {
                  entity = spreadMatch[1].trim();
                  lineVal = parseFloat(spreadMatch[2]);
                  side = lineVal < 0 ? 'OVER' : 'UNDER';
                  market = 'Spread';
                  projection = lineVal - 2.5; 
              } else {
                  entity = fullSelection;
                  market = 'Moneyline';
              }

              // --- TEAM MAPPING LOGIC (No Randoms) ---
              let t1 = 'NFL';
              // Find the primary team in the entity string using TEAM_MAP
              const sortedKeys = Object.keys(TEAM_MAP).sort((a,b) => b.length - a.length); // Longest match first
              for (const key of sortedKeys) {
                  if (entity.toLowerCase().includes(key.toLowerCase())) {
                      t1 = TEAM_MAP[key];
                      break;
                  }
              }

              // Find Opponent in the Entity OR Analysis (e.g. "Lions vs Cowboys" or "Lions -3 (vs Cowboys)")
              let t2 = undefined;
              const combinedText = fullSelection + " " + analysis;
              const vsMatch = combinedText.match(/(?:vs|@|against)\.?\s*([A-Za-z\s]+)/i);
              
              if (vsMatch) {
                  const oppName = vsMatch[1].trim();
                  for (const key of sortedKeys) {
                      // Avoid matching the same team
                      if (oppName.toLowerCase().includes(key.toLowerCase()) && TEAM_MAP[key] !== t1) {
                          t2 = TEAM_MAP[key];
                          break;
                      }
                  }
              }

              // --- DYNAMIC EDGE TRIGGERS ---
              // Only populate if keywords exist in the analysis
              const triggers: string[] = [];
              const lowerAnalysis = analysis.toLowerCase();
              if (lowerAnalysis.includes('sharp')) triggers.push('Sharp Action');
              if (lowerAnalysis.includes('divergence')) triggers.push('Line Divergence');
              if (lowerAnalysis.includes('model') || lowerAnalysis.includes('algo')) triggers.push('Model Edge');
              if (lowerAnalysis.includes('reverse')) triggers.push('Reverse Line Move');
              if (lowerAnalysis.includes('value') || lowerAnalysis.includes('ev+')) triggers.push('+EV Detected');
              if (lowerAnalysis.includes('variance')) triggers.push('Variance Play');
              if (lowerAnalysis.includes('fade')) triggers.push('Public Fade');
              if (lowerAnalysis.includes('steam')) triggers.push('Steam Move');
              if (lowerAnalysis.includes('mismatch')) triggers.push('Scheme Mismatch');

              const history: PerformancePoint[] = []; // Not used for teams currently
              const recordStr = '';

              picks.push({ 
                  id: `pick-${idx}`, entity, market, line: lineVal, side, odds: oddsRaw,
                  bookmaker: 'DraftKings', projection: parseFloat(projection.toFixed(1)),
                  projectionStr: `${projection.toFixed(1)} ${market.split(' ').pop()}`, rating: 5,
                  analysis: analysis,
                  teamHome: t1, teamAway: t2, startTime: 'Sun 10:00 am PST', playerId, history, recordStr,
                  edgeTriggers: triggers
              });
          }
      });
      return picks;
  };

  const handleSidebarClick = (type: 'archive' | 'summary', item: any) => {
      setDisplayedContent(item.content);
      setDisplayedTitle(item.title);
      setDisplayedDate(item.date);
      setSelectedId(item.id);
      if (type === 'archive') setExtractedPicks(extractPicksFromMarkdown(item.content));
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLiveReset = () => {
      setDisplayedContent(currentContent);
      setDisplayedTitle("Live Team Picks");
      setDisplayedDate(new Date().toLocaleDateString());
      setSelectedId('live-current');
      setExtractedPicks(extractPicksFromMarkdown(currentContent));
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- DRAG AND DROP & ADD HANDLERS ---
  const handleDragStart = (e: React.DragEvent, pick: ExtractedPick) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(pick));
      e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
  };

  // Helper to add to slip from click or drop
  const addToSlip = (pickData: ExtractedPick) => {
      // Check for duplicates
      if (betSlip.find(p => p.id === pickData.id)) return;
      
      const defaultStake = 100;
      setBetSlip(prev => [...prev, { ...pickData, stake: defaultStake, toWin: calculateSinglePayout(defaultStake, pickData.odds) }]);
      setSlipOpen(true);
      setShowSaved(false); // Switch to active slip view on drop
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      try {
          const pickData = JSON.parse(e.dataTransfer.getData('text/plain')) as ExtractedPick;
          addToSlip(pickData);
      } catch (err) {
          console.error("Drop failed", err);
      }
  };

  const updateStake = (id: string, newStake: number) => {
      setBetSlip(prev => prev.map(item => {
          if (item.id === id) {
              return { ...item, stake: newStake, toWin: calculateSinglePayout(newStake, item.odds) };
          }
          return item;
      }));
  };

  const removeSlipItem = (id: string) => {
      setBetSlip(prev => prev.filter(item => item.id !== id));
  };

  // --- SAVED SLIP LOGIC ---
  const handleSaveSlip = () => {
      if (betSlip.length === 0) return;
      const nameToUse = slipName.trim() || `Draft ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      const newSlip: SavedSlip = {
          id: `save-${Date.now()}`,
          name: nameToUse,
          items: [...betSlip],
          date: new Date().toISOString()
      };
      
      persistSlips([newSlip, ...savedSlips]);
      setSlipName('');
      alert("Slip saved to drafts.");
  };

  const handleLoadSlip = (slip: SavedSlip) => {
      if (betSlip.length > 0) {
          if (!window.confirm("Overwrite current slip with saved draft?")) return;
      }
      setBetSlip(slip.items);
      setSlipName(slip.name);
      setShowSaved(false);
  };

  const handleDeleteSaved = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm("Delete this saved slip?")) {
          persistSlips(savedSlips.filter(s => s.id !== id));
      }
  };

  const handleClearSlip = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (betSlip.length > 0 && window.confirm("Clear all selections from the slip?")) {
          setBetSlip([]);
          setSlipName('');
      }
  };

  // --- PARLAY / TOTALS CALCULATION ---
  const totals = useMemo(() => {
      if (betMode === 'STRAIGHT') {
          const totalStake = betSlip.reduce((sum, item) => sum + item.stake, 0);
          const totalProfit = betSlip.reduce((sum, item) => sum + item.toWin, 0);
          return {
              stake: totalStake,
              profit: totalProfit,
              totalReturn: totalStake + totalProfit,
              label: 'Total Payout'
          };
      } else {
          // Parlay Logic
          // 1. Calculate Multiplier (Product of decimal odds)
          const multiplier = betSlip.reduce((acc, item) => acc * getDecimalOdds(item.odds), 1);
          const totalProfit = (parlayStake * multiplier) - parlayStake;
          const oddsDisplay = getAmericanFromDecimal(multiplier);
          
          return {
              stake: parlayStake,
              profit: totalProfit,
              totalReturn: parlayStake + totalProfit,
              label: 'Parlay Payout',
              odds: oddsDisplay
          };
      }
  }, [betSlip, betMode, parlayStake]);

  // --- SUBMIT BETS TO SUPABASE ---
  const handleSubmitSlip = async () => {
      if (betSlip.length === 0) return;
      setIsSubmitting(true);
      setMissingTableError(false); // Reset error state

      // Safe number conversion helper
      const safeNum = (val: any) => {
          const n = parseFloat(val);
          return isNaN(n) ? 0 : n;
      };

      let betsToInsert = [];

      if (betMode === 'STRAIGHT') {
          betsToInsert = betSlip.map(bet => {
              // Construct Selection String carefully to avoid "undefined" text
              let sel = bet.entity;
              if (bet.side && bet.line) {
                  if (bet.side === 'OVER' || bet.side === 'UNDER') {
                      sel += ` ${bet.side} ${bet.line}`;
                  } else {
                      sel += ` ${bet.line > 0 ? '+' : ''}${bet.line}`;
                  }
              }
              
              return {
                  id: generateUUID(), // Generate Client-Side ID to bypass potential DB default issues
                  selection: sel,
                  odds: bet.odds || '-110',
                  stake: safeNum(bet.stake),
                  to_win: safeNum(bet.toWin),
                  status: 'PENDING',
                  pnl: 0,
                  market_type: bet.market || 'Standard',
                  created_at: new Date().toISOString()
              };
          });
      } else {
          // PARLAY SUBMISSION
          const legsDescription = betSlip.map(bet => {
              let pickPart = '';
              if (bet.side && bet.line) {
                  pickPart = bet.side === 'OVER' || bet.side === 'UNDER' ? `${bet.side} ${bet.line}` : `${bet.line > 0 ? '+' : ''}${bet.line}`;
              }
              return `${bet.entity} ${pickPart}`;
          }).join(', ');

          betsToInsert = [{
              id: generateUUID(),
              selection: `${betSlip.length}-Leg Parlay: ${legsDescription}`,
              odds: totals.odds || 'PARLAY',
              stake: safeNum(totals.stake),
              to_win: safeNum(totals.profit),
              status: 'PENDING',
              pnl: 0,
              market_type: 'Parlay',
              created_at: new Date().toISOString()
          }];
      }

      try {
          const { error } = await supabase.from('user_bets').insert(betsToInsert);
          
          if (error) {
              console.error("Supabase Write Error:", JSON.stringify(error, null, 2));
              
              // Handle Missing Table Error (Common Code: 42P01, PostgREST: PGRST205)
              if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                  setMissingTableError(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                  alert(`Database Write Failed.\n\nError: ${error.message}`);
              }
          } else {
              setBetSlip([]);
              setSlipName('');
              alert(`Success! Bets have been logged to your Client Portfolio.\n\nGo to the 'Analytics' tab and switch to 'Client Portfolio' to view.`);
          }
      } catch (err: any) {
          console.error("Bet submission exception:", err);
          alert(`Network/Client error: ${err.message || String(err)}`);
      } finally {
          setIsSubmitting(false);
      }
  };

  // Generate Props View Data (Using propsData from DB)
  const renderPropsView = () => {
      if (!propsData || propsData.length === 0) {
           return <div className="text-center text-slate-500 py-20 border border-dashed border-slate-800 rounded-lg">No Player Props Uploaded via Admin.</div>;
      }

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              {propsData.map((prop, idx) => {
                  // Helper to match player ID
                  const pKey = Object.keys(PLAYER_IDS).find(k => prop.player.includes(k) || k.includes(prop.player.split(' ').pop() || ''));
                  const pid = pKey ? PLAYER_IDS[pKey] : undefined;
                  
                  // Construct a compatible ExtractedPick object for the drag payload
                  const dragPayload: ExtractedPick = {
                        id: `prop-${idx}-${Date.now()}`,
                        entity: prop.player,
                        market: prop.stat,
                        line: Number(prop.line),
                        side: prop.side as 'OVER' | 'UNDER',
                        odds: String(prop.book_odds),
                        bookmaker: prop.best_platform,
                        projection: 0,
                        projectionStr: '',
                        rating: 0,
                        analysis: `EV ${prop.ev}% - ${prop.best_platform}`,
                        teamHome: '',
                        startTime: 'Live',
                        playerId: pid,
                        history: [],
                        recordStr: ''
                  };

                  return (
                      <div 
                        key={idx} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, dragPayload)}
                        className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden relative group hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all flex flex-col cursor-grab active:cursor-grabbing"
                      >
                          <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => addToSlip(dragPayload)} className="p-1 bg-slate-900/80 rounded hover:bg-emerald-500 hover:text-white text-slate-400 transition-colors z-30" title="Add to Slip">
                                    <PlusCircle size={16} />
                                </button>
                                <div className="p-1 bg-slate-900/80 rounded z-20 cursor-grab">
                                    <GripVertical size={16} className="text-slate-500" />
                                </div>
                          </div>

                          <div className="bg-slate-950/80 p-3 flex justify-between items-center border-b border-slate-800">
                              <span className="font-bold text-[10px] text-purple-400 uppercase tracking-wider">{prop.best_platform || 'BEST AVAILABLE'}</span>
                              <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">EV {prop.ev > 0 ? '+' : ''}{prop.ev}%</span>
                          </div>
                          <div className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <div className="text-lg font-bold text-white leading-none mb-1">{prop.player}</div>
                                      <div className="text-xs text-slate-400 font-mono">{prop.stat}</div>
                                  </div>
                                  <div className="w-10 h-10 rounded-full border border-slate-600 overflow-hidden bg-slate-800">
                                      {pid ? <img src={`https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${pid}.png`} className="w-full h-full object-cover scale-125 pt-1" alt={prop.player} /> : <User size={20} className="text-slate-600 m-2"/>}
                                  </div>
                              </div>
                              <div className="mb-4">
                                   <div className="text-3xl font-black text-white uppercase tracking-tighter leading-none flex items-baseline gap-2">
                                       <span className={prop.side === 'OVER' ? 'text-emerald-400' : 'text-rose-400'}>{prop.side}</span>
                                       <span>{prop.line}</span>
                                   </div>
                              </div>
                              <div className="flex justify-between items-end border-t border-slate-800 pt-3">
                                  <div>
                                      <div className="text-[9px] text-slate-500 uppercase">Book Odds</div>
                                      <div className="font-mono text-white text-xs">{prop.book_odds}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-[9px] text-slate-500 uppercase">Implied</div>
                                      <div className="font-mono text-white text-xs">{prop.dfs_implied}</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )
              })}
          </div>
      )
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700 relative">
        
        {/* Error Banner for Missing Table */}
        {missingTableError && (
            <div className="mb-8 p-6 bg-rose-900/20 border border-rose-500/50 rounded-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-rose-900/10">
                <div className="flex items-center gap-3 text-rose-400 font-bold uppercase tracking-widest text-sm border-b border-rose-500/20 pb-2">
                    <AlertCircle size={20} />
                    <span>Database Error: Table Missing</span>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <p className="text-sm text-slate-300 leading-relaxed mb-2">
                            The <code>user_bets</code> table does not exist in your Supabase database. You cannot place bets until this table is created.
                        </p>
                        <p className="text-xs text-slate-500 mb-4">
                            Copy the SQL code below and run it in the <strong>SQL Editor</strong> of your Supabase Dashboard to fix this instantly.
                        </p>
                        <button onClick={() => setMissingTableError(false)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold uppercase transition-colors">
                            Dismiss
                        </button>
                    </div>
                    <div className="flex-1 bg-black/50 p-4 rounded-lg font-mono text-[10px] text-emerald-400 overflow-x-auto relative group border border-slate-800">
                        <pre>{MISSING_TABLE_SQL}</pre>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(MISSING_TABLE_SQL);
                                alert("SQL copied to clipboard!");
                            }}
                            className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase hover:bg-slate-700 flex items-center gap-1"
                        >
                            <Copy size={12} /> Copy
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Top Tab Bar - REORDERED */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex flex-wrap justify-center gap-1">
                {/* 1. Summaries */}
                <button onClick={() => setViewMode('sunday')} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all", viewMode === 'sunday' ? "bg-amber-500 text-black shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                    <BookOpen size={16} /> Summaries
                </button>
                {/* 2. Team Picks */}
                <button onClick={() => setViewMode('daily')} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all", viewMode === 'daily' ? "bg-emerald-500 text-black shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                    <Target size={16} /> Team Picks
                </button>
                {/* 3. Player Props (Restored) */}
                <button onClick={() => setViewMode('edgeprop')} className={clsx("flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all", viewMode === 'edgeprop' ? "bg-purple-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5")}>
                    <Zap size={16} /> Player Props
                </button>
            </div>
        </div>

        {/* --- VIEW ROUTER --- */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
                
                {/* 1. DAILY PICKS VIEW (TEAM PICKS - NO PROPS) */}
                {viewMode === 'daily' && (
                     <div className="animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center justify-between mb-6 border-b border-emerald-500/20 pb-4">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><Target className="text-emerald-500" /> {displayedTitle}</h2>
                                <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">{displayedDate}</span>
                          </div>
                          
                          {/* Filter out Props from this view (if user wants only team picks) */}
                          {extractedPicks.filter(p => !p.playerId && p.market !== 'Prop').length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {extractedPicks.filter(p => !p.playerId && p.market !== 'Prop').map((pick) => (
                                    <div 
                                        key={pick.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, pick)}
                                        className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden relative group hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all flex flex-col cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => addToSlip(pick)} className="p-1 bg-slate-900/80 rounded hover:bg-emerald-500 hover:text-white text-slate-400 transition-colors z-30" title="Add to Slip">
                                                <PlusCircle size={16} />
                                            </button>
                                            <div className="p-1 bg-slate-900/80 rounded cursor-grab">
                                                <GripVertical size={16} className="text-slate-500" />
                                            </div>
                                        </div>

                                        {/* ... Card Content ... */}
                                        <div className="bg-slate-950/80 p-3 flex justify-between items-center border-b border-slate-800">
                                                <div className="flex items-center gap-2">
                                                    {pick.teamAway ? (
                                                        <div className="flex -space-x-1">
                                                            <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${pick.teamHome}.png`} className="w-6 h-6 object-contain z-10" alt={pick.teamHome}/>
                                                            <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${pick.teamAway}.png`} className="w-6 h-6 object-contain" alt={pick.teamAway}/>
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6">
                                                            <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${pick.teamHome}.png`} className="w-full h-full object-contain" alt={pick.teamHome}/>
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-[10px] text-white uppercase tracking-wider">
                                                        {pick.teamHome} {pick.teamAway ? `@ ${pick.teamAway}` : ''}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                                                <Calendar size={10} /> {pick.startTime}
                                                </span>
                                            </div>

                                            <div className="p-5 flex-grow flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pick.market}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">Odds {pick.odds}</div>
                                                    </div>
                                                    {/* Logo Display */}
                                                    <div className="w-10 h-10 rounded-full border border-slate-600 overflow-hidden bg-slate-800 flex items-center justify-center">
                                                        <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${pick.teamHome}.png`} className="w-8 h-8 object-contain" alt="Team" />
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <div className="text-sm font-bold text-white mb-0.5">{pick.entity}</div>
                                                    <div className="text-3xl font-black text-white uppercase tracking-tighter leading-none flex items-baseline gap-2">
                                                        <span className={pick.side === 'OVER' ? 'text-emerald-400' : 'text-white'}>{pick.side}</span>
                                                        <span>{pick.line}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="relative pl-3 border-l-2 border-emerald-500/30 mb-4">
                                                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                                                    <Zap size={10} className="inline mr-1 text-emerald-400" />
                                                    {pick.analysis}
                                                    </p>
                                                </div>

                                                {/* EDGE TRIGGERS FOOTER (Dynamic) */}
                                                {pick.edgeTriggers && pick.edgeTriggers.length > 0 ? (
                                                    <div className="mt-auto pt-3 border-t border-slate-800/50">
                                                        <div className="text-[9px] font-bold text-emerald-500 uppercase mb-2 flex items-center gap-1">
                                                            <Siren size={10} className="animate-pulse" /> System Edge Triggers
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {pick.edgeTriggers.map((tag, i) => (
                                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 text-slate-400 rounded border border-slate-700/50">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                    </div>
                                ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                                <FileText size={48} className="text-slate-700 mb-4" />
                                <h3 className="text-xl font-bold text-slate-500">No Structured Team Picks</h3>
                                <p className="text-slate-600 text-sm mt-2 max-w-md text-center">
                                    The active report does not contain any detected team spreads or totals. Player Props are listed in the 'Player Props' tab.
                                </p>
                            </div>
                          )}
                     </div>
                )}

                {/* 2. SUMMARIES VIEW (RICH TEXT) */}
                {viewMode === 'sunday' && (
                    <div className="animate-in fade-in duration-500">
                         <div className="flex items-center justify-between mb-6 border-b border-amber-500/20 pb-4">
                              <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><BookOpen className="text-amber-500" /> {displayedTitle}</h2>
                              <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">{displayedDate}</span>
                         </div>
                         <div className="bg-[#0f172a]/50 p-8 rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-xl">
                              <MarkdownRenderer content={displayedContent} />
                         </div>
                    </div>
                )}

                {/* 3. PLAYER PROPS VIEW (Restored from DB) */}
                {viewMode === 'edgeprop' && (
                    <div className="animate-in fade-in duration-500">
                         <div className="flex items-center justify-between mb-6 border-b border-purple-500/20 pb-4">
                              <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><Zap className="text-purple-500" /> Edge Prop Scanner</h2>
                              <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">Live Database</span>
                         </div>
                         {renderPropsView()}
                    </div>
                )}

            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* BET SLIP COMPONENT */}
                {['daily', 'edgeprop'].includes(viewMode) && (
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={clsx(
                            "glass-panel rounded-2xl border transition-all duration-300 overflow-hidden order-1",
                            isDragOver ? "border-emerald-500 bg-emerald-900/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-105" : "border-slate-700/50"
                        )}
                    >
                        <div 
                            className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center"
                        >
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSlipOpen(!slipOpen)}>
                                <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded">
                                    <Calculator size={16} />
                                </div>
                                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Bet Slip</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {betSlip.length > 0 && <span className="text-[10px] bg-emerald-500 text-black font-bold px-1.5 rounded-full">{betSlip.length}</span>}
                                
                                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                
                                {/* Clear Button */}
                                {betSlip.length > 0 && !showSaved && (
                                    <button 
                                        onClick={handleClearSlip}
                                        className="text-slate-500 hover:text-rose-500 transition-colors p-1" 
                                        title="Clear Slip"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}

                                {/* Saved Slips Toggle */}
                                <button 
                                    onClick={() => setShowSaved(!showSaved)}
                                    className={clsx("p-1 transition-colors relative", showSaved ? "text-cyan-400" : "text-slate-500 hover:text-white")}
                                    title="View Saved Slips"
                                >
                                    {showSaved ? <FolderOpen size={16} /> : <Folder size={16} />}
                                    {savedSlips.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-500 rounded-full border border-slate-900"></span>
                                    )}
                                </button>

                                <button onClick={() => setSlipOpen(!slipOpen)} className="text-slate-500 hover:text-white">
                                    {slipOpen ? <ChevronRight size={16} className="rotate-90" /> : <ChevronRight size={16} />}
                                </button>
                            </div>
                        </div>

                        {slipOpen && (
                            <div className="bg-[#0b0e14]">
                                {showSaved ? (
                                    // VIEW: SAVED SLIPS LIST
                                    <div className="min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-3">
                                        {savedSlips.length === 0 ? (
                                            <div className="text-center text-slate-500 text-xs italic py-8">No saved slips found.</div>
                                        ) : (
                                            savedSlips.map(slip => (
                                                <div key={slip.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:border-slate-600 transition-all group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="font-bold text-white text-sm">{slip.name}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono">{new Date(slip.date).toLocaleDateString()} • {slip.items.length} Bets</div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => handleLoadSlip(slip)}
                                                                className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded transition-colors"
                                                                title="Load Slip"
                                                            >
                                                                <Play size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleDeleteSaved(e, slip.id)}
                                                                className="p-1.5 bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-900/20 rounded transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {slip.items.slice(0, 3).map((item, idx) => (
                                                            <span key={idx} className="text-[9px] bg-black px-1.5 py-0.5 rounded text-slate-400 border border-slate-800 truncate max-w-[80px]">
                                                                {item.entity}
                                                            </span>
                                                        ))}
                                                        {slip.items.length > 3 && <span className="text-[9px] text-slate-500">+{slip.items.length - 3}</span>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        <button onClick={() => setShowSaved(false)} className="w-full text-xs text-slate-500 hover:text-white mt-4 py-2 border border-dashed border-slate-800 rounded">
                                            Back to Active Slip
                                        </button>
                                    </div>
                                ) : (
                                    // VIEW: CURRENT SLIP
                                    <>
                                        {betSlip.length > 0 && (
                                            <div className="flex border-b border-slate-800">
                                                <button 
                                                    onClick={() => setBetMode('STRAIGHT')}
                                                    className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors", betMode === 'STRAIGHT' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300")}
                                                >
                                                    Single Bets
                                                </button>
                                                <button 
                                                    onClick={() => setBetMode('PARLAY')}
                                                    className={clsx("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1", betMode === 'PARLAY' ? "bg-purple-900/30 text-purple-400" : "text-slate-500 hover:text-slate-300")}
                                                >
                                                    <LinkIcon size={10} /> Multi Parlay
                                                </button>
                                            </div>
                                        )}

                                        {betSlip.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500 border-b border-slate-800/50">
                                                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 mb-2">
                                                    <Plus size={24} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs font-bold uppercase tracking-wide">Drag Picks Here</p>
                                                </div>
                                                <p className="text-[10px]">Build your card and calculate P/L</p>
                                            </div>
                                        ) : (
                                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {betSlip.map((item) => (
                                                    <div key={item.id} className="p-3 border-b border-slate-800 hover:bg-slate-900/50 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                                                    {item.side === 'OVER' || item.side === 'UNDER' ? (
                                                                        <span className={item.side === 'OVER' ? 'text-emerald-400' : 'text-rose-400'}>{item.side} {item.line}</span>
                                                                    ) : (
                                                                        <span className="text-emerald-400">{item.line > 0 ? `+${item.line}` : item.line}</span>
                                                                    )}
                                                                    <span className="text-slate-400">{item.entity}</span>
                                                                </div>
                                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.market} @ {item.odds}</div>
                                                            </div>
                                                            <button onClick={() => removeSlipItem(item.id)} className="text-slate-600 hover:text-rose-500 transition-colors">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        
                                                        {betMode === 'STRAIGHT' && (
                                                            <div className="flex items-center gap-2 bg-black rounded p-1 border border-slate-800">
                                                                <div className="text-[10px] font-bold text-slate-500 pl-2">$</div>
                                                                <input 
                                                                    type="number" 
                                                                    value={item.stake}
                                                                    onChange={(e) => updateStake(item.id, parseFloat(e.target.value) || 0)}
                                                                    className="bg-transparent border-none text-white text-xs font-mono w-full focus:outline-none"
                                                                />
                                                                <div className="text-[9px] text-emerald-400 font-mono whitespace-nowrap pr-2">
                                                                    To Win: ${item.toWin.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                                            {/* Slip Name Input */}
                                            <div className="mb-4">
                                                <input 
                                                    type="text" 
                                                    placeholder="Name this slip (optional)..." 
                                                    value={slipName}
                                                    onChange={(e) => setSlipName(e.target.value)}
                                                    className="w-full bg-black border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                                                />
                                            </div>

                                            {betMode === 'PARLAY' && betSlip.length > 0 && (
                                                <div className="mb-4 bg-purple-900/10 border border-purple-500/30 p-3 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-purple-400 uppercase">Combined Odds</span>
                                                        <span className="text-sm font-mono font-bold text-white">{totals.odds}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-black rounded p-1 border border-purple-500/30">
                                                        <div className="text-[10px] font-bold text-slate-500 pl-2">RISK $</div>
                                                        <input 
                                                            type="number" 
                                                            value={parlayStake}
                                                            onChange={(e) => setParlayStake(parseFloat(e.target.value) || 0)}
                                                            className="bg-transparent border-none text-white text-xs font-mono w-full focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-slate-400">Total Wager</span>
                                                <span className="text-sm font-mono font-bold text-white">${totals.stake.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-slate-400">To Win (Profit)</span>
                                                <span className="text-sm font-mono font-bold text-emerald-400">+${totals.profit.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-4 pt-2 border-t border-slate-800">
                                                <span className="text-xs font-bold text-white uppercase">{totals.label}</span>
                                                <span className="text-base font-mono font-black text-cyan-400">${totals.totalReturn.toFixed(2)}</span>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleSaveSlip}
                                                    disabled={betSlip.length === 0}
                                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                                    title="Save Draft"
                                                >
                                                    <Save size={14} /> Save
                                                </button>
                                                <button 
                                                    onClick={handleSubmitSlip}
                                                    disabled={betSlip.length === 0 || isSubmitting}
                                                    className="flex-[2] py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                                                >
                                                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    {isSubmitting ? 'Sending...' : 'Place Bets'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="order-2 lg:order-2"><LiveOdds /></div>
                
                {/* NEW MEDIA WIRE */}
                <div className="order-3 lg:order-3 h-[600px]">
                    <HighlightReel />
                </div>
                
                {/* Archive List (Only shown for Daily or Summary modes) */}
                {(viewMode === 'daily' || viewMode === 'sunday') && (
                    <div className="glass-panel p-6 rounded-2xl sticky top-28 border border-slate-700/50 order-4 lg:order-4">
                        <h3 className={clsx("font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-sm", viewMode === 'daily' ? "text-emerald-400" : "text-amber-400")}><Archive size={16} />{viewMode === 'daily' ? 'Team Picks Archive' : 'Summary History'}</h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                            {viewMode === 'daily' && (
                                <><button onClick={handleLiveReset} className={clsx("w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group", selectedId === 'live-current' ? "bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-emerald-500/50 hover:text-white")}><div><div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">Current Edge {selectedId === 'live-current' && <Wifi size={10} className="animate-pulse text-emerald-400"/>}</div><div className="text-[10px] opacity-60 font-mono mt-1">Live Action</div></div>{selectedId === 'live-current' && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}</button><div className="h-px bg-slate-800 my-2"></div></>
                            )}
                            {(viewMode === 'daily' ? archives : gameSummaries).length > 0 ? ((viewMode === 'daily' ? archives : gameSummaries).map(item => (<button key={item.id} onClick={() => handleSidebarClick(viewMode === 'daily' ? 'archive' : 'summary', item)} className={clsx("w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group", selectedId === item.id ? (viewMode === 'daily' ? "bg-purple-500/20 border-purple-500 text-white" : "bg-amber-500/20 border-amber-500 text-white") : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white", viewMode === 'daily' ? "hover:border-purple-500/50" : "hover:border-amber-500/50")}><div className="overflow-hidden"><div className="font-bold text-xs uppercase tracking-wider truncate">{item.title}</div><div className="text-[10px] opacity-60 font-mono mt-1">{item.date}</div></div><ChevronRight size={14} className={clsx("opacity-0 group-hover:opacity-100 transition-opacity shrink-0", viewMode === 'daily' ? "text-purple-400" : "text-amber-400")} /></button>))) : (<div className="text-center text-slate-600 text-xs py-4 border border-dashed border-slate-800 rounded-lg">No history found.</div>)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
