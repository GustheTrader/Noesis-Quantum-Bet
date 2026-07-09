
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Target, Archive, BookOpen, Zap, Star, FileText, Plus, X, DollarSign, Loader2, Play, Info, AlertTriangle, Shield, Layers, TrendingUp, ChevronRight, BarChart3, Activity, Lock, Trash2, ShoppingCart, Anchor, Cpu, RefreshCw, Award, Crown, Gem, Trophy } from 'lucide-react';
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
  'Dodgers': { code: 'lad', league: 'mlb' }, 'Yankees': { code: 'nyy', league: 'mlb' }, 'Braves': { code: 'atl', league: 'mlb' },
  // MLS
  'Inter Miami': { code: 'mia', league: 'mls' }, 'LAFC': { code: 'lafc', league: 'mls' }, 'Sounders': { code: 'sea', league: 'mls' },
  // SOCCER
  'Argentina': { code: 'arg', league: 'soccer' }, 'Brazil': { code: 'bra', league: 'soccer' }, 'France': { code: 'fra', league: 'soccer' },
  // MMA
  'UFC': { code: 'ufc', league: 'mma' }, 'Jones': { code: 'ufc', league: 'mma' }, 'McGregor': { code: 'ufc', league: 'mma' },
  // HORSE
  'Churchill Downs': { code: 'cd', league: 'horse' }, 'WiseRace': { code: 'wiserace', league: 'horse' },
  // GOLF
  'Scheffler': { code: 'golf', league: 'golf' }, 'McIlroy': { code: 'golf', league: 'golf' }, 'Rahm': { code: 'golf', league: 'golf' },
  // VELOCITY
  'BTC': { code: 'btc', league: 'velocity' }, 'ETH': { code: 'eth', league: 'velocity' }, 'SOL': { code: 'sol', league: 'velocity' }, 'AAVE': { code: 'aave', league: 'velocity' }
};

