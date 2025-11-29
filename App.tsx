
import React, { useState, useMemo } from 'react';
import { NavBar } from './components/NavBar';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Picks } from './pages/Picks';
import { Results } from './pages/Results';
import { KellyTool } from './pages/KellyTool';
import { ChatBot } from './components/ChatBot';
import { INITIAL_WEEK_DATA, INITIAL_PICKS_CONTENT, INITIAL_ARCHIVE } from './constants';
import { calculateStats, generateChartData } from './utils';
import { WeekData, PickArchiveItem } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'picks' | 'results' | 'kelly'>('picks');
  const [weeks, setWeeks] = useState<WeekData[]>(INITIAL_WEEK_DATA);
  
  // Picks State
  const [picksContent, setPicksContent] = useState<string>(INITIAL_PICKS_CONTENT);
  const [picksTitle, setPicksTitle] = useState<string>("Week 6 - NFL Slate");
  const [archives, setArchives] = useState<PickArchiveItem[]>(INITIAL_ARCHIVE);

  const stats = useMemo(() => calculateStats(weeks), [weeks]);
  const chartData = useMemo(() => generateChartData(weeks), [weeks]);

  const handleDataUpload = (newWeekData: WeekData) => {
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
  };

  const handleDataDelete = (id: string) => {
      setWeeks(prev => prev.filter(w => w.id !== id));
  };

  const handlePicksUpdate = (content: string, filename: string) => {
     // Archive the current one before updating
     const newArchive: PickArchiveItem = {
         id: `arch-${Date.now()}`,
         title: picksTitle,
         date: new Date().toLocaleDateString(),
         content: picksContent
     };
     
     setArchives(prev => [newArchive, ...prev]);
     
     // Update to new content
     setPicksContent(content);
     setPicksTitle(filename);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-900/10 to-transparent opacity-50"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/5 blur-[100px] rounded-full"></div>
      </div>

      <NavBar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="pt-24 pb-12 relative z-10">
        {currentView === 'dashboard' ? (
            <Dashboard weeks={weeks} stats={stats} chartData={chartData} />
        ) : currentView === 'admin' ? (
            <Admin 
                onDataUploaded={handleDataUpload} 
                weeks={weeks} 
                onDeleteReport={handleDataDelete}
                onUpdatePicks={handlePicksUpdate}
            />
        ) : currentView === 'results' ? (
            <Results weeks={weeks} />
        ) : currentView === 'kelly' ? (
            <KellyTool />
        ) : (
            <Picks currentContent={picksContent} archives={archives} />
        )}
      </main>

      <footer className="relative z-10 text-center py-8 text-slate-600 text-xs uppercase tracking-widest border-t border-slate-900 mt-8">
        Noesis Global Trader &copy; 2025 | Proprietary Model
      </footer>

      <ChatBot />
    </div>
  );
}

export default App;
