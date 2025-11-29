
import React, { useState, useEffect } from 'react';
import { Target, AlertCircle, Clock, Archive, ChevronRight, ArrowLeft } from 'lucide-react';
import { PickArchiveItem } from '../types';
import { LiveOdds } from '../components/LiveOdds';

interface PicksProps {
  currentContent: string;
  archives: PickArchiveItem[];
}

export const Picks: React.FC<PicksProps> = ({ currentContent, archives }) => {
  const [activeContent, setActiveContent] = useState(currentContent);
  const [activeTitle, setActiveTitle] = useState("Live Action");
  const [isLive, setIsLive] = useState(true);
  
  // Reset to live content when it changes
  useEffect(() => {
    if (isLive) {
        setActiveContent(currentContent);
        setActiveTitle("Live Action");
    }
  }, [currentContent, isLive]);

  const handleArchiveClick = (item: PickArchiveItem) => {
      setActiveContent(item.content);
      setActiveTitle(item.title);
      setIsLive(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLive = () => {
      setActiveContent(currentContent);
      setActiveTitle("Live Action");
      setIsLive(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Simple MD Parser
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-8 mb-4 uppercase tracking-tighter">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold text-white border-b border-slate-700 pb-2 mt-6 mb-3 uppercase tracking-widest">{line.replace('## ', '')}</h2>;
      }
      if (line.trim().startsWith('- ')) {
        const content = line.trim().replace('- ', '');
        return (
          <li key={index} className="flex items-start gap-2 ml-4 mb-2 text-slate-300 text-sm leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span dangerouslySetInnerHTML={{ __html: formatBold(content) }}></span>
          </li>
        );
      }
      if (line.trim().match(/^\d+\./)) {
         return (
            <div key={index} className="ml-4 mb-2 text-slate-300 text-sm font-mono">
               <span className="text-cyan-400 font-bold mr-2">{line.split('.')[0]}.</span>
               <span dangerouslySetInnerHTML={{ __html: formatBold(line.replace(/^\d+\.\s*/, '')) }}></span>
            </div>
         )
      }
      if (line.trim().length > 0) {
         if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
             return <h3 key={index} className="text-lg font-bold text-purple-400 mt-6 mb-2 uppercase tracking-wide">{line.replace(/\*\*/g, '')}</h3>
         }
         return <p key={index} className="mb-2 text-slate-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBold(line) }}></p>;
      }
      return <div key={index} className="h-2"></div>;
    });
  };

  const formatBold = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<span class="text-white font-bold">$1</span>');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Content Area */}
            {/* Changed order to standard DOM flow so on mobile Content is first, Sidebar is second */}
            <div className="lg:col-span-3">
                <div className="glass-panel p-1 rounded-2xl mb-8 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
                    <div className="bg-gradient-to-b from-slate-900/90 to-black/90 p-8 rounded-xl min-h-[70vh] relative overflow-hidden">
                        
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <Target className="text-emerald-500/20 w-40 h-40 absolute top-4 right-4 animate-pulse-slow" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4 relative z-10">
                            <div className="flex items-center gap-4">
                                {isLive ? (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        {activeTitle}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleBackToLive} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                            <ArrowLeft size={16} className="text-white"/>
                                        </button>
                                        <div className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-full text-slate-300 text-xs font-bold uppercase tracking-widest">
                                            ARCHIVE: {activeTitle}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                                <Clock size={12} />
                                {isLive ? new Date().toLocaleDateString() : 'ARCHIVED'}
                            </div>
                        </div>

                        <div className="relative z-10 font-sans">
                            {renderMarkdown(activeContent)}
                        </div>

                        <div className="mt-12 pt-6 border-t border-dashed border-slate-800 flex gap-3 items-start opacity-60 hover:opacity-100 transition-opacity">
                            <AlertCircle className="text-slate-500 shrink-0" size={16} />
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-relaxed">
                                DISCLAIMER: All information provided is for educational and entertainment purposes only. 
                                Past performance is not indicative of future results. Please wager responsibly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar: Live Odds & Archives */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* Live Odds Module */}
                <LiveOdds />

                {/* Archives Module */}
                <div className="glass-panel p-6 rounded-2xl sticky top-28 border border-slate-700/50">
                    <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Archive size={18} />
                        Archives
                    </h3>
                    <div className="space-y-3">
                        {/* Live Button */}
                        <button 
                            onClick={handleBackToLive}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group ${
                                isLive 
                                ? 'bg-emerald-500/20 border-emerald-500 text-white' 
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-emerald-500/50 hover:text-white'
                            }`}
                        >
                            <span className="font-bold text-xs uppercase tracking-wider">Current Picks</span>
                            {isLive && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}
                        </button>

                        <div className="h-px bg-slate-800 my-4"></div>

                        {/* Archive List */}
                        {archives.length > 0 ? (
                            archives.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleArchiveClick(item)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group ${
                                        !isLive && activeTitle === item.title
                                        ? 'bg-purple-500/20 border-purple-500 text-white'
                                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-purple-500/50 hover:text-white'
                                    }`}
                                >
                                    <div>
                                        <div className="font-bold text-xs uppercase tracking-wider group-hover:text-purple-400 transition-colors">{item.title}</div>
                                        <div className="text-[10px] opacity-60 font-mono mt-1">{item.date}</div>
                                    </div>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                                </button>
                            ))
                        ) : (
                            <div className="text-center text-slate-600 text-xs py-4">No archives found.</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};
