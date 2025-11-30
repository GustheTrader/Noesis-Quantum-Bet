
import React, { useState, useMemo, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Picks } from './pages/Picks';
import { Results } from './pages/Results';
import { KellyTool } from './pages/KellyTool';
import { StatsEdge } from './pages/StatsEdge';
import { ChatBot } from './components/ChatBot';
import { TeamTicker } from './components/TeamTicker';
import { INITIAL_WEEK_DATA, INITIAL_PICKS_CONTENT, INITIAL_ARCHIVE, INITIAL_GAME_SUMMARIES } from './constants';
import { calculateStats, generateChartData } from './utils';
import { WeekData, PickArchiveItem, GameSummary } from './types';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge'>('picks');
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- State ---
  const [weeks, setWeeks] = useState<WeekData[]>(INITIAL_WEEK_DATA);
  const [picksContent, setPicksContent] = useState<string>(INITIAL_PICKS_CONTENT);
  const [picksTitle, setPicksTitle] = useState<string>("Week 6 - NFL Slate");
  const [archives, setArchives] = useState<PickArchiveItem[]>(INITIAL_ARCHIVE);
  const [gameSummaries, setGameSummaries] = useState<GameSummary[]>(INITIAL_GAME_SUMMARIES);

  // --- Supabase Data Loading ---
  useEffect(() => {
    const fetchSupabaseData = async () => {
      setIsLoadingData(true);
      try {
        // 1. Fetch Weeks
        const { data: weeksData, error: weeksError } = await supabase
          .from('weeks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!weeksError && weeksData && weeksData.length > 0) {
            setWeeks(weeksData as WeekData[]);
        }

        // 2. Fetch Picks (Archives)
        const { data: picksData, error: picksError } = await supabase
          .from('picks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!picksError && picksData && picksData.length > 0) {
            setArchives(picksData as PickArchiveItem[]);
            // Set current picks content to the latest one
            setPicksContent(picksData[0].content);
            setPicksTitle(picksData[0].title);
        }

        // 3. Fetch Summaries
        const { data: summariesData, error: sumError } = await supabase
            .from('summaries')
            .select('*')
            .order('created_at', { ascending: false });

        if (!sumError && summariesData && summariesData.length > 0) {
            setGameSummaries(summariesData as GameSummary[]);
        }

      } catch (err) {
        console.error("Supabase load error, falling back to initial data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchSupabaseData();
  }, []);

  // --- Derived Stats ---
  const stats = useMemo(() => calculateStats(weeks), [weeks]);
  const chartData = useMemo(() => generateChartData(weeks), [weeks]);

  // --- Handlers (Now with Supabase Upsert) ---

  const handleDataUpload = async (newWeekData: WeekData) => {
    // 1. Optimistic Update
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

    // 2. Persist to Supabase
    try {
        const { error } = await supabase.from('weeks').upsert(newWeekData);
        if (error) {
            console.error("Supabase Save Error:", error);
            alert(`Failed to save to Database: ${error.message}. Please check RLS policies.`);
        }
    } catch (err: any) {
        alert(`Database Connection Error: ${err.message}`);
    }
  };

  const handleDataDelete = async (id: string) => {
      setWeeks(prev => prev.filter(w => w.id !== id));
      const { error } = await supabase.from('weeks').delete().eq('id', id);
      if (error) console.error("Failed to delete week from Supabase:", error);
  };

  const handlePicksUpdate = async (content: string, filename: string) => {
     // Create new archive item
     const newArchive: PickArchiveItem = {
         id: `arch-${Date.now()}`,
         title: filename,
         date: new Date().toLocaleDateString(),
         content: content
     };
     
     // 1. Optimistic Update
     setArchives(prev => [newArchive, ...prev]);
     setPicksContent(content);
     setPicksTitle(filename);

     // 2. Persist to Supabase
     const { error } = await supabase.from('picks').upsert(newArchive);
     if (error) {
         console.error("Supabase Picks Error:", error);
         alert("Failed to save Picks to DB. Check policies.");
     }
  };

  const handleGameSummaryUpload = async (summary: GameSummary) => {
      setGameSummaries(prev => [summary, ...prev]);
      const { error } = await supabase.from('summaries').upsert(summary);
      if (error) {
         console.error("Supabase Summary Error:", error);
         alert("Failed to save Summary to DB. Check policies.");
      }
  };

  const handleFactoryReset = async () => {
      if (window.confirm("WARNING: This will wipe all data from Supabase tables. Are you sure?")) {
          // Clear Local State
          setWeeks(INITIAL_WEEK_DATA);
          setPicksContent(INITIAL_PICKS_CONTENT);
          setPicksTitle("Week 6 - NFL Slate");
          setArchives(INITIAL_ARCHIVE);
          setGameSummaries(INITIAL_GAME_SUMMARIES);

          // Clear Supabase Tables
          try {
            await supabase.from('weeks').delete().neq('id', '0'); 
            await supabase.from('picks').delete().neq('id', '0');
            await supabase.from('summaries').delete().neq('id', '0');
            alert("System reset complete.");
          } catch (err: any) {
            alert("Reset Failed: " + err.message);
          }
      }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-900/10 to-transparent opacity-50"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/5 blur-[100px] rounded-full"></div>
      </div>

      <NavBar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content */}
      <main className="pt-24 relative z-10">
        
        {/* Ticker Section - Pinned below Navbar */}
        <div className="sticky top-24 z-30">
            <TeamTicker />
        </div>

        <div className="py-8">
            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-mono text-sm animate-pulse">Initializing Quantum Core...</p>
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

      <footer className="relative z-10 text-center py-8 text-slate-600 text-xs uppercase tracking-widest border-t border-slate-900 mt-8">
        Noesis Global Trader &copy; 2025 | Proprietary Model
      </footer>

      <ChatBot />
    </div>
  );
}

export default App;
