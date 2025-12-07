
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
import { ChatBot } from './components/ChatBot';
import { TeamTicker } from './components/TeamTicker';
import { OnboardingTour } from './components/OnboardingTour';
import { VoiceAgent } from './components/VoiceAgent';
import { EmailGate } from './components/EmailGate';
import { INITIAL_PICKS_CONTENT } from './constants';
import { calculateStats, generateChartData } from './utils';
import { WeekData, PickArchiveItem, GameSummary } from './types';
import { supabase } from './lib/supabase';
import { insertIngestedResult, getAllLatestIngestedResults, extractContents } from './lib/ingestion-db';
import { Loader2, Wifi, WifiOff, AlertTriangle, RefreshCcw } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge' | 'superposition' | 'trading-desk'>('picks');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataSource, setDataSource] = useState<'CLOUD' | 'DISCONNECTED'>('CLOUD');
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Access Control
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // Voice Agent State
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

  // --- State ---
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [picksContent, setPicksContent] = useState<string>(INITIAL_PICKS_CONTENT);
  const [picksTitle, setPicksTitle] = useState<string>("Week 6 - NFL Slate");
  const [archives, setArchives] = useState<PickArchiveItem[]>([]);
  const [gameSummaries, setGameSummaries] = useState<GameSummary[]>([]);

  // --- Access Check ---
  useEffect(() => {
      const storedAccess = localStorage.getItem('quantum_access_granted');
      if (storedAccess === 'true') {
          setHasAccess(true);
      }
      setCheckingAccess(false);
  }, []);

  const handleUnlock = () => {
      localStorage.setItem('quantum_access_granted', 'true');
      setHasAccess(true);
  };

  // --- Helper: Safe Error Formatting ---
  const formatError = (err: any): string => {
      if (!err) return "Unknown Error";
      if (typeof err === 'string') return err;
      if (err instanceof Error) return err.message;
      if (typeof err === 'object') {
          return err.message || err.error_description || JSON.stringify(err);
      }
      return String(err);
  };

  // --- Supabase Data Loading ---
  const fetchSupabaseData = async () => {
      setIsLoadingData(true);
      setDbError(null);
      try {
        // Try new ingested_results table first, fallback to old tables
        let weeksData: WeekData[] = [];
        let picksData: PickArchiveItem[] = [];
        let summariesData: GameSummary[] = [];

        // 1. Fetch Weeks - Try new table first, fallback to old
        try {
          const { data: ingestedWeeks, error: ingestError } = await getAllLatestIngestedResults('weeks');
          if (!ingestError && ingestedWeeks && ingestedWeeks.length > 0) {
            weeksData = extractContents<WeekData>(ingestedWeeks);
          } else {
            // Fallback to old weeks table
            const { data: oldWeeks, error: weeksError } = await supabase
              .from('weeks')
              .select('*')
              .order('created_at', { ascending: false });
            if (weeksError) throw weeksError;
            if (oldWeeks) weeksData = oldWeeks as WeekData[];
          }
        } catch (err) {
          // Final fallback to old table
          const { data: oldWeeks, error: weeksError } = await supabase
            .from('weeks')
            .select('*')
            .order('created_at', { ascending: false });
          if (weeksError) throw weeksError;
          if (oldWeeks) weeksData = oldWeeks as WeekData[];
        }
        
        setWeeks(weeksData);

        // 2. Fetch Picks (Archives) - Try new table first, fallback to old
        try {
          const { data: ingestedPicks, error: ingestError } = await getAllLatestIngestedResults('picks');
          if (!ingestError && ingestedPicks && ingestedPicks.length > 0) {
            picksData = extractContents<PickArchiveItem>(ingestedPicks);
          } else {
            // Fallback to old picks table
            const { data: oldPicks, error: picksError } = await supabase
              .from('picks')
              .select('*')
              .order('created_at', { ascending: false });
            if (picksError) throw picksError;
            if (oldPicks) picksData = oldPicks as PickArchiveItem[];
          }
        } catch (err) {
          // Final fallback to old table
          const { data: oldPicks, error: picksError } = await supabase
            .from('picks')
            .select('*')
            .order('created_at', { ascending: false });
          if (picksError) throw picksError;
          if (oldPicks) picksData = oldPicks as PickArchiveItem[];
        }

        setArchives(picksData);
        if (picksData.length > 0) {
            setPicksContent(picksData[0].content);
            setPicksTitle(picksData[0].title);
        }

        // 3. Fetch Summaries - Try new table first, fallback to old
        try {
          const { data: ingestedSummaries, error: ingestError } = await getAllLatestIngestedResults('summaries');
          if (!ingestError && ingestedSummaries && ingestedSummaries.length > 0) {
            summariesData = extractContents<GameSummary>(ingestedSummaries);
          } else {
            // Fallback to old summaries table
            const { data: oldSummaries, error: sumError } = await supabase
              .from('summaries')
              .select('*')
              .order('created_at', { ascending: false });
            if (sumError) throw sumError;
            if (oldSummaries) summariesData = oldSummaries as GameSummary[];
          }
        } catch (err) {
          // Final fallback to old table
          const { data: oldSummaries, error: sumError } = await supabase
            .from('summaries')
            .select('*')
            .order('created_at', { ascending: false });
          if (sumError) throw sumError;
          if (oldSummaries) summariesData = oldSummaries as GameSummary[];
        }

        setGameSummaries(summariesData);
        
        setDataSource('CLOUD');

      } catch (err: any) {
        const errorMsg = formatError(err);
        console.error("Supabase load error:", errorMsg);
        setDbError(errorMsg);
        setDataSource('DISCONNECTED');
      } finally {
        setIsLoadingData(false);
      }
  };

  useEffect(() => {
    if (hasAccess) {
        fetchSupabaseData();
    }
  }, [hasAccess]);

  // --- Derived Stats ---
  const stats = useMemo(() => calculateStats(weeks), [weeks]);
  const chartData = useMemo(() => generateChartData(weeks), [weeks]);

  // --- Handlers ---

  const handleDataUpload = async (newWeekData: WeekData) => {
    setWeeks(prev => {
      const updatedList = [newWeekData, ...prev];
      return updatedList.sort((a, b) => {
         const getWeekNum = (title: string) => {
            const match = title.match(/week[\s_-]*(\d+)/i);
            return match ? parseInt(match[1]) : 0;
         };
         return getWeekNum(b.title) - getWeekNum(a.title);
      });
    });

    try {
        // Use new append-only ingestion pattern
        const { error } = await insertIngestedResult(
          'weeks',
          newWeekData,
          newWeekData.id, // Use week id as source_id for versioning
          {
            uploaded_at: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        );
        
        if (error) {
            const msg = formatError(error);
            alert(`CRITICAL SAVE ERROR: ${msg}. Data was NOT saved to cloud.`);
            setDbError(msg);
        }
        
        // Also save to old table for backward compatibility (optional)
        try {
          await supabase.from('weeks').upsert(newWeekData);
        } catch (legacyErr) {
          console.warn('Legacy table save failed (non-critical):', legacyErr);
        }
    } catch (err: any) {
        alert(`Database Connection Error: ${formatError(err)}`);
    }
  };

  const handleDataDelete = async (id: string) => {
      setWeeks(prev => prev.filter(w => w.id !== id));
      const { error } = await supabase.from('weeks').delete().eq('id', id);
      if (error) console.error("Failed to delete week:", formatError(error));
  };

  const handlePicksUpdate = async (content: string, filename: string) => {
     const newArchive: PickArchiveItem = {
         id: `arch-${Date.now()}`,
         title: filename,
         date: new Date().toLocaleDateString(),
         content: content
     };
     
     setArchives(prev => [newArchive, ...prev]);
     setPicksContent(content);
     setPicksTitle(filename);

     // Use new append-only ingestion pattern
     const { error } = await insertIngestedResult(
       'picks',
       newArchive,
       newArchive.id, // Use archive id as source_id for versioning
       {
         uploaded_at: new Date().toISOString(),
         filename: filename
       }
     );
     
     if (error) {
         alert(`CRITICAL SAVE ERROR: ${formatError(error)}`);
     }
     
     // Also save to old table for backward compatibility (optional)
     try {
       await supabase.from('picks').upsert(newArchive);
     } catch (legacyErr) {
       console.warn('Legacy table save failed (non-critical):', legacyErr);
     }
  };

  const handleGameSummaryUpload = async (summary: GameSummary) => {
      setGameSummaries(prev => [summary, ...prev]);
      
      // Use new append-only ingestion pattern
      const { error } = await insertIngestedResult(
        'summaries',
        summary,
        summary.id, // Use summary id as source_id for versioning
        {
          uploaded_at: new Date().toISOString()
        }
      );
      
      if (error) {
         alert(`CRITICAL SAVE ERROR: ${formatError(error)}`);
      }
      
      // Also save to old table for backward compatibility (optional)
      try {
        await supabase.from('summaries').upsert(summary);
      } catch (legacyErr) {
        console.warn('Legacy table save failed (non-critical):', legacyErr);
      }
  };

  const handleFactoryReset = async () => {
      if (window.confirm("WARNING: This will wipe all data from Supabase tables. Are you sure?")) {
          setWeeks([]);
          setPicksContent("# System Reset\n\nNo data available.");
          setPicksTitle("No Data");
          setArchives([]);
          setGameSummaries([]);

          try {
            await supabase.from('weeks').delete().neq('id', '0'); 
            await supabase.from('picks').delete().neq('id', '0');
            await supabase.from('summaries').delete().neq('id', '0');
            alert("System reset complete.");
          } catch (err: any) {
            alert("Reset Failed: " + formatError(err));
          }
      }
  };

  // View helper to keep return clean
  const isTradingDesk = currentView === 'trading-desk';

  if (checkingAccess) return null; // Avoid flicker

  if (!hasAccess) {
      return <EmailGate onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-900/10 to-transparent opacity-50"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/5 blur-[100px] rounded-full"></div>
      </div>

      {!isTradingDesk && (
          <NavBar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            onLaunchArby={() => setShowVoiceAgent(true)}
          />
      )}

      {/* Main Content */}
      <main className={`relative z-10 flex-grow ${isTradingDesk ? '' : 'pt-24'}`}>
        
        {/* Only show ticker if NOT in Trading Desk mode */}
        {!isTradingDesk && (
            <div className="sticky top-24 z-30">
                <TeamTicker />
            </div>
        )}

        {/* Global Error Banner */}
        {dbError && (
            <div className="bg-rose-900/80 text-white text-center py-2 px-4 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 border-b border-rose-500">
                <AlertTriangle size={16} />
                Database Error: {dbError}
            </div>
        )}

        <div className={isTradingDesk ? "" : "py-8"}>
            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-mono text-sm animate-pulse">Connecting to Quantum Database...</p>
                </div>
            ) : (
                <>
                    {currentView === 'dashboard' ? (
                        <Dashboard weeks={weeks} stats={stats} chartData={chartData} />
                    ) : currentView === 'admin' ? (
                        <Admin 
                            onDataUploaded={handleDataUpload} 
                            weeks={weeks} 
                            onDeleteReport={handleDataDelete}
                            onUpdatePicks={handlePicksUpdate}
                            onUploadSummary={handleGameSummaryUpload}
                            onFactoryReset={handleFactoryReset}
                        />
                    ) : currentView === 'results' ? (
                        <Results weeks={weeks} />
                    ) : currentView === 'kelly' ? (
                        <KellyTool />
                    ) : currentView === 'statsedge' ? (
                        <StatsEdge />
                    ) : currentView === 'superposition' ? (
                        <Superposition />
                    ) : currentView === 'trading-desk' ? (
                        <TradingDesk onClose={() => setCurrentView('dashboard')} />
                    ) : (
                        <Picks 
                            currentContent={picksContent} 
                            archives={archives} 
                            gameSummaries={gameSummaries}
                        />
                    )}
                </>
            )}
        </div>
      </main>

      {/* Footer - Hide if on Trading Desk */}
      {!isTradingDesk && (
        <footer className="relative z-10 py-6 bg-slate-950 border-t border-slate-900">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-slate-600 text-xs uppercase tracking-widest">
                    Noesis Global Trader &copy; 2025 | Proprietary Model
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={fetchSupabaseData}
                        className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-900 text-[10px] text-slate-400 font-mono hover:bg-slate-800 hover:text-white transition-all"
                    >
                        <RefreshCcw size={10} /> Sync DB
                    </button>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider ${
                        dataSource === 'CLOUD' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                        {dataSource === 'CLOUD' ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {dataSource === 'CLOUD' ? 'DB Connected' : 'DB Disconnected'}
                    </div>
                </div>
            </div>
        </footer>
      )}

      {/* OVERLAYS */}
      {!isTradingDesk && !isLoadingData && (
          <>
            <ChatBot />
            <OnboardingTour 
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                onLaunchArby={() => setShowVoiceAgent(true)}
            />
            {showVoiceAgent && <VoiceAgent onClose={() => setShowVoiceAgent(false)} />}
          </>
      )}
    </div>
  );
}

export default App;