const getTeamInfo = (entity: string) => {
  if (!entity) return null;
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

// --- REALISTIC DEFAULT WHALE PICKS FOR EACH SPORT ---
const DEFAULT_WHALE_PICKS: Record<string, ExtractedPick[]> = {
  NFL: [
    {
      id: 'df-nfl-1',
      entity: 'Lions -3.0',
      market: 'NFL',
      odds: '-110',
      analysis: 'Whale money has heavily saturated the Lions -3.0 line. Dallas defense ranks bottom-3 in run defense DVOA, creating a massive tactical mismatch for the Lions elite rushing attack and play-action efficiency.',
      confidence: 5,
      units: 5.0,
      risks: 'Late injury volatility in the offensive line; monitor active reports before kickoff.',
      ev: '+8.7%',
      sharpLine: '-4.0',
      bookLine: '-3.0'
    },
    {
      id: 'df-nfl-2',
      entity: 'Steelers +3.5',
      market: 'NFL',
      odds: '-115',
      analysis: 'Premium underdog value. Mike Tomlin as a home underdog historically covers at a 68% rate. Models suggest the true line should be +1.5 based on defensive success rate projections.',
      confidence: 4,
      units: 3.5,
      risks: 'Texans vertical passing offense exploits deep secondary unless pass rush generates consistent pressure.',
      ev: '+6.2%',
      sharpLine: '+2.0',
      bookLine: '+3.5'
    },
    {
      id: 'df-nfl-3',
      entity: 'Chiefs Moneyline',
      market: 'NFL',
      odds: '-150',
      analysis: 'Smart money consolidation. Over 78% of the high-limit market handle is tracking Kansas City on the moneyline. Model identifies a significant coaching and defensive prep advantage.',
      confidence: 4,
      units: 3.0,
      risks: 'Wide receiver drop rate under zero-blitz conditions could stall critical fourth-quarter drives.',
      ev: '+4.9%',
      sharpLine: '-170',
      bookLine: '-150'
    }
  ],
  NBA: [
    {
      id: 'df-nba-1',
      entity: 'Lakers Moneyline',
      market: 'NBA',
      odds: '-130',
      analysis: 'Heavy syndicate limits observed pushing this line from -115. Lakers interior scoring presence and free-throw rate mismatch should dominate the paint.',
      confidence: 5,
      units: 4.5,
      risks: 'Active injury updates for frontcourt starters; check late scratch sheets.',
      ev: '+7.8%',
      sharpLine: '-150',
      bookLine: '-130'
    },
    {
      id: 'df-nba-2',
      entity: 'Celtics -7.5',
      market: 'NBA',
      odds: '-110',
      analysis: 'Three-point frequency discrepancy. Boston matches up exceptionally well against slow perimeter recovery defenses. Simulations show a 61% cover probability.',
      confidence: 4,
      units: 3.5,
      risks: 'High-volume perimeter shooting variance on back-to-back schedule dates.',
      ev: '+5.4%',
      sharpLine: '-9.0',
      bookLine: '-7.5'
    },
    {
      id: 'df-nba-3',
      entity: 'Suns vs Warriors Over 228.5',
      market: 'NBA',
      odds: '-110',
      analysis: 'Pace-and-space model alignment. Both rosters rank in the top-5 for early possession transition attacks. Syndicate limits bought this up from 226.',
      confidence: 4,
      units: 3.0,
      risks: 'Fatigue in third quarter leading to stagnant half-court possessions.',
      ev: '+4.2%',
      sharpLine: '230.5',
      bookLine: '228.5'
    }
  ],
  NHL: [
    {
      id: 'df-nhl-1',
      entity: 'Rangers ML',
      market: 'NHL',
      odds: '-125',
      analysis: 'Whale syndicate action on New York. Elite goaltending advantage and power-play efficiency metrics indicate a severe price dislocation at home.',
      confidence: 5,
      units: 4.0,
      risks: 'Penalty kill regression against physical offensive lines.',
      ev: '+6.9%',
      sharpLine: '-145',
      bookLine: '-125'
    },
    {
      id: 'df-nhl-2',
      entity: 'Bruins -1.5',
      market: 'NHL',
      odds: '+185',
      analysis: 'Asymmetrical payout targeting empty-net scenarios. High model variance favoring home team defensive transitions.',
      confidence: 3,
      units: 2.0,
      risks: 'High-risk puckline variance; requires stable late-game defense.',
      ev: '+9.1%',
      sharpLine: '+170',
      bookLine: '+185'
    },
    {
      id: 'df-nhl-3',
      entity: 'Oilers vs Golden Knights Over 6.5',
      market: 'NHL',
      odds: '-115',
      analysis: 'High-octane power-play efficiency. Matchup simulations project an average score of 4.2 to 3.5, validating the over limit.',
      confidence: 4,
      units: 3.0,
      risks: 'Spectacular individual goalie performances neutralising high-danger chances.',
      ev: '+4.8%',
      sharpLine: '7.0',
      bookLine: '6.5'
    }
  ],
  MLB: [
    {
      id: 'df-mlb-1',
      entity: 'Dodgers ML',
      market: 'MLB',
      odds: '-140',
      analysis: 'Whale tracking signal: $850k limit order detected at offshore books. Significant starting pitching velocity and spin rate advantage.',
      confidence: 5,
      units: 5.0,
      risks: 'Bullpen fatigue after high-leverage series; watch bullpen availability.',
      ev: '+8.1%',
      sharpLine: '-165',
      bookLine: '-140'
    },
    {
      id: 'df-mlb-2',
      entity: 'Yankees -1.5',
      market: 'MLB',
      odds: '+120',
      analysis: 'Runline pricing advantage. Yankees heavy barrels projection vs low-strikeout opposing starter aligns with high-margin offense.',
      confidence: 4,
      units: 3.5,
      risks: 'Inability to cash runners on third; cold wind conditions at stadium.',
      ev: '+5.9%',
      sharpLine: '+105',
      bookLine: '+120'
    },
    {
      id: 'df-mlb-3',
      entity: 'Braves vs Phillies Under 7.5',
      market: 'MLB',
      odds: '-105',
      analysis: 'Extreme pitching duel conditions. Umpire metrics and wind blowing inward at 12mph support low runs expectation.',
      confidence: 4,
      units: 3.0,
      risks: 'Mistake pitches leading to multi-run home runs; bullpen failures.',
      ev: '+4.7%',
      sharpLine: '7.0',
      bookLine: '7.5'
    }
  ],
  CFL: [
    {
      id: 'df-cfl-1',
      entity: 'Blue Bombers -4.5',
      market: 'CFL',
      odds: '-110',
      analysis: 'Heavy market support for Winnipeg at home. Ground attack efficiency is projected to dominate possession on the wider field format.',
      confidence: 5,
      units: 4.0,
      risks: 'Kicking game volatility; sudden change turnovers.',
      ev: '+6.8%',
      sharpLine: '-6.0',
      bookLine: '-4.5'
    },
    {
      id: 'df-cfl-2',
      entity: 'Alouettes ML',
      market: 'CFL',
      odds: '+135',
      analysis: 'Asymmetric underdog. Montreal pass-blocking metrics provide outstanding protection against aggressive blitz structures.',
      confidence: 4,
      units: 2.5,
      risks: 'Red-zone efficiency drop under wet field conditions.',
      ev: '+7.2%',
      sharpLine: '+115',
      bookLine: '+135'
    },
    {
      id: 'df-cfl-3',
      entity: 'Roughriders vs Elks Over 50.5',
      market: 'CFL',
      odds: '-110',
      analysis: 'Pace projection. Both offenses run up-tempo systems with deep passing efficiency. Sharp limits took this from 48 up to 50.5.',
      confidence: 4,
      units: 3.0,
      risks: 'Early-down drops leading to frequent two-and-outs.',
      ev: '+5.1%',
      sharpLine: '52.0',
      bookLine: '50.5'
    }
  ],
  MLS: [
    {
      id: 'df-mls-1',
      entity: 'Inter Miami ML',
      market: 'MLS',
      odds: '-120',
      analysis: 'High-limit syndicate backing. Home-pitch transition statistics indicate a massive attacking threat against an injured defensive backline.',
      confidence: 5,
      units: 4.5,
      risks: 'Defensive transitions vulnerable to counterattacks.',
      ev: '+7.9%',
      sharpLine: '-140',
      bookLine: '-120'
    },
    {
      id: 'df-mls-2',
      entity: 'LAFC -1.0',
      market: 'MLS',
      odds: '+115',
      analysis: 'Alternative spread value. High-press efficiency at home leading to multi-goal victories in 42% of similar model matchups.',
      confidence: 4,
      units: 3.0,
      risks: 'Clinical finishing variance; referee card frequency slowing tempo.',
      ev: '+6.1%',
      sharpLine: 'ML',
      bookLine: '-1.0'
    },
    {
      id: 'df-mls-3',
      entity: 'Sounders ML',
      market: 'MLS',
      odds: '+145',
      analysis: 'Exceptional away value. Seattle defensive structure ranks top-tier in goals expected against, creating massive underdog edge.',
      confidence: 3,
      units: 2.0,
      risks: 'Low possession count; relies heavily on set-piece conversion.',
      ev: '+8.4%',
      sharpLine: '+125',
      bookLine: '+145'
    }
  ],
  SOCCER: [
    {
      id: 'df-soc-1',
      entity: 'Real Madrid ML',
      market: 'SOCCER',
      odds: '-135',
      analysis: 'Whale position detected on European Champions. Backed by extensive match performance models highlighting severe midfield transition mismatch.',
      confidence: 5,
      units: 5.0,
      risks: 'Early physical defense causing key tactical blocks.',
      ev: '+7.1%',
      sharpLine: '-155',
      bookLine: '-135'
    },
    {
      id: 'df-soc-2',
      entity: 'Arsenal vs Chelsea Under 2.5',
      market: 'SOCCER',
      odds: '+110',
      analysis: 'Low-scoring defensive chess match. Both setups prioritizing defensive shape and mid-block stability. Sharp consensus is Under.',
      confidence: 4,
      units: 3.0,
      risks: 'Early individual errors leading to open game flow.',
      ev: '+5.7%',
      sharpLine: '-105',
      bookLine: '+110'
    },
    {
      id: 'df-soc-3',
      entity: 'Man City -1.5',
      market: 'SOCCER',
      odds: '+125',
      analysis: 'Heavy possession pressure. Expected home goal dominance is 2.45 to 0.70. Asymmetrical cover odds represent high value.',
      confidence: 4,
      units: 3.5,
      risks: 'Opponent low-block park-the-bus strategy successful.',
      ev: '+6.2%',
      sharpLine: '+110',
      bookLine: '+125'
    }
  ],
  MMA: [
    {
      id: 'df-mma-1',
      entity: 'Jon Jones ML',
      market: 'MMA',
      odds: '-150',
      analysis: 'Uncontested championship class. Wrestling and distance control metrics are historically elite. Heavy high-limit money is anchored here.',
      confidence: 5,
      units: 5.0,
      risks: 'Punchers chance heavy-weight variance.',
      ev: '+8.3%',
      sharpLine: '-180',
      bookLine: '-150'
    },
    {
      id: 'df-mma-2',
      entity: 'Aspinall by KO/TKO',
      market: 'MMA',
      odds: '+110',
      analysis: 'Dynamic striking velocity advantage. High hand-speed coupled with elite submission threat creates a high KO opening in rounds 1-2.',
      confidence: 4,
      units: 3.0,
      risks: 'Fight going to deep decision pacing.',
      ev: '+6.5%',
      sharpLine: '-110',
      bookLine: '+110'
    },
    {
      id: 'df-mma-3',
      entity: 'Makhachev vs Tsarukyan Over 2.5 Rds',
      market: 'MMA',
      odds: '-120',
      analysis: 'High-level grappling parity. Both competitors boast world-class defense, leading to extensive positioning battles and slow round pacing.',
      confidence: 4,
      units: 3.5,
      risks: 'Sudden submission trap or referee stoppage variance.',
      ev: '+5.3%',
      sharpLine: '-140',
      bookLine: '-120'
    }
  ],
  HORSE: [
    {
      id: 'df-hrs-1',
      entity: 'WiseRace AI #3 Win',
      market: 'HORSE',
      odds: '+250',
      analysis: 'Unusual track speed optimization detected by WiseRace predictive network. Track friction and stride frequency strongly favor #3.',
      confidence: 5,
      units: 3.0,
      risks: 'Gate breakout delay or physical track traffic.',
      ev: '+12.4%',
      sharpLine: '+200',
      bookLine: '+250'
    },
    {
      id: 'df-hrs-2',
      entity: 'Exacta Box 1-4-7',
      market: 'HORSE',
      odds: '+450',
      analysis: 'High probability speed clustering. Model identifies excellent speed figures on all three runners, securing top-three potential.',
      confidence: 3,
      units: 1.5,
      risks: 'Extreme long-shot surge from rear of field.',
      ev: '+15.2%',
      sharpLine: '+380',
      bookLine: '+450'
    },
    {
      id: 'df-hrs-3',
      entity: 'WiseRace AI #5 Place',
      market: 'HORSE',
      odds: '+110',
      analysis: 'Consistent pace rating. Horse ranks top-2 in stamina models under current weather and moisture conditions.',
      confidence: 4,
      units: 4.0,
      risks: 'Early-race fade under high pace pressure.',
      ev: '+6.8%',
      sharpLine: '-110',
      bookLine: '+110'
    }
  ],
  GOLF: [
    {
      id: 'df-glf-1',
      entity: 'Scheffler Top 5',
      market: 'GOLF',
      odds: '-120',
      analysis: 'Strokes Gained: Tee-to-Green dominance. Historic metrics at this tournament setup show unbeatable tee placement accuracy.',
      confidence: 5,
      units: 5.0,
      risks: 'Extreme putting variance on fast greens.',
      ev: '+8.9%',
      sharpLine: '-145',
      bookLine: '-120'
    },
    {
      id: 'df-glf-2',
      entity: 'McIlroy Top 10',
      market: 'GOLF',
      odds: '+125',
      analysis: 'Driving distance advantage. Wide fairways permit high-leverage driving metrics, providing short-iron approaches to par 5s.',
      confidence: 4,
      units: 3.5,
      risks: 'Erratic driving days leading to penalty stroke hazards.',
      ev: '+6.1%',
      sharpLine: '+105',
      bookLine: '+125'
    },
    {
      id: 'df-glf-3',
      entity: 'Hovland vs Morikawa Matchup',
      market: 'GOLF',
      odds: '-110',
      analysis: 'In-play simulation advantage. Hovland exhibits superior approach-shot proximity on bentgrass surfaces over last 24 rounds.',
      confidence: 4,
      units: 3.0,
      risks: 'Short-game recovery variance in greenside bunkers.',
      ev: '+5.4%',
      sharpLine: '-125',
      bookLine: '-110'
    }
  ],
  VELOCITY: [
    {
      id: 'df-vel-1',
      entity: 'BTC > $100K Q2',
      market: 'VELOCITY',
      odds: '65',
      analysis: 'Massive limit orders placed across major prediction venues. Model identifies high institutional inflow alignment.',
      confidence: 5,
      units: 4.5,
      risks: 'Macro-economic policy volatility or regulatory changes.',
      ev: '+11.2%',
      sharpLine: '70',
      bookLine: '65'
    },
    {
      id: 'df-vel-2',
      entity: 'SOL Surpasses BNB',
      market: 'VELOCITY',
      odds: '29',
      analysis: 'Liquid stake metrics and DEX volume acceleration. Solana continues expanding ecosystem footprint, driving high market cap momentum.',
      confidence: 4,
      units: 3.5,
      risks: 'Sudden BNB token burn or Binance ecosystem recovery action.',
      ev: '+9.4%',
      sharpLine: '35',
      bookLine: '29'
    },
    {
      id: 'df-vel-3',
      entity: 'SOL ETF Approval',
      market: 'VELOCITY',
      odds: '19',
      analysis: 'Asymmetric option. Current regulatory filings and political shifts indicate SEC is highly likely to accelerate approvals.',
      confidence: 3,
      units: 2.0,
      risks: 'Unexpected regulatory pushbacks or delayed rulings.',
      ev: '+14.5%',
      sharpLine: '25',
      bookLine: '19'
    }
  ]
};

// --- PRESTIGIOUS WHALE PICK CARD COMPONENT ---
const WhalePickCard: React.FC<{
    rank: number;
    pick: ExtractedPick;
    unitValue: number;
    onAddPick: (p: ExtractedPick) => void;
    league: League;
}> = ({ rank, pick, unitValue, onAddPick, league }) => {
    const teamInfo = getTeamInfo(pick.entity);
    const logoUrl = teamInfo ? `https://a.espncdn.com/i/teamlogos/${teamInfo.league}/500/${teamInfo.code.toLowerCase()}.png` : null;

    const rankTheme = {
        1: {
            title: 'Gold Whale Tier',
            badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
            icon: <Crown className="text-amber-400 animate-pulse" size={16} strokeWidth={2.5} />,
            accentBorder: 'border-amber-500/30 hover:border-amber-400/50 shadow-[0_15px_45px_rgba(245,158,11,0.06)]',
            glowColor: 'from-amber-500/5 to-transparent',
            glowDot: 'bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
        },
        2: {
            title: 'Silver Whale Tier',
            badge: 'bg-slate-400/10 text-slate-300 border-slate-400/20 shadow-[0_0_15px_rgba(148,163,184,0.15)]',
            icon: <Award className="text-slate-300" size={16} strokeWidth={2.5} />,
            accentBorder: 'border-slate-700/60 hover:border-slate-500 shadow-[0_15px_45px_rgba(148,163,184,0.04)]',
            glowColor: 'from-slate-500/5 to-transparent',
            glowDot: 'bg-slate-300 shadow-[0_0_15px_rgba(148,163,184,0.8)]'
        },
        3: {
            title: 'Bronze Whale Tier',
            badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]',
            icon: <Gem className="text-orange-400" size={16} strokeWidth={2.5} />,
            accentBorder: 'border-orange-900/40 hover:border-orange-700/50 shadow-[0_15px_45px_rgba(249,115,22,0.03)]',
            glowColor: 'from-orange-500/5 to-transparent',
            glowDot: 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]'
        }
    }[rank as 1 | 2 | 3] || {
        title: 'Whale Position',
        badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        icon: <Target className="text-indigo-400" size={16} />,
        accentBorder: 'border-slate-800 hover:border-slate-600',
        glowColor: 'from-indigo-500/5 to-transparent',
        glowDot: 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]'
    };

    return (
        <div className={clsx(
            "bg-gradient-to-b from-[#0a0e1a] to-[#04060c] rounded-[44px] border overflow-hidden flex flex-col h-full shadow-[0_35px_80px_rgba(0,0,0,0.7)] group transition-all duration-300 relative",
            rankTheme.accentBorder
        )}>
            {/* Ambient Background Glow */}
            <div className={clsx("absolute top-0 right-0 w-80 h-80 bg-gradient-to-br blur-[120px] opacity-10 rounded-full pointer-events-none", rankTheme.glowColor)}></div>
            
            <div className="p-8 relative flex-grow">
                {/* Card Top Header (Rank badge & stars) */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-6 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                        <div className={clsx("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border flex items-center gap-2", rankTheme.badge)}>
                            {rankTheme.icon}
                            <span>RANK #{rank}: {rankTheme.title}</span>
                        </div>
                    </div>
                    <div className="flex gap-0.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/[0.03]">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={11} className={clsx(i < pick.confidence ? "text-amber-400 fill-amber-400" : "text-white/10 fill-white/10")} />
                        ))}
                    </div>
                </div>

                {/* Team Info & Odds */}
                <div className="flex justify-between items-start gap-4 mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-3xl bg-[#0e1424] flex items-center justify-center p-4 border border-white/[0.05] shadow-2xl group-hover:scale-105 transition-transform duration-500 shrink-0">
                            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <Target className="text-slate-600" size={36} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 mb-1.5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{league} MARKET</span>
                                <div className={clsx("w-1.5 h-1.5 rounded-full", rankTheme.glowDot)}></div>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-tight group-hover:text-amber-400 transition-colors duration-300">{pick.entity}</h3>
                            <p className="text-slate-500 text-[11px] font-mono mt-1 font-bold tracking-wide">Expected Value Protocol • {pick.market}</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-4xl font-black text-white font-mono leading-none tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{pick.odds}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.15em] mt-1.5">LIVE PRICE</div>
                    </div>
                </div>

                {/* Statistical Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-black/50 border border-white/[0.03] rounded-2xl p-4 flex flex-col items-center justify-center group-hover:border-white/[0.08] transition-colors">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Sharp Agg</span>
                        <span className="text-sm font-mono font-black text-slate-300">{pick.sharpLine || '--'}</span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col items-center justify-center group-hover:border-amber-500/20 transition-colors">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Model EV</span>
                        <span className="text-sm font-mono font-black text-amber-400">{pick.ev || '4.2%'}</span>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex flex-col items-center justify-center group-hover:border-emerald-500/20 transition-colors">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">P(Win)</span>
                        <span className="text-sm font-mono font-black text-emerald-400">{(pick.confidence * 12 + 20)}%</span>
                    </div>
                </div>

                {/* Analytical Thesis & Risk Elements */}
                <div className="space-y-4">
                    <div className="bg-white/[0.015] rounded-2xl p-5 border border-white/[0.03] relative overflow-hidden group-hover:bg-white/[0.03] transition-colors">
                        <div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-[0.2em] flex items-center gap-2">
                             <FileText size={13} className="text-amber-500" /> WHALE ANALYTICAL THESIS
                        </div>
                        <p className="text-[13px] text-slate-300 leading-relaxed font-medium italic">
                            "{pick.analysis}"
                        </p>
                    </div>

                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex items-start gap-3.5">
                        <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                        <div>
                             <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block mb-0.5">RISK MITIGATION PROTOCOL</span>
                             <p className="text-[11px] text-rose-300 font-mono leading-relaxed opacity-85">{pick.risks}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Stake Allocation & Add to Slip */}
            <div className="bg-black/50 border-t border-white/[0.04] p-6 flex flex-col sm:flex-row items-center justify-between gap-5 mt-auto">
                <div className="flex items-center gap-8 self-start sm:self-center">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.25em] mb-1">WHALE WEIGHT</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-amber-500 font-mono leading-none">{pick.units}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">u</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/5"></div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.25em] mb-1">CAPITAL ALLOCATION</div>
                        <div className="text-2xl font-black text-white font-mono leading-none">${(pick.units * unitValue).toLocaleString()}</div>
                    </div>
                </div>
                <button 
                    onClick={() => onAddPick(pick)}
                    className="w-full sm:w-auto px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-amber-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={14} strokeWidth={2.5} />
                    EXECUTE POSITION
                </button>
            </div>
        </div>
    );
};

