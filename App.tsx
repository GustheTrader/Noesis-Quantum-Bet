
import React, { useState, useMemo, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Picks } from './pages/Picks';
import { Results } from './pages/Results';
import { KellyTool } from './pages/KellyTool';
import { StatsEdge } from './pages/StatsEdge';
import { Superposition } from './pages/Superposition';
import { TradingDesk } from './pages/TradingDesk';
import { Blog } from './pages/Blog'; 
import { OddsBoard } from './pages/OddsBoard';
import { PropAlpha } from './pages/PropAlpha';
import { PredictionMarkets } from './pages/PredictionMarkets';
import { WiseRaceTerminal } from './pages/WiseRaceTerminal';
import { ChatBot } from './components/ChatBot';
import { TeamTicker } from './components/TeamTicker';
import { OnboardingTour } from './components/OnboardingTour';
import { VoiceAgent } from './components/VoiceAgent';
import { EmailGate } from './components/EmailGate';
import { INITIAL_PICKS_CONTENT, INITIAL_WEEK_DATA, INITIAL_ARCHIVE, INITIAL_GAME_SUMMARIES } from './constants';
import { calculateStats, generateChartData, formatError } from './utils';
import { WeekData, PickArchiveItem, GameSummary, League } from './types';
import { supabase } from './lib/supabase';
import { Loader2, Wifi, WifiOff, AlertTriangle, RefreshCcw, Lock } from 'lucide-react';
import { clsx } from 'clsx';

function App() {
  const [currentView, setCurrentView] = useState<string>('picks');
  const [activeLeague, setActiveLeague] = useState<League>('NFL');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [sessionMode, setSessionMode] = useState<'none' | 'tour' | 'voice' | 'direct'>('none');
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [archives, setArchives] = useState<PickArchiveItem[]>([]);
  const [gameSummaries, setGameSummaries] = useState<GameSummary[]>([]);
  
  const [leaguePicks, setLeaguePicks] = useState<Record<League, string>>({
      NFL: INITIAL_PICKS_CONTENT,
      NBA: "# NBA ALPHA FEED\nEstablishing daily hoops signal...",
      NHL: "# NHL ALPHA FEED\nEstablishing ice parity weights...",
      MLB: "# MLB ALPHA FEED\nSynchronizing pitching data...",
      MLS: "# MLS ALPHA FEED\nAnalyzing pitch dynamics...",
      SOCCER: "# SOCCER ALPHA FEED\nGlobal market synchronization...",
      MMA: "# MMA ALPHA FEED\nCalculating octagon control metrics...",
      HORSE: "# HORSE ALPHA FEED\nWiseRaceAi Terminal Synchronizing...",
      GOLF: "# GOLF ALPHA FEED\nAnalyzing tournament strokes gained...",
      VELOCITY: "# VELOCITY ASYMBETTING\nAgentic Betting Agents Synchronizing Crypto/DeFi/TradFi Alpha..."
  });

  useEffect(() => {
      const storedAccess = localStorage.getItem('quantum_access_granted');
      if (storedAccess === 'true') {
          setHasAccess(true);
      }
      setCheckingAccess(false);
  }, []);

  const fetchSupabaseData = async () => {
      setIsLoadingData(true);
      try {
        const { data: weeksData } = await supabase.from('weeks').select('*');
        if (weeksData) setWeeks(weeksData as WeekData[]);

        const { data: picksData } = await supabase.from('picks').select('*').order('created_at', { ascending: false });
        if (picksData) {
            setArchives(picksData as PickArchiveItem[]);
            const sports: League[] = ['NFL', 'NBA', 'NHL', 'MLB', 'MLS', 'SOCCER', 'MMA', 'HORSE', 'GOLF', 'VELOCITY'];
            sports.forEach(s => {
                const latest = picksData.find(p => p.league === s);
                if (latest) setLeaguePicks(prev => ({ ...prev, [s]: latest.content }));
            });
        }

        const { data: summariesData } = await supabase.from('summaries').select('*');
        if (summariesData) setGameSummaries(summariesData as GameSummary[]);

      } catch (err: any) {
        console.error("Data Sync Error", err);
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
         id: `arch-${Date.now()}`,
         title: filename,
         date: new Date().toLocaleDateString(),
         content: content,
         league: league,
         fileUrl: fileUrl
     };
     await supabase.from('picks').upsert(newArchive);
     setArchives(prev => [newArchive, ...prev]);
     setLeaguePicks(prev => ({ ...prev, [league]: content }));
  };

  const handleUnlock = (mode: 'tour' | 'voice' | 'direct') => {
    localStorage.setItem('quantum_access_granted', 'true');
    setHasAccess(true);
    setSessionMode(mode);
    if (mode === 'voice') setShowVoiceAgent(true);
    if (mode === 'tour') {
        localStorage.removeItem('quantum_tour_seen');
    }
  };

  const handleTourComplete = () => {
      setSessionMode('none'); 
  };

  if (checkingAccess) return null;

  if (sessionMode === 'none') {
      return <EmailGate onUnlock={handleUnlock} />;
  }

  const renderContent = () => {
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
        return <Dashboard weeks={leagueWeeks} stats={leagueStats} chartData={leagueChartData} activeLeague={activeLeague} />;
      case 'admin':
        return (
          <Admin 
            onDataUploaded={(d) => setWeeks(prev => [d, ...prev])} 
            weeks={weeks} 
            onDeleteReport={(id) => setWeeks(prev => prev.filter(w => w.id !== id))}
            onUpdatePicks={handlePicksUpdate}
            onUploadSummary={(s) => setGameSummaries(prev => [s, ...prev])}
            onFactoryReset={() => {}}
          />
        );
      case 'picks':
        return (
          <Picks 
            league={activeLeague}
            currentContent={leaguePicks[activeLeague]} 
            archives={archives} 
            gameSummaries={gameSummaries}
            propsData={[]}
          />
        );
      case 'odds': return <OddsBoard activeLeague={activeLeague} />;
      case 'binary-alpha': return <PredictionMarkets activeLeague={activeLeague} />;
      case 'horse-terminal': return <WiseRaceTerminal />;
      case 'superposition': return <Superposition activeLeague={activeLeague} />;
      case 'statsedge': return <StatsEdge activeLeague={activeLeague} />;
      case 'trading-desk': return <TradingDesk onClose={() => setCurrentView('picks')} />;
      default: return <Picks league={activeLeague} currentContent={leaguePicks[activeLeague]} archives={archives} gameSummaries={gameSummaries} propsData={[]} />;
    }
  };

  const isTradingDesk = currentView === 'trading-desk';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-x-hidden">
      {!isTradingDesk && (
          <NavBar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onLaunchArby={() => setShowVoiceAgent(true)}
            activeLeague={activeLeague}
            setActiveLeague={setActiveLeague}
          />
      )}

      <main className={`relative z-10 flex-grow ${isTradingDesk ? '' : 'pt-24'}`}>
        {!isTradingDesk && <TeamTicker activeLeague={activeLeague} />}
        <div className={isTradingDesk ? "" : "py-8"}>
            {renderContent()}
        </div>
      </main>

      {showVoiceAgent && <VoiceAgent onClose={() => setShowVoiceAgent(false)} />}
      
      <ChatBot />

      {sessionMode === 'tour' && (
          <OnboardingTour 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onLaunchArby={() => setShowVoiceAgent(true)} 
            onComplete={handleTourComplete}
          />
      )}
    </div>
  );
}

export default App;
