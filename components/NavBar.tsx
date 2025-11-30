
import React from 'react';
import { LayoutDashboard, Target, FileSearch, Lock, Calculator, Zap, Infinity, MonitorPlay, ExternalLink, Mic } from 'lucide-react';
import { APP_NAME } from '../constants';
import { clsx } from 'clsx';

interface NavBarProps {
  currentView: 'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge' | 'superposition' | 'trading-desk';
  setCurrentView: (view: 'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge' | 'superposition' | 'trading-desk') => void;
  onLaunchArby: () => void;
}

const QuantumLogo = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
    <defs>
      <linearGradient id="silver-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="20%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="80%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#00ffff" />
      </linearGradient>
    </defs>
    
    {/* Outer Hexagon Shell */}
    <path 
      d="M50 5L93.3 30V80L50 105L6.7 80V30L50 5Z" 
      fill="url(#silver-sheen)" 
      stroke="#1e293b" 
      strokeWidth="2"
      transform="scale(0.9) translate(5, 0)"
    />
    
    {/* Inner Cutout / Q Shape */}
    <path 
      d="M50 25L75 40V70L50 85L25 70V40L50 25Z" 
      fill="#0f172a" 
    />
    
    {/* The Quantum Orbit/Spark */}
    <path 
      d="M50 35L55 50L70 55L55 60L50 75L45 60L30 55L45 50L50 35Z" 
      fill="url(#cyan-glow)" 
      className="animate-pulse"
    />
  </svg>
);

export const NavBar: React.FC<NavBarProps> = ({ currentView, setCurrentView, onLaunchArby }) => {
  const getButtonClass = (isActive: boolean, colorClass: string, shadowClass: string) => {
      return clsx(
          "flex items-center gap-2 px-5 py-2.5 rounded-sm transition-all duration-300 font-black tracking-widest text-xs uppercase border-b-2 relative overflow-hidden",
          isActive 
            ? `${colorClass} ${shadowClass} border-current bg-white/5` 
            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
      );
  };

  const launchTradingDesk = () => {
      setCurrentView('trading-desk');
      try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
      } catch (e) {
          console.warn("Fullscreen denied", e);
      }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#090a15] via-[#111322] to-[#090a15] backdrop-blur-xl border-b border-indigo-500/20 shadow-2xl">
      {/* Top Highlight Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-24">
          
          {/* Logo Section */}
          <div className="flex items-center gap-5 cursor-pointer group" onClick={() => setCurrentView('picks')}>
             <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out">
                <QuantumLogo />
                {/* Glow effect behind logo */}
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full -z-10 group-hover:bg-cyan-500/30 transition-colors"></div>
             </div>
             
             <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-1">
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-sm">
                        QUANTUM
                    </h1>
                    <span className="text-3xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                        BETS
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-[1px] w-8 bg-indigo-500/50"></div>
                    <span className="text-[10px] text-indigo-300 font-mono tracking-[0.2em] uppercase">
                        Algorithmic Trading Model
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-[9px] font-mono text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                        v2025.1
                    </span>
                </div>
             </div>
          </div>
          
          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-t-lg border-b border-white/5">
            {/* SPECIAL SAUCE TAB */}
            <button 
              id="nav-superposition"
              onClick={() => setCurrentView('superposition')}
              className={clsx(
                  "flex items-center gap-2 px-5 py-2.5 rounded-sm transition-all duration-300 font-black tracking-widest text-xs uppercase border-b-2 relative overflow-hidden group",
                  currentView === 'superposition' 
                    ? "border-indigo-500 text-white bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Infinity size={18} strokeWidth={3} className={currentView === 'superposition' ? "text-indigo-400 animate-pulse" : "group-hover:text-indigo-400"} />
              <span className={currentView === 'superposition' ? "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" : ""}>
                Superposition
              </span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-2"></div>

            <button 
              id="nav-picks"
              onClick={() => setCurrentView('picks')}
              className={getButtonClass(currentView === 'picks', 'text-emerald-400', 'shadow-[0_10px_20px_-10px_rgba(16,185,129,0.3)]')}
            >
              <Target size={16} strokeWidth={3} />
              Daily Picks
            </button>
            <button 
              id="nav-statsedge"
              onClick={() => setCurrentView('statsedge')}
              className={getButtonClass(currentView === 'statsedge', 'text-yellow-400', 'shadow-[0_10px_20px_-10px_rgba(250,204,21,0.3)]')}
            >
              <Zap size={16} strokeWidth={3} />
              StatsEdge
            </button>
            <button 
              id="nav-dashboard"
              onClick={() => setCurrentView('dashboard')}
              className={getButtonClass(currentView === 'dashboard', 'text-cyan-400', 'shadow-[0_10px_20px_-10px_rgba(6,182,212,0.3)]')}
            >
              <LayoutDashboard size={16} strokeWidth={3} />
              Analytics
            </button>
            <button 
              id="nav-results"
              onClick={() => setCurrentView('results')}
              className={getButtonClass(currentView === 'results', 'text-amber-400', 'shadow-[0_10px_20px_-10px_rgba(251,191,36,0.3)]')}
            >
              <FileSearch size={16} strokeWidth={3} />
              Results
            </button>
            <button 
              onClick={() => setCurrentView('kelly')}
              className={getButtonClass(currentView === 'kelly', 'text-blue-400', 'shadow-[0_10px_20px_-10px_rgba(96,165,250,0.3)]')}
            >
              <Calculator size={16} strokeWidth={3} />
              Risk Tool
            </button>
            <button 
              onClick={() => setCurrentView('admin')}
              className={getButtonClass(currentView === 'admin', 'text-rose-400', 'shadow-[0_10px_20px_-10px_rgba(244,63,94,0.3)]')}
            >
              <Lock size={14} strokeWidth={3} />
              Admin
            </button>
          </div>
          
          {/* TERMINAL LAUNCHER */}
          <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-2">
              <button
                onClick={onLaunchArby}
                className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/50 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse-slow"
                title="Talk to ARBY-BOT"
              >
                  <Mic size={16} />
              </button>

              <button 
                  id="nav-terminal"
                  onClick={launchTradingDesk}
                  className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-500/50 rounded hover:from-red-900/60 hover:to-red-800/40 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  title="Launch Trading Terminal"
              >
                  <MonitorPlay size={16} className="text-red-500 group-hover:animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider hidden xl:block">
                      Launch Terminal
                  </span>
                  <ExternalLink size={10} className="text-red-500/50" />
              </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