// --- COMPACT SECONDARY PICK CARD ---
const SecondaryPickCard: React.FC<{
    pick: ExtractedPick;
    unitValue: number;
    onAddPick: (p: ExtractedPick) => void;
    league: League;
}> = ({ pick, unitValue, onAddPick, league }) => {
    const teamInfo = getTeamInfo(pick.entity);
    const logoUrl = teamInfo ? `https://a.espncdn.com/i/teamlogos/${teamInfo.league}/500/${teamInfo.code.toLowerCase()}.png` : null;

    return (
        <div className="bg-gradient-to-b from-[#060a14] to-[#020408] border border-white/[0.03] hover:border-slate-800 rounded-3xl p-6 transition-all group flex flex-col justify-between relative shadow-lg">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center p-2 border border-white/[0.04] group-hover:scale-105 transition-transform shrink-0">
                            {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain" /> : <Target className="text-slate-600" size={24} />}
                        </div>
                        <div>
                            <span className="text-[8px] bg-white/5 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-white/[0.02] uppercase tracking-wider">{pick.market}</span>
                            <h4 className="text-md font-black text-white leading-tight mt-1 truncate group-hover:text-amber-400 transition-colors">{pick.entity}</h4>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-black font-mono text-white">{pick.odds}</span>
                        <span className="block text-[8px] text-slate-500 font-black uppercase mt-0.5">ODDS</span>
                    </div>
                </div>
                <p className="text-[12px] text-slate-400 line-clamp-2 leading-relaxed italic mb-4">"{pick.analysis}"</p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                <div className="flex items-center gap-4">
                    <div>
                        <span className="block text-[8px] text-slate-500 font-black tracking-widest">WEIGHT</span>
                        <span className="text-md font-mono font-black text-slate-300">{pick.units}u</span>
                    </div>
                    <div className="w-px h-6 bg-white/5"></div>
                    <div>
                        <span className="block text-[8px] text-slate-500 font-black tracking-widest">CAPITAL</span>
                        <span className="text-md font-mono font-black text-slate-300">${(pick.units * unitValue).toLocaleString()}</span>
                    </div>
                </div>
                <button 
                    onClick={() => onAddPick(pick)}
                    className="p-2.5 bg-white/5 hover:bg-amber-600 text-slate-400 hover:text-white rounded-xl transition-all"
                    title="Add to position slip"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};

// --- PRESTIGIOUS RECAP DOCUMENT VIEWER ---
const RecapDocumentViewer: React.FC<{ title: string; date: string; content: string }> = ({ title, date, content }) => {
    return (
        <div className="bg-[#04070d] border border-white/[0.04] rounded-[48px] p-8 md:p-12 shadow-[0_30px_70px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-transparent blur-[120px] pointer-events-none"></div>
            
            <div className="border-b border-white/[0.05] pb-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Verified Settlement Report</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">{title}</h2>
                </div>
                <div className="text-left md:text-right">
                    <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">REPORT SETTLEMENT</span>
                    <span className="text-sm font-mono font-black text-slate-300 mt-1 block">{date}</span>
                </div>
            </div>
            
            <div className="text-slate-300 font-sans leading-relaxed text-[14px] md:text-[15px] whitespace-pre-wrap select-text selection:bg-amber-500 selection:text-black space-y-4">
                {content}
            </div>
        </div>
    );
};

// --- MLB LIVE NEWS FEED FROM ESPN (COMPACT SIDEBAR VERSION) ---
interface MlbArticle {
  headline: string;
  description: string;
  published: string;
  links: {
    web: {
      href: string;
    };
  };
  images?: {
    url: string;
  }[];
}

const MlbNewsFeed: React.FC = () => {
  const [articles, setArticles] = useState<MlbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMlbNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetUrl = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err: any) {
      console.error("Error fetching MLB news:", err);
      setError("Failed to fetch news feed");
      // High-quality sports analytics fallback
      setArticles([
        {
          headline: "MLB Alpha Signal: Pitcher Rotation Parity Shifts",
          description: "Analyzing recent bullpen usage and starting pitcher velocity models shows a strong divergence in closing line value for high-stake moneyline markets.",
          published: new Date().toISOString(),
          links: { web: { href: "#" } }
        },
        {
          headline: "Sharp Volume Surge: East Division Over/Under Trades",
          description: "Unusual volume spikes detected in early morning limits on key totals. High model alignment with under projections on standard books.",
          published: new Date().toISOString(),
          links: { web: { href: "#" } }
        },
        {
          headline: "Model Update: Expected Run Value Realignment",
          description: "Weather and ballpark factor weighting adjusted for today's slate. Running 10,000 simulations per contest to identify pricing gaps.",
          published: new Date().toISOString(),
          links: { web: { href: "#" } }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMlbNews();
    const interval = setInterval(fetchMlbNews, 1800000); // 30 mins
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 relative overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-rose-400 font-bold uppercase tracking-widest flex items-center gap-2 text-sm">
            <BookOpen size={18} />
            ESPN MLB News
          </h3>
          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Live Intelligence</span>
        </div>
        <button 
          onClick={fetchMlbNews} 
          disabled={loading}
          className="text-slate-500 hover:text-white transition-colors p-1"
          title="Refresh MLB News"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
        {loading && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="animate-spin text-rose-500 mb-2" size={24} />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Parsing ESPN Feed...</span>
          </div>
        ) : (
          articles.slice(0, 6).map((article, idx) => (
            <a 
              key={idx}
              href={article.links?.web?.href}
              target="_blank"
              rel="noreferrer"
              className="block p-3 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-rose-500/30 transition-all group"
            >
              <div className="text-[8px] font-mono text-slate-500 mb-1 flex justify-between items-center">
                <span className="text-rose-400 font-bold uppercase">ESPN WIRE</span>
                <span>{new Date(article.published).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <h4 className="text-xs font-black text-white leading-tight mb-1.5 group-hover:text-rose-300 transition-colors uppercase">
                {article.headline}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {article.description}
              </p>
            </a>
          ))
        )}
        {!loading && articles.length === 0 && (
          <div className="text-center text-slate-500 text-xs py-10">
            No active news feed.
          </div>
        )}
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

  // Combine single and parlay picks
  const allPicks = useMemo(() => {
    return [...singlePicks, ...parlayPicks];
  }, [singlePicks, parlayPicks]);

  // Extract Top 3 Whale Picks, filling remaining slots from high-fidelity defaults
  const whalePicks = useMemo(() => {
    const picks = [...allPicks];
    const defaults = DEFAULT_WHALE_PICKS[league] || DEFAULT_WHALE_PICKS['NFL'];
    let index = 0;
    while (picks.length < 3 && index < defaults.length) {
      if (!picks.some(p => p.entity.toLowerCase() === defaults[index].entity.toLowerCase())) {
        picks.push({
          ...defaults[index],
          id: `default-${league}-${index}-${Date.now()}`
        });
      }
      index++;
    }
    return picks.slice(0, 3);
  }, [allPicks, league]);

  // Any remaining picks beyond rank 1, 2, 3
  const secondaryPicks = useMemo(() => {
    if (allPicks.length <= 3) return [];
    return allPicks.slice(3);
  }, [allPicks]);

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

  const accentColor = league === 'NFL' ? 'emerald' : 
                     league === 'NBA' ? 'orange' : 
                     league === 'NHL' ? 'cyan' : 
                     league === 'MLB' ? 'rose' :
                     league === 'MLS' ? 'pink' :
                     league === 'MMA' ? 'red' :
                     league === 'HORSE' ? 'amber' :
                     league === 'GOLF' ? 'lime' :
                     league === 'VELOCITY' ? 'fuchsia' :
                     'indigo';
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
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-6 leading-none">{league === 'VELOCITY' ? 'Velocity Crypto' : `${league} Whale Tracker`}</h2>
                  <p className="text-slate-400 mb-12 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                      Establishing neural handshake with the secure <span className={accentClass}>{league === 'VELOCITY' ? 'Velocity Crypto Core' : `${league} Syndicates`}</span>. 
                      Synchronizing institutional limits and high-conviction positions.
                  </p>
                  <button 
                    onClick={() => setIsLocked(false)}
                    className={clsx("w-full py-6 rounded-3xl font-black uppercase tracking-[0.4em] text-xs text-white shadow-2xl transition-all active:scale-[0.98]", bgAccentClass)}
                  >
                      Initiate Handshake
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
                    <span className="text-white">TOP EDGE</span>
                    <span className={clsx("ml-5", accentClass)}>PICKS</span>
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
                {league !== 'MLB' && <LiveOdds league={league} />}

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
                            <button 
                                key={item.id} 
                                onClick={() => { 
                                    setViewMode('sunday');
                                    setDisplayedContent(item.content); 
                                    setDisplayedTitle(item.title); 
                                    setSelectedId(item.id); 
                                }} 
                                className={clsx(
                                    "w-full text-left p-6 rounded-3xl border transition-all", 
                                    (selectedId === item.id && viewMode === 'sunday') 
                                        ? `bg-${accentColor}-600/10 border-${accentColor}-500/50 text-white` 
                                        : "bg-black/40 border-white/5 text-slate-500 hover:border-white/10"
                                )}
                            >
                                <div className="font-black text-[12px] uppercase truncate mb-1 tracking-tight">{item.title}</div>
                                <div className="text-[10px] font-mono opacity-40">{item.date}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={clsx(league === 'MLB' ? "lg:col-span-6" : "lg:col-span-9")}>
                {league === 'VELOCITY' && (
                    <div className="mb-12 glass-panel p-8 rounded-[48px] border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-900/20 to-transparent relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Cpu size={120} className="text-fuchsia-400" />
                        </div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping"></div>
                                    <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-[0.4em]">Agentic_Terminal_v4.2</span>
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 italic">Velocity <span className="text-fuchsia-400">Crypto</span></h2>
                                <p className="text-slate-400 text-sm max-w-xl">
                                    Autonomous agents are scanning <span className="text-white font-bold">Uniswap, Aave, and CME</span> for structural yield dislocations.
                                    Execution is sub-millisecond via Flashbots RPC.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button className="px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-fuchsia-500/20 flex items-center gap-3">
                                    <Play size={14} /> Run Agents
                                </button>
                                <button className="px-8 py-4 bg-black/40 border border-white/10 hover:border-fuchsia-500/50 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3">
                                    <Shield size={14} /> Audit Trail
                                </button>
                            </div>
                        </div>
                        
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'DeFi TVL Scan', value: '$14.2B', status: 'OK' },
                                { label: 'TradFi Arb Gap', value: '0.42%', status: 'HIGH' },
                                { label: 'Agent Confidence', value: '94.8%', status: 'STABLE' },
                                { label: 'Flashbots Relay', value: '12ms', status: 'FAST' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">{stat.label}</div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-lg font-black text-white font-mono">{stat.value}</div>
                                        <div className={clsx("text-[8px] font-black px-1.5 py-0.5 rounded", stat.status === 'HIGH' ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>{stat.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'daily' ? (
                    <div>
                        {/* Title of Top Edge Picks */}
                        <div className="mb-10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <span className="text-amber-500 font-serif italic">Whale</span> Bets of the Day
                                </h2>
                                <p className="text-slate-400 text-xs mt-1">The top three maximum-conviction institutional positions tracking smart money flows.</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
                                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Whale Volume High</span>
                            </div>
                        </div>

                        {/* Top 3 Whale Stack */}
                        <div className="grid grid-cols-1 gap-12 mb-16">
                            {whalePicks.map((pick, index) => (
                                <WhalePickCard 
                                    key={pick.id} 
                                    rank={index + 1} 
                                    pick={pick} 
                                    unitValue={unitValue} 
                                    onAddPick={(p) => setBetSlip(prev => {
                                        if (prev.some(x => x.id === p.id)) return prev;
                                        return [...prev, {...p, stake: p.units*unitValue, toWin: 0}];
                                    })} 
                                    league={league} 
                                />
                            ))}
                        </div>

                        {/* Secondary Picks */}
                        {secondaryPicks.length > 0 && (
                            <div>
                                <div className="mb-8 mt-16 pb-4 border-b border-white/5">
                                    <h3 className="text-xl font-black text-slate-300 uppercase tracking-tight flex items-center gap-2">
                                        <Layers size={18} className="text-slate-500" /> Supporting Sharp Inflows
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-1">Secondary institutional exposures backing high-volume money flows.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                                    {secondaryPicks.map(pick => (
                                        <SecondaryPickCard 
                                            key={pick.id} 
                                            pick={pick} 
                                            unitValue={unitValue} 
                                            onAddPick={(p) => setBetSlip(prev => {
                                                if (prev.some(x => x.id === p.id)) return prev;
                                                return [...prev, {...p, stake: p.units*unitValue, toWin: 0}];
                                            })} 
                                            league={league} 
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <RecapDocumentViewer 
                        title={displayedTitle} 
                        date={archives.find(a => a.id === selectedId)?.date || new Date().toLocaleDateString()} 
                        content={displayedContent} 
                    />
                )}
            </div>

            {/* MLB Right Side Nav Bar Hub */}
            {league === 'MLB' && (
                <div className="lg:col-span-3 space-y-12">
                    <LiveOdds league="MLB" />
                    <MlbNewsFeed />
                </div>
            )}
        </div>

        <div className="mt-20">
            <HighlightReel activeLeague={league} />
        </div>
    </div>
  );
};
