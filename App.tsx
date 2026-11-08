
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { lazyPage } from './lib/lazyPage';
import { supabase } from './lib/supabase';
import { NavBar } from './components/NavBar';
import { TeamTicker } from './components/TeamTicker';
import { EmailGate } from './components/EmailGate';
import { INITIAL_PICKS_CONTENT, INITIAL_WEEK_DATA, INITIAL_ARCHIVE, INITIAL_GAME_SUMMARIES } from './constants';
import { calculateStats, generateChartData, formatError } from './utils';
import { WeekData, PickArchiveItem, GameSummary, League } from './types';
import { Loader2, Wifi, WifiOff, AlertTriangle, RefreshCcw, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { ErrorBoundary } from './components/ErrorBoundary';

const QuantumEdge = lazyPage(() => import('./pages/QuantumEdge').then(m => ({ default: m.QuantumEdge })));
const Dashboard = lazyPage(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Admin = lazyPage(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Picks = lazyPage(() => import('./pages/Picks').then(m => ({ default: m.Picks })));
const Results = lazyPage(() => import('./pages/Results').then(m => ({ default: m.Results })));
const KellyTool = lazyPage(() => import('./pages/KellyTool').then(m => ({ default: m.KellyTool })));
const StatsEdge = lazyPage(() => import('./pages/StatsEdge').then(m => ({ default: m.StatsEdge })));
const Superposition = lazyPage(() => import('./pages/Superposition').then(m => ({ default: m.Superposition })));
const TradingDesk = lazyPage(() => import('./pages/TradingDesk').then(m => ({ default: m.TradingDesk })));
const Blog = lazyPage(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const OddsBoard = lazyPage(() => import('./pages/OddsBoard').then(m => ({ default: m.OddsBoard })));
const PropAlpha = lazyPage(() => import('./pages/PropAlpha').then(m => ({ default: m.PropAlpha })));
const PredictionMarkets = lazyPage(() => import('./pages/PredictionMarkets').then(m => ({ default: m.PredictionMarkets })));
const WiseRaceTerminal = lazyPage(() => import('./pages/WiseRaceTerminal').then(m => ({ default: m.WiseRaceTerminal })));
const ChatBot = lazyPage(() => import('./components/ChatBot').then(m => ({ default: m.ChatBot })));
const OnboardingTour = lazyPage(() => import('./components/OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const VoiceAgent = lazyPage(() => import('./components/VoiceAgent').then(m => ({ default: m.VoiceAgent })));
const SettingsModal = lazyPage(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const PremiumGate = lazyPage(() => import('./components/PremiumGate').then(m => ({ default: m.PremiumGate })));

// Named-export alias for every lazy page, so JSX can use the same component names
// the file used when these were static imports.
const QuantumEdgePage = QuantumEdge; const DashboardPage = Dashboard; const AdminPage = Admin;
const PicksPage = Picks; const ResultsPage = Results; const KellyToolPage = KellyTool;
const StatsEdgePage = StatsEdge; const SuperpositionPage = Superposition; const TradingDeskPage = TradingDesk;
const BlogPage = Blog; const OddsBoardPage = OddsBoard; const PropAlphaPage = PropAlpha;
const PredictionMarketsPage = PredictionMarkets; const WiseRaceTerminalPage = WiseRaceTerminal;
const ChatBotWidget = ChatBot; const OnboardingTourWidget = OnboardingTour; const VoiceAgentWidget = VoiceAgent;
const SettingsModalWidget = SettingsModal; const PremiumGatePanel = PremiumGate;

function App() {
  const [currentView, setCurrentView] = useState<string>('picks');
  const [activeLeague, setActiveLeague] = useState<League>('NFL');
  const [lockNonce, setLockNonce] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean>(() => {
    try {
      return localStorage.getItem('quantum_access_granted') === 'true';
    } catch {
      return false;
    }
  });
  const [sessionMode, setSessionMode] = useState<'none' | 'tour' | 'voice' | 'direct'>(() => {
    try {
      return localStorage.getItem('quantum_access_granted') === 'true' ? 'direct' : 'none';
    } catch {
      return 'none';
    }
  });
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('asym_premium_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [weeks, setWeeks] = useState<WeekData[]>(() => {
    try {
      const cached = localStorage.getItem('quantum_cached_weeks');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_WEEK_DATA;
  });

  const [archives, setArchives] = useState<PickArchiveItem[]>(() => {
    try {
      const cached = localStorage.getItem('quantum_cached_archives');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_ARCHIVE;
  });

  const [gameSummaries, setGameSummaries] = useState<GameSummary[]>(() => {
    try {
      const cached = localStorage.getItem('quantum_cached_summaries');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_GAME_SUMMARIES;
  });
  
  const [leaguePicks, setLeaguePicks] = useState<Record<League, string>>({
      NFL: INITIAL_PICKS_CONTENT,
      CFB: "# CFB ALPHA FEED\nLive college football slate from ESPN. The free feed carries no closing lines, so the board shows game state and grades on results, not invented prices.",
      NBA: "# NBA ALPHA FEED\nEstablishing daily hoops signal...",
      NHL: "# NHL ALPHA FEED\nEstablishing ice parity weights...",
      MLB: "# MLB ALPHA FEED\nSynchronizing pitching data...",
      CFL: "# CFL ALPHA FEED\nCanadian Football League Alpha Feed\nSynchronizing Rouge, wide field, and 3-down model parameters...",
      MLS: "# MLS ALPHA FEED\nAnalyzing pitch dynamics...",
      SOCCER: "# SOCCER ALPHA FEED\nGlobal market synchronization...",
      MMA: "# MMA ALPHA FEED\nCalculating octagon control metrics...",
      HORSE: "# HORSE ALPHA FEED\nWiseRaceAi Terminal Synchronizing...",
      GOLF: "# GOLF ALPHA FEED\nAnalyzing tournament strokes gained...",
      VELOCITY: "# PREDICTION LABS GNOESIS LAB\nAgentic Prediction Agents Synchronizing Crypto/DeFi/TradFi Alpha..."
  });

  const fetchSupabaseData = async () => {
      try {
        // Quick 2.5-second timeout so unresponsive databases never stall page render
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 2500));

        const syncWork = async () => {
          const { data: weeksData } = await supabase.from('weeks').select('*');
          if (weeksData && weeksData.length > 0) {
            setWeeks(weeksData as WeekData[]);
            try { localStorage.setItem('quantum_cached_weeks', JSON.stringify(weeksData)); } catch {}
          }

          const { data: picksData } = await supabase.from('picks').select('*').order('created_at', { ascending: false });
          if (picksData && picksData.length > 0) {
              setArchives(picksData as PickArchiveItem[]);
              try { localStorage.setItem('quantum_cached_archives', JSON.stringify(picksData)); } catch {}
              const sports: League[] = ['NFL', 'NBA', 'NHL', 'MLB', 'CFL', 'MLS', 'SOCCER', 'MMA', 'HORSE', 'GOLF', 'VELOCITY'];
              sports.forEach(s => {
                  const latest = picksData.find(p => p.league === s);
                  if (latest) setLeaguePicks(prev => ({ ...prev, [s]: latest.content }));
              });
          }

          const { data: summariesData } = await supabase.from('summaries').select('*');
          if (summariesData && summariesData.length > 0) {
            setGameSummaries(summariesData as GameSummary[]);
            try { localStorage.setItem('quantum_cached_summaries', JSON.stringify(summariesData)); } catch {}
          }
        };

        await Promise.race([syncWork(), timeoutPromise]);
      } catch (err: any) {
        console.warn("Using offline local quantum database:", err?.message || err);
      } finally {
        setIsLoadingData(false);
      }
  };

  useEffect(() => { 
    if (hasAccess) {
        fetchSupabaseData(); 
    }
  }, [hasAccess]);

  const handlePicksUpdate = async (content: string, filename: string, league: League, fileUrl?: string) => {
     const newArchive: PickArchiveItem = {
         id: `arch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         title: filename,
         date: new Date().toLocaleDateString(),
         content: content,
         league: league,
         fileUrl: fileUrl
     };
     try {
       await supabase.from('picks').upsert(newArchive);
     } catch {}
     setArchives(prev => {
       const updated = [newArchive, ...prev];
       try { localStorage.setItem('quantum_cached_archives', JSON.stringify(updated)); } catch {}
       return updated;
     });
     setLeaguePicks(prev => ({ ...prev, [league]: content }));
  };

  const handleUnlock = (mode: 'tour' | 'voice' | 'direct') => {
    try {
      localStorage.setItem('quantum_access_granted', 'true');
    } catch {}
    setHasAccess(true);
    setSessionMode(mode);
    if (mode === 'voice') setShowVoiceAgent(true);
    if (mode === 'tour') {
        try { localStorage.removeItem('quantum_tour_seen'); } catch {}
    }
  };

  const handleTourComplete = () => {
      setSessionMode('direct'); 
  };

  if (checkingAccess) return null;

  if (sessionMode === 'none' && !hasAccess) {
      return <EmailGate onUnlock={handleUnlock} />;
  }

  const renderContent = () => {
    const isPremiumView = ['binary-alpha', 'quantum-edge', 'trading-desk'].includes(currentView);
    if (isPremiumView && !isPremiumUnlocked) {
        return (
            <PremiumGatePanel 
                currentViewName={currentView}
                onUnlockPremium={() => {
                    localStorage.setItem('asym_premium_unlocked', 'true');
                    setIsPremiumUnlocked(true);
                }}
            />
        );
    }

    if (isLoadingData && currentView !== 'trading-desk') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 size={64} className="text-cyan-500 animate-spin mb-6" />
                <p className="text-slate-400 font-mono text-sm uppercase tracking-[0.3em] animate-pulse">Synchronizing QuantumBets Core...</p>
            </div>
        );
    }

    // Filter data based on active league
    const leagueWeeks = weeks.filter(w => w.league === activeLeague);
    const leagueStats = calculateStats(leagueWeeks);
    const leagueChartData = generateChartData(leagueWeeks);

    switch (currentView) {
      case 'dashboard':
        return (
          <ErrorBoundary fallbackTitle="Dashboard Module Anomaly">
            <DashboardPage weeks={leagueWeeks} stats={leagueStats} chartData={leagueChartData} activeLeague={activeLeague} />
          </ErrorBoundary>
        );
      case 'admin':
        return (
          <ErrorBoundary fallbackTitle="Admin Subsystem Anomaly">
            <AdminPage 
              onDataUploaded={(d) => setWeeks(prev => [d, ...prev])} 
              weeks={weeks} 
              onDeleteReport={(id) => setWeeks(prev => prev.filter(w => w.id !== id))}
              onUpdatePicks={handlePicksUpdate}
              onUploadSummary={(s) => setGameSummaries(prev => [s, ...prev])}
              onFactoryReset={() => {}}
            />
          </ErrorBoundary>
        );
      case 'picks':
        return (
          <ErrorBoundary fallbackTitle="Picks Signal Feed Anomaly">
            <PicksPage 
              league={activeLeague}
              currentContent={leaguePicks[activeLeague]} 
              archives={archives} 
              gameSummaries={gameSummaries}
              propsData={[]}
            />
          </ErrorBoundary>
        );
      case 'odds':
        return (
          <ErrorBoundary fallbackTitle="Live Odds Board Anomaly">
            <OddsBoardPage activeLeague={activeLeague} />
          </ErrorBoundary>
        );
      case 'binary-alpha':
        return (
          <ErrorBoundary fallbackTitle="Prediction Markets Anomaly">
            <PredictionMarketsPage activeLeague={activeLeague} />
          </ErrorBoundary>
        );
      case 'horse-terminal':
        return (
          <ErrorBoundary fallbackTitle="Terminal Interface Anomaly">
            <WiseRaceTerminalPage />
          </ErrorBoundary>
        );
      case 'superposition':
        return (
          <ErrorBoundary fallbackTitle="Superposition Engine Anomaly">
            <SuperpositionPage activeLeague={activeLeague} />
          </ErrorBoundary>
        );
      case 'statsedge':
        return (
          <ErrorBoundary fallbackTitle="Stats Edge Engine Anomaly">
            <StatsEdgePage activeLeague={activeLeague} />
          </ErrorBoundary>
        );
      case 'quantum-edge':
        return (
          <ErrorBoundary fallbackTitle="Quantum Edge Model Anomaly">
            <QuantumEdgePage />
          </ErrorBoundary>
        );
      case 'trading-desk':
        return (
          <ErrorBoundary fallbackTitle="Trading Desk Subsystem Anomaly">
            <TradingDeskPage onClose={() => setCurrentView('picks')} />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary fallbackTitle="Signal Feed Anomaly">
            <PicksPage lockNonce={lockNonce} league={activeLeague} currentContent={leaguePicks[activeLeague]} archives={archives} gameSummaries={gameSummaries} propsData={[]} />
          </ErrorBoundary>
        );
    }
  };

  const isTradingDesk = currentView === 'trading-desk' && isPremiumUnlocked;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden">
      {!isTradingDesk && (
        <ErrorBoundary compact fallbackTitle="Navigation Panel Disconnected">
          <NavBar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onLaunchArby={() => setShowVoiceAgent(true)}
            activeLeague={activeLeague}
            setActiveLeague={setActiveLeague}
            onLeagueClick={() => setLockNonce(n => n + 1)}
            isPremiumUnlocked={isPremiumUnlocked}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </ErrorBoundary>
      )}

      <main className={`relative z-10 flex-grow ${isTradingDesk ? '' : 'pt-40 max-lg:pt-36'}`}>
        {!isTradingDesk && (
          <ErrorBoundary compact fallbackTitle="Live Ticker Offline">
            <TeamTicker activeLeague={activeLeague} />
          </ErrorBoundary>
        )}
        <div className={isTradingDesk ? "" : "py-8"}>
          <ErrorBoundary fallbackTitle="Active Viewport Anomaly">
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={40} className="text-cyan-500 animate-spin" /></div>}>
              {renderContent()}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {showVoiceAgent && (
        <ErrorBoundary compact fallbackTitle="Voice Interface Error" onReset={() => setShowVoiceAgent(false)}>
          <VoiceAgentWidget onClose={() => setShowVoiceAgent(false)} />
        </ErrorBoundary>
      )}
      
      <ErrorBoundary compact fallbackTitle="Quantum Chat Assistant Error">
        <ChatBotWidget />
      </ErrorBoundary>

      <ErrorBoundary compact fallbackTitle="Settings Subsystem Error" onReset={() => setIsSettingsOpen(false)}>
        <SettingsModalWidget 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </ErrorBoundary>

      {sessionMode === 'tour' && (
        <ErrorBoundary compact fallbackTitle="Onboarding Tour Anomaly" onReset={handleTourComplete}>
          <OnboardingTourWidget 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onLaunchArby={() => setShowVoiceAgent(true)} 
            onComplete={handleTourComplete}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;
