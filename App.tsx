
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
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [archives, setArchives] = useState<PickArchiveItem[]>([]);
  const [gameSummaries, setGameSummaries] = useState<GameSummary[]>([]);
  
  // Specific content for each league (Active daily report)
  const [leaguePicks, setLeaguePicks] = useState<Record<League, string>>({
      NFL: INITIAL_PICKS_CONTENT,
      NBA: "# NBA ALPHA FEED\nEstablishing daily hoops signal...",
      NHL: "# NHL ALPHA FEED\nEstablishing ice parity weights...",
      MLB: "# MLB ALPHA FEED\nSynchronizing pitching data..."
  });

  useEffect(() => {
      const storedAccess = localStorage.getItem('quantum_access_granted');
      if (storedAccess === 'true') setHasAccess(true);
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
            // Hydrate current league picks from latest relevant archive
            const sports: League[] = ['NFL', 'NBA', 'NHL', 'MLB'];
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

  useEffect(() => { if (hasAccess) fetchSupabaseData(); }, [hasAccess]);

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

  const isTradingDesk = currentView === 'trading-desk';

  if (checkingAccess) return null;
  if (!hasAccess) return <EmailGate onUnlock={() => { localStorage.setItem('quantum_access_granted', 'true'); setHasAccess(true); }} />;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard weeks={weeks} stats={calculateStats(weeks)} chartData={generateChartData(weeks)} />;
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
      case 'propalpha':
        return <PropAlpha />;
      case 'binary-alpha':
        return <PredictionMarkets />;
      case 'odds':
        return <OddsBoard />;
      case 'superposition':
        return <Superposition />;
      case 'statsedge':
        return <StatsEdge />;
      case 'trading-desk':
        return <TradingDesk onClose={() => setCurrentView('picks')} />;
      default:
        return <Picks league={activeLeague} currentContent={leaguePicks[activeLeague]} archives={archives} gameSummaries={gameSummaries} propsData={[]} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
        {!isTradingDesk && <TeamTicker />}
        <div className={isTradingDesk ? "" : "py-8"}>
            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-mono text-sm">Synchronizing Quantum Core...</p>
                </div>
            ) : (
                renderContent()
            )}
        </div>
      </main>

      {showVoiceAgent && <VoiceAgent onClose={() => setShowVoiceAgent(false)} />}
      <ChatBot />
      <OnboardingTour currentView={currentView} setCurrentView={setCurrentView} onLaunchArby={() => setShowVoiceAgent(true)} />
    </div>
  );
}

export default App;
